(function (app) {
  'use strict';

  const { icon } = app;
  const gameURL = 'https://play-intrusion.us/';
  function preview(project) {
    if (project.demo === 'intrusion')
      return `<div class="project-preview game-preview" data-demo="intrusion">
      <img src="img/intrusion.webp?v=26" alt="Intrusion's robot-filled meadow" loading="lazy" width="1280" height="720">
      <div class="game-preview-caption"><button type="button" data-action="preview">${icon('play')}<span>Preview game</span></button></div></div>`;
    return '';
  }

  function mount(host) {
    const cleanup = [];
    host.querySelectorAll('[data-demo]').forEach((root) => {
      const controller = new AbortController();
      const on = (el, type, fn) => el.addEventListener(type, fn, { signal: controller.signal });
      const button = (action) => root.querySelector(`[data-action="${action}"]`);
      cleanup.push(() => controller.abort());

      if (root.dataset.demo === 'intrusion') {
        let dialog = null;
        const dismiss = () => {
          if (!dialog) return;
          dialog.querySelector('iframe')?.remove();
          dialog.close();
          dialog.remove();
          dialog = null;
          delete document.documentElement.dataset.gameOpen;
          button('preview').focus({ preventScroll: true });
        };
        on(button('preview'), 'click', () => {
          if (dialog) return;
          dialog = document.createElement('dialog');
          dialog.className = 'game-dialog';
          dialog.setAttribute('aria-labelledby', 'game-preview-title');
          dialog.innerHTML = `<div class="game-dialog-bar"><h2 id="game-preview-title">Intrusion</h2><a href="${gameURL}" target="_blank" rel="noopener"><span>Open full game</span>${icon('external-link')}</a><button type="button" aria-label="Close game preview">${icon('x')}<span>Close</span></button></div><p class="game-loading" role="status">Loading Intrusion…</p><iframe title="Intrusion live game" src="${gameURL}" allow="fullscreen" sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock"></iframe>`;
          document.body.appendChild(dialog);
          dialog.showModal();
          document.documentElement.dataset.gameOpen = '';
          on(dialog.querySelector('button'), 'click', dismiss);
          on(dialog, 'cancel', (event) => {
            event.preventDefault();
            dismiss();
          });
          on(dialog.querySelector('iframe'), 'load', () => {
            if (dialog) dialog.querySelector('.game-loading').hidden = true;
          });
        });
        cleanup.push(() => {
          if (dialog) {
            dialog.querySelector('iframe')?.remove();
            dialog.close();
            dialog.remove();
            dialog = null;
            delete document.documentElement.dataset.gameOpen;
          }
        });
      }
    });
    return () => cleanup.forEach((dispose) => dispose());
  }
  app.projectDemos = { preview, mount };
})((window.Garang = window.Garang || {}));
