/* =========================================================================
 * 永劫无间 · 征神之路 魂玉配装工具 —— 逻辑层
 * ========================================================================= */
(function () {
'use strict';

/* ------------------------------ 小工具 ------------------------------ */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const round1 = v => Math.round(v * 10) / 10;
const pct = v => (v > 0 ? '+' : '') + round1(v) + '%';
const num = v => (isFinite(v) ? Math.round(v).toLocaleString('en-US') : '—');
const elColor = id => (ELEMENTS[id] || ELEMENTS.none).color;
const elName  = id => (ELEMENTS[id] || ELEMENTS.none).name;
/** 元素图标 <img> */
const elImg = (id, cls) => {
  const e = ELEMENTS[id];
  return (e && e.icon) ? `<img class="${cls || 'el-icon'}" src="${e.icon}" alt="${e.name}" title="${e.name}元素">` : '';
};

/* ------------------------------ 默认参数 ------------------------------ */
const DEFAULT_PARAMS = {
  baseAtk: 1000,      // 基础攻击力
  element: 'thunder', // 武器输出元素（魂玉的染元素在槽位上单独选择）
  weapon: 'melee',    // 武器类型
  naMul: 100,         // 普攻倍率(%)
  naFreq: 1.2,        // 普攻频率(次/秒)
  baseCritRate: 0,    // 基础暴击率(%)
  baseCritDmg: 100,   // 基础暴击伤害加成(%)，100 表示暴击为 2 倍
  elemMul: 150,       // 元素伤害倍率(%)
  elemFreq: 0.5,      // 元素基础触发频率(次/秒)
  skillMul: 300,      // 技能倍率(%)
  skillFreq: 0.1,     // 技能基础频率(次/秒)
  bossDmgOn: true,    // 计入对首领伤害
  rangedDmgOn: true,  // 计入远程武器招式增伤
  meteorOn: true,     // 启用【流星打击】特效估算
  meteorMul: 80,      // 流星倍率(%)
  meteorCd: 4,        // 流星冷却(秒)
  slotCount: 7,       // 配装槽位默认 7 个
  unusedPoints: 0,    // 未使用的潜能点（守缺化劲）
  conds: {},          // 条件加成开关 { '魂玉id:序号': true|false }
};
/* 游戏规则：每颗魂玉固定 4 个词条槽位，普通词条与稀有词条共用这 4 格 */
const SLOTS_PER_JADE = 4;
const RARE_IDS = RARES.filter(r => r.id !== 'none').map(r => r.id);
const isRareId = id => RARE_IDS.indexOf(id) >= 0;

const STORAGE_KEY = 'naraka-souljade-v1';

/* ------------------------------ 状态 ------------------------------ */
let state = {
  params: Object.assign({}, DEFAULT_PARAMS),
  slots: [],
  filter: 'all',
  query: '',
};

function emptySlot() {
  return { jadeId: null, subs: new Array(SLOTS_PER_JADE).fill(null), element: null };
}
/** 夹紧外部来源（本地存档 / 分享链接 / 导入）的参数 */
function normalizeParams() {
  const p = state.params;
  p.slotCount = clamp(parseInt(p.slotCount, 10) || 7, 1, 12);
  delete p.subCount;
  p.unusedPoints = clamp(parseInt(p.unusedPoints, 10) || 0, 0, 300);
  if (!p.conds || typeof p.conds !== 'object' || Array.isArray(p.conds)) p.conds = {};
  return p;
}
/** 兼容旧存档：把独立的 rare 字段并入 subs，保证 4 格长度 */
function normalizeSlot(slot) {
  if (!slot || !slot.jadeId || !JADE_BY_ID[slot.jadeId]) return null;
  let subs = Array.isArray(slot.subs) ? slot.subs.slice(0, SLOTS_PER_JADE) : [];
  subs = subs.map(id => (id && id !== 'none' && (AFFIX_BY_ID[id] || RARE_BY_ID[id])) ? id : null);
  while (subs.length < SLOTS_PER_JADE) subs.push(null);
  if (slot.rare && isRareId(slot.rare) && subs.indexOf(slot.rare) < 0) {
    const free = subs.indexOf(null);
    subs[free >= 0 ? free : SLOTS_PER_JADE - 1] = slot.rare;
  }
  // 稀有词条不再限制数量：4 格可以全是稀有词条，也可以三条稀有各来一个
  // 染元素：仅接受合法元素；夺魂等无法染元素的魂玉强制为 null
  const jade = JADE_BY_ID[slot.jadeId];
  let element = ELEMENT_LIST.indexOf(slot.element) >= 0 ? slot.element : null;
  if (jade.mods && jade.mods.cannotImbue) element = null;
  return { jadeId: slot.jadeId, subs, element };
}
function resizeSlots(n) {
  const cur = state.slots;
  const next = [];
  for (let i = 0; i < n; i++) next.push(cur[i] || null);
  state.slots = next;
}
function resetSlots(n) {
  state.slots = Array.from({ length: n }, () => emptySlot());
}

/* ======================================================================
 *  计算引擎
 * ====================================================================== */

/** 可直接累加的数值类 mod */
const ADDITIVE = new Set([
  'atkPct', 'critRate', 'critDmg', 'elemCritRate',
  'iceDmg', 'thunderDmg', 'poisonDmg', 'elemAccum',
  'bossDmg', 'rangedDmg', 'divineEff', 'skillDmg',
  'cdr', 'meibu', 'frostCap', 'poisonLayerNeed',
  'iceDmgMul', 'iceCdr', 'rangedSelfMul',
  'dmgPct', 'elemDmgPct',
]);

function applyMods(S, mods) {
  if (!mods) return;
  for (const k in mods) {
    const v = mods[k];
    if (k === 'elemDmgAny') continue;   // 跟随所染元素，单独处理
    if (ADDITIVE.has(k)) {
      S[k] = (S[k] || 0) + v;
    } else if (k === 'iceHits' || k === 'rangedHits') {
      S[k] = Math.max(S[k] || 1, v);
    } else if (k === 'cannotImbue') {
      S.cannotImbue = 1;
    } else {
      S[k] = (S[k] || 0) + v;
    }
  }
}

/** 汇总一件魂玉带来的全部数值（含合道加成） */
function accumulateJade(S, slot) {
  const jade = JADE_BY_ID[slot.jadeId];
  if (!jade) return;

  S.jadeCount++;
  S.score += jade.score;
  S.equippedIds.push(jade.id);
  S.imbue[slot.element || 'none']++;

  // ① 魂玉本体效果（不受合道影响）
  applyMods(S, jade.mods);
  if (jade.proc === 'meteor') S.meteor = 1;

  // ①b 自适应元素加成：加到「此魂玉所染元素」对应伤害上
  const anyElem = jade.mods && jade.mods.elemDmgAny;
  if (anyElem) {
    if (slot.element && ELEMENTS[slot.element]) S[ELEMENTS[slot.element].dmgKey] += anyElem;
    else S.unimbuedElemDmg += anyElem;      // 未染元素则不生效
  }

  // ①c 武器限定效果：只在所选武器匹配时生效（火炮 / 弓箭 …）
  if (jade.weaponMods) {
    const wm = jade.weaponMods[state.params.weapon];
    if (wm) applyMods(S, wm);
  }

  // ①d 按「未使用潜能点」缩放的加成（守缺化劲）
  if (jade.perPoint) {
    const n = clamp(parseInt(state.params.unusedPoints, 10) || 0, 0, 300);
    if (n > 0) Object.keys(jade.perPoint).forEach(k => { S[k] = (S[k] || 0) + jade.perPoint[k] * n; });
  }

  // ①e 条件加成：默认视为条件已满足（参与计算），可在「条件加成」面板里逐个取消
  if (jade.cond && jade.cond.length) {
    jade.cond.forEach((c, i) => {
      const key = jade.id + ':' + i;
      const on = state.params.conds[key] !== false;
      S.condList.push({ key, jade: jade.name, label: c.label, on, mods: c.mods });
      if (on) applyMods(S, c.mods);
    });
  }

  // ② 词条槽位：固定 4 格，普通词条与稀有词条共用，稀有词条不限制数量
  const entries    = (slot.subs || []).slice(0, SLOTS_PER_JADE).filter(id => id && id !== 'none');
  const hedaoCount = entries.filter(id => id === 'hedao').length;
  const mult       = 1 + 0.5 * hedaoCount;   // 合道可叠加：每一条合道都让该魂玉的普通词条 +50%

  entries.forEach(id => {
    if (isRareId(id)) {
      const r = RARE_BY_ID[id];
      if (id === 'hedao') S.hedaoCount++;
      if (id === 'huaqi') S.cdr   += r.value;
      if (id === 'meibu') S.meibu += r.value;
      S.rareList.push({ jade: jade.name, name: r.name });
      return;
    }
    const a = AFFIX_BY_ID[id];
    if (!a) return;
    S[a.id] = (S[a.id] || 0) + a.value * mult;
    S.subCount++;
  });

  // ④ 特殊效果文本
  (jade.specials || []).forEach(t => S.specials.push({ jade: jade.name, text: t }));
}

function totals() {
  const S = {
    atkPct: 0, critRate: 0, critDmg: 0, elemCritRate: 0,
    iceDmg: 0, thunderDmg: 0, poisonDmg: 0, elemAccum: 0,
    bossDmg: 0, rangedDmg: 0, divineEff: 0, skillDmg: 0,
    cdr: 0, meibu: 0, hedaoCount: 0, frostCap: 0, poisonLayerNeed: 0,
    dmgPct: 0, elemDmgPct: 0,
    iceHits: 1, iceDmgMul: 0, iceCdr: 0,
    rangedHits: 1, rangedSelfMul: 0,
    cannotImbue: 0, meteor: 0, unimbuedElemDmg: 0,
    imbue: { thunder: 0, ice: 0, poison: 0, none: 0 },
    jadeCount: 0, score: 0, subCount: 0,
    equippedIds: [], rareList: [], specials: [], condList: [],
  };
  state.slots.forEach(slot => { if (slot && slot.jadeId) accumulateJade(S, slot); });
  return S;
}

/** 核心伤害模型 */
function damage(S, p) {
  const bossMul   = p.bossDmgOn   ? 1 + S.bossDmg / 100 : 1;
  const isRanged  = p.weapon === 'cannon' || p.weapon === 'bow';   // 火炮 / 弓箭
  const rangedMul = (isRanged && p.rangedDmgOn) ? 1 + S.rangedDmg / 100 : 1;
  const multiMul  = isRanged ? S.rangedHits * (1 + S.rangedSelfMul / 100) : 1;
  const globalMul = 1 + (S.dmgPct || 0) / 100;        // 全局增伤（魂燃一线等）
  const elemAdj   = 1 + (S.elemDmgPct || 0) / 100;    // 元素伤害调整（舍元劲等）
  const atk       = p.baseAtk * (1 + S.atkPct / 100);

  const totalCritRate = p.baseCritRate + S.critRate;
  const totalCritDmg  = p.baseCritDmg + S.critDmg;
  const critMul       = 1 + totalCritDmg / 100;

  // 枚卜：20% 概率触发两次暴击判定并取更优 → 有效暴击率提升
  const q = clamp(S.meibu, 0, 100) / 100;
  const eff = r => {
    const rr = clamp(r, 0, 1);
    return Math.min(1, rr + q * rr * (1 - rr));
  };

  const cRate  = clamp(totalCritRate, 0, 100) / 100;
  const eRate  = clamp(totalCritRate + S.elemCritRate, 0, 100) / 100;
  const effCrit     = eff(cRate);
  const effElemCrit = eff(eRate);

  const skillPctMul = 1 + S.skillDmg / 100;   // 招式伤害（烈元诀为负）

  /* ---- 普通攻击 ---- */
  const naBase   = atk * p.naMul / 100 * bossMul * rangedMul * multiMul * skillPctMul * globalMul;
  const naNoCrit = naBase;
  const naCrit   = naBase * critMul;
  const naExpect = naBase * (1 + effCrit * (critMul - 1));
  const naDPS    = naExpect * p.naFreq;

  /* ---- 元素伤害 ---- */
  const elKey    = p.element + 'Dmg';
  const elBonus  = S[elKey] || 0;
  const isIce    = p.element === 'ice';
  const iceHits  = isIce ? S.iceHits : 1;
  const iceMul   = isIce ? iceHits * (1 + S.iceDmgMul / 100) : 1;
  const iceFreq  = isIce ? 1 + S.iceCdr / 100 : 1;

  const elemBase   = atk * p.elemMul / 100 * (1 + elBonus / 100) * iceMul * bossMul * elemAdj * globalMul;
  const elemNoCrit = elemBase;
  const elemCrit   = elemBase * critMul;
  const elemExpect = elemBase * (1 + effElemCrit * (critMul - 1));

  const accumMul = 1 + S.elemAccum / 100;
  const elemDPS  = elemExpect * p.elemFreq * accumMul * iceFreq;

  /* ---- 技能伤害 ---- */
  const cdr        = clamp(S.cdr, 0, 80) / 100;
  const skillBase  = atk * p.skillMul / 100 * bossMul * skillPctMul * globalMul;
  const skillCrit  = eff(cRate);
  const skillExpect= skillBase * (1 + skillCrit * (critMul - 1));
  const skillDPS   = skillExpect * p.skillFreq / (1 - cdr);

  /* ---- 元暴星陨：流星打击（估算） ---- */
  let procDPS = 0;
  if (S.meteor && p.meteorOn) {
    procDPS = atk * p.meteorMul / 100 * bossMul * effElemCrit / Math.max(0.1, p.meteorCd);
  }

  const totalDPS = naDPS + elemDPS + skillDPS + procDPS;

  return {
    atk, totalCritRate, totalCritDmg, critMul, effCrit, effElemCrit,
    cRate, eRate, bossMul, rangedMul, multiMul, globalMul, elemAdj, accumMul, iceMul, iceFreq,
    naNoCrit, naCrit, naExpect, naDPS,
    elemBase, elemNoCrit, elemCrit, elemExpect, elemDPS,
    skillBase, skillExpect, skillDPS, procDPS, totalDPS,
  };
}

/** 空配装基准 */
function baselineDPS() {
  const saved = state.slots;
  state.slots = saved.map(() => null);
  const empty = totals();
  state.slots = saved;
  return damage(empty, state.params).totalDPS || 1;
}

/* ======================================================================
 *  渲染
 * ====================================================================== */

/* ---------- 魂玉池 ---------- */
const FILTERS = [
  { id: 'all',   label: '全部' },
  { id: 'skill', label: '招式专精' },
];

function renderChips() {
  const box = $('#filterChips');
  box.innerHTML = FILTERS.map(f => {
    const cls = ['chip'];
    if (state.filter === f.id) cls.push('active');
    return `<button type="button" class="${cls.join(' ')}" data-filter="${f.id}">${f.label}</button>`;
  }).join('');
  $$('.chip', box).forEach(b => b.addEventListener('click', () => {
    state.filter = b.dataset.filter;
    renderPool();
  }));
}

function matchFilter(j) {
  if (state.filter === 'skill') return j.category === '招式专精魂玉';
  return true;
}

function matchQuery(j) {
  const q = state.query.trim().toLowerCase();
  if (!q) return true;
  const hay = [j.name, j.brief, j.category, j.rarity, ...(j.bullets || []), ...(j.specials || [])]
    .join(' ').toLowerCase();
  return hay.includes(q);
}

/** 魂玉池左侧色条：仅区分魂玉类型，与元素无关 */
const catColor = j => (j.category === '招式专精魂玉' ? '#b79cff' : '#7cc2f5');

/** 武器类型名（weaponMods / forWeapon 用） */
const WEAPON_NAMES = { melee: '近战通用', cannon: '火炮', bow: '弓箭', zhanmadao: '斩马刀' };

function renderPool() {
  const list = $('#poolList');
  const equipped = new Set(state.slots.filter(Boolean).map(s => s.jadeId));
  const items = JADES.filter(matchFilter).filter(matchQuery)
    .sort((a, b) => b.score - a.score);

  $('#poolCount').textContent = `${items.length} / ${JADES.length} 颗`;

  if (!items.length) {
    list.innerHTML = `<p class="muted" style="padding:22px 4px;text-align:center">没有匹配的魂玉</p>`;
    return;
  }

  list.innerHTML = items.map(j => {
    const on = equipped.has(j.id);
    return `
      <button type="button" class="pool-card ${on ? 'equipped' : ''}"
              data-id="${j.id}" ${on ? 'disabled' : ''} draggable="${!on}"
              style="--el:${catColor(j)}" title="${j.brief}">
        <img src="${j.icon}" alt="${j.name}" loading="lazy">
        <div class="pc-main">
          <div class="pc-top">
            <span class="pc-name">${j.name}</span>
            <span class="tag rarity-${j.rarity}">${j.rarity}</span>
            <span class="tag cat">${j.category}</span>
          </div>
          <div class="pc-brief">${j.brief}</div>
        </div>
        <div class="pc-side">
          <span class="pc-score">${j.score}</span>
          ${on ? '<span class="tag ghost">已佩戴</span>' : '<span class="tag ghost">佩戴</span>'}
        </div>
      </button>`;
  }).join('');

  $$('.pool-card', list).forEach(card => {
    card.addEventListener('click', () => equip(card.dataset.id));
    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', card.dataset.id);
      e.dataTransfer.effectAllowed = 'copy';
    });
  });
}

