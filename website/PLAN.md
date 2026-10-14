# Delta-T website plan

## v4 (Oct 14): plain below the rig

Akshay: the 3D rig opening is the goal, but the sections under it felt AI-built because of how they were structured (label column + headline + intro + component grid, repeated). Below the rig the page now turns dark and plain, in the footer's voice: one big statement per block, then footer-style text columns. The calculator is a single sentence with live numbers you edit in place, progress is a timeline from Sep 28 to Jan 10 with a today marker and Done/Next lists, and the FAQ is plain two-column text. Team moved into the footer. Mono uppercase labels are gone; all UI text is Archivo in sentence case. Deploys to Cloudflare as a static-assets Worker (website/wrangler.jsonc) on changeintemperature.tech.

## v3 (Oct 14): engineering document, not a SaaS page

Akshay's feedback on v2: the type and overall feel still read as AI-made. References: everpuredata.com and Trawelt's case studies on Land-book.

- **Type.** Geist is the default font of AI-generated sites, so it is gone. Display is Archivo at a wide width (wdth 116) and medium weight, not bold. Body is Archivo at normal width. Labels, data and buttons are IBM Plex Mono in small caps-style uppercase.
- **Surface.** Warm paper (#EEEDE9), black ink, 1px rules, square corners everywhere. No pills, rounded cards, soft shadows, gradients or glass panels.
- **Structure.** Case-study layout: a 12-column grid with a section label in the left three columns (02 / Calculator, 03 / Specs …) and content on the right. Results shown as a stat row of big figures with captions, then the dated log.
- **Rig.** The 3D rig and scroll chapters stay. The readout is a full-width instrument strip along the bottom of the stage. Part callouts are square markers with leader lines and boxed mono labels.
- **Footer.** Dark, with one big statement line, the mark, and link columns.

## v2 (Oct 14): why v1 felt AI-made, and what changes

Akshay's verdict on v1: it looks AI-generated and doesn't feel like a real, usable site. What caused that:

1. **One headline formula everywhere.** Every section was "Plain words. *Blue italic words.*" That repetition is the strongest AI tell.
2. **Numbered mono eyebrows on every section** ("01 · The constraint"). Decoration pretending to be structure.
3. **The stock dark-SaaS hero.** Faded grid, glowing card, black page. Thousands of generated sites open this way.
4. **No product.** Cubo leads with its product. v1 had text, cards and a chart, but you never saw the rig.
5. **The same fade-up on every block.** Motion that says nothing.

What v2 does instead:

- **The rig is the hero.** A real-time 3D model of the rack (Three.js): fan wall, two liquid-cooled nodes with cold plates, pump, reservoir, radiator, Peltier stage, the controller board, and air you can see heating up as it passes through. Fans spin at the controller's fan speed and coolant flows at its pump speed, driven by the real server trace.
- **One scroll story, not ten sections.** The camera moves around the rig through four chapters: the rack, the fans, the liquid loop (beads of condensation appear when coolant falls below the dew point), and the controller choosing the split. Labels point at real parts.
- **Light, clean, product-page look.** White and pale grey, black type, the logo's blue as the only accent. One sans family (Geist) at tight display tracking, Geist Mono for numbers. No serif italics in the copy; the logo keeps its own character.
- **Usable sections.** A dew point calculator laid out like a tool, a tech-specs table like a product page, a dated build log with status, team, FAQ, and a footer with real navigation.
- **Motion with a job.** The camera moves only to show the part being described. Everything else stays still.

The v1 plan below is kept for reference. Its stack decisions still hold, plus Three.js.

---

# v1 plan (Oct 14, superseded above)

## 1. What the site has to do

One page that makes a judge, a mentor or a data center operator understand Delta-T in under a minute, then rewards anyone who keeps scrolling with the physics.

- **Reader:** Conrad Challenge judges first, then operators of older air-cooled halls, then other students.
- **One job:** show that the air/liquid split is a moving target set by humidity, and that we are building a rig to prove a controller can follow it.
- **Rules from the project:** the rig's measured result is the headline. No savings percentage until it is measured. Simulations explain, they do not replace.

## 2. References and what we take from each

| Reference | What we borrow | What we skip |
|---|---|---|
| cubocruise.com (Framer) | Section rhythm: hero, proof, product spotlight, team, FAQ, closing call to action. Large type, generous spacing, one idea per screen. | Stock imagery, carousel of logos we do not have. |
| Vox | Our logo's italic, high-contrast serif. Used for display type only. | The yellow. Our colors are black and blue. |
| Engineering datasheets (Noctua, Analog Devices) | Mono labels with real units, spec tables, hairline rules. | Dense walls of tables. |
| Flighty, Linear, Teenage Engineering | Live data as decoration that also explains. Motion only where it teaches something. | Gradient blobs, glassmorphism, emoji icons. |

I could not open the reference sites in a browser from here, so these notes come from their markup and published write-ups, not from screenshots.

## 3. Style

- **Concept:** an instrument panel inside an editorial magazine. Big italic serif headlines, quiet sans body, mono readouts.
- **Color (4 tokens):**
  - `--ink #0A0C10` and `--paper #F1F2F4`
  - `--blue #1A5CFF` (the t in the logo; on dark `#4D82FF`)
  - `--heat #FF5A1F` only inside charts, for hot values. Never as a UI accent.
  - Neutrals are tinted toward the blue, not pure grey.
- **Type:**
  - Display: Instrument Serif, italic. Huge, tight leading, used maybe ten times on the page.
  - Body and UI: Geist.
  - Data, labels, units: Geist Mono, tabular figures.
- **Layout:** 12-column grid, 1360 px max, hairline rules between sections, left-aligned text (nothing centered except the closing line). Alternating dark and light bands: hero dark, explainer light, rig dark, the rest light, footer dark.
- **Motion:** one orchestrated load moment (logo, then headline lines rise in). After that, short reveals on scroll and live readouts. Everything respects `prefers-reduced-motion`.

## 4. Layout, section by section

1. **Nav.** Logo mark at left, five anchor links, "Follow the build" button. Becomes a slim bar after scrolling.
2. **Hero.** Headline: "Cool the rack *by the dew point.*" A live instrument panel replays our real 45-minute server trace (server2, 1 s) through a small model: chip temperature, coolant temperature, dew point, and the air/liquid split, updating every frame. Labeled as a simulated preview.
3. **The problem.** "Liquid is cheaper per watt. Condensation is not." Interactive dew point explorer: room temperature and humidity sliders compute the dew point (Magnus formula) and show the lowest safe coolant temperature and what that does to the split.
4. **The fan cube law.** One slider: fan speed down 20%, power down about 49%. Explains why the split is worth optimizing.
5. **How it works.** Four layers, numbered because they run in order: log at 1 Hz, fit a thermal model, predict load 30 to 120 s ahead, pick the cheapest safe split.
6. **The rig.** Dark band. Spec sheet of the real hardware: Peltier chiller stage, PWM DDC pump, SHT31 humidity, CNC aluminum heater blocks, ESP32-S3 plus Pi 5, hardware leak cutoff.
7. **Proof so far.** Real numbers from the repo: the one-hour hardware run (3,601 rows, 0 gaps), 246,934,820 Alibaba trace rows scanned, the 2,700 s standard trace. A clear "Result: measuring now" slot where the savings figure will go.
8. **Timeline.** Rig build Sep 28 to Nov 22, CFD Nov 23 to Jan 10, surrogate model and Conrad Innovation stage around Jan 10.
9. **Team.** Four cards by role. Names to fill in.
10. **FAQ.** Five questions judges actually ask.
11. **Footer.** Big closing line, contact, links.

## 5. Components

`SiteNav`, `HeroPanel` (live sim + readouts), `SplitBar`, `Sparkline`, `DewPointExplorer`, `FanLawDial`, `LayerSteps`, `SpecSheet`, `ProofStats`, `Timeline`, `TeamCard`, `FaqItem` (native `<details>`), `Footer`, `LogoMark` (inline SVG from `brand/`).

## 6. Tech stack

- **Vite 8 + TypeScript**, no framework. The page is static; a framework would add weight without adding anything.
- **GSAP 3 + ScrollTrigger** for the load sequence and reveals. **Lenis** for smooth scrolling.
- **Fonts self-hosted** through Fontsource (Instrument Serif, Geist, Geist Mono). No requests to Google at runtime.
- **Data:** `src/data/trace.json`, built from `data/workload_trace_standard.csv` by `scripts/build-trace.mjs`, so the hero always uses the repo's real trace.
- **Hosting:** any static host. `npm run build` outputs `website/dist`. A GitHub Actions workflow builds it on every push so a broken build shows up in the PR.

## 7. Open items

- Team member names and photos.
- Contact email for the footer.
- Hosting choice. The repo is private, so GitHub Pages needs a paid plan; Vercel or Netlify work free from a private repo.
