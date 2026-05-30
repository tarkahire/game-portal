# Setup

Detailed install + first-run instructions for someone new to Roblox Studio.

## What you need

1. **Roblox Studio** — the editor.
2. **Rojo** — a small command-line tool that watches this folder and pushes file changes into Studio so you don't have to copy-paste code.
3. **Rojo Studio plugin** — the Studio side of Rojo; it connects to the local Rojo server.

## Step 1 — Install Studio

- Visit [create.roblox.com](https://create.roblox.com).
- Click **Start Creating**. It downloads the installer.
- Sign in with your Roblox account.

## Step 2 — Install Rojo (the CLI)

Easiest method on Windows: download the prebuilt binary.

1. Open [github.com/rojo-rbx/rojo/releases](https://github.com/rojo-rbx/rojo/releases) in your browser.
2. Download `rojo-win64.zip` from the latest stable release.
3. Right-click → **Extract All**. You'll get a `rojo.exe`.
4. Move `rojo.exe` into this `roblox-game/` folder (simplest), OR put it somewhere on your PATH if you know what that means.

Verify:

```powershell
cd "C:\Users\user\Coding projects\game-portal\roblox-game"
.\rojo.exe --version
```

You should see e.g. `Rojo 7.4.4`. If you see "rojo is not recognized", it's not on PATH — use `.\rojo.exe` like above.

## Step 3 — Install the Rojo Studio plugin

1. Open Studio.
2. Top menu → **Plugins** tab → **Manage Plugins** → **Find Plugins**.
3. Search "Rojo".
4. Install the one published by **LPGhatguy** / **Roblox Corporation**.

After install you'll see a Rojo button on the Plugins ribbon.

## Step 4 — First run

1. **Start the Rojo server.** In a terminal, from this folder:
   ```powershell
   .\rojo.exe serve
   ```
   You should see:
   ```
   Rojo server listening:
     Address: localhost
     Port:    34872
   ```
   Leave this terminal open — closing it stops the sync.

2. **Open Studio**, create a new place: **File → New From Template → Baseplate**.

3. **Connect Rojo.** Click the Rojo plugin button in the Plugins ribbon, then **Connect**. The default address is `localhost:34872`. You should see a green status and your tree fills in: `ReplicatedStorage > Shared > Characters / Remotes`, etc.

4. **Press Play (F5).** You drop into the lobby with the HUD visible. Click **QUEUE FOR DUEL** — since you're alone, the queue will say "Waiting for opponent...".

5. **Test 1v1.** Stop play, then Studio → **Test** tab → **Clients and Servers** → set **Local Server** to **2 players** → **Start**. You'll get a server window + two client windows. Click QUEUE in both — they'll teleport to the arena and fight.

## Working day-to-day

- Edit any file in `src/` — Rojo syncs it into Studio immediately. You can keep Studio open and just keep editing.
- If a script change doesn't seem to apply, stop Play, then re-Play. Scripts run on play, not on sync.
- **Never edit code inside Studio** — that won't sync back to disk, and your next file change will overwrite it.

## Troubleshooting

**Rojo says "address already in use"** — another Rojo is already running. Find the old terminal and close it.

**Studio plugin says "could not connect"** — the Rojo CLI isn't running. Start it with `.\rojo.exe serve`.

**Nothing happens when I click QUEUE alone** — that's correct, you need 2 players. Use Local Server 2 players in the Test tab.

**My character spawns into the void** — Studio's default Baseplate spawn might be far from our lobby. The Arena script places the lobby at the origin (0, 0, 0). Default Baseplate spawn point is also at the origin, so this should be fine; if not, move the SpawnLocation to (0, 4, 0).

**Abilities not doing damage to me when I test solo** — abilities target "any other player". Solo there's nobody to hit. Use Local Server 2 players.
