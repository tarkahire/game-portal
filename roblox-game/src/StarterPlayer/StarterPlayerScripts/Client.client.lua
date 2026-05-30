-- Master client script: HUD, queue UI, Q/E/R/F input, local cooldowns, VFX renderers.
-- The server is authoritative for damage and cooldowns; this is just for feedback.

local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")
local Debris = game:GetService("Debris")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Characters = require(Shared:WaitForChild("Characters"))
local Remotes = require(Shared:WaitForChild("Remotes"))

local player = Players.LocalPlayer
local active = Characters.list.Sorcerer

-- ===== HUD =====
local gui = Instance.new("ScreenGui")
gui.Name = "HUD"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = true
gui.Parent = player:WaitForChild("PlayerGui")

-- HP bar
local hpFrame = Instance.new("Frame")
hpFrame.Size = UDim2.new(0, 360, 0, 32)
hpFrame.Position = UDim2.new(0.5, -180, 1, -64)
hpFrame.BackgroundColor3 = Color3.fromRGB(20, 20, 28)
hpFrame.BorderSizePixel = 0
hpFrame.Parent = gui
local hpCorner = Instance.new("UICorner")
hpCorner.CornerRadius = UDim.new(0, 6)
hpCorner.Parent = hpFrame

local hpFill = Instance.new("Frame")
hpFill.Size = UDim2.fromScale(1, 1)
hpFill.BackgroundColor3 = Color3.fromRGB(220, 80, 80)
hpFill.BorderSizePixel = 0
hpFill.Parent = hpFrame
local hpFillCorner = Instance.new("UICorner")
hpFillCorner.CornerRadius = UDim.new(0, 6)
hpFillCorner.Parent = hpFill

local hpText = Instance.new("TextLabel")
hpText.Size = UDim2.fromScale(1, 1)
hpText.BackgroundTransparency = 1
hpText.Font = Enum.Font.GothamBold
hpText.TextScaled = true
hpText.TextColor3 = Color3.new(1, 1, 1)
hpText.Text = "100 / 100"
hpText.Parent = hpFrame

-- Ability pips Q E R F
local PIP_KEYS = { "Q", "E", "R", "F" }
local pipFrame = Instance.new("Frame")
pipFrame.Size = UDim2.new(0, 360, 0, 64)
pipFrame.Position = UDim2.new(0.5, -180, 1, -132)
pipFrame.BackgroundTransparency = 1
pipFrame.Parent = gui

local pips = {}
for i, k in ipairs(PIP_KEYS) do
	local pip = Instance.new("Frame")
	pip.Size = UDim2.new(0, 72, 0, 64)
	pip.Position = UDim2.new(0, (i - 1) * 96, 0, 0)
	pip.BackgroundColor3 = Color3.fromRGB(30, 30, 40)
	pip.BorderSizePixel = 0
	pip.Parent = pipFrame
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, 6)
	c.Parent = pip

	local fill = Instance.new("Frame")
	fill.Size = UDim2.fromScale(1, 0)
	fill.AnchorPoint = Vector2.new(0, 1)
	fill.Position = UDim2.fromScale(0, 1)
	fill.BackgroundColor3 = Color3.fromRGB(80, 80, 100)
	fill.BorderSizePixel = 0
	fill.Parent = pip
	local fc = Instance.new("UICorner")
	fc.CornerRadius = UDim.new(0, 6)
	fc.Parent = fill

	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Font = Enum.Font.GothamBold
	label.TextScaled = true
	label.TextColor3 = Color3.new(1, 1, 1)
	label.Text = k
	label.Parent = pip

	pips[k] = { fill = fill, label = label }
end

-- Match state banner
local banner = Instance.new("TextLabel")
banner.Size = UDim2.new(0, 600, 0, 90)
banner.Position = UDim2.new(0.5, -300, 0, 60)
banner.BackgroundTransparency = 1
banner.Font = Enum.Font.GothamBold
banner.TextScaled = true
banner.TextColor3 = Color3.new(1, 1, 1)
banner.TextStrokeTransparency = 0
banner.TextStrokeColor3 = Color3.new(0, 0, 0)
banner.Text = ""
banner.Parent = gui

-- Queue button (centered)
local queueBtn = Instance.new("TextButton")
queueBtn.Size = UDim2.new(0, 300, 0, 72)
queueBtn.Position = UDim2.new(0.5, -150, 0.5, -36)
queueBtn.BackgroundColor3 = Color3.fromRGB(120, 180, 255)
queueBtn.BorderSizePixel = 0
queueBtn.Font = Enum.Font.GothamBold
queueBtn.TextScaled = true
queueBtn.TextColor3 = Color3.new(1, 1, 1)
queueBtn.Text = "QUEUE FOR DUEL"
queueBtn.Parent = gui
local btnCorner = Instance.new("UICorner")
btnCorner.CornerRadius = UDim.new(0, 12)
btnCorner.Parent = queueBtn

-- ===== State =====
local matchState = "lobby"
local localCdUntil = {} :: { [string]: number }

local function setQueueBtn(text: string, color: Color3, visible: boolean, active: boolean)
	queueBtn.Text = text
	queueBtn.BackgroundColor3 = color
	queueBtn.Visible = visible
	queueBtn.Active = active
end

queueBtn.MouseButton1Click:Connect(function()
	if matchState == "lobby" then
		Remotes.Queue:FireServer()
	end
end)