/* ---------- 配装 ---------- */
function equip(jadeId) {
  if (state.slots.some(s => s && s.jadeId === jadeId)) { toast('该魂玉已在配装中'); return; }
  let idx = state.slots.findIndex(s => !s || !s.jadeId);
  if (idx === -1) {
    toast('槽位已满，请先卸下或增加槽位');
    return;
  }
  state.slots[idx] = emptySlot();
  state.slots[idx].jadeId = jadeId;
  save(true);
  renderAll();
}

function unequip(idx) {
  if (!state.slots[idx]) return;
  state.slots[idx] = null;
  save(true);
  renderAll();
}

function renderBuild() {
  const wrap = $('#slots');
  wrap.innerHTML = '';

  state.slots.forEach((slot, i) => {
    const el = document.createElement('div');
    el.className = 'slot';
    el.dataset.slot = i;

    if (!slot || !slot.jadeId) {
      el.innerHTML = `<button type="button" class="slot-empty">
          <span class="plus">＋</span><span>空槽位 ${i + 1}</span>
        </button>`;
    } else {
      el.appendChild(buildJadeCard(slot, i));
    }
    wrap.appendChild(el);
  });

  // 拖拽放置
  $$('.slot', wrap).forEach(el => {
    el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drag-over'); });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
    el.addEventListener('drop', e => {
      e.preventDefault();
      el.classList.remove('drag-over');
      const id = e.dataTransfer.getData('text/plain');
      const idx = +el.dataset.slot;
      if (!id || !JADE_BY_ID[id]) return;
      if (state.slots.some(s => s && s.jadeId === id)) { toast('该魂玉已在配装中'); return; }
      state.slots[idx] = emptySlot();
      state.slots[idx].jadeId = id;
      save(true);
      renderAll();
    });
  });

  const n = state.slots.filter(s => s && s.jadeId).length;
  $('#buildSummary').textContent = `${n} / ${state.slots.length} 槽位`;
  $('#tabBuildBadge').textContent = n;
}

