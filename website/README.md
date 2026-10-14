# Delta-T website

One-page site for Delta-T. The plan it was built from is in [PLAN.md](PLAN.md).

## Run it

```sh
cd website
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs website/dist
```

Node 20 or newer. `npm run dev` and `npm run build` first regenerate `src/data/trace.json` from `../data/workload_trace_standard.csv`, so the hero panel always replays the repo's real server trace.

## Where things live

| Path | What it is |
|---|---|
| `index.html` | All page content and copy |
| `src/styles/main.css` | Design tokens (top of file) and every style |
| `src/main.ts` | Smooth scroll, motion, hero panel, dew point explorer, fan law chart |
| `src/physics.ts` | Dew point (Magnus), coolant floor, the toy rig model behind the hero panel |
| `src/logo.ts` | The Δt mark as inline SVG |
| `public/brand/` | Logo files |

## Stack

Vite 8, TypeScript, GSAP with ScrollTrigger, Lenis smooth scrolling, Three.js for the 3D rig, self-hosted fonts from Fontsource (Archivo, IBM Plex Mono). No framework.

## Still to fill in

- Teammate names in the Team section (`index.html`, search for `person`).
- A contact email for the footer.
- Hosting. The repo is private, so GitHub Pages needs a paid plan. Vercel or Netlify deploy free from a private repo: set the root directory to `website`, build command `npm run build`, output `dist`.

The hero panel is a simulated preview labeled as such. Replace it with logged rig data once the head-to-head runs are done.

## Team photos

The team page (`team.html`) loads portraits from `public/team/`: `akshayraj.png`, `praneeth.png` and `shantanu.png` (not wired yet, it shows initials). A missing photo falls back to the person's initials. Use roughly 4:5 portrait crops; they display in black and white and turn to color on hover.