Remotes.MatchState.OnClientEvent:Connect(function(state, opponentName)
	matchState = state
	if state == "queued" then
		setQueueBtn("QUEUED...", Color3.fromRGB(80, 80, 100), true, false)
		banner.Text = "Waiting for opponent..."
	elseif state == "fight" then
		setQueueBtn("", Color3.fromRGB(0, 0, 0), false, false)
		banner.Text = "VS " .. (opponentName or "?")
		task.delay(2.5, function()
			if matchState == "fight" and string.sub(banner.Text, 1, 2) == "VS" then
				banner.Text = ""
			end
		end)
	elseif state == "win" then
		banner.Text = "VICTORY"
		setQueueBtn("VICTORY", Color3.fromRGB(100, 200, 100), true, false)
	elseif state == "loss" then
		banner.Text = "DEFEAT"
		setQueueBtn("DEFEAT", Color3.fromRGB(200, 100, 100), true, false)
	elseif state == "lobby" then
		banner.Text = ""
		setQueueBtn("QUEUE FOR DUEL", Color3.fromRGB(120, 180, 255), true, true)
	end
end)

Remotes.HpChanged.OnClientEvent:Connect(function(hp, maxHp)
	local frac = math.clamp(hp / maxHp, 0, 1)
	hpFill:TweenSize(UDim2.fromScale(frac, 1), Enum.EasingDirection.Out, Enum.EasingStyle.Quad, 0.15, true)
	hpText.Text = string.format("%d / %d", math.floor(hp), math.floor(maxHp))
end)

-- ===== Input + local cooldown =====
local KEYS = {
	[Enum.KeyCode.Q] = "Q",
	[Enum.KeyCode.E] = "E",
	[Enum.KeyCode.R] = "R",
	[Enum.KeyCode.F] = "F",
}

UserInputService.InputBegan:Connect(function(input, processed)
	if processed then
		return
	end
	local key = KEYS[input.KeyCode]
	if not key then
		return
	end
	local ability = active.abilities[key]
	if not ability then
		return
	end
	local now = os.clock()
	if localCdUntil[key] and localCdUntil[key] > now then
		return
	end
	localCdUntil[key] = now + ability.cooldown
	Remotes.CastAbility:FireServer(key)
end)

RunService.Heartbeat:Connect(function()
	local now = os.clock()
	for _, k in ipairs(PIP_KEYS) do
		local ability = active.abilities[k]
		if not ability then
			continue
		end
		local pip = pips[k]
		local until_ = localCdUntil[k] or 0
		if until_ > now then
			local remaining = until_ - now
			local frac = math.clamp(remaining / ability.cooldown, 0, 1)
			pip.fill.Size = UDim2.fromScale(1, frac)
			pip.label.Text = string.format("%s\n%.1f", k, remaining)
		else
			pip.fill.Size = UDim2.fromScale(1, 0)
			pip.label.Text = k
		end
	end
end)

-- ===== VFX renderers =====
local function fxBeam(origin: Vector3, target: Vector3, ability)
	local dir = target - origin
	local len = dir.Magnitude
	if len < 0.001 then
		return
	end
	local beam = Instance.new("Part")
	beam.Anchored = true
	beam.CanCollide = false
	beam.Material = Enum.Material.Neon
	beam.Color = Color3.fromRGB(180, 100, 255)
	beam.Size = Vector3.new(ability.radius * 2, ability.radius * 2, len)
	beam.CFrame = CFrame.new(origin + dir * 0.5, target)
	beam.Parent = Workspace
	Debris:AddItem(beam, 0.45)
end

local function fxShockwave(origin: Vector3, _, ability)
	local ring = Instance.new("Part")
	ring.Shape = Enum.PartType.Ball
	ring.Material = Enum.Material.ForceField
	ring.Color = Color3.fromRGB(255, 100, 100)
	ring.Size = Vector3.new(2, 2, 2)
	ring.Anchored = true
	ring.CanCollide = false
	ring.Position = origin
	ring.Parent = Workspace
	Debris:AddItem(ring, 0.5)
	task.spawn(function()
		for i = 1, 14 do
			local k = i / 14
			local s = ability.radius * 2 * k
			ring.Size = Vector3.new(s, s, s)
			ring.Transparency = k
			task.wait(0.022)
		end
	end)
end

local function fxPull(origin: Vector3, target: Vector3, _)
	local dir = target - origin
	local len = dir.Magnitude
	if len < 0.001 then
		return
	end
	local beam = Instance.new("Part")
	beam.Anchored = true
	beam.CanCollide = false
	beam.Material = Enum.Material.Neon
	beam.Color = Color3.fromRGB(100, 180, 255)
	beam.Size = Vector3.new(0.6, 0.6, len)
	beam.CFrame = CFrame.new(origin + dir * 0.5, target)
	beam.Parent = Workspace
	Debris:AddItem(beam, 0.3)
end

local function fxBlink(origin: Vector3, _, _)
	local puff = Instance.new("Part")
	puff.Shape = Enum.PartType.Ball
	puff.Material = Enum.Material.ForceField
	puff.Color = Color3.fromRGB(200, 200, 255)
	puff.Size = Vector3.new(6, 6, 6)
	puff.Anchored = true
	puff.CanCollide = false
	puff.Position = origin
	puff.Parent = Workspace
	Debris:AddItem(puff, 0.25)
end

local fxByEffect = {
	pull = fxPull,
	shockwave = fxShockwave,
	beam = fxBeam,
	blink = fxBlink,
}

Remotes.AbilityFx.OnClientEvent:Connect(function(effect, origin, target, ability)
	local fn = fxByEffect[effect]
	if fn then
		fn(origin, target, ability)
	end
end)
