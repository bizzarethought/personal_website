(function (app) {
  'use strict';

  const { rand } = app.runtime;

  /* scatter the stars, each with its own size and phase; the CSS animates them */
  function stars(host, frac = 1, per = 30000) {
    if (!host) return;
    host.querySelector(':scope > .stars')?.remove();
    const w = host.offsetWidth,
      hh = host.scrollHeight * frac,
      n = Math.min(260, Math.max(20, Math.round((w * hh) / per))),
      el = document.createElement('div');
    el.className = 'stars';
    el.setAttribute('aria-hidden', 'true');
    let s = '';
    for (let i = 0; i < n; i++) {
      const glint = Math.random() < 0.18,
        size = [1.5, 2, 2, 2.5, 3, 3][Math.floor(Math.random() * 6)],
        hi = rand(0.85, 1);
      s += `<i class="${glint ? 'glint' : ''}" style="left:${rand(0, 100).toFixed(2)}%;top:${rand(0, hh).toFixed(0)}px;--s:${size}px;--hi:${hi.toFixed(2)};--lo:${rand(0.05, 0.18).toFixed(2)};--d:${rand(2.4, 5.2).toFixed(2)}s;--dl:${(-rand(0, 5)).toFixed(2)}s"></i>`;
    }
    el.innerHTML = s;
    host.prepend(el);
  }

  app.stars = stars;
})((window.Garang = window.Garang || {}));
