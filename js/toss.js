(function (app) {
  'use strict';

  /* throwable robots (Matter.js).
     grab a tile robot and it dangles from the cursor; let go and it flies, bouncing off the tiles,
     the heading and the edges of the window. once it hits the grass it jumps straight back to its
     perch, turning upright on the way. hit another robot hard enough and that one comes off too.
     while it's loose the sprite lives in a fixed layer and bot.held keeps robots.js off it.
     off with reduced motion */
  const { reduce, rand } = app.runtime;
  const { BOTS } = app.robots;
  const M = window.Matter;

  const FRAME = { happy: 15, sus: 16 };
  const STEP = 1000 / 60; // fixed physics step, ms
  const MAX_SPEED = 42; // px per step; any faster and a hard fling can go through a tile
  const SELECTOR = '.home .cell .perch .bot, .toss-layer .bot';

  function createToss(isCovered) {
    if (reduce || !M) return { step() {} };
    const { Engine, Bodies, Body, Composite, Constraint, Events } = M;

    const engine = Engine.create();
    engine.gravity.y = 1.1;
    const world = engine.world;

    const layer = document.createElement('div');
    layer.className = 'toss-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
    document.documentElement.classList.add('toss-on');

    /* bot -> { phase: held|fly|jump, body, perch, w, h, x, y, angle, t, ... } */
    const loose = new Map();
    let scenery = null, // static bodies, made when the first robot comes loose
      grab = null, // { bot, constraint, id }
      acc = 0;
    const launches = []; // knock-ons, applied after the physics step

    const $ = (s) => document.querySelector(s);
    const center = (r) => ({
      x: r.left + r.width / 2,
      y: r.top + r.height / 2,
    });

    /* the meadow is the floor, a little way down into the grass */
    function floorY() {
      const m = $('#meadow')?.getBoundingClientRect();
      if (!m || !m.height) return innerHeight - 30;
      return Math.min(innerHeight, m.bottom) - m.height * 0.28;
    }

    function buildScenery() {
      const solid = { isStatic: true, friction: 0.6, restitution: 0.25 };
      const blocks = [...document.querySelectorAll('.home .tile'), $('#hello')]
        .filter(Boolean)
        .map((el) => {
          const r = el.getBoundingClientRect(),
            c = center(r);
          return {
            el,
            body: Bodies.rectangle(c.x, c.y, r.width, r.height, solid),
          };
        });
      const W = innerWidth,
        H = innerHeight;
      const floor = Bodies.rectangle(W / 2, floorY() + 60, W * 3, 120, {
        ...solid,
        friction: 0.9,
      });
      const walls = [
        Bodies.rectangle(-60, H / 2, 120, H * 6, solid),
        Bodies.rectangle(W + 60, H / 2, 120, H * 6, solid),
      ];
      scenery = { blocks, floor, sensors: new Map() };
      Composite.add(world, [...blocks.map((b) => b.body), floor, ...walls]);
    }

    /* perched robots are sensors, so a fast hit knocks them off */
    function syncSensors() {
      const { sensors } = scenery;
      for (const bot of BOTS) {
        if (
          bot.is3d ||
          loose.has(bot) ||
          !bot.el.isConnected ||
          !bot.el.closest('.home .cell')
        )
          continue;
        const r = bot.el.getBoundingClientRect(),
          c = center(r);
        let s = sensors.get(bot);
        if (!s) {
          s = Bodies.rectangle(c.x, c.y, r.width * 0.66, r.height * 0.9, {
            isStatic: true,
            isSensor: true,
          });
          s.plugin.bot = bot;
          sensors.set(bot, s);
          Composite.add(world, s);
        } else Body.setPosition(s, c);
      }
      for (const [bot, s] of sensors)
        if (loose.has(bot) || !bot.el.isConnected) {
          Composite.remove(world, s);
          sensors.delete(bot);
        }
    }

    /* on phones the page scrolls, so keep the tiles and slab in step */
    function syncScenery() {
      for (const b of scenery.blocks)
        Body.setPosition(b.body, center(b.el.getBoundingClientRect()));
      Body.setPosition(scenery.floor, { x: innerWidth / 2, y: floorY() + 60 });
      syncSensors();
    }

    function teardown() {
      Composite.clear(world, false);
      scenery = null;
      acc = 0;
    }

    function addBody(s) {
      const b = Bodies.rectangle(s.x, s.y, s.w * 0.66, s.h * 0.92, {
        chamfer: { radius: Math.min(s.w, s.h) * 0.28 },
        restitution: 0.45,
        friction: 0.3,
        frictionAir: 0.012,
        density: 0.002,
      });
      Body.setAngle(b, s.angle);
      b.plugin.bot = s.bot;
      s.body = b;
      Composite.add(world, b);
      return b;
    }

    function removeBody(s) {
      if (!s.body) return;
      Composite.remove(world, s.body);
      s.body = null;
    }

    /* lift a perched robot into the fixed layer without it moving on screen */
    function release(bot) {
      if (loose.has(bot)) return loose.get(bot);
      if (!scenery) buildScenery();
      const r = bot.el.getBoundingClientRect(),
        c = center(r);
      const s = {
        bot,
        perch: bot.el.parentElement,
        w: r.width,
        h: r.height,
        x: c.x,
        y: c.y,
        angle: 0,
        t: 0,
        still: 0,
        phase: 'fly',
        body: null,
      };
      bot.held = true;
      bot.el.classList.remove('hop', 'sus');
      bot.face.style.transform = '';
      bot.el.style.left = '0px'; // the layer moves it with translate; place() puts left back once it's home
      layer.appendChild(bot.el);
      loose.set(bot, s);
      render(s);
      return s;
    }

    function render(s) {
      s.bot.el.style.translate = `${(s.x - s.w / 2).toFixed(1)}px ${(s.y - s.h / 2).toFixed(1)}px`;
      s.bot.el.style.rotate = `${s.angle.toFixed(3)}rad`;
    }

    /* back on its perch, and robots.js takes over again */
    function home(s) {
      const { bot } = s;
      removeBody(s);
      loose.delete(bot);
      bot.el.style.translate = bot.el.style.rotate = '';
      bot.face.style.transform = '';
      if (s.perch.isConnected) s.perch.appendChild(bot.el);
      else bot.el.remove(); // the tiles were rebuilt while it was away
      bot.held = false;
      bot.place();
      bot.hop();
      if (!loose.size) teardown();
    }

    function homePoint(s) {
      const r = s.perch.getBoundingClientRect();
      return { x: r.left + s.bot.x, y: r.bottom - s.h / 2 };
    }

    /* ---- grabbing ---- */
    addEventListener('pointerdown', (e) => {
      if (grab || isCovered() || e.button > 0) return;
      const el = e.target.closest?.(SELECTOR);
      const bot = el && BOTS.find((b) => b.el === el);
      if (!bot || bot.is3d) return;
      e.preventDefault();
      const s = release(bot);
      if (!s.body) addBody(s);
      s.phase = 'held';
      s.t = s.still = 0;
      s.jump = null; // it may have been caught mid-jump
      s.landed = false;
      const constraint = Constraint.create({
        pointA: { x: e.clientX, y: e.clientY },
        bodyB: s.body,
        /* hold it where it was grabbed, so it swings from that point */
        pointB: {
          x: e.clientX - s.body.position.x,
          y: e.clientY - s.body.position.y,
        },
        stiffness: 0.12,
        damping: 0.08,
        length: 0,
      });
      Composite.add(world, constraint);
      grab = { bot, constraint, id: e.pointerId };
      document.documentElement.classList.add('tossing');
    });
    addEventListener('pointermove', (e) => {
      if (grab && e.pointerId === grab.id)
        grab.constraint.pointA = { x: e.clientX, y: e.clientY };
    });
    const letGo = (e) => {
      if (!grab || e.pointerId !== grab.id) return;
      Composite.remove(world, grab.constraint);
      const s = loose.get(grab.bot);
      if (s) {
        s.phase = 'fly';
        s.t = s.still = 0;
      }
      grab = null;
      document.documentElement.classList.remove('tossing');
    };
    addEventListener('pointerup', letGo);
    addEventListener('pointercancel', letGo);

    /* knock-ons: note them during the collision, apply them after the step */
    Events.on(engine, 'collisionStart', (ev) => {
      for (const { bodyA, bodyB } of ev.pairs) {
        const [hitter, sensor] = bodyA.isSensor
          ? [bodyB, bodyA]
          : [bodyA, bodyB];
        if (!sensor.isSensor || !hitter.plugin.bot || hitter.speed < 4)
          continue;
        launches.push({ bot: sensor.plugin.bot, v: { ...hitter.velocity } });
      }
    });

    // note the landing during the step and remove the body after Engine.update.
    // collisionActive catches a robot let go while it's already touching the grass
    Events.on(engine, 'collisionStart collisionActive', (ev) => {
      for (const { bodyA, bodyB } of ev.pairs) {
        const robot =
          bodyA === scenery?.floor
            ? bodyB
            : bodyB === scenery?.floor
              ? bodyA
              : null;
        const s = robot && loose.get(robot.plugin.bot);
        if (s?.phase === 'fly') s.landed = true;
      }
    });

    /* the tiles get rebuilt when the window width changes, so drop any loose robots */
    let lastW = innerWidth;
    addEventListener('resize', () => {
      if (innerWidth === lastW) return;
      lastW = innerWidth;
      if (grab) letGo({ pointerId: grab.id });
      for (const s of loose.values()) {
        s.bot.held = false;
        s.bot.el.remove();
      }
      loose.clear();
      if (scenery) teardown();
    });

    /* ---- per frame, from main.js ---- */
    function step(dt) {
      if (!loose.size || isCovered()) return;
      syncScenery();

      acc = Math.min(acc + dt * 1000, STEP * 4);
      while (acc >= STEP) {
        Engine.update(engine, STEP);
        acc -= STEP;
        for (const s of loose.values()) {
          const b = s.body;
          if (b && b.speed > MAX_SPEED)
            Body.setVelocity(b, {
              x: (b.velocity.x / b.speed) * MAX_SPEED,
              y: (b.velocity.y / b.speed) * MAX_SPEED,
            });
        }
      }

      for (const { bot, v } of launches.splice(0)) {
        if (loose.has(bot) || !bot.el.isConnected) continue;
        const s = release(bot);
        addBody(s);
        Body.setVelocity(s.body, {
          x: v.x * 0.7,
          y: Math.min(-7, v.y * 0.4 - 7),
        });
        Body.setAngularVelocity(s.body, rand(-0.25, 0.25));
      }

      const floor = floorY();
      for (const s of [...loose.values()]) {
        const { bot } = s;
        s.t += dt;
        if (s.body) {
          s.x = s.body.position.x;
          s.y = s.body.position.y;
          s.angle = s.body.angle;
        }

        if (s.phase === 'held') {
          bot.frame(FRAME.sus);
        } else if (s.phase === 'fly') {
          bot.frame(FRAME.sus);
          const b = s.body;
          s.still =
            b.speed < 0.3 && Math.abs(b.angularVelocity) < 0.012
              ? s.still + dt
              : 0;
          if (s.y > innerHeight + 300)
            Body.setPosition(b, { x: s.x, y: floor - s.h });
          if (s.landed || s.still > 0.35 || s.t > 7) {
            // landed: straight back up, no standing or walking. robots that settle on a tile
            // go home too, and the timeout rescues any stuck in a corner
            const to = homePoint(s),
              d = Math.hypot(to.x - s.x, to.y - s.y);
            s.jump = {
              x0: s.x,
              y0: s.y,
              angle: Math.atan2(Math.sin(s.angle), Math.cos(s.angle)),
              T: 0.6 + Math.min(0.35, d / 1800),
              peak: Math.min(110, 45 + d * 0.14),
            };
            removeBody(s);
            s.phase = 'jump';
            s.t = 0;
            bot.face.style.transform = '';
            bot.frame(FRAME.happy);
          }
        } else if (s.phase === 'jump') {
          const j = s.jump,
            to = homePoint(s), // re-aimed every frame, in case the page scrolled
            p = Math.min(1, s.t / j.T);
          s.x = j.x0 + (to.x - j.x0) * p;
          s.y = j.y0 + (to.y - j.y0) * p - 4 * j.peak * p * (1 - p);
          // unwind during takeoff instead of snapping upright at the end
          s.angle = j.angle * (1 - Math.min(1, p * 3)) ** 2;
          bot.frame(FRAME.happy);
          if (p >= 1) {
            home(s);
            continue;
          }
        }
        render(s);
      }
    }

    function throwAll() {
      if (
        isCovered() ||
        grab ||
        matchMedia('(prefers-reduced-motion: reduce)').matches
      )
        return 0;
      const bots = BOTS.filter(
        (b) => !b.is3d && !loose.has(b) && b.el.closest('.home .cell'),
      );
      bots.forEach((bot, i) => {
        const s = release(bot);
        addBody(s);
        Body.setVelocity(s.body, {
          x: (i % 2 ? -1 : 1) * rand(5, 9),
          y: rand(-13, -8),
        });
        Body.setAngularVelocity(s.body, rand(-0.18, 0.18));
      });
      return bots.length;
    }
    return { step, throwAll };
  }

  app.createToss = createToss;
})((window.Garang = window.Garang || {}));
