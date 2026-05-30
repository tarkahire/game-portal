-- 1v1 duel matchmaking + state machine.
-- When 2 players queue we teleport them to the arena and start a match.
-- Match ends when one player's humanoid dies; both return to the lobby after a beat.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Remotes = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Remotes"))

local LOBBY_SPAWN = CFrame.new(0, 5, 0)
local ARENA_SPAWN_A = CFrame.new(-40, 5, 200)
local ARENA_SPAWN_B = CFrame.new(40, 5, 200, -1, 0, 0, 0, 1, 0, 0, 0, -1) -- face -X

local queue = {} -- list<Player>
local matches = {} -- map<Player, match>

local function teleport(player: Player, cf: CFrame)
	local char = player.Character
	if not char then
		return
	end
	local hrp = char:FindFirstChild("HumanoidRootPart")
	if hrp then
		(hrp :: BasePart).CFrame = cf
	end
end

local function healFull(player: Player)
	local char = player.Character
	if not char then
		return
	end
	local hum = char:FindFirstChildOfClass("Humanoid")
	if hum then
		hum.Health = hum.MaxHealth
		Remotes.HpChanged:FireClient(player, hum.Health, hum.MaxHealth)
	end
end

local function inQueue(player: Player): boolean
	for _, p in ipairs(queue) do
		if p == player then
			return true
		end
	end
	return false
end

local function removeFromQueue(player: Player)
	for i, p in ipairs(queue) do
		if p == player then
			table.remove(queue, i)
			return
		end
	end
end

local function endMatch(match, winner: Player?, loser: Player?)
	if matches[match.a] == match then
		matches[match.a] = nil
	end
	if matches[match.b] == match then
		matches[match.b] = nil
	end
	if winner then
		Remotes.MatchState:FireClient(winner, "win")
	end
	if loser then
		Remotes.MatchState:FireClient(loser, "loss")
	end
	-- After a short delay, teleport both back to lobby and refresh state.
	task.delay(3, function()
		for _, p in ipairs({ match.a, match.b }) do
			if p and p.Parent then
				teleport(p, LOBBY_SPAWN)
				healFull(p)
				Remotes.MatchState:FireClient(p, "lobby")
			end
		end
	end)
end

local function startMatch(a: Player, b: Player)
	local match = { a = a, b = b }
	matches[a] = match
	matches[b] = match
	healFull(a)
	healFull(b)
	teleport(a, ARENA_SPAWN_A)
	teleport(b, ARENA_SPAWN_B)
	Remotes.MatchState:FireClient(a, "fight", b.Name)
	Remotes.MatchState:FireClient(b, "fight", a.Name)
end

local function tryMatchmake()
	while #queue >= 2 do
		local a = table.remove(queue, 1)
		local b = table.remove(queue, 1)
		if a and b and a.Character and b.Character then
			startMatch(a, b)
		end
	end
end

Remotes.Queue.OnServerEvent:Connect(function(player)
	if matches[player] then
		return
	end
	if inQueue(player) then
		return
	end
	table.insert(queue, player)
	Remotes.MatchState:FireClient(player, "queued")
	tryMatchmake()
end)

local function bindCharacter(player: Player, char: Model)
	local hum = char:WaitForChild("Humanoid") :: Humanoid
	-- Initial HUD sync
	Remotes.HpChanged:FireClient(player, hum.Health, hum.MaxHealth)
	if not matches[player] then
		Remotes.MatchState:FireClient(player, "lobby")
	end
	hum.HealthChanged:Connect(function(hp)
		Remotes.HpChanged:FireClient(player, hp, hum.MaxHealth)
	end)
	hum.Died:Connect(function()
		local match = matches[player]
		if match then
			local other = if match.a == player then match.b else match.a
			endMatch(match, other, player)
		end
	end)
end

Players.PlayerAdded:Connect(function(player)
	player.CharacterAdded:Connect(function(char)
		bindCharacter(player, char)
	end)
end)

-- Handle players who joined before the script ran
for _, player in ipairs(Players:GetPlayers()) do
	if player.Character then
		bindCharacter(player, player.Character)
	end
	player.CharacterAdded:Connect(function(char)
		bindCharacter(player, char)
	end)
end

Players.PlayerRemoving:Connect(function(player)
	removeFromQueue(player)
	local match = matches[player]
	if match then
		local other = if match.a == player then match.b else match.a
		endMatch(match, other, player)
	end
end)
