# Future Vision — Dad's Army

This document captures future plans for aesthetics, mechanics, major updates, and long-term direction. These are ideas to explore after the core game is stable, not current commitments.

---

## Aesthetic Vision

### Near-term (Post Phase 4)
- **Animated map**: smooth army movement along paths, building construction animations, resource extraction animations (mining picks, oil pumps, farm harvests)
- **Battle animations**: when combat triggers, brief visual sequence showing unit clashes, explosions, retreats
- **Sound design**: ambient map sounds (wind, birds, distant gunfire), UI click sounds, combat audio, music themes per alignment
- **Weather effects**: rain, snow, fog rendered on map canvas. Visual only initially, gameplay effects later.
- **Day/night cycle**: cosmetic map lighting changes based on server time. Night could reduce vision range (gameplay).

### Medium-term
- **Sprite upgrades**: higher-resolution unit sprites, animated idle/march cycles, terrain tile variations (no two forest hexes look identical)
- **UI overhaul**: polished panels with WW2-era aesthetic (war-room style maps, ticker-tape notifications, radio-style communications panel)
- **Particle effects**: smoke from factories, fire from battles, dust from marching armies
- **Mobile-first redesign**: responsive touch UI, pinch-to-zoom map, swipe gestures

### Long-term
- **3D map exploration**: optional 3D view where you can zoom into a hex and see a simple 3D scene of the terrain, buildings, units. Isometric or low-poly style. Toggle between strategic 2D and immersive 3D.
- **Cinematic replays**: generate a time-lapse replay of the entire server's 45-day history showing territorial changes, major battles, alliance shifts

---

## Mechanical Vision

### New Eras / Time Periods
Different server types with completely different resource sets, units, buildings, and mechanics:

**Medieval Era**
- Resources: Peasants, Food, Wood, Stone, Iron, Gold
- Units: Militia, Archers, Knights, Siege Engines, Warships (galleys)
- Mechanics: Feudal loyalty system (vassals can rebel), castle sieges, religious influence
- No air warfare. Naval is coastal only.

**World War 1 Era**
- Resources: similar to WW2 but no rubber/aluminum (pre-mechanization emphasis)
- Units: Infantry (dominant), early tanks (unreliable, slow), artillery (king of the battlefield), biplanes (recon + strafing), primitive submarines
- Mechanics: Trench warfare system (entrenched positions are extremely hard to break), attrition-focused combat, gas attacks (area denial), morale more important than material
- Map: Western Front style — dense fortification lines, narrow frontage, breakthrough as primary strategy

**Modern Era**
- Resources: Oil, Rare Earth Minerals, Electronics, Steel, Uranium, Money
- Units: Modern infantry with body armor, main battle tanks, guided missiles, stealth aircraft, nuclear submarines, aircraft carriers, drones
- Mechanics: Cyber warfare (hack enemy systems), satellite reconnaissance (global vision), guided munitions (precision strikes), asymmetric warfare
- Nuclear weapons as endgame deterrent (MAD — Mutually Assured Destruction mechanic)

**Cold War Era**
- Proxy wars, espionage-heavy, nuclear brinkmanship
- Space race as alternative victory condition
- Ideological influence spreading mechanic

### Advanced Mechanics (All Eras)

**Civilian Population System**
- Cities have civilian populations that grow, produce manpower, pay taxes
- Population affected by: food supply, war damage, morale, healthcare
- Conscription draws from civilian population — too much conscription = economic collapse
- Refugee mechanics: civilians flee war zones, creating population crises

**Partisan/Guerrilla Warfare**
- Occupied enemy provinces can spawn partisan units that sabotage, raid supply lines, and gather intelligence
- Partisan strength based on occupation harshness and time since capture
- Counter-partisan operations require garrison troops

**Environmental Mechanics**
- Seasons affecting movement (mud in spring/autumn, snow in winter)
- River flooding, drought affecting farms
- Environmental destruction from heavy industry (pollution reducing farmland)

**Advanced Naval**
- Submarine wolfpacks (coordinated submarine groups with bonus damage)
- Carrier task forces (carriers + escorts as a single deployable fleet)
- Amphibious landing craft (specialized vehicles)
- Naval mines and minesweeping operations

**Events System**
- Random world events: severe weather, plague, industrial accidents, resource discovery
- Events create opportunities and crises that disrupt plans and create dynamic gameplay
- Server-wide events that affect all players (e.g., "Harsh Winter — all movement -25% for 3 days")

---

## Platform Vision

### Web App Improvements
- Progressive Web App (PWA): offline caching, push notifications, installable on mobile
- WebSocket real-time map: live updates without polling
- WebGL rendering for hardware-accelerated map drawing

### Mobile App
- Native iOS/Android app wrapping the web game
- Push notifications for attacks, building completions, alliance messages
- Simplified mobile UI for quick check-ins (review state, queue actions)
- Full gameplay possible on mobile

### Desktop App
- Electron wrapper for dedicated desktop experience
- System tray notifications
- Keyboard shortcuts for power users

### Social Features
- Player profiles with stats across all servers
- Achievement system (first city, first battle won, first alliance formed, etc.)
- Seasonal rankings and leaderboards
- Replay sharing (share interesting server histories)
- Spectator mode for completed servers
- Community forums/Discord integration

### Competitive Scene
- Tournament servers with structured brackets
- ELO-style ranking system
- Prize pool servers (competitive entry fee model)
- Streaming-friendly spectator mode

---

## Technical Vision

### Backend Evolution
- If game outgrows Supabase: migrate to dedicated PostgreSQL + Node.js/Express backend on Railway/Fly.io
- WebSocket server for sub-second real-time updates
- Microservices: separate combat resolution, tick processing, and real-time services
- Redis caching for frequently-accessed game state

### Performance
- WebGL hex renderer for better performance at scale
- Worker threads for pathfinding and combat prediction
- CDN-cached static assets with cache-busting for updates
- Database query optimization with materialized views

### Scalability
- Support for 100+ player servers
- 5000+ tile maps
- Multiple simultaneous server instances
- Global region support (US, EU, Asia Supabase instances)

---

## Lessons to Capture for V2

When building version 2 (or a new game), the development-log.md should capture:
- What architecture decisions worked and what we'd change
- Which game mechanics were most fun vs most frustrating
- Balance data from server playthroughs
- UI/UX patterns that players liked or struggled with
- Technical debt accumulated and how to avoid it
- Community feedback themes
- What we'd build first if starting over
