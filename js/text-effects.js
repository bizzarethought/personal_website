(function (app) {
  'use strict';
  const active = new Map();
  let plugin;
  async function decode(heading) {
    if (
      !heading?.isConnected ||
      !window.gsap ||
      matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    if (heading.dataset.intro) return; // the entrance animation has the greeting right now
    const target = heading.querySelector('.hello-text') || heading;
    // SplitText owns the greeting while it animates in, so don't touch its nodes or the robot perch
    if (active.has(target) || target.children.length) return;
    const text = target.textContent;
    const token = { heading, text, restore: null };
    active.set(target, token);
    try {
      plugin ||= app.assets
        .script('js/vendor/ScrambleTextPlugin.min.js')
        .catch((e) => {
          plugin = null;
          throw e;
        });
      await plugin;
      if (active.get(target) !== token || !target.isConnected) return;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      window.gsap.registerPlugin(window.ScrambleTextPlugin);
      const label = heading.getAttribute('aria-label');
      heading.setAttribute('aria-label', text.trim());
      const original = document.createElement('span'),
        visual = document.createElement('span');
      original.textContent = visual.textContent = text;
      original.className = 'decode-original';
      visual.className = 'decode-visual';
      original.setAttribute('aria-hidden', 'true');
      visual.setAttribute('aria-hidden', 'true');
      target.classList.add('decoding');
      target.replaceChildren(original, visual);
      const restore = () => {
        target.textContent = text;
        target.classList.remove('decoding');
        label === null
          ? heading.removeAttribute('aria-label')
          : heading.setAttribute('aria-label', label);
        active.delete(target);
      };
      token.restore = restore;
      token.visual = visual;
      window.gsap.to(visual, {
        duration: 0.65,
        scrambleText: {
          text,
          chars: '01<>/{}_+',
          revealDelay: 0.12,
          speed: 0.45,
        },
        onComplete: restore,
      });
    } catch {
      /* if the plugin fails the heading just stays as it is */
    } finally {
      if (!token.restore && active.get(target) === token) active.delete(target);
    }
  }
  function cleanup(host) {
    for (const [target, state] of active) {
      if (!host.contains(target)) continue;
      if (state.visual) window.gsap?.killTweensOf(state.visual);
      state.restore?.();
      active.delete(target);
    }
  }
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener(
    'change',
    (e) => {
      if (e.matches) cleanup(document.body);
    },
  );
  app.textEffects = { decode, cleanup };
})((window.Garang = window.Garang || {}));
