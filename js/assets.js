(function (app) {
  'use strict';
  const pending = new Map();
  /* same version as the script tags in index.html, so nobody gets a stale cached copy */
  const VERSION = 'v=34';
  function load(path, css = false) {
    const url = path.includes('?') ? path : `${path}?${VERSION}`;
    if (pending.has(url)) return pending.get(url);
    const promise = new Promise((resolve, reject) => {
      const el = document.createElement(css ? 'link' : 'script');
      if (css) {
        el.rel = 'stylesheet';
        el.href = url;
      } else el.src = url;
      const timeout = setTimeout(() => fail(), 15000);
      const fail = () => {
        clearTimeout(timeout);
        pending.delete(url);
        el.remove();
        reject(new Error(`Could not load ${url}`));
      };
      el.onload = () => {
        clearTimeout(timeout);
        resolve();
      };
      el.onerror = fail;
      document.head.appendChild(el);
    });
    pending.set(url, promise);
    return promise;
  }
  app.assets = { script: (url) => load(url), style: (url) => load(url, true) };
})((window.Garang = window.Garang || {}));