function buildJadeCard(slot, idx) {
  const j = JADE_BY_ID[slot.jadeId];
  const card = document.createElement('div');
  card.className = 'jade-card';
  card.style.setProperty('--el', catColor(j));
  const canImbue = !(j.mods && j.mods.cannotImbue);
  const curEl = slot.element && ELEMENTS[slot.element] ? ELEMENTS[slot.element] : null;

  /* 4 个词条槽位，每格可选普通词条或稀有词条，稀有词条不限制数量 */
  const subsAll = (slot.subs || []).slice(0, SLOTS_PER_JADE);
  while (subsAll.length < SLOTS_PER_JADE) subsAll.push(null);
  const usedNormals = subsAll.filter(id => id && !isRareId(id));
  const rarePicked  = subsAll.filter(isRareId);
  const hedaoCount  = subsAll.filter(id => id === 'hedao').length;
  const hedaoMul    = 1 + 0.5 * hedaoCount;    // 合道可叠加：每条 +50%
  const hasHedao    = hedaoCount > 0;
  const usedCnt     = subsAll.filter(Boolean).length;

  let subRows = '';
  for (let si = 0; si < SLOTS_PER_JADE; si++) {
    const cur = subsAll[si] || null;

    const normalOpts = AFFIXES.map(a => {
      const dup = usedNormals.indexOf(a.id) >= 0 && a.id !== cur;
      return `<option value="${a.id}" ${a.id === cur ? 'selected' : ''} ${dup ? 'disabled' : ''}>${
        a.icon} ${a.name} +${a.value}%</option>`;
    }).join('');
    const rareOpts = RARES.filter(r => r.id !== 'none').map(r =>
      `<option value="${r.id}" ${r.id === cur ? 'selected' : ''}>${r.name}　${r.short}</option>`
    ).join('');
    const opts = `<option value="">— 空 —</option>
        <optgroup label="普通词条">${normalOpts}</optgroup>
        <optgroup label="稀有词条">${rareOpts}</optgroup>`;

    let valHtml;
    if (!cur) {
      valHtml = `<span class="sub-val empty">—</span>`;
    } else if (isRareId(cur)) {
      valHtml = `<span class="sub-val rare rare-${cur}">${RARE_BY_ID[cur].short}</span>`;
    } else {
      valHtml = `<span class="sub-val ${hasHedao ? 'boosted' : ''}">${
        pct(AFFIX_BY_ID[cur].value * hedaoMul)}${
        hasHedao ? ` <small>合道${hedaoCount > 1 ? ` ×${hedaoCount}` : ''}</small>` : ''}</span>`;
    }
    subRows += `<div class="sub-row${cur && isRareId(cur) ? ' has-rare' : ''}">
        <select class="sub-select" data-slot="${idx}" data-sub="${si}">${opts}</select>
        ${valHtml}
      </div>`;
  }

  // 说明文字：列出这颗玉上所有已选稀有词条（去重，多条时标注 ×N）
  const rareCounts = {};
  rarePicked.forEach(id => { rareCounts[id] = (rareCounts[id] || 0) + 1; });
  const rareDesc = Object.keys(rareCounts)
    .map(id => {
      const r = RARE_BY_ID[id] || {};
      return `${r.name}${rareCounts[id] > 1 ? ` ×${rareCounts[id]}` : ''}：${r.desc || ''}`;
    })
    .join('　|　');

  card.innerHTML = `
    <div class="jc-head">
      <div class="jc-icon-wrap">
        <img class="jc-icon" src="${j.icon}" alt="${j.name}">
        ${curEl ? `<img class="jc-el-badge" src="${curEl.icon}" alt="${curEl.name}元素" title="已染${curEl.name}元素">` : ''}
      </div>
      <div class="jc-title">
        <div class="jc-name-row">
          <span class="jc-name">${j.name}</span>
          <span class="tag rarity-${j.rarity}">${j.rarity}</span>
          <span class="tag cat">${j.category}</span>
          ${curEl ? `<span class="tag el" style="--el:${curEl.color}">${elImg(curEl.id, 'el-icon xs')} 染${curEl.name}</span>`
                  : '<span class="tag ghost">未染元素</span>'}
        </div>
        <div class="jc-meta">评分 ${j.score} · 槽位 ${idx + 1}</div>
      </div>
      <button type="button" class="jc-remove" data-remove="${idx}" title="卸下">✕</button>
    </div>
    <div class="jc-brief">${j.brief}</div>
    <div class="jc-effect">
      ${j.forWeapon ? `<span class="eff spec">仅对【${WEAPON_NAMES[j.forWeapon] || j.forWeapon}】生效</span>` : ''}
      ${(j.bullets || []).map(b => {
        const neg = /降低|负面|上限降低|减少技能/.test(b) && !/层数减|冷却时间降低/.test(b);
        return `<span class="eff ${neg ? 'neg' : ''}">${b}</span>`;
      }).join('')}
    </div>
    <div class="jc-imbue${canImbue ? '' : ' disabled'}">
      <span class="imbue-label">染元素</span>
      ${canImbue
        ? ELEMENT_LIST.map(el => {
            const e = ELEMENTS[el];
            return `<button type="button" class="imbue-btn${slot.element === el ? ' active' : ''}"
                      data-imbue="${el}" data-slot="${idx}" style="--el:${e.color}"
                      title="染${e.name}元素">${elImg(el, 'el-icon sm')}<span>${e.name}</span></button>`;
          }).join('')
        : '<span class="imbue-hint">该魂玉无法染元素</span>'}
      ${canImbue && !slot.element ? '<span class="imbue-hint">未染元素，元素相关加成不生效</span>' : ''}
    </div>
    <div class="jc-sub-area">
      <div class="sub-title">
        <span>词条槽位</span>
        <span class="sub-count ${usedCnt >= SLOTS_PER_JADE ? 'full' : ''}">${usedCnt} / ${SLOTS_PER_JADE}</span>
        ${hasHedao ? `<span class="tag rarity-极">合道 ×${hedaoCount} → 副属性 ×${round1(hedaoMul)}</span>` : ''}
      </div>
      ${subRows}
      ${rareDesc ? `<div class="rare-desc">${rareDesc}</div>` : ''}
    </div>`;

  card.querySelector('[data-remove]').addEventListener('click', () => unequip(idx));
  $$('.imbue-btn', card).forEach(btn => btn.addEventListener('click', () => {
    const s = state.slots[idx];
    s.element = (s.element === btn.dataset.imbue) ? null : btn.dataset.imbue;  // 再点一次取消
    save(true);
    renderAll();
  }));
  $$('.sub-select', card).forEach(sel => sel.addEventListener('change', () => {
    state.slots[idx].subs[+sel.dataset.sub] = sel.value || null;
    save(true);
    renderAll();
  }));
  return card;
}

