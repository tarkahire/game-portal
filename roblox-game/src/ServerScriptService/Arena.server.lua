-- Builds the lobby + duel arena geometry at server start.
-- Lobby sits around the world origin. Arena is offset to (0, 0, 200).

local Workspace = game:GetService("Workspace")

local function makePart(props): Part
	local p = Instance.new("Part")
	p.Anchored = true
	p.CanCollide = true
	for k, v in pairs(props) do
		(p :: any)[k] = v
	end
	return p
end

-- ===== Lobby =====
local lobby = Instance.new("Folder")
lobby.Name = "Lobby"
lobby.Parent = Workspace

makePart({
	Name = "LobbyFloor",
	Size = Vector3.new(120, 2, 120),
	Position = Vector3.new(0, 0, 0),
	Material = Enum.Material.SmoothPlastic,
	Color = Color3.fromRGB(45, 50, 60),
	Parent = lobby,
})

-- Neon pillars
for _, pos in ipairs({
	Vector3.new(-50, 8, -50),
	Vector3.new(50, 8, -50),
	Vector3.new(-50, 8, 50),
	Vector3.new(50, 8, 50),
}) do
	makePart({
		Size = Vector3.new(3, 16, 3),
		Position = pos,
		Material = Enum.Material.Neon,
		Color = Color3.fromRGB(120, 220, 255),
		Parent = lobby,
	})
end

-- Floating welcome sign
local sign = makePart({
	Name = "WelcomeSign",
	Size = Vector3.new(20, 6, 1),
	Position = Vector3.new(0, 10, -20),
	Material = Enum.Material.Neon,
	Color = Color3.fromRGB(20, 30, 50),
	Parent = lobby,
})
local gui = Instance.new("SurfaceGui")
gui.Face = Enum.NormalId.Front
gui.Parent = sign
local txt = Instance.new("TextLabel")
txt.Size = UDim2.fromScale(1, 1)
txt.BackgroundTransparency = 1
txt.Font = Enum.Font.GothamBold
txt.TextScaled = true
txt.TextColor3 = Color3.fromRGB(120, 220, 255)
txt.Text = "DUEL ARENA\nClick QUEUE to fight"
txt.Parent = gui

-- ===== Arena =====
local arena = Instance.new("Folder")
arena.Name = "Arena"
arena.Parent = Workspace

local ARENA_CENTER = Vector3.new(0, 0, 200)

makePart({
	Name = "ArenaFloor",
	Size = Vector3.new(160, 2, 160),
	Position = ARENA_CENTER,
	Material = Enum.Material.Concrete,
	Color = Color3.fromRGB(35, 35, 45),
	Parent = arena,
})

-- Neon ring border
for _, side in ipairs({
	{ pos = ARENA_CENTER + Vector3.new(0, 3, -80), size = Vector3.new(160, 6, 2) },
	{ pos = ARENA_CENTER + Vector3.new(0, 3, 80), size = Vector3.new(160, 6, 2) },
	{ pos = ARENA_CENTER + Vector3.new(-80, 3, 0), size = Vector3.new(2, 6, 160) },
	{ pos = ARENA_CENTER + Vector3.new(80, 3, 0), size = Vector3.new(2, 6, 160) },
}) do
	makePart({
		Size = side.size,
		Position = side.pos,
		Material = Enum.Material.Neon,
		Color = Color3.fromRGB(255, 80, 120),
		Parent = arena,
	})
end

-- Cover pillars in the arena
for _, pos in ipairs({
	ARENA_CENTER + Vector3.new(-25, 6, -25),
	ARENA_CENTER + Vector3.new(25, 6, 25),
	ARENA_CENTER + Vector3.new(-25, 6, 25),
	ARENA_CENTER + Vector3.new(25, 6, -25),
}) do
	makePart({
		Size = Vector3.new(6, 12, 6),
		Position = pos,
		Material = Enum.Material.Slate,
		Color = Color3.fromRGB(60, 60, 70),
		Parent = arena,
	})
end
