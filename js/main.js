(function (app) {
  'use strict';

  const {
    SITE,
    createMeadow,
    createNavigation,
    initHomeRobots,
    stars,
    sky,
    icon,
  } = app;
  const { $, cap, reduce, loadLocalTextures } = app.runtime;
  const { BOTS } = app.robots;

  async function start() {
    $('#intro').innerHTML = SITE.intro;
    $('#nav').innerHTML =
      SITE.tiles
        .map(
          (t) =>
            `<a href="#${t.id}">${icon({ experience: 'briefcase-business', projects: 'folders', about: 'user-round', contact: 'mail' }[t.id])}<span>${cap(t.name)}</span></a>`,
        )
        .join('') +
      SITE.links
        .filter((l) => l.href)
        .map(
          (l) =>
            `<a class="ext" href="${l.href}" target="_blank" rel="noopener">${icon(l.label === 'GitHub' ? 'code-xml' : 'external-link')}<span>${l.label}</span></a>`,
        )
        .join('');
    $('#board').innerHTML = SITE.tiles
      .map(
        (
          t,
          i,
        ) => `<div class="cell" style="--i:${i};--c:${t.color};--t:${t.t}"><div class="perch"></div><div class="moss" aria-hidden="true" style="background-image:url(img/moss-${i % 5}.webp?v=26)"></div><button class="tile" data-id="${t.id}">
  <span class="n" aria-hidden="true">${t.n}</span><span class="sym" aria-hidden="true">${t.sym}</span><span class="nm">${t.name}</span></button></div>`,
      )
      .join('');
    app.motion?.intro();

    await loadLocalTextures();
    const field = createMeadow();
    const navigation = createNavigation(field);
    initHomeRobots(() => navigation.isOpen);
    const toss = app.createToss?.(() => navigation.coversHome);
    app.toss = toss;
    stars(document.querySelector('.home'), 0.55, 15000);
    sky(document.querySelector('.home'));
    if (field) field.attach($('#meadow'));
    let last = performance.now();
    function loop(now) {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (
        !document.hidden &&
        !document.documentElement.hasAttribute('data-game-open')
      ) {
        /* the page covers home until its closing transition removes .open */
        const visibleBots = navigation.coversHome ? navigation.bots : BOTS;
        for (const b of visibleBots) b.tick(reduce ? 0 : dt);
        if (toss && !navigation.coversHome) toss.step(dt);
        if (field) field.draw(now / 1000);
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    navigation.start();
  }

  start().catch((error) => {
    console.error('Site initialization failed:', error);
    document.documentElement.classList.add('loaded');
  });
})((window.Garang = window.Garang || {}));
