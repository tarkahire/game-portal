-- Receives CastAbility from clients, validates cooldown server-side,
-- applies damage and motion effects, and tells all clients to play VFX.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Characters = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Characters"))
local Remotes = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Remotes"))

-- Per-player ability cooldown timers (server-authoritative).
local cd = {} :: { [Player]: { [string]: number } }

Players.PlayerAdded:Connect(function(p)
	cd[p] = {}
end)
Players.PlayerRemoving:Connect(function(p)
	cd[p] = nil
end)

local function getEnemyOf(player: Player): Player?
	-- TODO: replace with match-aware lookup once we track active matches here.
	for _, other in ipairs(Players:GetPlayers()) do
		if other ~= player and other.Character and other.Character:FindFirstChildOfClass("Humanoid") then
			return other
		end
	end
	return nil
end

local function rootOf(player: Player): BasePart?
	local char = player.Character
	if not char then
		return nil
	end
	return char:FindFirstChild("HumanoidRootPart") :: BasePart?
end

local function applyDamage(target: Player, amount: number)
	local char = target.Character
	if not char then
		return
	end
	local hum = char:FindFirstChildOfClass("Humanoid")
	if hum then
		hum:TakeDamage(amount)
	end
end

local effects = {}

function effects.pull(caster: Player, ability)
	local enemy = getEnemyOf(caster)
	if not enemy then
		return
	end
	local myHrp = rootOf(caster)
	local enemyHrp = rootOf(enemy)
	if not myHrp or not enemyHrp then
		return
	end
	local dir = (myHrp.Position - enemyHrp.Position)
	if dir.Magnitude < 0.001 then
		return
	end
	dir = dir.Unit
	enemyHrp.AssemblyLinearVelocity = dir * ability.yank + Vector3.new(0, 20, 0)
	applyDamage(enemy, ability.damage)
	Remotes.AbilityFx:FireAllClients("pull", myHrp.Position, enemyHrp.Position, ability)
end

function effects.shockwave(caster: Player, ability)
	local myHrp = rootOf(caster)
	if not myHrp then
		return
	end
	for _, other in ipairs(Players:GetPlayers()) do
		if other ~= caster and other.Character then
			local hrp = other.Character:FindFirstChild("HumanoidRootPart") :: BasePart?
			if hrp and (hrp.Position - myHrp.Position).Magnitude < ability.radius then
				applyDamage(other, ability.damage)
				local toThem = hrp.Position - myHrp.Position
				if toThem.Magnitude > 0.001 then
					local dir = toThem.Unit
					hrp.AssemblyLinearVelocity = dir * ability.knockback + Vector3.new(0, 30, 0)
				end
			end
		end
	end
	Remotes.AbilityFx:FireAllClients("shockwave", myHrp.Position, nil, ability)
end

function effects.beam(caster: Player, ability)
	local myHrp = rootOf(caster)
	if not myHrp then
		return
	end
	local origin = myHrp.Position
	local dir = myHrp.CFrame.LookVector
	-- Line-trace damage: hit anyone close to the beam line within range.
	for _, other in ipairs(Players:GetPlayers()) do
		if other ~= caster and other.Character then
			local ohrp = other.Character:FindFirstChild("HumanoidRootPart") :: BasePart?
			if ohrp then
				local toEnemy = ohrp.Position - origin
				local along = toEnemy:Dot(dir)
				if along > 0 and along < ability.range then
					local lateral = (toEnemy - dir * along).Magnitude
					if lateral < ability.radius then
						applyDamage(other, ability.damage)
					end
				end
			end
		end
	end
	Remotes.AbilityFx:FireAllClients("beam", origin, origin + dir * ability.range, ability)
end

function effects.blink(caster: Player, ability)
	local hrp = rootOf(caster)
	if not hrp then
		return
	end
	local newPos = hrp.Position + hrp.CFrame.LookVector * ability.distance + Vector3.new(0, 1, 0)
	hrp.CFrame = CFrame.new(newPos, newPos + hrp.CFrame.LookVector)
	Remotes.AbilityFx:FireAllClients("blink", hrp.Position, nil, ability)
end

Remotes.CastAbility.OnServerEvent:Connect(function(player, key)
	if typeof(key) ~= "string" then
		return
	end
	-- For now everyone is the Sorcerer. Per-player character is a future step.
	local char = Characters.list.Sorcerer
	local ability = char.abilities[key]
	if not ability then
		return
	end
	local now = os.clock()
	cd[player] = cd[player] or {}
	if cd[player][key] and cd[player][key] > now then
		return
	end
	cd[player][key] = now + ability.cooldown
	local fn = effects[ability.effect]
	if fn then
		fn(player, ability)
	end
end)
