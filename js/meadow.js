(function (app) {
  'use strict';

  const { SITE } = app;
  const { asset, texURL, LOAD, reduce, fine, rand, clamp, ptr } = app.runtime;

  /* ---------- the meadow: Garang's flower_scattering.blend, live ----------
   The real grass clumps, bluebells and dandelions from the Blender file, at the positions its geometry nodes
   scattered them (exported to img/meadow3d.js). Drawn with instancing; wind gusts bend every plant from the root,
   and like ball-in-grass.blend the grass leans away from whatever touches it, here the cursor.
   One canvas, moved between the home screen and whichever page is open. Falls back to meadow.webp without WebGL. */
  function createMeadow() {
    if (!window.THREE) {
      LOAD.done('meadow');
      return null;
    }
    const cv = document.createElement('canvas');
    cv.className = 'field';
    let R;
    try {
      R = new THREE.WebGLRenderer({
        canvas: cv,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch (e) {
      return null;
    }
    R.setClearColor(0x000000, 0);
    /* phones only (a short laptop window is not a phone): they get a lighter meadow */
    const small =
      matchMedia('(pointer:coarse)').matches && Math.min(screen.width, screen.height) < 600;
    const scene = new THREE.Scene(),
      cam = new THREE.PerspectiveCamera(30, 4, 0.05, 40);
    const probe = document.createElement('i');
    probe.style.cssText = 'position:absolute;color:var(--sky);visibility:hidden';
    // The hidden color probe travels with the canvas to inherit each page's sky.
    const skyCol = () => new THREE.Color(getComputedStyle(probe).color || '#cfe2fb');
    const U = {
      uT: { value: 0 },
      uP: { value: new THREE.Vector3(0, 0, 0) },
      uK: { value: new Float32Array(24) },
      uFog: { value: new THREE.Color() },
      uCam: { value: new THREE.Vector3() },
    };
    const WIND = `
uniform float uT; uniform vec3 uP; uniform vec3 uK[8];
float hsh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hsh(i), hsh(i + vec2(1, 0)), f.x), mix(hsh(i + vec2(0, 1)), hsh(i + vec2(1, 1)), f.x), f.y); }
/* lean of a plant rooted at xz, for a point h metres above the root */
vec3 lean(vec2 xz, float h){
  float gust = smoothstep(.3, 1., sin(xz.x * 1.1 - uT * 1.15 + xz.y * .6) * .5 + .5);
  float w = (vn(xz * 2.2 + vec2(-uT * .7, uT * .15)) - .4) * .9 + gust * 1.1 + sin(uT * 2.6 + xz.x * 5. + xz.y * 3.) * .06;
  vec2 d = normalize(vec2(1., .3)) * w * .55;
  vec2 to = xz - uP.xy; float dist = length(to);
  d += normalize(to + 1e-4) * uP.z * (1. - smoothstep(.0, .55, dist)) * 2.4;
  for(int i = 0; i < 8; i++){ vec2 tk = xz - uK[i].xy; float dk = length(tk); d += normalize(tk + 1e-4) * (1. - smoothstep(uK[i].z * .45, uK[i].z * 1.25, dk)) * 1.6 * step(.001, uK[i].z); }
  float k = h * h * 2.2;
  vec2 o = d * k;
  return vec3(o.x, -dot(o, o) * 1.2, o.y);
}`;
    /* the plant materials from flower_scattering.blend, ported node for node:
     grass and leaves: UT-colors_green ramp picked by a per-plant random, darkened veins from the UV-x ramp (overlay 0.072),
     blended by UV noise (scale 24.8); bluebell: two blues by noise, lighter tips (UV-y > .68), teal at the base;
     white and yellow petals; every material is half diffuse, half translucent, with a soft sheen at grazing angles. */
    const SHADE = `
uniform vec3 uFog; uniform vec3 uCam; uniform float uT;
varying vec3 vN; varying vec3 vW; varying float vH; varying vec2 vUV; varying float vM; varying float vR;
float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float nz(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hs(i), hs(i + vec2(1, 0)), f.x), mix(hs(i + vec2(0, 1)), hs(i + vec2(1, 1)), f.x), f.y); }
vec3 greens(float t){
  if(t < .16) return mix(vec3(.176, .312, .02), vec3(.04, .093, .009), t / .16);
  if(t < .65) return mix(vec3(.04, .093, .009), vec3(.084, .17, .006), (t - .16) / .49);
  return mix(vec3(.084, .17, .006), vec3(.079, .192, .005), clamp((t - .65) / .31, 0., 1.)); }
float veins(float x){
  if(x < .27) return mix(1., 0., x / .27);
  if(x < .35) return mix(0., .026, (x - .27) / .08);
  if(x < .48) return mix(.026, .809, (x - .35) / .13);
  if(x < .62) return mix(.809, .037, (x - .48) / .14);
  if(x < .74) return mix(.037, 0., (x - .62) / .12);
  return mix(0., .98, (x - .74) / .26); }
vec3 overlay(vec3 a, vec3 b){ return mix(2. * a * b, 1. - 2. * (1. - a) * (1. - b), step(.5, a)); }
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
void main(){
  int m = int(vM + .5); vec3 c; float trans = .5, gloss = .8;
  if(m == 0){
    vec3 g = greens(vR);
    vec3 c1 = mix(g, overlay(g, vec3(.072)), veins(vUV.x));
    c = mix(c1, g, nz((vUV + vec2(vR, 0.)) * 24.8));
  } else if(m == 1){
    vec3 a = mix(vec3(.037, .078, .8), vec3(.02, .04, .378), nz((vUV + vec2(vR, 0.)) * 40.));
    a = mix(a, vec3(.178, .364, 1.), smoothstep(.68, 1., vUV.y));
    c = mix(a, vec3(0., 1., .879), clamp(1. - vUV.y / .55, 0., 1.)); gloss = .544;
  } else if(m == 2){
    vec3 a = mix(vec3(1., .864, .715), vec3(.321, .091, .039), nz((vUV + vec2(vR, 0.)) * 40.));
    c = mix(a, vec3(.797, .8, .756), smoothstep(.68, 1., vUV.y));
  } else if(m == 3){
    c = mix(vec3(1., .711, .01), vec3(1., .609, .053), smoothstep(.7, 1., vUV.y)); trans = .15;
  } else { c = greens(vR); }
  c *= .94 + .12 * hs(vec2(vR, 3.));
  vec3 V = normalize(uCam - vW), n = normalize(vN); if(dot(n, V) < 0.) n = -n;
  vec3 L = normalize(vec3(-.45, .8, .38)), sun = vec3(3.6, 3.35, 2.9), sky = vec3(.34, .42, .52), bounce = vec3(.12, .16, .05);
  /* cloud shadows: two layers of noise drifting with the wind; they dim the sun, not the sky */
  float cloud = smoothstep(.42, .78, nz(vW.xz * .3 + vec2(-uT * .05, -uT * .015)) * .7 + nz(vW.xz * .9 + vec2(-uT * .11, 0.)) * .3);
  sun *= 1. - .42 * cloud;
  float ao = mix(.35, 1., smoothstep(0., .14, vH));
  vec3 amb = (sky * (.5 + .5 * n.y) + bounce * (.5 - .5 * n.y)) * ao;
  vec3 dif = c * (sun * max(dot(n, L), 0.) + amb);
  vec3 tr = min(c * 2., 1.) * (sun * max(dot(-n, L), 0.) * .9 + amb * .6);
  float fr = pow(1. - max(dot(n, V), 0.), 3.);
  vec3 col = mix(dif, tr, trans) + gloss * fr * .25 * (sky + sun * .15) * ao;
  col = aces(col * 1.12);
  col = mix(vec3(dot(col, vec3(.3, .59, .11))), col, 1.18);
  col = pow(col, vec3(1. / 2.2));
  float f = smoothstep(6., 16., length(uCam - vW));
  gl_FragColor = vec4(mix(col, uFog, f * .35), 1.);
}`;
    const half = (() => {
      const t = new Float32Array(65536);
      for (let i = 0; i < 65536; i++) {
        const s = i & 0x8000 ? -1 : 1,
          e = (i >> 10) & 31,
          m = i & 1023;
        t[i] =
          s *
          (e === 0
            ? (m / 1024) * Math.pow(2, -14)
            : e === 31
              ? m
                ? NaN
                : Infinity
              : (1 + m / 1024) * Math.pow(2, e - 15));
      }
      return (u) => {
        const f = new Float32Array(u.length);
        for (let i = 0; i < u.length; i++) f[i] = t[u[i]];
        return f;
      };
    })();
    const dec = (b, T) => {
      const s = atob(b),
        u = new Uint8Array(s.length);
      for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
      return new T(u.buffer);
    };
    const i8 = (b) => {
      const q = dec(b, Int8Array),
        f = new Float32Array(q.length);
      for (let i = 0; i < q.length; i++) f[i] = q[i] / 127;
      return f;
    };
    const u8 = (b) => {
      const q = dec(b, Uint8Array),
        f = new Float32Array(q.length);
      for (let i = 0; i < q.length; i++) f[i] = Math.pow(q[i] / 255, 1);
      return f;
    };
    const ray = new THREE.Raycaster(),
      ndc = new THREE.Vector2();
    let ground = null,
      ready = false,
      groundY = () => 0,
      onScreen = () => true;
    const meadowBots = [],
      grassMeshes = [];
    let seeds = null;

    /* ---------- dandelion seeds ----------
     seeds come off the real dandelion heads (the yellow petal vertices, mid 3, grouped) and ride the
     same wind as the grass. a few leave on their own when a gust goes by, and swiping fast across the
     meadow blows some off the dandelions under the cursor. each head holds a few and grows them back.
     all one Points draw call; the shader draws each seed as a little parachute */
    function createSeeds(F) {
      const P = F.attributes.position.array,
        mid = F.attributes.mid.array;
      const cells = new Map();
      for (let i = 0; i < mid.length; i++) {
        if (Math.round(mid[i]) !== 3) continue;
        const x = P[i * 3],
          y = P[i * 3 + 1],
          z = P[i * 3 + 2];
        const key = Math.round(x / 0.05) + ',' + Math.round(z / 0.05);
        const c = cells.get(key) || { x: 0, y: -1e9, z: 0, n: 0 };
        c.x += x;
        c.z += z;
        c.y = Math.max(c.y, y);
        c.n++;
        cells.set(key, c);
      }
      const heads = [...cells.values()].map((c) => ({
        x: c.x / c.n,
        y: c.y + 0.01,
        z: c.z / c.n,
        left: 6,
      }));
      if (!heads.length) return null;

      const MAX = small ? 90 : 220;
      const pos = new Float32Array(MAX * 3),
        alpha = new Float32Array(MAX),
        spin = new Float32Array(MAX);
      const pool = Array.from({ length: MAX }, (_, i) => ({
        i,
        live: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        age: 0,
        life: 0,
        seed: Math.random() * 100,
      }));
      const G = new THREE.BufferGeometry();
      G.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
      G.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
      G.setAttribute('spin', new THREE.BufferAttribute(spin, 1).setUsage(THREE.DynamicDrawUsage));
      const M = new THREE.ShaderMaterial({
        uniforms: { uScale: { value: 1 }, uFog: U.uFog, uCam: U.uCam },
        transparent: true,
        depthWrite: false,
        vertexShader: `attribute float alpha; attribute float spin; uniform float uScale;
varying float vA; varying float vS; varying vec3 vW;
void main(){ vec4 mv = viewMatrix * vec4(position, 1.); vA = alpha; vS = spin; vW = position;
  gl_PointSize = .1 * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform vec3 uFog; uniform vec3 uCam; varying float vA; varying float vS; varying vec3 vW;
void main(){
  vec2 p = gl_PointCoord * 2. - 1.; float c = cos(vS), s = sin(vS); p = mat2(c, -s, s, c) * p;
  float r = length(p), a = atan(p.y, p.x);
  /* a fan of filaments over the top, a dot for the seed, and a short stalk joining them */
  float fan = smoothstep(.75, 1., cos(a * 9.)) * step(.18, r) * step(r, .92) * step(p.y, .05) * (1. - r * .6);
  float tip = (1. - smoothstep(.82, .98, r)) * step(.84, r) * step(p.y, 0.) * .6;
  float stalk = step(abs(p.x), .05) * step(0., p.y) * step(p.y, .55);
  float body = 1. - smoothstep(.09, .17, length(p - vec2(0., .6)));
  float m = max(max(fan, tip), max(stalk * .8, body));
  if(m * vA < .02) discard;
  float f = smoothstep(6., 16., length(uCam - vW));
  gl_FragColor = vec4(mix(vec3(1., .99, .95), uFog, f * .3), min(1., m * vA * 1.15));
}`,
      });
      const points = new THREE.Points(G, M);
      points.frustumCulled = false;
      points.renderOrder = 10;
      scene.add(points);

      const DIR = { x: 0.958, z: 0.287 }; // normalize(1, .3), the wind direction in lean()
      const gustAt = (x, z, t) =>
        THREE.MathUtils.smoothstep(Math.sin(x * 1.1 - t * 1.15 + z * 0.6) * 0.5 + 0.5, 0.3, 1);
      function spawn(h, kick) {
        const s = pool.find((p) => !p.live);
        if (!s || h.left < 1) return;
        h.left--;
        Object.assign(s, {
          live: true,
          x: h.x + (Math.random() - 0.5) * 0.03,
          y: h.y,
          z: h.z + (Math.random() - 0.5) * 0.03,
          vx: kick.x + (Math.random() - 0.5) * 0.15,
          vy: 0.12 + Math.random() * 0.18,
          vz: kick.z + (Math.random() - 0.5) * 0.15,
          age: 0,
          life: 7 + Math.random() * 5,
        });
      }
      let ambient = 0,
        regrow = 0;
      const tmp = new THREE.Vector2();

      return {
        update(dt, t, swipe) {
          if (!dt) return;
          /* now and then a seed leaves on its own, more often where a gust is passing */
          ambient += dt * (small ? 0.5 : 1.2);
          while (ambient > 1) {
            ambient--;
            const h = heads[(Math.random() * heads.length) | 0];
            if (gustAt(h.x, h.z, t) > 0.3) spawn(h, { x: DIR.x * 0.3, z: DIR.z * 0.3 });
          }
          /* swiping fast blows seeds off the heads near where the cursor is in the grass */
          if (swipe) {
            const near = heads.filter(
              (h) => h.left > 0 && Math.hypot(h.x - swipe.x, h.z - swipe.z) < 0.6
            );
            const n = Math.min(near.length, 4, Math.floor(swipe.speed / 10));
            for (let k = 0; k < n; k++)
              spawn(near[(Math.random() * near.length) | 0], { x: swipe.dx * 0.9, z: swipe.dz * 0.9 });
          }
          regrow += dt;
          if (regrow > 3) {
            regrow = 0;
            for (const h of heads) if (h.left < 6) h.left++;
          }

          for (const s of pool) {
            if (!s.live) {
              alpha[s.i] = 0;
              continue;
            }
            s.age += dt;
            const g = gustAt(s.x, s.z, t);
            const speed = 0.22 + g * 0.6;
            const flutter = Math.sin(t * 1.9 + s.seed) * 0.12;
            /* drift with the wind, lift a bit in gusts, sink slowly otherwise */
            const k = Math.min(1, dt * 1.4);
            s.vx += (DIR.x * speed - DIR.z * flutter - s.vx) * k;
            s.vz += (DIR.z * speed + DIR.x * flutter - s.vz) * k;
            s.vy += (0.03 + g * 0.1 - 0.05 + Math.sin(t * 2.3 + s.seed * 2) * 0.04 - s.vy) * k;
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.z += s.vz * dt;
            if (s.age > s.life) s.live = false;
            const fade =
              Math.min(1, s.age / 0.4) * (1 - THREE.MathUtils.smoothstep(s.age, s.life - 1.5, s.life));
            pos[s.i * 3] = s.x;
            pos[s.i * 3 + 1] = s.y;
            pos[s.i * 3 + 2] = s.z;
            alpha[s.i] = s.live ? fade : 0;
            spin[s.i] = Math.sin(t * 0.8 + s.seed) * 0.5 + Math.atan2(s.vy, s.vx) * 0.2;
          }
          G.attributes.position.needsUpdate = true;
          G.attributes.alpha.needsUpdate = true;
          G.attributes.spin.needsUpdate = true;
          /* pixels per metre at distance 1, so seeds get smaller further away */
          R.getDrawingBufferSize(tmp);
          M.uniforms.uScale.value = tmp.y / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2));
        },
      };
    }

    function build(d) {
      /* grass clumps, instanced */
      for (const k of ['medium', 'long']) {
        const g = d[k],
          G = new THREE.InstancedBufferGeometry();
        G.setAttribute('position', new THREE.BufferAttribute(dec(g.pos, Float32Array), 3));
        /* The exported clumps retain sideways offsets from Blender's source layout.
         Center their footprints on the scattered terrain anchors, otherwise entire
         tufts can hang beyond the hill despite their instance origins being grounded. */
        G.computeBoundingBox();
        const center = G.boundingBox.getCenter(new THREE.Vector3());
        G.translate(-center.x, 0, -center.z);
        G.setAttribute('normal', new THREE.BufferAttribute(i8(g.nrm), 3));
        G.setAttribute('uv', new THREE.BufferAttribute(half(dec(g.uv, Uint16Array)), 2));
        G.setAttribute(
          'mid',
          new THREE.BufferAttribute(new Float32Array(dec(g.mid, Uint8Array)), 1)
        );
        G.setIndex(new THREE.BufferAttribute(dec(g.idx, Uint16Array), 1));
        let T = half(dec(g.inst, Uint16Array)),
          n = g.count;
        if (small) {
          const keep = Math.round(n * 0.5),
            out = new Float32Array(keep * 9);
          for (let i = 0; i < keep; i++)
            out.set(
              T.subarray(Math.floor((i * n) / keep) * 9, Math.floor((i * n) / keep) * 9 + 9),
              i * 9
            );
          T = out;
          n = keep;
        }
        const IB = new THREE.InstancedInterleavedBuffer(T, 9, 1);
        G.setAttribute('ipos', new THREE.InterleavedBufferAttribute(IB, 3, 0));
        G.setAttribute('iquat', new THREE.InterleavedBufferAttribute(IB, 4, 3));
        G.setAttribute('isc', new THREE.InterleavedBufferAttribute(IB, 2, 7));
        G.instanceCount = n;
        const M = new THREE.ShaderMaterial({
          uniforms: U,
          side: THREE.DoubleSide,
          vertexShader:
            WIND +
            `
attribute vec3 ipos; attribute vec4 iquat; attribute vec2 isc; attribute float mid;
varying vec3 vN; varying vec3 vW; varying float vH; varying vec2 vUV; varying float vM; varying float vR;
vec3 qrot(vec4 q, vec3 v){ return v + 2. * cross(q.xyz, cross(q.xyz, v) + q.w * v); }
void main(){
  vec3 p = position * vec3(isc.x * 1.12, isc.y, isc.x * 1.12);
  vec3 w = qrot(iquat, p) + ipos;
  float h = max(w.y - ipos.y, 0.);
  w += lean(ipos.xz, h);
  vR = hsh(ipos.xz * 7.13); vUV = uv; vM = mid; vN = qrot(iquat, normal); vW = w; vH = h;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.); }`,
          fragmentShader: SHADE,
        });
        const mesh = new THREE.Mesh(G, M);
        mesh.frustumCulled = false;
        scene.add(mesh);
        mesh.userData.full = n;
        grassMeshes.push(mesh);
      }
      /* bluebells and dandelions, one merged mesh; each vertex knows its height above its root */
      const f = d.flowers,
        F = new THREE.BufferGeometry();
      F.setAttribute('position', new THREE.BufferAttribute(half(dec(f.pos, Uint16Array)), 3));
      F.setAttribute('normal', new THREE.BufferAttribute(i8(f.nrm), 3));
      F.setAttribute('uv', new THREE.BufferAttribute(half(dec(f.uv, Uint16Array)), 2));
      F.setAttribute('mid', new THREE.BufferAttribute(new Float32Array(dec(f.mid, Uint8Array)), 1));
      F.setAttribute(
        'rnd',
        new THREE.BufferAttribute(
          Float32Array.from(dec(f.rnd, Uint8Array), (v) => v / 255),
          1
        )
      );
      F.setAttribute('h', new THREE.BufferAttribute(half(dec(f.h, Uint16Array)), 1));
      F.setIndex(new THREE.BufferAttribute(dec(f.idx, f.wide ? Uint32Array : Uint16Array), 1));
      const FM = new THREE.ShaderMaterial({
        uniforms: U,
        side: THREE.DoubleSide,
        vertexShader:
          WIND +
          `
attribute float h; attribute float mid; attribute float rnd;
varying vec3 vN; varying vec3 vW; varying float vH; varying vec2 vUV; varying float vM; varying float vR;
void main(){
  vec3 w = position; vec2 root = w.xz;
  w += lean(root, h);
  vR = rnd; vUV = uv; vM = mid; vN = normal; vW = w; vH = h + .06;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.); }`,
        fragmentShader: SHADE,
      });
      const fm = new THREE.Mesh(F, FM);
      fm.frustumCulled = false;
      scene.add(fm);
      if (!reduce) seeds = createSeeds(F);
      /* the ground */
      const g = d.ground,
        GG = new THREE.BufferGeometry();
      GG.setAttribute('position', new THREE.BufferAttribute(dec(g.pos, Float32Array), 3));
      GG.setIndex(new THREE.BufferAttribute(dec(g.idx, g.wide ? Uint32Array : Uint16Array), 1));
      ground = new THREE.Mesh(
        GG,
        new THREE.ShaderMaterial({
          uniforms: U,
          vertexShader: `varying vec3 vW; void main(){ vW = position; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.); }`,
          /* same cloud shadows as the plants, so they pass over the ground too */
          fragmentShader: `uniform vec3 uFog; uniform vec3 uCam; uniform float uT; varying vec3 vW;
float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float nz(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hs(i), hs(i + vec2(1, 0)), f.x), mix(hs(i + vec2(0, 1)), hs(i + vec2(1, 1)), f.x), f.y); }
void main(){ float f = smoothstep(6., 16., length(uCam - vW)); float n = hs(floor(vW.xz * 90.)); vec3 g = mix(vec3(.05, .1, .02), vec3(.16, .26, .05), n * n);
  float cloud = smoothstep(.42, .78, nz(vW.xz * .3 + vec2(-uT * .05, -uT * .015)) * .7 + nz(vW.xz * .9 + vec2(-uT * .11, 0.)) * .3);
  g *= 1. - .3 * cloud;
  gl_FragColor = vec4(mix(pow(g, vec3(.85)), uFog, f * .35), 1.); }`,
        })
      );
      scene.add(ground);
      buildGroundPicker(GG, ground.material);
      cam.position.fromArray(d.cam.pos);
      aim.fromArray(d.cam.aim);
      cam.aspect = 3.4;
      cam.updateProjectionMatrix();
      cam.lookAt(aim);

      /* a few robots wandering in the grass: sprite-sheet billboards inside the 3D scene, so blades in front hide their feet */
      const FRW = {
        original: 140,
        crimson: 120,
        cobalt: 157,
        sunflower: 119,
        teal: 117,
        snow: 122,
      };
      const down = new THREE.Raycaster(),
        dv = new THREE.Vector3(0, -1, 0);
      const HM = d.hmap,
        hm = half(dec(HM.h, Uint16Array)),
        HN = HM.n;
      groundY = (x, z) => {
        const fx = clamp((x - HM.b[0]) / (HM.b[1] - HM.b[0]), 0, 1) * (HN - 1),
          fz = clamp((z - HM.b[2]) / (HM.b[3] - HM.b[2]), 0, 1) * (HN - 1);
        const i = Math.min(HN - 2, fx | 0),
          j = Math.min(HN - 2, fz | 0),
          u = fx - i,
          v = fz - j,
          a = hm[j * HN + i],
          b2 = hm[j * HN + i + 1],
          c = hm[(j + 1) * HN + i],
          e = hm[(j + 1) * HN + i + 1];
        return (a * (1 - u) + b2 * u) * (1 - v) + (c * (1 - u) + e * u) * v;
      };
      const view = new THREE.Vector3();
      onScreen = (x, z) => {
        view.set(x, groundY(x, z) + 0.3, z).project(cam);
        return Math.abs(view.x) < 0.8 && view.y > -0.7 && view.y < -0.05;
      };
      SITE.meadowBots.forEach((look, k) => {
        const H = 0.62,
          Wd = (H * (FRW[look] || 100)) / 150;
        const tex = new THREE.TextureLoader().load(
          texURL(`img/sheet-${look}.webp?v=26`),
          (t) => {
            const fw = (t.image.width / 18 / t.image.height) * 150;
            m.geometry.dispose();
            m.geometry = new THREE.PlaneGeometry((H * fw) / 150, H).translate(0, H / 2 + 0.04, 0);
          },
          undefined,
          () => {
            m.visible = false;
          }
        );
        tex.encoding = THREE.sRGBEncoding;
        const mat = new THREE.ShaderMaterial({
          transparent: false,
          uniforms: { map: { value: tex }, frame: { value: 0 }, flip: { value: 1 } },
          vertexShader: `varying vec2 vU; uniform float frame; uniform float flip; void main(){ vU = vec2((frame + (flip > 0. ? uv.x : 1. - uv.x)) / 18., uv.y); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
          fragmentShader: `uniform sampler2D map; varying vec2 vU; void main(){ vec4 c = texture2D(map, vU); if(c.a < .5) discard; gl_FragColor = vec4(pow(c.rgb, vec3(1.)), 1.); }`,
        });
        const geo = new THREE.PlaneGeometry(Wd, H);
        geo.translate(0, H / 2 + 0.04, 0);
        const m = new THREE.Mesh(geo, mat);
        scene.add(m);
        const b = {
          m,
          mat,
          x: 0,
          z: 0,
          tx: 0,
          tz: 0,
          t: Math.random() * 5,
          wait: 1 + k,
          dir: 1,
          hd: 0,
          hopT: -9,
          hopH: 0.2,
          happy: 0,
          look: 0,
          near: false,
          cool: 0,
        };
        /* each robot has its own patch of the hill (left, middle, right) and never leaves it, so they never meet */
        b.zone = () => {
          const k2 = meadowBots.indexOf(b),
            n = meadowBots.length,
            wz = 1.36 / n;
          return [-0.68 + wz * k2 + 0.06, -0.68 + wz * (k2 + 1) - 0.06];
        };
        /* where to walk next: inside its own patch, mostly sideways on screen and a fair way off, so every walk reads
         as a walk (a step mostly towards or away from the camera would look like marching on the spot) */
        const sp = new THREE.Vector3();
        const spot = (from) => {
          const [x0, x1] = b.zone();
          let fx = 0,
            fy = -0.4;
          if (from) {
            sp.set(b.x, groundY(b.x, b.z), b.z).project(cam);
            fx = sp.x;
            fy = sp.y;
          }
          for (let tries = 0; tries < 60; tries++) {
            const nx = x0 + Math.random() * (x1 - x0),
              ny = from
                ? clamp(fy + (Math.random() - 0.5) * 0.14, -0.6, -0.22)
                : -0.22 - Math.random() * 0.38;
            if (from && Math.abs(nx - fx) < (x1 - x0) * 0.38) continue;
            const p = pickOnScreen(nx, ny);
            if (p && rocks.every((r) => Math.hypot(p.x - r.x, p.z - r.z) > r.r + 0.3)) return p;
          }
          return null;
        };
        b.place = () => {
          const p = spot(false);
          if (p) {
            b.x = p.x;
            b.z = p.z;
          }
          b.tx = b.x;
          b.tz = b.z;
          b.placed = true;
          b.state = 'stand';
          b.stateT = b.t;
        };
        b.pick = () => {
          const p = spot(true);
          if (p) {
            b.tx = p.x;
            b.tz = p.z;
          }
          b.visit = null;
          return !!p;
        };
        meadowBots.push(b);
      });
      /* rocks from tree_leaves_moss_geo-nodes-demo.blend, half sunk into the hill, with moss on their tops */
      asset('rocks')
        .then((list) => {
          const RM = new THREE.ShaderMaterial({
            uniforms: U,
            vertexShader: `varying vec3 vN; varying vec3 vW; varying vec3 vL; void main(){ vN = normalize(mat3(modelMatrix) * normal); vL = position; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
            fragmentShader: `uniform vec3 uFog; uniform vec3 uCam; varying vec3 vN; varying vec3 vW; varying vec3 vL;
float hs(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(mix(hs(i), hs(i + vec3(1,0,0)), f.x), mix(hs(i + vec3(0,1,0)), hs(i + vec3(1,1,0)), f.x), f.y), mix(mix(hs(i + vec3(0,0,1)), hs(i + vec3(1,0,1)), f.x), mix(hs(i + vec3(0,1,1)), hs(i + vec3(1,1,1)), f.x), f.y), f.z); }
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
void main(){
  vec3 n = normalize(vN); float t = n3(vL * 6.) * .6 + n3(vL * 19.) * .4;
  vec3 c = t < .5 ? mix(vec3(.112, .161, .164), vec3(.075, .106, .094), t * 2.) : mix(vec3(.075, .106, .094), vec3(.103, .105, .075), t * 2. - 1.);
  c *= .8 + .5 * n3(vL * 40.);
  float moss = smoothstep(.25, .6, n.y + (n3(vL * 4.) - .5) * .7);
  c = mix(c, mix(vec3(.05, .08, .01), vec3(.2, .26, .03), n3(vL * 55.)), moss);
  vec3 L = normalize(vec3(-.45, .8, .38));
  vec3 col = c * (vec3(3.6, 3.35, 2.9) * max(dot(n, L), 0.) + vec3(.34, .42, .52) * (.5 + .5 * n.y));
  col = pow(aces(col * 1.12), vec3(1. / 2.2));
  gl_FragColor = vec4(mix(col, uFog, smoothstep(6., 16., length(uCam - vW)) * .35), 1.); }`,
          });
          const geos = list.slice(0, 2).map((g) => {
            const G = new THREE.BufferGeometry();
            G.setAttribute('position', new THREE.BufferAttribute(dec(g.pos, Float32Array), 3));
            G.setAttribute('normal', new THREE.BufferAttribute(i8(g.nrm), 3));
            G.setIndex(new THREE.BufferAttribute(dec(g.idx, Uint16Array), 1));
            return G;
          });
          ROCKS.forEach(([sx, sy, s, ry, gi], k) => {
            const m = new THREE.Mesh(geos[gi], RM);
            m.scale.setScalar(s);
            m.rotation.set(0.12 * (k - 1), ry, 0.08 * k);
            scene.add(m);
            rocks.push({ m, sx, sy, s, x: 0, z: 0, r: s * 0.5 });
          });
          placeRocks();
        })
        .catch(() => {});

      /* the bots notice the cursor: they turn to look, hop when it comes close, and hop higher if you click by them */
      addEventListener(
        'pointerdown',
        (e) => {
          for (const b of meadowBots) {
            if (b.sx != null && Math.hypot(e.clientX - b.sx, e.clientY - b.sy) < 70) {
              b.hopT = b.t;
              b.happy = b.t + 1.4;
              b.hopH = 0.32;
            }
          }
        },
        { passive: true }
      );
      ready = true;
      w = 0;
    }
    /* rocks: where they sit on screen (x and y from -1 to 1), size, turn, shape */
    const ROCKS = [
      [-0.62, -0.62, 0.4, 0.6, 0],
      [0.42, -0.4, 0.46, 2.1, 1],
      [0.55, -0.3, 0.24, 4.0, 0],
    ];
    /* a point on the hill under a spot on screen (x and y from -1 to 1) */
    const v3p = new THREE.Vector3();
    /* does the view ray through (x, y) on screen meet the hill? Marches along the ray over the height map (cheap, no raycast) */
    const rp = new THREE.Vector3(),
      rd = new THREE.Vector3();
    function hitsHill(x, y) {
      rp.copy(cam.position);
      rd.set(x, y, 0.5).unproject(cam).sub(rp).normalize();
      for (let t = 0.2, s = 0.04; t < 30; t += s, s *= 1.03) {
        const px = rp.x + rd.x * t,
          py = rp.y + rd.y * t,
          pz = rp.z + rd.z * t;
        if (py < groundY(px, pz)) return true;
      }
      return false;
    }
    /* fraction of the strip's height between its top edge and the highest point of the hill, across the width */
    function crestGap() {
      let worst = 1;
      for (let i = 0; i <= 24; i++) {
        const x = -1 + i / 12;
        if (!hitsHill(x, -1)) continue;
        let lo = -1,
          hi = 1;
        for (let k = 0; k < 11; k++) {
          const m = (lo + hi) / 2;
          if (hitsHill(x, m)) lo = m;
          else hi = m;
        }
        worst = Math.min(worst, (1 - lo) / 2);
      }
      return worst;
    }
    function pickOnScreen(x, y) {
      if (!ground) return null;
      ray.setFromCamera(ndc.set(x, y), cam);
      const hit = ray.intersectObject(ground)[0];
      return hit ? { x: hit.point.x, z: hit.point.z } : null;
    }
    /* Picking-only chunks share the exact ground vertices. Tight bounds let raycasting
     skip distant triangles without simplifying the visible meadow or cursor contact. */
    const groundPickMeshes = [];
    function buildGroundPicker(geometry, material) {
      const pos = geometry.attributes.position,
        indices = geometry.index.array,
        cells = 16;
      geometry.computeBoundingBox();
      const bounds = geometry.boundingBox,
        width = bounds.max.x - bounds.min.x,
        depth = bounds.max.z - bounds.min.z;
      const buckets = Array.from({ length: cells * cells }, () => []);
      for (let i = 0; i < indices.length; i += 3) {
        const a = indices[i],
          b = indices[i + 1],
          c = indices[i + 2];
        const x = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3;
        const z = (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3;
        const ix = clamp(Math.floor(((x - bounds.min.x) / width) * cells), 0, cells - 1);
        const iz = clamp(Math.floor(((z - bounds.min.z) / depth) * cells), 0, cells - 1);
        buckets[iz * cells + ix].push(a, b, c);
      }
      const point = new THREE.Vector3();
      for (const bucket of buckets) {
        if (!bucket.length) continue;
        const chunk = new THREE.BufferGeometry();
        chunk.setAttribute('position', pos);
        chunk.setIndex(new THREE.BufferAttribute(new Uint32Array(bucket), 1));
        chunk.boundingBox = new THREE.Box3();
        for (const index of bucket)
          chunk.boundingBox.expandByPoint(point.fromBufferAttribute(pos, index));
        chunk.boundingSphere = chunk.boundingBox.getBoundingSphere(new THREE.Sphere());
        /* Never added to the scene: these meshes are only queried, never rendered. */
        groundPickMeshes.push(new THREE.Mesh(chunk, material));
      }
    }
    function pickGround() {
      return ray.intersectObjects(groundPickMeshes, false)[0];
    }
    function inView(x, z) {
      v3p.set(x, groundY(x, z), z).project(cam);
      return Math.abs(v3p.x) < 0.72 && v3p.y > -0.66 && v3p.y < -0.12;
    }
    function placeRocks() {
      if (!ground) return;
      for (const rk of rocks) {
        ray.setFromCamera(ndc.set(rk.sx, rk.sy), cam);
        const hit = ray.intersectObject(ground)[0];
        if (!hit) continue;
        rk.x = hit.point.x;
        rk.z = hit.point.z;
        rk.m.position.set(rk.x, groundY(rk.x, rk.z) - rk.s * 0.3, rk.z);
      }
    }
    const rocks = [];
    const aim = new THREE.Vector3();
    asset('meadow3d')
      .then((d) => {
        build(d);
        LOAD.done('meadow');
      })
      .catch((e) => {
        console.warn('Meadow failed to load, showing the still picture instead:', e);
        LOAD.done('meadow');
      });
    let host = null,
      w = 0,
      h = 0;
    const push = { x: 0, z: 0, s: 0 };
    return {
      fc: 0,
      attach(el) {
        host = el;
        el.appendChild(cv);
        el.appendChild(probe);
        w = 0;
      },
      detach(el) {
        if (host === el) {
          host = null;
          cv.remove();
          probe.remove();
        }
      },
      draw(t) {
        if (!host || !ready) return;
        const r = host.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight || r.width < 2) return;
        if (r.width !== w || r.height !== h) {
          w = r.width;
          h = r.height;
          R.setPixelRatio(this.lowres ? 1 : Math.min(devicePixelRatio || 1, small ? 1.25 : 1.6));
          R.setSize(w, h, false);
          cam.aspect = w / h;
          /* keep the horizontal view of the Blender camera, and frame the hill so its crest sits near the top */
          const hf = THREE.MathUtils.degToRad(
            cam.aspect > 3.4 ? 54.4 : 54.4 * Math.max(0.62, cam.aspect / 3.4)
          );
          cam.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hf / 2) / cam.aspect));
          cam.updateProjectionMatrix();
          let lookY = aim.y + 0.2 + Math.max(0, 3.4 / cam.aspect - 1) * 0.25;
          const frame = () => {
            cam.lookAt(aim.x, lookY, aim.z);
            cam.updateMatrixWorld(true);
            cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
          };
          frame();
          /* on wide, short windows the strip is very stretched and the hill's crest rises close to its top edge, where the tallest
           grass and flowers would be sliced off in a straight line. Measure the gap between the crest and the top edge and tilt
           the camera up until there is room for them */
          const room = clamp(h * 0.2, 54, 90),
            D = cam.position.distanceTo(aim),
            half = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * D;
          for (let k = 0; k < 4; k++) {
            const g = crestGap() * h;
            if (g >= room - 2) break;
            lookY += ((room - g) / h) * 2 * half * 1.05;
            frame();
          }
          U.uFog.value.copy(skyCol());
          U.uCam.value.copy(cam.position);
          host.classList.add('live');
          placeRocks();
          for (const b of meadowBots) if (!b.placed || !inView(b.x, b.z)) b.place();
        }
        let target = 0;
        if (
          performance.now() - ptr.at < 1500 &&
          ptr.x > r.left &&
          ptr.x < r.right &&
          ptr.y > r.top - 40 &&
          ptr.y < r.bottom
        ) {
          ndc.set(((ptr.x - r.left) / w) * 2 - 1, -(((ptr.y - r.top) / h) * 2 - 1));
          ray.setFromCamera(ndc, cam);
          const hit = pickGround();
          if (hit) {
            push.x += (hit.point.x - push.x) * 0.3;
            push.z += (hit.point.z - push.z) * 0.3;
            target = 1;
          }
        }
        /* the full meadow is always drawn. If a machine is still slow a few seconds after loading has settled, draw at a
         lower resolution once instead (the first seconds are always slow while shaders compile, so they don't count) */
        const now = performance.now();
        if (document.documentElement.classList.contains('loaded')) {
          this.since = this.since || now;
          if (this.pt && now - this.since > 3000) {
            const ft = now - this.pt;
            if (ft < 200) this.ft = this.ft ? this.ft * 0.97 + ft * 0.03 : ft;
          }
          if (!this.lowres && now - this.since > 7000 && this.ft > 30) {
            this.lowres = true;
            R.setPixelRatio(1);
            R.setSize(w, h, false);
          }
        }
        this.pt = now;
        push.s += (target - push.s) * 0.08;
        U.uT.value = reduce ? 0 : t;
        U.uP.value.set(push.x, push.z, push.s);
        /* bots: wander on curving paths, stop and look around, visit each other, and react to the cursor */
        const dt = Math.min(0.1, t - (this.lt || t) || 0);
        this.lt = t;
        const v3 = new THREE.Vector3();
        let ki = 0;
        const K = U.uK.value;
        K.fill(0);
        for (const b of meadowBots) {
          b.t += dt;
          v3.set(b.x, groundY(b.x, b.z) + 0.35, b.z).project(cam);
          b.sx = r.left + (v3.x * 0.5 + 0.5) * w;
          b.sy = r.top + (-v3.y * 0.5 + 0.5) * h;
          /* the cursor counts as near with a little slack, so a bot doesn't flicker between noticing and not */
          const cd = Math.hypot(ptr.x - b.sx, ptr.y - b.sy),
            live = fine && performance.now() - ptr.at < 2500;
          const cursorNear = live && cd < (b.near ? 190 : 140);
          if (cursorNear && !b.near && b.t > b.cool) {
            b.hopT = b.t;
            b.hopH = 0.16;
            b.happy = b.t + 1;
            b.cool = b.t + 3;
          }
          b.near = cursorNear;
          /* two clear states, walking and standing, and each lasts a while once started */
          if (!b.state) {
            b.state = 'stand';
            b.stateT = b.t;
          }
          const dx = b.tx - b.x,
            dz = b.tz - b.z,
            dist = Math.hypot(dx, dz),
            held = b.t - b.stateT;
          let frame,
            want = b.dir,
            side = false;
          if (cursorNear) {
            if (Math.abs(ptr.x - b.sx) > 60) want = ptr.x > b.sx ? 1 : -1;
            frame = b.t < b.happy ? 15 : 0;
            if (b.state !== 'stand') {
              b.state = 'stand';
              b.stateT = b.t;
            }
            b.wait = Math.max(b.wait, 1.2);
          } else if (b.state === 'turn') {
            /* turning round before setting off: a moment in the front view, then it faces the way it's going */
            frame = 0;
            if (held > 0.24) {
              b.dir = b.go;
              b.flipT = b.t;
              want = b.go;
              b.state = 'walk';
              b.stateT = b.t;
              b.spd = 0;
            }
          } else if (b.state === 'walk' && !reduce) {
            /* a straight line to a spot inside its own patch, facing the way it moves on screen the whole way. The legs are
             driven by distance actually covered, so they can never move without the robot moving */
            b.hd = Math.atan2(dz, dx);
            b.spd = Math.min(1, (b.spd || 0) + dt * 4) * Math.min(1, dist / 0.06 + 0.5);
            const s = Math.min(dist, 0.3 * b.spd * dt);
            b.x += Math.cos(b.hd) * s;
            b.z += Math.sin(b.hd) * s;
            b.stride = (b.stride || 0) + s;
            want = b.go || b.dir;
            side = true;
            frame = 6 + (Math.floor(b.stride / 0.03) % 8);
            if (dist <= 0.005) {
              b.x = b.tx;
              b.z = b.tz;
              b.state = 'stand';
              b.stateT = b.t;
              b.spd = 0;
              b.wait = 3 + Math.random() * 4;
              b.look = Math.random() < 0.5 ? b.t : -99;
              if (b.visit) {
                want = b.visit.x > b.x ? 1 : -1;
                b.happy = b.t + 1.6;
                b.hopT = b.t;
                b.hopH = 0.12;
                if (b.visit.state === 'stand') {
                  b.visit.dir = -want;
                  b.visit.happy = b.t + 1.6;
                }
              }
            }
          } else {
            b.wait -= dt;
            if (b.wait <= 0 && held > 1.5 && !reduce) {
              if (b.pick()) {
                /* which way it will move on screen decides which way it faces; turn first if needed */
                const p0 = new THREE.Vector3(b.x, groundY(b.x, b.z), b.z).project(cam),
                  p1 = new THREE.Vector3(b.tx, groundY(b.tx, b.tz), b.tz).project(cam);
                b.go = p1.x > p0.x ? 1 : -1;
                b.state = b.go === b.dir ? 'walk' : 'turn';
                b.stateT = b.t;
                b.spd = 0;
              } else b.wait = 1;
            }
            /* standing: breathe and blink; sometimes one long look to the side partway through */
            const lt = b.t - b.look,
              k = Math.floor(b.t * 5) % 10;
            if (b.t < b.happy) frame = 15;
            else if (lt > 1.5 && lt < 3.5) {
              frame = 14;
              side = true;
            } else frame = b.t % 4.3 < 0.14 ? 17 : [0, 1, 2, 3, 4, 5, 4, 3, 2, 1][k];
          }
          /* facing changes at most once a second, with a brief front view in between */
          if (
            b.state !== 'walk' &&
            b.state !== 'turn' &&
            want !== b.dir &&
            b.t - (b.flipT || -9) > 1
          ) {
            b.dir = want;
            b.flipT = b.t;
          }
          if (b.state !== 'walk' && b.t - (b.flipT || -9) < 0.16 && frame === 14) frame = 0;
          const faceTo = b.dir;
          const hu = (b.t - b.hopT) / 0.45,
            lift = hu > 0 && hu < 1 ? Math.sin(hu * Math.PI) * b.hopH : 0;
          /* only side and walking views are mirrored; the front view never is, since the robots aren't symmetrical */
          b.mat.uniforms.frame.value = frame;
          b.mat.uniforms.flip.value = frame >= 6 && frame <= 14 ? faceTo : 1;
          b.m.position.set(b.x, groundY(b.x, b.z) + lift, b.z);
          b.m.rotation.y = Math.atan2(cam.position.x - b.x, cam.position.z - b.z);
          if (ki < 8) {
            K[ki * 3] = b.x;
            K[ki * 3 + 1] = b.z;
            K[ki * 3 + 2] = 0.32;
            ki++;
          }
        }
        for (const rk of rocks)
          if (ki < 8) {
            K[ki * 3] = rk.x;
            K[ki * 3 + 1] = rk.z;
            K[ki * 3 + 2] = rk.r * 1.1;
            ki++;
          }
        if (seeds) {
          /* a swipe = the cursor moving fast over the grass just now */
          const fast =
            target === 1 && performance.now() - ptr.at < 80 && Math.abs(ptr.vx) > 10;
          const push3 = Math.sign(ptr.vx) * Math.min(1, Math.abs(ptr.vx) / 40);
          seeds.update(
            dt,
            t,
            fast ? { x: push.x, z: push.z, speed: Math.abs(ptr.vx), dx: push3, dz: 0 } : null
          );
        }
        R.render(scene, cam);
      },
    };
  }

  app.createMeadow = createMeadow;
})((window.Garang = window.Garang || {}));
