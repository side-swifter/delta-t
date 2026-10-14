# Delta-T website plan

Written before any code. This is the brief the site is built from.

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