/* ---------- 属性面板 ---------- */
const MOD_LABELS = {
  atkPct: '攻击力', critRate: '暴击率', critDmg: '暴击伤害', elemCritRate: '元素暴击率',
  iceDmg: '冰爆伤害', thunderDmg: '天雷伤害', poisonDmg: '毒爆伤害', elemAccum: '元素积累效率',
  bossDmg: '对首领伤害', rangedDmg: '远程招式增伤', divineEff: '神射值效率', skillDmg: '招式伤害',
  cdr: '技能冷却缩减', meibu: '枚卜', dmgPct: '全局增伤', elemDmgPct: '元素伤害',
};
const modsText = mods =>
  Object.keys(mods || {}).map(k => `${MOD_LABELS[k] || k} ${pct(mods[k])}`).join('、');

const STAT_HINTS = {
  '攻击力加成': '所有【攻击】词条与魂玉固定攻击加成的总和',
  '有效暴击率': '经过【枚卜】双暴判定修正后的等效暴击率',
  '元素暴击率加成': '来自烈元诀等魂玉的元素暴击率加成',
  '元素暴击率（总）': '暴击率 + 元素暴击率加成',
  '元素有效暴击率': '元素暴击率经过【枚卜】修正后的等效值',
  '元素积累效率': '基准 100%，越高元素爆发触发越频繁',
  '未生效元素加成': '【元素奔涌】等魂玉的加成会跟随该魂玉所染元素；未染元素则不计入',
  '对首领伤害': '仅在参数中勾选“计入对首领伤害”时参与计算',
  '远程招式增伤': '仅在选择【火炮】时参与普攻计算',
  '招式伤害': '影响普攻与技能，烈元诀会使其降低',
  '技能冷却缩减': '【化气】提供，按 1/(1−CDR) 提升技能频率',
  '枚卜·双暴判定': '触发两次暴击判定并取更优结果的概率',
  '合道': '使所在魂玉的普通词条额外增加 50%；多条可叠加（N 条 = ×(1 + 0.5N)）',
  '冰爆段数': '【连续冰爆】使一次冰爆连续触发多段，但单段伤害降低',
  '霜冻值上限': '【爆冰诀】会降低自身霜冻值上限',
  '瘴毒引爆层数': '【淬毒术】降低引爆所需的瘴毒层数',
};

function renderStats() {
  const S = totals();
  const D = damage(S, state.params);
  const base = baselineDPS();
  const index = base > 0 ? (D.totalDPS / base) * 100 : 100;

  const rareN = S.rareList.length;
  const imb = ELEMENT_LIST.filter(el => S.imbue[el] > 0)
    .map(el => `${elImg(el, 'el-icon sm')}<span class="imb-name">${ELEMENTS[el].name}×${S.imbue[el]}</span>`)
    .join(' ');
  if (S.jadeCount) {
    $('#scoreSummary').innerHTML =
      `${S.jadeCount} 颗 · 词条 ${S.subCount + rareN} 条 · 染元素 ${imb || '<span class="muted">无</span>'}`;
  } else {
    $('#scoreSummary').textContent = '尚未佩戴魂玉';
  }

  /* --- 属性格 --- */
  const act = state.params.element;
  const cells = [
    ['攻击力加成',    S.atkPct,                                        '%',  S.atkPct !== 0],
    ['暴击率',        D.totalCritRate,                                 '%',  true],
    ['暴击伤害',      D.totalCritDmg,                                  '%',  true],
    ['有效暴击率',    round1(D.effCrit * 100),                         '%',  S.meibu > 0],
    ['元素暴击率加成', S.elemCritRate,                                 '%',  S.elemCritRate !== 0],
    ['元素暴击率（总）', round1(clamp(D.totalCritRate + S.elemCritRate, 0, 100)), '%', (D.totalCritRate + S.elemCritRate) !== 0],
    ['元素有效暴击率', round1(D.effElemCrit * 100),                    '%',  S.meibu > 0],
    ['冰爆伤害加成' + (act === 'ice' ? '（输出）' : ''),     S.iceDmg,     '%', S.iceDmg !== 0],
    ['天雷伤害加成' + (act === 'thunder' ? '（输出）' : ''), S.thunderDmg, '%', S.thunderDmg !== 0],
    ['毒爆伤害加成' + (act === 'poison' ? '（输出）' : ''),  S.poisonDmg,  '%', S.poisonDmg !== 0],
    ['未生效元素加成', S.unimbuedElemDmg,                              '%',  S.unimbuedElemDmg > 0],
    ['全局增伤',      S.dmgPct,                                        '%',  S.dmgPct !== 0],
    ['元素伤害修正',  S.elemDmgPct,                                    '%',  S.elemDmgPct !== 0],
    ['元素积累效率',  100 + S.elemAccum,                               '%',  S.elemAccum !== 0],
    ['对首领伤害',    S.bossDmg,                                       '%',  S.bossDmg !== 0],
    ['远程招式增伤',  S.rangedDmg,                                     '%',  S.rangedDmg !== 0],
    ['神射值积攒效率', S.divineEff,                                    '%',  S.divineEff !== 0],
    ['招式伤害',      S.skillDmg,                                      '%',  S.skillDmg !== 0],
    ['技能冷却缩减',  S.cdr,                                           '%',  S.cdr !== 0],
    ['枚卜·双暴判定', S.meibu,                                         '%',  S.meibu !== 0],
    ['合道',          S.hedaoCount,                                    '条', S.hedaoCount !== 0],
    ['冰爆段数',      S.iceHits,                                       '段', S.iceHits > 1],
    ['霜冻值上限',    S.frostCap,                                      '点', S.frostCap !== 0],
    ['瘴毒引爆层数',  S.poisonLayerNeed,                               '层', S.poisonLayerNeed !== 0],
  ];

  $('#statGrid').innerHTML = cells.map(([k, v, unit, on]) => {
    const cls = v > 0 ? 'pos' : (v < 0 ? 'neg' : '');
    const text = on ? (unit === '%' ? pct(v) : `${v > 0 ? '+' : ''}${round1(v)}${unit}`) : `—`;
    const hint = STAT_HINTS[k] ? ` title="${STAT_HINTS[k]}"` : '';
    return `<div class="stat-cell ${on ? 'on' : ''}"${hint}>
        <span class="k">${k}</span><span class="v ${on ? cls : ''}">${text}</span>
      </div>`;
  }).join('');

  /* --- 伤害明细 --- */
  const rows = [
    ['攻击力（含加成）',        num(D.atk),            ''],
    ['普攻 · 不暴击',           num(D.naNoCrit),       'nocrit'],
    ['普攻 · 暴击',             num(D.naCrit),         'crit'],
    ['普攻 · 期望（每次）',      num(D.naExpect),       'hl'],
    ['普攻 · 期望 DPS',         num(D.naDPS),          ''],
    ['元素 · 不暴击',           num(D.elemNoCrit),     'nocrit'],
    ['元素 · 暴击',             num(D.elemCrit),       'crit'],
    ['元素 · 期望（每次）',      num(D.elemExpect),     'hl'],
    [`元素 · 期望 DPS（${elName(state.params.element)}）`, num(D.elemDPS), ''],
    ['技能 · 期望（每次）',      num(D.skillExpect),    ''],
    ['技能 · 期望 DPS',         num(D.skillDPS),       ''],
  ];
  if (S.meteor && state.params.meteorOn) {
    rows.push(['流星打击 · 估算 DPS', num(D.procDPS), '']);
  }

  $('#dmgTable').innerHTML = rows.map(([k, v, cls]) =>
    `<div class="dmg-row ${cls}"><span class="k">${k}</span><span class="v">${v}</span></div>`
  ).join('');

  $('#dmgTotal').innerHTML = `
    <div>
      <div class="label">综合期望伤害 · 每秒</div>
      <div class="unit">普攻 + 元素 + 技能${S.meteor && state.params.meteorOn ? ' + 流星' : ''}</div>
    </div>
    <div><span class="num">${num(D.totalDPS)}</span> <span class="unit">/秒</span></div>`;

  $('#baselineValue').textContent = index.toFixed(1);

  /* --- 特殊效果 --- */
  const sp = [];
  S.specials.forEach(s => sp.push(`<li><b>${s.jade}</b> — ${s.text}</li>`));
  // 稀有词条按「魂玉 + 词条」聚合，多条时标注 ×N
  const rareAgg = new Map();
  S.rareList.forEach(r => {
    const k = r.jade + '\u0000' + r.name;
    rareAgg.set(k, (rareAgg.get(k) || 0) + 1);
  });
  rareAgg.forEach((n, k) => {
    const [jade, name] = k.split('\u0000');
    sp.push(`<li><b>${jade}</b> — 稀有词条【${name}】${n > 1 ? ` ×${n}` : ''}</li>`);
  });
  if (S.cannotImbue) sp.push(`<li><b>通用·夺魂</b> — 该魂玉无法激活熏印元素效果</li>`);
  $('#specialBlock').style.display = sp.length ? '' : 'none';
  $('#specialList').innerHTML = sp.length ? sp.join('')
    : '<li class="empty">当前配装没有特殊机制效果</li>';

  /* --- 条件加成开关 --- */
  const condBlock = $('#condBlock');
  if (S.condList.length) {
    condBlock.style.display = '';
    $('#condList').innerHTML = S.condList.map(c =>
      `<label class="cond-item${c.on ? ' on' : ''}">
         <input type="checkbox" data-cond="${c.key}" ${c.on ? 'checked' : ''}>
         <span class="cond-jade">${escapeHtml(c.jade)}</span>
         <span class="cond-label">${escapeHtml(c.label)}</span>
         <b class="cond-val">${modsText(c.mods)}</b>
       </label>`).join('');
    $$('[data-cond]', condBlock).forEach(inp => inp.addEventListener('change', () => {
      state.params.conds[inp.dataset.cond] = inp.checked;
      save(true);
      renderStats();          // 重渲染整块，顺带刷新开关自身的 on 样式
    }));
  } else {
    condBlock.style.display = 'none';
    $('#condList').innerHTML = '';
  }
}

