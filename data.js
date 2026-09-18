/* =========================================================================
 * 永劫无间 · 征神之路 魂玉配装工具 —— 数据层
 * 所有词条均按【满数值】录入。
 *
 * 注意：魂玉本身不带元素属性，装备后由玩家自行「染元素」，
 *       因此 JADES 中不含 element 字段；元素在配装槽位上单独选择。
 * ========================================================================= */

/* ---------- 可染元素 ----------
 * icon 为游戏内元素图标（已抠图），魂玉本身不带元素，染色后才会显示对应图标 */
const ELEMENTS = {
  thunder: { id: 'thunder', name: '雷', icon: 'assets/element/thunder.png', color: '#f0c674', dmgKey: 'thunderDmg' },
  ice:     { id: 'ice',     name: '冰', icon: 'assets/element/ice.png',     color: '#a9c4f5', dmgKey: 'iceDmg' },
  poison:  { id: 'poison',  name: '毒', icon: 'assets/element/poison.png',  color: '#cf9ce8', dmgKey: 'poisonDmg' },
  none:    { id: 'none',    name: '未染', icon: null,                       color: '#8ea3b8', dmgKey: null },
};
const ELEMENT_LIST = ['thunder', 'ice', 'poison'];

/* ---------- 普通词条（满数值） ---------- */
/* id 与统计字段同名，便于直接累加 */
const AFFIXES = [
  { id: 'critRate',   name: '暴击率',           value: 3,  icon: '✦', group: '通用' },
  { id: 'critDmg',    name: '暴击伤害',         value: 25, icon: '✦', group: '通用' },
  { id: 'iceDmg',     name: '冰爆伤害加成',     value: 30, icon: '❄', group: '元素' },
  { id: 'thunderDmg', name: '天雷伤害加成',     value: 30, icon: '⚡', group: '元素' },
  { id: 'poisonDmg',  name: '毒爆伤害加成',     value: 30, icon: '☠', group: '元素' },
  { id: 'atkPct',     name: '攻击',            value: 4,  icon: '⚔', group: '通用' },
  { id: 'bossDmg',    name: '对首领伤害增加',   value: 5,  icon: '☠', group: '通用' },
  { id: 'rangedDmg',  name: '远程武器招式增伤', value: 5,  icon: '➹', group: '通用' },
  { id: 'divineEff',  name: '神射值积攒效率',   value: 10, icon: '✧', group: '通用' },
];
const AFFIX_BY_ID = Object.fromEntries(AFFIXES.map(a => [a.id, a]));

/* ---------- 稀有词条（满数值） ---------- */
const RARES = [
  { id: 'hedao', name: '合道', value: 50, short: '副属性 ×1.5',
    desc: '此魂玉上的副属性额外增加 50%（即该魂玉的普通词条数值 ×1.5）' },
  { id: 'huaqi', name: '化气', value: 25, short: '冷却缩减 25%',
    desc: '触发元素后减少技能冷却 25%' },
  { id: 'meibu', name: '枚卜', value: 20, short: '双暴判定 +20%',
    desc: '触发两次暴击判定的概率 +20%，并取其中更优结果生效' },
];
const RARE_BY_ID = Object.fromEntries(RARES.map(r => [r.id, r]));

/* ---------- 魂玉（依据截图录入） ----------
 * mods：可直接参与计算的数值（严格来自截图文本）
 *   elemDmgAny：该数值会加到「此魂玉所染元素」对应的伤害加成上
 * specials：无明确数值的机制效果，仅作提示，不计入期望伤害 */
