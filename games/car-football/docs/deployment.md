# Deployment & Game Portal

## Overview

This document covers how to deploy Car Football (and future games) as a game portal on Vercel. The portal is a static website with a landing page that links to individual games, each living in its own subfolder.

## Why Vercel Works

Vercel is ideal for this setup because:

- **Static hosting** — all our games are pure HTML/CSS/JS with no backend, which is exactly what Vercel is built for
- **Free/cheap** — the Hobby plan is free; Pro plan (if you're subscribed) gives more bandwidth and features
- **Global CDN** — games load fast worldwide via Vercel's edge network
- **Zero config** — just push to GitHub and it auto-deploys
- **Custom domains** — attach your own domain if desired
- **No server needed** — since our games run entirely in the browser, there's no need for WebSockets, databases, or server processes

## Recommended Project Structure

```
game-portal/
|
|-- index.html              # Landing page — lists all games with thumbnails
|-- styles.css              # Portal-wide styles
|-- assets/
|   |-- portal-logo.png     # Portal branding (optional)
|   |-- thumbnails/
|       |-- car-football.png    # Game thumbnail
|       |-- future-game.png     # Thumbnail for next game
|
|-- games/
|   |-- car-football/       # <-- Copy of the football car game project
|   |   |-- index.html
|   |   |-- src/
|   |   |-- assets/
|   |   |-- ...
|   |
|   |-- future-game/        # <-- Next game goes here
|       |-- index.html
|       |-- ...
|
|-- vercel.json             # Optional Vercel config (custom headers, redirects)
```

### How it works

1. The portal root `index.html` is a landing page with cards/thumbnails for each game
2. Each game lives in `games/<game-name>/` as a fully self-contained folder
3. Clicking a game card navigates to `games/car-football/index.html`
4. Each game is completely independent — its own HTML, JS, assets
5. Adding a new game = drop a folder into `games/` and add a card to the landing page

## Step-by-Step Deployment Guide

### Step 1: Create the portal project

```bash
mkdir game-portal
cd game-portal
git init
```

### Step 2: Create the landing page

Create `index.html` at the root with a simple grid of game cards. Each card links to the game's subfolder.

### Step 3: Copy Car Football into the portal

```bash
mkdir -p games/car-football
# Copy all game files (excluding docs, .git, etc.)
cp -r "path/to/football car game/index.html" games/car-football/
cp -r "path/to/football car game/src" games/car-football/
cp -r "path/to/football car game/assets" games/car-football/
```

### Step 4: Push to GitHub

```bash
git add .
git commit -m "Initial portal with Car Football"
git remote add origin https://github.com/YOUR_USERNAME/game-portal.git
git push -u origin main
```

### Step 5: Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your `game-portal` GitHub repository
4. Framework Preset: select "Other" (it's a static site, not Next.js/React)
5. Build settings: leave blank (no build step needed)
6. Click "Deploy"

Vercel will deploy and give you a URL like `game-portal-xyz.vercel.app`.

### Step 6: (Optional) Custom domain

In Vercel project settings > Domains, add your custom domain. Vercel handles SSL automatically.

## Vercel Configuration (Optional)

Create `vercel.json` at the portal root for any custom settings:

```json
{
    "headers": [
        {
            "source": "/games/(.*)",
            "headers": [
                {
                    "key": "Cache-Control",
                    "value": "public, max-age=3600"
                }
            ]
        }
    ]
}
```

This caches game assets for 1 hour, reducing bandwidth usage.

## Adding Future Games

To add a new game to the portal:

1. Build the game as a self-contained folder with its own `index.html`
2. Drop it into `games/<game-name>/`
3. Add a card to the portal's root `index.html`
4. Create a thumbnail image in `assets/thumbnails/`
5. Push to GitHub — Vercel auto-deploys

## Cost Estimate (Vercel)

| Plan | Price | Bandwidth | Suitable For |
|------|-------|-----------|--------------|
| Hobby | Free | 100 GB/month | Personal use, small audience |
| Pro | $20/month | 1 TB/month | Public-facing portal with moderate traffic |

A single game session transfers ~2-5 MB (Phaser CDN is cached by the browser after first load). At 100 GB/month free, that's roughly 20,000-50,000 game loads before hitting limits.

## Important Notes

### Phaser CDN Dependency
The game loads Phaser.js from `cdn.jsdelivr.net`. This is fine for deployment — the CDN is fast and reliable. If you want full independence, download `phaser.min.js` and include it locally in the game folder.

### No Backend Required
All games run entirely in the browser. Vercel serves the files, and the player's browser does all the work. This means:
- No server costs beyond static hosting
- No WebSocket servers needed
- No database
- Scales automatically (Vercel's CDN handles traffic spikes)

### ES Module Caveat
The game uses `<script type="module">`, which requires proper MIME types. Vercel handles this correctly out of the box — no configuration needed.

### File Paths
The Car Football game uses relative paths for assets (`assets/images/blue car.jpg`, `src/main.js`). These work correctly when the game is in a subfolder like `games/car-football/` because all paths are relative to the game's own `index.html`.

## Future Enhancements

These could be added to the portal later without changing the hosting setup:

- **Leaderboards** — use a free service like Firebase Realtime Database or Supabase to store high scores
- **Game analytics** — add a lightweight analytics script to track which games are most popular
- **User accounts** — use Vercel's serverless functions + a database for login/profiles (adds complexity)
- **Online multiplayer** — would require a separate WebSocket server (not on Vercel). Platforms like Railway, Fly.io, or Render can host a Node.js WebSocket server cheaply. This is a significant architectural change and would be a separate project.
