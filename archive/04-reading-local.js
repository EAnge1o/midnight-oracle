/* =========================================================
   04-reading-local.js — 本地解读引擎
   职责：
     1. 由「牌面规则 + 主题规则」确定结果倾向
     2. 用本地内容拼出一封完整、贴合问题的回信
   注意：这是娱乐与自我反思工具，不宣称预知未来，不替代专业意见。
   ========================================================= */
(function (window) {
  'use strict';

  var MO = window.MO || (window.MO = {});
  var core = MO.core;

  /* ---------- 稳定散列：同一副牌得到同一份本地解读 ---------- */
  function hashString(str) {
    var h = 2166136261;
    var s = String(str);
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function pickBy(seedStr, list) {
    if (!list || !list.length) return '';
    return list[hashString(seedStr) % list.length];
  }

  /* ---------- 结果倾向：牌面规则 × 主题规则 ---------- */
  function computeVerdict(card, orientation, topicId) {
    var table = card.verdict[orientation];              // { go, wait, reconsider }
    var bias = MO.cards.topicBias[topicId] || { go: 1, wait: 1, reconsider: 1 };

    var scores = {
      go: (table.go || 0) * 2 + (bias.go || 0),
      wait: (table.wait || 0) * 2 + (bias.wait || 0),
      reconsider: (table.reconsider || 0) * 2 + (bias.reconsider || 0)
    };

    /* 平局时按 wait → reconsider → go 的保守顺序裁决 */
    var order = ['wait', 'reconsider', 'go'];
    var best = order[0];
    for (var i = 1; i < order.length; i++) {
      if (scores[order[i]] > scores[best]) best = order[i];
    }

    var meta = MO.cards.verdicts[best];
    return {
      key: meta.key,
      label: meta.label,
      note: meta.note,
      scores: scores
    };
  }

  /* ---------- 高风险话题识别 ---------- */
  var RISK_RULES = [
    { id: 'medical', label: '医疗健康', words: ['病', '症', '诊断', '手术', '医院', '吃药', '治疗', '癌', '抑郁', '怀孕', '复发', '剂量'] },
    { id: 'legal',   label: '法律纠纷', words: ['官司', '诉讼', '法院', '合同', '违法', '仲裁', '判刑', '赔偿', '违约'] },
    { id: 'money',   label: '投资理财', words: ['投资', '股票', '基金', '加密', '数字货币', '理财', '买房', '杠杆', '借贷', '借钱', '加仓'] }
  ];

  function detectRisk(text) {
    var s = String(text || '');
    if (!s) return [];
    var hit = [];
    for (var i = 0; i < RISK_RULES.length; i++) {
      var words = RISK_RULES[i].words;
      for (var j = 0; j < words.length; j++) {
        if (s.indexOf(words[j]) !== -1) { hit.push(RISK_RULES[i].label); break; }
      }
    }
    return hit;
  }

  /* ---------- 主题 × 倾向 的具体行动 ---------- */
  var ACTIONS = {
    love: {
      go: ['今晚把你想知道的那句话，用最平静的语气发出去，然后停止刷新。',
           '约一个不被打扰的时间，只问一个你最想确认的问题。',
           '先说一次你欣赏对方的地方，再说你想要的那个改变。'],
      wait: ['把这件事放满一周，期间只记录自己的感受，不做判断。',
             '这周不去追问对方的态度，把注意力放回自己的生活安排上。',
             '把你最怕听到的那个答案先写下来，再决定要不要去问。'],
      reconsider: ['把这段关系里你一直在迁就的那件事具体写出来，看看它占了你多少。',
                   '问自己：如果对方不改，我要的是调整还是离开。',
                   '回想你第一次感到勉强的那天，那时候你知道了什么。']
    },
    study: {
      go: ['今晚只做一件事：把最大的那个知识点拆成三步，写在纸上。',
           '挑一个你最怕的题型，现在做一道，不查答案。',
           '把复习时长砍掉一半，但保证这半小时一定开始。'],
      wait: ['这周先不追进度，把最近三次的实际表现写下来对照目标。',
             '换一种学法试三天：从看视频改成只做题，再只回看错题。',
             '把目标改成「这周弄懂三个概念」，而不是「刷完两套」。'],
      reconsider: ['列出你还在用、但已经过时的三种学习方式。',
                   '问自己：你是不喜欢这门课，还是只在为别人学它。',
                   '把一门最没进展的科目暂停两周，看看失去的是什么。']
    },
    career: {
      go: ['今晚把那个机会你最担心的一个问题写出来，明天去问清楚。',
           '为你真正想去的那条路，找出下一个可以立刻验证的小步骤。',
           '把你的长处写成三句话具体的描述，而不是几个形容词。'],
      wait: ['这周只做信息收集，不做决定，先补齐你缺的那一块。',
             '把两个选项按你最在意的三项标准打分，看差距到底有多大。',
             '找一个做过同样选择的人聊一次，再决定要不要往前走。'],
      reconsider: ['写下这份工作里你不能接受的那一条，并看它是否可协商。',
                   '算一下你为它付出的代价，把数字具体化。',
                   '回忆最近三次你想辞职的瞬间，它们有没有共同点。']
    },
    relation: {
      go: ['今晚主动约那个人喝一次东西，只聊近况，不谈那件事。',
           '把你欣赏对方的一个具体瞬间说出来，让对方知道。',
           '做一次简单的示好，然后停下来，看对方的回应。'],
      wait: ['把你想说的话写完整再决定要不要发，先过一天。',
             '这周先只回应，不主动开启话题。',
             '观察一周，把你凭感觉的判断和实际发生的事分别记下来。'],
      reconsider: ['把这段关系里你一直忍着的那件事写下来，数一数有几件。',
                   '问自己：你珍惜的是这个人，还是你们之间的沉默。',
                   '回想你是从哪一次开始觉得累的。']
    },
    growth: {
      go: ['今晚挑一件你一直拖着的小事，在二十分钟内做完。',
           '把你最近的一个想法写成一句话，给它找个真实的出口。',
           '做一件没把握但成本很低的事，去换一点真实反馈。'],
      wait: ['今天只记录，不改变。把念头写下来，明天再判断。',
             '给自己放三天假，不做任何决定，也不评价进展。',
             '把你最想改的那点，换成一个可以观察一周的习惯。'],
      reconsider: ['写出你最近一次对自己说过、但并不符合事实的话。',
                   '想想你现在坚持的标准，有多少其实来自别人。',
                   '把「我应该」这三个字从今天的待办里划掉。']
    },
    free: {
      go: ['今晚把最想试的那个小动作排进日程，给它一个具体的时间。',
           '把困扰你的问题写成一封短信的篇幅，寄给自己。',
           '找一个信得过的朋友，只说这一件事。'],
      wait: ['把这件事再放三天，期间只记录，不下结论。',
             '今晚早睡，让判断在更清楚的时候发生。',
             '把你担心的最坏结果写完整，看看它是否真会那样发生。'],
      reconsider: ['把这件事从头写一遍，只写事实，不写评价。',
                   '问自己：如果不是必须做，你还会想做吗。',
                   '找出你在这件事上花了最多力气、却最少回报的部分。']
    }
  };

  var CLOSINGS = {
    upright: [
      '牌面把灯举高了一点，剩下的路你自己走。',
      '今晚不需要更多答案，只需要一个开始。',
      '你比你以为的更接近那个决定。'
    ],
    reversed: [
      '慢一点不是落后，是把方向调回自己这边。',
      '现在的不确定，也在替你筛掉不必要的选项。',
      '先把这件事放回它该有的距离。'
    ]
  };

  var BLIND_SPOTS = {
    go: ['你可能会把「想试试」提前当成「该去了」，中间那一步还没验证。',
        '往前走的兴奋，容易盖住你还没问出口的那个问题。',
        '你在意结果的时候，往往会跳过最重要的那个准备。'],
    wait: ['你以为自己在等，其实是在躲一个可能会否定的答案。',
           '等待的好处是安全，代价是你把时间也一起交出去了。',
           '慢下来有时候是判断力，也有时候只是怕。'],
    reconsider: ['你已经看见了，只是不愿意把看见的这件事说出来。',
                '你反复权衡的那些条件，其实不是条件，是你的不舍。',
                '你担心的风险是真实的，但真实的部分可能比你以为的小。']
  };

  var HEADLINES = {
    go: ['牌面支持你先走一步，剩下的路上再修正。',
        '这一刻更适合行动，而不是继续推演。',
        '你需要的不是更多把握，是先开始。',
        '可以往前，但要边走边调。'],
    wait: ['现在最有价值的动作，是再等一等。',
           '这不是停滞，是给信息留出时间。',
           '先别下结论，这张牌还没讲完。',
           '把决定往后放一放，你会发现答案更清楚。'],
    reconsider: ['值得回头看的不是运气，是你的边界。',
                '这张牌提醒你：先分清代价，再谈选择。',
                '有一个被忽略的条件，正在决定结果。',
                '你已经在答案里了，只是还没承认。']
  };

  /* ---------- 组装：本地完整回信 ---------- */
  function buildLocal(input) {
    var card = input.card;
    var orientation = input.orientation;              // 'upright' | 'reversed'
    var topicId = input.topicId || 'free';
    var question = core.trim(input.question || '');
    var verdict = input.verdict;
    var seed = card.id + '|' + orientation + '|' + topicId;
    var topic = MO.cards.topicById(topicId) || { label: '自由提问' };

    var meaning = orientation === 'upright' ? card.upright : card.reversed;
    var topicLine = card.topics[topicId] || '';
    var keywords = meaning.keywords;
    var kw0 = keywords[0];

    /* 1. 核心回答 */
    var headline = pickBy(seed + '|head', HEADLINES[verdict.key]);

    /* 2. 牌面象征 */
    var keywordText = keywords.slice(0, 3).join('、');
    var cardMeaning = card.nameCN + '「' + card.symbol + '」。' +
      meaning.summary + ' 此刻这个词是「' + kw0 + '」，整张牌的张力集中在' + keywordText + '之间。' +
      (topicLine ? '放在' + topic.label + '里，它指向的是：' + topicLine : '');

    /* 3. 针对用户问题的具体解读 */
    var personal;
    if (question) {
      var brief = question.length > 26 ? question.slice(0, 26) + '…' : question;
      personal = '你问的是「' + brief + '」。' +
        (orientation === 'upright'
          ? '牌面没有回避它，而是把' + kw0 + '放在了这件事的正中央：它既是助力，也是你必须承认的前提。'
          : '牌面把同一件事翻了过来，' + kw0 + '成了需要处理的信号，而不是可以忽略的细节。') +
        (topicLine ? '放到' + topic.label + '里，' + topicLine : '就这件事而言，') +
        (orientation === 'upright'
          ? '最值得注意的不是结果，而是你愿不愿意用它来交换点什么。'
          : '最值得注意的不是失败的风险，而是你一直在用忙碌绕开那个判断。');
    } else {
      personal = '你没有写下具体的问题，只选了一个主题。' +
        (topicLine ? '那就先从主题说起——' + topicLine : '牌面在这种模糊的状态里依然给出了一定方向。') +
        (orientation === 'upright'
          ? '「' + kw0 + '」是这段时间正在浮现的关键词，把它写进一件具体的小事里，它会开始显形。'
          : '「' + kw0 + '」是需要先处理的部分，绕开它，任何决定都会在同一个地方卡住。');
    }

    /* 4. 盲点 */
    var blindSpot = (card.misread || pickBy(seed + '|blind', BLIND_SPOTS[verdict.key])) +
      ' 具体到你的问题：注意你在' + (topicLine ? '谈这个主题时' : '谈这件事时') +
      '反复出现的那个假设——它多半不是事实，只是你最熟悉的那个版本。';

    /* 5. 可执行的小行动 */
    var actionPool = (ACTIONS[topicId] || ACTIONS.free)[verdict.key];
    var nextStep = pickBy(seed + '|action', actionPool) || card.advice;

    /* 6. 牌面依据与问题的连接 */
    var supportingReason = (card.tradition || '这张牌的关键象征是「' + card.symbol + '」。') +
      ' 放进' + topic.label + '里，' +
      (topicLine || '它更关心你如何理解这件事，而不是替你宣布结果。') +
      ' 这条线索支持当前倾向，但不替代现实信息。';

    /* 7. 结束语 */
    var closingLine = pickBy(seed + '|close', CLOSINGS[orientation]);

    /* 8. 高风险话题的边界声明 */
    var risks = detectRisk(question);
    var boundaryNote = risks.length
      ? '你问到的是' + risks.join(' / ') + '相关的事情。塔罗只能提供思考角度，不能替代医生、律师或持牌顾问的意见——涉及健康、法律与金钱的决定，请以专业意见为准。' +
        (card.boundary ? ' 这张牌也提醒：' + card.boundary : '')
      : '';

    return {
      verdict: verdict,
      headline: headline,
      cardMeaning: cardMeaning,
      personalReading: personal,
      supportingReason: supportingReason,
      blindSpot: blindSpot,
      nextStep: nextStep,
      closingLine: closingLine,
      boundaryNote: boundaryNote
    };
  }

  MO.reading = {
    hashString: hashString,
    computeVerdict: computeVerdict,
    detectRisk: detectRisk,
    buildLocal: buildLocal
  };

})(window);
