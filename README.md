# Garang's portfolio

A static site built with HTML, CSS, plain JavaScript, and Three.js. No build step or package installation is required.

## Preview

Open `index.html` directly, or serve this directory:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`. Fontshare fonts and Three.js load from external CDNs, so those features require an internet connection. If Three.js is unavailable, the site uses the meadow image and sprite robots.

## Where to edit

| File                  | Responsibility                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------- |
| `index.html`          | Document metadata, loading screen, home/page containers, stylesheet and script references |
| `css/styles.css`      | Responsive layouts, themes, stars, and CSS animations                                     |
| `js/icons.js`         | Local SVG subset from Phosphor; decorative icons with text labels                         |
| `js/content.js`       | Bio, projects, experience, contact details, and tile configuration                        |
| `js/runtime.js`       | Shared utilities, input state, loading progress, and asset loading                        |
| `js/robots.js`        | Sprite robots, the 3D robot, and robot tracking                                           |
| `js/home-robots.js`   | Home robot placement, hover behavior, wandering, and keyboard interaction                 |
| `js/toss.js`           | Throwable tile robots: Matter.js physics, knock-ons, and the return jump                    |
| `js/assets.js`        | Shared on-demand script and stylesheet loading with retry support                        |
| `js/terminal.js`      | Portfolio terminal, keyboard shortcut, command history and actions                       |
| `js/text-effects.js`  | GSAP heading decoding and cleanup                                                       |
| `js/image-effects.js` | Screenshot glitch: red and cyan slices, like the heading glitch                           |
| `js/code-excerpts.js` | Labeled project examples, actual site excerpts, and lazy syntax highlighting              |
| `js/meadow.js`        | The 3D meadow, grass shaders, terrain picking, and meadow robots                          |
| `js/sky.js`           | Slow clouds and occasional shooting stars                                                 |
| `js/robot-guide.js`   | The tile-to-header robot transition                                                       |
| `js/project-demos.js` | Compact, click-to-load Intrusion game preview                                             |
| `js/stars.js`         | Star placement and randomized twinkle settings                                            |
| `js/effects.js`       | Small hover and heading effects                                                           |
| `js/motion.js`         | GSAP entrance, tile lean, and button press spring                                         |
| `js/navigation.js`    | Inner-page content, hash navigation, opening/closing transitions, and page robots         |
| `js/main.js`          | App initialization and the shared animation loop                                          |
| `img/`                | Images, sprite sheets, and exported 3D data                                               |

## Script organization

Each JavaScript file has its own scope and exposes a small interface through `window.Garang`. These are scoped classic scripts, rather than ES module imports, so opening `index.html` using `file://` still works. All scripts use `defer`; their order in the HTML is intentional:

1. Three.js, content, and shared runtime.
2. Robot, meadow, effect, star, sky, guide, and project-preview implementations.
3. Navigation and home robot controllers.
4. `main.js`, which initializes everything.

The navigation controller owns page state. The main loop uses its visibility state to pause covered home robots. The meadow keeps one canvas and moves it between the home and inner pages.

CSS image paths are relative to `css/`, so they use `../img/`. JavaScript-created image and data URLs are relative to the document and use `img/`. The local-file texture adapter in `runtime.js` loads `img/tex.js` only for `file://` previews.

## Deploy

Upload `index.html`, `css/`, `js/`, and `img/` together to a static host, preserving the directory structure.


Local scripts and stylesheets carry a version query (`?v=33`) in `index.html`, and `js/assets.js` adds the same version to lazily loaded files. After changing any JS or CSS, bump both (and the `version` meta tag) so browsers don't keep running cached copies.
## Interactive previews

Intrusion opens the deployed game at `https://play-intrusion.us/` in a click-to-load dialog, with a separate full-game link. No game assets load until the visitor requests the preview. Closing it or leaving Projects removes the iframe. Portfolio rendering pauses while the game preview is open.

Add repository URLs to each project's `github` field in `js/content.js`. Empty fields are hidden; entering a URL automatically adds a GitHub button. Projects use descriptions and tags, with a compact game preview for Intrusion.

The hero introduction is unchanged. Section palettes live in `css/styles.css`. Clouds, twinkles, shooting stars, and the robot guide respect reduced motion; covered home sky animations pause while an inner page is open.

## Icons

