(function (app) {
  'use strict';
  const launch = document.querySelector('#terminal-launch');
  if (launch && app.icon) launch.innerHTML = `${app.icon('terminal')}<span>Terminal</span>`;
  let dialog,
    terminal,
    fit,
    loading,
    previousFocus,
    line = '',
    history = [],
    historyIndex = 0,
    busy = false,
    running = Promise.resolve();
  const slug = (s) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  const projects = () =>
    app.SITE.projects.map((p) => ({ ...p, slug: slug(p.title) }));
  const email = () => app.SITE.contact.find((c) => c.copy)?.value || '';
  const write = (s = '') =>
    terminal.writeln(String(s).replace(/\r?\n/g, '\r\n'));
  const prompt = () => {
    line = '';
    terminal.write('\x1b[32m$\x1b[0m ');
  };
  const redraw = () => terminal.write('\r\x1b[2K\x1b[32m$\x1b[0m ' + line);
  const limit = () => Math.max(10, terminal.cols - 3);
  function close() {
    dialog?.close();
    previousFocus?.isConnected && previousFocus.focus({ preventScroll: true });
  }
  async function route(id) {
    location.hash = id;
    for (let i = 0; i < 60; i++) {
      const page = document.querySelector('#page');
      if (
        !document.querySelector('.morph,.blind') &&
        (id
          ? page.classList.contains('open') && page.dataset.section === id
          : !page.classList.contains('open'))
      )
        return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('The page is still opening. Please try again.');
  }
  async function command(raw) {
    const args = raw.trim().split(/\s+/),
      cmd = args.shift().toLowerCase();
    if (!cmd) return;
    if (cmd === 'help') {
      write('Explore Garang’s portfolio:');
      write('  ls projects');
      write('  cat projects/intrusion.md');
      write('  open intrusion');
      write('  open about | experience | contact');
      write('  contact --copy');
      write('  sudo throw robots');
      write('  clear | exit');
      write('Tab completes; ↑/↓ recall commands.');
      write('This shell runs portfolio commands in your browser.');
    } else if (cmd === 'ls') {
      if (args.length && args[0].replace(/\/$/, '') !== 'projects')
        throw new Error('Try: ls projects');
      write(
        args.length
          ? projects()
              .map((p) => p.slug + '.md')
              .join('\n')
          : 'projects/\nabout\nexperience\ncontact',
      );
    } else if (cmd === 'cat') {
      const p = projects().find((p) => `projects/${p.slug}.md` === args[0]);
      if (!p)
        throw new Error('No such file. Use ls projects to see the files.');
      write(`\x1b[1;36m${p.title}\x1b[0m · ${p.year}`);
      write(p.text);
      write(p.tags.join(' · '));
      if (p.github) write(p.github);
    } else if (cmd === 'contact') {
      write(email());
      if (args[0] === '--copy') {
        try {
          await navigator.clipboard.writeText(email());
          write('Email copied.');
        } catch {
          write('Copy is unavailable here. Select the email above to copy it.');
        }
      } else if (args.length) throw new Error('Try: contact --copy');
    } else if (cmd === 'open') {
      const target = args[0]?.toLowerCase();
      const p = projects().find((p) => p.slug === target);
      if (
        !p &&
        !['about', 'experience', 'contact', 'projects', 'home'].includes(target)
      )
        throw new Error('Unknown page or project. Try open intrusion.');
      close();
      await route(p ? 'projects' : target === 'home' ? '' : target);
      if (p?.demo === 'intrusion')
        document
          .querySelector('[data-demo="intrusion"] [data-action="preview"]')
          ?.click();
      else if (p)
        document
          .querySelectorAll('.proj')
          [
            projects().findIndex((item) => item.slug === p.slug)
          ]?.scrollIntoView({ block: 'center' });
    } else if (cmd === 'sudo' && args.join(' ') === 'throw robots') {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        write('Robot throwing is off while reduced motion is enabled.');
        return;
      }
      close();
      await route('');
      const count = app.toss?.throwAll?.() || 0;
      write(
        count
          ? `${count} robots launched. They’ll jump home.`
          : 'The robots are not ready yet.',
      );
    } else if (cmd === 'clear') terminal.clear();
    else if (cmd === 'exit') close();
    else throw new Error(`Unknown command: ${cmd}. Type help.`);
  }
  function complete() {
    const candidates = [
      'help',
      'ls projects',
      'cat projects/',
      'contact --copy',
      'sudo throw robots',
      'clear',
      'exit',
      ...projects().map((p) => `cat projects/${p.slug}.md`),
      ...projects().map((p) => `open ${p.slug}`),
      ...['about', 'experience', 'contact', 'projects', 'home'].map(
        (p) => `open ${p}`,
      ),
    ];
    const matches = candidates.filter((s) => s.startsWith(line) && s !== line);
    if (matches.length === 1) {
      line = matches[0].slice(0, limit());
      redraw();
    } else if (matches.length) {
      write();
      write(matches.join('\n'));
      redraw();
    }
  }
  function input(data) {
    if (busy) return;
    if (data === '\r') {
      const value = line.trim();
      write();
      if (value) {
        history.push(value);
        history = history.slice(-50);
      }
      historyIndex = history.length;
      busy = true;
      running = command(value)
        .catch((e) => write(e.message))
        .finally(() => {
          busy = false;
          prompt();
        });
    } else if (data === '\u007f' || data === '\b') {
      line = line.slice(0, -1);
      redraw();
    } else if (data === '\x1b[A' || data === '\x1b[B') {
      historyIndex = Math.max(
        0,
        Math.min(history.length, historyIndex + (data.endsWith('A') ? -1 : 1)),
      );
      line = (history[historyIndex] || '').slice(0, limit());
      redraw();
    } else if (data === '\t') complete();
    else if (data === '\x03') {
      write('^C');
      prompt();
    } else if (data === '\x0c') {
      terminal.clear();
      redraw();
    } else if (!data.startsWith('\x1b')) {
      // pasting stays on one line, and nothing typed is ever run as code
      line = (
        line + data.replace(/[\r\n\t]+/g, ' ').replace(/[^\x20-\x7e]/g, '')
      ).slice(0, limit());
      redraw();
    }
  }
  async function initialize() {
    await Promise.all([
      app.assets.script('js/vendor/xterm.js'),
      app.assets.script('js/vendor/xterm-addon-fit.js'),
      app.assets.style('css/vendor/xterm.css'),
    ]);
    terminal = new window.Terminal({
      cursorBlink: false,
      convertEol: true,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: 14,
      lineHeight: 1.35,
      screenReaderMode: true,
      scrollback: 500,
      /* site colours: black like the slabs, tile colours for the highlights */
      theme: {
        background: '#000000',
        foreground: '#f1f3f5',
        cursor: '#40c057',
        cursorAccent: '#000000',
        selectionBackground: '#343a40',
        green: '#40c057',
        cyan: '#99e9f2',
        yellow: '#ffe066',
        red: '#ff6b6b',
        blue: '#748ffc',
      },
    });
    fit = new window.FitAddon.FitAddon();
    terminal.loadAddon(fit);
    terminal.open(dialog.querySelector('.terminal-screen'));
    fit.fit();
    terminal.onData(input);
    terminal.attachCustomKeyEventHandler((e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (e.type === 'keydown') close();
        return false;
      }
      if (e.key === 'Tab') {
        if (e.shiftKey) return false;
        if (e.type === 'keydown') {
          e.preventDefault();
          complete();
        }
        return false;
      }
      return true;
    });
    const resize = new ResizeObserver(() => {
      if (!dialog.open) return;
      fit.fit();
      line = line.slice(0, limit());
      if (!busy) redraw();
    });
    resize.observe(dialog.querySelector('.terminal-screen'));
    write('GARANG / PORTFOLIO SHELL');
    write('Type help, or try ls projects.');
    write();
    prompt();
  }
  async function open() {
    if (document.querySelector('.game-dialog[open]')) return;
    previousFocus = document.activeElement;
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'terminal-dialog';
      dialog.id = 'terminal-dialog';
      dialog.setAttribute('aria-labelledby', 'terminal-title');
      dialog.innerHTML =
        `<header class="terminal-bar"><h2 id="terminal-title">${app.icon('terminal')}<span>Meadow shell</span></h2><button type="button" aria-label="Close terminal">${app.icon('x')}<span>Close</span><kbd>Esc</kbd></button></header><p class="terminal-status" role="status">Opening terminal…</p><div class="terminal-screen"></div><footer><span><kbd>Tab</kbd> completes</span><span><kbd>↑</kbd><kbd>↓</kbd> history</span><span><kbd>Shift</kbd>+<kbd>Tab</kbd> reaches Close</span></footer>`;
      document.body.appendChild(dialog);
      dialog.querySelector('button').addEventListener('click', close);
      dialog.addEventListener('cancel', (e) => {
        e.preventDefault();
        close();
      });
      dialog.addEventListener('close', () => {
        launch.setAttribute('aria-expanded', 'false');
      });
    }
    if (dialog.open) return;
    dialog.showModal();
    launch.setAttribute('aria-expanded', 'true');
    const status = dialog.querySelector('.terminal-status');
    dialog.querySelector('button').focus();
    try {
      if (busy) {
        status.hidden = false;
        status.textContent = 'Finishing the previous command…';
        await running;
      }
      if (!terminal) {
        if (!loading)
          loading = initialize().catch((e) => {
            loading = null;
            throw e;
          });
        await loading;
      }
      status.hidden = true;
      if (dialog.open) {
        fit.fit();
        terminal.focus();
      }
    } catch {
      status.textContent =
        'The terminal could not load. Close and reopen it to retry.';
    }
  }
  launch.addEventListener('click', open);
  addEventListener('keydown', (e) => {
    if (
      e.key !== '`' ||
      e.repeat ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      e.isComposing
    )
      return;
    if (
      e.target.closest?.(
        'input,textarea,select,[contenteditable="true"],dialog',
      )
    )
      return;
    e.preventDefault();
    open();
  });
})((window.Garang = window.Garang || {}));
