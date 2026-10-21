/* =========================================================
   08-oracle-book.js — 答案之书内容层
   规则：书页只给提示语，不给结论。
     1. 每张牌 × 正逆位 = 一句提示语（base）+ 三种情绪变体
     2. 三个自问来自牌面象征，指向内在动作，不指向结果
     3. 全部内容离线内置，不联网、不调用平台 AI
   ========================================================= */
(function (window) {
  'use strict';

  var MO = window.MO || (window.MO = {});

  /* ---------- 提示语句库（264 句）见 08b-oracle-lines.js ---------- */
  var STATES = MO.oracleLines ? MO.oracleLines.STATES : [];
  var LINES = MO.oracleLines ? MO.oracleLines.LINES : {};


  /* ---------- 通用句：夹页用，不属于任何一张牌 ---------- */
  var GENERAL = [
    '有些答案要等很久，才敢认出来。',
    '你现在想不清楚的，不一定想不清楚。',
    '先做完手边那一件。',
    '你的着急，可能比事情本身更重。',
    '别把沉默当成回答。',
    '你还有得选。',
    '今晚不必决定。',
    '你已经在正确的方向上，只是看不见。',
    '停一下，也是一种前进。',
    '有些事你不需要说服别人。',
    '把秘密留给自己一会儿。',
    '这次慢一点，会快一点。',
    '别把「等一等」用成放弃。',
    '有些事不用你一个人盯着。',
    '话说完之前，先别下判断。',
    '不是所有的门都需要你推开。',
    '你比自己以为的更应付得来。',
    '让事情自己长出形状。',
    '有些答复会迟到，但不会缺席。',
    '别在受惊的时候做决定。',
    '该休息的今晚就休息。',
    '有一件事还没说出口，它会自己出来。',
    '你担心的那件事，多半还没有发生。',
    '重新开始不需要理由。',
    '会留下的人，不需要你追着问。',
    '答案不在你找它的那个方向。',
    '把「应该」换成「想要」。',
    '今晚的沉默会替你回答一些事。',
    '不解释，也是一种回答。',
    '你已经比昨天更清楚自己要什么。',
    '有些门后面是好消息。',
    '不急。',
    '你走的这段路，没有白走。',
    '说不出口的事，就先不说。',
    '值得等的人，从来不催你。',
    '把注意力放回自己身上。',
    '这件事的重量，比你以为的小。',
    '别替以后的人做完全部决定。',
    '你比自己以为的更接近答案。',
    '那个安静的声音，值得听。',
    '会好的，但不是今晚。',
    '有些东西需要时间显形。',
    '你不需要被所有人理解。',
    '留一点不确定给自己。',
    '现在这样，已经很好。',
    '有些答案不来自书，来自你。',
    '翻到这里的人，通常已经知道答案。',
    '夜色不回答问题，它只是把问题放轻。'
  ];

  /* ---------- 选择逻辑：稳定散列，保证同一次占卜拿到同一页 ---------- */
  function hashString(str) {
    var h = 2166136261;
    var s = String(str == null ? '' : str);
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function pickIndex(seed, length) {
    if (!length) return 0;
    return hashString(seed) % length;
  }

  function cardEntry(cardId, orientation) {
    var group = LINES[cardId];
    if (!group) return null;
    return group[orientation] || group.upright || null;
  }

  /* 这一张牌这一面的六句：每句对应一种此刻的状态 */
  function stateLines(entry) {
    if (!entry) return [];
    var list = [];
    for (var i = 0; i < STATES.length; i++) {
      var id = STATES[i].id;
      if (entry[id]) list.push(entry[id]);
    }
    return list;
  }

  /* 夹页候选：这张牌其余的说法 + 牌面自带的通用一句 + 全部通用句 */
  function extraPool(cardId, orientation) {
    var pool = [];
    var entry = cardEntry(cardId, orientation);
    var list = stateLines(entry);
    for (var i = 0; i < list.length; i++) pool.push(list[i]);
    /* 牌面自带的、与主题无关的那一句，留作夹页的另一种说法 */
    var card = MO.cards && typeof MO.cards.byId === 'function' ? MO.cards.byId(cardId) : null;
    if (card && card.topics && card.topics.free) pool.push(card.topics.free);
    for (var g = 0; g < GENERAL.length; g++) pool.push(GENERAL[g]);
    return pool;
  }

  MO.oracle = {
    STATES: STATES,
    GENERAL: GENERAL,
    LINES: LINES,
    PAGE_TOTAL: 44,

    /* 牌对应的固定页码：22 张牌 × 正逆位 = 44 页 */
    pageOf: function (card, orientation) {
      var num = card && card.num != null ? Number(card.num) : 0;
      var base = num * 2 + 1;
      return orientation === 'reversed' ? base + 1 : base;
    },

    /* 第 0 页是这张牌自己的页；再往后翻到夹页 */
    lineFor: function (card, orientation, pageIndex, salt) {
      var index = pageIndex || 0;
      var entry = cardEntry(card && card.id, orientation);
      var list = stateLines(entry);
      if (index === 0 && list.length) {
        /* 第一页：在六种此刻状态里稳定随机落一句 */
        return list[pickIndex(String(salt || '') + '|first', list.length)];
      }
      var pool = extraPool(card && card.id, orientation);
      if (!pool.length) return GENERAL[0];
      return pool[pickIndex(String(salt || '') + '|' + index, pool.length)];
    },

  };
})(window);
