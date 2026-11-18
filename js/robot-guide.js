(function (app) {
  'use strict';

  function robotGuide(tile) {
    const source = tile.closest('.cell')?.querySelector('.bot');
    if (!source || matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
    const r = source.getBoundingClientRect();
    const ghost = source.cloneNode(true);
    ghost.className = 'bot travelling-robot';
    ghost.setAttribute('aria-hidden', 'true');
    ghost.removeAttribute('tabindex');
    Object.assign(ghost.style, {
      left: '0px',
      top: '0px',
      bottom: 'auto',
      visibility: 'visible',
      opacity: '1',
    });
    const face = ghost.querySelector('.face');
    face.style.transform = '';
    face.style.backgroundPosition = `${-15 * r.width}px 0`;
    document.body.appendChild(ghost);
    source.style.visibility = 'hidden';
    const from = `translate(${r.left}px,${r.top}px)`;
    const middle = `translate(${innerWidth / 2 - r.width / 2}px,${Math.max(50, innerHeight * 0.18)}px)`;
    let animation = ghost.animate([{ transform: from }, { transform: middle }], {
      duration: 320,
      easing: 'cubic-bezier(.22,1,.36,1)',
      fill: 'forwards',
    });
    let destination = null;
    return {
      land(el) {
        destination = el;
        const target = el.getBoundingClientRect();
        el.style.visibility = 'hidden';
        animation.cancel();
        animation = ghost.animate(
          [
            { transform: middle },
            {
              transform: `translate(${target.left}px,${target.top}px) scale(${target.width / r.width})`,
            },
          ],
          { duration: 200, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' }
        );
      },
      dispose() {
        animation.cancel();
        ghost.remove();
        source.style.visibility = '';
        if (destination) destination.style.visibility = '';
      },
    };
  }
  app.robotGuide = robotGuide;
})((window.Garang = window.Garang || {}));
