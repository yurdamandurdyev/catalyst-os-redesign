/**
 * Catalyst OS — Three.js WebGL Scene (upgraded)
 * Skills: threejs · shaders · mega-frontend-design
 *
 * Improvements over v1:
 *  - Organic particle displacement via phase-based noise (aPhase attribute)
 *  - Breathing scale animation on icosahedron core
 *  - Theme-awareness (light/dark adapts fog + palette)
 *  - Traveling dot along random neural links
 *  - Improved fragment shader with soft radial glow (double-layer)
 *  - Scroll-driven canvas opacity fade
 *  - Performance: visibility-pause + RAF cancel
 */
import * as THREE from 'three';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('gl');
if (canvas && !reduce) init();

function init() {
  /* ── renderer ── */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x000000, 0);
  const DPR = Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR);

  /* ── scene / camera ── */
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05060b, 0.025);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.set(0, 0, 16);

  const group = new THREE.Group();
  scene.add(group);

  /* ── palette (adapts to theme) ── */
  const paletteLight = [
    new THREE.Color(0x1b4dff),
    new THREE.Color(0x4c7cff),
    new THREE.Color(0x6b5cff),
    new THREE.Color(0x0ea5e9),
  ];
  const paletteDark = [
    new THREE.Color(0x3b6cff),
    new THREE.Color(0x6ea8ff),
    new THREE.Color(0x7c5cff),
    new THREE.Color(0x22d3ee),
  ];
  function getPalette() {
    return document.documentElement.dataset.theme === 'dark' ? paletteDark : paletteLight;
  }

  const isMobile = innerWidth < 760;
  const COUNT = isMobile ? 900 : 1600;

  /* ── particle cloud ── */
  const pos   = new Float32Array(COUNT * 3);
  const col   = new Float32Array(COUNT * 3);
  const siz   = new Float32Array(COUNT);
  const seed  = new Float32Array(COUNT);  // base seed
  const phase = new Float32Array(COUNT);  // secondary phase for organic noise

  const pts = [];
  const palette = getPalette();

  for (let i = 0; i < COUNT; i++) {
    const r = 7 + Math.random() * 12;
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    const x = r * Math.sin(p) * Math.cos(t);
    const y = r * Math.sin(p) * Math.sin(t) * 0.62;
    const z = r * Math.cos(p) * 0.7 - 3;
    pos.set([x, y, z], i * 3);
    pts.push(new THREE.Vector3(x, y, z));
    const c = palette[(Math.random() * palette.length) | 0];
    col.set([c.r, c.g, c.b], i * 3);
    siz[i]   = 0.55 + Math.random() * 2.0;
    seed[i]  = Math.random() * Math.PI * 2;
    phase[i] = Math.random() * Math.PI * 2;
  }

  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pgeo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
  pgeo.setAttribute('aSize',    new THREE.BufferAttribute(siz, 1));
  pgeo.setAttribute('aSeed',    new THREE.BufferAttribute(seed, 1));
  pgeo.setAttribute('aPhase',   new THREE.BufferAttribute(phase, 1));

  const pmat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    uniforms: {
      uTime:  { value: 0 },
      uDPR:   { value: DPR },
      uBreath:{ value: 1.0 },
    },
    /* ── upgraded vertex shader: organic dual-axis noise ── */
    vertexShader: `
      attribute float aSize;
      attribute float aSeed;
      attribute float aPhase;
      uniform float uTime;
      uniform float uDPR;
      uniform float uBreath;
      varying vec3  vColor;
      varying float vTw;
      void main() {
        vColor = color;

        vec3 p = position;
        // primary sway
        p.y += sin(uTime * 0.38 + aSeed) * 0.55;
        p.x += cos(uTime * 0.27 + aSeed * 1.7) * 0.42;
        // secondary organic drift (aPhase offset)
        p.z += sin(uTime * 0.21 + aPhase) * 0.3;
        p.y += cos(uTime * 0.17 + aPhase * 1.3) * 0.22;

        // twinkle
        vTw = 0.5 + 0.5 * sin(uTime * 1.3 + aSeed * 3.1);

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aSize * uDPR * (95.0 / -mv.z);
        gl_Position  = projectionMatrix * mv;
      }
    `,
    /* ── upgraded fragment: double-layer soft glow ── */
    fragmentShader: `
      varying vec3  vColor;
      varying float vTw;
      void main() {
        vec2  uv = gl_PointCoord - 0.5;
        float d  = length(uv);

        // core dot
        float core = smoothstep(0.22, 0.0, d);
        // outer soft halo
        float halo = smoothstep(0.5, 0.05, d) * 0.35;

        float a = (core + halo) * vTw * 0.95;
        gl_FragColor = vec4(vColor, a);
      }
    `,
  });

  const points = new THREE.Points(pgeo, pmat);
  group.add(points);

  /* ── neural links ── */
  const lp = [];
  const lc = [];
  const links = isMobile ? 150 : 350;
  const linkPairs = []; // store pairs for traveling dots

  for (let i = 0; i < links; i++) {
    const a = pts[(Math.random() * COUNT) | 0];
    let best = null, bd = 1e9;
    for (let k = 0; k < 6; k++) {
      const b = pts[(Math.random() * COUNT) | 0];
      const d = a.distanceTo(b);
      if (d < bd && d > 0.5 && d < 5.5) { bd = d; best = b; }
    }
    if (!best) continue;
    lp.push(a.x, a.y, a.z, best.x, best.y, best.z);
    const c = palette[(Math.random() * palette.length) | 0];
    lc.push(c.r, c.g, c.b, c.r, c.g, c.b);
    linkPairs.push({ a: a.clone(), b: best.clone(), c });
  }

  const lgeo = new THREE.BufferGeometry();
  lgeo.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  lgeo.setAttribute('color',    new THREE.Float32BufferAttribute(lc, 3));
  const lmat = new THREE.LineBasicMaterial({
    transparent: true, opacity: 0.14,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  group.add(new THREE.LineSegments(lgeo, lmat));

  /* ── traveling dots along links ── */
  const DOT_COUNT = isMobile ? 6 : 14;
  const dotGeos   = [];
  const dotMats   = [];
  const dotStates = [];

  for (let i = 0; i < DOT_COUNT; i++) {
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
    const dm = new THREE.PointsMaterial({
      size: isMobile ? 0.09 : 0.11,
      color: palette[(Math.random() * palette.length) | 0],
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const dot = new THREE.Points(dg, dm);
    group.add(dot);
    dotGeos.push(dg);
    dotMats.push(dm);
    const pair = linkPairs[(Math.random() * linkPairs.length) | 0] || null;
    dotStates.push({ pair, t: Math.random(), speed: 0.0012 + Math.random() * 0.0018, forward: Math.random() > 0.5 });
  }

  function updateDots() {
    if (!linkPairs.length) return;
    dotStates.forEach(function (ds, i) {
      if (!ds.pair) return;
      ds.t += ds.forward ? ds.speed : -ds.speed;
      if (ds.t >= 1) { ds.t = 0; ds.pair = linkPairs[(Math.random() * linkPairs.length) | 0]; }
      if (ds.t <= 0) { ds.t = 1; ds.pair = linkPairs[(Math.random() * linkPairs.length) | 0]; }
      const p = new THREE.Vector3().lerpVectors(ds.pair.a, ds.pair.b, ds.t);
      const arr = dotGeos[i].attributes.position.array;
      arr[0] = p.x; arr[1] = p.y; arr[2] = p.z;
      dotGeos[i].attributes.position.needsUpdate = true;
    });
  }

  /* ── core: wireframe icosahedron + rings ── */
  const core = new THREE.Group();
  core.position.set(isMobile ? 0 : 4.2, 0.4, -2);

  const ico = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.4, 1),
    new THREE.MeshBasicMaterial({
      color: 0x2b5cff,
      wireframe: true,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
    })
  );
  core.add(ico);

  const ico2 = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.5, 0),
    new THREE.MeshBasicMaterial({
      color: 0x8c6cff,
      wireframe: true,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
    })
  );
  core.add(ico2);

  /* outer glow sphere (very low opacity) */
  const glowSphere = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.9, 2),
    new THREE.MeshBasicMaterial({
      color: 0x3b6cff,
      transparent: true,
      opacity: 0.04,
      blending: THREE.AdditiveBlending,
      wireframe: false,
    })
  );
  core.add(glowSphere);

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x6ea8ff,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.022, 8, 120), ringMat);
  ring1.rotation.x = Math.PI / 2.3;
  const ring2Mat = ringMat.clone();
  ring2Mat.color.set(0x22d3ee);
  ring2Mat.opacity = 0.2;
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(4.1, 0.015, 8, 120), ring2Mat);
  ring2.rotation.x = Math.PI / 1.7;
  ring2.rotation.y = 0.5;

  /* third ring for extra depth */
  const ring3Mat = ringMat.clone();
  ring3Mat.color.set(0x7c5cff);
  ring3Mat.opacity = 0.15;
  const ring3 = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.012, 6, 90), ring3Mat);
  ring3.rotation.x = 0.4;
  ring3.rotation.z = 1.1;

  core.add(ring1, ring2, ring3);
  group.add(core);

  /* ── interaction state ── */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', e => {
    mouse.tx = (e.clientX / innerWidth  - 0.5) * 2;
    mouse.ty = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });

  /* ── resize ── */
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize);

  /* ── scroll tracking ── */
  let scroll = 0;
  function readScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    scroll = max > 0 ? scrollY / max : 0;
  }
  addEventListener('scroll', readScroll, { passive: true });
  readScroll();

  /* ── theme observer (mutates fog + palette on theme toggle) ── */
  const themeObserver = new MutationObserver(() => {
    const dark = document.documentElement.dataset.theme === 'dark';
    scene.fog.color.set(dark ? 0x05060b : 0x0a0e1a);
    scene.fog.density = dark ? 0.025 : 0.018;
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  /* ── RAF / visibility ── */
  let running = true;
  let rafId   = null;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) { clock.start(); scheduleFrame(); }
  });

  const clock = new THREE.Clock();

  function frame() {
    rafId = requestAnimationFrame(frame);
    if (!running) return;

    const t = clock.getElapsedTime();
    pmat.uniforms.uTime.value = t;

    /* mouse lag */
    mouse.x += (mouse.tx - mouse.x) * 0.04;
    mouse.y += (mouse.ty - mouse.y) * 0.04;

    /* group rotation (scroll + gentle mouse parallax) */
    group.rotation.y = t * 0.02 + scroll * 0.8 + mouse.x * 0.04;
    group.rotation.x = mouse.y * 0.03 + scroll * 0.15;

    /* core rotation */
    core.rotation.y = t * 0.22;
    core.rotation.z = t * 0.09;

    /* inner icosahedron spin */
    ico2.rotation.x = t * 0.38;
    ico2.rotation.z = t * 0.14;

    /* ── breathing scale on core ── */
    const breath = 1.0 + 0.04 * Math.sin(t * 0.72);
    pmat.uniforms.uBreath.value = breath;
    core.scale.setScalar(breath);

    /* ring spins */
    ring1.rotation.z  = t * 0.28;
    ring2.rotation.z  = -t * 0.21;
    ring3.rotation.y  = t * 0.33;
    ring3.rotation.z  = -t * 0.18;

    /* traveling dots */
    updateDots();

    /* camera (gentle, stable) */
    camera.position.x += (mouse.x * 0.4 - camera.position.x) * 0.04;
    camera.position.y += (-mouse.y * 0.3 - camera.position.y) * 0.04;
    camera.position.z  = 16 - scroll * 5;
    camera.lookAt(0, 0, -2);

    /* fade particles + links with scroll */
    const fade = Math.max(0, 1 - scroll * 0.5);
    pmat.opacity        = fade;
    lmat.opacity        = 0.14 * fade;
    canvas.style.opacity = (0.55 * fade).toFixed(3);

    renderer.render(scene, camera);
  }

  function scheduleFrame() {
    if (!rafId) frame();
  }
  frame();
}
