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
  { id: 'hedao', name: '合道', value: 50, short: '副属性 +50%',
    desc: '此魂玉上的副属性额外增加 50%；多条合道可叠加（2 条 → 副属性 ×2）' },
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
    mods: { atkPct: 20, yudian: 1 },
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
    mods: { yudian: 1 },
    specials: ['元素暴击召唤流星（每 4 秒一次）', '【流星】被元素打击命中触发【星爆】'],
    proc: 'meteor',
  },
  {
    id: 'lieyuanjue', name: '烈元诀', score: 7500, rarity: '极',
    category: '征神魂玉', icon: 'assets/jade/lieyuanjue.png',
    brief: '元素暴击率提升，招式伤害降低',
    bullets: ['元素暴击率提升 30%', '招式伤害降低 5%'],
    mods: { elemCritRate: 30, skillDmg: -5, yudian: 1 },
    specials: [],
  },
  {
    id: 'youleizhen', name: '游雷振', score: 6198, rarity: '极',
    category: '征神魂玉', icon: 'assets/jade/youleizhen.png',
    brief: '天雷可用振刀反射出去，反射出去的天雷会沿直线往返',
    bullets: [
      '天雷可被振刀，但伤害降低 50%',
      '振刀反射出去的天雷会沿直线造成往返打击',
      '元素积累效率提升 60%',
    ],
    mods: { elemAccum: 60, yudian: 1 },
    specials: ['天雷可被振刀反射（反射后伤害 −50%）', '反射出去的天雷沿直线往返'],
  },
  {
    id: 'yudianbenlei', name: '御电奔雷', score: 6700, rarity: '极',
    category: '征神魂玉', icon: 'assets/jade/yudianbenlei.png',
    brief: '【电击奔涌】时，天雷只会落下一道，但每造成一定武器伤害都会引动天雷',
    bullets: ['【电击奔涌】时天雷只会落下一道', '每造成 10 倍攻击力的武器伤害都会引动天雷'],
    mods: { yudian: 1 },
    specials: ['【电击奔涌】期间天雷单道落下', '每造成 10 倍攻击力伤害即引动天雷'],
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
    mods: { atkPct: 12, elemDmgAny: 55, yudian: 1 },   // 55% 跟随该魂玉所染元素
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
    mods: {},
    forWeapon: 'cannon',
    weaponMods: { cannon: { rangedHits: 2, rangedSelfMul: -35 } },
    specials: ['仅对【火炮】生效'],
  },
  {
    id: 'huopaohunyuanpao', name: '火炮·混元炮', score: 5692, rarity: '极',
    category: '招式专精魂玉', icon: 'assets/jade/huopaohunyuanpao.png',
    brief: '【火炮】命中敌人会附加元素积累',
    bullets: ['火炮命中敌人会附加毒素元素积累', '（此效果会根据本魂玉的元素属性而改变）'],
    mods: {},
    forWeapon: 'cannon',
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
    forWeapon: 'zhanmadao',
    specials: ['蓄力招式变化并附加所染元素的积累', '振刀成功前方发出炽焰斩'],
  },

  /* ---------- 后续补充的魂玉 ---------- */
  {
    id: 'binghuanpo', name: '冰环破', score: 4800, rarity: '极',
    category: '征神魂玉', icon: 'assets/jade/binghuanpo.png',
    brief: '怪物霜冻值满时，会额外触发一次冰环打击',
    bullets: ['怪物霜冻值满时，会额外触发一次【冰环打击】', '元素积累效率提升 30%'],
    mods: { elemAccum: 30 },
    specials: ['霜冻值满时额外触发一次【冰环打击】'],
  },
  {
    id: 'fenran', name: '焚燃', score: 4258, rarity: '极',
    category: '征神魂玉', icon: 'assets/jade/fenran.png',
    brief: '触发水火相激时，获得攻击力加成，但会使自身灼烧',
    bullets: ['触发【水火相激】时会使自身灼烧', '同时攻击力提升 25%，持续 10 秒'],
    mods: {},
    cond: [{ label: '触发【水火相激】', mods: { atkPct: 25 } }],
    specials: ['触发【水火相激】时自身灼烧（负面）'],
  },
  {
    id: 'zhentianlei', name: '振天雷', score: 4090, rarity: '极',
    category: '征神魂玉', icon: 'assets/jade/zhentianlei.png',
    brief: '自身电击值满时引动的天雷不再造成僵直，可用振刀反射出去',
    bullets: [
      '己方电击值满时召唤的天雷可被振刀且不再造成硬直',
      '但是自身电击值累积上限减少',
    ],
    mods: {},
    specials: ['电击值满时的天雷可被振刀、不再造成硬直', '自身电击值累积上限减少（负面）'],
  },
  {
    id: 'youlongbu', name: '游龙步', score: 6700, rarity: '极',
    category: '征神魂玉', icon: 'assets/jade/youlongbu.png',
    brief: '【神技】闪避后掀起浪涛，命中敌人造成水浸',
    bullets: [
      '闪避后 0.5 秒，在之前位置掀起浪涛，命中敌人会造成水浸',
      '该效果在攻击或受击后 15 秒内才会触发',
      '（无法同时装配魂玉：【惊蛰术】和【落冰术】）',
    ],
    mods: {},
    specials: ['闪避后 0.5 秒掀起浪涛，命中造成水浸', '攻击或受击后 15 秒内才会触发', '与【惊蛰术】【落冰术】互斥'],
  },
  {
    id: 'xuantingshu', name: '玄霆术', score: 6600, rarity: '极',
    category: '征神魂玉', icon: 'assets/jade/xuantingshu.png',
    brief: '【神技】使用技能或奥义时会召唤惊蛰打击攻击敌人',
    bullets: ['使用技能或奥义时将对最近的一名敌人引发一道高伤害惊蛰打击'],
    mods: {},
    specials: ['使用技能 / 奥义时对最近敌人引发高伤害惊蛰打击'],
  },
  {
    id: 'hunranyixian', name: '魂燃一线', score: 6200, rarity: '极',
    category: '征神魂玉', icon: 'assets/jade/hunranyixian.png',
    brief: '【神技】体力较低时造成伤害提升',
    bullets: ['体力低于 50% 时，造成 20% 伤害提升'],
    mods: {},
    cond: [{ label: '体力低于 50%', mods: { dmgPct: 20 } }],
    specials: [],
  },
  {
    id: 'sheyuanjing', name: '舍元劲', score: 6017, rarity: '极',
    category: '征神魂玉', icon: 'assets/jade/sheyuanjing.png',
    brief: '元素伤害降低，但近战招式伤害提高',
    bullets: ['降低 50% 元素伤害', '提升 100% 招式伤害'],
    mods: { elemDmgPct: -50, skillDmg: 100 },
    specials: [],
  },
  {
    id: 'lingyinshuangsheng', name: '灵印双生', score: 5985, rarity: '极',
    category: '征神魂玉', icon: 'assets/jade/lingyinshuangsheng.png',
    brief: '每两次消耗三才印后，下次获得的三才印数量变为两个',
    bullets: ['每两次消耗三才印后，下次获得的三才印数量变为两个'],
    mods: {},
    specials: ['每消耗两次三才印后，下次获得的三才印数量变为两个'],
  },
  {
    id: 'silingguiji', name: '四灵归极', score: 5978, rarity: '极',
    category: '征神魂玉', icon: 'assets/jade/silingguiji.png',
    brief: '当三才印集齐天天天、地地地、人人人、天地人组合时，可以使用任意近战招式消耗三才印并获得对应效果',
    bullets: [
      '当三才印集齐天天天、地地地、人人人、天地人组合时，使用任意近战招式可消耗全部三才印并获得对应效果',
      '天天天：范围罡气削弱【白虎煞】',
      '地地地：单体打击【青龙破】',
      '人人人：范围打击【朱雀焚】',
      '天地人：提升【青龙破】【朱雀焚】打击伤害与自身攻击力，持续增益【玄武佑】',
    ],
    mods: {},
    specials: [
      '集齐三才印组合时，使用近战招式消耗全部三才印并获得对应效果',
      '天天天 → 范围罡气削弱【白虎煞】',
      '地地地 → 单体打击【青龙破】',
      '人人人 → 范围打击【朱雀焚】',
      '天地人 → 增益【青龙破】【朱雀焚】与自身攻击力【玄武佑】',
    ],
  },
  {
    id: 'sancaihuiju', name: '三才汇聚', score: 5948, rarity: '极',
    category: '征神魂玉', icon: 'assets/jade/sancaihuiju.png',
    brief: '振刀反击、四象反击、破罡武技命中敌人时，分别获得一个天印、地印、人印，每个三才印会增加一定属性',
    bullets: [
      '使用振刀追击、四象反击或破罡武技命中敌人时，会对应获得天印、地印或人印',
      '并提供罡气伤害、对首领伤害或攻击力提升效果',
      '同类三才印的属性提升效果不会叠加，每 2 秒只能获取同类三才印一次',
    ],
    mods: {},
    specials: [
      '振刀追击 / 四象反击 / 破罡武技命中 → 获得天印 / 地印 / 人印',
      '三才印分别提升罡气伤害、对首领伤害、攻击力',
      '同类三才印不叠加，每 2 秒最多获取同类一次',
    ],
  },
  {
    id: 'shiguchun', name: '蚀骨春', score: 5973, rarity: '极',
    category: '征神魂玉', icon: 'assets/jade/shiguchun.png',
    brief: '对敌人施加【瘴毒】时，自身获得攻击力加成',
    bullets: ['对敌人施加【瘴毒】时，自身获得 25% 攻击加成，持续 18 秒'],
    mods: {},
    cond: [{ label: '对敌人施加【瘴毒】', mods: { atkPct: 25 } }],
    specials: [],
  },
  {
    id: 'liaoyujing', name: '疗愈劲', score: 5903, rarity: '极',
    category: '征神魂玉', icon: 'assets/jade/liaoyujing.png',
    brief: '获得回复效果时，暂时提升攻击力',
    bullets: ['获得回复效果时，攻击力提升 20%，持续 4 秒'],
    mods: {},
    cond: [{ label: '获得回复效果', mods: { atkPct: 20 } }],
    specials: [],
  },
  {
    id: 'shouquehuajing', name: '守缺化劲', score: 5460, rarity: '优',
    category: '征神魂玉', icon: 'assets/jade/shouquehuajing.png',
    brief: '每有一个未使用的潜能点，提高一定的近战招式伤害',
    bullets: ['每有 1 个未使用的潜能点，近战招式伤害提升 3.6%'],
    mods: {},
    perPoint: { skillDmg: 3.6 },
    specials: ['每 1 个未使用潜能点 → 近战招式伤害 +3.6%（数量在「计算参数」里填）'],
  },
  {
    id: 'fanshi', name: '反噬', score: 5300, rarity: '优',
    category: '征神魂玉', icon: 'assets/jade/fanshi.png',
    brief: '攻击力提升，但攻击时自身会受到反伤',
    bullets: [
      '攻击力提升 20%',
      '但造成伤害时会受到反噬伤害，体力值低于最大值 25% 时不再受到反噬伤害',
    ],
    mods: { atkPct: 20 },
    specials: ['造成伤害时受到反噬伤害（负面）', '体力低于 25% 时不再受反噬'],
  },
  {
    id: 'sansheqianghua', name: '散射强化', score: 4727, rarity: '优',
    category: '征神魂玉', icon: 'assets/jade/sansheqianghua.png',
    brief: '【弓箭】高级散射效果',
    bullets: ['弓箭伤害降低 70%', '但一次发射 5 支箭矢', '蓄力后箭矢的扩散角度更小'],
    mods: {},
    forWeapon: 'bow',
    weaponMods: { bow: { rangedHits: 5, rangedSelfMul: -70 } },
    specials: ['仅对【弓箭】生效'],
  },
  {
    id: 'shuangdonghuanzhan', name: '霜冻唤斩', score: 6700, rarity: '极',
    category: '征神魂玉', icon: 'assets/jade/shuangdonghuanzhan.png',
    brief: '每造成一定次数冰爆伤害，下次近战非蓄力攻击召唤【断厄斩】',
    bullets: ['每造成 15 次冰爆伤害，下次近战非蓄力攻击召唤【断厄斩】'],
    mods: {},
    specials: ['每 15 次冰爆伤害 → 下次近战非蓄力攻击召唤【断厄斩】'],
  },
  {
    id: 'linshuangci', name: '凛霜刺', score: 6700, rarity: '极',
    category: '征神魂玉', icon: 'assets/jade/linshuangci.png',
    brief: '【霜冻奔涌】期间使用技能会召唤冰刺打击，冰刺被视为冰爆打击',
    bullets: ['【霜冻奔涌】期间使用技能会召唤冰刺打击', '冰刺被视为冰爆，每 4 秒最多触发一次'],
    mods: {},
    specials: ['【霜冻奔涌】期间技能召唤冰刺，视为冰爆，每 4 秒最多一次'],
  },
  {
    id: 'suifengxiao', name: '碎锋啸', score: 4352, rarity: '优',
    category: '征神魂玉', icon: 'assets/jade/suifengxiao.png',
    brief: '武器消耗耐久时，获得攻击力加成',
    bullets: ['武器消耗耐久时，获得 18% 攻击力加成，持续 10 秒'],
    mods: {},
    cond: [{ label: '武器消耗耐久', mods: { atkPct: 18 } }],
    specials: [],
  },
  {
    id: 'gongjianchuanxinshi', name: '弓箭·穿心矢', score: 5575, rarity: '极',
    category: '招式专精魂玉', icon: 'assets/jade/gongjianchuanxinshi.png',
    brief: '【弓箭】二段蓄力的爆炸附加元素积累',
    bullets: ['二段蓄力的爆炸附加毒素元素积累', '（此效果会根据本魂玉的元素属性而改变）'],
    mods: {},
    forWeapon: 'bow',
    specials: ['【弓箭】二段蓄力爆炸附加所染元素的积累'],
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
  {
    id: 'sancai', name: '三才套', element: 'poison', weapon: 'melee',
    desc: '三才印体系：三才汇聚攒印、灵印双生翻倍、四灵归极放大，配蚀骨春与毒沼持续叠层。',
    jades: [
      'lingyinshuangsheng', 'silingguiji', 'sancaihuiju', 'yuansubenbenyong',
      'shiguchun', 'zhaosheng', 'tongyongduohun',
    ],
    subs: [
      ['poisonDmg', 'atkPct', 'critDmg', 'critRate'],
      ['poisonDmg', 'critDmg', 'atkPct', 'bossDmg'],
      ['poisonDmg', 'critRate', 'critDmg', 'atkPct'],
      ['poisonDmg', 'critDmg', 'atkPct', 'meibu'],
      ['poisonDmg', 'critRate', 'critDmg', 'bossDmg'],
      ['poisonDmg', 'atkPct', 'critRate', 'bossDmg'],
      ['atkPct', 'critDmg', 'critRate', 'hedao'],
    ],
  },
  {
    id: 'hunfangong', name: '魂反弓', element: 'poison', weapon: 'bow',
    desc: '弓箭散射 5 支 + 反噬 / 魂燃一线搏命增伤，疗愈劲与碎锋啸补回攻击力。',
    jades: [
      'liaoyujing', 'yuansubenbenyong', 'hunranyixian', 'sansheqianghua',
      'fanshi', 'suifengxiao', 'gongjianchuanxinshi',
    ],
    subs: [
      ['poisonDmg', 'critDmg', 'atkPct', 'critRate'],
      ['poisonDmg', 'critDmg', 'atkPct', 'meibu'],
      ['poisonDmg', 'critRate', 'critDmg', 'bossDmg'],
      ['rangedDmg', 'critRate', 'critDmg', 'poisonDmg'],
      ['atkPct', 'poisonDmg', 'critDmg', 'critRate'],
      ['rangedDmg', 'poisonDmg', 'atkPct', 'bossDmg'],
      ['rangedDmg', 'poisonDmg', 'critDmg', 'hedao'],
    ],
  },
  {
    id: 'binghuazhan', name: '百化冰斩', element: 'ice', weapon: 'melee',
    desc: '冰爆三件套 + 凛霜刺补冰刺、霜冻唤斩收尾，元素奔涌拉满冰爆伤害。',
    jades: [
      'baobingjue', 'lianxubingbao', 'bingyuanbao', 'shuangdonghuanzhan',
      'linshuangci', 'yuansubenbenyong', 'tongyongduohun',
    ],
    subs: [
      ['iceDmg', 'atkPct', 'critDmg', 'critRate'],
      ['iceDmg', 'critDmg', 'atkPct', 'critRate'],
      ['iceDmg', 'critDmg', 'atkPct', 'bossDmg'],
      ['iceDmg', 'critRate', 'critDmg', 'atkPct'],
      ['iceDmg', 'critDmg', 'atkPct', 'bossDmg'],
      ['iceDmg', 'critDmg', 'atkPct', 'meibu'],
      ['atkPct', 'critDmg', 'critRate', 'hedao'],
    ],
  },
];
