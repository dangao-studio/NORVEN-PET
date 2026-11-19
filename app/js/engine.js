/* 諾文小鎮：核心規則（不碰畫面，只做計算）
 * 行程解析、同地判定、事件篩選、天氣。app.js 與測試腳本共用。
 */
window.NOVUM = window.NOVUM || {};

NOVUM.engine = (function () {
  const N = NOVUM;
  const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

  function toMin(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  }
  function fmtMin(min) {
    min = ((min % 1440) + 1440) % 1440;
    const h = Math.floor(min / 60), m = Math.floor(min % 60);
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  }

  // "135" / "6A" / "0123456B"
  function dayMatch(spec, dow, parity) {
    if (!spec) return true;
    const p = spec.replace(/[0-9]/g, "");
    const d = spec.replace(/[AB]/g, "");
    if (p && p !== parity) return false;
    return d.indexOf(String(dow)) >= 0;
  }

  // [from,to) 可跨午夜
  function inRange(from, to, min) {
    const a = toMin(from), b = toMin(to);
    if (a <= b) return min >= a && min < b;
    return min >= a || min < b;
  }

  /* ── 行程 ── */
  function resolve(charId, clock) {
    const s = N.schedules[charId];
    if (!s) return null;
    for (const b of s.blocks) {
      if (!dayMatch(b[0], clock.dow, clock.parity)) continue;
      if (!inRange(b[1], b[2], clock.min)) continue;
      return { loc: b[3], act: b[4], avail: b[5] !== 0, from: b[1], to: b[2] };
    }
    // 沒寫到的空檔：待在住處休息
    return { loc: s.home, act: "在住處休息", avail: false, from: null, to: null, gap: true };
  }

  /* 全部居民的當下位置。override：正在進行中的相遇（固定在相遇地點） */
  function whereabouts(clock, override, assigns) {
    const out = {};
    const now = Date.now();
    for (const c of N.characters) {
      let r = resolve(c.id, clock);
      const as = assigns && assigns[c.id];
      if (as && as.until > now && r.avail) {
        r = { loc: as.loc, act: as.act || "照安排在這裡逛逛", avail: true, assigned: true, until: as.until };
      }
      if (override && override.cast.indexOf(c.id) >= 0) {
        r = Object.assign({}, r, { loc: override.loc, act: "正在和" + override.cast.filter(x => x !== c.id).join("、") + "說話", avail: true, locked: true });
        if (override.cast.length === 1) r.act = "獨自待著";
      }
      out[c.id] = r;
    }
    return out;
  }

  function occupancy(where) {
    const occ = {};
    for (const l of N.locations) occ[l.id] = [];
    for (const id in where) {
      const loc = where[id].loc;
      (occ[loc] = occ[loc] || []).push(id);
    }
    return occ;
  }

  /* ── 天氣（依日期固定，同一天大家看到的一樣） ── */
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0);
  }
  function weatherFor(dateKey) {
    const r = hash("novum-" + dateKey) % 100;
    if (r < 36) return "晴";
    if (r < 66) return "多雲";
    if (r < 86) return "雨";
    return "霧";
  }

  /* ── 事件 ── */
  let _events = null;
  function allEvents() {
    if (_events) return _events;
    const list = [].concat(N.eventsNew || [], N.eventsMore || [], N.eventsSolo || [], N.eventsOriginal || []);
    _events = list.map(e => {
      const ev = Object.assign({ cd: 720, w: 3, src: "新撰寫" }, e);
      ev.place = N.locationAlias[e.loc] || e.loc;   // 實際地點
      if (e.loc === "@home") ev.place = N.schedules[e.cast[0]].home;
      if (e.loc === "@any") ev.place = "*";
      ev.scene = e.scene || e.id;
      return ev;
    });
    return _events;
  }
  function eventById(id) {
    return allEvents().find(e => e.id === id) || null;
  }

  // 時間、星期、日期、天氣是否符合（不看人）
  function timeOK(ev, clock) {
    if (ev.date && ev.date !== clock.date) return false;
    if (ev.days && !dayMatch(ev.days, clock.dow, clock.parity)) return false;
    if (ev.weather && ev.weather !== clock.weather) return false;
    if (ev.weather === "霧" && !(clock.min >= 18 * 60 || clock.min < 6 * 60)) return false;
    return inRange(ev.t[0], ev.t[1], clock.min);
  }

  /* 被觀察角色此刻可觸發的事件
   * isCooling(ev) → true 表示冷卻中 */
  function candidates(observedId, clock, where, isCooling) {
    const me = where[observedId];
    if (!me) return [];
    return allEvents().filter(ev => {
      if (ev.cast.indexOf(observedId) < 0) return false;
      if (ev.place !== "*" && ev.place !== me.loc) return false;
      if (!!ev.asleep === me.avail) return false;      // 睡夢片段只在休息時、一般事件只在醒著時
      if (!timeOK(ev, clock)) return false;
      for (const c of ev.cast) {
        const w = where[c];
        if (!w || w.loc !== me.loc || (!ev.asleep && !w.avail)) return false;
      }
      if (ev.alone) {
        for (const id in where) if (ev.cast.indexOf(id) < 0 && where[id].loc === me.loc && where[id].avail) return false;
      }
      if (isCooling && isCooling(ev)) return false;
      return true;
    });
  }

  /* ── 互動對話產生（用語氣庫組句） ── */
  function pickOne(arr, used) {
    if (!arr || !arr.length) return "";
    const pool = arr.filter(x => !used.has(x));
    const src = pool.length ? pool : arr;
    const x = src[Math.floor(Math.random() * src.length)];
    used.add(x); return x;
  }
  function nick(from, to) { return (N.nick[from] && N.nick[from][to]) || to; }
  function fill(text, me, other, place) {
    let t = text.replace(/\{me\}/g, me).replace(/\{other\}/g, other).replace(/\{to\}/g, nick(me, other)).replace(/\{place\}/g, place || "");
    return t;
  }
  function makeSay(L, used, place) {
    return {
      say(who, other, arr) {
        const t = pickOne(arr, used); if (!t) return;
        let line = fill(t, who, other, place);
        const l = charById(other);
        if (l && !l.male) line = line.replace(/你/g, "妳");   // 對女性說話用「妳」
        L.push([who, line]);
      },
      act(who, other, arr) { const t = pickOne(arr, used); if (t) L.push(["＊", fill(t, who, other, place)]); },
      narr(text) { L.push(["＊", text]); }
    };
  }
  const HELP_MID = ["兩個人一起忙了一陣子，總算弄好了。", "{B}接過手之後，事情比想像中順利得多。", "過程中{A}差點弄掉東西，被{B}及時接住。"];
  const FOOD_MID = ["{B}咬了一口，表情明顯亮了一下。", "{B}小心地分了一半，又推回一點給{A}。"];
  function generateInteraction(a, b, action, placeName) {
    const A = N.voices[a], B = N.voices[b];
    const used = new Set(), L = [], k = makeSay(L, used, placeName);
    const mid = arr => arr[Math.floor(Math.random() * arr.length)].replace(/\{A\}/g, a).replace(/\{B\}/g, b);
    k.act(a, b, A.approach);
    k.say(a, b, A.open[action]);
    k.act(b, a, B.react);
    k.say(b, a, B.reply[action]);
    if (action === "chat") {
      // 固定拌嘴的組合：一半機率直接吵起來
      const bt = N.banter && N.banter[[a, b].sort().join("|")];
      if (bt && Math.random() < 0.5) {
        for (const l of bt[Math.floor(Math.random() * bt.length)]) L.push([l[0], l[1]]);
      } else {
        // 不拿聽的人當話題（避免當面用第三人稱講對方）
        const shares = B.share.filter(x => x.indexOf(a) < 0 && x.indexOf(nick(b, a)) < 0);
        k.say(b, a, shares.length ? shares : ["最近也沒什麼特別的，就是普普通通地過日子。……這樣也不錯。"]);
        k.say(a, b, A.react2);
        if (B.quip && Math.random() < 0.5) k.say(b, a, B.quip);
      }
    }
    else if (action === "help") k.narr(mid(HELP_MID));
    else if (action === "food") k.narr(mid(FOOD_MID));
    k.say(a, b, A.follow[action]);
    k.say(b, a, B.close);
    return L;
  }
  /* 戀愛線：kind = date / confess / sweet；ok = 對方是否答應 */
  function generateLove(a, b, kind, ok, placeName) {
    const A = N.voices[a], B = N.voices[b];
    const LA = A.love, LB = B.love;
    const used = new Set(), L = [], k = makeSay(L, used, placeName);
    k.act(a, b, LA.gest);
    if (kind === "date") {
      k.say(a, b, LA.invite);
      k.act(b, a, B.react);
      k.say(b, a, ok ? LB.yesDate : LB.noDate);
      if (ok) { k.say(a, b, LA.sweet); k.say(b, a, B.close); }
      else k.say(a, b, LA.rejected || ["……嗯，我知道了。下次吧。", "沒關係，是我太突然了。"]);
    } else if (kind === "confess") {
      k.say(a, b, LA.confess);
      k.narr("短短幾秒，安靜得像是過了很久。");
      k.act(b, a, LB.gest);
      k.say(b, a, ok ? LB.yes : LB.no);
      if (ok) { k.say(a, b, LA.afterYes); k.say(b, a, LB.sweet); }
      else k.say(a, b, LA.afterNo || ["……謝謝你願意聽我說完。", "……嗯。我懂。我們還是像以前一樣，好嗎？"]);
    } else {
      k.say(a, b, LA.sweet);
      if (LB.sweetReply) k.say(b, a, LB.sweetReply);
      k.say(b, a, LB.sweet);
      k.act(a, b, LA.gest);
      k.say(a, b, LA.sweet);
      k.say(b, a, B.close);
    }
    return L;
  }
  function assignLine(id, placeName) {
    const v = N.voices[id]; if (!v) return "";
    return fill(v.assign[Math.floor(Math.random() * v.assign.length)], id, "", placeName);
  }

  function charById(id) { return N.characters.find(c => c.id === id); }
  function locById(id) { return N.locations.find(l => l.id === id); }

  return { WEEK, toMin, fmtMin, dayMatch, inRange, resolve, whereabouts, occupancy,
    weatherFor, allEvents, eventById, timeOK, candidates, charById, locById, hash, generateInteraction, generateLove, assignLine, nick };
})();
