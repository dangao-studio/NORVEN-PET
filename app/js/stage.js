/* 諾文桌寵：桌面舞台
 * 角色自己走路、坐下、打瞌睡、自言自語；兩個人碰到會聊天或拌嘴。
 * 可以戳、可以拎起來丟下。視窗是透明的，只有滑鼠移到角色身上才會接收點擊。 */
(function () {
  "use strict";
  const N = window.NOVUM, P = N.pet, E = N.engine, T = window.THREE;
  const params = new URLSearchParams(location.search);
  const STREAM = params.get("mode") === "stream";
  const host = window.pet || {
    desktop: false, setIgnore() {}, openPanel() {}, idleSeconds: async () => 0, onResumed() {}
  };
  const DESKTOP = !!host.desktop && !STREAM;
  if (STREAM) document.body.classList.add("stream");
  if (params.get("bg") === "transparent") document.body.classList.add("clear");

  let set = P.settings();
  let save = P.loadSave();

  const SIZE_PX = { s: 72, m: 100, l: 136 };
  const FONT_PX = { s: 12, m: 13, l: 15 };
  const GROUND_PX = 3;
  const WALK = 1.15;            // 每秒走幾格（1 格約等於身高的 0.6）
  const TALK_GAP = {            // 兩次聊天之間隔幾秒
    quiet: [260, 480], normal: [110, 230], lively: [45, 110]
  };
  const MUTTER_P = { quiet: 0.04, normal: 0.10, lively: 0.18 };

  /* ── three.js ── */
  const canvas = document.getElementById("cv");
  const layer = document.getElementById("layer");
  const renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: false, premultipliedAlpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  const scene = new T.Scene();
  scene.add(new T.HemisphereLight(0xFFFFFF, 0x8A7A66, 0.95));
  const sun = new T.DirectionalLight(0xFFFFFF, 0.55); sun.position.set(3, 6, 8); scene.add(sun);
  const cam = new T.OrthographicCamera(0, 1, 1, 0, 0.1, 100);
  cam.position.set(0, 0, 40);

  let W = innerWidth, H = innerHeight, scale = 60;
  const groundY = () => GROUND_PX / scale;
  const worldW = () => W / scale;
  function layout() {
    const old = scale;
    W = innerWidth; H = innerHeight;
    scale = SIZE_PX[set.size] / 1.6;
    renderer.setSize(W, H, false);
    cam.left = 0; cam.right = W / scale; cam.top = H / scale; cam.bottom = 0;
    cam.updateProjectionMatrix();
    document.documentElement.style.setProperty("--fs", FONT_PX[set.size] + "px");
    if (old !== scale) for (const p of pets) p.x = p.x * old / scale;
    for (const p of pets) p.x = Math.max(edgeL(), Math.min(edgeR(), p.x));
  }
  const edgeL = () => 0.6, edgeR = () => Math.max(1.2, worldW() - 0.6);

  // 腳下的影子
  const shadowTex = (() => {
    const c = document.createElement("canvas"); c.width = 64; c.height = 16;
    const g = c.getContext("2d");
    g.setTransform(1, 0, 0, 0.25, 0, 0);
    const gr = g.createRadialGradient(32, 32, 1, 32, 32, 31);
    gr.addColorStop(0, "rgba(30,20,10,.42)"); gr.addColorStop(1, "rgba(30,20,10,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return new T.CanvasTexture(c);
  })();
  function makeShadow() {
    const m = new T.Mesh(new T.PlaneGeometry(1.1, 0.22), new T.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    m.renderOrder = -1; scene.add(m); return m;
  }

  /* ── 小工具 ── */
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : "";
  const charOf = id => P.charById(id) || { color: "#A87633", male: false };
  const lines = id => N.petLines[id] || {};
  const voice = id => N.voices[id] || {};
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const now = () => Date.now();
  let userIdle = 0;           // 秒

  /* ── 角色 ── */
  const pets = [];
  function makePet(id, enterFrom) {
    const fig = N.blocky.make(T, id);
    if (!fig) return null;
    scene.add(fig.root);
    const b = document.createElement("div"); b.className = "bubble"; b.style.setProperty("--c", charOf(id).color); layer.appendChild(b);
    const tag = document.createElement("div"); tag.className = "tag"; tag.textContent = charOf(id).full || id; layer.appendChild(tag);
    const side = enterFrom || (Math.random() < 0.5 ? "L" : "R");
    const p = {
      id, fig, shadow: makeShadow(), bubble: b, tag,
      x: side === "L" ? -0.8 : worldW() + 0.8, y: 0, vy: 0, z: rand(-0.4, 0.4),
      face: 0, faceT: 0, mode: "enter", t: 0, tx: rand(edgeL() + 0.5, edgeR() - 0.5),
      sayUntil: 0, zzzAt: now() + rand(4000, 9000), partner: null, pose: "stand", lastPoke: 0, waveUntil: 0
    };
    pets.push(p);
    return p;
  }
  function removePet(p) {
    scene.remove(p.fig.root); scene.remove(p.shadow);
    p.bubble.remove(); p.tag.remove();
    const i = pets.indexOf(p); if (i >= 0) pets.splice(i, 1);
  }
  const petById = id => pets.find(p => p.id === id);

  function setPose(p, pose) { if (p.pose !== pose) { p.pose = pose; p.fig.setPose(pose); } }

  /* ── 泡泡 ── */
  function say(p, text, opt) {
    if (!text) return 0;
    opt = opt || {};
    const dur = opt.dur || Math.min(6500, 1700 + text.length * 120);
    p.bubble.className = "bubble" + (opt.zzz ? " zzz" : "");
    p.bubble.innerHTML = `<span class="who">${esc(charOf(p.id).full || p.id)}</span>${esc(text)}`;
    p.bubble.dataset.lean = opt.lean || "";
    requestAnimationFrame(() => p.bubble.classList.add("on"));
    p.sayUntil = now() + dur;
    p.talking = !opt.zzz;
    return dur;
  }
  function hush(p) { p.bubble.classList.remove("on"); p.sayUntil = 0; p.talking = false; }

  /* ── 行為 ── */
  function idle(p, sec) { p.mode = "idle"; p.t = sec; setPose(p, "stand"); p.faceT = rand(-0.35, 0.35); }
  function walkTo(p, x, mode) { p.mode = mode || "walk"; p.tx = Math.max(edgeL(), Math.min(edgeR(), x)); setPose(p, "stand"); }
  const sideFace = () => (Math.random() < 0.5 ? -1 : 1) * rand(0.65, 1.0);   // 坐著時側一點，看得到腳
  function sit(p, sec) { p.mode = "sit"; p.t = sec; setPose(p, "sit"); p.faceT = sideFace(); }
  function sleep(p) { p.mode = "sleep"; p.t = rand(25, 45); setPose(p, "sit"); p.faceT = sideFace(); p.zzzAt = now() + rand(2500, 6000); }
  const busy = p => ["held", "fall", "hop", "talk", "approach", "wait", "leave", "enter"].indexOf(p.mode) >= 0;

  function wantsSleep(p) {
    if (STREAM) return false;
    if (P.sleepingNow(p.id)) return true;
    return userIdle > 900 && Math.random() < 0.45;   // 你離開很久，大家也開始打瞌睡
  }
  function decide(p) {
    if (wantsSleep(p)) { sleep(p); return; }
    const r = Math.random();
    if (r < 0.42) walkTo(p, p.x + rand(-6, 6));
    else if (r < 0.62) sit(p, rand(8, 22));
    else if (r < 0.62 + MUTTER_P[set.talk]) { idle(p, rand(4, 7)); say(p, pick(voice(p.id).mutter)); }
    else idle(p, rand(3, 8));
  }

  /* ── 兩個人碰面：聊天或拌嘴 ── */
  let talkAt = now() + rand(25, 50) * 1000;
  function scheduleTalk() { const g = TALK_GAP[set.talk] || TALK_GAP.normal; talkAt = now() + rand(g[0], g[1]) * 1000; }
  function pairWeight(a, b) {
    let w = 1 + Math.max(0, P.bondOf(save, a, b) - 30) / 20;
    if (N.banter[P.pk(a, b)]) w *= 2.5;
    return w;
  }
  function startTalk() {
    const free = pets.filter(p => !busy(p) && p.mode !== "sleep");
    if (free.length < 2) return false;
    const pairs = [];
    for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++) pairs.push([free[i], free[j], pairWeight(free[i].id, free[j].id)]);
    let tot = pairs.reduce((s, x) => s + x[2], 0), r = Math.random() * tot, pr = pairs[0];
    for (const x of pairs) { r -= x[2]; if (r <= 0) { pr = x; break; } }
    let [a, b] = Math.random() < 0.5 ? [pr[0], pr[1]] : [pr[1], pr[0]];
    a.partner = b; b.partner = a;
    b.mode = "wait"; setPose(b, "stand"); hush(b);
    const side = a.x < b.x ? -1 : 1;
    let tx = b.x + side * 1.15;
    if (tx < edgeL() || tx > edgeR()) tx = b.x - side * 1.15;
    walkTo(a, tx, "approach");
    hush(a);
    return true;
  }
  function scriptFor(a, b) {
    const bt = N.banter[P.pk(a, b)];
    if (bt && Math.random() < 0.6) return pick(bt).map(l => [l[0], l[1]]);
    const L = E.generateInteraction(a, b, "chat", "桌面").filter(l => l[0] !== "＊");
    // 太長的話留頭尾
    if (L.length > 6) return L.slice(0, 4).concat(L.slice(-2));
    return L;
  }
  function runTalk(a, b) {
    a.mode = b.mode = "talk";
    const script = scriptFor(a.id, b.id);
    let i = 0;
    const step = () => {
      if (a.mode !== "talk" || b.mode !== "talk") return endTalk(a, b, script.slice(0, i), true);
      if (i >= script.length) return endTalk(a, b, script, false);
      const [who, text] = script[i++];
      const sp = who === a.id ? a : b, other = sp === a ? b : a;
      hush(other);
      const dur = say(sp, text, { lean: sp.x < other.x ? "left" : "right" });
      sp.talkTimer = setTimeout(step, dur + 350);
    };
    step();
  }
  function endTalk(a, b, said, cut) {
    clearTimeout(a.talkTimer); clearTimeout(b.talkTimer);
    for (const p of [a, b]) {
      p.partner = null;
      if (p.mode === "talk") { idle(p, rand(2, 5)); }
    }
    if (!STREAM && said.length >= 2) {
      const day = P.clockAt(now()).dateKey;
      P.addBond(save, a.id, b.id, cut ? 0.5 : 1, day);
      save.log.push({ type: "chat", t: now(), cast: [a.id, b.id], lines: said });
      P.writeSave(save);
    }
    scheduleTalk();
  }
  function abortPartner(p) {
    const q = p.partner;
    if (!q) return;
    p.partner = null; q.partner = null;
    clearTimeout(p.talkTimer); clearTimeout(q.talkTimer);
    hush(q);
    if (["talk", "wait", "approach"].indexOf(q.mode) >= 0) idle(q, rand(2, 4));
    scheduleTalk();
  }

  /* ── 每一幀 ── */
  function updatePet(p, dt, tt) {
    const nowMs = now();
    if (p.sayUntil && nowMs > p.sayUntil) hush(p);
    let walking = false;
    switch (p.mode) {
      case "enter": case "walk": case "approach": case "leave": {
        const d = p.tx - p.x;
        if (Math.abs(d) < 0.05) {
          if (p.mode === "leave") { removePet(p); return; }
          if (p.mode === "approach") {
            const q = p.partner;
            if (q && q.mode === "wait") { p.faceT = q.x > p.x ? 0.9 : -0.9; q.faceT = -p.faceT; runTalk(p, q); }
            else { p.partner = null; idle(p, 2); }
          } else if (p.mode === "enter") {
            idle(p, rand(2, 4));
            if (!greeted) { greeted = true; say(p, pick(lines(p.id).arrive)); p.waveUntil = nowMs + 1500; }
          } else idle(p, rand(2, 6));
          break;
        }
        const dir = Math.sign(d);
        p.x += dir * Math.min(Math.abs(d), WALK * (p.mode === "approach" ? 1.15 : 1) * dt);
        p.faceT = dir * 0.85;
        walking = true;
        break;
      }
      case "wait":
        if (p.partner) p.faceT = p.partner.x > p.x ? 0.9 : -0.9;
        else idle(p, 2);
        break;
      case "idle": case "sit":
        p.t -= dt; if (p.t <= 0) decide(p);
        break;
      case "sleep":
        p.t -= dt;
        if (set.zzz && nowMs > p.zzzAt && !p.sayUntil) { say(p, pick(["Zzz……", "Zzz", "呼……"]), { zzz: true, dur: 2600 }); p.zzzAt = nowMs + rand(7000, 12000); }
        if (p.t <= 0) { if (wantsSleep(p)) p.t = rand(25, 45); else { hush(p); idle(p, 2); } }
        break;
      case "held":
        break;
      case "fall": case "hop":
        p.vy -= 20 * dt; p.y += p.vy * dt;
        if (p.y <= 0) {
          p.y = 0; p.vy = 0;
          const was = p.mode;
          idle(p, rand(1.5, 3));
          if (was === "fall" && Math.random() < 0.55) say(p, pick(lines(p.id).land));
        }
        break;
    }
    // 轉身：平滑一點
    p.face += (p.faceT - p.face) * Math.min(1, dt * 8);
    const r = p.fig.root;
    r.position.set(p.x, groundY() + p.y, p.z);
    r.rotation.y = p.face;
    p.fig.update(dt, tt, {
      walking, asleep: p.mode === "sleep", talking: !!p.talking && p.mode === "talk",
      held: p.mode === "held", wave: nowMs < p.waveUntil
    });
    // 影子
    const lift = Math.min(1, p.y / 3);
    p.shadow.position.set(p.x, groundY() + 0.07, p.z - 0.6);
    p.shadow.scale.set(1 - lift * 0.5, 1 - lift * 0.5, 1);
    p.shadow.material.opacity = 1 - lift * 0.7;
    placeLabels(p);
  }
  function headPx(p) {
    const h = p.pose === "sit" ? 1.15 : 1.68;
    return { x: p.x * scale, bottom: GROUND_PX + p.y * scale + h * scale };
  }
  function placeLabels(p) {
    const hp = headPx(p);
    const showing = !!p.sayUntil;
    if (showing) {
      const bw = p.bubble.offsetWidth || 120;
      let ax = 0.5;
      if (p.bubble.dataset.lean === "left") ax = 0.8;     // 對方在右邊，泡泡往左長
      if (p.bubble.dataset.lean === "right") ax = 0.2;
      let left = hp.x - bw * ax;
      left = Math.max(6, Math.min(W - bw - 6, left));
      const tail = Math.max(12, Math.min(bw - 12, hp.x - left));
      p.bubble.style.setProperty("--tail", tail + "px");
      p.bubble.style.left = left + "px";
      p.bubble.style.bottom = (hp.bottom + 12) + "px";
    }
    if (p.tag.classList.contains("on")) {
      const tw = p.tag.offsetWidth || 50;
      p.tag.style.visibility = showing ? "hidden" : "visible";
      p.tag.style.left = (hp.x - tw / 2) + "px";
      p.tag.style.bottom = (hp.bottom + 8) + "px";
    }
  }

  /* ── 滑鼠：戳、拎、點穿 ── */
  let ignoring = true, hoverPet = null, down = null, held = null, mouse = { x: -1, y: -1 };
  function hitRect(p) {
    const hp = headPx(p), w = 0.62 * scale;
    return { l: hp.x - w / 2, r: hp.x + w / 2, t: H - hp.bottom - 4, b: H - GROUND_PX - p.y * scale + 2 };
  }
  function petAt(x, y) {
    for (let i = pets.length - 1; i >= 0; i--) {
      const p = pets[i]; if (p.mode === "leave") continue;
      const r = hitRect(p);
      if (x >= r.l && x <= r.r && y >= r.t && y <= r.b) return p;
    }
    return null;
  }
  const toastEl = document.getElementById("toast");
  function overToast(x, y) {
    if (toastEl.hidden) return false;
    const r = toastEl.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }
  function setIgnore(v) { if (!DESKTOP) return; if (v !== ignoring) { ignoring = v; host.setIgnore(v); } }
  function refreshHover() {
    if (held || down) { setIgnore(false); return; }
    const p = petAt(mouse.x, mouse.y);
    if (p !== hoverPet) {
      if (hoverPet) hoverPet.tag.classList.remove("on");
      hoverPet = p;
      if (p) p.tag.classList.add("on");
    }
    document.body.classList.toggle("grab", !!p);
    setIgnore(!(p || overToast(mouse.x, mouse.y)));
  }
  window.addEventListener("mousemove", e => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    if (down && !held && (Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) > 6)) {
      held = down.p; down = null;
      abortPartner(held); hush(held);
      held.mode = "held"; setPose(held, "stand"); held.faceT = 0;
      say(held, pick(lines(held.id).lift));
      document.body.classList.add("grabbing");
    }
    if (held) {
      held.x = Math.max(0.3, Math.min(worldW() - 0.3, e.clientX / scale));
      // 抓著的是胸口附近
      held.y = Math.max(0, (H - e.clientY - GROUND_PX) / scale - 1.15);
    }
    refreshHover();
  });
  window.addEventListener("mousedown", e => {
    if (e.button !== 0) return;
    const p = petAt(e.clientX, e.clientY);
    if (p) { down = { p, x: e.clientX, y: e.clientY }; setIgnore(false); }
  });
  window.addEventListener("mouseup", () => {
    if (held) {
      held.mode = held.y > 0.02 ? "fall" : "idle";
      if (held.mode === "idle") { idle(held, 2); }
      held.vy = 0; held = null;
      document.body.classList.remove("grabbing");
    } else if (down) {
      poke(down.p);
      down = null;
    }
    refreshHover();
  });
  window.addEventListener("mouseleave", () => { if (!held) { mouse.x = mouse.y = -1; refreshHover(); } });
  window.addEventListener("contextmenu", e => {
    const p = petAt(e.clientX, e.clientY);
    if (p) { e.preventDefault(); host.openPanel("who"); }
  });

  function poke(p) {
    const t = now();
    if (t - p.lastPoke < 700) return;
    p.lastPoke = t;
    if (p.mode === "sleep") { setPose(p, "stand"); idle(p, rand(5, 8)); say(p, pick(lines(p.id).wake)); return; }
    if (p.mode === "talk" || p.mode === "wait" || p.mode === "approach") { p.vy = 2.6; return hopKeep(p); }
    setPose(p, "stand");
    p.mode = "hop"; p.vy = 3.4; p.faceT = 0;
    say(p, pick(lines(p.id).poke));
  }
  // 聊天中被戳：只跳一下，不打斷
  function hopKeep(p) {
    const mode = p.mode;
    let y = 0, vy = p.vy;
    const h = setInterval(() => {
      vy -= 20 * 0.016; y += vy * 0.016;
      if (y <= 0 || p.mode !== mode) { y = 0; clearInterval(h); }
      p.y = Math.max(0, y);
    }, 16);
  }

  /* ── 出門的人換了 ── */
  let greeted = false;
  function syncCast(first) {
    const want = set.chosen.slice(0, P.MAX_OUT);
    for (const p of pets.slice()) {
      if (want.indexOf(p.id) < 0 && p.mode !== "leave") {
        abortPartner(p); if (held === p) held = null;
        say(p, pick(lines(p.id).leave));
        p.mode = "leave"; setPose(p, "stand");
        p.tx = p.x < worldW() / 2 ? -1.2 : worldW() + 1.2;
      }
    }
    want.forEach((id, i) => {
      if (petById(id)) return;
      const delay = first ? i * 1600 + rand(200, 900) : rand(0, 600);
      setTimeout(() => { if (!petById(id) && set.chosen.indexOf(id) >= 0) { if (!first) greeted = false; makePet(id); } }, delay);
    });
  }

  /* ── 你不在的時候 ── */
  function showAway(from, to) {
    if (!DESKTOP) return;
    from = Math.max(from, to - 24 * 3600000);
    if (to - from < 30 * 60000) return;
    const list = P.happenings(from, to, 5);
    const day = P.clockAt(to).dateKey;
    for (const h of list) {
      for (let i = 0; i < h.cast.length; i++) for (let j = i + 1; j < h.cast.length; j++) P.addBond(save, h.cast[i], h.cast[j], 1, day);
      save.log.push(Object.assign({ type: "town" }, h));
    }
    save.log.push({ type: "away", t: to, from, count: list.length });
    P.writeSave(save);
    const items = list.slice(0, 3).map(h => `<li><small>${P.fmtTime(h.t)}</small>${esc(h.cast.join("、"))}：${esc(h.title)}</li>`).join("");
    toastEl.innerHTML = `<h3>你不在的 ${P.fmtSpan(to - from)}裡，小鎮發生了 ${list.length} 件事</h3>
      ${list.length ? `<ul>${items}</ul>` : `<p>${esc(N.petSystem.awayNone)}</p>`}
      <div class="row"><button type="button" data-t="close">知道了</button><button type="button" class="main" data-t="log">看看</button></div>`;
    toastEl.hidden = false;
    clearTimeout(showAway.h);
    showAway.h = setTimeout(hideToast, 45000);
  }
  function hideToast() { toastEl.hidden = true; refreshHover(); }
  toastEl.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.t === "log") host.openPanel("log");
    hideToast();
  });

  let lastWall = now(), awayStart = null, lateAt = 0;
  async function minuteCheck() {
    const t = now();
    if (DESKTOP) {
      // 電腦睡著又醒來
      if (t - lastWall > 20 * 60000) showAway(lastWall, t);
      try { userIdle = await host.idleSeconds(); } catch (e) { userIdle = 0; }
      if (userIdle >= 1800 && !awayStart) awayStart = t - userIdle * 1000;
      if (userIdle < 60 && awayStart) { showAway(awayStart, t); awayStart = null; }
      save.lastSeen = t; P.writeSave(save);
      // 深夜你還醒著
      const hr = new Date(t).getHours();
      if (set.late && hr >= 1 && hr < 5 && userIdle < 120 && t - lateAt > 40 * 60000 && pets.length) {
        const awake = pets.filter(p => !busy(p) && p.mode !== "sleep");
        const p = pick(awake.length ? awake : pets.filter(q => !busy(q)));
        if (p) { lateAt = t; if (p.mode === "sleep") { setPose(p, "stand"); idle(p, 6); } say(p, pick(lines(p.id).late)); }
      }
    }
    lastWall = t;
    // 該睡的人去睡、該醒的人醒來
    for (const p of pets) if (p.mode === "sleep" && !wantsSleep(p) && Math.random() < 0.5) { hush(p); idle(p, 2); }
  }
  setInterval(minuteCheck, 30000);

  /* ── 設定從面板改了 ── */
  window.addEventListener("storage", e => {
    if (e.key === P.SET_KEY) {
      const old = set; set = P.settings();
      if (old.size !== set.size) layout();
      syncCast(false);
    } else if (e.key === P.SAVE_KEY && !STREAM) {
      // 面板只會讀，不過以防萬一同步一下
      save = P.loadSave();
    }
  });
  window.addEventListener("resize", layout);
  if (host.onResumed) host.onResumed(() => { const t = now(); if (t - lastWall > 20 * 60000) showAway(lastWall, t); lastWall = t; });

  /* ── 主迴圈：30fps 就夠了，省電 ── */
  let last = performance.now(), acc = 0, tt = 0;
  function loop(ms) {
    requestAnimationFrame(loop);
    const dt0 = (ms - last) / 1000; last = ms; acc += dt0;
    const anyMove = pets.some(p => p.mode !== "sleep" && p.mode !== "sit");
    const step = anyMove ? 1 / 30 : 1 / 15;
    if (acc < step) return;
    const dt = Math.min(0.1, acc); acc = 0; tt += dt;
    if (!down && !held && now() > talkAt) { if (!startTalk()) talkAt = now() + 15000; }
    for (const p of pets.slice()) updatePet(p, dt, tt);
    renderer.render(scene, cam);
  }

  /* ── 開始 ── */
  layout();
  if (DESKTOP && save.lastSeen) {
    const t = now();
    const seen = save.lastSeen;
    if (t - seen > 30 * 60000) setTimeout(() => showAway(seen, t), 4000);
  }
  save.lastSeen = now(); if (!STREAM) P.writeSave(save);
  syncCast(true);
  requestAnimationFrame(loop);

  // 給測試用
  window.__stage = { pets, startTalk, showAway, poke, set: () => set };
})();
