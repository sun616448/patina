// Patina — the story data for each material thread.
// Pure data, no three.js or DOM dependency, so this can be read or edited
// without touching rendering or UI code.
//
// Key order is the order the picker offers them: bronze, terracotta, marble.
// The swatch buttons in index.html are laid out to match — keep the two in
// step if either is reordered.
//
// Each node's commentary is split into `beats` — 2–3 chunks the reader scrolls
// through, turning the piece as they go; scrolling past the last beat is what
// triggers the push-in/swap/pull-out to the next node.
//
// BEAT 1 ALWAYS NAMES WHAT IS ON SCREEN FIRST. The reader arrives at a new
// object mid-scroll with no idea what they are looking at, so the opening
// sentence describes the thing itself — what it is, its scale, what is missing
// from it — and only then runs the thread's argument. Landing on an abstract
// thesis ("Marble holds paint well but only temporarily") while a stranger's
// torso rotates in the frame reads as caption and image having nothing to do
// with each other. Beats 2–3 carry the discovery and the payoff.
//
// NO DASHES IN THE COPY. Em and en dashes are out of the reader-facing strings
// (`beats`, `label`, `era`) by request — use a comma, a semicolon, a colon or a
// full stop instead, and write date ranges as "1401 to 1424". Comments in this
// file are not copy and are not bound by that.

