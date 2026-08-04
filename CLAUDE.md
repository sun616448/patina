# Patina

A single-page interactive web experience that explores history through
material texture. The user starts pressed against an abstract surface — the
title "Patina" and the prompt "touch it" fade in over that texture, never on
a separate screen. The first click surfaces a material picker (a scrim over
the still-visible surface); **bronze**, **terracotta** and **marble** are the
three threads offered, in that order — there are no locked/"coming soon"
swatches. The picker order, the `THREADS` key order in `js/threads.js` and the
swatch buttons in `index.html` are all bronze/terracotta/marble; keep the three
in step. Picking one
travels through that thread's historical moments (five for terracotta and
bronze, six for marble) — terracotta runs from
a Mohenjo-Daro figurine to a $4.99 Home Depot pot; bronze runs from a Ugarit
oxhide ingot to a 1971 Baltimore war memorial; marble runs from a Cycladic
grave figurine to a Parthenon frieze block in the British Museum, by way of
the Renaissance misreading. The
marble thread argues **whiteness as subtraction** — classical sculpture was
painted, and the white we revere is what is left after pigment loss, burial,
weathering and cleaning; its finale is the 1937–38 Duveen Gallery scouring,
where the museum abraded the stone deliberately to make it whiter. The
material is treated as
continuous: the camera presses into the current surface until it fills the
frame, the geometry swaps at maximum closeness, and the camera pulls back to
reveal the next form. The experience opens on the bronze thread by default.

## Running it

This MUST be served over `http://` — opening `index.html` directly via `file://`
will fail silently because the ES-module imports and `.glb` fetches are blocked by
the browser.

```
cd /Users/sunnysun/Desktop/patina_texture
python3 -m http.server 8123
```

Then open http://localhost:8123/ . Stop the server with `Ctrl+C`.

The same cache trap applies to the ES modules, not just to assets: adding
`?cachebust=1` to the page URL busts `index.html` only, and `js/ui.js` still
comes from cache, so an edit you just made appears not to have taken. Hard-reload
(Cmd+Shift+R) whenever you change anything under `js/`.

If you edit a `.glb` in place, the browser will keep serving the cached copy —
the page reloads but the old geometry/texture is still there. Hard-reload
(Cmd+Shift+R) after touching an asset, and confirm the swap took by sampling
the loaded texture rather than trusting the screenshot.

Note: the render loop runs on `requestAnimationFrame`, so all animation pauses
while the browser window is fully occluded/hidden. This is normal.

### Dev URL params
- `?reveal` — skip the opening "touch it" interaction, go straight to the reveal
- `?node=N` — auto-advance to node N (0–4) for framing/tuning
- `?debug` — log camera/render state AND expose `window.__patina`
  ({camera, lookTarget, viewShift, scene, stage, NODES, current, idx, state,
  goToNode, reveal, renderer, frame, read, addScroll, stepBeat, spin,
  scrollSpin, FULL_TURN, spinPerBeat}) for live
  tuning. `addScroll(620)` is one beat's worth of scrub (dev-only path, see
  "Reading by scroll"); `read` shows where the
  reader is inside the current node.
- `?solo` — disable background preloading of the other nodes
- `?thread=marble` / `?thread=terracotta` — open on a thread other than bronze

**Verifying framing.** `window.__patina.frame(i)` loads node `i`, parks the
camera at its settled reveal position and renders ONE frame synchronously.
Use it instead of `?node=N` when checking composition: rAF is throttled to
zero whenever the Chrome window is occluded, which stalls every GSAP tween
mid-move and makes ordinary screenshots show half-finished camera moves.
For the same reason, driving a whole transition from the console is most
reliable via `gsap.updateRoot(t)` stepping rather than waiting on rAF.
To judge framing numerically rather than by eye, project the model's Box3
corners with `.project(camera)` — anything outside NDC ±1 is off-screen.

When stepping GSAP by hand you must also advance what the render loop would
have done, or scroll-driven rotation stays frozen while everything else moves:
`read.smooth += (read.p - read.smooth) * (5.5/60)` per simulated frame. Note
too that `gsap.set()` on the placard does NOT stick while the ticker is stalled
— write `element.setAttribute('style', 'opacity:1;transform:none')` instead if
you need the card visible for a screenshot. `requestIdleCallback` is also
throttled hard in a hidden tab, so background preloading crawls and a cold
`goToNode()` on a large scan can outlast a 45s CDP timeout; step it in chunks.

