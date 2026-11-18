(function (app) {
  'use strict';

  const { SITE, stars, sky, robotGuide, projectDemos, icon } = app;
  const { $, todo, cap, input } = app.runtime;
  const { Bot, untrack } = app.robots;
  const { gust, glitch } = app.effects;

  function createNavigation(field) {
    function projectLinks(project) {
      const links = [
        ...(project.github ? [{ label: 'GitHub', href: project.github }] : []),
        ...(project.go || []),
      ].filter((link) => link.href);
      return links.length
        ? `<div class="go">${links.map((link) => `<a href="${link.href}" target="_blank" rel="noopener">${icon(link.label === 'GitHub' ? 'code-xml' : link.label.startsWith('Play') ? 'play' : 'external-link')}<span>${link.label}</span></a>`).join('')}</div>`
        : '';
    }

    /* page content for each tile */
    function body(id) {
      const t = SITE.tiles.find((x) => x.id === id);
      let inner = '',
        k = 0;
      const K = () => `style="--k:${++k}"`;
      if (id === 'projects') {
        /* each project is an element: a two-letter symbol (initials, or the first two letters of a
           one-word name) and a number. the first goes full width with its preview, the rest go in a grid */
        const symbol = (title) => {
          const words = title.split(/\s+|(?=[A-Z])/).filter(Boolean);
          const s = words.length > 1 ? words[0][0] + words[1][0] : title.slice(0, 2);
          return s[0].toUpperCase() + s.slice(1).toLowerCase();
        };
        const media = (p) =>
          p.demo
            ? projectDemos.preview(p)
            : p.img
              ? `<div class="shot" ${p.bot ? `data-bot="${p.bot}"` : ''}><div class="perch"></div><img class="pic" src="img/${p.img}.webp?v=26" alt="Robots in a sunlit meadow, from ${p.title}"></div>`
              : '';
        const card = (p, i, lead) => `<article class="proj ${lead ? 'lead' : 'card'}" ${lead ? K() : ''}>
      ${lead ? '' : media(p)}<div class="proj-text"><div class="proj-el" aria-hidden="true"><span class="proj-sym">${symbol(p.title)}</span><span class="proj-n">${i + 1}</span></div>
      <h3 class="glitch" data-text="${p.title}">${p.title}</h3><div class="meta">${p.where} · ${p.year}</div>
      <p>${todo(p.text, p.todo)}</p><div class="tags">${p.tags.map((g) => `<span>${g}</span>`).join('')}</div>
      <div class="proj-foot">${projectLinks(p)}${app.codeExcerpts?.project(p) || ''}</div></div>
      ${lead ? media(p) : ''}</article>`;
        const [first, ...rest] = SITE.projects;
        inner =
          card(first, 0, true) +
          `<div class="proj-grid" ${K()}>${rest.map((p, i) => card(p, i + 1, false)).join('')}</div>`;
      }
      if (id === 'experience')
        inner = SITE.roles
          .map(
            (r) => `<article class="role" ${K()}>
      <div><h3>${todo(r.title, r.todo)}</h3><div class="meta">${r.org} · ${todo(r.when, r.todo)}</div></div>
      <p>${todo(r.text, r.todo)}</p></article>`,
          )
          .join('');
      if (id === 'about')
        inner = `<p class="state" ${K()}>${SITE.aboutLine}</p><p class="lede" ${K()}>${SITE.about}</p>
      <div class="els" ${K()}>${SITE.facts.map((f, i) => `<div><span class="s">${f.s}</span><span class="i">${i + 1}</span><b>${f.b}</b><span>${f.t}</span></div>`).join('')}</div>
      <p class="note" ${K()}>The robots and the meadow were made in Blender for Intrusion.</p>`;
      if (id === 'contact')
        inner = `<p class="state" ${K()}>Email is the best way to reach me.</p><div class="els" ${K()}>${SITE.contact.map((c, i) => `<div><span class="s">${icon(c.copy ? 'mail' : c.label === 'GitHub' ? 'code-xml' : 'external-link')}</span><span class="i">${i + 1}</span><b>${c.label}</b><span>${c.href ? `<a href="${c.href}" target="_blank" rel="noopener">${c.value}</a>` : todo(c.value, c.todo)}</span>${c.copy ? `<button class="copy" type="button" data-copy="${c.value}" aria-live="polite">${icon('copy')}<span>Copy</span></button>` : ''}</div>`).join('')}</div>`;
      if (id === 'projects') inner += app.codeExcerpts?.render() || '';
      return `<div class="pg"><div class="bar"><button class="back" id="back">${icon('arrow-left')}<span>Back</span></button><a class="logo" href="#">gk</a></div>
    <div class="wrap rise"><div class="ptitle"><span class="smoss" aria-hidden="true" style="background-image:url(img/moss-title.webp?v=26)"></span><div class="perch" id="pperch"></div><span class="el" aria-hidden="true">${t.sym}</span><h2 id="ptitle" class="glitch" data-text="${cap(t.name)}">${cap(t.name)}</h2></div>
    ${inner}</div><div class="pspace"></div><div class="pmeadow" id="pmeadow" role="img" aria-label="A flowering meadow"></div></div>`;
    }

    /* open and close: the tile grows to fill the screen, then its colour lifts away like a blind */
    const page = $('#page');
    let openId = null,
      pageBots = [],
      pageMeadow = null,
      busy = false,
      guide = null,
      disposeProjects = () => {},
      disposeReveal = () => {},
      disposeImages = () => {},
      disposeCode = () => {};
    const home = $('.home');
    const skipTransition = () =>
      matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !Element.prototype.animate;
    function transitionDone() {
      guide?.dispose();
      guide = null;
      busy = false;
      syncRoute(); // catches Back, Escape or another tile pressed mid-transition
    }
    function playTransition(el, frames, duration, done) {
      const animation = el.animate(frames, {
        duration,
        easing: 'cubic-bezier(.22,1,.36,1)',
        fill: 'forwards',
      });
      animation.finished.then(done, done);
    }
    function grow(tile, toFull, done) {
      const t = SITE.tiles.find((x) => x.id === tile.dataset.id),
        r = tile.getBoundingClientRect();
      const m = document.createElement('div');
      m.className = 'morph';
      m.style.setProperty('--c', t.color);
      m.style.setProperty('--t', t.t);
      m.innerHTML = `<div class="morph-fill"></div><b>${t.sym}</b>`;
      const fill = m.firstChild,
        sym = m.lastChild;
      const small = {
        transform: `translate(${r.left}px,${r.top}px) scale(${r.width / innerWidth},${r.height / innerHeight})`,
      };
      const big = { transform: 'translate(0px,0px) scale(1,1)' };
      const k = (Math.max(innerWidth, innerHeight) / r.width) * 0.9;
      Object.assign(sym.style, {
        width: r.width + 'px',
        height: r.height + 'px',
        fontSize: getComputedStyle(tile.querySelector('.sym')).fontSize,
      });
      const symbolSmall = {
        transform: `translate(${r.left}px,${r.top}px) scale(1)`,
        opacity: 1,
      };
      const symbolBig = {
        transform: `translate(${(innerWidth - r.width) / 2}px,${(innerHeight - r.height) / 2}px) scale(${k})`,
        opacity: 0,
      };
      document.body.appendChild(m);
      const duration = toFull ? 320 : 280;
      sym.animate(
        toFull ? [symbolSmall, symbolBig] : [symbolBig, symbolSmall],
        {
          duration,
          easing: 'cubic-bezier(.22,1,.36,1)',
          fill: 'forwards',
        },
      );
      playTransition(fill, toFull ? [small, big] : [big, small], duration, () =>
        done(m),
      );
    }
    function clearPageBots() {
      app.textEffects?.cleanup(page);
      disposeImages();
      disposeImages = () => {};
      disposeCode();
      disposeCode = () => {};
      disposeProjects();
      disposeProjects = () => {};
      disposeReveal();
      disposeReveal = () => {};
      for (const b of pageBots) untrack(b);
      pageBots = [];
      if (field && pageMeadow) {
        field.detach(pageMeadow);
        field.attach($('#meadow'));
      }
      pageMeadow = null;
    }
    function render(id, guided = false) {
      const t = SITE.tiles.find((x) => x.id === id);
      clearPageBots();
      page.dataset.section = id;
      document.documentElement.dataset.section = id;
      page.style.setProperty('--c', t.color);
      page.style.setProperty('--t', t.t);
      page.innerHTML = body(id);
      if (guided) page.querySelector('.pg').classList.add('guided');
      sky(page.querySelector('.pg'));
      disposeProjects = projectDemos.mount(page);
      page.classList.add('open');
      page.scrollTop = 0;
      document.body.style.overflow = 'hidden';
      /* keep Tab, screen readers and clicks in the open page, not on the home page behind it */
      home.inert = true;
      disposeReveal = app.motion?.reveal(page) || (() => {});
      disposeImages = app.imageEffects?.mount(page) || (() => {});
      disposeCode = app.codeExcerpts?.mount(page) || (() => {});
      requestAnimationFrame(() => stars(page.querySelector('.pg')));
      $('#back').addEventListener('click', () => {
        location.hash = '';
      });
      if (input.kbd) $('#back').focus({ preventScroll: true });
      page.querySelectorAll('.copy').forEach((b) =>
        b.addEventListener('click', () => {
          const done = (s) => {
            b.innerHTML = `${icon('check')}<span>${s}</span>`;
            setTimeout(() => {
              b.innerHTML = `${icon('copy')}<span>Copy</span>`;
            }, 1600);
          };
          const pick = () => {
            const r = document.createRange();
            r.selectNodeContents(b.previousElementSibling);
            const s = getSelection();
            s.removeAllRanges();
            s.addRange(r);
            done('Selected');
          };
          try {
            navigator.clipboard
              .writeText(b.dataset.copy)
              .then(() => done('Copied'), pick);
          } catch (e) {
            pick();
          }
        }),
      );
      const title = page.querySelector('#ptitle');
      setTimeout(() => {
        if (!title.isConnected) return;
        glitch(title);
        page.querySelectorAll('h3').forEach((h) => app.textEffects?.decode(h));
      }, 380);
      const pp = $('#pperch'),
        pw = pp.parentElement.offsetWidth;
      const tb = new Bot(t.bot, pp, 62, pw * 0.84);
      pageBots.push(tb);
      setTimeout(
        () => {
          if (tb.el.isConnected) tb.hop();
        },
        guided ? 220 : 450,
      );
      if (guided) guide.land(tb.el);
      page.querySelectorAll('.proj').forEach((p) => {
        const h = p.querySelector('h3'),
          s = p.querySelector('.shot[data-bot]');
        let b = null;
        if (s) {
          const sp = s.querySelector('.perch');
          b = new Bot(s.dataset.bot, sp, 58, s.offsetWidth * 0.85);
          pageBots.push(b);
        }
        p.addEventListener('mouseenter', () => {
          glitch(h);
          if (s) gust(s.querySelector('.perch'));
          if (b) {
            b.set('sus', 1400);
            b.el.classList.add('sus');
          }
        });
      });
      pageMeadow = $('#pmeadow');
      if (field) field.attach(pageMeadow);
    }

    function open(id, animate) {
      const t = SITE.tiles.find((x) => x.id === id);
      if (!t || busy || id === openId) return;
      const tile = document.querySelector(`.tile[data-id="${id}"]`);
      openId = id;
      if (skipTransition() || !animate || !tile) {
        render(id);
        return;
      }
      busy = true;
      guide = robotGuide(tile);
      grow(tile, true, (m) => {
        render(id, !!guide);
        const bl = document.createElement('div');
        bl.className = 'blind';
        bl.style.setProperty('--c', t.color);
        document.body.appendChild(bl);
        m.remove();
        playTransition(
          bl,
          [{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }],
          200,
          () => {
            bl.remove();
            transitionDone();
          },
        );
      });
    }
    function close() {
      if (!openId || busy) return;
      const id = openId,
        t = SITE.tiles.find((x) => x.id === id),
        tile = document.querySelector(`.tile[data-id="${id}"]`);
      openId = null;
      const finish = () => {
        page.classList.remove('open');
        home.inert = false; // before the tile takes focus back
        delete document.documentElement.dataset.section;
        clearPageBots();
        page.innerHTML = '';
        document.body.style.overflow = '';
      };
      if (skipTransition() || !tile) {
        finish();
        tile?.focus({ preventScroll: true });
        return;
      }
      busy = true;
      const bl = document.createElement('div');
      bl.className = 'blind';
      bl.style.setProperty('--c', t.color);
      document.body.appendChild(bl);
      playTransition(
        bl,
        [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }],
        180,
        () => {
          finish();
          grow(tile, false, (m) => {
            playTransition(m, [{ opacity: 1 }, { opacity: 0 }], 80, () => {
              m.remove();
              tile.focus({ preventScroll: true });
              transitionDone();
            });
          });
          requestAnimationFrame(() => bl.remove());
        },
      );
    }
    function syncRoute() {
      if (busy) return;
      const id = location.hash.slice(1);
      if (id) open(id, true);
      else close();
    }

    function start() {
      document.querySelectorAll('.tile').forEach((t) =>
        t.addEventListener('click', () => {
          location.hash = t.dataset.id;
        }),
      );
      addEventListener('hashchange', syncRoute);
      addEventListener('keydown', (e) => {
        if (
          e.key === 'Escape' &&
          openId &&
          !document.querySelector('dialog[open]')
        )
          location.hash = '';
      });
      if (location.hash.length > 1) open(location.hash.slice(1), false);
    }
    return {
      start,
      get isOpen() {
        return !!openId;
      },
      get coversHome() {
        return page.classList.contains('open');
      },
      get bots() {
        return pageBots;
      },
    };
  }

  app.createNavigation = createNavigation;
})((window.Garang = window.Garang || {}));
