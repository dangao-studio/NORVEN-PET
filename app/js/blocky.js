/* 諾文小鎮：方塊小人
 * 讀角色的麥塊 skin（64×64），組成頭、身體、手、腳六塊，外層（頭髮、外套、裙襬）稍微浮出來。
 * 介面跟 N.picto 一樣：make() 回傳 { root, height, pickables, setPose, update }。
 * 比例：1 格 = 0.05，整個人 32 格高 = 1.6。 */
(function () {
  "use strict";
  const N = window.NOVUM = window.NOVUM || {};
  const P = 0.05;
  let T = null;
  const texCache = {}, matCache = {};
  function skinOf(id) { return N.skins && N.skins[id]; }
  function tex(id) {
    if (texCache[id]) return texCache[id];
    const t = new T.TextureLoader().load("icons/skins/" + skinOf(id).f + ".png");
    t.magFilter = T.NearestFilter; t.minFilter = T.NearestFilter; t.generateMipmaps = false;
    return (texCache[id] = t);
  }
  function mats(id) {
    if (matCache[id]) return matCache[id];
    const t = tex(id);
    // 加一點自發光，讓昏暗的房間裡也看得清楚臉和衣服
    const base = new T.MeshLambertMaterial({ map: t, emissive: 0xFFFFFF, emissiveMap: t, emissiveIntensity: 0.22 });
    const over = new T.MeshLambertMaterial({ map: t, emissive: 0xFFFFFF, emissiveMap: t, emissiveIntensity: 0.22, transparent: true, alphaTest: 0.5, side: T.DoubleSide });
    return (matCache[id] = { base, over });
  }
  // 一個方塊，依麥塊的展開圖設定六個面的貼圖位置
  function part(w, h, d, u, v, grow, m) {
    const g = new T.BoxGeometry((w + grow) * P, (h + grow) * P, (d + grow) * P), uv = g.attributes.uv;
    const rects = [[u + d + w, v + d, d, h], [u, v + d, d, h], [u + d, v, w, d], [u + d + w, v, w, d], [u + d, v + d, w, h], [u + d + w + d, v + d, w, h]];
    for (let f = 0; f < 6; f++) {
      const [x0, y0, rw, rh] = rects[f];
      for (let k = 0; k < 4; k++) { const i = f * 4 + k, a = uv.getX(i), b = uv.getY(i); uv.setXY(i, (x0 + a * rw) / 64, 1 - (y0 + (1 - b) * rh) / 64); }
    }
    const o = new T.Mesh(g, m); o.castShadow = true; return o;
  }
  function make(three, id) {
    T = three;
    const sk = skinOf(id); if (!sk) return null;
    const { base, over } = mats(id), aw = sk.slim ? 3 : 4;
    const root = new T.Group(), rig = new T.Group(); root.add(rig);
    const body = new T.Group(); rig.add(body);
    const meshes = [];
    // 以關節為軸心：x,y,z 是關節位置（格），dy 是方塊中心相對關節的位移
    const limb = (w, h, d, u, v, ou, ov, grow, x, y, z, dy) => {
      const g = new T.Group(); g.position.set(x * P, y * P, z * P); body.add(g);
      const a = part(w, h, d, u, v, 0, base), b = part(w, h, d, ou, ov, grow, over);
      a.position.y = b.position.y = dy * P; g.add(a, b); meshes.push(a, b); return g;
    };
    const head = limb(8, 8, 8, 0, 0, 32, 0, 1, 0, 24, 0, 4);
    limb(8, 12, 4, 16, 16, 16, 32, 0.5, 0, 18, 0, 0);
    const ra = limb(aw, 12, 4, 40, 16, 40, 32, 0.5, -(4 + aw / 2), 22, 0, -4);
    const la = limb(aw, 12, 4, 32, 48, 48, 48, 0.5, 4 + aw / 2, 22, 0, -4);
    const rl = limb(4, 12, 4, 0, 16, 0, 32, 0.5, -2, 12, 0, -6);
    const ll = limb(4, 12, 4, 16, 48, 0, 48, 0.5, 2, 12, 0, -6);
    root.traverse(o => { if (o.isMesh) o.userData.char = id; });
    const st = { rig, body, head, arms: [la, ra], legs: [ll, rl], pose: "stand", phase: Math.random() * 6, talkT: 0 };
    return {
      root, height: 1.6,
      pickables: () => meshes,
      setPose: (p, hz) => setPose(st, p, hz),
      update: (dt, tt, o) => update(st, dt, tt, o || {})
    };
  }
  function setPose(st, p, hz) {
    if (st.pose === p) return; st.pose = p;
    st.rig.rotation.set(0, 0, 0); st.rig.position.set(0, 0, 0); st.legs.forEach(g => g.rotation.set(0, 0, 0));
    if (p === "sit") { st.legs.forEach(g => { g.rotation.x = -Math.PI / 2; }); st.rig.position.y = -0.56; }
    if (p === "lie") { st.rig.rotation.x = -Math.PI / 2; st.rig.position.set(0, 0.12, (hz == null ? -0.5 : hz) + 1.4); }
  }
  // o = { walking, asleep, talking }
  function update(st, dt, tt, o) {
    const ph = st.phase, [la, ra] = st.arms, [ll, rl] = st.legs;
    let ax = 0, bodyY = 0, nod = 0;
    if (st.pose === "stand" && o.walking) {
      const w = Math.sin(tt * 9 + ph); ll.rotation.x = w * 0.55; rl.rotation.x = -w * 0.55; ax = w * 0.6; bodyY = Math.abs(Math.cos(tt * 9 + ph)) * 0.025;
    } else if (st.pose === "stand") { ll.rotation.x = rl.rotation.x = 0; bodyY = o.asleep ? 0 : Math.sin(tt * 1.6 + ph) * 0.006; }
    else if (st.pose === "sit") ax = -0.5;
    if (o.talking) { st.talkT += dt; nod = Math.sin(st.talkT * 7) * 0.08; } else st.talkT = 0;
    la.rotation.set(-ax, 0, -0.05); ra.rotation.set(ax, 0, 0.05);
    // 桌寵：被拎起來時手腳晃來晃去；揮手
    if (o.held) {
      const s = Math.sin(tt * 5 + ph);
      ll.rotation.x = s * 0.35; rl.rotation.x = -s * 0.35;
      la.rotation.set(-0.35 + s * 0.15, 0, -0.5); ra.rotation.set(-0.35 - s * 0.15, 0, 0.5);
      bodyY = 0;
    } else if (o.wave) {
      ra.rotation.set(-2.6 + Math.sin(tt * 10) * 0.25, 0, 0.25);
    }
    st.head.rotation.x = o.asleep && st.pose !== "lie" ? 0.35 : nod;
    st.body.position.y = bodyY;
  }
  N.blocky = { make, has: id => !!skinOf(id) };
})();
