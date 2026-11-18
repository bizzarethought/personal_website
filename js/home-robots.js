(function (app) {
  'use strict';

  const { SITE } = app;
  const { $, LOAD, reduce, rand } = app.runtime;
  const { Bot, BOTS, make3D, untrack } = app.robots;
  const { gust, glitch } = app.effects;

  function initHomeRobots(isPageOpen) {
    /* robots on the slab and on each tile */
    const hello = $('#hello'),
      slabPerch = document.createElement('div');
    slabPerch.className = 'perch';
    hello.appendChild(slabPerch);
    let me,
      tileBots = [],
      me3d = null;
    function build() {
      [me, ...tileBots].forEach(untrack);
      document.querySelectorAll('.home .perch').forEach((p) => {
        [...p.children].forEach((c) => {
          if (!c.classList.contains('me3d')) c.remove();
        });
      });
      const sw = hello.offsetWidth;
      if (me3d) {
        me = me3d;
        me.x = Math.min(me.x, sw - 30);
        me.target = Math.min(me.target, sw - 30);
        BOTS.push(me);
      } else {
        me = new Bot(SITE.me, slabPerch, 62, sw * 0.78);
        me.el.setAttribute('role', 'button');
        me.el.setAttribute('aria-label', "Garang's robot. Click to say hi.");
        me.el.tabIndex = 0;
        me.el.style.pointerEvents = 'auto';
        me.el.style.cursor = 'pointer';
        me.el.addEventListener('click', () => me.hop());
      }
      tileBots = [...document.querySelectorAll('.cell')].map((c, i) => {
        const p = c.querySelector('.perch'),
          w = c.offsetWidth;
        const bx = w * (i % 2 ? 0.6 : 0.42);
        const b = new Bot(SITE.tiles[i].bot, p, Math.max(40, Math.min(56, w * 0.42)), bx);
        if (!reduce) {
          b.el.style.opacity = 0;
          setTimeout(
            () => {
              b.el.style.opacity = '';
              b.hop();
            },
            420 + i * 90
          );
        }
        return b;
      });
    }
    build();
    document.querySelectorAll('.cell').forEach((cell, i) => {
      const tile = cell.querySelector('.tile');
      const acknowledge = () => {
        tileBots[i]?.hop();
        tileBots[i]?.frame(15);
        gust(cell.querySelector('.perch'));
        if (me?.is3d) me.watch(cell, 1200, 'happy');
      };
      tile.addEventListener('pointerenter', (event) => {
        if (event.pointerType === 'mouse') acknowledge();
      });
      tile.addEventListener('focus', () => {
        if (app.runtime.input.kbd) acknowledge();
      });
      tile.addEventListener('pointerdown', () => {
        acknowledge();
        cell.classList.add('pressed');
      });
      const release = () => cell.classList.remove('pressed');
      tile.addEventListener('pointerup', release);
      tile.addEventListener('pointercancel', release);
      tile.addEventListener('pointerleave', release);
      tile.addEventListener('blur', release);
    });
    let rt,
      lastW = innerWidth;
    addEventListener('resize', () => {
      if (innerWidth === lastW) return;
      lastW = innerWidth;
      clearTimeout(rt);
      rt = setTimeout(build, 200);
    });
    /* swap in the 3D robot once it has loaded */
    make3D(slabPerch, hello.offsetWidth * 0.78, (m) => {
      LOAD.done('robot');
      untrack(me);
      if (me && me.el) me.el.remove();
      me3d = me = m;
      BOTS.push(m);
    });
    setTimeout(() => glitch(hello), 650);

    /* the sprite robot turns toward the cursor (the 3D one follows it smoothly on its own) */
    addEventListener('pointermove', (e) => {
      if (!me || me.is3d || e.pointerType !== 'mouse' || me.mode === 'walk' || me.mode === 'happy')
        return;
      const r = me.el.getBoundingClientRect(),
        dx = e.clientX - (r.left + r.width / 2);
      if (Math.abs(dx) < 80) {
        if (me.mode === 'look') me.set('idle', 0);
      } else me.set('look', 1500, dx < 0 ? -1 : 1);
    });
    function wander() {
      if (!reduce && me && me.mode === 'idle' && !isPageOpen())
        me.walkTo(rand(40, hello.offsetWidth - 40));
      setTimeout(wander, rand(7000, 11000));
    }
    setTimeout(wander, 4000);

    /* now and then one robot glitches and the others turn to stare at it */
    function intrusion() {
      if (!reduce && !isPageOpen() && !document.hidden && tileBots.length) {
        const odd = tileBots[Math.floor(Math.random() * tileBots.length)];
        odd.set('sus', 1800);
        odd.el.classList.add('sus');
        glitch(hello);
        /* the others turn one after another, nearest first, instead of all at once */
        const ox = odd.el.getBoundingClientRect().left;
        [me, ...tileBots]
          .filter((b) => b && b !== odd && b.mode !== 'walk')
          .sort(
            (p, q) =>
              Math.abs(p.el.getBoundingClientRect().left - ox) -
              Math.abs(q.el.getBoundingClientRect().left - ox)
          )
          .forEach((b, i) =>
            setTimeout(() => b.watch(odd.el, 1900 - i * 120, 'sus'), 250 + i * 140)
          );
      }
      setTimeout(intrusion, rand(14000, 20000));
    }
    setTimeout(intrusion, 6000);

    addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && document.activeElement === me?.el) {
        e.preventDefault();
        me.hop();
      }
    });
  }

  app.initHomeRobots = initHomeRobots;
})((window.Garang = window.Garang || {}));
