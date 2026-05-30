--!strict
-- Single source of truth for RemoteEvents.
-- Lazily creates them under ReplicatedStorage.Remotes so both server and client
-- can require this module and just use the returned table.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local folder = ReplicatedStorage:FindFirstChild("Remotes")
if not folder then
	folder = Instance.new("Folder")
	folder.Name = "Remotes"
	folder.Parent = ReplicatedStorage
end

local function get(name: string): RemoteEvent
	local existing = folder:FindFirstChild(name)
	if existing and existing:IsA("RemoteEvent") then
		return existing
	end
	local r = Instance.new("RemoteEvent")
	r.Name = name
	r.Parent = folder
	return r
end

return {
	CastAbility = get("CastAbility"), -- client -> server: "I pressed key X"
	AbilityFx = get("AbilityFx"), -- server -> all clients: "play VFX X here"
	Queue = get("Queue"), -- client -> server: "queue me for a duel"
	MatchState = get("MatchState"), -- server -> client: "lobby" / "queued" / "fight" / "win" / "loss"
	HpChanged = get("HpChanged"), -- server -> client: HP HUD update
}
