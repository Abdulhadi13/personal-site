# Abdulhadi Fatani — Personal website

A minimal bilingual personal website built with Astro, Tailwind CSS, and strict TypeScript. Home, Projects, Blogs, and About currently display only **Under construction** / **قيد الإنشاء**.

## Run locally

Use Node.js 22.23.4 or newer (Node.js 24 recommended) and npm 9.6.5 or newer.

```sh
npm ci
npm run dev
```

Open the local URL printed by Astro, normally `http://localhost:4321`.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run check` | Check Astro files and TypeScript |
| `npm run build` | Run checks, then generate the static site in `dist/` |
| `npm run preview` | Preview the production build locally |

## Pages and languages

| Section | English | Arabic |
| --- | --- | --- |
| Home / الرئيسية | `/` | `/ar/` |
| Projects / المشاريع | `/projects/` | `/ar/projects/` |
| Blogs / المدونة | `/blogs/` | `/ar/blogs/` |
| About / نبذة عني | `/about/` | `/ar/about/` |

All eight pages are generated as static HTML. Translations and route definitions live in `src/i18n.ts`; `src/pages/[...path].astro` generates the routes using a shared layout and construction component.

The language switch opens the same section in the other language. Explicit choices are saved under `af-language` in local storage. First visits to `/` start in English; returning visits with a saved Arabic choice go to `/ar/`. Other direct page URLs retain their language. Switching back to English saves that selection before following the link.

Light/dark mode follows the operating system until manually changed. Manual choices are saved under `af-theme` and applied before rendering. With browser storage blocked, controls still work for the current page. Without JavaScript, page content, navigation, and language links remain usable; the light theme is used and the theme toggle is hidden.

## Styling and future changes

The original `styling_guide/kit/` remains unchanged. Its CSS tokens, component styles, and licensed local IBM Plex fonts are imported into `src/styles/global.css`. Tailwind supplies layout utilities; its Preflight reset is omitted to preserve the kit’s base styles.

See `PRODUCT.md` for the agreed behavior and `DESIGN.md` for the implemented visual system. When replacing placeholders, retain the shared layout and localized route structure.

This setup is local only. No hosting service or deployment is configured.