export const THREADS = {
  bronze: { cache: [], nodes: [
  {
    file: 'assets/bronze/nmm17_ingot_copper_oxhide_model_mesh.glb',
    label: 'Uluburun · c. 1320 BCE',
    beats: [
      "A slab of copper, cast in the shape of a stretched ox hide so that one man could get it onto his shoulder. It is half of bronze: copper turns up almost everywhere, tin does not, so no single place could produce the alloy on its own.",
      "In 1982 a Turkish sponge diver described metal biscuits with ears lying on the seabed, which turned out to be a ship that sank around 1320 BCE carrying ten tons of copper cast into slabs like this one, along with just under a ton of tin, close to the proportions the alloy requires.",
      "Nobody aboard could have made bronze from any of it. The material existed only at the end of a route that nobody controlled end to end."
    ],
    era: '1320 BCE',
    dist: 3.2, height: 0.8, yShift: 0.4, rot: [1.05, 0, 0], sway: true,
    closeup: { x: 0.03, y: 1.02, z: 0.55, lookY: 0.98 }
  },
  {
    file: 'assets/bronze/bronze_age_bent_rapier.glb',
    label: 'Ugarit · c. 1190 BCE',
    beats: [
      "A rapier, bent back on itself until the blade nearly meets its own hilt. The metal in it arrived by sea, and cut one leg of a route like that and the alloy stops, which is roughly what happened around 1200 BCE, when most of them were cut at once.",
      "A farmer ploughing the Syrian coast in 1928 struck a tomb roof, and the mound behind it turned out to be Ugarit, the port at the far end of the route. Among the tablets recovered there were letters written in the city's last weeks, one of them reporting enemy ships burning towns along the coast while Ugarit's own fleet was away.",
      "Those letters survive because clay survives fire, while the bronze that the same archives count by the ton does not survive at all."
    ],
    era: '1190 BCE',
    dist: 3.4, height: 1.1, yShift: 0.45, rot: [Math.PI / 2, 0, 0], sway: true
  },
  {
    file: 'assets/bronze/the_charioteer_of_delphi_photogrammetry_test.glb',
    label: 'Delphi · 470s BCE',
    beats: [
      "A charioteer, standing upright and still holding reins that run to nothing. Because bronze can always be melted, a statue like this is never entirely safe, and nearly every large Greek bronze ever cast was eventually turned back into metal.",
      "French archaeologists found him at Delphi in 1896, buried under rubble that an earthquake had dropped across the sanctuary, which is the only reason he was still there to find.",
      "He is a fragment of something larger: the chariot he drove and the four horses in front of him were taken long ago. His eyes, inlaid with stone and glass, are still in his head."
    ],
    era: '470s BCE',
    dist: 6.6, height: 1.6
  },
  {
    file: 'assets/bronze/ghiberti_bas-relief__north_door.glb',
    label: 'Florence · 1401 to 1424',
    beats: [
      "A single panel out of the twenty-eight that make up one set of doors in Florence. By 1401, choosing not to melt bronze had become the statement itself, since statues and cannon came out of the same workshops, using the same metal and the same men.",
      "That year the guild that maintained the Baptistery held a competition for the right to cast those doors, which Ghiberti won at roughly twenty-three; Brunelleschi lost, left for Rome, and came back an architect.",
      "The doors took twenty-one years of foundry time that the city could have spent on artillery instead. What hangs there now is a copy."
    ],
    era: '1424',
    dist: 3.6, height: 0.95, sway: true, yShift: 0.25
  },
  {
    file: 'assets/bronze/african_american_soldiers_monument.glb',
    label: 'Today',
    beats: [
      "A war memorial, cast in 1971 and standing outdoors in Baltimore ever since. Left in open air copper turns green, and it turns faster in cities that burn things, so the industrial age aged its own monuments faster than it meant to.",
      "The quicker route was deliberate: in 1940 Italy ran a scrap drive that fed public statuary into the war effort, and Germany, Japan and Britain ran versions of the same programme.",
      "Statues still come down, and what happens to the metal afterward remains unresolved in almost every case. Bronze has been moving between weapon and monument since those ships stopped sailing, and it has never settled on either."
    ],
    era: 'Today',
    dist: 8.4, height: 1.8, flat: true
  }
  ]},

  terracotta: { cache: [], nodes: [
  {
    file: 'assets/terracotta/indus-valley.glb',
    label: 'Mohenjo-daro · c. 2500 BCE',
    beats: [
      "A figure the size of your hand, modelled out of river clay and fired hard. Nobody has ever had a reason to melt one down, because fired clay has no scrap value, and so the cheapest material anyone worked leaves the fullest record.",
      "In 1922 an archaeologist digging a Buddhist shrine in what is now Pakistan found brickwork thousands of years older underneath it, and uncovered a civilization no one had known existed.",
      "Its writing has never been read, and it left behind no palace, no royal tomb, and no image of a ruler. Figures like this one are most of what remains."
    ],
    era: '2500 BCE',
    dist: 4.3, height: 1.35, clay: true, faceY: -Math.PI / 2,
    // the press-in lands on the figurine's flank, not the arm crease (which
    // read as a black V across the frame), and the clay gets its own tooth
    grain: { scale: 0.5, repeat: 24, octave: 4 },
    closeup: { x: 0, y: 1.18, z: 0.33, lookY: 1.16 }
  },
  {
    file: 'assets/terracotta/greek-krater.glb',
    label: 'Athens · c. 750 BCE',
    beats: [
      "A pot nearly as tall as a person, standing over a grave to mark it, left open at the base so that wine poured in at the top would soak down to the body underneath. Athenians were burying their dead this way around 750 BCE.",
      "Wet clay takes a mark and fire makes it permanent, which is why clay carries the earliest surviving version of almost everything. The bands of pattern here were a habit worked out over generations, but the panel at the centre is new: a body laid out on a bier, with mourners standing over it, hands in their hair.",
      "These are the first people drawn in Greek art in roughly four hundred years."
    ],
    era: '750 BCE',
    dist: 4.6, height: 1.35, strip: 'krater_Krater_baseFromRhino'
  },
  {
    file: 'assets/terracotta/qin-soldier.glb',
    label: 'Lintong · buried 210 BCE, found 1974',
    beats: [
      "A soldier, life-size, one of an army that was standing in formation underground. Clay is cheap and fast, which is the only reason an army on this scale was ever possible.",
      "In March 1974, during a drought, farmers outside Lintong were digging a well when they struck fired clay, and then more of it: a head, a torso, a hand. They had hit the edge of a pit holding more than eight thousand soldiers.",
      "Look at eight of the faces and you see eight men; look at eight hundred and you start seeing the molds. All of them were painted, and the pigment lifts within minutes of hitting open air, which is why most of the pits are still sealed and why the figures you can see today are the ones that already lost their colour."
    ],
    era: '210 BCE',
    dist: 6.5, height: 1.7, army: true
  },
  {
    file: 'assets/terracotta/juni-pieta.glb',
    label: 'Europe · from the 1460s',
    beats: [
      "A dead Christ and the figures around him, modelled in clay at close to life size and then painted. The paint is not decoration here; it is the finish the thing was made for, and the same cheapness that let an emperor field an army let a household keep a single figure close enough to touch.",
      "Sculptors in Bologna were working this way by the 1460s, when one of them made a group of six figures caught mid-scream over a dead Christ, close to life size.",
      "The method traveled into Spain, where the finishing mattered more than the carving and was contracted separately: gold leaf laid down, painted over, then scraped back so that it reads as embroidery. The painting frequently cost more than the sculpture underneath it."
    ],
    era: '1460s',
    dist: 3.0, height: 1.2, sway: true, yShift: 0.5
  },
  {
    file: 'assets/terracotta/terracotta_vase.glb',
    label: 'Today',
    beats: [
      "A flowerpot, sold today for a few dollars, left unglazed so that water can move through the wall and the roots can breathe, which is the same reason Romans grew plants in clay.",
      "There is a hill behind the Aventine in Rome, roughly a hundred feet high, made of nothing but broken pots, something like fifty million of them, shipped in full of olive oil and smashed at the docks once they were emptied.",
      "The Romans built a landfill because fired clay cannot be melted down, resold, or made into anything else. That uselessness is also why more terracotta survives from the ancient world than any other material."
    ],
    era: 'Today',
    dist: 3.9, height: 0.9, flat: true, matte: true, yShift: 0.35
  }
  ]},

  // Whiteness as subtraction: the classical marble we revere is what's left
  // after pigment loss, burial, weathering and cleaning — and the finale is the
  // cleaning, done deliberately, to make the stone whiter.
  marble: {
    cache: [],
    // The tungsten case that flatters clay and bronze turns white stone to
    // sandstone. Marble gets a cooler, brighter, more evenly filled room —
    // still a museum at night, just one with daylight-balanced lamps.
    mood: {
      key: 0xfff0e2, keyI: 110, amb: 0x2b2e36, ambI: 0.9, fillI: 0.45,
      // Marble's room is already brighter, so it needs LESS counter-key than
      // clay or bronze, not more: at the bronze thread's 78 the Giambologna
      // clipped to flat white across a third of its surface.
      rim: 0xdfe8f2, rimI: 52, back: 0xf2e6da, backI: 22, bg: 0x0b0c0e
    },
    nodes: [
  {
    file: 'assets/marble/torso_of_folded-arm_figurine.glb',
    label: 'Cyclades · c. 2500 BCE',
    beats: [
      "A torso, arms folded flat across the body, carved out of island marble and broken at both ends. Marble holds paint well but only temporarily, and that gap accounts for most of its history.",
      "Islanders in the Cyclades carved hundreds of these figures and laid them in graves; the ones that survive whole have feet that point downward and will not carry their weight, so they were never meant to stand upright.",
      "Much later, sculptors including Brancusi built a modern idea of beauty out of what they took to be pure form, and while the misreading was honest, the taste it created made a market. The looting that followed pulled most of these figures out of the ground with no record of where they were found."
    ],
    era: '2500 BCE',
    // 512² colour map — the smallest in the project — so the press-in has to
    // get its detail from grain, and a cool tint keeps the warm key from
    // rendering the stone as sandstone
    dist: 4.6, height: 1.1, lookY: 1.12, stone: true, polish: 0.72,
    grain: { scale: 0.3, repeat: 22, octave: 5, rough: true },
    tint: 0xdfe4ec,
    closeup: { x: 0.05, y: 1.30, z: 0.60, lookY: 1.30 }
  },
  {
    file: 'assets/marble/wounded_amazon.glb',
    label: 'Écija · found 2002',
    beats: [
      "An Amazon, wounded under the raised arm, with red still sitting on the stone where the paint was. Whether any of it survives depends almost entirely on where a statue spends the intervening centuries.",
      "In 2002 a crew digging a car park under a town square in southern Spain found her in a Roman swimming pool, broken into three pieces.",
      "Three other copies of the same figure survive, in New York, Berlin and Copenhagen, and all four were painted, but hers is the only one that kept its colour. She went into standing water and out of the weather, which is the whole of the difference."
    ],
    era: '130 CE',
    dist: 5.9, height: 1.45, lookY: 1.52, stone: true, polish: 0.68
  },
  {
    file: 'assets/marble/2025.18_fata_morgana.glb',
    label: 'Florence · 1500s',
    beats: [
      "A figure carved for a fountain grotto, to stand with water running over it, which would have stripped a painted surface in any case. The bare stone was the point.",
      "The statues coming out of Roman soil in the 1500s had spent a thousand years underground losing every trace of the paint they were finished with, and the sculptors who studied them saw bare white stone and took the bareness for intention.",
      "What this one's sculptor inherited was an accident of chemistry already several centuries into being taught as a rule."
    ],
    era: '1500s',
    dist: 4.8, height: 1.2, lookY: 1.25, stone: true, polish: 0.62,
    strip: 'Base_Mats'   // flat zero-height scanner cap at y=0, coplanar with the shadow floor
  },
  {
    file: 'assets/marble/1968.212_terpsichore_lyran.glb',
    label: 'Rome · 1816',
    beats: [
      "A muse with her lyre, and a surface Canova polished to a finish and then rubbed a warm tinted wax into, so that it would stop reading as rock. Nobody who actually worked the stone believed it should look like stone.",
      "Later cleanings took most of that wax off, here and on nearly every other Canova, so what is on screen is closer to what the conservators left than to what he sent out of the studio.",
      "In 1815 he was asked whether he would repair the Parthenon sculptures then in London, and he refused, on the grounds that no hand should touch them. Parliament bought them the following year."
    ],
    era: '1816',
    dist: 6.0, height: 1.5, lookY: 1.58, stone: true, polish: 0.5
  },
  {
    file: 'assets/marble/george_washington_greenough_statue_1840.glb',
    label: 'Washington · 1832 to 1841',
    beats: [
      "George Washington, bare to the waist and seated like a god, twelve tons of Italian marble. By the 1830s the whiteness had crossed an ocean.",
      "Congress ordered it in 1832, and Greenough carved it in Italy, modelling it on a lost Greek statue of Zeus that no living person had seen and that survived only in written descriptions.",
      "His left hand holds out a sword hilt first, the gesture of a general handing back command, though almost nobody read it that way, because they were looking at the bare chest."
    ],
    era: '1841',
    dist: 7.0, height: 1.75, lookY: 1.82, stone: true, polish: 0.72
  },
  {
    file: 'assets/marble/parthenon_block_xxxvi_south_frieze.glb',
    label: 'London · 1937',
    beats: [
      "A block of the Parthenon frieze, its carved surface taken down by hand with copper tools. What had begun as an accident was eventually enforced with a tool.",
      "In 1937 workmen at the British Museum cleaned these stones for a new gallery using copper implements and grinding powder, in the belief that the real marble lay beneath the brown surface they were removing, and what came away included the original worked surface.",
      "The museum discovered this the following year and said almost nothing publicly for the next sixty. Canova had stood in front of the same stones in 1815 and refused to lay a hand on them."
    ],
    era: '1937',
    // framed tight on the carved face: the scan includes the Duveen Gallery
    // wall and the museum's own numbered label strip along the bottom, so the
    // relief is pushed past the frame edges to crop both out
    // lookY sits high: it lifts the frame past the museum's numbered label
    // strip along the bottom of the scan, which `strip` can't remove (one material)
    dist: 3.75, height: 2.3, lookY: 1.9,
    sway: true, stone: true, polish: 0.74, flat: true
  }
  ]}
};
