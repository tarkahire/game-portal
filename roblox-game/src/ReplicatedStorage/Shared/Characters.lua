--!strict
-- Character + ability definitions.
-- This is the Luau equivalent of definitions.js in the browser games.
-- Both server and client require this module so they agree on stats.

local Characters = {}

Characters.list = {
	Sorcerer = {
		name = "Sorcerer",
		maxHp = 150,
		walkSpeed = 18,
		color = Color3.fromRGB(120, 180, 255),
		abilities = {
			Q = {
				name = "Blue (Pull)",
				key = "Q",
				cooldown = 4,
				damage = 22,
				effect = "pull",
				radius = 4,
				yank = 90,
			},
			E = {
				name = "Red (Repulsion)",
				key = "E",
				cooldown = 6,
				damage = 32,
				effect = "shockwave",
				radius = 14,
				knockback = 90,
			},
			R = {
				name = "Hollow Purple",
				key = "R",
				cooldown = 18,
				damage = 85,
				effect = "beam",
				range = 70,
				radius = 4,
			},
			F = {
				name = "Blink",
				key = "F",
				cooldown = 7,
				damage = 0,
				effect = "blink",
				distance = 30,
			},
		},
	},
}

return Characters
