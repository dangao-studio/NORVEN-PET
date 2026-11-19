/* 諾文桌寵：控制面板 */
(function () {
  "use strict";
  const N = window.NOVUM, P = N.pet;
  const host = window.pet || { desktop: false };
  const main = document.getElementById("main");
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const col = id => (P.charById(id) || {}).color || "#A87633";
  const face = id => `<img src="${P.avatarSrc(id)}" alt="">`;
  let tab = (location.hash || "#who").slice(1) || "who";

  function shortRole(c) { return (c.role || "").split("・")[0]; }

  /* ── 出門 ── */
  function renderWho() {
    const s = P.settings();
    const t = Date.now();
    const cards = N.characters.map(c => {
      const on = s.chosen.indexOf(c.id) >= 0;
      const r = P.nowIn(c.id, t);
      const town = on ? `<span class="out">在你的桌面上</span>` : `<small>小鎮此刻：${esc(r ? r.act : "")}</small>`;
      return `<button type="button" class="who ${on ? "on" : ""}" style="--c:${col(c.id)}" data-who="${esc(c.id)}">
        ${face(c.id)}<span><b>${esc(c.full || c.id)}</b><small>${esc(shortRole(c))}</small>${town}</span></button>`;
    }).join("");
    main.innerHTML = `<p class="hint">點一下讓他們出門到桌面，再點一次就回小鎮。人太多會擠，最多 ${P.MAX_OUT} 個。<span class="count">${s.chosen.length} / ${P.MAX_OUT}</span></p>
      <div class="grid">${cards}</div>`;
  }
  function toggleWho(id) {
    const s = P.settings();
    const i = s.chosen.indexOf(id);
    if (i >= 0) s.chosen.splice(i, 1);
    else if (s.chosen.length < P.MAX_OUT) s.chosen.push(id);
    else { flashCount(); return; }
    P.saveSettings(s);
    renderWho();
  }
  function flashCount() {
    const el = main.querySelector(".count"); if (!el) return;
    el.textContent = "滿了，先讓一個人回去吧";
    setTimeout(renderWho, 1600);
  }

  /* ── 日誌 ── */
  function linesHTML(lines) {
    return lines.map(([who, text]) => who === "＊"
      ? `<p class="n">${esc(text)}</p>`
      : `<p class="s" style="--c:${col(who)}"><b>${esc(who)}</b>${esc(text)}</p>`).join("");
  }
  function dayLabel(t) {
    const d = new Date(t), today = new Date();
    const y = new Date(); y.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "今天";
    if (d.toDateString() === y.toDateString()) return "昨天";
    return (d.getMonth() + 1) + " 月 " + d.getDate() + " 日";
  }
  function renderLog() {
    const save = P.loadSave();
    const log = save.log.slice().reverse();
    if (!log.length) { main.innerHTML = `<div class="empty">還沒有紀錄。<br>大家在桌面上聊過天，或你離開一陣子回來，這裡就會有東西。</div>`; return; }
    let html = "", lastDay = "";
    for (const e of log) {
      const dl = dayLabel(e.t);
      if (dl !== lastDay) { html += `<div class="sep">${dl}</div>`; lastDay = dl; }
      if (e.type === "away") {
        html += `<div class="card"><span class="meta">${P.fmtTime(e.from)} ～ ${P.fmtTime(e.t)}</span><h4>你不在的 ${P.fmtSpan(e.t - e.from)}，小鎮裡發生了 ${e.count} 件事</h4></div>`;
      } else if (e.type === "town") {
        html += `<div class="card"><details><summary>
          <span class="meta">${P.fmtTime(e.t)}・${esc(e.place)}</span>
          <h4><span class="faces">${e.cast.map(face).join("")}</span>${esc(e.title)}</h4></summary>
          <div class="lines">${linesHTML(P.eventLines(e.id))}</div></details></div>`;
      } else if (e.type === "chat") {
        html += `<div class="card"><details><summary>
          <span class="meta">${P.fmtTime(e.t)}・在你的桌面上</span>
          <h4><span class="faces">${e.cast.map(face).join("")}</span>${esc(e.cast.join(" 和 "))}聊了幾句</h4></summary>
          <div class="lines">${linesHTML(e.lines || [])}</div></details></div>`;
      }
    }
    main.innerHTML = html;
  }

  /* ── 關係 ── */
  function renderBond() {
    const s = P.settings(), save = P.loadSave();
    const keys = new Set(Object.keys(save.bonds));
    for (let i = 0; i < s.chosen.length; i++) for (let j = i + 1; j < s.chosen.length; j++) keys.add(P.pk(s.chosen[i], s.chosen[j]));
    const rows = [...keys].map(k => { const [a, b] = k.split("|"); return { a, b, v: P.bondOf(save, a, b) }; })
      .filter(r => P.charById(r.a) && P.charById(r.b))
      .sort((x, y) => y.v - x.v);
    if (!rows.length) { main.innerHTML = `<div class="empty">還沒有誰跟誰變熟。</div>`; return; }
    main.innerHTML = `<p class="hint">大家在桌面上聊天、或在小鎮裡一起經歷事情，就會慢慢變熟。關係只會往好的方向走。</p>` +
      rows.map(r => {
        const fx = P.fixedLabel(r.a, r.b);
        return `<div class="card bond"><span class="pair">${face(r.a)}${face(r.b)}</span>
          <span class="info"><b>${esc(r.a)} ・ ${esc(r.b)}</b>${fx ? `<span class="tagf">${esc(fx)}</span>` : ""}
          <span class="meta" style="float:right">${P.stageLabel(r.a, r.b, r.v)}</span>
          <span class="bar"><i style="width:${Math.round(r.v)}%"></i></span></span></div>`;
      }).join("");
  }

  /* ── 設定 ── */
  async function renderSet() {
    const s = P.settings();
    const chips = (key, opts) => opts.map(([v, t]) => `<button type="button" class="chip ${s[key] === v ? "on" : ""}" data-set="${key}" data-v="${v}">${t}</button>`).join("");
    let auto = false;
    if (host.desktop) { try { auto = await host.getAutoStart(); } catch (e) { auto = false; } }
    main.innerHTML = `
      <div class="field"><b>大小</b><div class="chips">${chips("size", [["s", "小"], ["m", "中"], ["l", "大"]])}</div></div>
      <div class="field"><b>話量</b><div class="chips">${chips("talk", [["quiet", "安靜"], ["normal", "普通"], ["lively", "熱鬧"]])}</div>
        <p>決定大家多久聊一次天、自言自語的頻率。</p></div>
      <div class="field"><label class="switch"><span><b>深夜提醒</b><p>凌晨一點到五點你還在用電腦，偶爾會有人說話。</p></span>
        <input type="checkbox" data-flag="late" ${s.late ? "checked" : ""}></label></div>
      <div class="field"><label class="switch"><span><b>睡覺冒 Zzz</b><p>照小鎮的作息，該睡的人會在桌面上打瞌睡。</p></span>
        <input type="checkbox" data-flag="zzz" ${s.zzz ? "checked" : ""}></label></div>
      ${host.desktop ? `
      <div class="field"><label class="switch"><span><b>開機時自動出現</b></span>
        <input type="checkbox" data-auto ${auto ? "checked" : ""}></label></div>
      <div class="field"><b>其他</b>
        <button type="button" class="btn main" data-act="stream">開實況視窗（綠幕）</button>
        <button type="button" class="btn" data-act="hide">讓大家躲起來／出來</button>
        <button type="button" class="btn" data-act="quit">結束桌寵</button>
        <p>實況視窗是綠色背景，在 OBS 用「視窗擷取」加上「色度鍵」濾鏡就能把綠色去掉。</p></div>` : ""}
      <div class="ver" id="ver"></div>`;
    if (host.version) host.version().then(v => { const el = document.getElementById("ver"); if (el) el.textContent = "諾文桌寵 v" + v; });
  }

  /* ── 切換分頁 ── */
  const R = { who: renderWho, log: renderLog, bond: renderBond, set: renderSet };
  function go(t) {
    if (!R[t]) t = "who";
    tab = t;
    document.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === t));
    R[t]();
    window.scrollTo(0, 0);
  }

  document.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.tab) return go(b.dataset.tab);
    if (b.dataset.who) return toggleWho(b.dataset.who);
    if (b.dataset.set) { const s = P.settings(); s[b.dataset.set] = b.dataset.v; P.saveSettings(s); return renderSet(); }
    if (b.dataset.act === "stream" && host.openStream) host.openStream();
    if (b.dataset.act === "hide" && host.toggleHide) host.toggleHide();
    if (b.dataset.act === "quit" && host.quit) host.quit();
  });
  document.addEventListener("change", async e => {
    const el = e.target;
    if (el.dataset.flag) { const s = P.settings(); s[el.dataset.flag] = el.checked; P.saveSettings(s); }
    if (el.hasAttribute("data-auto") && host.setAutoStart) el.checked = await host.setAutoStart(el.checked);
  });
  window.addEventListener("storage", e => {
    if (e.key === P.SAVE_KEY && (tab === "log" || tab === "bond")) R[tab]();
    if (e.key === P.SET_KEY && tab === "who") renderWho();
  });
  window.addEventListener("hashchange", () => go(location.hash.slice(1)));
  if (host.onTab) host.onTab(t => go(t));
  // 小鎮此刻的作息每分鐘更新一次
  setInterval(() => { if (tab === "who") renderWho(); }, 60000);
  go(tab);
})();
