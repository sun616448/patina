# Patina

**An interactive walk through history by material.** Scroll through bronze,
terracotta and marble, one real 3D-scanned artefact at a time, from a
4,500-year-old grave figurine to a $4.99 flowerpot. Built in vanilla
JavaScript with three.js, no framework and no build step.

**[▶ Open the live demo](https://patina-texture.vercel.app/)**

https://github.com/user-attachments/assets/de7786ec-5727-4c13-af9e-906c9d2fe398

![The opening screen: the title over a bronze surface at maximum closeness](demo/hero.jpg)

---

## What it is

You start pressed against a surface, close enough that it is only texture. The
page asks you to touch it, and then to pick a material. From there you scroll,
and the object in front of you turns while a history of that one material walks
forward through time. There are no menus, no chapter screens and no cuts: to
reach the next object the camera presses into the surface you are looking at
until it fills the frame, swaps the geometry at maximum closeness, and pulls
back to reveal the next form. Every object is a real photogrammetry scan of the
real artefact, used under an open licence.

Sixteen objects across three threads, each thread making one argument:

| Thread | Spans | The argument |
| --- | --- | --- |
| **Bronze** | 1320 BCE → 1971 | A material that is never safe. It can always be melted back down, so nearly every large Greek bronze ever cast was eventually turned into something else and the survivors survived by accident. Runs from a copper ingot off a ship that sank around 1320 BCE to a war memorial in Baltimore. |
| **Terracotta** | 2500 BCE → today | The opposite, for the least flattering reason: fired clay has no scrap value, so nobody ever had a reason to melt a figurine down, and the cheapest material anyone worked leaves the fullest record. |
| **Marble** | 2500 BCE → 1937 | Whiteness as subtraction. Classical sculpture was painted, and the white we revere is what is left after pigment loss, burial, weathering and cleaning. It ends in 1937, when the British Museum took copper tools to the Parthenon frieze to reach the real marble it believed lay underneath, and removed the original worked surface instead. |

| | |
| --- | --- |
| ![The Charioteer of Delphi, with the placard and timeline visible](demo/bronze.jpg) | ![A Mohenjo-daro figurine in the terracotta thread](demo/terracotta.jpg) |
| ![The Écija Amazon in the marble thread](demo/marble.jpg) | ![The camera pressed into a terracotta surface mid-transition](demo/press-in.jpg) |

## Features

- **The camera never leaves the material.** Transitions are entirely in 3D:
  press in, swap at maximum closeness, pull back out. Nothing is ever a 2D
  crossfade between two views.
- **Reading an object rotates it exactly once.** Reading a piece all the way
  through is one full 360° turn, so finishing the text means you have seen every
  face of it. You can also grab and spin it by hand, and that stays separate
  from your reading position, so a drag never fights the scroll.
- **Scroll is metered by gesture, not by pixels.** One flick of a trackpad is
  one passage, however hard you threw it.
- **Lit like a museum case at 2am,** with a different room per material: the
  tungsten key that flatters clay and bronze renders white stone as sandstone,
  so marble gets a cooler, brighter rig of its own.
- **Ends where the material is now.** At the last object in each thread the
  museum lighting ramps up to flat fluorescent retail daylight over three
  seconds.
- **Works on touch,** where the first few pixels of a drag decide whether the
  gesture is a horizontal spin or a vertical scroll.

## Run it locally

There is no build step and nothing to install, but it does have to be served
over HTTP. Opening `index.html` off the filesystem fails silently, because the
ES module imports and the `.glb` fetches are both blocked on `file://`.

```bash
git clone https://github.com/sun616448/patina.git
cd patina
python3 -m http.server 8123
```

Then open http://localhost:8123/ .

Useful development flags: `?thread=marble` opens a different thread, `?node=3`
jumps to an object, `?debug` exposes the camera and reading state on
`window.__patina` for live tuning.

## Built with

| | Why |
| --- | --- |
| **Vanilla HTML/CSS/JS**, three ES modules | No build step, no bundler, no framework. One page and three script files is the right weight for a single linear experience, and keeps deploys to a static upload. |
| **[three.js](https://threejs.org/) 0.160** | WebGL rendering and glTF loading, loaded from a CDN through an importmap rather than npm, since there is nothing to bundle. |
| **[GSAP](https://gsap.com/) 3.12** | Every camera move and fade. Chosen over CSS transitions because the moves are on 3D camera position and material colour, not on DOM properties. |
| **Draco + KTX2 + Meshopt** | Mesh and texture compression, which is what makes the asset budget work at all. |

The source is split three ways: `js/threads.js` is pure story data with no
three.js or DOM dependency, `js/scene.js` owns the renderer, lighting and model
preparation, and `js/ui.js` owns the state machine and input. Markup and CSS
stay in `index.html`.

## Engineering notes

**Rotating a photogrammetry scan 360° breaks the lighting, but not for the
reason it appears to.** When half an object went black I assumed the key light
was in the wrong place. It was not. The camera is fixed, so the visible surface
always has camera-facing normals no matter how the piece turns, and which
normals are lit never actually changes. What changes is what rotates *into*
view: the key's own self-shadowing, and the dark, untextured back faces most
scans have. Measured over its own silhouette, the Ghiberti panel fell to a mean
luminance of 1 out of 255, 99% of its pixels near-black, at 225°. So the fix was
a second lit direction rather than a moved key: a cool counter-key from the
upper left plus a warm rear light, neither casting shadow, since a second shadow
map only fills in what the key already occludes and two contact shadows on the
floor read as a bug. That panel now measures 80 at the same angle.

**One flick of a trackpad is not one number.** A trackpad reports a flick as a
burst of dozens of events whose total delta depends on how hard it was thrown,
so metering the reader's progress in pixels let the *velocity* of a gesture
decide whether they crossed one passage or three. Progress is now metered in
gestures: a burst with no gap longer than 160ms is one gesture, and the momentum
tail keeps that gesture alive so the whole coast stays inside it. A held scroll
still has to advance, though, and time alone cannot separate "still pushing"
from "coasting", because a hard flick's tail outlasts any cadence you pick.
Magnitude can, since momentum decays by definition and a finger resting on the
glass does not, so a repeat also requires the delta to still be at least 70% of
that gesture's peak.

**A scan that renders untextured, with no error at all.** three.js r160 dropped
`KHR_materials_pbrSpecularGlossiness` and silently ignores the textures of any
model using it. Nothing warns you; the mesh just arrives bare. It cost real time
twice, on the Charioteer and again on Giambologna's *Fata Morgana*, so checking
`extensionsUsed` is now the first thing done to any new scan.

**Scans do not arrive the colour their material is.** The Cycladic torso's base
colour map shipped dark amber, saturation 0.47 at hue 40°, which under a warm key
read as bronze rather than stone, in a thread whose whole argument is that the
stone is white. An albedo tint cannot fix that, because material colour only
multiplies: it can darken but never desaturate. The map itself had to be
desaturated and lifted, RGB (81, 68, 42) to (131, 130, 126), and re-embedded.

**And one false lead worth recording.** Marble froze during testing, and those
scans were carrying textures up to 8192², one of them 805 MB of VRAM by itself,
so the cause looked obvious. Capping them at 2048 took the thread from about
1,433 MB of VRAM to 225 MB and was worth doing, but it was not the bug. The
freeze was Chrome throttling `requestAnimationFrame` to zero whenever its window
is occluded, which affects all three threads equally and still does. It is also
why tuning happens through a `?debug` hook that renders single frames
synchronously, rather than by screenshotting and trusting the result.

## Getting 352 MB of scans under a 100 MB deploy cap

The sixteen scans came to 352 MB, against Vercel's 100 MB static upload limit on
the Hobby plan. Everything shipped is now Draco-compressed with textures capped,
at **89 MB total**, and a **first visit transfers 26.5 MB**, because only the
opening thread plus the first object of the other two is fetched up front and
the rest preloads in the background between frames, yielding to the render loop
so a preload never stalls the opening camera move.

Each pass was verified to leave triangle counts, texture counts and material
names byte-identical. Material names matter because several scans have extras
baked in, such as the krater's museum pedestal and label card, which are
stripped at load time by material-name prefix.

## Credits and licence

Every object is a real 3D scan published by its author under an open licence,
mostly CC BY 4.0, from Sketchfab and from the Cleveland Museum of Art, the
Smithsonian American Art Museum and the Hunt Museum. CC BY 4.0 requires
attribution wherever the work is shown, so the credits ship with the site and
every screen links to them.

[**CREDITS.md**](CREDITS.md) is the source of record; [credits.html](credits.html)
is the page the site itself links to, generated from it.

<details>
<summary><b>Updating the demo video</b></summary>

<br>

GitHub only renders an inline video player for URLs it hosts itself, so the clip
at the top of this file has to be uploaded through GitHub rather than linked out
of the repo. The source file is committed at `demo/patina-demo.mp4`.

1. Open any issue or PR comment box on this repo. It does not need to be
   submitted, and can be discarded afterwards.
2. Drag `demo/patina-demo.mp4` into it and wait for the upload to finish.
   GitHub replaces it with a `https://github.com/user-attachments/assets/…` URL.
3. Paste that URL on its own line at the top of this README, in place of the
   HTML comment. A bare URL on its own line is all it takes; no markdown image
   or video syntax.

The original screen recording is 1080p and 146 MB, over GitHub's 100 MB
per-file limit for video uploads. The committed copy is 720p at CRF 28 with the
audio dropped, 2.8 MB:

```bash
ffmpeg -i patina_demo.mp4 -vf scale=1280:-2 -c:v libx264 -preset slow -crf 28 \
  -pix_fmt yuv420p -movflags +faststart -an demo/patina-demo.mp4
```

The stills in this README are frames from the same recording, cropped to the
browser viewport:

```bash
ffmpeg -ss 27 -i patina_demo.mp4 -frames:v 1 \
  -vf "crop=1586:868:166:167,scale=1200:-2" -q:v 3 demo/bronze.jpg
```

</details>
