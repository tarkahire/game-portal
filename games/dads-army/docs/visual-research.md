# Visual Aesthetics Research — Dad's Army WW2 Strategy Game

Comprehensive research on visual style, UI/UX design, and graphics approaches for a browser-based hex WW2 strategy game. All recommendations target HTML5 Canvas + vanilla CSS/JS (no game engine).

---

## Table of Contents

1. [Visual Style References from Strategy Games](#1-visual-style-references-from-strategy-games)
2. [WW2 Visual Language](#2-ww2-visual-language)
3. [Browser Game Graphics Techniques](#3-browser-game-graphics-techniques)
4. [Terrain Visualization Approaches](#4-terrain-visualization-approaches)
5. [Unit Visualization](#5-unit-visualization)
6. [City/Building Visualization](#6-citybuilding-visualization)
7. [UI Panel Design for Strategy Games](#7-ui-panel-design-for-strategy-games)
8. [Actionable Recommendations for Dad's Army](#8-actionable-recommendations-for-dads-army)

---

## 1. Visual Style References from Strategy Games

### Supremacy 1914

| Aspect | Description |
|--------|-------------|
| **Map rendering** | Uses a painted/illustrated historical map as the base layer. Provinces are regions on a period-accurate map of Europe, not individual hex cells. The terrain has a hand-drawn cartographic quality — rivers, mountains, and coastlines appear as if drawn by a wartime cartographer. The map is essentially a textured bitmap with province boundaries overlaid. |
| **Unit representation** | Units are shown as small 2D sprites with military silhouettes (infantry figures, artillery pieces, tanks) positioned on the map. Stacked armies show a primary sprite with a number badge. Enemy forces within fog of war appear as translucent sprites with question marks. Each unit has two concentric circles representing visual range (inner bright, outer dim). |
| **Terrain textures** | Terrain is conveyed through the base map texture — green for plains/forests, brown/tan for deserts, white for snow, blue for water. The map has a distinctly "aged paper" quality, like a WW1-era military map. Mountains are shown with shaded relief rather than distinct hex textures. |
| **City visualization** | Cities appear as labeled dots/icons on the map with the province name. Capital cities are distinguished with larger icons. Province control is shown by colored shading over the province region, with the controlling player's color applied as a semi-transparent wash. |
| **UI panel design** | Dark-themed panels with a military olive/grey palette. Province detail panel appears on click, showing production buildings, morale, resource output. A right-side province list provides quick navigation. Resource bar at top with icon + number pairs. Unit deployment through popup menus. |
| **Color palette** | Dark background (#1a1a2e range), khaki/tan text, olive green accents, muted earthy tones overall. Red for enemies, blue for allies. The map itself uses natural earth tones — greens, browns, blues. |

### Hearts of Iron IV

| Aspect | Description |
|--------|-------------|
| **Map rendering** | Province-based system with thousands of small irregular provinces grouped into states. The default map mode shows terrain with a semi-realistic painted look — green lowlands, brown highlands, white snow. Different map modes (political, supply, air) completely re-color the map. Political mode washes each country in its national color. The map uses a combination of heightmap-based terrain rendering with 2D texture overlays. |
| **Unit representation** | Military units are shown as rectangular NATO-style counters with unit type icons (infantry cross, armor triangle, etc.), division name, and colored background matching the controlling nation. Divisions stack into armies and army groups. In combat, small battle icons (crossed swords) appear on the map. Unit strength shown by a colored bar beneath the counter. |
| **Province/region rendering** | Province borders are thin lines, state borders are thicker. National borders are bold colored lines. The terrain underneath shows through province coloring. Infrastructure, forts, and other improvements are shown as small icons on provinces. Supply lines appear as flowing arrows across the map. |
| **UI panel design** | The top bar contains: national flag, political power, stability, war support, manpower, factories (civilian/military/naval), resources (oil, aluminum, rubber, tungsten, steel, chromium) — each with icon + number. Division info panels are rectangular cards showing division template, equipment status, organization (green bar), strength (orange bar), and XP level. The production screen lists equipment with factory allocation sliders. Research screen shows a tech tree organized into categories. |
| **Color palette** | Dark grey-blue panels (#2a2a3a range). Gold/amber for headers and important values. Green for organization, orange for strength, red for critical alerts. The map uses warm earth tones. Country colors are bold and saturated to be distinguishable at a glance. |

### Civilization VI

| Aspect | Description |
|--------|-------------|
| **Map rendering** | Full hex grid with each hex individually textured. The main view is 3D with animated terrain, but the "Strategic View" flattens everything to a clean 2D illustrated style with distinct hex tiles. Each terrain type has a unique illustration — grassland shows waving grass, forests show tree clusters, mountains show peaked ridges. Adjacent mountains connect into continuous ridges; rivers flow naturally between hex edges. |
| **Unit representation** | In 3D view: fully animated 3D unit models. In Strategic View: clean 2D icon silhouettes on hex tiles — swordsman icon, horseman icon, settler wagon. Units are color-coded to their civilization. One unit per hex (with some stacking exceptions). |
| **Terrain on hexes** | Each hex tile is a self-contained illustration that visually blends with neighbors. Forest hexes show tree canopies, desert hexes show sand dunes, coast hexes show water gradients. Tile improvements (farms, mines, quarries) appear as small illustrated additions on top of the terrain. Districts occupy full hex tiles with distinct building illustrations. |
| **City visualization** | Cities start as a small City Center district and expand outward through districts placed on adjacent hexes. Each district type has a unique visual identity — the campus has libraries and observatories; the industrial zone has smokestacks; the encampment has fortified walls. City growth is visually apparent as the cluster of developed hexes expands. A "City Banner" floats above showing city name, population, production progress, and walls indicator. |
| **UI design** | Bottom-of-screen action bar with unit commands. City panels overlay the map as semi-transparent panels rather than replacing the view. Tech tree is a scrollable horizontal timeline. Resource yields are shown per-hex with small floating icons (food, production, gold, science, culture, faith). Minimalist overall — the map IS the primary interface. |

### Company of Heroes

| Aspect | Description |
|--------|-------------|
| **Visual language** | Gritty, realistic WW2 aesthetic. The palette is muted and war-torn: muddy browns, smoky greys, olive greens. Buildings are detailed and destructible — walls crumble, roofs collapse. Vehicles get progressively dirty, dented, and scarred during battle. |
| **Unit design** | Squads of individually modeled soldiers with distinct equipment. Players and community strongly prefer hand-drawn 2D icon art over 3D-rendered icons for readability — simplified silhouettes convey unit type faster than realistic renders. Unit ability icons use stylized line art on dark backgrounds. |
| **Map rendering** | 3D terrain with full physics — craters from artillery, tank tracks in mud, burning buildings. Not directly translatable to 2D Canvas, but the visual language is relevant: the color grading, the wear-and-tear aesthetic, the "lived-in" battlefield look. |
| **Key takeaway for Dad's Army** | Visual wear, grit, and imperfection make a WW2 game feel authentic. Clean, pristine graphics feel wrong for the era. Prioritize 2D illustrated icons over 3D renders for clarity. |

### Panzer General / Unity of Command

| Aspect | Description |
|--------|-------------|
| **Hex-based unit display** | The classic approach: each hex can contain one unit counter. Unit counters are rectangular/square cards showing a unit type icon (silhouette of a tank, infantry figure, artillery piece), a strength number, and sometimes movement points remaining. Background color indicates the controlling faction. |
| **Panzer General style** | Unit icons are detailed pixel-art military silhouettes. The map uses hand-painted terrain with hex grid overlay. Terrain transitions between hexes use blended edges rather than hard boundaries. Mountains are painted with shading, forests with tree patterns, water with blue gradients. |
| **Unity of Command style** | Cleaner, more modern approach. The map has a "situation map" aesthetic — like a WW2 command table map. Units are shown as NATO-style symbols with strength bars. Supply lines are visualized prominently (this is the game's core mechanic). The color palette is muted but readable. Front lines are drawn as bold curves connecting unit positions. |
| **Key patterns** | Unit counters with clear iconography (silhouette + number) are the gold standard for hex wargames. Terrain should be visually distinct but not overwhelm the tactical information. The hex grid should be visible but not dominant — thin lines or subtle edges. |

### Forge of Empires

| Aspect | Description |
|--------|-------------|
| **Rendering approach** | Isometric 2D with pre-rendered building sprites. The city is built on a square grid (not hex) where each building occupies a certain number of grid cells. Buildings are highly detailed isometric illustrations — you can see windows, chimneys, people, gardens. Each age (Stone Age through Future) has completely distinct building art with appropriate architectural styles. |
| **Building progression** | Buildings clearly show their level through visual complexity. A Level 1 house is a simple hut; higher levels show larger, more ornate structures. Production buildings show their function — a smith has an anvil, a pottery has kilns. Special buildings from events are more elaborate and animated (glowing, particle effects). |
| **Technical approach** | The game uses pre-rendered 2D sprites for buildings (drawn once, displayed as images). The isometric grid handles depth sorting (Y-sorting: lower on screen = drawn later). UI panels are standard HTML/CSS overlaid on the game canvas. The city view is Canvas-based, the UI is DOM-based — a hybrid approach. |
| **Key takeaway** | A browser game can look polished with well-drawn 2D sprites and a clean grid system. The key is art quality, not technical complexity. Pre-rendered sprites at multiple zoom levels provide crisp visuals without 3D rendering overhead. |

---

## 2. WW2 Visual Language

### Color Palette

The WW2 era has a distinctive color vocabulary that immediately evokes the period:

| Color Category | Colors | Hex Codes | Usage |
|---------------|--------|-----------|-------|
| **Olive Drab** | Dark military green | `#454B1B`, `#3B3C24`, `#515A2F` | Primary UI background accent, button borders, panel headers |
| **Army Green** | Medium olive | `#636B2F`, `#4B5320`, `#556B2F` | Secondary backgrounds, sidebar fills |
| **Khaki/Tan** | Warm sandy beige | `#C3B091`, `#BDB76B`, `#C4A35A` | Text color, labels, warm accents |
| **Steel Grey** | Cool industrial grey | `#71797E`, `#7A7A7A`, `#708090` | Panel borders, disabled states, secondary text |
| **Propaganda Red** | Bold warm red | `#B22234`, `#C0392B`, `#8B0000` | Alerts, enemy markers, danger zones, call-to-action |
| **Naval Blue** | Deep navy | `#003B6F`, `#1B2838`, `#162447` | Water, backgrounds, depth |
| **Ammunition Brass** | Golden brass | `#B5A642`, `#C5A55A`, `#D4A843` | Highlights, resource counters, active states |
| **Parchment** | Aged paper cream | `#F5E6C8`, `#E8D5B5`, `#DFC8A2` | Map base layer, tooltip backgrounds |
| **Rust/Iron** | Dark warm brown | `#6D4C2E`, `#8B4513`, `#5A3E28` | Resource icons, terrain accents |

**Recommended base palette for Dad's Army:**
- Background: `#1A1A2E` (current — works well as a deep navy backdrop)
- Panel background: `#1E2840` with `rgba(30, 40, 55, 0.95)` overlay
- Primary text: `#E0D8C8` (warm parchment — current)
- Heading text: `#D4A843` (brass/gold — military insignia feel)
- Accent: `#636B2F` (olive) and `#B22234` (propaganda red)
- Borders: `rgba(184, 167, 126, 0.3)` (khaki at low opacity — current)

### Typography

| Font Style | Example Fonts | WW2 Association | Usage |
|-----------|---------------|-----------------|-------|
| **Military stencil** | "Stencil WW II" (dafont), "Army" | Equipment markings, crate stencils, vehicle identification | Headings, game title, screen titles |
| **Typewriter mono** | "Special Elite" (Google Fonts), "Courier New", "American Typewriter" | Intelligence reports, decoded messages, official documents | Body text in reports, battle logs, typed commands |
| **Military serif** | "Playfair Display" (Google Fonts), "Libre Baskerville" | Official documents, war department letterheads, newspaper headlines | Major headings, campaign titles, victory screens |
| **Clean sans-serif** | "Source Sans Pro" (Google Fonts), "Inter", "Roboto Condensed" | Modern readability, military signage | UI labels, resource counts, stat numbers |
| **Condensed sans** | "Oswald" (Google Fonts), "Bebas Neue" | Military posters, propaganda, recruitment materials | Alert banners, turn counters, notification headers |

**Recommendation:** Use Google Fonts "Special Elite" (typewriter) for flavor text and reports, "Oswald" or "Bebas Neue" for headings and labels, and a clean sans-serif like "Inter" for data-heavy displays (resource counts, unit stats). Use CSS `@font-face` to load via Google Fonts CDN — no build step needed.

### Map Styles That Feel WW2

| Style | Description | Implementation Difficulty | Mood |
|-------|-------------|---------------------------|------|
| **Aged paper map** | Cream/parchment base with hand-drawn features, coffee stains, fold lines, worn edges | Medium — Canvas texture overlay with noise | Nostalgic, authentic, "found in a museum" |
| **Tactical situation map** | Clean military map with contour lines, grid references, military symbols, unit markers pinned on | Medium — structured drawing with symbol library | Professional, operational, "command headquarters" |
| **War room table** | Dark background simulating a table surface, map spread on it with pins and markers, dramatic lighting from above | High — complex compositing | Dramatic, cinematic, "plotting the invasion" |
| **Propaganda poster** | Bold colors, simplified shapes, strong graphic design, heavy outlines | Medium — distinctive art direction in all assets | Stylized, bold, high-impact |
| **Intelligence dossier** | Typescript on aged paper, stamped "TOP SECRET", red-string connections, photo evidence clipped in | Low-Medium — mostly UI/panel styling | Mysterious, spy thriller, clandestine |

**Recommendation:** Combine the **tactical situation map** aesthetic for the hex map itself with the **intelligence dossier** aesthetic for UI panels. The map should feel like a clean military planning map (like Unity of Command), while panels should feel like reading classified briefing documents.

### Iconography

| Category | Symbols | Source/Standard |
|----------|---------|-----------------|
| **Unit type** | Infantry X in box, armor triangle, artillery dot, cavalry diagonal | NATO APP-6 standard |
| **Unit size** | Dots (squad), bars (company/battalion), X's (brigade/division/corps) above unit frame | NATO APP-6 standard |
| **Affiliation** | Rectangle = friendly, diamond = hostile, square = neutral, quatrefoil = unknown | NATO APP-6 frame shapes |
| **Weapons** | Silhouettes of rifles, tanks, artillery pieces, ships, aircraft | Common military illustration |
| **Buildings** | Factory smokestack, fort/castle, crossed swords (barracks), anchor (port), aircraft (airfield) | Strategy game conventions |
| **Resources** | Oil barrel/derrick, iron ingot/pickaxe, wheat sheaf, fish, gear/cog | Common strategy game icons |
| **Status** | Star (veteran), wrench (repairing), arrow (moving), shield (fortified), skull (destroyed) | Universal game iconography |

**NATO APP-6 Symbol Structure (relevant for Dad's Army units):**
```
Frame shape = affiliation (friendly/hostile/neutral)
Fill color = affiliation (blue=friendly, red=hostile, green=neutral, yellow=unknown)
Icon inside = unit type:
  - Infantry: X (crossed lines)
  - Armor: oval/lozenge shape
  - Artillery: filled circle
  - Cavalry: diagonal line
  - Engineer: castle/battlement shape
  - Signal: lightning bolt
  - Medical: cross
  - Supply: circle with dot
Size indicator above frame:
  - ● = squad/team
  - ●● = section
  - ●●● = platoon
  - | = company/battery
  - || = battalion
  - ||| = regiment
  - X = brigade
  - XX = division
  - XXX = corps
  - XXXX = army
```

### UI Metaphors

| Metaphor | Application | How to Implement |
|----------|-------------|------------------|
| **Command table** | Main game view — map is "spread on a table" | Dark wood or green felt background behind the map canvas, subtle shadow/bevel on map edges |
| **War room** | Strategic overview screens (commander briefing) | Dark panels with dramatic amber/gold lighting, pin markers on the overview map |
| **Briefing folder** | City management, army details | Panel header styled like a manila folder tab, "classified" stamp watermark, typewriter font for content |
| **Intelligence dossier** | Scouting reports, battle results | Stamped headers ("FIELD REPORT", "BATTLE ASSESSMENT"), redacted text effects for fog of war info |
| **Radio transmission** | Notifications, real-time alerts | Ticker-tape style animation for notifications, green phosphor text effect, static/interference decoration |
| **Dog tags** | Player identity, unit badges | Metal-textured name plates with embossed text for player names and unit designations |

---

## 3. Browser Game Graphics Techniques

### What HTML5 Canvas Can Achieve

Canvas 2D is capable of impressive visuals for strategy games when used well:

| Capability | What's Possible | Performance Notes |
|-----------|----------------|-------------------|
| **Texture drawing** | `drawImage()` can blit pre-rendered terrain textures onto hex tiles | Very fast — GPU-accelerated in modern browsers. Can draw 2000-5000 sprites at 60fps. |
| **Gradient fills** | `createLinearGradient()` / `createRadialGradient()` for terrain depth, water effects | Moderate — gradients are more expensive than solid fills. Cache gradients when possible. |
| **Pattern fills** | `createPattern()` for repeating terrain textures (grass, sand, water) | Fast once pattern is created. Use small seamless tiles (64x64 or 128x128). |
| **Shadows and glow** | `shadowBlur`, `shadowColor`, `shadowOffsetX/Y` for elevation and glow effects | Expensive — use sparingly. Better to pre-render shadows into sprites. |
| **Compositing** | `globalCompositeOperation` for blending modes (multiply for shadows, screen for highlights) | Standard performance. Very useful for fog of war and terrain overlays. |
| **Image manipulation** | `getImageData()` / `putImageData()` for pixel-level effects (noise, aging) | Very slow per-frame — only use for pre-processing, not in the render loop. |
| **Path clipping** | `clip()` to constrain drawing within hex shapes | Fast — essential for texturing individual hexes. |
| **Transforms** | `translate()`, `rotate()`, `scale()` for camera and sprite transforms | Fast — hardware-accelerated. Use for zoom and pan. |
| **Alpha blending** | `globalAlpha` and rgba colors for transparency layers | Standard performance. Essential for ownership tinting, fog of war. |
| **Text rendering** | `fillText()` with font styling | Moderate — text rendering is relatively expensive. Cache text to offscreen canvas for repeated renders. |

### Hex Terrain Rendering Techniques

**Current approach (flat color fill):**
```
hexPath(ctx, x, y, size);
ctx.fillStyle = '#8B9A46'; // solid green
ctx.fill();
```

**Upgraded approach — textured hexes:**

1. **Pre-rendered hex textures**: Create 128x128 pixel terrain tiles offline (in an image editor or procedurally). For each terrain type, create 3-4 variations. At render time, clip to the hex shape and draw the texture.

```javascript
// Pseudocode for textured hex rendering
ctx.save();
hexPath(ctx, x, y, size);
ctx.clip();
ctx.drawImage(terrainTextures.plains_v2, x - size, y - size, size * 2, size * 2);
ctx.restore();
```

2. **Noise-based variation**: Use Perlin/Simplex noise to add subtle variation within each hex, preventing the tiled repetition look. Generate a noise texture once at startup, then overlay it with low opacity on each terrain hex.

3. **Edge blending**: For professional-looking terrain transitions, draw neighboring terrain types bleeding slightly into each hex's edges. Implementation: for each hex, check the 6 neighbors' terrain types, and draw a gradient fade from the neighbor's color at the edge toward the center. This prevents the "colored checkerboard" look.

4. **Pattern fill approach**: Create small seamless texture tiles, register them as Canvas patterns, and fill hexes with the pattern:
```javascript
const grassPattern = ctx.createPattern(grassTileImg, 'repeat');
hexPath(ctx, x, y, size);
ctx.fillStyle = grassPattern;
ctx.fill();
```

### SVG vs Canvas vs CSS for Game UI Elements

| Technology | Best For | Avoid For |
|-----------|---------|-----------|
| **Canvas 2D** | The hex map itself, terrain rendering, unit sprites, minimap, fog of war, any element that changes every frame or has thousands of instances | Static UI panels, text-heavy content, forms/inputs |
| **HTML + CSS** | Side panels, resource bars, city management screens, army lists, buttons, tooltips, modal dialogs — anything interactive and text-heavy | The map itself (too many DOM nodes = poor performance) |
| **SVG** | Icons (resource icons, unit type symbols, building icons), the minimap (if interactive), scalable UI decorations | Large numbers of animated elements (>500 SVG nodes = performance issues) |

**Recommended hybrid architecture for Dad's Army:**
- **Canvas**: Hex map, minimap, battle animations
- **HTML/CSS**: All panels (tile info, city, army, commander, research tree), resource bar, action bar, notifications
- **SVG or icon font**: Resource icons, unit type icons, building icons, status indicators — these scale perfectly and can be styled with CSS

### Sprite Sheet Organization

For a strategy game, sprite sheets should be organized by category:

```
assets/sprites/
  terrain/
    terrain-atlas.png       — All terrain hex textures in one sheet
                              (plains x4, forest x4, mountain x4, etc.)
                              Grid: 128x128 per tile, 8 columns
    terrain-decorations.png — Trees, rocks, grass tufts for scatter
  
  units/
    unit-icons-atlas.png    — NATO-style unit type icons (infantry, armor, etc.)
                              Grid: 32x32 per icon, 16 columns
    unit-counters.png       — Full unit counter tiles (icon + frame + size indicator)
                              Grid: 48x48 per counter
  
  buildings/
    building-icons.png      — Building type icons for city panel
                              Grid: 48x48 per icon
    city-markers.png        — On-map city representations at various zoom levels
                              Grid: 64x64 per marker
  
  ui/
    resource-icons.png      — Resource type icons (oil, iron, coal, etc.)
                              Grid: 24x24 per icon
    status-icons.png        — Status effect icons (fortified, marching, etc.)
                              Grid: 16x16 per icon
```

Each sprite sheet should be a single PNG loaded once, with a JavaScript atlas defining the (x, y, width, height) of each sprite within the sheet. This minimizes HTTP requests and allows efficient `drawImage()` calls with source rectangle parameters.

### Creating a "Painted Map" Effect with Canvas

To achieve the painted/illustrated map look of Supremacy 1914 or Panzer General:

1. **Base layer**: Draw terrain with textured hex tiles (not flat colors). Use terrain textures that look hand-painted — irregular brushstrokes, subtle color variation within each type.

2. **Paper texture overlay**: After drawing all terrain, overlay a full-canvas parchment/paper texture with `globalCompositeOperation = 'multiply'` and low opacity (0.1-0.2). This gives the entire map an aged paper quality.

3. **Vignette effect**: Draw a radial gradient from transparent center to dark edges around the canvas, simulating aged/darkened paper edges.

4. **Noise grain**: Apply a subtle noise texture overlay (multiply blend, 5-10% opacity) to simulate paper grain and break up digital smoothness.

5. **Terrain edge softening**: Instead of hard hex borders for terrain, use a slight feather/blur at terrain transitions. Canvas `shadowBlur` on terrain fills can achieve this, or draw terrain slightly larger than the hex clip region.

Implementation order:
```
Layer 1: Terrain textures (clipped to hexes)
Layer 2: Terrain edge blending (neighbor color fading)
Layer 3: Paper texture overlay (multiply blend)
Layer 4: Grid lines (subtle, thin)
Layer 5: Ownership borders and tinting
Layer 6: Cities, resources, roads
Layer 7: Fog of war
Layer 8: Units/armies
Layer 9: Selection highlight
Layer 10: Vignette and grain (post-processing)
```

### Parallax/Depth Effects in 2D Canvas

While true parallax requires layered scrolling, several depth effects work in a top-down strategy game:

1. **Drop shadows on elevated terrain**: Mountains and hills cast shadows to the south-east (or whichever direction you pick as the "sun"). Draw a darkened hex shape offset by a few pixels beneath mountain hexes. This immediately communicates elevation.

2. **Layered drawing order**: Draw water first, then land, then mountains, then cities, then units. Higher elements slightly overlap lower neighbors, creating depth.

3. **Scale by zoom level**: When zoomed in, show more detail (terrain labels, resource icons, building details). When zoomed out, simplify to colored hexes with ownership borders. This creates a sense of "zooming into detail" that mimics depth.

4. **Atmospheric perspective**: Elements farther from the camera center can be slightly desaturated and lightened, simulating atmospheric haze. This is subtle but effective for large maps.

5. **Shadow/highlight on hex edges**: Draw a subtle light edge (top-left of each hex) and dark edge (bottom-right) to give hexes a very slight 3D bevel. This makes flat hexes look like physical tiles.

---

## 4. Terrain Visualization Approaches

### Making Each Terrain Type Visually Distinct

| Terrain | Color Base | Texture Pattern | Decorative Elements | Shadow/Depth |
|---------|-----------|----------------|--------------------|----|
| **Plains** | `#8B9A46` to `#A4B85C` (yellow-green) | Subtle horizontal brush strokes suggesting grass | Occasional small grass tufts, wildflower dots | Flat — no elevation shadow |
| **Farmland** | `#6B8E23` to `#9AAE4A` (warmer green) | Regular parallel lines suggesting plowed rows | Small dots for crops, tiny farmhouse icon when zoomed in | Flat |
| **Forest** | `#2D5A27` to `#3A7A35` (deep green) | Organic blob shapes suggesting canopy from above | Scatter of small circle clusters (tree tops) | Slight shadow — forests are "above" plains |
| **Mountain** | `#7A7A7A` to `#9A9A8A` (grey with warm tint) | Angular, jagged strokes suggesting rock faces | Peak/triangle shapes drawn at center | Strong shadow to south-east, elevated appearance |
| **Water (deep)** | `#1A4A7A` to `#2A5C8A` (deep blue) | Concentric subtle wave rings, darker than coast | Small wave line patterns when zoomed | Recessed — slight inner shadow |
| **Coast** | `#4A8AB5` to `#6AAAD0` (light blue) | Gradient from land color at edge to water color at center | Thin white foam/surf line at land boundary | Recessed but less than deep water |
| **Desert** | `#C4A35A` to `#D4B86A` (golden sand) | Stippled dots or fine diagonal lines suggesting sand | Small dune shapes, occasional darker patches | Flat, but shimmer/haze effect when zoomed |
| **Snow** | `#D4D8DC` to `#EAECEF` (blue-white) | Very subtle texture, almost pure white with blue undertones | Tiny blue shadow spots, sparse tree silhouettes | Flat, high brightness to stand out |
| **Urban** | `#6B6B6B` to `#888888` (neutral grey) | Regular grid-like pattern suggesting blocks and streets | Small rectangle shapes when zoomed (buildings) | Slight elevation from ground level |
| **Marsh** | `#4A6A4A` to `#5A7A5A` (murky green) | Irregular wet/dry patches with mixed colors | Reed/grass tuft shapes, water puddle spots | Recessed — wet/muddy appearance |
| **Ruins** | `#5A4A3A` to `#7A6A5A` (dusty brown) | Irregular broken shapes | Small rubble/debris dots, broken wall fragments | Chaotic texture, darker than desert |

### Texture Techniques

**1. Repeating tile patterns (simplest, best performance):**
- Create small seamless tiles (64x64 or 128x128) for each terrain type in an image editor
- Register as Canvas patterns with `createPattern()`
- Fill hex shapes with the pattern
- Pros: Fast rendering, consistent look, easy to swap out
- Cons: Can look repetitive without variation

**2. Noise-based generation (most flexible):**
- Generate Perlin/Simplex noise values for each pixel within a hex
- Map noise values to terrain-appropriate colors (e.g., for forest: dark green when noise > 0.6, medium green when > 0.3, light green otherwise)
- Add noise octaves for detail at different scales
- Pros: No two hexes look identical, organic feel
- Cons: Expensive to generate per-frame — must cache to offscreen canvas

**3. Gradient fills (good compromise):**
- Use radial or linear gradients within each hex
- Center color slightly different from edge color
- Random gradient angle per hex for variation
- Pros: Fast, some variation, no external assets needed
- Cons: Less detailed than textures

**4. Hybrid approach (RECOMMENDED):**
- Base: Pattern fill with terrain texture tile
- Variation: Overlay Perlin noise at low opacity (pre-generated once, cached)
- Detail: Add scatter decorations (tree dots, grass tufts) at higher zoom levels
- Transitions: Edge blending between different terrain types

### Hex Border Styles

| Style | Appearance | When to Use |
|-------|-----------|-------------|
| **No visible border** | Terrain textures blend into each other | Unclaimed, uncontested territory — seamless natural look |
| **Thin subtle line** | 0.5-1px line, low opacity white or dark | General hex grid visibility for gameplay reference |
| **Ownership border** | 2-3px colored line matching player color | Claimed territory boundaries |
| **Dashed line** | 1-2px dashed in player color | Claimed but not fully controlled territory |
| **Bold solid line** | 3-4px solid in player color | Fully controlled, improved territory |
| **Double line** | Two parallel lines 2px apart | National borders (between different players' territory) |
| **Contested/disputed** | Alternating color dashes (both players' colors) | Territory under active dispute or combat |

**Professional tip:** Only draw borders on edges where adjacent hexes have different owners or terrain types. Drawing all hex borders creates a "graph paper" look that feels amateurish. Selectively drawing borders where they matter creates a cleaner, more professional appearance.

### Showing Elevation/Depth

1. **Directional shadows**: Mountains and hills cast a shadow on their south-east neighbor hex. Draw a dark semi-transparent wedge on the neighbor hex's north-west portion.

2. **Elevation gradient**: Higher terrain types (mountain > forest > plains > water) have a subtle brightness increase. Mountains are drawn slightly brighter on their north-west face and darker on south-east.

3. **Hex edge bevel**: A 1-2px light highlight on the top-left edges and dark shadow on bottom-right edges of each hex gives a very subtle 3D tile effect. Apply proportionally — mountains get more bevel than plains.

4. **Size scaling**: At certain zoom levels, mountains can be drawn with the terrain illustration slightly "popping out" of the hex boundary (drawn at 105% hex size, but clipped to hex + 2px), creating a subtle overlap effect.

5. **Water depth**: Deep water hexes are darker in the center and lighter at edges (near coast). Coast hexes gradient from the shore terrain color to water blue.

---

## 5. Unit Visualization

### NATO APP-6 Military Symbols for Dad's Army

Drawing these in Canvas is straightforward — they are composed of simple geometric shapes:

```
INFANTRY:         ARMOR:           ARTILLERY:
┌─────────┐       ┌─────────┐       ┌─────────┐
│  ╲   ╱  │       │         │       │    ●    │
│   ╲ ╱   │       │  ═══════│       │         │
│    ╳    │       │         │       │         │
│   ╱ ╲   │       └─────────┘       └─────────┘
│  ╱   ╲  │
└─────────┘

CAVALRY:          ENGINEER:         RECONNAISSANCE:
┌─────────┐       ┌─────────┐       ┌─────────┐
│        ╱│       │ ┌─┬─┬─┐ │       │    ╱    │
│      ╱  │       │ └─┴─┴─┘ │       │         │
│    ╱    │       │         │       └─────────┘
│  ╱      │       └─────────┘
│╱        │
└─────────┘
```

Frame colors by affiliation:
- Friendly: Blue fill `#4A90D9`, blue border `#2A5A9A`
- Hostile: Red fill `#D94A4A`, red border `#8B0000`
- Neutral: Green fill `#4AD94A`, green border `#2A6B2A`
- Unknown: Yellow fill `#D9D94A`, yellow border `#8B8B00`

### How Different Games Show Military Units

| Unit Type | Icon Style Options | Best for Dad's Army |
|-----------|-------------------|---------------------|
| **Infantry** | NATO X-cross, soldier silhouette, rifleman figure, boot print | NATO X-cross in rectangular frame — cleanest at small sizes |
| **Tanks/Armor** | NATO oval/lozenge, tank silhouette from side, tank top-down, treads | NATO oval — universally recognized. Tank silhouette for zoomed-in detail |
| **Artillery** | NATO filled circle, cannon silhouette, explosion burst | NATO circle — reads well at all zoom levels |
| **Ships** | Ship silhouette from side, anchor icon, hull top-down | Ship silhouette — more recognizable than NATO naval symbols for casual players |
| **Aircraft** | Plane silhouette from above, propeller, wings icon | Top-down aircraft silhouette — immediately readable |

### Unit Health/Status Display

**Health bar design:**
- Position: Below the unit counter/icon
- Size: Width matches unit icon, height 3-4px
- Colors: Green (>66%), Yellow (33-66%), Red (<33%)
- Background: Dark semi-transparent bar showing max health
- Alternative: Segmented blocks instead of a smooth bar — each segment = 20% health

**Movement indicator:**
- Remaining movement shown as small dots/pips below the unit
- Or: a circular progress arc around the unit icon
- When marching: directional arrow from unit toward destination
- Path preview: dotted line showing planned movement route

**Status effects (shown as small badge icons on unit counter):**

| Status | Icon | Position |
|--------|------|----------|
| Fortified | Shield/fort | Top-right corner |
| Entrenched | Shovel | Top-right corner |
| Marching | Arrow pointing right | Bottom-right corner |
| Low supply | Empty circle with line through | Top-left corner |
| In combat | Crossed swords | Center overlay, flashing |
| Veteran | Star | Top-left corner |
| Damaged | Cracked frame | Border effect |
| Retreating | Arrow pointing away + red tint | Bottom overlay |

### Army Stack Visualization

When multiple units occupy one hex:

**Option A — Offset stacking (current approach):**
Multiple unit counters drawn with slight horizontal offset, back-to-front. Shows each unit but gets cluttered with 3+ units.

**Option B — Single counter with number badge (RECOMMENDED):**
Show the strongest/primary unit's icon with a number badge in the corner (e.g., "3" for 3 units). Click to expand and see all units in a side panel. Keeps the map clean.

**Option C — Combined arms icon:**
Show a special "combined arms" icon (multiple NATO symbols overlapped) with a total strength number. Used in Unity of Command style.

**Recommendation:** Use Option B as the default (single icon + number badge). When the hex is selected, show all units in the side panel with individual details.

### Animation Capabilities in Canvas

| Animation Type | Implementation | Performance | Priority |
|---------------|---------------|-------------|----------|
| **Idle breathing** | Subtle scale oscillation (0.98 to 1.02) on a sine wave, 2-3 second cycle | Negligible | Low — nice polish but not essential |
| **March animation** | Smooth interpolation of unit position between hexes over 0.5-1 second | Low — one unit moving at a time | High — shows army movement clearly |
| **Combat flash** | Brief white flash or red flash on units in combat, 0.2 second duration | Negligible | Medium — provides visual feedback |
| **Damage shake** | Small random offset (2-3px) for 0.3 seconds when taking damage | Negligible | Medium — immediate feedback |
| **Flag/banner wave** | Sine-wave distortion on a small flag sprite attached to unit | Low | Low — cosmetic flair |
| **Smoke/fire** | Particle system: spawn 5-10 small circles that drift upward, fade, shrink | Moderate if many units | Low — impressive but expensive for many simultaneous battles |
| **Supply line flow** | Animated dashes moving along supply route paths | Low | Medium — clearly communicates supply state |

**Recommended approach:** Implement march animation first (highest gameplay impact), then combat flash, then damage shake. Defer particle effects and idle animations until core visuals are polished.

---

## 6. City/Building Visualization

### City on a Hex Tile

| Approach | Description | When to Use |
|----------|-------------|-------------|
| **Simple icon marker** | A small icon (house, star, castle shape) centered on the hex. Current approach with the gold house shape. | Minimum zoom level — city must be identifiable from far out |
| **Scaled icon set** | At medium zoom, show 2-4 small building icons arranged within the hex representing the city's key buildings | Medium zoom — shows city character |
| **Detailed illustration** | At high zoom, the hex is filled with a mini-illustration of the city — walls, buildings, roads, all drawn to fit within the hex shape | Maximum zoom — immersive detail |
| **Multi-hex city** | City occupies the center hex and visually "bleeds" into adjacent hexes with smaller buildings/suburbs (like Civ VI districts) | If cities span multiple hexes in the game design |

**Recommended for Dad's Army:** Use a **zoom-dependent rendering** approach:
- **Zoom < 30%**: Colored dot with city name label
- **Zoom 30-60%**: City icon (scaled based on city level — small house for level 1, walled town for level 3, fortified city for level 5)
- **Zoom 60-100%**: Detailed city illustration showing walls, buildings, port (if coastal), airfield (if present)
- **Zoom > 100%**: Full detail with individual building icons visible

### Building Icons

| Building | Icon Concept | Visual Style |
|----------|-------------|--------------|
| **Barracks** | Crossed swords over a rectangular building | Military olive, angular |
| **Factory** | Smokestack with gear icon | Industrial grey, mechanical |
| **Walls/Fort** | Castle battlement outline | Stone grey, solid |
| **Research Lab** | Flask/beaker or atom symbol | Clean white/blue, scientific |
| **Port/Dock** | Anchor or crane silhouette | Naval blue, maritime |
| **Airfield** | Runway with small plane silhouette | Grey/green, aviation |
| **Farm** | Wheat sheaf or silo | Golden/green, agricultural |
| **Mine** | Pickaxe crossed with shovel | Brown/dark, underground |
| **Oil Well** | Derrick/pump jack silhouette | Black/dark, industrial |
| **Warehouse** | Stacked crates or open-front building | Brown, storage |
| **Hospital** | Red cross on white building | White/red, medical |
| **Radar Station** | Dish antenna silhouette | Grey/green, technological |

All icons should be designed at 32x32 pixels with a consistent line weight (2px) and color scheme. Use silhouette style (solid shape with minimal internal detail) for readability at small sizes.

### City Level Progression Visualization

| Level | Visual Representation | Size on Map |
|-------|----------------------|-------------|
| **Level 1 (Village)** | 2-3 small house shapes, no walls | Small cluster, 40% of hex |
| **Level 2 (Town)** | 5-6 buildings of varying heights, basic fence | Medium cluster, 55% of hex |
| **Level 3 (City)** | Dense building cluster, low walls visible | Large cluster, 65% of hex |
| **Level 4 (Fortified City)** | Full building cluster with high walls and towers | Fills most of hex, walls touch edges |
| **Level 5 (Capital/Metropolis)** | Dense multi-story buildings, thick walls, flags | Fills hex, prominent landmark structures |

Each level should look like a natural progression of the previous one — not a completely different icon, but the same city with more buildings and better defenses.

### Mini City View vs On-Map Building Icons

**On-map approach (RECOMMENDED for Dad's Army):**
Show buildings as part of the city cluster on the hex tile. When clicked, the city panel opens with a detailed list and grid of all buildings. This keeps the map clean while still showing city importance.

**Mini city view approach (Forge of Empires style):**
A separate city screen where you arrange buildings on a grid. This is a full sub-game and represents significant development effort. Defer this to a later phase.

---

## 7. UI Panel Design for Strategy Games

### HOI4's Information Panels

Key patterns from Hearts of Iron IV:

1. **Top resource bar**: Horizontal strip across the top. Left side: national flag + political power + stability + war support. Center: manpower count. Right side: factory counts (civilian, military, naval) + resource icons with net income numbers. Each resource has a small icon + number, color-coded (green = surplus, red = deficit).

2. **Division cards**: Rectangular cards with:
   - Division insignia/icon (left)
   - Division name and type (center)
   - Organization bar (green, horizontal)
   - Strength bar (orange, horizontal)
   - XP level indicator (light grey bar)
   - Equipment status warnings (red exclamation icon)
   - Combat modifier icons (terrain, weather, etc.)

3. **Production panel**: List view with:
   - Equipment icon and name (left)
   - Factory allocation (slider or number)
   - Production efficiency percentage
   - Output per day
   - Stockpile count

4. **Color coding system**: Green = good/healthy, Yellow = caution, Orange = concerning, Red = critical. This four-tier system is universally understood by strategy gamers.

### Civ VI's City Management

Key patterns:

1. **No separate city screen**: Everything overlays the map. City management appears as a panel alongside the map view, not replacing it. This maintains spatial context — you can see your city on the map while managing it.

2. **City banner**: Floating info display above city on map showing name, population, current production, defense strength, and religion. This provides at-a-glance city status without opening any panel.

3. **Production queue**: Vertical list in city panel showing what's being built, with turn count. Players can reorder by dragging.

4. **Citizen management**: Shows worked tiles with yield icons (food, production, gold, science, culture). Visual overlay on the map around the city.

5. **District color coding**: Each of the 12 district types has a distinct color, making city specialization visible at a glance.

### Supremacy 1914's Side Panels

Key patterns:

1. **Province detail panel**: Appears on click, shows:
   - Province name and coordinates
   - Current owner
   - Morale percentage (with color bar)
   - Resource production rates
   - Building slots and current buildings
   - Garrison units

2. **Province list panel**: Right-side scrollable list of all owned provinces, sortable by name, morale, or production. Clicking a province name centers the map on it and opens the detail panel.

3. **Army panel**: Shows unit composition, strength, morale, current orders. Split into unit type categories.

4. **Dark theme**: Dark navy/charcoal backgrounds with khaki/gold text and accent colors. Thin borders between sections.

### Resource Bar Design Patterns

**Layout pattern (RECOMMENDED):**
```
┌──────────────────────────────────────────────────────────────────┐
│ [Icon] 1,234  [Icon] 567  [Icon] 89  │  [Icon] 45k  │  Day 23  │
│  Oil          Iron        Coal        │  Manpower     │  Turn    │
└──────────────────────────────────────────────────────────────────┘
```

**Design rules:**
- Icons should be 16-20px, colorful and distinct
- Numbers should be in a clean, monospace-style font for alignment
- Positive income: green text or green "+" prefix
- Negative income: red text or red "-" prefix
- Hovering an icon shows a tooltip with production breakdown
- Group related resources together with subtle dividers
- Keep the total height to 40-52px — not too much screen real estate

### Military/Army Panel Design

**Unit card in army panel:**
```
┌─────────────────────────────────────────┐
│ [NATO Icon]  5th Infantry Division      │
│              ████████░░  80% strength   │
│              ████████████ 100% org      │
│              Status: Fortified          │
│              Movement: 0/3 remaining    │
│  [Fortify] [March] [Merge] [Disband]    │
└─────────────────────────────────────────┘
```

**Army composition summary:**
```
┌─────────────────────────────────────────┐
│ 3rd Army — "Eastern Front"              │
│─────────────────────────────────────────│
│  ⊕ Infantry: 12,000 men                │
│  ◇ Armor: 45 tanks                     │
│  ● Artillery: 30 pieces                │
│  Total Strength: █████████░░ 85%        │
│  Supply Status: Well supplied           │
│  Current Orders: March to (5, -3)       │
└─────────────────────────────────────────┘
```

### Minimap Design Patterns

**Recommended minimap for Dad's Army:**

| Feature | Implementation |
|---------|---------------|
| **Position** | Bottom-right corner (strategy game convention) |
| **Size** | 200x200px (current) — good for 999 hex map |
| **Content** | Color-coded dots/small hexes for terrain, bright colored dots for cities, player-colored regions for territory |
| **Interaction** | Click on minimap to pan main map to that location |
| **Viewport rectangle** | White or gold rectangle showing current view area |
| **Fog of war** | Unexplored areas shown as dark/black on minimap |
| **Toggle** | Button to show/hide, or collapse to a small icon |
| **Border** | Thin gold or khaki border, matching the military aesthetic |
| **Overlay modes** | Toggle between terrain view, political view (ownership colors), and resource view |

---

## 8. Actionable Recommendations for Dad's Army

### Priority 1 — Immediate Visual Improvements (Low effort, High impact)

These can be done with minimal code changes to the existing HexRenderer:

1. **Terrain texture variation**: Replace flat color fills with 2-4 color variations per terrain type. For each hex, pick a color variant based on `(q * 7 + r * 13) % numVariants` for deterministic but varied appearance. Add slight noise by varying RGB channels +/-10 randomly (seeded by hex coordinates).

2. **Professional hex borders**: Stop drawing borders on every hex. Only draw borders at:
   - Ownership boundaries (between different players' territory)
   - Terrain transitions (between water and land)
   - Selected hex highlight
   - Remove the all-hex grid entirely at zoom levels below 50%

3. **Improved city markers**: Replace the simple house shape with a zoom-dependent city icon:
   - Small dot with name at far zoom
   - Recognizable city silhouette (multiple buildings) at medium zoom
   - Detailed city illustration at close zoom

4. **Better army counters**: Replace the shield shape with NATO-style rectangular counters showing unit type icon + strength number. Color the counter frame by affiliation.

5. **Typography upgrade**: Load Google Fonts "Special Elite" (typewriter) and "Oswald" (condensed heading). Apply to panel headers and body text for immediate WW2 flavor.

### Priority 2 — Visual Polish (Medium effort, High impact)

6. **Terrain edge blending**: For each hex, check 6 neighbors. Where adjacent terrain differs, draw a gradient fade from the neighbor's color into this hex's edge region (15-20% from the edge). This eliminates the "colored tile" look and creates natural-feeling terrain transitions.

7. **Elevation shadows**: Mountain and urban hexes cast a shadow on their south-east neighbor. Draw a dark wedge on the neighbor hex. Forest hexes get a subtle shadow. Water hexes are drawn recessed (darker center gradient).

8. **Fog of war upgrade**: Instead of a flat semi-transparent overlay, use a textured fog: draw a dark overlay with irregular edges (use noise to create a ragged boundary between visible and fog). Unexplored hexes should have a "parchment" or "aged paper" texture instead of near-black.

9. **Resource icons**: Replace colored dots with tiny icon sprites (oil derrick, pickaxe, wheat sheaf, fish, etc.). These are more readable and more visually appealing than colored circles.

10. **Panel styling**: Add WW2 flavor to CSS panels:
    - Panel headers: stencil font, olive drab background, "CLASSIFIED" stamp watermark
    - Body text: typewriter font for reports/descriptions
    - Buttons: military styling (olive green background, khaki text, sharp corners)
    - Tooltips: aged paper background color

### Priority 3 — Advanced Visual Features (High effort, High impact)

11. **Texture atlas system**: Create actual terrain texture tiles (PNG images, 128x128) for each terrain type. Draw hexes by clipping to hex shape and blitting the texture. This is the single biggest visual upgrade — transforming flat colors into textured, illustrated terrain.

12. **Paper map overlay**: After drawing all terrain, apply a parchment texture overlay with multiply blend mode across the entire map. This gives the map a hand-drawn, aged quality without changing any individual hex rendering.

13. **Animated march paths**: When an army is ordered to march, animate its counter sliding smoothly along the path hex by hex over 0.5-1 second per hex. Draw the planned path as a dotted line.

14. **Combat animations**: When combat occurs, briefly flash the hex with a red/orange burst, shake the unit counters, and show a small crossed-swords icon for 1-2 seconds.

15. **Supply line visualization**: Draw animated flowing dashes along supply routes (from cities to army positions). Green dashes for well-supplied, yellow for strained, red for critical.

### Priority 4 — Major Visual Overhaul (Very high effort, Transformative)

16. **Full sprite system**: Create or source a complete sprite atlas for all terrain types, unit types, building types, and UI elements. Replace all programmatic drawing with sprite blitting.

17. **Procedural terrain textures**: Use Perlin noise to generate unique terrain textures for each hex, ensuring no two hexes look identical while maintaining terrain type identity.

18. **Weather and time effects**: Day/night color temperature shifts, rain particle overlay, snow accumulation on terrain textures.

19. **Battle replay animations**: When clicking a battle report, show an animated replay of the combat on the map.

20. **Full UI reskin**: Redesign all panels with the "intelligence dossier" metaphor — tabbed folders, stamped headers, paper textures, redacted text effects.

### Asset Creation Recommendations

For creating visual assets without a graphic designer:

| Resource | What It Provides | Cost |
|----------|-----------------|------|
| **AI image generation** (Midjourney, DALL-E) | Generate terrain textures, building illustrations, UI decorations in consistent style | $10-20/month subscription |
| **OpenGameArt.org** | Free game art including terrain tiles, unit sprites, UI elements | Free |
| **itch.io asset packs** | High-quality hex terrain tiles, military unit sprites | $5-30 per pack |
| **Screaming Brain Studios** | Seamless hexagon texture tutorials and assets | Free tutorials |
| **CraftPix.net** | Strategy game sprite packs including military themes | $5-20 per pack |
| **Manual pixel art** | Custom-made assets perfectly matching the game's needs | Time investment only |

### Technical Architecture for the Visual Overhaul

```
Current:
  HexRenderer.render()
    → for each tile: hexPath() → fillStyle solid color → fill()

Proposed:
  TextureManager (new)
    → loads terrain-atlas.png, unit-icons.png, building-icons.png at startup
    → provides getTerrainTexture(type, variant), getUnitIcon(type), etc.
    → caches offscreen canvases for composite renders

  HexRenderer.render() (upgraded)
    → Layer 1: for each visible tile:
        save() → hexPath() → clip()
        → drawImage(terrainTexture, ...) 
        → edge blending with neighbors
        → restore()
    → Layer 2: paper texture overlay (globalCompositeOperation = 'multiply')
    → Layer 3: ownership borders (only at ownership boundaries)
    → Layer 4: roads and supply lines (dashed lines with animated offset)
    → Layer 5: city markers (zoom-dependent detail level)
    → Layer 6: resource icons (sprite blitting)
    → Layer 7: fog of war (textured, not flat)
    → Layer 8: army counters (NATO-style icons with health bars)
    → Layer 9: selection highlight and UI overlays
    → Layer 10: post-processing (vignette, grain)

  Performance considerations:
    → Use offscreen canvas to cache rendered chunks of the map
    → Only re-render chunks that have changed or are newly visible
    → Texture atlas reduces draw calls (one image, many source rects)
    → Viewport culling already implemented — maintain this
    → Target: 60fps with 100-200 visible hexes on screen
```

---

## Sources

### Strategy Game Visual References
- [Stillfront: Supremacy 1914 New Map Features](https://www.stillfront.com/en/bytro-releases-new-map-new-features-for-supremacy-1914/)
- [Supremacy 1914 Unity Port Announcement](https://playsupremacy.com/en/news/1914-unity-port)
- [Supremacy 1914 Province Administration](https://s1914.fandom.com/wiki/Province_Administration)
- [Supremacy 1914 Interface Manual](https://supremacy1914.fandom.com/wiki/NEW_INTERFACE_MANUAL)
- [RBM GFX Overhaul for HOI4](https://github.com/Rossebma/RBM_MPU)
- [HOI4 User Interface Wiki](https://hoi4.paradoxwikis.com/User_interface)
- [HOI4 UI Guide (Steam)](https://steamcommunity.com/sharedfiles/filedetails/?id=2207484364)
- [HOI4 Interface Guide (GamePressure)](https://guides.gamepressure.com/heartsofiron4/guide.asp?ID=36536)
- [HOI4 Figma UI Recreation](https://www.figma.com/community/file/994266960500837331/hearts-of-iron-iv)
- [Civilization VI Wikipedia](https://en.wikipedia.org/wiki/Civilization_VI)
- [Civilization VI Strategic View (ArtStation)](https://samgauss.artstation.com/projects/bZqrd)
- [Civilization VI Interface Tips (GamePressure)](https://guides.gamepressure.com/sidmeierscivilization6/guide.asp?ID=37562)
- [Company of Heroes 3 Game Design Analysis](https://retrostylegames.com/blog/analyzing-company-of-heroes-3-game-design/)
- [Company of Heroes 3 Icon Design](https://retrostylegames.com/portfolio/company-of-heroes-3-game-icon-design/)
- [Unity of Command 2 Review (Wargamer)](https://www.wargamer.com/unity-of-command-2/review)
- [Panzer Corps 2 Review (Kotaku)](https://kotaku.com/panzer-corps-2-the-kotaku-review-1842371397)
- [Forge of Empires (InnoGames)](https://www.innogames.com/games/forge-of-empires/)

### WW2 Visual Language
- [1940s War Poster Design Inspiration](https://blog.spoongraphics.co.uk/articles/back-to-basics-inspiration-from-1940s-war-posters)
- [WW2 Poster Design History (VIA Creative)](https://viacreative.co.uk/blog/look-back-world-war-2-poster-design)
- [American Poster Fonts of WWII (Walden Font)](http://www.waldenfont.com/AmericanPosterFontsofWorldWarIIComplete.asp)
- [WW2 Common Uniform Colors Palette](https://www.color-hex.com/color-palette/84746)
- [Army Green Color (Figma)](https://www.figma.com/colors/army-green/)
- [Stencil WW II Font (dafont)](https://www.dafont.com/stencil-ww-ii.font)
- [Military Stencil Fonts (FontSpace)](https://www.fontspace.com/category/military,stencil)
- [Military Fonts Collection (HipFonts)](https://hipfonts.com/military-fonts/)
- [Raid WW2 UI Design (Dinko Pavicic)](https://dinkopavicic.com/stories/raid-ui)
- [WW2 Game Design UI/UX (Behance)](https://www.behance.net/gallery/67563601/World-War-II-Game-Design-UI-UX)
- [Soviet-x12 Color Palette (Lospec)](https://lospec.com/palette-list/soviet-x12)

### Browser Game Graphics Techniques
- [SVG vs Canvas Comparison (CSS-Tricks)](https://css-tricks.com/when-to-use-svg-vs-when-to-use-canvas/)
- [Web Graphics Comparison (Tapflare)](https://tapflare.com/articles/web-graphics-comparison-canvas-svg-webgl)
- [HTML5 Games with Canvas and SVG (SitePoint)](https://www.sitepoint.com/the-complete-guide-to-building-html5-games-with-canvas-and-svg/)
- [Canvas Rendering Optimization (ag-Grid)](https://blog.ag-grid.com/optimising-html5-canvas-rendering-best-practices-and-techniques/)
- [HTML5 Gaming Sprite Benchmarks (SitePoint)](https://www.sitepoint.com/html5-gaming-benchmarking-sprite-animations/)
- [Canvas Sprite Animation Tutorial](https://demyanov.dev/javascript-canvas-sprite-animation)
- [Efficient Sprite Management (PeerDH)](https://peerdh.com/blogs/programming-insights/implementing-efficient-sprite-management-for-performance-optimization-in-html5-canvas-games-1)
- [Making Sprite Games with Canvas (James Long)](https://archive.jlongster.com/Making-Sprite-based-Games-with-Canvas)
- [Stamen Watercolor Maps](https://maps.stamen.com/watercolor/)
- [vintageJS Retro Image Effects](https://rendro.github.io/vintageJS/)
- [SVG vs Canvas (JointJS)](https://www.jointjs.com/blog/svg-versus-canvas)

### Hex Grid and Terrain
- [Nick Chavez: Hex Strategy Map Render](https://nicolaschavez.com/projects/hex-map-render/)
- [Nick Chavez: Hex Strategy Map Design](https://nicolaschavez.com/projects/hex-map-design/)
- [Seamless Hexagons Tutorial (Screaming Brain)](https://screamingbrainstudios.com/seamless-hexagons/)
- [Hex and Tile Terrain Sample Set (itch.io)](https://dgbaumgart.itch.io/hex-and-tile-terrain-sample-set)
- [Terrain Transitions Tutorial (GameDev.net)](https://www.gamedev.net/tutorials/_/technical/game-programming/tilemap-based-game-techniques-handling-terrai-r934/)
- [Advanced Terrain Texture Splatting (Gamasutra)](https://www.gamedeveloper.com/programming/advanced-terrain-texture-splatting)
- [Red Blob Games: Making Maps with Noise](https://www.redblobgames.com/maps/terrain-from-noise/)
- [Procedural Textures in Canvas](https://html5gamedevelopment.com/2012-01-procedural-textures-in-html5-canvas/)
- [Perlin Noise Algorithm Tutorial](https://rtouti.github.io/graphics/perlin-noise-algorithm)
- [Catlike Coding Hex Map Tutorials](https://catlikecoding.com/unity/tutorials/hex-map/part-1/)
- [NATO Military Symbols (Wikipedia)](https://en.wikipedia.org/wiki/NATO_Joint_Military_Symbology)
- [NATO APP-6 Symbols Guide (Scribd)](https://www.scribd.com/doc/51169453/NATO-Military-symbols-app-6)

### UI Design
- [Strategy Game UI Dos and Don'ts (Game Developer)](https://www.gamedeveloper.com/design/ui-strategy-game-design-dos-and-don-ts)
- [Strategy Game Battle UI Research (Medium)](https://medium.com/@treeform/strategy-game-battle-ui-3b313ffd3769)
- [Minimap Design Patterns (Patterns Game Prog)](https://www.patternsgameprog.com/strategy-game-12-minimap)
- [Game UI Database](https://www.gameuidatabase.com/)
- [Minimap Research (GitHub Pages)](https://alejandro61299.github.io/Minimaps_Personal_Research/)
- [Game UI Patterns — Mini Map](https://gameuipatterns.com/gameui/mini-map/)
- [WW2 Cartography Assets (Fantasy Map Assets)](https://fantasymapassets.com/how-world-war-2-and-1-cartography-assets-bring-maps-to-life/)
- [General Staff Game — Map Design with Aging Effects](https://www.general-staff.com/tag/design/)
- [Wargame Map Design Principles (BGG)](https://boardgamegeek.com/thread/545740/principles-of-war-game-map-design)
- [Grand Strategy Military Screen UI (ArtStation)](https://www.artstation.com/artwork/JvvRKm)