/* ---------- 参数面板 ---------- */
const PARAM_SCHEMA = [
  { key: 'baseAtk',   label: '基础攻击力',      type: 'number', step: 10,  min: 1 },
  { key: 'element',   label: '武器输出元素',    type: 'select',
    options: [['thunder', '⚡ 雷（天雷）'], ['ice', '❄ 冰（冰爆）'], ['poison', '☠ 毒（毒爆）']] },
  { key: 'weapon',    label: '武器类型',        type: 'select',
    options: [['melee', '近战通用'], ['cannon', '火炮'], ['bow', '弓箭'], ['zhanmadao', '斩马刀']] },
  { key: 'naMul',     label: '普攻倍率 %',      type: 'number', step: 5,   min: 0 },
  { key: 'naFreq',    label: '普攻频率 次/秒',  type: 'number', step: 0.1, min: 0.1 },
  { key: 'baseCritRate', label: '基础暴击率 %', type: 'number', step: 1,   min: 0 },
  { key: 'baseCritDmg',  label: '基础暴击伤害 %', type: 'number', step: 5, min: 0 },
  { key: 'elemMul',   label: '元素倍率 %',      type: 'number', step: 10,  min: 0 },
  { key: 'elemFreq',  label: '元素频率 次/秒',  type: 'number', step: 0.05, min: 0.01 },
  { key: 'skillMul',  label: '技能倍率 %',      type: 'number', step: 10,  min: 0 },
  { key: 'skillFreq', label: '技能频率 次/秒',  type: 'number', step: 0.05, min: 0.01 },
  { key: 'meteorMul', label: '流星倍率 %',      type: 'number', step: 10,  min: 0 },
  { key: 'meteorCd',  label: '流星冷却 秒',     type: 'number', step: 0.5, min: 0.5 },
  { key: 'unusedPoints', label: '未使用潜能点',  type: 'number', step: 1, min: 0 },
];

function renderParams() {
  const box = $('#paramGrid');
  box.innerHTML = PARAM_SCHEMA.map(s => {
    const v = state.params[s.key];
    if (s.type === 'select') {
      return `<div class="param-cell"><label>${s.label}</label>
        <select data-param="${s.key}">${s.options.map(([val, t]) =>
          `<option value="${val}" ${v === val ? 'selected' : ''}>${t}</option>`).join('')}</select></div>`;
    }
    return `<div class="param-cell"><label>${s.label}</label>
      <input type="number" data-param="${s.key}" value="${v}" step="${s.step}" min="${s.min}"></div>`;
  }).join('') + `
    <div class="param-cell"><label>计入项</label>
      <label class="param-toggle"><input type="checkbox" data-flag="bossDmgOn" ${state.params.bossDmgOn ? 'checked' : ''}> 对首领伤害</label>
      <label class="param-toggle" style="padding-top:2px"><input type="checkbox" data-flag="rangedDmgOn" ${state.params.rangedDmgOn ? 'checked' : ''}> 远程招式增伤</label>
      <label class="param-toggle" style="padding-top:2px"><input type="checkbox" data-flag="meteorOn" ${state.params.meteorOn ? 'checked' : ''}> 流星特效估算</label>
    </div>`;

  $$('[data-param]', box).forEach(inp => inp.addEventListener('change', () => {
    const k = inp.dataset.param;
    state.params[k] = inp.type === 'number' ? (parseFloat(inp.value) || 0) : inp.value;
    save(); renderStats();
  }));
  $$('[data-flag]', box).forEach(inp => inp.addEventListener('change', () => {
    state.params[inp.dataset.flag] = inp.checked;
    save(); renderStats();
  }));
}

/* ---------- 公式说明 ---------- */
function renderFormula() {
  $('#formulaNote').innerHTML = `
    <p><b>暴击乘区</b>：<code>暴击倍率 = 1 + (基础暴击伤害 + 暴击伤害词条) / 100</code>，
       默认基础暴击伤害 100% 即 2 倍。</p>
    <p><b>枚卜</b>：20% 概率进行两次暴击判定并取更优，等效暴击率为
       <code>p + q·p·(1−p)</code>，其中 <code>q = 枚卜%</code>。</p>
    <p><b>普攻期望</b>：<code>攻击力 × 普攻倍率 × 对首领增伤 × 远程招式增伤 × 有效暴击期望</code>。</p>
    <p><b>元素期望</b>：<code>攻击力 × 元素倍率 × (1 + 对应元素爆伤加成) × 段数修正 × 元素暴击期望</code>；
       元素暴击率 = 暴击率 + 烈元诀等元素暴击率加成。</p>
    <p><b>元素 DPS</b>：<code>元素期望 × 元素频率 × (1 + 元素积累效率)</code>，
       冰爆额外乘以 <code>1 + 冰爆冷却缩减</code>。</p>
    <p><b>技能 DPS</b>：<code>技能期望 × 技能频率 ÷ (1 − 技能冷却缩减)</code>（化气）。</p>
    <p><b>相对基准</b>：同一套参数下不佩戴任何魂玉的综合 DPS 记为 100，用于横向对比配装强度。</p>
    <ul>
      <li><b>染元素</b>：魂玉本身不带元素，佩戴后可在卡片上单独染雷 / 冰 / 毒（默认未染）。
          【元素奔涌】等「随元素改变」的加成会加到<b>该魂玉所染元素</b>对应的伤害上；未染元素则不计入。</li>
      <li><b>词条位规则</b>：每颗魂玉固定 <b>4 个词条槽位</b>，
          每一格都可以选<b>普通词条</b>或<b>稀有词条</b>，稀有词条不限制数量
          （可以 4 格全合道，也可以三种稀有各来一条）。</li>
      <li>魂玉本体的固定数值（如冰渊爆 +60% 冰爆伤害）直接累加，不占用词条位。</li>
      <li>普通词条为满数值；【合道】<b>可叠加</b>——该魂玉上有 N 条合道，其普通词条就 ×(1 + 0.5N)。</li>
      <li>无明确数值的机制（如流星、毒沼）不计入期望，仅在“已激活特殊效果”中提示。</li>
    </ul>`;
}