const JADES = [
  {
    id: 'chidianshu', name: '掣电术', score: 6700, rarity: '极',
    category: '征神魂玉', icon: 'assets/jade/chidianshu.png',
    brief: '提升攻击力，但造成伤害时会增长自身电击值',
    bullets: ['攻击力提升 20%', '造成伤害会增加自身电击值（负面）'],
    mods: { atkPct: 20 },
    specials: ['造成伤害时累积自身电击值'],
  },
  {
    id: 'yuanbaoxingyun', name: '元暴星陨', score: 6300, rarity: '极',
    category: '征神魂玉', icon: 'assets/jade/yuanbaoxingyun.png',
    brief: '元素伤害触发暴击召唤流星，元素打击可使流星爆炸',
    bullets: [
      '元素暴击后额外召唤【流星打击】',
      '打击后在原地生成一个【流星】',
      '【流星】被元素打击命中后触发【星爆】',
      '每 4 秒最多召唤一次',
    ],
    mods: {},
    specials: ['元素暴击召唤流星（每 4 秒一次）', '【流星】被元素打击命中触发【星爆】'],
    proc: 'meteor',
  },
  {
    id: 'lieyuanjue', name: '烈元诀', score: 7500, rarity: '极',
    category: '征神魂玉', icon: 'assets/jade/lieyuanjue.png',
    brief: '元素暴击率提升，招式伤害降低',
    bullets: ['元素暴击率提升 30%', '招式伤害降低 5%'],
    mods: { elemCritRate: 30, skillDmg: -5 },
    specials: [],
  },
  {
    id: 'youleizhen', name: '游雷振', score: 6198, rarity: '极',
    category: '征神魂玉', icon: 'assets/jade/youleizhen.png',
    brief: '天雷可用振刀反射出去，反射出去的天雷会沿直线往返',
    bullets: ['天雷可用振刀反射出去', '反射出去的天雷会沿直线往返'],
    mods: {},
    specials: ['天雷可被振刀反射，沿直线往返'],
  },
  {
    id: 'yudianbenlei', name: '御电奔雷', score: 6700, rarity: '极',
    category: '征神魂玉', icon: 'assets/jade/yudianbenlei.png',
    brief: '【电击奔涌】时，天雷只会落下一道，但每造成一定武器伤害都会引动天雷',
    bullets: ['【电击奔涌】期间天雷只落下一道', '每造成一定武器伤害都会引动天雷'],
    mods: {},
    specials: ['【电击奔涌】期间天雷单道落下', '每造成一定武器伤害即引动天雷'],
  },
  {
    id: 'yuansubenbenyong', name: '元素奔涌', score: 6700, rarity: '极',
    category: '征神魂玉', icon: 'assets/jade/yuansubenbenyong.png',
    brief: '获得攻击力加成，且自身元素值满时会进入【元素奔涌】状态（效果根据此魂玉元素属性改变）',
    bullets: [
      '获得 12% 攻击力和 55% 元素伤害加成',
      '自身元素值满时进入【元素奔涌】状态',
      '期间自身不会积累元素值，持续 20 秒',
    ],
    mods: { atkPct: 12, elemDmgAny: 55 },   // 55% 跟随该魂玉所染元素
    specials: ['元素值满进入【元素奔涌】20 秒'],
    note: '原截图为电（雷）属性版本，55% 加成会跟随本魂玉所染的元素属性。',
  },
  {
    id: 'bingyuanbao', name: '冰渊爆', score: 6700, rarity: '极',
    category: '征神魂玉', icon: 'assets/jade/bingyuanbao.png',
    brief: '冰爆伤害提高，但触发冰爆时会增加自身霜冻值',
    bullets: ['冰爆伤害提高 60%', '触发冰爆时会增长自身霜冻值（负面）'],
    mods: { iceDmg: 60 },
    specials: ['触发冰爆时累积自身霜冻值'],
  },
  {
    id: 'baobingjue', name: '爆冰诀', score: 6700, rarity: '极',
    category: '征神魂玉', icon: 'assets/jade/baobingjue.png',
    brief: '大幅强化元素冰爆，但自身霜冻值上限降低',
    bullets: [
      '冰爆伤害提高 35%',
      '触发冰爆的冷却时间降低 33%',
      '自身霜冻值上限降低 450 点',
    ],
    mods: { iceDmg: 35, iceCdr: 33, frostCap: -450 },
    specials: [],
  },
  {
    id: 'lianxubingbao', name: '连续冰爆', score: 6700, rarity: '极',
    category: '征神魂玉', icon: 'assets/jade/lianxubingbao.png',
    brief: '冰爆次数增加，但伤害降低',
    bullets: ['怪物霜冻值满触发的冰爆会连续触发 3 次', '但伤害降低 45%'],
    mods: { iceHits: 3, iceDmgMul: -45 },
    specials: [],
  },
  {
    id: 'cuidushu', name: '淬毒术', score: 6216, rarity: '极',
    category: '征神魂玉', icon: 'assets/jade/cuidushu.png',
    brief: '叠加瘴毒引发范围打击的所需层数减少',
    bullets: ['叠加【瘴毒】引发范围打击的所需层数减 2', '元素积累效率提升 60%'],
    mods: { elemAccum: 60, poisonLayerNeed: -2 },
    specials: ['【瘴毒】引爆所需层数 −2'],
  },
  {
    id: 'zhaosheng', name: '沼生', score: 6217, rarity: '极',
    category: '征神魂玉', icon: 'assets/jade/zhaosheng.png',
    brief: '毒爆产生毒沼，在内增加自身毒素值与敌人【瘴毒】层数',
    bullets: [
      '毒爆会产生毒沼',
      '毒沼内自身毒素值积累加快',
      '敌人【瘴毒】层数每 2 秒增加 1 层，持续 4 秒',
    ],
    mods: {},
    specials: ['毒爆生成毒沼', '毒沼内敌人【瘴毒】+1 层 / 2 秒，持续 4 秒'],
  },
  {
    id: 'lianzhupao', name: '连珠炮', score: 5144, rarity: '优',
    category: '征神魂玉', icon: 'assets/jade/lianzhupao.png',
    brief: '【火炮】连发双弹',
    bullets: ['火炮伤害降低 35%', '但一次射击可射出 2 发炮弹'],
    mods: { rangedHits: 2, rangedSelfMul: -35 },
    specials: ['仅对【火炮】生效'],
  },
  {
    id: 'huopaohunyuanpao', name: '火炮·混元炮', score: 5692, rarity: '极',
    category: '招式专精魂玉', icon: 'assets/jade/huopaohunyuanpao.png',
    brief: '【火炮】命中敌人会附加元素积累',
    bullets: ['火炮命中敌人会附加毒素元素积累', '（此效果会根据本魂玉的元素属性而改变）'],
    mods: {},
    specials: ['【火炮】命中附加所染元素的积累'],
  },
  {
    id: 'tongyongduohun', name: '通用·夺魂', score: 5200, rarity: '优',
    category: '招式专精魂玉', icon: 'assets/jade/tongyongduohun.png',
    brief: '【近战通用】振刀追击招式，命中有回复效果',
    bullets: [
      '振刀追击招式，命中有自身伤害值 20% 的回复效果',
      '（该魂玉无法激活熏印元素效果）',
    ],
    mods: { cannotImbue: 1 },
    specials: ['振刀追击命中回复 20% 伤害值', '无法染元素'],
  },
  {
    id: 'zhanmadaochiyanzhan', name: '斩马刀·炽焰斩', score: 4388, rarity: '优',
    category: '招式专精魂玉', icon: 'assets/jade/zhanmadaochiyanzhan.png',
    brief: '【斩马刀】强化的蓄力招式，附带额外元素积累',
    bullets: [
      '斩马刀平击蓄力招式产生变化，且攻击附加电击元素积累',
      '振刀成功时，会在自身前方发出炽焰斩打击',
      '（此效果会根据本魂玉的元素属性而改变）',
    ],
    mods: {},
    specials: ['蓄力招式变化并附加所染元素的积累', '振刀成功前方发出炽焰斩'],
  },
];
const JADE_BY_ID = Object.fromEntries(JADES.map(j => [j.id, j]));

