(function (app) {
  'use strict';

  // three slow clouds and the odd meteor, no animation loop or timers
  function sky(host) {
    host.querySelector(':scope > .sky-weather')?.remove();
    const layer = document.createElement('div');
    layer.className = 'sky-weather';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML =
      '<i class="cloud cloud-one"></i><i class="cloud cloud-two"></i><i class="cloud cloud-three"></i><i class="shooting-star"></i>';
    host.prepend(layer);
  }

  document.addEventListener('visibilitychange', () => {
    document.documentElement.toggleAttribute('data-sky-paused', document.hidden);
  });
  app.sky = sky;
})((window.Garang = window.Garang || {}));