/* ======================================================================
 *  主题色（取色圆环）
 * ====================================================================== */
const THEME_KEY = 'naraka-souljade-theme';
const DEFAULT_THEME = { h: 209, s: 100, l: 79 };          // ≈ #8fcbff 淡蓝
const THEME_PRESETS = [
  { name: '淡蓝',   h: 209, s: 100, l: 79 },
  { name: '青碧',   h: 174, s:  80, l: 64 },
  { name: '翠绿',   h: 142, s:  62, l: 64 },
  { name: '橙金',   h:  36, s:  92, l: 68 },
  { name: '绯红',   h: 356, s:  82, l: 70 },
  { name: '品红',   h: 318, s:  76, l: 72 },
  { name: '紫罗兰', h: 268, s:  78, l: 76 },
  { name: '石墨灰', h: 212, s:  16, l: 76 },
];
let currentTheme = Object.assign({}, DEFAULT_THEME);

/** HSL -> [r,g,b] */
function hsl2rgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = clamp(s, 0, 100) / 100;
  l = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if      (h <  60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else              { r = c; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/** 由主色调推导出整套 CSS 变量 */
function themeVars(t) {
  const a = hsl2rgb(t.h, t.s, t.l);
  const b = hsl2rgb(t.h, Math.min(100, t.s + 8), Math.max(32, t.l - 30));  // 背景渐变的深色端
  const x = hsl2rgb(t.h, Math.min(55, t.s * 0.5), 95);                     // 主色上的高亮文字
  return {
    a: `${a[0]},${a[1]},${a[2]}`,
    b: `${b[0]},${b[1]},${b[2]}`,
    t: `rgb(${x[0]},${x[1]},${x[2]})`,
  };
}

function applyTheme(t, persist) {
  const th = t || DEFAULT_THEME;
  const v = themeVars(th);
  const st = document.documentElement.style;
  st.setProperty('--accent-rgb', v.a);
  st.setProperty('--accent-rgb-2', v.b);
  st.setProperty('--accent-text', v.t);
  const dot = $('#themeDot');
  if (dot) dot.style.background = `rgb(${v.a})`;
  currentTheme = { h: th.h, s: th.s, l: th.l };
  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, JSON.stringify({
        h: th.h, s: th.s, l: th.l, a: v.a, b: v.b, t: v.t,
      }));
    } catch (e) { /* 忽略隐私模式 */ }
  }
}

function loadTheme() {
  try {
    const d = JSON.parse(localStorage.getItem(THEME_KEY) || 'null');
    if (d && typeof d.h === 'number' && typeof d.s === 'number' && typeof d.l === 'number') return d;
  } catch (e) { /* 忽略 */ }
  return null;
}

function initTheme() {
  const saved = loadTheme();
  currentTheme = saved ? { h: saved.h, s: saved.s, l: saved.l } : Object.assign({}, DEFAULT_THEME);
  applyTheme(currentTheme, false);

  const panel  = $('#themePanel');
  const wheel  = $('#themeWheel');
  const cursor = $('#themeCursor');
  const light  = $('#themeLight');
  const lightV = $('#themeLightVal');

  light.value = currentTheme.l;
  lightV.textContent = currentTheme.l;

  // 预设色块
  $('#themeSwatches').innerHTML = THEME_PRESETS.map((p, i) => {
    const c = hsl2rgb(p.h, p.s, p.l);
    return `<button type="button" class="theme-sw" data-i="${i}" title="${p.name}"
              style="background:rgb(${c[0]},${c[1]},${c[2]})"></button>`;
  }).join('');
  $$('.theme-sw').forEach(b => b.addEventListener('click', () => {
    const p = THEME_PRESETS[+b.dataset.i];
    currentTheme = { h: p.h, s: p.s, l: p.l };
    light.value = p.l; lightV.textContent = p.l;
    applyTheme(currentTheme, false);
    moveCursor();
  }));

  function moveCursor() {
    const R = wheel.clientWidth / 2;
    if (!R) return;
    const ang = currentTheme.h * Math.PI / 180;
    const rad = (currentTheme.s / 100) * R;
    cursor.style.transform = `translate(${Math.cos(ang) * rad}px, ${Math.sin(ang) * rad}px)`;
  }
  function pick(e) {
    const r = wheel.getBoundingClientRect();
    const R = r.width / 2;
    if (!R) return;
    const dx = e.clientX - (r.left + R);
    const dy = e.clientY - (r.top + R);
    const dist = Math.min(Math.hypot(dx, dy), R);
    currentTheme = {
      h: Math.round((Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360),
      s: Math.round(dist / R * 100),
      l: +light.value,
    };
    applyTheme(currentTheme, false);
    moveCursor();
  }
  let drag = false;
  wheel.addEventListener('pointerdown', e => {
    drag = true;
    if (wheel.setPointerCapture) wheel.setPointerCapture(e.pointerId);
    pick(e);
  });
  wheel.addEventListener('pointermove', e => { if (drag) pick(e); });
  ['pointerup', 'pointercancel'].forEach(ev =>
    wheel.addEventListener(ev, () => { drag = false; }));

  light.addEventListener('input', () => {
    lightV.textContent = light.value;
    currentTheme.l = +light.value;
    applyTheme(currentTheme, false);
  });

  $('#themeApply').addEventListener('click', () => {
    applyTheme(currentTheme, true);
    panel.classList.remove('open');
    toast('已应用主题');
  });
  $('#themeReset').addEventListener('click', () => {
    currentTheme = Object.assign({}, DEFAULT_THEME);
    light.value = currentTheme.l; lightV.textContent = currentTheme.l;
    applyTheme(currentTheme, true);
    moveCursor();
    toast('已恢复默认配色');
  });

  $('#btnTheme').addEventListener('click', e => {
    e.stopPropagation();
    if (!panel.classList.contains('open')) placePanel(panel, e.currentTarget);
    const open = panel.classList.toggle('open');
    if (open) {
      $('#presetMenu').classList.remove('open');
      $('#buildMenu').classList.remove('open');
      moveCursor();
    }
  });
  panel.addEventListener('click', e => e.stopPropagation());
  document.addEventListener('click', () => panel.classList.remove('open'));
  window.addEventListener('resize', () => {
    moveCursor();
    if (panel.classList.contains('open')) placePanel(panel, $('#btnTheme'));
  });

  moveCursor();
}

/* ======================================================================
 *  我的配装（命名存档）
 * ====================================================================== */
const BUILDS_KEY = 'naraka-souljade-builds';

const escapeHtml = s => String(s).replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function loadBuilds() {
  try {
    const d = JSON.parse(localStorage.getItem(BUILDS_KEY) || '[]');
    return Array.isArray(d) ? d : [];
  } catch (e) { return []; }
}
function persistBuilds(list) {
  try { localStorage.setItem(BUILDS_KEY, JSON.stringify(list)); } catch (e) { /* 忽略 */ }
}
/** 当前配装的快照 */
function snapshot() {
  return {
    params: JSON.parse(JSON.stringify(state.params)),
    slots: state.slots.map(s => s && s.jadeId
      ? { jadeId: s.jadeId, subs: (s.subs || []).slice(), element: s.element || null }
      : null),
  };
}
/* 单靠 Date.now() 在同一毫秒内连续保存会撞号，附加自增序号 + 随机串 */
let buildSeq = 0;
const newBuildId = () =>
  `b${Date.now().toString(36)}-${(++buildSeq).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/** 同名则覆盖，返回 'added' | 'updated' */
function saveBuild(name) {
  const list = loadBuilds();
  const snap = snapshot();
  const i = list.findIndex(b => b.name === name);
  const rec = Object.assign({ id: newBuildId(), name, ts: Date.now() }, snap);
  if (i >= 0) { rec.id = list[i].id; list[i] = rec; } else { list.unshift(rec); }
  persistBuilds(list);
  renderBuilds();
  return i >= 0 ? 'updated' : 'added';
}
function deleteBuild(id) {
  persistBuilds(loadBuilds().filter(b => b.id !== id));
  renderBuilds();
}
function applyBuild(id) {
  const b = loadBuilds().find(x => x.id === id);
  if (!b) return;
  state.params = Object.assign({}, DEFAULT_PARAMS, b.params || {});
  normalizeParams();
  state.slots = (b.slots || []).map(normalizeSlot);
  resizeSlots(state.params.slotCount);
  syncControls(); renderParams(); save(true); renderAll();
  toast(`已载入【${b.name}】`);
}

function renderBuilds() {
  const box = $('#buildMenu');
  if (!box) return;
  const list = loadBuilds();
  const badge = $('#buildCount');
  if (badge) badge.textContent = list.length;

  if (!list.length) {
    box.innerHTML = `<div class="menu-empty">还没有保存的配装<span><br>配好后点上面的「保存」起个名字</span></div>`;
    return;
  }
  box.innerHTML = list.map(b => {
    const n = (b.slots || []).filter(s => s && s.jadeId).length;
    const d = new Date(b.ts || Date.now());
    const p2 = v => String(v).padStart(2, '0');
    const time = `${d.getMonth() + 1}/${d.getDate()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
    return `<div class="build-item">
        <button type="button" class="build-load" data-load="${b.id}" title="载入这套配装">
          <b>${escapeHtml(b.name)}</b><span>${n} 颗魂玉 · ${time}</span>
        </button>
        <button type="button" class="build-del" data-del="${b.id}" title="删除">✕</button>
      </div>`;
  }).join('');

  $$('[data-load]', box).forEach(el => el.addEventListener('click', e => {
    e.stopPropagation();
    applyBuild(el.dataset.load);
  }));
  $$('[data-del]', box).forEach(el => el.addEventListener('click', e => {
    e.stopPropagation();
    const b = list.find(x => x.id === el.dataset.del);
    if (!confirm(`确定删除配装「${b ? b.name : ''}」吗？`)) return;
    deleteBuild(el.dataset.del);
    toast('已删除');
  }));
}

