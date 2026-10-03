# jahidhemel.github.io

Portfolio of **Md. Jahidul Islam Hemel** — Technical Support · Customer Success · Team Lead.
Live at [jahidhemel.github.io](https://jahidhemel.github.io/).

## Stack

- [Vite](https://vitejs.dev/) + TypeScript, Tailwind CSS v4 (reset + tokens), hand-written CSS
- [GSAP](https://gsap.com/) + ScrollTrigger for scroll-driven motion, [Lenis](https://lenis.darkroom.engineering/) for smooth scroll
- "Ping", the guide character, is an original SVG rig animated with GSAP (`src/guide.ts`)
- Code-running background is a `<canvas>` (`src/codebg.ts`)
- Deployed by GitHub Actions to GitHub Pages on every push to `main`

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/ locally
```

## Layout

```
index.html          the page (all content lives here)
src/styles.css      design tokens + all styling
src/main.ts         nav, typewriter, reveals, counters, journey + dashboard graphics
src/guide.ts        Ping — the interactive guide character
src/codebg.ts       the typing-code canvas background
public/             CV PDF, photos, favicon (copied to the site root as-is)
legacy/index.html   the previous single-file site, kept for reference
```

Honesty rules the site follows: only real figures (3+ years, 20–40 conversations a day), real recommendations,
and tools described as rule-based / built with AI rather than running a model.