## Tech stack

- **Vanilla HTML/CSS/JS** — no build step, no framework, no bundler. `index.html`
  holds markup + CSS; behavior is split into native ES modules under `js/`,
  loaded via `<script type="module" src="js/ui.js">` and an inline importmap.
- **Three.js 0.160.0** (CDN via importmap) — WebGL rendering, GLTF loading
- **GSAP 3.12.5** (CDN, plain `<script>`, global `gsap`) — all camera moves,
  emerge fades, text fades
- **Playfair Display** (Google Fonts) — serif for all historical text
- Loaders: `GLTFLoader` + `DRACOLoader` + `KTX2Loader` + `MeshoptDecoder`

## File structure

```
index.html          markup + CSS only; loads js/ui.js as a module
js/
  threads.js         THREADS data — the five nodes per material, pure data,
                      no three.js or DOM dependency
  scene.js            renderer/scene/lights, GLTF loading + prep (normalize,
                      strip/matte/clay handling, army cloning), emerge fades
                      (prepEmerge/setEmerge/settleEmerge), goFlat()/goWarm()
  ui.js               state machine, overlay text, timeline, landing/swatch
                      picker, drag-to-spin, render loop — imports from both
assets/terracotta/
  indus-valley.glb      Mohenjo-Daro figurine, c. 2500 BCE
  greek-krater.glb      Geometric-period krater, c. 750 BCE (museum pedestal on
                        "krater_Krater_baseFromRhino_*" materials — stripped via `strip`)
  qin-soldier.glb       Qin terracotta soldier, c. 210 BCE (cloned into an army)
  juni-pieta.glb        Juan de Juni Pietà, c. 1537 (polychrome — the paint is the point)
  terracotta_vase.glb   big-box flowerpot, today (glossy roughness map; `matte` flag)
assets/bronze/
  nmm17_ingot_copper_oxhide_model_mesh.glb   oxhide copper ingot (CC-BY, cyberarch)
  bronze_age_bent_rapier.glb                 rapier folded into a figure-8 (CC-BY, jwexler)
  the_charioteer_of_delphi_photogrammetry_test.glb
                        Charioteer of Delphi (CC-BY, Nick Gizelis). CONVERTED in place
                        from KHR_materials_pbrSpecularGlossiness → metallic-roughness
                        (three r160 dropped spec-gloss; textures were silently ignored)
  ghiberti_bas-relief__north_door.glb        Baptistery North Door panel (CC-BY, chabychab)
  african_american_soldiers_monument.glb     Baltimore war memorial, 1971 (CC-BY, Katie Wolfe)
assets/marble/
  torso_of_folded-arm_figurine.glb           Cycladic folded-arm figurine torso, Early
                        Cycladic II (CC-BY, The Hunt Museum, inv. MG 002). Its base colour map
                        shipped dark amber (mean RGB 81,68,42 — saturation 0.47 at hue 40°),
                        which under the warm key read as bronze, not stone. The 512² map was
                        desaturated and lifted in place (now 131,130,126, saturation 0.04) and
                        re-embedded; an albedo tint could not fix this because material colour
                        only multiplies, so it can darken but never desaturate
  wounded_amazon.glb    Amazona Herida, Écija, c. 130 CE (CC-BY, Thomas Flynn). The gate node:
                        the only one of four surviving Sciarra Amazons keeping original red
                        pigment. Ships metalness 0.41 AND emissive [1,1,1] + emissive map —
                        both killed by `stone` (see below); the emissive is the dangerous one
  2025.18_fata_morgana.glb                   Giambologna, Fata Morgana, c. 1572 (CC0,
                        Cleveland Museum of Art, acc. 2025.18). Shipped as spec-gloss and
                        141 MB — CONVERTED to metallic-roughness, see below. Carries
                        `strip: 'Base_Mats'`: a flat zero-height scanner cap at y=0 that is
                        coplanar with the ShadowMaterial floor and would z-fight it
  1968.212_terpsichore_lyran.glb             Canova, Terpsichore Lyran, 1816 (CC0, Cleveland
                        Museum of Art, acc. 1968.212)
  george_washington_greenough_statue_1840.glb  Greenough's George Washington, 1840 (CC0,
                        Smithsonian American Art Museum, acc. 1910.10.3)
  parthenon_block_xxxvi_south_frieze.glb     Parthenon Block XXXVI, south frieze, British
                        Museum (CC-BY, danielpett). 602k tris. The scan includes the Duveen
                        Gallery wall AND the museum's numbered label strip along the bottom;
                        there is only one material, so `strip` cannot remove them — the node
                        is framed tight (dist/lookY) so both fall outside the frame
assets/swatches/    the picker's three tiles — 512² JPEG crops lifted from the
                    threads' OWN scans, not stand-in colours: terracotta from the
                    flowerpot's fired body, bronze from the Ugarit ingot's
                    corrosion, marble from Canova's Terpsichore (desaturated 0.85;
                    the raw scan reads ivory). Regenerate by unpacking a GLB with
                    `gltf-transform cp x.glb out.gltf` and cropping a clean window
                    out of the base colour atlas — most of an atlas is seams,
                    padding and recognisable carving, so pick a flat material field.
                    The CSS keeps only a radial gradient on top, as the key light
textures/           original source GLBs (pre-rename), not loaded at runtime.
                    ~346 MB, roughly half the folder, and referenced by nothing
                    at runtime — it MUST NOT ship (see "Deploying" below)
textures/marble_original/   the marble GLBs as downloaded, before texture downscaling
credits.html        the attribution page the site actually links to, GENERATED
                    from CREDITS.md. Static hosts serve .md as
                    application/octet-stream, so the old `href="CREDITS.md"`
                    downloaded a file instead of showing the credits — which
                    broke the one licence obligation the project has. Edit
                    CREDITS.md (still the source of record), then regenerate
CREDITS.md          source of record for every scan's author, licence and URL
```

