(function (app) {
  'use strict';

  /* one short snippet per project, written to show the idea (not copied from the project repos) */
  const examples = {
    Intrusion: {
      filename: 'assign-roles.ts',
      language: 'typescript',
      caption: 'Assign one AI role on the server',
      code: 'import { randomInt } from "node:crypto";\n\ntype Role = "human" | "ai";\n\nfunction assignRoles(playerIds: string[]): Map<string, Role> {\n  if (playerIds.length < 3) throw new Error("Need at least 3 players");\n  const aiId = playerIds[randomInt(playerIds.length)];\n  return new Map(playerIds.map(id => [id, id === aiId ? "ai" : "human"]));\n}\n// Deliver each role privately to its player.',
    },
    TimeMachine: {
      filename: 'replay.go',
      language: 'go',
      caption: 'Replay a recorded response with cancellation-aware latency',
      code: 'func replay(w http.ResponseWriter, r *http.Request, rec Recording) {\n    timer := time.NewTimer(rec.Latency)\n    defer timer.Stop()\n    select {\n    case <-r.Context().Done():\n        return\n    case <-timer.C:\n    }\n    w.Header().Set("Content-Type", rec.ContentType)\n    w.WriteHeader(rec.Status)\n    _, _ = w.Write(rec.Body)\n}',
    },
    Drift: {
      filename: 'order-operations.ts',
      language: 'typescript',
      caption: 'Deduplicate and order operations deterministically',
      code: 'type Op = { actor: string; seq: number; clock: number };\n\nfunction orderOperations(local: Op[], incoming: Op[]): Op[] {\n  const unique = new Map<string, Op>();\n  for (const op of [...local, ...incoming]) {\n    unique.set(JSON.stringify([op.actor, op.seq]), op);\n  }\n  return [...unique.values()].sort((a, b) =>\n    a.clock - b.clock ||\n    (a.actor < b.actor ? -1 : a.actor > b.actor ? 1 : 0) ||\n    a.seq - b.seq\n  );\n}\n// Ordering is one part of a CRDT; applying edits needs CRDT semantics.',
    },
    Relayless: {
      filename: 'resume-chunks.ts',
      language: 'typescript',
      caption: 'Resume chunk generation at the acknowledged byte offset',
      code: 'async function* remainingChunks(file: File, acknowledged: number) {\n  const chunkSize = 1024 * 1024;\n  if (!Number.isSafeInteger(acknowledged) || acknowledged < 0 ||\n      acknowledged > file.size) throw new RangeError("Invalid offset");\n\n  for (let offset = acknowledged; offset < file.size; offset += chunkSize) {\n    const data = await file.slice(offset, offset + chunkSize).arrayBuffer();\n    yield { offset, data };\n  }\n}\n// The transport fragments chunks to its negotiated WebRTC message limit.',
    },
    'Source checker': {
      filename: 'capture-selection.ts',
      language: 'typescript',
      caption: 'Send a selected claim and its source to the extension',
      code: 'async function checkSelection() {\n  const claim = window.getSelection()?.toString().trim();\n  if (!claim) return;\n  const result = await chrome.runtime.sendMessage({\n    type: "CHECK_CLAIM",\n    claim,\n    sourceUrl: location.href,\n    pageTitle: document.title,\n  });\n  return result; // Render returned text with textContent, not innerHTML.\n}',
    },
  };

  /* real code from this site, shown at the bottom of Projects. if you edit these functions,
     update the snippets and line numbers here too */
  const snippets = [
    {
      filename: 'js/meadow.js',
      language: 'glsl',
      caption: 'Grass bending in the wind',
      code: "vec3 lean(vec2 xz, float h){\n  float gust = smoothstep(.3, 1., sin(xz.x * 1.1 - uT * 1.15 + xz.y * .6) * .5 + .5);\n  float w = (vn(xz * 2.2 + vec2(-uT * .7, uT * .15)) - .4) * .9 + gust * 1.1 + sin(uT * 2.6 + xz.x * 5. + xz.y * 3.) * .06;\n  vec2 d = normalize(vec2(1., .3)) * w * .55;\n  vec2 to = xz - uP.xy; float dist = length(to);\n  d += normalize(to + 1e-4) * uP.z * (1. - smoothstep(.0, .55, dist)) * 2.4;\n  for(int i = 0; i < 8; i++){ vec2 tk = xz - uK[i].xy; float dk = length(tk); d += normalize(tk + 1e-4) * (1. - smoothstep(uK[i].z * .45, uK[i].z * 1.25, dk)) * 1.6 * step(.001, uK[i].z); }\n  float k = h * h * 2.2;\n  vec2 o = d * k;\n  return vec3(o.x, -dot(o, o) * 1.2, o.y);\n}`;",
      line: 53,
    },
    {
      filename: 'js/toss.js',
      language: 'javascript',
      caption: 'The robot’s return jump',
      code: "if (s.phase === 'jump') {\n  const j = s.jump,\n    to = homePoint(s), // re-aimed every frame, in case the page scrolled\n    p = Math.min(1, s.t / j.T);\n  s.x = j.x0 + (to.x - j.x0) * p;\n  s.y = j.y0 + (to.y - j.y0) * p - 4 * j.peak * p * (1 - p);\n  // unwind during takeoff instead of snapping upright at the end\n  s.angle = j.angle * (1 - Math.min(1, p * 3)) ** 2;\n  bot.frame(FRAME.happy);\n  if (p >= 1) {\n    home(s);\n    continue;\n  }\n}",
      line: 356,
    },
  ];
  const escape = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );

  /* closed it's one bordered row; open, the file name and code drop down underneath */
  function excerpt(item) {
    const note = item.line
      ? `<a href="${escape(item.filename)}" target="_blank" rel="noopener">Source, line ${item.line}</a>`
      : '';
    return `<details class="code-excerpt"><summary>${app.icon?.('code-xml') || ''}<span class="code-title">${escape(item.caption)}</span></summary><div class="code-file"><b>${escape(item.filename)}</b>${note}</div><pre><code class="language-${escape(item.language)}">${escape(item.code)}</code></pre></details>`;
  }
  function project(p) {
    return examples[p.title] ? excerpt(examples[p.title]) : '';
  }
  function render() {
    return `<section class="site-code"><h3>Inside this site</h3><p>The code behind this meadow and its robots.</p><div class="site-code-grid">${snippets.map(excerpt).join('')}</div></section>`;
  }

  /* highlight.js only loads the first time someone opens a snippet */
  function mount(host) {
    const controller = new AbortController();
    let disposed = false;
    for (const details of host.querySelectorAll('.code-excerpt')) {
      details.addEventListener(
        'toggle',
        async () => {
          const code = details.querySelector('code');
          if (!details.open || code.dataset.highlighted) return;
          try {
            await app.assets.script('js/vendor/highlight.min.js');
            if (code.classList.contains('language-glsl'))
              await app.assets.script('js/vendor/highlight-glsl.min.js');
            if (!disposed && code.isConnected && !code.dataset.highlighted)
              window.hljs.highlightElement(code);
          } catch {
            // no colours then, the code is still readable
          }
        },
        { signal: controller.signal }
      );
    }
    return () => {
      disposed = true;
      controller.abort();
    };
  }

  app.codeExcerpts = { project, render, mount };
})((window.Garang = window.Garang || {}));
