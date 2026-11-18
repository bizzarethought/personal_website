# Garang's portfolio

A periodic table of me: each section is an element tile that grows into its page, above a 3D meadow with robots you can throw. Plain HTML, CSS and JavaScript, no build step.

## Preview

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`, or just open `index.html` from disk. Fonts (Fontshare) and Three.js come from CDNs, so you need to be online.

## Editing

- **Words, projects, roles, contact details:** `js/content.js`
- **Colours, fonts, layout:** variables at the top of `css/styles.css`
- **Project code snippets:** `js/code-excerpts.js`. The "Inside this site" snippets copy real code from `js/meadow.js` and `js/toss.js`, so update them (and their line numbers) if you change that code.

Each script is a plain `defer` script that adds to `window.Garang`, so the order in `index.html` matters. `main.js` starts everything.

| File | What it does |
| --- | --- |
| `navigation.js` | inner pages, opening and closing tiles |
| `meadow.js` | 3D meadow, wind, dandelion seeds, cloud shadows |
| `robots.js`, `home-robots.js` | sprite robots and the 3D robot |
| `toss.js` | throwable robots (Matter.js) |
| `motion.js` | entrance animation and scroll reveals (GSAP) |
| `terminal.js` | the portfolio terminal (press `` ` ``) |
| `image-effects.js`, `text-effects.js`, `effects.js` | glitches and heading decode |

## Deploy

Upload the whole folder to any static host (Cloudflare Pages, Netlify, GitHub Pages) with no build command.

- After changing JS or CSS, bump the `?v=` number in `index.html` and `VERSION` in `js/assets.js`, or browsers keep the old cached files.
- Once it's live, set `og:image` in `index.html` to the full URL and add `og:url`, so link previews show the picture.
- Analytics: optional GoatCounter snippet at the bottom of `index.html`, commented out.

## Built with

Three.js r128, GSAP 3.13 (SplitText, ScrollTrigger, ScrambleText), Matter.js 0.20, xterm.js 6.0, highlight.js 11.12, Phosphor icons, Open Props, Utopia, and Clash Display and Chillax from Fontshare. Everything except Three.js and the fonts is in `js/vendor/` and `css/vendor/`, with licences.
