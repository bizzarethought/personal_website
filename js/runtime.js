(function (app) {
  'use strict';

  const asset = (name) =>
    new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = `img/${name}.js?v=26`;
      s.onload = () => (window.__A && window.__A[name] ? res(window.__A[name]) : rej());
      s.onerror = rej;
      document.head.appendChild(s);
    });
  const texURL = (p) => (window.__TEX && window.__TEX[p.split('?')[0]]) || p;

  /* loading: three things to wait for; the screen also lifts after 7 seconds whatever happens */
  const LOAD = {
    need: 3,
    got: 0,
    left: { fonts: 1, robot: 1, meadow: 1 },
    t0: performance.now(),
    done(k) {
      if (k && this.left[k]) {
        this.left[k] = 0;
      }
      this.got++;
      const L = this.left,
        c = document.getElementById('lcap');
      if (c)
        c.textContent = L.meadow
          ? 'Growing the meadow'
          : L.robot
            ? 'Waking the robot'
            : L.fonts
              ? 'Setting the type'
              : 'Ready';
      const s = document.getElementById('lbar');
      if (s) s.style.transform = `scaleX(${0.08 + 0.92 * Math.min(1, this.got / this.need)})`;
      if (this.got >= this.need && !this.fin) {
        this.fin = 1;
        setTimeout(
          () => document.documentElement.classList.add('loaded'),
          Math.max(300, 1300 - (performance.now() - this.t0))
        );
      }
    },
  };
  setTimeout(() => document.documentElement.classList.add('loaded'), 7000);
  /* the page stays hidden under the loading screen until the real fonts are in, otherwise the text
     reflows when they swap in and Google counts it as layout shift. 7s cap in case Fontshare is down */
  const fontsReady = () => document.documentElement.classList.add('fonts-ready');
  setTimeout(fontsReady, 7000);
  try {
    Promise.all(
      ['700 1em "Clash Display"', '400 1em Chillax', '500 1em Chillax', '600 1em Chillax'].map((f) =>
        document.fonts.load(f)
      )
    )
      .then(() => document.fonts.ready)
      .catch(() => {})
      .then(() => {
        fontsReady();
        LOAD.done('fonts');
      });
  } catch (e) {
    fontsReady();
    LOAD.done('fonts');
  }

  const $ = (s) => document.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const todo = (t, on) => (on ? `<span class="todo">${t}</span>` : t);
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

  /* the pointer, shared by the meadow and the 3D robot */
  const ptr = { x: -1e4, y: -1e4, vx: 0, at: 0 };
  /* move focus into an opened page only for keyboard users, so a tap doesn't leave a focus ring on Back */
  const input = { kbd: false };
  addEventListener('keydown', () => (input.kbd = true), true);
  addEventListener('pointerdown', () => (input.kbd = false), true);
  addEventListener(
    'pointermove',
    (e) => {
      if (ptr.at) ptr.vx = ptr.vx * 0.6 + (e.clientX - ptr.x) * 0.4;
      ptr.x = e.clientX;
      ptr.y = e.clientY;
      ptr.at = performance.now();
    },
    { passive: true }
  );

  // opened from disk, WebGL can't read the images, so use the embedded copies; over http use the originals
  function loadLocalTextures() {
    if (location.protocol !== 'file:') return Promise.resolve();
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'img/tex.js?v=26';
      script.onload = resolve;
      script.onerror = () => {
        console.warn('Embedded textures could not load.');
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  app.runtime = {
    asset,
    texURL,
    LOAD,
    $,
    reduce,
    fine,
    todo,
    cap,
    rand,
    clamp,
    ptr,
    input,
    loadLocalTextures,
  };
})((window.Garang = window.Garang || {}));
