(function (app) {
  'use strict';

  /* the GSAP bits: on load the greeting rises word by word, then the intro, then the tiles drop in
     (the CSS land animation covers it if GSAP doesn't load). inner pages slide their sections in
     as you scroll. none of it runs with reduced motion */
  const { $, reduce } = app.runtime;
  const { gsap, SplitText, ScrollTrigger } = window;
  const enabled = !reduce && !!gsap && !!SplitText;

  if (enabled) {
    gsap.registerPlugin(SplitText);
    if (ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
    document.documentElement.classList.add('gsap');
  }

  function whenLoaded(fn) {
    const root = document.documentElement;
    if (root.classList.contains('loaded')) return fn();
    const obs = new MutationObserver(() => {
      if (!root.classList.contains('loaded')) return;
      obs.disconnect();
      fn();
    });
    obs.observe(root, { attributes: true, attributeFilter: ['class'] });
  }

  function intro() {
    if (!enabled) return;
    whenLoaded(() => {
      const hello = $('#hello'),
        text = hello.querySelector('.hello-text'),
        cells = gsap.utils.toArray('.cell');
      /* only split the text span: the 3D robot's perch lives in the heading too, and revert() rewrites innerHTML */
      const label = hello.getAttribute('aria-label');
      hello.setAttribute('aria-label', text.textContent.trim());
      /* whole words, no masks. splitting letters loses the kerning and it jumps when it reverts */
      const greeting = new SplitText(text, { type: 'words', aria: 'none' });

      gsap
        .timeline({
          defaults: { ease: 'power4.out' },
          onComplete() {
            greeting.revert();
            label ? hello.setAttribute('aria-label', label) : hello.removeAttribute('aria-label');
          },
        })
        .from(greeting.words, { y: '0.5em', opacity: 0, duration: 0.55, stagger: 0.07 })
        /* move the intro as one block so the lines and chips don't reflow */
        .from('#intro', { y: 14, opacity: 0, duration: 0.6, clearProps: 'transform,opacity' }, '-=0.35')
        .from(
          cells,
          {
            /* the same landing as the CSS fallback: straight down, no tilt or overshoot */
            y: 26,
            opacity: 0,
            duration: 0.7,
            stagger: 0.07,
            /* clear only what GSAP set, the cells keep their --c/--t/--i */
            clearProps: 'transform,opacity',
          },
          '-=0.5'
        );
    });
  }

  /* sections already on screen use the CSS rise; the ones further down slide in when you scroll
     to them. page is the scrolling #page element. returns a cleanup */
  function reveal(page) {
    if (!enabled || !ScrollTrigger) return () => {};
    const items = [...page.querySelectorAll('.rise > :not(.proj-grid), .proj-grid > *')].filter(
      (el) => el.getBoundingClientRect().top > page.clientHeight * 0.92
    );
    if (!items.length) return () => {};
    for (const el of items) el.classList.add('scroll-in');
    gsap.set(items, { opacity: 0, y: 24 }); // about the same as the CSS rise
    const triggers = ScrollTrigger.batch(items, {
      scroller: page,
      start: 'top 88%',
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: 'power4.out',
          stagger: 0.08,
          clearProps: 'transform,opacity',
        }),
    });
    /* images loading in late push things down, so re-measure */
    const refresh = () => ScrollTrigger.refresh();
    const pending = [...page.querySelectorAll('img')].filter((img) => !img.complete);
    for (const img of pending) img.addEventListener('load', refresh, { once: true });
    return () => {
      for (const t of triggers) t.kill();
      for (const img of pending) img.removeEventListener('load', refresh);
      gsap.killTweensOf(items);
    };
  }

  app.motion = { enabled, gsap: enabled ? gsap : null, intro, reveal };
})((window.Garang = window.Garang || {}));
