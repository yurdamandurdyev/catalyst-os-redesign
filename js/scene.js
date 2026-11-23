import * as THREE from 'three';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('gl');
if (canvas && !reduce) init();

function init() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  const DPR = Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05060b, 0.028);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.set(0, 0, 16);

  const group = new THREE.Group();
  scene.add(group);

  const palette = [new THREE.Color(0x3b6cff), new THREE.Color(0x6ea8ff), new THREE.Color(0x7c5cff), new THREE.Color(0x22d3ee)];
  const isMobile = innerWidth < 760;
  const COUNT = isMobile ? 900 : 1700;

  // ---- particle cloud ----
  const pos = new Float32Array(COUNT * 3);
  const col = new Float32Array(COUNT * 3);
  const siz = new Float32Array(COUNT);
  const seed = new Float32Array(COUNT);
  const pts = [];
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
    siz[i] = 0.6 + Math.random() * 2.2;
    seed[i] = Math.random() * Math.PI * 2;
  }
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pgeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  pgeo.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));
  pgeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));

  const pmat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    uniforms: { uTime: { value: 0 }, uDPR: { value: DPR } },
    vertexShader: `
      attribute float aSize; attribute float aSeed;
      uniform float uTime; uniform float uDPR;
      varying vec3 vColor; varying float vTw;
      void main(){
        vColor = color;
        vec3 p = position;
        p.y += sin(uTime*0.4 + aSeed)*0.5;
        p.x += cos(uTime*0.3 + aSeed*1.7)*0.4;
        vTw = 0.55 + 0.45*sin(uTime*1.4 + aSeed*3.0);
        vec4 mv = modelViewMatrix * vec4(p,1.0);
        gl_PointSize = aSize * uDPR * (90.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vColor; varying float vTw;
      void main(){
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float a = smoothstep(0.5, 0.0, d);
        a *= a;
        gl_FragColor = vec4(vColor, a * vTw * 0.9);
      }`
  });
  const points = new THREE.Points(pgeo, pmat);
  group.add(points);

  // ---- neural links ----
  const lp = [];
  const lc = [];
  const links = isMobile ? 160 : 380;
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
  }
  const lgeo = new THREE.BufferGeometry();
  lgeo.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  lgeo.setAttribute('color', new THREE.Float32BufferAttribute(lc, 3));
  const lmat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.12, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false });
  group.add(new THREE.LineSegments(lgeo, lmat));

  // ---- core: wireframe icosahedron + rings ----
  const core = new THREE.Group();
  core.position.set(isMobile ? 0 : 4.2, 0.4, -2);
  const ico = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.4, 1),
    new THREE.MeshBasicMaterial({ color: 0x3b6cff, wireframe: true, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending })
  );
  core.add(ico);
  const ico2 = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.5, 0),
    new THREE.MeshBasicMaterial({ color: 0x7c5cff, wireframe: true, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending })
  );
  core.add(ico2);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x6ea8ff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.02, 8, 120), ringMat);
  ring1.rotation.x = Math.PI / 2.3;
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(4.1, 0.015, 8, 120), ringMat.clone());
  ring2.material.color.set(0x22d3ee); ring2.material.opacity = 0.22;
  ring2.rotation.x = Math.PI / 1.7; ring2.rotation.y = 0.5;
  core.add(ring1, ring2);
  group.add(core);

  // ---- interaction state ----
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', e => {
    mouse.tx = (e.clientX / innerWidth - 0.5) * 2;
    mouse.ty = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize);

  let scroll = 0;
  function readScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    scroll = max > 0 ? scrollY / max : 0;
  }
  addEventListener('scroll', readScroll, { passive: true });
  readScroll();

  let running = true;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) clock.start(); });

  const clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    if (!running) return;
    const t = clock.getElapsedTime();
    pmat.uniforms.uTime.value = t;

    mouse.x += (mouse.tx - mouse.x) * 0.04;
    mouse.y += (mouse.ty - mouse.y) * 0.04;

    group.rotation.y = t * 0.03 + scroll * 1.4 + mouse.x * 0.12;
    group.rotation.x = mouse.y * 0.08 + scroll * 0.25;
    core.rotation.y = t * 0.25;
    core.rotation.z = t * 0.1;
    ico2.rotation.x = t * 0.4;
    ring1.rotation.z = t * 0.3;
    ring2.rotation.z = -t * 0.22;

    camera.position.x += (mouse.x * 1.6 - camera.position.x) * 0.05;
    camera.position.y += (-mouse.y * 1.1 - camera.position.y) * 0.05;
    camera.position.z = 16 - scroll * 5;
    camera.lookAt(0, 0, -2);

    const fade = 1 - scroll * 0.35;
    pmat.opacity = fade;
    lmat.opacity = 0.12 * fade;

    renderer.render(scene, camera);
  }
  frame();
}
