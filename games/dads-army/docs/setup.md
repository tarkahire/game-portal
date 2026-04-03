# Setup Guide — Dad's Army

Step-by-step instructions to set up the full infrastructure from scratch.

---

## Prerequisites

- A Supabase account (paid plan recommended for pg_cron and higher limits)
- A GitHub repository connected to Vercel for auto-deployment
- A modern browser for development/testing

---

## 1. Supabase Project Setup

### 1.1 Create Project
1. Go to [supabase.com](https://supabase.com) → Dashboard → "New Project"
2. Name: `dads-army` (or your preference)
3. Database password: generate and save securely
4. Region: choose closest to your target audience
5. Wait for project to provision (~2 minutes)

### 1.2 Get Credentials
From Project Settings → API:
- **Project URL**: `https://your-project.supabase.co`
- **Anon (public) key**: used in the frontend JS client
- **Service role key**: used ONLY in Edge Functions (never expose to frontend)

### 1.3 Configure Auth
1. Go to Authentication → Providers
2. **Email**: Enabled by default. Confirm "Enable email confirmations" setting (disable for dev, enable for production)
3. **Google OAuth**:
   - Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
   - Create OAuth 2.0 Client ID (Web application)
   - Authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret back into Supabase Google provider settings
4. **Auth settings**:
   - Site URL: `https://your-vercel-domain.vercel.app/games/dads-army/`
   - Redirect URLs: add your Vercel domain and `http://localhost` for dev

### 1.4 Deploy Database Schema
1. Go to SQL Editor in Supabase Dashboard
2. Run the schema migration scripts in order:
   - `sql/001_core_tables.sql` — game_servers, players, alliances
   - `sql/002_map_tables.sql` — tiles, tile_adjacency
   - `sql/003_city_tables.sql` — cities, buildings, resource_fields, city_resources
   - `sql/004_military_tables.sql` — armies, army_units, training_queue, unit_defs
   - `sql/005_research_tables.sql` — research_defs, player_research, intelligence_ops
   - `sql/006_economy_tables.sql` — loans, trade_routes, battle_reports, messages
   - `sql/007_definitions.sql` — building_defs, alignment_defs, seed data
   - `sql/008_rls_policies.sql` — Row Level Security policies for all tables
   - `sql/009_functions.sql` — Game tick functions, combat resolution
   - `sql/010_cron.sql` — pg_cron scheduled jobs

### 1.5 Enable pg_cron
1. Go to Database → Extensions
2. Search for `pg_cron` and enable it
3. The cron jobs from `sql/010_cron.sql` will register the game tick function to run every 60 seconds

### 1.6 Deploy Edge Functions (if used)
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy edge functions
supabase functions deploy combat-resolver
supabase functions deploy server-tick
```

### 1.7 Enable Realtime
1. Go to Database → Replication
2. Enable Realtime for these tables: `tiles`, `armies`, `battle_reports`, `messages`
3. This allows the frontend to subscribe to live updates

---

## 2. Frontend Configuration

### 2.1 Environment Variables
The Supabase URL and anon key are public (safe to include in frontend code). Create a config:

In `src/api/supabaseClient.js`:
```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

**Note**: The anon key is designed to be public. It works with RLS policies to restrict data access. Never expose the service role key.

### 2.2 CDN Dependencies
The `index.html` loads Supabase JS SDK from CDN:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
```

No npm install or build step required.

---

## 3. Vercel Deployment

### 3.1 Connect Repository
1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → "Add New Project"
3. Import the GitHub repository
4. Framework: "Other" (static site)
5. Build settings: leave blank (no build step)
6. Deploy

### 3.2 Custom Domain (Optional)
1. In Vercel project → Settings → Domains
2. Add your custom domain
3. Update Supabase Auth redirect URLs to include the custom domain

---

## 4. Seeding a Game Server

After deploying the schema:

1. Run `sql/seed_map_european_theater.sql` — creates the 999-hex map with terrain and resource distribution
2. Run `sql/seed_definitions.sql` — populates building_defs, unit_defs, research_defs for WW2 era
3. Run `sql/seed_server.sql` — creates a game server entry with the European theater map

Players can then join the server from the server select screen.

---

## 5. Development Workflow

1. Edit files locally in `games/dads-army/`
2. Test by opening `index.html` in browser (or use a local server: `npx serve .` from the dads-army folder)
3. Commit and push to GitHub — Vercel auto-deploys
4. Check Supabase Dashboard for database state, auth users, and logs

---

## 6. SQL Migration Files

All SQL files will live in `games/dads-army/sql/` (created during Phase 1):

| File | Purpose |
|------|---------|
| `001_core_tables.sql` | game_servers, players, alliances, alliance_members, diplomatic_relations |
| `002_map_tables.sql` | tiles, tile_adjacency |
| `003_city_tables.sql` | cities, buildings, resource_fields, city_resources, supply_routes |
| `004_military_tables.sql` | unit_defs, armies, army_units, training_queue |
| `005_research_tables.sql` | research_defs, player_research, intelligence_ops |
| `006_economy_tables.sql` | loans, trade_routes, battle_reports, messages |
| `007_definitions.sql` | building_defs, alignment_defs with WW2 seed data |
| `008_rls_policies.sql` | Row Level Security for all tables |
| `009_functions.sql` | PL/pgSQL game tick, combat resolution, resource materialization |
| `010_cron.sql` | pg_cron job registration |
| `seed_map_european_theater.sql` | 999-hex European theater map data |
| `seed_definitions.sql` | WW2 building/unit/research definitions |
| `seed_server.sql` | Create a playable game server |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Auth redirect fails | Check Supabase Auth → URL Configuration → Redirect URLs includes your domain |
| RLS blocks queries | Check policies in SQL Editor. Use `supabase.auth.getUser()` to verify JWT |
| pg_cron not running | Verify extension is enabled. Check `cron.job` table for registered jobs |
| Realtime not updating | Verify table is added to Replication. Check browser console for subscription errors |
| CORS errors | Supabase handles CORS automatically. If issues, check custom headers in vercel.json |
