/* 諾文桌寵：共用的存檔、時間、關係、小鎮補算（舞台和面板都會用） */
(function () {
  "use strict";
  const N = window.NOVUM, E = N.engine;
  const SET_KEY = "novum-pet-settings", SAVE_KEY = "novum-pet-save";
  const SET_DEF = { chosen: ["史威特", "沏萊爾", "佐代", "白"], size: "m", light: "normal", talk: "normal", late: true, zzz: true };
  const SAVE_DEF = { bonds: {}, log: [], lastSeen: 0, daily: {}, met: {} };
  const MAX_OUT = 6;

  function read(key, def) {
    try { const s = JSON.parse(localStorage.getItem(key) || "{}"); return Object.assign(JSON.parse(JSON.stringify(def)), s); }
    catch (e) { return JSON.parse(JSON.stringify(def)); }
  }
  function write(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* 存不了就算了 */ } }
  const settings = () => {
    const s = read(SET_KEY, SET_DEF);
    s.chosen = (s.chosen || []).filter(id => N.characters.some(c => c.id === id)).slice(0, MAX_OUT);
    return s;
  };
  const saveSettings = s => write(SET_KEY, s);
  const loadSave = () => read(SAVE_KEY, SAVE_DEF);
  const writeSave = s => {
    if (s.log.length > 80) s.log = s.log.slice(-80);
    write(SAVE_KEY, s);
  };

  /* ── 時間：跟現實同步（電腦的時間） ── */
  const pad = n => String(n).padStart(2, "0");
  function isoParity(dt0) {
    const dt = new Date(Date.UTC(dt0.getFullYear(), dt0.getMonth(), dt0.getDate()));
    const day = dt.getUTCDay() || 7;
    dt.setUTCDate(dt.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
    const wk = Math.ceil(((dt - y0) / 86400000 + 1) / 7);
    return wk % 2 ? "A" : "B";
  }
  function clockAt(ms) {
    const d = new Date(ms);
    const date = pad(d.getMonth() + 1) + "-" + pad(d.getDate()), dateKey = d.getFullYear() + "-" + date;
    return { mode: "real", dow: d.getDay(), min: d.getHours() * 60 + d.getMinutes(), parity: isoParity(d), date, dateKey, weather: E.weatherFor(dateKey) };
  }
  const fmtTime = ms => { const d = new Date(ms); return pad(d.getHours()) + ":" + pad(d.getMinutes()); };
  function fmtSpan(ms) {
    const m = Math.round(ms / 60000);
    if (m < 60) return m + " 分鐘";
    const h = Math.floor(m / 60), r = m % 60;
    return h + " 小時" + (r >= 10 ? " " + r + " 分" : "");
  }

  /* ── 此刻小鎮裡的作息 ── */
  function nowIn(id, ms) {
    const r = E.resolve(id, clockAt(ms || Date.now()));
    return r;
  }
  function sleepingNow(id, ms) {
    const r = nowIn(id, ms);
    return !!(r && !r.avail && /睡/.test(r.act));
  }

  /* ── 關係（只會往好的方向走） ── */
  const pk = (a, b) => [a, b].sort().join("|");
  const either = (obj, a, b) => obj && (obj[a + "|" + b] != null ? obj[a + "|" + b] : obj[b + "|" + a]);
  const isCP = (a, b) => (N.cpPairs || []).some(p => p === a + "|" + b || p === b + "|" + a);
  function bondOf(save, a, b) {
    const k = pk(a, b);
    if (save.bonds[k] != null) return save.bonds[k];
    const base = either(N.relBase, a, b);
    return base != null ? base : (N.relDefault || 30);
  }
  function addBond(save, a, b, amt, dayKey) {
    if (a === b) return 0;
    const k = pk(a, b);
    // 每天每一對最多 +4，慢慢長
    save.daily = save.daily || {};
    if (save.daily.day !== dayKey) save.daily = { day: dayKey };
    const used = save.daily[k] || 0;
    const room = Math.max(0, 4 - used);
    const add = Math.min(amt, room);
    if (add <= 0) return 0;
    const cap = isCP(a, b) ? 100 : 84;
    const cur = bondOf(save, a, b);
    const nv = Math.min(cap, cur + add);
    save.bonds[k] = Math.round(nv * 10) / 10;
    save.daily[k] = used + add;
    return nv - cur;
  }
  function stageLabel(a, b, v) {
    let st = N.relStages[0].label;
    for (const x of N.relStages) if (v >= x.min) st = x.label;
    if (st === "很在意" && !isCP(a, b)) st = "好友";
    return st;
  }
  const fixedLabel = (a, b) => { const f = either(N.relFixed, a, b); return f ? f.label : ""; };

  /* ── 你不在的時候：照小鎮的行程和事件庫，挑幾件真的會發生的事 ── */
  function weightedPick(arr) {
    let tot = 0; for (const e of arr) tot += e.w || 3;
    let r = Math.random() * tot;
    for (const e of arr) { r -= e.w || 3; if (r <= 0) return e; }
    return arr[arr.length - 1];
  }
  function happenings(fromMs, toMs, max) {
    const span = Math.max(0, toMs - fromMs);
    const hours = span / 3600000;
    const n = Math.max(1, Math.min(max || 5, Math.floor(hours / 1.2)));
    const times = [];
    for (let i = 0; i < n; i++) times.push(fromMs + span * (i + 0.2 + Math.random() * 0.6) / n);
    const used = new Set(), out = [];
    for (const t of times) {
      const clock = clockAt(t), where = E.whereabouts(clock);
      const awake = N.characters.map(c => c.id).filter(id => where[id] && where[id].avail);
      for (let tries = 0; tries < 8 && awake.length; tries++) {
        const id = awake[Math.floor(Math.random() * awake.length)];
        const c = E.candidates(id, clock, where, ev => used.has(ev.scene)).filter(ev => !ev.asleep);
        if (!c.length) continue;
        const ev = weightedPick(c);
        used.add(ev.scene);
        out.push({ t: Math.round(t), id: ev.id, title: ev.title, place: ev.place === "*" ? where[id].loc : ev.place, cast: ev.cast.slice() });
        break;
      }
    }
    return out;
  }
  function eventLines(id) { const ev = E.eventById(id); return ev ? ev.lines : []; }

  const charById = id => N.characters.find(c => c.id === id);
  const avatarSrc = id => "icons/avatars/" + (N.avatars[id] || "av01") + ".webp";

  N.pet = {
    MAX_OUT, SET_KEY, SAVE_KEY, settings, saveSettings, loadSave, writeSave,
    clockAt, fmtTime, fmtSpan, nowIn, sleepingNow,
    pk, isCP, bondOf, addBond, stageLabel, fixedLabel,
    happenings, eventLines, charById, avatarSrc
  };
})();