/* ---------- 推荐配装 ----------
 * 每颗魂玉固定 4 个词条槽位，普通词条与稀有词条共用
 * element 为该套装统一的染元素属性；无法染元素的魂玉会自动跳过 */
const PRESETS = [
  {
    id: 'bingyun', name: '百化冰陨流', element: 'ice', weapon: 'melee',
    desc: '连续冰爆三段触发 + 爆冰诀缩短冷却，冰渊爆与元素奔涌堆叠冰爆伤害。',
    jades: [
      'baobingjue', 'lianxubingbao', 'bingyuanbao', 'yuanbaoxingyun',
      'lieyuanjue', 'yuansubenbenyong', 'tongyongduohun',
    ],
    subs: [
      ['iceDmg', 'atkPct', 'critDmg', 'critRate'],
      ['iceDmg', 'critDmg', 'atkPct', 'critRate'],
      ['iceDmg', 'critDmg', 'atkPct', 'bossDmg'],
      ['critDmg', 'atkPct', 'critRate', 'bossDmg'],
      ['critRate', 'critDmg', 'atkPct', 'iceDmg'],
      ['iceDmg', 'critDmg', 'atkPct', 'meibu'],
      ['atkPct', 'critDmg', 'critRate', 'hedao'],
    ],
  },
  {
    id: 'benlei', name: '奔雷陨', element: 'thunder', weapon: 'melee',
    desc: '电击奔涌驱动天雷，御电奔雷 + 游雷振把天雷频率与反射收益拉满。',
    jades: [
      'chidianshu', 'yuanbaoxingyun', 'lieyuanjue', 'youleizhen',
      'yudianbenlei', 'yuansubenbenyong', 'zhanmadaochiyanzhan',
    ],
    subs: [
      ['thunderDmg', 'atkPct', 'critDmg', 'critRate'],
      ['thunderDmg', 'critDmg', 'atkPct', 'bossDmg'],
      ['critRate', 'critDmg', 'atkPct', 'thunderDmg'],
      ['thunderDmg', 'atkPct', 'critRate', 'bossDmg'],
      ['thunderDmg', 'critDmg', 'atkPct', 'divineEff'],
      ['thunderDmg', 'critDmg', 'atkPct', 'meibu'],
      ['atkPct', 'critDmg', 'critRate', 'hedao'],
    ],
  },
  {
    id: 'dupao', name: '毒炮陨', element: 'poison', weapon: 'cannon',
    desc: '淬毒术降低引爆门槛 + 毒沼持续叠层，火炮双弹叠加毒素积累。',
    jades: [
      'yuanbaoxingyun', 'lieyuanjue', 'cuidushu', 'yuansubenbenyong',
      'zhaosheng', 'lianzhupao', 'huopaohunyuanpao',
    ],
    subs: [
      ['poisonDmg', 'critDmg', 'atkPct', 'critRate'],
      ['critRate', 'critDmg', 'atkPct', 'poisonDmg'],
      ['poisonDmg', 'critDmg', 'atkPct', 'bossDmg'],
      ['poisonDmg', 'critDmg', 'atkPct', 'meibu'],
      ['poisonDmg', 'atkPct', 'critRate', 'bossDmg'],
      ['rangedDmg', 'critRate', 'critDmg', 'poisonDmg'],
      ['rangedDmg', 'poisonDmg', 'atkPct', 'hedao'],
    ],
  },
];
