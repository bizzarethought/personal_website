(function (app) {
  'use strict';

  const { reduce } = app.runtime;

  function gust(perch) {
    if (reduce) return;
    perch.classList.remove('gust');
    void perch.offsetWidth;
    perch.classList.add('gust');
    clearTimeout(perch._g);
    perch._g = setTimeout(() => perch.classList.remove('gust'), 950);
  }

  /* glitch a heading for a moment */
  function glitch(el) {
    if (reduce || !el) return;
    app.textEffects?.decode(el);
    el.classList.remove('on');
    void el.offsetWidth;
    el.classList.add('on');
    setTimeout(() => el.classList.remove('on'), 340);
  }

  app.effects = { gust, glitch };
})((window.Garang = window.Garang || {}));
