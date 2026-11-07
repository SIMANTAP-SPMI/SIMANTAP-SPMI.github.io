/* SIMANTAP 2.0 · Hero 3D (Three.js): kristal mutu di pusat, orbit 5 tahap PPEPP,
   dan cincin batang capaian prodi. Ringan, berhenti saat tab tersembunyi. */
import * as THREE from '../vendor/three.module.min.js';

let stop = null;

export function disposeHero() { if (stop) { stop(); stop = null; } }

export function mountHero(canvas, bars = []) {
  disposeHero();
  if (!canvas) return;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
  catch (e) { console.warn('WebGL tidak tersedia', e); return; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  cam.position.set(0, 1.6, 9);

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const d1 = new THREE.DirectionalLight(0xffffff, 1.4); d1.position.set(4, 6, 5); scene.add(d1);
  const p1 = new THREE.PointLight(0x6ee7b7, 30, 20); p1.position.set(-4, 2, 3); scene.add(p1);
  const p2 = new THREE.PointLight(0xa78bfa, 30, 20); p2.position.set(4, -2, 2); scene.add(p2);

  const world = new THREE.Group();
  world.position.x = window.innerWidth > 1180 ? 2.6 : 0;
  scene.add(world);

  // Kristal pusat
  const crystal = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.15, 1),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.1, roughness: 0.15, clearcoat: 1, flatShading: true, transparent: true, opacity: 0.92, emissive: 0x0ea5e9, emissiveIntensity: 0.18 })
  );
  world.add(crystal);
  const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.18 }));
  world.add(wire);

  // Orbit PPEPP
  const orbit = new THREE.Group(); orbit.rotation.x = 1.15; world.add(orbit);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.012, 8, 160), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 }));
  orbit.add(ring);
  const cols = [0x10b981, 0x0ea5e9, 0x8b5cf6, 0xf5a524, 0xf472b6];
  const balls = cols.map((c, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 32), new THREE.MeshStandardMaterial({ color: c, roughness: 0.25, metalness: 0.2, emissive: c, emissiveIntensity: 0.35 }));
    m.userData.a = i / cols.length * Math.PI * 2; orbit.add(m); return m;
  });

  // Cincin batang capaian prodi
  const barG = new THREE.Group(); barG.position.y = -1.9; world.add(barG);
  const bmeshes = bars.map((b, i) => {
    const h = Math.max(0.15, b.v * 1.6);
    const geo = new THREE.BoxGeometry(0.34, 1, 0.34); geo.translate(0, 0.5, 0);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: new THREE.Color(b.c || '#6ee7b7'), roughness: 0.3, metalness: 0.15, transparent: true, opacity: 0.95 }));
    const a = i / Math.max(1, bars.length) * Math.PI * 2;
    mesh.position.set(Math.cos(a) * 1.7, 0, Math.sin(a) * 1.7);
    mesh.scale.y = 0.01; mesh.userData.h = h; barG.add(mesh); return mesh;
  });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.05, 64), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 }));
  barG.add(disc);

  // Partikel
  const N = 380, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - .5) * 22; pos[i * 3 + 1] = (Math.random() - .5) * 12; pos[i * 3 + 2] = (Math.random() - .5) * 10 - 2; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.035, transparent: true, opacity: 0.6 }));
  scene.add(pts);

  let mx = 0, my = 0;
  const onMove = (e) => { const r = canvas.getBoundingClientRect(); mx = ((e.clientX - r.left) / r.width - .5); my = ((e.clientY - r.top) / r.height - .5); };
  canvas.parentElement.addEventListener('mousemove', onMove);

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    world.position.x = w > 900 ? 2.6 : 0; world.position.y = w > 900 ? 0.2 : (w < 600 ? 3.4 : 2.2);
    world.scale.setScalar(w > 900 ? 1 : 0.62);
  };
  const ro = new ResizeObserver(resize); ro.observe(canvas);
  resize();

  let raf, t0 = performance.now(), running = true;
  const tick = (t) => {
    const s = (t - t0) / 1000;
    crystal.rotation.y = s * 0.35; crystal.rotation.x = Math.sin(s * 0.4) * 0.25;
    wire.rotation.y = -s * 0.15; wire.rotation.z = s * 0.1;
    balls.forEach((b, i) => { const a = b.userData.a + s * 0.5; b.position.set(Math.cos(a) * 2.4, Math.sin(a) * 2.4, Math.sin(s * 1.5 + i) * 0.08); });
    bmeshes.forEach((m, i) => { const target = m.userData.h; const p = Math.min(1, Math.max(0, (s - 0.3 - i * 0.12) / 1.2)); m.scale.y = 0.01 + (target - 0.01) * (1 - Math.pow(1 - p, 3)); });
    barG.rotation.y = s * 0.18;
    pts.rotation.y = s * 0.02;
    world.rotation.y += ((mx * 0.5) - world.rotation.y) * 0.04;
    world.rotation.x += ((my * 0.25) - world.rotation.x) * 0.04;
    renderer.render(scene, cam);
    if (running) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  const vis = () => { if (document.hidden) { running = false; cancelAnimationFrame(raf); } else if (!running) { running = true; raf = requestAnimationFrame(tick); } };
  document.addEventListener('visibilitychange', vis);

  stop = () => {
    running = false; cancelAnimationFrame(raf); ro.disconnect();
    document.removeEventListener('visibilitychange', vis);
    canvas.parentElement && canvas.parentElement.removeEventListener('mousemove', onMove);
    scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    renderer.dispose();
  };
}