/** 保存弹窗：输入自定义名称 */
function openSaveBuild() {
  const n = state.slots.filter(s => s && s.jadeId).length;
  if (!n) { toast('先佩戴魂玉再保存吧'); return; }
  const list = loadBuilds();
  const dft = `配装 ${list.length + 1}`;

  const mask = document.createElement('div');
  mask.className = 'modal-mask';
  mask.innerHTML = `
    <div class="modal">
      <h3>保存配装</h3>
      <p style="margin:0;font-size:12px;color:var(--text-3);line-height:1.7">
        给这套配装起个名字（${n} 颗魂玉），之后可在「我的配装」里随时载入。<br>
        重名会覆盖原来的那套。
      </p>
      <input class="name-input" id="buildNameInput" maxlength="24" placeholder="例如：百化冰陨流 · 毕业">
      <div class="modal-actions">
        <button type="button" class="btn" data-close>取消</button>
        <button type="button" class="btn btn-primary" data-ok>保存</button>
      </div>
    </div>`;

  const input = $('#buildNameInput', mask);
  const doSave = () => {
    const name = (input.value || '').trim() || dft;
    const r = saveBuild(name);
    mask.remove();
    toast(r === 'updated' ? `已更新【${name}】` : `已保存【${name}】`);
  };
  mask.addEventListener('click', e => {
    if (e.target === mask || e.target.hasAttribute('data-close')) mask.remove();
  });
  $('[data-ok]', mask).addEventListener('click', doSave);
  input.value = dft;
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); doSave(); }
    if (e.key === 'Escape') mask.remove();
  });
  document.body.appendChild(mask);
  input.focus();
  input.select();
}

/* ---------- 下拉面板定位 ---------- */
/* 窄屏时下拉是 position:fixed，需要按触发按钮的位置算出 top，
   否则贴边的按钮（第一列 / 最后一列）会把面板顶出屏幕 */
function placePanel(panel, btn) {
  if (!panel) return;
  if (window.innerWidth > 860) { panel.style.top = ''; return; }
  const r = btn.getBoundingClientRect();
  panel.style.top = Math.round(r.bottom + 8) + 'px';
}

/* ---------- 总渲染 ---------- */
function renderAll() {
  renderPool();
  renderBuild();
  renderStats();
}

/* ======================================================================
 *  持久化 / 导入导出
 * ====================================================================== */
function save(silent) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      params: state.params, slots: state.slots, v: 1,
    }));
    if (!silent) toast('已保存到本机浏览器');
  } catch (e) { /* 忽略隐私模式下的写入失败 */ }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d || !Array.isArray(d.slots)) return false;
    state.params = Object.assign({}, DEFAULT_PARAMS, d.params || {});
    state.slots = d.slots;
    return true;
  } catch (e) { return false; }
}

function exportJSON() {
  const data = { app: 'naraka-souljade', version: 1, params: state.params, slots: state.slots };
  const text = JSON.stringify(data, null, 2);
  const link = shareLink(data);
  showModal(text, link);
}

/* ---------- 分享链接 ---------- */
function b64encode(str) {
  try {
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) { return ''; }
}
function b64decode(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(s + '='.repeat((4 - s.length % 4) % 4))));
}
function shareLink(data) {
  const payload = b64encode(JSON.stringify({ p: data.params, s: data.slots }));
  // file:// 下 origin 为 "null"，改用完整路径，保证本地打开也能还原
  const base = (location.protocol === 'file:')
    ? location.href.split('#')[0]
    : location.origin + location.pathname;
  return base + '#build=' + payload;
}

function showModal(text, link) {
  const mask = document.createElement('div');
  mask.className = 'modal-mask';
  mask.innerHTML = `
    <div class="modal">
      <h3>导出 / 分享配装</h3>
      <p class="muted" style="margin:0">下方链接已包含完整配装，打开即自动还原。</p>
      <input class="share-input" readonly value="${link}" style="width:100%;padding:8px 10px;border-radius:8px;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.08);outline:none;font-size:12px">
      <textarea readonly>${text.replace(/</g, '&lt;')}</textarea>
      <div class="modal-actions">
        <button type="button" class="btn" data-copy-link>复制链接</button>
        <button type="button" class="btn" data-copy-json>复制 JSON</button>
        <button type="button" class="btn" data-close>关闭</button>
      </div>
    </div>`;
  mask.addEventListener('click', e => {
    if (e.target === mask || e.target.hasAttribute('data-close')) mask.remove();
  });
  const copy = (val, msg) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(val).then(() => toast(msg)).catch(() => {});
    } else { toast(msg); }
  };
  $('[data-copy-link]', mask).addEventListener('click', () => copy(link, '链接已复制'));
  $('[data-copy-json]', mask).addEventListener('click', () => copy(text, 'JSON 已复制'));
  document.body.appendChild(mask);
  const ta = $('textarea', mask); ta.focus(); ta.select();
}