**Everything shipped is Draco-compressed with textures capped at 4096.** The
whole `assets/` folder is 89 MB (was 352 MB); a default first visit — the bronze
thread plus node 0 of the other two — transfers 26.5 MB (was ~160 MB). The pass
was `resize --width 4096 --height 4096` then `draco`, per file, verified to
leave triangle counts, texture counts and material names byte-identical (the
krater's `strip` prefix depends on those names surviving). Originals as they
were before this pass are in `textures/originals_pre_compression/`.

If you replace or add a scan, run it through the same two commands. `GLTFLoader`
already has `DRACOLoader` and `KTX2Loader` wired to CDN decoder paths
(`scene.js:70-75`), so compressed geometry needs no code change.

**Texture VRAM is still the open budget**, and it is a separate number from disk
size — Draco shrinks the file, not the texture memory. Per thread, resident:
bronze 596 MB, terracotta 784 MB, marble 227 MB. Marble is the only one in a
mobile-safe budget, because it is the only one at 2048. Taking bronze and
terracotta to 2048 as well would bring them in line; it was not done because
4096 met the deploy target and 2048 is a visible-fidelity call.

**Marble texture budget.** The five marble scans shipped with textures up to
8192×8192 (Terpsichore alone carried two, ~805 MB of VRAM). They were capped
at 2048 with `npx @gltf-transform/cli resize --width 2048 --height 2048`,
taking the thread from ~1433 MB → ~225 MB of VRAM and 109 MB → 60 MB on disk,
with geometry untouched. Originals are kept in `textures/marble_original/`.
Note this was a budget improvement, NOT a bug fix — the freeze that prompted
it was Chrome occlusion throttling rAF, which affects every thread equally.

**Check `extensionsUsed` on every new scan.** three r160 dropped
`KHR_materials_pbrSpecularGlossiness` and *silently ignores* the textures of
any model that uses it — the mesh renders untextured with no error. It has now
bitten this project twice (the Charioteer, then Fata Morgana). Fix with
`npx @gltf-transform/cli metalrough in.glb out.glb`, then `resize`. Converting
inflates the file first (141 MB -> 177 MB); the resize pass brings it down
(-> 19.9 MB).

Bronze asset credits (CC-BY 4.0) are documented in the project memory's
bronze-thread-sourcing note; attribution should ship with any public deploy.

## How it works

### Threads & node config
The experience is data-driven from the `THREADS` object in `js/threads.js` —
one entry per material (terracotta, bronze, marble), each with its own `nodes`
array and a per-thread `cache`. Node count is NOT fixed at five — the timeline
spaces `NODES.length` ticks automatically, and marble runs six. Node fields: `{ file, label, beats, era, dist, height }`
plus optional flags:
- `beats` — the commentary as an ARRAY of 2–3 chunks, not one string. The reader
  scrolls from beat to beat within a node; the camera does not move between
  them, only the placard text and the piece's rotation. **Beat 1 always names
  what is on screen before it argues anything** — the reader arrives at a new
  object mid-scroll knowing only the place-and-date label, so the first sentence
  says what the thing is, how big it is, and what is broken off or missing from
  it; the thread's connective thesis follows in the same beat. An opening that
  leads with the argument ("Marble holds paint well but only temporarily")
  reads as though the placard and the object have nothing to do with each
  other. Beats 2–3 carry the discovery and the payoff.
- `army`, `flat`, `clay`, `matte`, `strip`, `faceY`, `yShift` — as before
- `sway` — marks a SLAB-like object (ingot, rapier, relief panels), which now
  only gives it a slightly deeper idle breath. It used to also narrow the
  reading arc, so a piece carved on one face never turned edge-on; it NO LONGER
  does, because every node turns a full 360° (see "Spin" below).
- `rot: [x,y,z]` — reorient the raw scan BEFORE normalize (scans arrive lying
  down / facing away; e.g. the ingot needs rx≈1.05, the rapier rx≈π/2)
- `closeup: {x,y,z,lookY}` — node 0 only: exact press-in camera for the opening
- `stone` — marble handling: forces metalness 0 and strips metalness/roughness
  maps, and **kills emissive** (color, map and intensity). The emissive part is
  not cosmetic: `setEmerge` fades a model by tweening material COLOR only, so a
  self-lit mesh stays visible straight through the dip to black and the geometry
  swap happens in plain sight. The Écija Amazon ships emissive [1,1,1] plus an
  emissive map and would break the transition without this.
- `polish: n` — roughness scalar used by `stone` (default 0.7). Low for the
  museum-polished Canova (0.5), high for weathered or abraded surfaces
- `grain: {scale, repeat, octave, rough}` — procedural micro-relief (bump, and
  roughness too when `rough`). This is what makes the press-in read as a
  material at all: at ~0.3 units off the surface the scan's own colour map is
  magnified far past its texel grid, so it smears, and nothing high-frequency
  is left for the key light to catch. Applied AFTER `clay`/`stone`/`tint` so it
  lands on top of their edits. Keep `repeat` modest (≈20–25) — pushing it into
  the 50s minifies the noise into visible moiré on these dense UV layouts.
- `tint: 0x……` — albedo tint multiplied into the scan's colour map, applied
  after `clay`/`stone`. Used on the Cycladic torso to buy back the key's warmth
- `lookY: n` — where the camera aims for this node. Without it every node
  inherits node 0's look height, which aims below centre on tall pieces and
  cuts their heads off — unavoidable in marble, which spans a 6 cm grave
  figurine and a 12-ton enthroned colossus. `lookTarget.y` tweens to the
  incoming node's `lookY` during the pull-out, in lockstep with the dolly.
`era` feeds the timeline labels. The experience opens on **bronze** by default;
`?thread=terracotta` overrides it. The bronze look target is the same
museum-at-2am; its finale reuses `goFlat()` as flat municipal daylight.

A thread may also carry a `mood` (see lighting below).

### Scene & lighting — "museum case at night"
- Warm `SpotLight` key (`0xffc9a0`) from upper-right, deep shadows (PCFSoft, 2048 map)
- **Cool `SpotLight` counter-key (`rimLight`) from the upper LEFT, plus a warm
  rear `backLight`.** These exist because one node is one full turn: any face
  can end up toward the camera, and with a single upper-right key everything on
  the left went black — the key's own shadow map covered that whole half. The
  worst case was the Ghiberti panel, whose mean luminance over its own
  silhouette fell to **1.0/255 (99% of pixels near-black) at 225°** against 38
  at the front; it is now 80. Neither new light casts shadow: a second shadow
  map only fills what the key already occludes, and two overlapping contact
  shadows on the floor read as a lighting error.
- **Brightness is NOT rotation-dependent for the reason it looks like.** The
  camera is fixed, so the visible surface always has camera-facing normals no
  matter how the piece turns — the geometry of "which normals are lit" never
  changes. Rotation goes dark because of what rotates INTO view: the key's
  self-shadowing, and the dark/untextured back faces most photogrammetry scans
  have. That is why the fix is a second lit direction and not a moved key.
- `aimLights()` re-points every spot at `lookTarget` each frame. The targets
  used to be copied once at startup while `lookTarget.y` tweens per node
  (`lookY`), so a tall piece was lit at node 0's height and its head sat in the
  cone's penumbra — dark for reasons unrelated to rotation.
- `ShadowMaterial` floor plane catches contact shadow
- `ACESFilmicToneMapping`, fog, background `#0D0B09`
- A reserved `flatLight` starts at intensity 0; at the final node `goFlat()` ramps
  to flat fluorescent retail light over 3s and lifts `scene.background`/fog to a
  gray-green (`BG_FLAT`); `goWarm()` restores the museum when stepping back.
- **Per-thread mood.** `THREADS[key].mood` overrides the museum's colour:
  `{key, keyI, amb, ambI, fillI, rim, rimI, back, backI, bg}`, applied by `setThreadMood()` on load and
  on every thread switch, and it is what `goWarm()` restores to. The tungsten
  default flatters clay and bronze but renders white stone as sandstone, so
  **marble runs a cooler, brighter room** (`0xfff0e2` at 110, ambient lifted to
  0.9, fill to 0.45). This was the single biggest fix for "the marble doesn't
  look like marble" — worse at the press-in than anywhere else, because there
  the surface fills the frame and colour is all the eye has to go on.
  Marble needs **less** counter-key than clay or bronze, not more, precisely
  because its room is already brighter: at the bronze thread's `rimI: 78` the
  Giambologna clipped to flat white across half its surface, so marble runs 52.

### State machine
`loading → closeup → landing → closeup → animating → revealed → (scroll through
each node's beats, then advance) → end`

**Scrolling is the primary action**, not clicking. Within a node the wheel walks
the commentary beat by beat and turns the piece as it goes; scrolling off the
END of the last beat is what fires the transition to the next node. See
"Reading by scroll" below.
- On load the camera starts pressed against node 0 of the default thread
  (bronze; full-bleed grain, no lens shift). The title + tagline fade in over
  the texture, then "touch it" with `click or scroll` under it. That second line
  is the only affordance on the opening screen — "touch it" alone reads as a
  title card, and the surface fills the frame with nothing that looks clickable.
  It sits at full `--ink`, small caps, with its own text-shadow so it survives
  the closeup drift wandering onto a pale patch of texture.
- **`#prompt` is nested inside `#title-overlay`**, flowing under the tagline, so
  the instruction sits with the title instead of stranded at the foot of the
  screen. Safe because ui.js only ever fades `#title-overlay h1` and
  `.tagline`, never `#title-overlay` itself.
- **The pulse is on `.prompt-lead`, not `#prompt`.** Only "touch it" breathes;
  the container fades in and holds at 1. Pulsing the container dragged the
  instruction to ~0.25 at the dim end of every cycle, which is what made it
  read as barely there. `killPrompt()` must clear BOTH tweens and re-baseline
  the lead — the yoyo repeats forever, so killing only the container leaves it
  running against a hidden element and hands the next closeup a half-faded line.
- The **first** click during `closeup` does not reveal — it calls
  `goToSelect()`: title/prompt fade out and the landing panel (a translucent
  scrim over the still-visible clay) fades in with the material swatches
  (Terracotta / Bronze / Marble). Picking a swatch calls `enterThread()`: if it's a different material
  than the current one, the clay behind the scrim is swapped (new node 0
  loaded, camera/timeline reset) before the panel fades out; a
  `readyToReveal` flag is set so the *next* closeup click reveals instead of
  reopening the picker.
- click (or a downward scroll) during `closeup`, once `readyToReveal` →
  `reveal()`: title fades away, camera dollies back 2.6s while an off-axis lens
  shift (`viewShift` 0→1) slides the object into the right two-thirds and the
  left placard fades in; timeline appears.
- scrolling past the last beat during `revealed` → `goToNode()`: camera pushes
  INTO the current surface (1.5s) while it dims to black, geometry swaps at the
  apex, camera pulls back out (2.2s) while the next form brightens. The timeline
  glow slides across in lockstep with the whole move. Scrolling UP off the first
  beat runs the same move in reverse, landing on the previous node's LAST beat.
- The whole screen is still a click target, but a click now means "next
  passage" (`stepBeat(1)`), not "next piece" — with the copy split into beats,
  jumping a whole node per click would skip most of what's written.
  `← back` (top-left) and the arrow keys step a beat, then a node.
  `choose another texture` (`#nav-home`, top-right) calls the same
  `chooseTexture()` the end screen uses, so the picker is one click away from
  every screen past it. `updateNav()` shows it on `revealed`/`end` and on a
  `closeup` reached after a thread was picked; it stays hidden on the opening
  closeup and on the picker itself.
- The end screen belongs to the last BEAT of the last node, not to arriving at
  it — `syncEnd()` shows it only when `idx` and `read.beat` are both final, and
  retracts it if the reader scrolls back up. Landing on the final piece only
  puts its first passage on screen, and offering "replay" over unread text ends
  the thread early. It offers Replay (resets to node 0 of the current thread and
  returns to `closeup`) and "Choose another texture" (`chooseTexture()`,
  resets to node 0 and reopens the landing swatch picker directly, skipping
  `closeup`).

### Reading by scroll
Everything lives in the "Reading by scroll" block in `js/ui.js`, around the
`read` object: `{ p, smooth, anchor, beat }`.
- `read.p` is 0→1 across the current node's beats. **It is metered by GESTURE,
  not by pixels.** `stepScroll()` is the single funnel for every input — wheel,
  vertical swipe, arrow/page keys — and each one moves exactly one beat.
- **One gesture, one beat** (`wheelStep`). A trackpad reports a flick as a burst
  of dozens of events whose total delta depends on how hard it was thrown, so
  the old pixel metering let the flick's VELOCITY decide whether the reader
  crossed one beat or three. A burst with no gap longer than `GESTURE_GAP`
  (160ms) is ONE gesture; the momentum tail keeps refreshing `lastEvent`, so the
  whole coast stays inside it. Reversing direction always starts a new gesture.
  - A held scroll still advances, on a `REPEAT_MS` (420ms) cadence — but a
    repeat ALSO requires the delta to be ≥ `SUSTAIN_RATIO` (70%) of the
    gesture's peak. Time alone cannot separate "still pushing" from "coasting",
    because a hard flick's tail outlasts any cadence you pick; magnitude can,
    since momentum decays by definition and a finger still on the glass does
    not. Dropping that check is what makes one flick jump two passages again.
  - Swipe gets the same contract via `SWIPE_PER_BEAT`, with `drag.stepped`
    cleared on release, so reading on is a second swipe, not a longer one.
- `addScroll()` is now **dev-only** — the `?debug` scrubber, at
  `SCROLL_PER_BEAT` (620px) per beat. Nothing in the live input path calls it.
- `read.smooth` is an eased follower updated in the render loop; it drives
  rotation, so a flick of the trackpad reads as pushing a heavy object round
  rather than snapping it.
- `read.beat` is the displayed chunk, mapped from `p` with a **deadband**
  (`BEAT_HYST`) on either side of each boundary — without it a trackpad
  hovering exactly on a threshold re-fires the text crossfade repeatedly.
- `read.anchor` is the progress the piece arrived at. Rotation is
  `(smooth - anchor) * arc`, so a node entered BACKWARDS (which lands mid-way
  through its last beat) still arrives face-front instead of pre-turned ~90°.
- Rotation composes as `faceY + scrollSpin() + spin.user + breath`. `spin.user`
  is the hand's own contribution from dragging, kept separate so a drag never
  fights the reading position; it carries release inertia and is zeroed at each
  transition apex.
- On touch there is no wheel, so the first few pixels of a drag decide whether
  the gesture is a horizontal spin or a vertical scroll, and it keeps that role
  until release (`drag.mode`).

### Key mechanics
- **Emerge, not opacity**: models fade by tweening material color toward/from
  black (`prepEmerge`/`setEmerge`/`settleEmerge`). Alpha blending on these
  high-poly scans kills early-Z and floods the GPU with overdraw.
- **warmUp()**: freshly preloaded models get one hidden compile+render so the
  first visible frame doesn't stall.
- **normalize()**: scales each GLB to a common height, centers it, sits it on y=0.
- **strip flag**: removes meshes whose material name starts with the given
  prefix (used to cut the krater's baked-in museum pedestal + label card).
- **matte flag**: drops roughness/metalness maps, forces roughness 0.92
  (used on the vase, whose scan reads wet-glazed otherwise).
- **Qin army** (`army: true`): the single soldier is `.clone()`d into rows.
- **No idle turntable.** The piece's rotation is the reader's: scroll turns it,
  drag adds to it, and between gestures it only breathes (a ~1–3° sine). There
  is no constant auto-rotation on `revealed` — it would desync from the scroll
  mapping and drift the piece off-axis over a long read. The opening `closeup`
  keeps its own bounded wander (`closeupDrift`), which is a different problem:
  there the surface must stay full-bleed however long the title holds.
- A drag past `DRAG_THRESHOLD` suppresses the click the browser fires on
  release, so spinning a piece never also steps the passage.
- **ONE NODE IS ONE FULL TURN.** `FULL_TURN` (360°) is the arc across a whole
  node, and `scrollSpin()` is just `(read.smooth - read.anchor) * FULL_TURN` —
  no beat-count scaling, because `read.smooth`/`anchor` already run 0→1 across
  the node. The per-gesture step therefore falls out of the beat count
  (`spinPerBeat()` = 360/beats: three beats → 120° each), so a longer node turns
  in finer increments rather than turning further. The point is that reading a
  piece all the way through shows every face of it.
  - There is **no slab exception any more.** `SPIN_PER_BEAT_SLAB` (40°) used to
    keep carved-on-one-face pieces from going edge-on; they now pass edge-on
    twice per node like everything else, and land front-on again at the end.
    `sway` still deepens the idle breath — it just no longer narrows the arc.
  - Arriving at a node puts `read.p` at 0 while beat 0's *centre* is `0.5/n`, so
    the first gesture turns 1.5× the per-beat step (180° then 120°, 120° on a
    three-beat node) and a reader parked on the last beat has seen 300° of the
    360; the final step lands during the push-in. Anchoring entry at beat 0's
    centre would make every gesture exactly 360/n but would show LESS (240°)
    before the transition, which is why entry is still at 0.
  - **Caveat: the Parthenon block (marble node 5) has the Duveen Gallery wall in
    its scan**, kept out of frame by tight `dist`/`lookY` at the front angle
    only. A full turn sweeps it across the frame — measured placard-area
    luminance goes 28 (front) → 92 (at 30°), against a steady 11–12 for every
    other node in the project, and the placard text loses legibility over it.
  - **Caveat: the Qin army (terracotta node 2) puts the camera INSIDE the
    formation.** `army: true` clones one soldier into rows that extend well
    past the pivot, so turning the node swings a row through the lens: at 180°
    the silhouette covers the entire 640×400 sample and mean luminance is
    **0** — the frame is a solid black wall of soldier-backs. No lighting
    change reaches this; the camera is enclosed by geometry. It needs a wider
    `dist` or a narrowed arc for this node specifically.
  - **Two terracotta scans are unlit and ignore the rig entirely.** The krater
    (node 1) and the Juní Pietà (node 3) load as `MeshBasicMaterial` — three
    and five materials named `defaultMat`, straight from the GLB. Their pixels
    are byte-identical with the lights at full and at zero. The krater doesn't
    care (its baked texture is bright and even at every angle, mean 38–49), but
    the Pietà is dark in its own texture and sits at **mean 8, 91% near-black
    at 180°**, which lighting cannot touch. Converting its materials to
    `MeshStandardMaterial` (carrying `map`/`color`, roughness 0.85) was tested
    and only reaches mean 13 — the darkness is in the scan, and the conversion
    would re-light a node whose polychromy is the whole point. Left as-is.
- `?debug` exposes `scrollSpin`, `FULL_TURN` and `spinPerBeat` so the
  swing can be measured rather than eyeballed. Do NOT try to read the arc off
  `current.rotation.y`: that is only written inside the rAF loop, and `frame()`
  does not run it, so with the window occluded (rAF frozen) it returns a stale
  number that looks like the spin is broken. Set `read.anchor = 0` and
  `read.smooth = 1/beats` and call `scrollSpin()` instead.

### Background loading
Node 0 loads first; the rest preload in the background (unless `?solo`). Loaded
pivots are memoized in `cache[]`. Preloads yield to the render loop between
models (`idleGap()`): each `loadNode` ends in `warmUp()`, a synchronous
compile + shadow + render pass, and running several back to back on
multi-megapixel scans starves rAF enough to stall the opening dolly.

### The bootstrap guard
`js/scene.js` builds the `WebGLRenderer` at module top level, so on a device
with no WebGL it throws before `js/ui.js` ever evaluates — which means
`showFault()`, which lives in ui.js, never runs and the visitor gets a silent
black screen. The inline `<script>` above the module tag in `index.html` sits
outside the module graph and survives that: it feature-checks WebGL up front,
and otherwise watches for `window.__patinaBooted` (set at the end of ui.js) not
appearing within 8s of `load`.

It is deliberately a watchdog on a success flag, NOT a global `error` handler.
A listener broad enough to catch a module-graph failure also catches every
benign resource 404, and would throw the fault panel over a page that is
working fine. If you add a global handler here, that is the failure mode.

The fault panel has two audiences: the visible note is written for a visitor,
and `.fault-dev` (the `python3 -m http.server` fix) is revealed only when
`location.protocol === 'file:'`, so dev instructions don't ship to end users.

## Deploying
- **Never ship `textures/`.** ~346 MB, roughly half the folder, referenced by
  nothing at runtime (`grep -rn "textures/" index.html js/` returns nothing).
  `.gitignore` excludes it and `.DS_Store`; if you deploy by uploading the
  folder rather than by git, exclude it by hand.
- Ship `credits.html`. CC BY 4.0 requires attribution wherever the work is
  shown, and it is linked from the picker and the end screen.
- All assets are already Draco-compressed at 4096 (see above). `assets/` is
  89 MB, which fits under Vercel's **100 MB Hobby static-upload cap**; Pro is
  1 GB. Keep it under that if you add a scan.
- Hobby includes 100 GB/month of Fast Data Transfer. At 26.5 MB for a default
  visit that is roughly 3,800 visits/month, or ~1,000 if a visitor walks all
  three threads (89 MB).
- `vercel.json` sets `Cache-Control` on `assets/**/*.glb`. It is deliberately
  1 day + a week of `stale-while-revalidate`, NOT `immutable` with a long
  max-age: these filenames are not content-hashed, so a returning visitor with
  an immutable cache entry would never pick up a replaced scan.
- Hobby cannot connect to Git repos owned by a GitHub **organization** — a
  personal repo is fine.

## Conventions
- Markup/CSS stay in `index.html`; behavior lives in the three ES modules under
  `js/` (`threads.js` data, `scene.js` rendering, `ui.js` state/interaction).
  Keep that split — don't sprawl into more files or inline `<script>` blocks
  without a strong reason.
- Pin CDN versions (don't use `@latest`).
- Camera moves are slow (2–3s, eased) by design; don't speed them up.
- The historical copy in the `NODES` array is settled — treat the facts, the
  voice and the running argument of each thread as fixed, and don't paraphrase
  a passage just to tighten it. What is NOT frozen is the ordering: beat 1 was
  rewritten across all sixteen nodes to lead with the object on screen rather
  than the thesis (see `beats` above), so a first sentence describing the piece
  is expected, not a deviation. Keep it to 2–3 beats: one is the wall of text
  this replaced, four makes the piece transition too rare to feel earned.
- **Describe only what the loaded scan actually shows.** Several assets are
  partial — the Cycladic node is a torso with no feet, the Charioteer has lost
  his chariot and horses, the Ghiberti node is one panel of twenty-eight. Copy
  that describes the complete artefact ("her feet point downward") while a
  fragment rotates in frame is the same disconnect the beat-1 rewrite fixed.
  Check the model before writing about its pose.
- Keep transitions in 3D (push in / swap at apex / pull out) — never 2D
  crossfades between full-frame views.
