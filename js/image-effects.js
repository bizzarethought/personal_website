(function (app) {
  'use strict';

  /* screenshots glitch like the headings: red and cyan copies jump through a few slices for a
     third of a second. once when the page opens, then on hover (at most every 1.2s). it's plain CSS
     (gl-img), so it works anywhere, even opened from disk. off with reduced motion */
  const SELECTOR = '.shot img.pic, .game-preview > img';
  const COOLDOWN = 1200;

  function mount(host) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
    const disposers = [];
    for (const img of host.querySelectorAll(SELECTOR)) {
      const wrap = document.createElement('span');
      wrap.className = 'img-glitch';
      img.before(wrap);
      wrap.append(img);
      for (const tint of ['gi-r', 'gi-c']) {
        const copy = document.createElement('img');
        copy.className = `gi ${tint}`;
        copy.src = img.currentSrc || img.src;
        copy.alt = '';
        copy.setAttribute('aria-hidden', 'true');
        copy.decoding = 'async';
        wrap.append(copy);
      }
      let last = 0,
        off = 0;
      const fire = () => {
        const now = performance.now();
        if (now - last < COOLDOWN) return;
        last = now;
        wrap.classList.remove('on');
        void wrap.offsetWidth;
        wrap.classList.add('on');
        clearTimeout(off);
        off = setTimeout(() => wrap.classList.remove('on'), 360);
      };
      const opening = setTimeout(fire, 450);
      const zone = wrap.closest('.proj') || wrap;
      zone.addEventListener('pointerenter', fire);
      disposers.push(() => {
        clearTimeout(opening);
        clearTimeout(off);
        zone.removeEventListener('pointerenter', fire);
        wrap.before(img);
        wrap.remove();
      });
    }
    return () => disposers.forEach((d) => d());
  }

  app.imageEffects = { mount };
})((window.Garang = window.Garang || {}));
