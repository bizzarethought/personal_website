(function (app) {
  'use strict';

  const { asset, texURL, LOAD, reduce, fine, rand, clamp, ptr } = app.runtime;

  /* sprite robots: 18 frames, 150px tall; W is each look's frame width */
  const FR = {
    idle: [0, 1, 2, 3, 4, 5],
    walk: [6, 7, 8, 9, 10, 11, 12, 13],
    side: 14,
    happy: 15,
    sus: 16,
    blink: 17,
  };
  const W = { original: 140, crimson: 120, cobalt: 157, sunflower: 119, teal: 117, snow: 122 };
  const BOTS = [];
  class Bot {
    constructor(look, parent, h, x) {
      this.look = look;
      this.h = h;
      this.w = Math.round((W[look] * h) / 150);
      this.x = x;
      this.dir = 1;
      this.mode = 'idle';
      this.t = Math.random() * 6;
      const el = (this.el = document.createElement('div'));
      el.className = 'bot';
      el.innerHTML = '<div class="face"></div>';
      this.face = el.firstChild;
      Object.assign(el.style, { width: this.w + 'px', height: h + 'px', backgroundImage: 'none' });
      Object.assign(this.face.style, {
        backgroundImage: `url(img/sheet-${look}.webp?v=26)`,
        backgroundSize: `${this.w * 18}px ${h}px`,
      });
      parent.appendChild(el);
      this.place();
      this.frame(0);
      this.nextBlink = rand(2, 6);
      BOTS.push(this);
    }
    frame(i) {
      if (i !== this.fi) {
        this.fi = i;
        this.face.style.backgroundPosition = `${-i * this.w}px 0`;
      }
    }
    place() {
      if (this.held) return; // toss.js moves it while it's thrown
      this.el.style.left = this.x - this.w / 2 + 'px';
    }
    set(mode, ms, dir) {
      this.mode = mode;
      if (dir) this.dir = dir;
      this.place();
      clearTimeout(this.timer);
      if (ms)
        this.timer = setTimeout(() => {
          this.mode = 'idle';
          this.dir = 1;
          this.place();
          this.el.classList.remove('sus');
        }, ms);
    }
    hop() {
      if (this.held) return;
      this.el.classList.remove('hop');
      void this.el.offsetWidth;
      this.el.classList.add('hop');
      this.set('happy', 1100);
    }
    walkTo(x) {
      this.target = x;
      this.dir = x < this.x ? -1 : 1;
      this.set('walk');
    }
    /* watching starts after a short, different delay for each robot, so they don't all snap round at once */
    watch(el, ms) {
      const r = el.getBoundingClientRect(),
        m = this.el.getBoundingClientRect();
      this.set('look', ms, r.left < m.left ? -1 : 1);
    }
    /* turning plays in steps instead of a single flip: the sprite narrows, passes through the front view, and widens on the new side */
    pose() {
      return this.mode === 'walk' || this.mode === 'look' ? this.dir : 0;
    }
    turnTo(p) {
      const path = [this.cur];
      if (this.cur !== 0 && p !== 0 && this.cur !== p) path.push(0);
      path.push(p);
      this.turn = { path, t: 0 };
    }
    tick(dt) {
      if (this.held) return; // toss.js animates it while it's thrown
      this.t += dt;
      if (this.cur === undefined) this.cur = this.pose();
      if (this.mode === 'walk') {
        const step = 46 * dt * this.dir;
        this.x += step;
        if ((this.dir > 0 && this.x >= this.target) || (this.dir < 0 && this.x <= this.target)) {
          this.x = this.target;
          this.set('idle', 0);
          this.dir = 1;
        }
        this.place();
      }
      const want = this.pose();
      if (!this.turn && want !== this.cur && this.t - (this.turnEnd || -9) > 0.35)
        this.turnTo(want);
      let shown = this.cur,
        sx = 1;
      if (this.turn) {
        const T = 0.12,
          tr = this.turn;
        tr.t += dt;
        const seg = Math.min(tr.path.length - 2, Math.floor(tr.t / T)),
          u = tr.t / T - seg;
        if (tr.t >= T * (tr.path.length - 1)) {
          this.cur = tr.path[tr.path.length - 1];
          this.turn = null;
          this.turnEnd = this.t;
          shown = this.cur;
        } else {
          const a = tr.path[seg],
            b2 = tr.path[seg + 1];
          shown = u < 0.5 ? a : b2;
          sx = 0.9 + 0.1 * Math.abs(1 - 2 * u);
        }
      }
      const flip = shown < 0 ? -1 : 1;
      this.face.style.transform = flip < 0 || sx < 1 ? `scaleX(${(flip * sx).toFixed(3)})` : '';
      if (shown !== 0) {
        this.frame(
          this.mode === 'walk' && !this.turn ? FR.walk[Math.floor(this.t * 12) % 8] : FR.side
        );
        return;
      }
      if (this.mode === 'happy') return this.frame(FR.happy);
      if (this.mode === 'sus') return this.frame(FR.sus);
      this.nextBlink -= dt;
      if (this.nextBlink < 0) {
        this.frame(FR.blink);
        if (this.nextBlink < -0.14) this.nextBlink = rand(2.5, 6);
        return;
      }
      const k = Math.floor(this.t * 7) % 10;
      this.frame(FR.idle[k < 6 ? k : 10 - k]);
    }
  }

  /* ---------- Garang's own robot, the 3D model from ANDROID_BOT.blend ----------
   Same behaviours as the sprite robots (walk, look, hop, stare), but it turns its head smoothly on springs. */
  function make3D(perch, x0, done) {
    if (!window.THREE) {
      LOAD.done('robot');
      return;
    }
    asset('bot')
      .then((data) => {
        const S = 150,
          cv = document.createElement('canvas');
        cv.className = 'me3d';
        let R;
        try {
          R = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true });
        } catch (e) {
          return;
        }
        R.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
        R.setSize(S, S, false);
        R.outputEncoding = THREE.sRGBEncoding;
        R.toneMapping = THREE.ACESFilmicToneMapping;
        R.toneMappingExposure = 1.12;
        const scene = new THREE.Scene(),
          cam = new THREE.PerspectiveCamera(22, 1, 0.1, 60);
        cam.position.set(0, 2.3, 11.6);
        cam.lookAt(0, 1.55, 0);
        /* a small studio for the metal to reflect: a soft key light, rims, and the pale page and sky around it */
        const env = new THREE.Scene();
        const panel = (w, h, x, y, z, col, k) => {
          const p = new THREE.Mesh(
            new THREE.PlaneGeometry(w, h),
            new THREE.MeshBasicMaterial({
              color: new THREE.Color(col).multiplyScalar(k),
              side: THREE.DoubleSide,
            })
          );
          p.position.set(x, y, z);
          p.lookAt(0, 1.5, 0);
          env.add(p);
        };
        env.add(
          new THREE.Mesh(
            new THREE.BoxGeometry(50, 50, 50),
            new THREE.MeshBasicMaterial({ color: 0x3a4250, side: THREE.BackSide })
          )
        );
        panel(16, 9, -7, 11, 9, 0xffffff, 6.5);
        panel(5, 13, 13, 3, 3, 0xd6e6ff, 3);
        panel(7, 10, -13, 2, -5, 0xffffff, 2);
        panel(40, 40, 0, -8, 0, 0x8fbf6a, 0.9);
        const pm = new THREE.PMREMGenerator(R);
        scene.environment = pm.fromScene(env, 0.03).texture;
        pm.dispose();
        const sun = new THREE.DirectionalLight(0xffffff, 0.9);
        sun.position.set(-3, 6, 6);
        scene.add(sun);
        const dec = (b, T) => {
          const s = atob(b),
            u = new Uint8Array(s.length);
          for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
          return new T(u.buffer);
        };
        const posArr = (b) => {
          const q = dec(b, Uint16Array),
            f = new Float32Array(q.length);
          for (let i = 0; i < q.length; i++) f[i] = data.lo[i % 3] + (q[i] / 65535) * data.span;
          return f;
        };
        const geo = (g) => {
          const G = new THREE.BufferGeometry();
          G.setAttribute('position', new THREE.BufferAttribute(posArr(g.pos), 3));
          const nq = dec(g.nrm, Int8Array),
            nf = new Float32Array(nq.length);
          for (let i = 0; i < nq.length; i++) nf[i] = nq[i] / 127;
          G.setAttribute('normal', new THREE.BufferAttribute(nf, 3));
          if (g.uv) {
            const uq = dec(g.uv, Uint16Array),
              uf = new Float32Array(uq.length);
            for (let i = 0; i < uq.length; i++) uf[i] = (uq[i] / 65535) * 8 - 4;
            G.setAttribute('uv', new THREE.BufferAttribute(uf, 2));
          }
          G.setIndex(
            new THREE.BufferAttribute(dec(g.idx, g.n < 65536 ? Uint16Array : Uint32Array), 1)
          );
          return G;
        };
        const TL = new THREE.TextureLoader(),
          base = TL.load(texURL('img/bot-base.jpg?v=26')),
          orm = TL.load(texURL('img/bot-orm.jpg?v=26'));
        base.encoding = THREE.sRGBEncoding;
        base.wrapS = base.wrapT = orm.wrapS = orm.wrapT = THREE.RepeatWrapping;
        const eyeMat = new THREE.MeshBasicMaterial({
          color: 0x19ffb4,
          morphTargets: true,
          toneMapped: false,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        });
        eyeMat.onBeforeCompile = (s) => {
          s.fragmentShader = s.fragmentShader.replace(
            '#include <dithering_fragment>',
            'gl_FragColor.rgb *= .6+.4*step(.5,fract(gl_FragCoord.y*.17));\n#include <dithering_fragment>'
          );
        };
        const MATS = {
          Metal: new THREE.MeshStandardMaterial({
            map: base,
            roughnessMap: orm,
            metalnessMap: orm,
            roughness: 1.1,
            metalness: 1,
            envMapIntensity: 1.15,
          }),
          outering: new THREE.MeshStandardMaterial({
            color: 0x101113,
            metalness: 1,
            roughness: 0.22,
          }),
          screen: new THREE.MeshStandardMaterial({
            color: 0x030304,
            metalness: 0,
            roughness: 0.06,
            envMapIntensity: 1.3,
          }),
          'metal lining': new THREE.MeshStandardMaterial({
            color: 0x050505,
            metalness: 0,
            roughness: 1,
          }),
          'side glow': new THREE.MeshBasicMaterial({ color: 0x6a4bff, toneMapped: false }),
          'inner ring.002': new THREE.MeshBasicMaterial({ color: 0x3f7dff, toneMapped: false }),
          'inner ring': new THREE.MeshBasicMaterial({ color: 0x5ff3ff, toneMapped: false }),
          'inner hooves': new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
          eyes: eyeMat,
        };
        const root = new THREE.Group();
        scene.add(root);
        const part = (name) => {
          const G = new THREE.Group(),
            box = new THREE.Box3(),
            ms = [];
          data.parts[name].groups.forEach((g) => {
            const m = new THREE.Mesh(geo(g), MATS[g.mat] || MATS['metal lining']);
            m.geometry.computeBoundingBox();
            if (g.mat === 'Metal' || name !== 'head') box.union(m.geometry.boundingBox);
            ms.push(m);
            G.add(m);
          });
          const c = box.getCenter(new THREE.Vector3());
          /* the head turns about the true centre of its ball. The metal shell is open at the front, so its box centre sits too far
         back; the two side rings are on the axis, so their centre gives the right depth */
          if (name === 'head') {
            const k = data.parts[name].groups.findIndex((g) => g.mat === 'side glow');
            if (k >= 0)
              c.z = (ms[k].geometry.boundingBox.min.z + ms[k].geometry.boundingBox.max.z) / 2;
          }
          ms.forEach((m) => m.position.copy(c).multiplyScalar(-1));
          G.position.copy(c);
          G.userData.c = c;
          G.userData.box = box;
          root.add(G);
          return G;
        };
        const head = part('head'),
          fL = part('footL'),
          fR = part('footR');
        /* the feet hang from a pivot under the middle of the head, so they can turn with it and stay underneath */
        const legs = new THREE.Group();
        legs.position.set(head.userData.c.x, 0, head.userData.c.z);
        root.add(legs);
        for (const ft of [fL, fR]) {
          legs.add(ft);
          ft.position.x -= legs.position.x;
          ft.position.z -= legs.position.z;
        }
        const ground = Math.min(fL.userData.box.min.y, fR.userData.box.min.y);
        const MORPHS = ['blink', 'happy', 'angry', 'sus'],
          eg = data.parts.eyes.groups[0],
          eGeo = geo(eg);
        eGeo.morphAttributes.position = MORPHS.map(
          (k) => new THREE.BufferAttribute(posArr(data.morphs[k]), 3)
        );
        const eyes = new THREE.Mesh(eGeo, eyeMat);
        eyes.position.copy(head.userData.c).multiplyScalar(-1);
        eyes.updateMorphTargets();
        head.add(eyes);
        const radial = (a, b) => {
          const c = document.createElement('canvas');
          c.width = c.height = 128;
          const x = c.getContext('2d'),
            g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
          g.addColorStop(0, a);
          g.addColorStop(1, b);
          x.fillStyle = g;
          x.fillRect(0, 0, 128, 128);
          return new THREE.CanvasTexture(c);
        };
        const shadow = new THREE.Mesh(
          new THREE.PlaneGeometry(3.2, 1.8),
          new THREE.MeshBasicMaterial({
            map: radial('rgba(0,0,0,.4)', 'rgba(0,0,0,0)'),
            transparent: true,
            depthWrite: false,
            toneMapped: false,
          })
        );
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.set(0, ground + 0.01, 0.15);
        scene.add(shadow);
        cam.updateMatrixWorld();
        const gp = new THREE.Vector3(0, ground, 0.3).project(cam),
          FEET = (1 - gp.y) / 2;
        cv.style.transformOrigin = '50% ' + (FEET * 100).toFixed(1) + '%';
        cv.setAttribute('role', 'button');
        cv.setAttribute('aria-label', "Garang's robot. Click to say hi.");
        cv.tabIndex = 0;
        perch.appendChild(cv);

        const spring = (s, target, dt, w = 9, z = 0.8) => {
          s.v += ((target - s.p) * w * w - s.v * 2 * z * w) * dt;
          s.p += s.v * dt;
          return s.p;
        };
        const yaw = { p: 0, v: 0 },
          pit = { p: 0, v: 0 },
          turn = { p: 0, v: 0 },
          lean = { p: 0, v: 0 },
          feet = { p: 0, v: 0 };
        const inf = [0, 0, 0, 0];
        const me = {
          is3d: true,
          el: cv,
          x: x0,
          mode: 'idle',
          dir: 1,
          t: 0,
          target: x0,
          hopT: -9,
          mood: '',
          moodUntil: 0,
          watchEl: null,
          watchUntil: 0,
          blinkAt: 2,
          blinkT: -9,
          walk: 0,
          timer: 0,
          set(mode, ms, dir) {
            me.mode = mode === 'look' ? 'idle' : mode;
            if (mode === 'look' && dir) {
              me.watchEl = null;
              me.sideUntil = me.t + ms / 1000;
              me.sideDir = dir;
            }
          },
          hop() {
            me.hopT = me.t;
            me.mood = 'happy';
            me.moodUntil = me.t + 1.2;
            me.blinkT = me.t;
          },
          walkTo(x) {
            me.target = x;
            me.dir = x < me.x ? -1 : 1;
            me.mode = 'walk';
          },
          watch(el, ms, mood) {
            me.watchEl = el;
            me.watchUntil = me.t + ms / 1000;
            if (mood) {
              me.mood = mood;
              me.moodUntil = me.t + ms / 1000;
            }
          },
          tick(dt) {
            me.t += dt;
            const t = me.t;
            /* walking: the body turns side-on and the feet step */
            let moving = 0;
            if (me.mode === 'walk') {
              const step = 52 * dt * me.dir;
              me.x += step;
              moving = 1;
              me.walk += dt * 10;
              if ((me.dir > 0 && me.x >= me.target) || (me.dir < 0 && me.x <= me.target)) {
                me.x = me.target;
                me.mode = 'idle';
              }
            }
            spring(turn, moving ? me.dir * 0.95 : 0, dt, 7, 0.85);
            spring(lean, moving ? me.dir : 0, dt, 6, 0.7);
            /* what to look at: something it was told to watch, the cursor, or just around */
            const r = cv.getBoundingClientRect(),
              hx = r.left + r.width / 2,
              hy = r.top + r.height * 0.45;
            let tx = null,
              ty = null;
            if (me.watchEl && t < me.watchUntil) {
              const w = me.watchEl.getBoundingClientRect();
              tx = w.left + w.width / 2;
              ty = w.top + w.height * 0.4;
            } else if (me.sideUntil > t) {
              tx = hx + me.sideDir * 400;
              ty = hy + 40;
            } else if (fine && performance.now() - ptr.at < 3500) {
              tx = ptr.x;
              ty = ptr.y;
            }
            let yT, pT;
            if (tx === null) {
              yT = Math.sin(t * 0.4) * 0.25 + (moving ? me.dir * 0.55 : 0);
              pT = Math.sin(t * 0.31 + 1) * 0.08 + 0.06;
            } else {
              yT = clamp((tx - hx) / 360, -1, 1) * 0.8;
              pT = clamp((ty - hy) / 360, -1, 1) * 0.42;
            }
            spring(yaw, yT - turn.p * 0.6, dt, 8, 0.72);
            spring(pit, pT, dt, 8, 0.75);
            root.rotation.y = turn.p;
            /* the feet follow where the head is facing, a beat behind and not quite as far, like a body turning to look */
            legs.rotation.y = spring(feet, yaw.p * 0.8, dt, 5.5, 0.95);
            const c = head.userData.c,
              bob = reduce ? 0 : Math.sin(t * 1.9) * 0.04,
              stepUp = moving ? Math.abs(Math.sin(me.walk)) * 0.07 : 0;
            const ht = t - me.hopT,
              hu = ht < 0.5 ? ht / 0.5 : 1,
              squash = ht > 0.5 && ht < 0.75 ? Math.sin(((ht - 0.5) / 0.25) * Math.PI) * 0.1 : 0;
            head.position.set(c.x, c.y + bob + stepUp - squash, c.z);
            head.rotation.set(
              pit.p,
              yaw.p,
              -lean.p * 0.1 + (reduce ? 0 : Math.sin(t * 1.3) * 0.02)
            );
            eyes.position.set(-c.x + yaw.p * 0.08, -c.y - pit.p * 0.08, -c.z);
            fL.position.y =
              fL.userData.c.y +
              (moving ? Math.max(0, Math.sin(me.walk)) * 0.28 : 0) +
              (hu < 1 ? 0.12 : 0);
            fR.position.y =
              fR.userData.c.y +
              (moving ? Math.max(0, Math.sin(me.walk + Math.PI)) * 0.28 : 0) +
              (hu < 1 ? 0.12 : 0);
            const lift = hu < 1 ? Math.sin(hu * Math.PI) * 22 : 0;
            shadow.material.opacity = 1 - lift / 40;
            cv.style.left = me.x - S / 2 + 'px';
            cv.style.top = -FEET * S - lift + 'px';
            /* eyes: blink now and then; moods from the Blender file's shape keys */
            if (t > me.blinkAt) {
              me.blinkT = t;
              me.blinkAt = t + rand(2.2, 5.5);
            }
            const bt = t - me.blinkT,
              bl = bt < 0 ? 0 : bt < 0.07 ? bt / 0.07 : bt < 0.17 ? 1 - (bt - 0.07) / 0.1 : 0;
            const mood = t < me.moodUntil ? me.mood : '';
            for (let i = 1; i < 4; i++) {
              inf[i] += ((mood === MORPHS[i] ? 1 : 0) - inf[i]) * Math.min(1, dt * 12);
              eyes.morphTargetInfluences[i] = inf[i];
            }
            eyes.morphTargetInfluences[0] = reduce ? 0 : bl * (1 - inf[1]);
            R.render(scene, cam);
          },
          destroy() {
            cv.remove();
            R.dispose();
          },
        };
        cv.addEventListener('click', () => me.hop());
        me.tick(0);
        requestAnimationFrame(() => cv.classList.add('on'));
        done(me);
      })
      .catch((e) => {
        console.warn('3D robot failed to load, showing the flat one instead:', e);
        LOAD.done('robot');
      });
  }

  function untrack(b) {
    if (!b) return;
    clearTimeout(b.timer);
    const i = BOTS.indexOf(b);
    if (i > -1) BOTS.splice(i, 1);
  }

  app.robots = { Bot, BOTS, make3D, untrack };
})((window.Garang = window.Garang || {}));