`js/icons.js` contains only the 11 [Phosphor](https://phosphoricons.com) icons the site uses, from `@phosphor-icons/core@2.1.1`, in duotone and fill styles. Change `STYLE` at the top of the file to switch between them. They are bundled locally, so no icon CDN or runtime package is required. `app.icon(name)` returns an inline SVG that inherits the surrounding text color; the names are the site's own (for example `mail` is Phosphor's `envelope-simple`). Visible text labels remain in place, and decorative SVGs are hidden from assistive technology. The MIT license is in `js/vendor/PHOSPHOR-LICENSE.txt`.

## Typography and fluid spacing

Headings and element symbols use [Clash Display](https://www.fontshare.com/fonts/clash-display), a bold, modern display face. Reading text, navigation, and small labels use the rounded [Chillax](https://www.fontshare.com/fonts/chillax). Both load from Fontshare with `display=swap` and system fallbacks. Separate family requests keep their weights explicit.

The `:root` tokens in `css/styles.css` use [Utopia's fluid scale approach](https://utopia.fyi/): a 360–1240px viewport range, an 18–20px reading size, and type ratios of 1.2–1.25. `--step-0` is body copy; steps 1–5 define heading sizes. `--space-*` tokens coordinate gutters, section spacing, and grid gaps. The rem-based bounds accommodate browser font preferences. The existing mobile grid and short-screen adjustments remain for layout and robot clearance.

Adjust the tokens to tune the whole design; calculator links are beside them. Utopia requires no runtime library or build step.

## Colors and effects (Open Props)

Open Props **1.7.23** is bundled in `css/vendor/open-props.min.css`, loaded before the site stylesheet, with its MIT notice in `css/vendor/OPEN-PROPS-LICENSE.txt`. No package installation or external request is needed for these tokens. The optional Open Props reset and component styles are not loaded.

In `css/styles.css`, `--tile-*` maps the four sections to indigo, coral-red, butter-yellow, and icy cyan. The UI surfaces use Open Props color scales, and `--shadow-2` through `--shadow-5` add depth to tiles, previews, and dialogs. Dark surfaces and light-theme black accents share `--black: #000` to avoid lifted charcoal blacks. The sky uses custom, muted twilight ramps: each section blends from its own surface through blue/violet and rose to a peach horizon. The meadow color probe travels with its canvas so its haze inherits the active section’s palette. Utopia continues to control type and spacing; Clash Display and Chillax are the fonts.

Shooting stars make their first pass about three seconds after loading, then every 14 seconds. Their trail is blue in light mode and luminous white in dark mode, with travel distance sized to the viewport. Reduced motion disables them; covered skies and hidden tabs pause their animation.

## Animation libraries

`js/vendor/` holds [GSAP](https://gsap.com) 3.13.0 with its SplitText and ScrollTrigger plugins, copied from the `gsap` npm package so no CDN is needed and `file://` previews still work. Their license notice is in `js/vendor/GSAP-LICENSE.txt`. `js/motion.js` uses them for the home entrance: "Hi, I'm Garang." fades in word by word from a soft blur, the intro rises as one block, then the tiles drop in with a slight tilt. SplitText is reverted once the timeline finishes, leaving the original markup.

When GSAP is active, `motion.js` adds `.gsap` to `<html>`, which turns off the CSS `land` tile animation. If GSAP fails to load, the CSS animation runs instead. Under reduced motion, neither runs. Other scripts can use `Garang.motion.gsap` (null when disabled) for new animations.

## Hover and press effects

Effects follow the site's own style: thick black borders, solid offset shadows, short firm motion, and no blur, glow, tilt or elastic wobble. Tiles keep their CSS lift on hover and sink into their shadow when pressed. Buttons and links (nav, chips, Back, project links, Copy, game preview and terminal controls) press down 1px right and 2px down while held. In CSS, icons nudge toward their action on hover: the back arrow moves left, external links move up and right. The entrance animation moves words and tiles straight up into place.
## Scroll reveals and focus

On inner pages, sections visible when the page opens use the CSS `rise` animation. Sections further down get `.scroll-in` and slide in with ScrollTrigger as they scroll into view; `#page` is the scroller. `Garang.motion.reveal(page)` returns a cleanup that navigation calls when the page changes or closes. While a page is open, `.home` is `inert`, so Tab and screen readers stay inside the page; it is cleared before focus returns to the tile.

## Link previews and analytics

`img/og.jpg` (1200×630) is the social preview image, a screenshot of the home page. The Open Graph tags in `index.html` point to it by a relative path. After deploying, change `og:image` to the full URL and add `og:url`, because most preview scrapers ignore relative paths. A GoatCounter snippet is commented out at the end of `index.html`; add your site code and uncomment it to enable cookie-free analytics.

## Throwable robots

`js/toss.js` uses [Matter.js](https://brm.io/matter-js/) 0.20.0 (`js/vendor/matter.min.js`, MIT, license in `js/vendor/MATTER-LICENSE.txt`). Grab any tile robot and it hangs from the grab point on a springy constraint; let go to throw it. Loose robots tumble off the tiles, the heading slab, and the window edges, and land in the meadow. A loose robot that hits a perched robot fast enough knocks it off too, so one throw can set off a chain. On grass contact, a robot immediately springs back onto its perch and rights itself during takeoff. Robots can be caught again in the air.

While a robot is loose, its sprite moves into a fixed `.toss-layer` (above the home page, below inner pages), and `Bot.held` stops `robots.js` from positioning or animating it. Physics only runs while a robot is loose, and pauses while an inner page covers the home page. If the window width changes, loose robots are dropped because `home-robots.js` rebuilds the tile robots. The 3D robot on the slab isn't throwable. Under reduced motion, robots can't be grabbed.

## Portfolio terminal

Press the backtick key (`) or use the persistent **Terminal** button. `js/terminal.js` opens an accessible dialog and lazy-loads locally bundled `@xterm/xterm` **6.0.0** and `@xterm/addon-fit` **0.11.0**, plus `css/vendor/xterm.css`. It is a browser-local portfolio command interface, not a connection to an operating-system shell. It never evaluates visitor input as code. Project summaries and contact information come from `js/content.js`.

Commands: `help`, `ls projects`, `cat projects/intrusion.md` (and the other listed files), `open intrusion` (opens the actual game preview), `open drift` (scrolls to the project), `open about`, `open experience`, `open contact`, `open home`, `contact --copy`, `sudo throw robots`, `clear`, and `exit`. Tab completes commands, Up/Down recalls history, Ctrl+C clears the current input, and Escape closes the terminal. Clipboard failure leaves the email available for selection. Backtick is ignored in inputs, editors, and dialogs. Robot launching respects reduced motion.

## Decoding headings and image ripples

`js/text-effects.js` lazy-loads **GSAP ScrambleText 3.13.0**, matching the existing GSAP core. Inner-page headings decode as the page opens; robot glitches and project heading glitches use the same effect. The original heading reserves its layout and supplies its accessible name while a decorative copy decodes. The home greeting waits until SplitText releases it; the robot perch is never rewritten. Navigation disposes running text effects.

`js/image-effects.js` gives project screenshots (currently Intrusion's preview) the same glitch as the headings: a red and a cyan copy of the image jump through a few clipped slices for a third of a second, once as the page opens and when the project is hovered (at most every 1.2 seconds). It is plain CSS animation (`@keyframes gl-img`), so it works on any GPU and from `file://`. It replaced a curtains.js water ripple that didn't fit the site. Disabled under reduced motion.

## Code excerpts

`js/code-excerpts.js` supplies collapsible, syntax-highlighted panels on Projects. The five project snippets were written to show each project's approach and aren't copied from the project repos (they're shown without a label or note); the original project implementations are not in this folder. The separate **Inside this site** panels reproduce real excerpts from `js/meadow.js` and `js/toss.js`, with source links. Keep those snapshots and their line references in sync when editing the corresponding functions.

**highlight.js 11.12.0** loads only when a code panel opens; its token colours are defined in `css/styles.css` from the site palette, so `css/vendor/highlight-github-dark.min.css` is no longer loaded; the GLSL language module loads only for the wind shader. Plain code remains readable if highlighting fails. `js/assets.js` shares lazy-load requests and allows retries after failures. All new dependencies are bundled locally with license files in `js/vendor/`; no build step is required.

The new optional library scripts total about **640 KB uncompressed / 172 KB gzip** (excluding CSS and the small feature controllers). The terminal is roughly 122 KB gzip; ScrambleText 4 KB; highlighting including GLSL 46 KB. Actual network transfer depends on the static host's compression configuration. These libraries are requested on first use, not all at startup.

## Projects layout

Projects uses a wider column (up to 1120px). Every project is an element card with a two-letter symbol from its title (initials, or the first two letters of a one-word name), its number, a 3px border and a 5px offset shadow, like the home tiles. The first project leads at full width with its game preview; the rest form a two-column grid that becomes one column below 860px. Cards keep their own height, so opening one card's code doesn't stretch its neighbour. Code excerpts are bordered rows that open into a black file bar and code panel with the title slabs' green edge; syntax colours come from the tile palette in `css/styles.css`, not a stock highlight.js theme. The terminal uses the same black slab, green edge and offset shadow.

## Meadow seeds and cloud shadows

`js/meadow.js` releases dandelion seeds from the real dandelion heads in the Blender export (yellow petal vertices grouped into heads). Seeds ride the grass's wind: they drift along its direction, rise in the same gust bands that bend the grass, and flutter. A few leave on their own as gusts pass; a fast swipe of the cursor over the meadow blows a handful off the dandelions under it. Each head holds six seeds and regrows one every three seconds. Seeds are one `THREE.Points` draw call (up to 220, or 90 on phones), each drawn as a small parachute in the fragment shader. Cloud shadows are two layers of drifting noise that dim the sunlight on the grass, flowers and ground. Under reduced motion there are no seeds and the shadows stay still.
