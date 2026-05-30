# Duel Arena (Roblox)

A 1v1 anime-ability duel game. Queue from the lobby, get matched with another player, fight with Q/E/R/F abilities, winner is whoever's HP doesn't hit 0 first.

This folder is a [Rojo](https://rojo.space) project — Lua scripts live here on disk, and Rojo syncs them into Roblox Studio.

## First-time setup

You're new to Roblox Studio, so the goal of this section is: get something on screen as fast as possible.

### 1. Install Roblox Studio

- Go to [create.roblox.com](https://create.roblox.com) → click **Start Creating** → it'll install Studio.
- Sign in with your Roblox account (create one if needed).

### 2. Install Rojo (the syncer)

Rojo is a small command-line tool that watches this folder and pushes changes into Studio.

The simplest install on Windows:

1. Go to [github.com/rojo-rbx/rojo/releases](https://github.com/rojo-rbx/rojo/releases)
2. Download `rojo-win64.zip` from the latest release
3. Unzip it. You'll get `rojo.exe`.
4. Put `rojo.exe` somewhere on your PATH, OR just drop it into this `roblox-game/` folder.

Test it from a terminal in `roblox-game/`:

```powershell
.\rojo.exe --version
```

You should see something like `Rojo 7.x.x`.

### 3. Install the Rojo Studio plugin

1. Open Roblox Studio
2. Top menu → **Plugins** → **Manage Plugins** → **Find Plugins**
3. Search for **Rojo** (by Roblox Corporation / LPGhatguy)
4. Click **Install**

### 4. Run it

1. In a terminal, from this folder:
   ```powershell
   .\rojo.exe serve
   ```
   You'll see `Rojo server listening: http://localhost:34872`. Leave this running.
2. In Studio: **File** → **New Place** → pick **Baseplate**.
3. Click the **Rojo** plugin button at the top → **Connect** (default address `localhost:34872`).
4. Press **F5** (or the Play button). You're in the lobby — click **QUEUE FOR DUEL**.
5. To test 1v1, open a second Studio window with **2 players** in Test → Local Server.

That's it. Edit any file in `src/` and Studio updates live as long as Rojo is running.

## Controls

| Key | Action |
|-----|--------|
| WASD | Move |
| Space | Jump |
| Q | Blue — pull projectile, yanks enemy toward you (4s cd) |
| E | Red — repulsion shockwave, knocks back (6s cd) |
| R | Hollow Purple — big beam (18s cd) |
| F | Blink — short teleport in look direction (7s cd) |

## File structure

```
roblox-game/
  default.project.json              Rojo project (defines the Studio tree)
  src/
    ReplicatedStorage/Shared/
      Characters.lua                 Character + ability definitions
      Remotes.lua                    RemoteEvent registry
    ServerScriptService/
      Arena.server.lua               Builds the lobby + arena geometry
      MatchManager.server.lua        1v1 queue, teleport, win detection
      AbilityHandler.server.lua      Validates and applies ability casts
    StarterPlayer/StarterPlayerScripts/
      Client.client.lua              HUD, input, queue UI, VFX
  docs/                              Per-feature documentation
```

## Documentation

- [`docs/setup.md`](docs/setup.md) — detailed install + troubleshooting
- [`docs/architecture.md`](docs/architecture.md) — how the pieces fit together
- [`docs/abilities.md`](docs/abilities.md) — how to add a new ability
- [`docs/todo.md`](docs/todo.md) — what's next
- [`docs/devlog.md`](docs/devlog.md) — reverse-chronological dev notes
- [`docs/bugs.md`](docs/bugs.md) — known bugs