/* ---------- 从 URL 还原配装 ---------- */
function applyHash() {
  const h = (location.hash || '').replace(/^#/, '');
  if (!h) return false;
  const q = new URLSearchParams(h);
  let applied = false;

  // 深链到指定面板（移动端标签页）：#tab=pool|build|stats
  const tab = q.get('tab');
  if (tab && ['pool', 'build', 'stats'].includes(tab)) {
    document.body.dataset.tab = tab;
    syncTabs();
    applied = true;
  }

  const presetId = q.get('preset');
  if (presetId && PRESETS.some(p => p.id === presetId)) {
    applyPreset(presetId);
    if (tab) { document.body.dataset.tab = tab; syncTabs(); }
    return true;
  }
  const build = q.get('build');
  if (build) {
    try {
      const d = JSON.parse(b64decode(build));
      if (!d || !Array.isArray(d.s)) return applied;
      state.params = Object.assign({}, DEFAULT_PARAMS, d.p || {});
      normalizeParams();
      state.slots = d.s.map(normalizeSlot);
      resizeSlots(state.params.slotCount);
      syncControls(); renderParams(); renderAll();
      if (tab) { document.body.dataset.tab = tab; syncTabs(); }
      return true;
    } catch (e) { /* 忽略非法链接 */ }
  }
  return applied;
}

function importJSON() {
  const mask = document.createElement('div');
  mask.className = 'modal-mask';
  mask.innerHTML = `
    <div class="modal">
      <h3>导入配装</h3>
      <textarea placeholder="在此粘贴导出的 JSON，或包含 #build= 的分享链接…"></textarea>
      <div class="modal-actions">
        <button type="button" class="btn" data-close>取消</button>
        <button type="button" class="btn" data-ok>导入</button>
      </div>
    </div>`;
  mask.addEventListener('click', e => {
    if (e.target === mask || e.target.hasAttribute('data-close')) mask.remove();
  });
  $('[data-ok]', mask).addEventListener('click', () => {
    const raw = $('textarea', mask).value.trim();
    try {
      let d;
      if (raw.includes('#build=')) {
        const hash = raw.slice(raw.indexOf('#build=') + 7);
        const payload = JSON.parse(b64decode(hash));
        d = { params: payload.p, slots: payload.s };
      } else if (raw.includes('#preset=')) {
        const pid = raw.slice(raw.indexOf('#preset=') + 8).split('&')[0];
        if (!PRESETS.some(p => p.id === pid)) throw new Error('bad');
        mask.remove(); applyPreset(pid); return;
      } else {
        d = JSON.parse(raw);
      }
      if (!d || !Array.isArray(d.slots)) throw new Error('bad');
      state.params = Object.assign({}, DEFAULT_PARAMS, d.params || {});
      normalizeParams();
      state.slots = d.slots.map(normalizeSlot);
      resizeSlots(state.params.slotCount);
      syncControls(); renderParams();
      save(true);
      renderAll();
      mask.remove();
      toast('导入成功');
    } catch (err) { toast('JSON 或链接格式不正确'); }
  });
  document.body.appendChild(mask);
  $('textarea', mask).focus();
}

function syncControls() {
  $('#slotCountSelect').value = String(state.params.slotCount);
}

/* ---------- 提示条 ---------- */
let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

/* ======================================================================
 *  事件绑定与初始化
 * ====================================================================== */
function bind() {
  $('#searchInput').addEventListener('input', e => {
    state.query = e.target.value;
    renderPool();
  });

  $('#slotCountSelect').addEventListener('change', e => {
    state.params.slotCount = +e.target.value;
    resizeSlots(state.params.slotCount);
    save(true); renderAll();
  });

  $('#imbueAllSelect').addEventListener('change', e => {
    const v = e.target.value;
    if (v === 'keep') return;
    const el = v === 'none' ? null : v;
    state.slots.forEach(s => {
      if (!s || !s.jadeId) return;
      const j = JADE_BY_ID[s.jadeId];
      s.element = (j.mods && j.mods.cannotImbue) ? null : el;
    });
    save(true); renderAll();
    toast(el ? `已把可染元素的魂玉全部染为${ELEMENTS[el].name}` : '已清除全部染元素');
    e.target.value = 'keep';
  });

  $('#btnSave').addEventListener('click', openSaveBuild);
  $('#btnExport').addEventListener('click', exportJSON);
  $('#btnImport').addEventListener('click', importJSON);
  $('#btnClear').addEventListener('click', () => {
    if (!confirm('确定清空当前配装吗？')) return;
    resetSlots(state.params.slotCount, state.params.subCount);
    save(true); renderAll(); toast('已清空配装');
  });

  // 推荐配装菜单
  const menu = $('#presetMenu');
  menu.innerHTML = PRESETS.map(p =>
    `<button type="button" class="menu-item" data-preset="${p.id}">
        <b>${p.name}</b><span>${p.desc}</span></button>`).join('');
  $('#btnPreset').addEventListener('click', e => {
    e.stopPropagation();
    $('#themePanel').classList.remove('open');
    $('#buildMenu').classList.remove('open');
    if (!menu.classList.contains('open')) placePanel(menu, e.currentTarget);
    menu.classList.toggle('open');
  });
  document.addEventListener('click', () => {
    menu.classList.remove('open');
    $('#buildMenu').classList.remove('open');
  });

  // 我的配装
  $('#btnBuilds').addEventListener('click', e => {
    e.stopPropagation();
    $('#presetMenu').classList.remove('open');
    $('#themePanel').classList.remove('open');
    renderBuilds();
    const box = $('#buildMenu');
    if (!box.classList.contains('open')) placePanel(box, e.currentTarget);
    box.classList.toggle('open');
  });
  // 视口变化时重新贴合已打开的下拉
  window.addEventListener('resize', () => {
    if (menu.classList.contains('open')) placePanel(menu, $('#btnPreset'));
    const bm = $('#buildMenu');
    if (bm.classList.contains('open')) placePanel(bm, $('#btnBuilds'));
  });
  $$('[data-preset]', menu).forEach(b => b.addEventListener('click', () => {
    applyPreset(b.dataset.preset);
    menu.classList.remove('open');
  }));

  // 移动端标签页
  $$('.tab').forEach(t => t.addEventListener('click', () => {
    document.body.dataset.tab = t.dataset.tab;
    syncTabs();
  }));

  // 快捷键
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') $$('.modal-mask').forEach(m => m.remove());
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
  });
}

function applyPreset(id) {
  const p = PRESETS.find(x => x.id === id);
  if (!p) return;
  state.params.element = p.element;
  if (p.weapon) state.params.weapon = p.weapon;
  state.params.slotCount = Math.max(state.params.slotCount, p.jades.length);
  resetSlots(state.params.slotCount);
  p.jades.forEach((jid, i) => {
    if (i >= state.slots.length) return;
    const jade = JADE_BY_ID[jid];
    const canImbue = !(jade && jade.mods && jade.mods.cannotImbue);
    const s = normalizeSlot({
      jadeId: jid,
      subs: p.subs[i] || [],
      element: canImbue ? p.element : null,
    });
    if (s) state.slots[i] = s;
  });
  syncControls();
  renderParams();
  save(true);
  renderAll();
  toast(`已载入【${p.name}】`);
}

function syncTabs() {
  const tab = document.body.dataset.tab || 'pool';
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  $$('.panel').forEach(p => p.classList.toggle('tab-active', p.id === 'panel-' + tab));
}

function init() {
  renderChips();
  renderFormula();
  renderParams();
  initTheme();

  const had = load();
  normalizeParams();
  state.slots = (state.slots || []).map(normalizeSlot);
  if (!state.slots.length) resetSlots(state.params.slotCount);
  resizeSlots(state.params.slotCount);

  syncControls();
  bind();
  syncTabs();
  renderBuilds();

  const fromHash = applyHash();
  renderAll();

  window.addEventListener('hashchange', () => {
    if (applyHash()) { syncControls(); renderAll(); }
  });

  if (!had && !fromHash) {
    setTimeout(() => toast('点击魂玉池中的魂玉即可开始配装'), 500);
  }
}

document.addEventListener('DOMContentLoaded', init);

/* 调试出口：控制台可用 window.NarakaSoulJade 检查中间量 */
if (typeof window !== 'undefined') {
  window.NarakaSoulJade = {
    state, totals, damage, baselineDPS, applyPreset, renderAll, normalizeSlot,
    SLOTS_PER_JADE, isRareId, ELEMENTS, ELEMENT_LIST,
    hsl2rgb, themeVars, applyTheme,
    loadBuilds, saveBuild, deleteBuild, applyBuild, renderBuilds, snapshot, openSaveBuild,
    get JADES()   { return JADES; },
    get AFFIXES() { return AFFIXES; },
    get RARES()   { return RARES; },
    get PRESETS() { return PRESETS; },
    get DEFAULT_PARAMS() { return DEFAULT_PARAMS; },
  };
}
})();
