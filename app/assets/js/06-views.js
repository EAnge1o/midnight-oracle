/* =========================================================
   06-views.js — 视图 / 状态机 / 洗牌抽牌 / 本地解读编排
   状态：home → question → shuffling → card_reveal → result
   事件全部用 addEventListener 绑定；用户文本一律 textContent 渲染。
   ========================================================= */
(function (window, document) {
  'use strict';

  var MO = window.MO;
  var core = MO.core;
  var qs = core.qs;
  var on = core.on;
  var setText = core.setText;
  var show = core.show;
  var machine = core.machine;
  var STATES = core.STATES;

  var DECK_SIZE = 9;
  var SHUFFLE_MS = 2950;
  var DECK_CARD_WIDTH = 110;
  var DECK_CARD_HEIGHT = 185;
  var DECK_FAN_MAX_ANGLE = 22;

  /* ---------- 元素引用 ---------- */
  var el = {};
  function cacheElements() {
    var ids = [
      'ambient-stars', 'brand-sigil', 'home-hero', 'btn-start',
      'screen-home', 'screen-ritual', 'screen-draw', 'screen-result',
      'screen-result-title', 'screen-result-step',
      'btn-ritual', 'btn-ritual-back',
      'btn-back-draw', 'draw-stage', 'deck-stage', 'deck', 'btn-shuffle', 'btn-sound', 'draw-hint',
      'btn-back-result', 'result-body',
      'book', 'book-page', 'book-page-no', 'book-card', 'book-card-art',
      'book-card-name', 'book-card-orient', 'book-line',
      'card-meaning', 'card-meaning-text', 'card-meaning-symbol', 'card-meaning-tags',
      'result-actions', 'result-disclaimer',
      'btn-save', 'btn-reflip', 'btn-again'
    ];
    for (var i = 0; i < ids.length; i++) el[ids[i]] = document.getElementById(ids[i]);
  }

  /* ---------- 本次占卜会话 ---------- */
  var session = {
    draw: null,          // { cardId, orientation, deckIndex } —— 一次占卜内不变
    pageIndex: 0,        // 0 = 这张牌自己的页；之后是夹页
    line: '',            // 当前这一页的提示语
    usedLines: [],       // 本次占卜已出现过的句子，翻页时避免重复
    meaning: null,       // 牌面释义（分享卡用）
    pickedImg: null,     // 抽中时已加载的牌面元素（书页复用）
    prepared: null       // 洗牌时预先定下并预热的牌
  };

  var renderToken = 0;
  var screenTimer = 0;
  var deckLocked = true;     // 未洗牌 / 已揭晓时不可选牌
  var shuffling = false;     // 洗牌动画进行中，忽略选牌与重复洗牌
  var shuffleTimer = 0;
  var shuffleRaf = 0;
  var shuffleWatchdog = 0;

  function resetSession() {
    renderToken++;
    resetDraw();
  }

  /* 只重置本次抽牌相关状态 */
  function resetDraw() {
    session.draw = null;
    session.pageIndex = 0;
    session.line = '';
    session.usedLines = [];
    session.meaning = null;
    session.pickedImg = null;
    session.prepared = null;
    deckLocked = true;
  }

  /* ---------- 视图切换 ---------- */
  var SCREEN_BY_STATE = {};
  SCREEN_BY_STATE[STATES.HOME] = 'screen-home';
  SCREEN_BY_STATE[STATES.RITUAL] = 'screen-ritual';
  SCREEN_BY_STATE[STATES.SHUFFLING] = 'screen-draw';
  SCREEN_BY_STATE[STATES.CARD_REVEAL] = 'screen-draw';
  SCREEN_BY_STATE[STATES.RESULT] = 'screen-result';

  function applyScreen(nextState) {
    var target = SCREEN_BY_STATE[nextState];
    var all = ['screen-home', 'screen-ritual', 'screen-draw', 'screen-result'];
    for (var i = 0; i < all.length; i++) show(el[all[i]], all[i] === target);
    if (target === 'screen-draw') buildDeck();
    var targetNode = el[target];
    if (targetNode) {
      targetNode.classList.remove('is-entering');
      void targetNode.offsetWidth;
      targetNode.classList.add('is-entering');
      if (screenTimer) window.clearTimeout(screenTimer);
      screenTimer = window.setTimeout(function () {
        targetNode.classList.remove('is-entering');
        screenTimer = 0;
      }, 1100);
    }
    window.scrollTo(0, 0);
  }

  /* ---------- 首页氛围 ---------- */
  function buildAmbient() {
    if (el['brand-sigil']) {
      el['brand-sigil'].innerHTML = MO.art.renderSigilSvg();
    }
    if (el['home-hero']) {
      var host = document.createElement('div');
      host.className = 'home-hero-card' + (core.motion.tier === 'reduced' ? '' : ' is-drifting');
      host.innerHTML = MO.art.renderCardBackSvg();
      el['home-hero'].appendChild(host);
    }
    if (el['ambient-stars']) {
      var frag = document.createDocumentFragment();
      /* 固定序列，不随每次渲染抖动 */
      var seed = 20261015;
      for (var i = 0; i < 26; i++) {
        seed = (seed * 1103515245 + 12345) >>> 0;
        var star = document.createElement('i');
        star.style.left = ((seed >>> 8) % 100) + '%';
        star.style.top = ((seed >>> 16) % 100) + '%';
        var scale = 0.7 + ((seed >>> 4) % 10) / 10;
        star.style.transform = 'scale(' + scale + ')';
        frag.appendChild(star);
      }
      el['ambient-stars'].appendChild(frag);
    }
  }

  function buildDrawAtmosphere() {
    var field = core.qs('.draw-starfield');
    if (!field) return;
    var frag = document.createDocumentFragment();
    var seed = 20261020;
    for (var i = 0; i < 24; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      var star = document.createElement('i');
      star.style.left = ((seed >>> 7) % 96 + 2) + '%';
      star.style.top = ((seed >>> 17) % 92 + 4) + '%';
      star.style.animationDelay = (-((seed >>> 5) % 60) / 10).toFixed(1) + 's';
      star.style.opacity = (0.24 + ((seed >>> 11) % 45) / 100).toFixed(2);
      if (i % 7 === 0) star.className = 'is-cyan';
      else if (i % 9 === 0) star.className = 'is-rose';
      else if (i % 5 === 0) star.className = 'is-ivory';
      frag.appendChild(star);
    }
    field.appendChild(frag);
  }

  /* ---------- 静心页 ---------- */
  function renderRitual() {
    /* 不设主题：问题在用户心里，工具不替他定方向 */
  }

  /* ---------- 牌组 ---------- */
  var deckCards = [];
  var deckSpreadWidth = 0;
  var deckWasShuffled = false;
  var FAN_RANK = [];
  (function buildFanOrder() {
    var mid = Math.floor((DECK_SIZE - 1) / 2);
    var rank = 0;
    FAN_RANK[mid] = rank++;
    for (var i = 1; i < DECK_SIZE; i++) {
      if (mid - i >= 0) FAN_RANK[mid - i] = rank++;
      if (mid + i < DECK_SIZE) FAN_RANK[mid + i] = rank++;
    }
  })();

  /* ---------- riffle 计划 ----------
     参考真实手洗牌的交错模型：牌分成两包，交替落下。
     每次洗牌都重新随机分包与交错，所以顺序不会重复上一轮。
     力度越大，两包交错越随机。 */
  var rifflePlan = [];

  function buildRifflePlan(intensity) {
    var indices = [];
    var i;
    for (i = 0; i < DECK_SIZE; i++) indices.push(i);
    for (i = indices.length - 1; i > 0; i--) {
      var j = core.randomInt(i + 1);
      var tmp = indices[i];
      indices[i] = indices[j];
      indices[j] = tmp;
    }

    /* 先分成两包，包内顺序固定 */
    var half = Math.ceil(DECK_SIZE / 2);
    var left = [];
    var right = [];
    for (i = 0; i < half; i++) left.push({ card: indices[i], side: -1, local: i });
    for (i = half; i < DECK_SIZE; i++) right.push({ card: indices[i], side: 1, local: i - half });

    rifflePlan = interleave(left, right, intensity);
  }

  /* 交错：两包交替落下，力度越大越随机 */
  function interleave(left, right, intensity) {
    var plan = [];
    var li = 0;
    var ri = 0;
    var step = 0;
    var pRight = 0.3 + Math.max(0, Math.min(1, intensity || 0)) * 0.4;

    while (li < left.length || ri < right.length) {
      var takeRight;
      if (li >= left.length) takeRight = true;
      else if (ri >= right.length) takeRight = false;
      else takeRight = core.randomInt(1000) / 1000 < pRight;

      var item = takeRight ? right[ri++] : left[li++];
      plan.push({
        card: item.card,
        side: item.side,
        local: item.local,
        step: step++
      });
    }
    return plan;
  }

  /* 只重排交错顺序，分包保持不变：手劲越大，牌落得越乱 */
  function reshuffleInterleave(intensity) {
    var left = [];
    var right = [];
    for (var i = 0; i < rifflePlan.length; i++) {
      if (rifflePlan[i].side < 0) left.push(rifflePlan[i]);
      else right.push(rifflePlan[i]);
    }
    rifflePlan = interleave(left, right, intensity);
  }

  function stepOf(index) {
    for (var i = 0; i < rifflePlan.length; i++) {
      if (rifflePlan[i].card === index) return rifflePlan[i].step;
    }
    return index;
  }

  function sideOf(index) {
    for (var i = 0; i < rifflePlan.length; i++) {
      if (rifflePlan[i].card === index) return rifflePlan[i].side;
    }
    return index < Math.ceil(DECK_SIZE / 2) ? -1 : 1;
  }

  function packOf(side) {
    var out = [];
    for (var i = 0; i < rifflePlan.length; i++) {
      if (rifflePlan[i].side === side) {
        out.push({ card: rifflePlan[i].card, local: rifflePlan[i].local });
      }
    }
    out.sort(function (a, b) { return a.local - b.local; });
    return out;
  }

  function setDeckInteractive(enabled) {
    for (var i = 0; i < deckCards.length; i++) {
      deckCards[i].tabIndex = enabled ? 0 : -1;
      deckCards[i].setAttribute('aria-disabled', enabled ? 'false' : 'true');
    }
  }

  function clamp01(value) {
    return core.clampNumber(value, 0, 1);
  }

  function mix(from, to, amount) {
    return from + (to - from) * amount;
  }

  function easeOutCubic(t) {
    var inv = 1 - t;
    return 1 - inv * inv * inv;
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function easeInOutQuint(t) {
    return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
  }

  function easeOutBack(t) {
    var c1 = 1.16;
    var c3 = c1 + 1;
    var p = t - 1;
    return 1 + c3 * p * p * p + c1 * p * p;
  }

  function initialPose(index) {
    var mid = (DECK_SIZE - 1) / 2;
    var offset = index - mid;
    return {
      x: offset * 0.86,
      y: -offset * 0.44,
      rot: offset * 0.22,
      tiltX: 2.2,
      tiltY: 0,
      scale: 0.982,
      z: 30 + index
    };
  }

  function restPose(index) {
    var mid = (DECK_SIZE - 1) / 2;
    var offset = index - mid;
    var containerW = deckSpreadWidth || el.deck.clientWidth || 320;
    if (containerW > 620) containerW = 620;
    var maxAngleDeg = containerW < 360 ? 18 : DECK_FAN_MAX_ANGLE;
    var maxAngle = maxAngleDeg * Math.PI / 180;
    var rotatedHalfWidth = (
      DECK_CARD_WIDTH * Math.cos(maxAngle) +
      DECK_CARD_HEIGHT * Math.sin(maxAngle)
    ) / 2;
    var availableHalf = Math.max(48, containerW / 2 - Math.max(42, rotatedHalfWidth * 0.9) - 4);
    var radius = availableHalf / Math.sin(maxAngle);
    var angle = offset / mid * maxAngle;
    return {
      x: Math.sin(angle) * radius,
      y: -radius * (1 - Math.cos(angle)) + 4,
      rot: angle * 180 / Math.PI,
      tiltX: 2.4,
      tiltY: -offset / mid * 4,
      scale: 1,
      z: 90 - Math.round(Math.abs(offset) * 8)
    };
  }

  function cutPose(index) {
    var side = sideOf(index);
    var pack = packOf(side);
    var local = 0;
    for (var i = 0; i < pack.length; i++) {
      if (pack[i].card === index) { local = pack[i].local; break; }
    }
    return {
      x: side * 70 + side * local * 0.9,
      y: -32 + local * 1.05 + (side < 0 ? -2 : 2),
      rot: side * (7.2 + local * 0.18),
      tiltX: 4.2,
      tiltY: side * -5,
      scale: 0.968,
      z: (side < 0 ? 44 : 72) + local
    };
  }

  function gatheredPose(index, amount) {
    var mid = (DECK_SIZE - 1) / 2;
    var offset = index - mid;
    var step = stepOf(index);
    var restX = offset * 0.72;
    var restY = -8 + step * 0.55;
    return {
      x: restX * (1 - 0.24 * amount),
      y: restY - Math.sin(amount * Math.PI) * 4.2,
      rot: ((index % 2) ? 1.1 : -1.1) * (1 - 0.84 * amount),
      tiltX: mix(4.2, 2.8, amount),
      tiltY: ((index % 2) ? 2 : -2) * (1 - amount),
      scale: mix(0.966, 0.94, amount),
      z: 90 + step
    };
  }

  function interleavedPose(index) {
    var mid = (DECK_SIZE - 1) / 2;
    var step = stepOf(index);
    var side = sideOf(index);
    return {
      x: (step - mid) * 1.25 + side * 2.8,
      y: -20 + step * 1.15,
      rot: side * 4.4 + ((index % 2) ? 0.8 : -0.8),
      tiltX: 4.6,
      tiltY: side * 4,
      scale: 0.965,
      z: 90 + step
    };
  }

  function transformForPose(pose) {
    return 'translate3d(' + pose.x.toFixed(2) + 'px,' + pose.y.toFixed(2) + 'px,0) rotateZ(' +
      pose.rot.toFixed(2) + 'deg) rotateX(' + (pose.tiltX || 0).toFixed(2) +
      'deg) rotateY(' + (pose.tiltY || 0).toFixed(2) + 'deg) scale(' + pose.scale.toFixed(3) + ')';
  }

  function writePose(node, pose) {
    node.style.transform = transformForPose(pose);
    node.style.zIndex = String(pose.z);
  }

  function buildDeck() {
    var deck = el.deck;
    while (deck.firstChild) deck.removeChild(deck.firstChild);
    deckCards = [];
    deckSpreadWidth = 0;
    deckWasShuffled = false;
    if (el['deck-stage']) {
      el['deck-stage'].classList.remove('is-busy');
      el['deck-stage'].classList.remove('is-ready');
    }
    deck.classList.remove('is-ready');
    deck.classList.remove('is-busy');
    deck.classList.remove('is-revealing');

    var frag = document.createDocumentFragment();
    for (var i = 0; i < DECK_SIZE; i++) {
      var wrap = document.createElement('div');
      wrap.className = 'deck-card';
      wrap.setAttribute('data-index', String(i));
      wrap.setAttribute('role', 'button');
      wrap.setAttribute('aria-label', '选择第 ' + (i + 1) + ' 张牌');
      wrap.setAttribute('aria-disabled', 'true');
      wrap.tabIndex = -1;

      var inner = document.createElement('div');
      inner.className = 'deck-card-inner';

      var back = document.createElement('div');
      back.className = 'deck-card-face deck-card-back';
      back.innerHTML = MO.art.renderCardBackSvg();

      var front = document.createElement('div');
      front.className = 'deck-card-face deck-card-front';
      /* 前脸在抽到时才确定，未抽到之前保持空白牌背设计 */
      front.innerHTML = MO.art.renderCardBackSvg();

      inner.appendChild(back);
      inner.appendChild(front);
      wrap.appendChild(inner);
      frag.appendChild(wrap);
      deckCards.push(wrap);
    }
    deck.appendChild(frag);

    for (var j = 0; j < deckCards.length; j++) {
      (function (node) {
        on(node, 'click', function () {
          /* 拖出后浏览器仍会补发 click，这里忽略它 */
          if (pick.suppressClick) {
            pick.suppressClick = false;
            return;
          }
          onDeckPick(node);
        });
        on(node, 'keydown', function (event) {
          if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
            event.preventDefault();
            onDeckPick(node);
          }
        });
      })(deckCards[j]);
    }

    applyInitialDeckPose();
    deck.classList.add('is-locked');
    deck.setAttribute('aria-busy', 'false');
    setDeckInteractive(false);
  }

  function applyInitialDeckPose() {
    for (var i = 0; i < deckCards.length; i++) {
      var node = deckCards[i];
      node.style.transition = 'none';
      writePose(node, initialPose(i));
      void node.offsetWidth;
      node.style.transition = '';
    }
  }

  function applyDeckPose(animated) {
    for (var i = 0; i < deckCards.length; i++) {
      var pose = restPose(i);
      var node = deckCards[i];
      if (!animated) node.style.transition = 'none';
      writePose(node, pose);
      if (!animated) {
        /* 强制一次重排后再恢复过渡，避免首帧就带过渡 */
        void node.offsetWidth;
        node.style.transition = '';
      }
    }
  }

  /* ---------- 洗牌（手势切牌 → riffle 交错 → 收拢 → 展开） ----------
     牌堆跟随手指左右移动，松手后按交错顺序落牌。 */
  var shufflePhase = -1;
  var landed = [];

  var gesture = {
    active: false,
    pointerId: null,
    startX: 0,
    lastX: 0,
    lastTime: 0,
    moved: 0,
    speed: 0,
    amount: 0
  };

  var GESTURE_CUT_PIXELS = 150;   // 拖动多少像素算“切开到位”
  var GESTURE_TAP_PIXELS = 12;    // 位移小于此值视为点按
  var RELEASE_MS = 190;           // 松手后归位到切牌姿态的时长

  function shufflePoseAt(index, t) {
    var start = deckWasShuffled ? restPose(index) : initialPose(index);
    var cut = cutPose(index);
    var step = stepOf(index);
    var inhale = Math.sin(clamp01(t / 0.16) * Math.PI);
    start.x *= 1 - inhale * 0.045;
    start.y -= inhale * 4;
    start.scale -= inhale * 0.018;

    var splitLocal = easeInOutCubic(clamp01((t - 0.025 - step * 0.0025) / 0.14));
    var x = mix(start.x, cut.x, splitLocal);
    var y = mix(start.y, cut.y, splitLocal);
    var rot = mix(start.rot, cut.rot, splitLocal);
    var tiltX = mix(start.tiltX, cut.tiltX, splitLocal);
    var tiltY = mix(start.tiltY, cut.tiltY, splitLocal);
    var scale = mix(start.scale, cut.scale, splitLocal);

    var riffleStart = 0.18 + step * 0.038;
    var riffleLocal = clamp01((t - riffleStart) / 0.265);
    if (riffleLocal > 0) {
      var arrival = interleavedPose(index);
      var move = easeOutCubic(riffleLocal);
      var lift = Math.sin(riffleLocal * Math.PI);
      var side = sideOf(index);
      x = mix(cut.x, arrival.x, move) + side * lift * 34;
      y = mix(cut.y, arrival.y, move) - lift * (42 + step * 0.8);
      rot = mix(cut.rot, arrival.rot, move) - side * lift * 13;
      tiltX = mix(cut.tiltX, arrival.tiltX, move) + lift * 9;
      tiltY = mix(cut.tiltY, arrival.tiltY, move) - side * lift * 10;
      scale = mix(cut.scale, arrival.scale, move) + lift * 0.027;
    }

    var gatherLocal = easeInOutQuint(clamp01((t - 0.65) / 0.15));
    if (gatherLocal > 0) {
      var compact = gatheredPose(index, gatherLocal);
      if (riffleLocal >= 1) {
        x = compact.x;
        y = compact.y;
        rot = compact.rot;
        tiltX = compact.tiltX;
        tiltY = compact.tiltY;
        scale = compact.scale;
      } else {
        var catchUp = gatherLocal * 0.72;
        x = mix(x, compact.x, catchUp);
        y = mix(y, compact.y, catchUp);
        rot = mix(rot, compact.rot, catchUp);
        tiltX = mix(tiltX, compact.tiltX, catchUp);
        tiltY = mix(tiltY, compact.tiltY, catchUp);
        scale = mix(scale, compact.scale, catchUp);
      }
    }

    var fanStart = 0.75 + FAN_RANK[index] * 0.0026;
    var fanLocal = clamp01((t - fanStart) / 0.21);
    if (fanLocal > 0) {
      var destination = restPose(index);
      var fan = easeOutBack(fanLocal);
      x = mix(x, destination.x, fan);
      y = mix(y, destination.y, fan) - Math.sin(fanLocal * Math.PI) * 5;
      rot = mix(rot, destination.rot, fan);
      tiltX = mix(tiltX, destination.tiltX, fan);
      tiltY = mix(tiltY, destination.tiltY, fan);
      scale = mix(scale, destination.scale, fan);
      if (fanLocal > 0.08) {
        return {
          x: x,
          y: y,
          rot: rot,
          tiltX: tiltX,
          tiltY: tiltY,
          scale: scale,
          z: destination.z
        };
      }
    }

    return {
      x: x,
      y: y,
      rot: rot,
      tiltX: tiltX,
      tiltY: tiltY,
      scale: scale,
      z: 90 + step
    };
  }

  function updateShuffleStage(t) {
    var next = 0;
    if (t >= 0.12) next = 1;
    if (t >= 0.2) next = 2;
    if (t >= 0.64) next = 3;
    if (t >= 0.76) next = 4;
    if (next === shufflePhase) return;
    shufflePhase = next;
    var copy = [
      '牌组收拢，把注意力放回手心。',
      '左右切牌，重新排列。',
      '让牌交错，落下新的顺序。',
      '合拢牌组，收住气息。',
      '展开今晚的牌阵。'
    ];
    setText(el['draw-stage'], copy[next]);
  }

  /* ---------- 洗牌流程 ---------- */
  function prepareShuffleRun() {
    deckLocked = false;
    deckSpreadWidth = el.deck.clientWidth || 320;

    shufflePhase = -1;
    landed = [];
    for (var i = 0; i < deckCards.length; i++) landed[i] = false;

    el['btn-shuffle'].setAttribute('disabled', '');
    setText(el['btn-shuffle'], '洗牌中');
    el.deck.classList.add('is-locked');
    el.deck.classList.add('is-busy');
    el.deck.classList.remove('is-ready');
    if (el['deck-stage']) {
      el['deck-stage'].classList.add('is-busy');
      el['deck-stage'].classList.remove('is-ready');
    }
    el.deck.setAttribute('aria-busy', 'true');
    setDeckInteractive(false);

    for (var k = 0; k < deckCards.length; k++) {
      deckCards[k].classList.remove('is-flipped');
      deckCards[k].classList.add('is-shuffling');
    }
  }

  /* 落牌音：每张牌落定时轻轻一响 */
  function playLandingSounds(progress) {
    if (!MO.audio) return;
    for (var i = 0; i < deckCards.length; i++) {
      if (landed[i]) continue;
      var step = stepOf(i);
      var landAt = 0.18 + step * 0.038 + 0.265;
      if (progress >= landAt) {
        landed[i] = true;
        MO.audio.deal(0.42 + (step % 3) * 0.14);
      }
    }
  }

  /* 时间线：从 fromT 推进到 1 */
  function runShuffleTimeline(fromT, duration) {
    var t0 = fromT || 0;
    var span = Math.max(0.0001, 1 - t0);
    var start = null;
    var lastFrame = 0;

    function frame(timestamp) {
      /* 洗牌已被看门狗或用户操作收尾时，立刻停止写入位姿。
         否则这一帧会把「中途」的牌位写回去，牌组停在半洗状态，某张牌支棱在外面。 */
      if (!shuffling) {
        shuffleRaf = 0;
        return;
      }
      if (start === null) start = timestamp;
      var elapsed = timestamp - start;
      if (lastFrame) core.motion.observe(timestamp - lastFrame);
      lastFrame = timestamp;

      var local = core.clampNumber(elapsed / duration, 0, 1);
      var progress = t0 + local * span;
      updateShuffleStage(progress);
      playLandingSounds(progress);

      for (var i = 0; i < deckCards.length; i++) {
        writePose(deckCards[i], shufflePoseAt(i, progress));
      }

      if (local < 1) {
        shuffleRaf = window.requestAnimationFrame(frame);
        return;
      }
      applyDeckPose(false);
      for (var k = 0; k < deckCards.length; k++) deckCards[k].classList.remove('is-shuffling');
      shuffleRaf = 0;
      settleShuffle();
    }

    shuffleRaf = window.requestAnimationFrame(frame);
    /* 看门狗：即使 rAF 被节流或暂停，动画也必须在有限时间内结束 */
    shuffleWatchdog = window.setTimeout(function () {
      if (!shuffling) return;
      if (shuffleRaf) { window.cancelAnimationFrame(shuffleRaf); shuffleRaf = 0; }
      applyDeckPose(false);
      for (var k = 0; k < deckCards.length; k++) deckCards[k].classList.remove('is-shuffling');
      settleShuffle();
    }, duration + 500);
  }

  /* 洗牌开始时就定下这一轮要抽的牌，并立刻在后台预热它的图片：
     洗牌动画有 1.4 秒，足够把牌面加载并解码完，翻面时就不会出现空框。 */
  function prepareDraw() {
    var cards = MO.cards.list;
    var prepared = session.prepared;
    var card = prepared ? MO.cards.byId(prepared.cardId) : cards[core.randomInt(cards.length)];
    if (!card) card = cards[core.randomInt(cards.length)];
    var orientation = prepared ? prepared.orientation : (core.randomInt(2) === 0 ? 'upright' : 'reversed');
    session.prepared = null;
    session.prepared = { cardId: card.id, orientation: orientation };
    if (MO.art && typeof MO.art.preloadCardImage === 'function') {
      MO.art.preloadCardImage(card);
    }
    return session.prepared;
  }

  function startShuffle() {
    if (shuffling || session.draw) return;   // 动画期间防抖
    shuffling = true;
    prepareDraw();

    buildRifflePlan(0.5);
    prepareShuffleRun();

    var reduced = core.motion.tier === 'reduced';
    if (reduced) {
      setText(el['draw-stage'], '展开今晚的牌阵。');
      applyDeckPose(false);
      shuffleTimer = window.setTimeout(function () {
        shuffleTimer = 0;
        settleShuffle();
      }, 420);
      return;
    }
    updateShuffleStage(0);
    runShuffleTimeline(0, SHUFFLE_MS);
  }

  /* ---------- 手势洗牌 ---------- */
  function gesturePoseAt(index, amount, offsetX, tilt) {
    var start = deckWasShuffled ? restPose(index) : initialPose(index);
    var cut = cutPose(index);
    return {
      x: mix(start.x, cut.x, amount) + offsetX,
      y: mix(start.y, cut.y, amount),
      rot: mix(start.rot, cut.rot, amount) + tilt * 0.16,
      tiltX: mix(start.tiltX, cut.tiltX, amount),
      tiltY: mix(start.tiltY, cut.tiltY, amount) + tilt * 0.12,
      scale: mix(start.scale, cut.scale, amount),
      z: mix(start.z, cut.z, amount)
    };
  }

  /* ---------- 抽牌手势：从牌阵里把牌拖出来 ---------- */
  var pick = {
    active: false,
    pointerId: null,
    node: null,
    index: 0,
    startX: 0,
    startY: 0,
    moved: 0,
    base: null,
    suppressClick: false
  };

  var PICK_TAP_PIXELS = 12;   // 位移小于此值视为点按

  function findCardNode(node) {
    var cursor = node;
    while (cursor && cursor !== el.deck) {
      if (cursor.className && String(cursor.className).indexOf('deck-card') !== -1) return cursor;
      cursor = cursor.parentNode;
    }
    return null;
  }

  function startPickGesture(event) {
    if (deckLocked || shuffling || session.draw) return;
    var node = findCardNode(event.target);
    if (!node) return;

    pick.active = true;
    pick.pointerId = event.pointerId;
    pick.node = node;
    pick.index = Number(node.getAttribute('data-index'));
    pick.startX = event.clientX;
    pick.startY = event.clientY;
    pick.moved = 0;
    pick.base = restPose(pick.index);

    try { el.deck.setPointerCapture(event.pointerId); } catch (error) { /* 忽略 */ }
    node.style.transition = 'none';
    el.deck.classList.add('is-picking');
    if (MO.audio) { MO.audio.unlock(); MO.audio.shuffleStart(); }
    /* 注意：这里不能 preventDefault。
       Pointer Events 规范下，pointerdown 上的 preventDefault 会阻止浏览器补发
       click，轻点选牌就再也没有触发路径了。滚动由 CSS touch-action 负责。 */
  }

  function pickPoseAt(dx, dy) {
    var base = pick.base || restPose(0);
    return {
      x: base.x + dx * 0.92,
      y: base.y + dy * 0.92 - 16,
      rot: base.rot + dx * 0.05,
      tiltX: base.tiltX - dy * 0.04,
      tiltY: base.tiltY,
      scale: 1.08,
      z: 300
    };
  }

  function onPickMove(event) {
    if (!pick.active) return;
    if (pick.pointerId !== null && event.pointerId !== pick.pointerId) return;

    var dx = event.clientX - pick.startX;
    var dy = event.clientY - pick.startY;
    var distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > pick.moved) pick.moved = distance;

    writePose(pick.node, pickPoseAt(dx, dy));
    if (MO.audio) MO.audio.shuffleLevel(Math.min(1, pick.moved / 130));
    /* 不调用 preventDefault，避免影响页面滚动与 click 的补发 */
  }

  function onPickUp(event) {
    if (!pick.active) return;
    if (pick.pointerId !== null && event && event.pointerId !== pick.pointerId) return;

    pick.active = false;
    var node = pick.node;
    var moved = pick.moved;
    var dx = event ? event.clientX - pick.startX : 0;
    var dy = event ? event.clientY - pick.startY : 0;

    el.deck.classList.remove('is-picking');
    if (MO.audio) MO.audio.shuffleStop();
    try { if (event) el.deck.releasePointerCapture(event.pointerId); } catch (error) { /* 忽略 */ }

    if (moved < PICK_TAP_PIXELS) {
      /* 轻点：就地抽牌。
         随后浏览器补发的 click 由 suppressClick 吞掉，避免重复抽牌。 */
      pick.suppressClick = true;
      window.setTimeout(function () { pick.suppressClick = false; }, 400);
      writePose(node, pick.base);
      node.style.transition = '';
      calmDeck(700);
      onDeckPick(node);
      return;
    }

    /* 拖出：抑制随后触发的 click，避免重复抽牌 */
    pick.suppressClick = true;
    window.setTimeout(function () { pick.suppressClick = false; }, 400);

    /* 保留拖拽位置作为翻面动画的起点 */
    writePose(node, pickPoseAt(dx, dy));
    node.style.transition = '';
    onDeckPick(node, pickPoseAt(dx, dy));
  }

  function onDeckPointerDown(event) {
    if (shuffling || session.draw) return;
    if (deckWasShuffled) {
      /* 扇形态：进入抽牌手势 */
      startPickGesture(event);
      return;
    }
    if (gesture.active) return;
    if (core.motion.tier === 'reduced') return;    // 降低动效时只保留按钮

    gesture.active = true;
    gesture.pointerId = event.pointerId;
    gesture.startX = event.clientX;
    gesture.lastX = event.clientX;
    gesture.lastTime = event.timeStamp || 0;
    gesture.moved = 0;
    gesture.speed = 0;
    gesture.amount = 0;

    buildRifflePlan(0.5);
    try { el.deck.setPointerCapture(event.pointerId); } catch (error) { /* 忽略 */ }
    el.deck.classList.add('is-grabbing');
    el['btn-shuffle'].setAttribute('disabled', '');
    setText(el['draw-stage'], '按住牌堆，左右拖动，把牌切开。');
    if (MO.audio) { MO.audio.unlock(); MO.audio.shuffleStart(); }
    /* 不调用 preventDefault：避免阻断页面纵向滚动，也避免吞掉 click */
  }

  /* 跟手位移：跟手但不让牌跑出屏幕 */
  function dragOffset(x) {
    return core.clampNumber(x * 0.62, -62, 62);
  }

  function onDeckPointerMove(event) {
    if (pick.active) {
      onPickMove(event);
      return;
    }
    if (!gesture.active) return;
    if (gesture.pointerId !== null && event.pointerId !== gesture.pointerId) return;

    var stamp = event.timeStamp || 0;
    var delta = event.clientX - gesture.lastX;
    var dt = stamp - gesture.lastTime;
    gesture.moved += Math.abs(delta);
    gesture.lastX = event.clientX;
    gesture.lastTime = stamp;
    if (dt > 0) {
      var v = Math.abs(delta) / dt;                // px/ms
      gesture.speed = gesture.speed * 0.62 + Math.min(1.5, v) * 0.38;
    }

    var offsetX = dragOffset(event.clientX - gesture.startX);
    gesture.amount = core.clampNumber(gesture.moved / GESTURE_CUT_PIXELS, 0, 1);

    for (var i = 0; i < deckCards.length; i++) {
      writePose(deckCards[i], gesturePoseAt(i, gesture.amount, offsetX, gesture.speed));
    }
    if (MO.audio) MO.audio.shuffleLevel(gesture.speed / 1.2);
    /* 不调用 preventDefault：滚动交给 CSS touch-action 控制 */
  }

  /* 松手：归位到切牌姿态，然后按交错顺序落牌 */
  function runReleaseTween(fromAmount, offsetX, tilt, done) {
    var start = null;
    var finished = false;
    /* 兜底：rAF 被节流时也必须走到下一步 */
    var guard = window.setTimeout(function () {
      if (finished) return;
      finished = true;
      if (shuffleRaf) { window.cancelAnimationFrame(shuffleRaf); shuffleRaf = 0; }
      done();
    }, RELEASE_MS + 320);

    function frame(timestamp) {
      /* 已被兜底收尾（rAF 被节流）时不再写入位姿，避免覆盖后续时间线 */
      if (finished) {
        shuffleRaf = 0;
        return;
      }
      if (start === null) start = timestamp;
      var local = core.clampNumber((timestamp - start) / RELEASE_MS, 0, 1);
      var amount = mix(fromAmount, 1, easeOutCubic(local));
      var decay = Math.pow(1 - local, 1.6);
      for (var i = 0; i < deckCards.length; i++) {
        writePose(deckCards[i], gesturePoseAt(i, amount, offsetX * decay, tilt * decay));
      }
      if (local < 1) {
        shuffleRaf = window.requestAnimationFrame(frame);
        return;
      }
      shuffleRaf = 0;
      if (finished) return;
      finished = true;
      window.clearTimeout(guard);
      done();
    }
    shuffleRaf = window.requestAnimationFrame(frame);
  }

  function onDeckPointerUp(event) {
    if (pick.active) {
      onPickUp(event);
      return;
    }
    if (!gesture.active) return;
    if (gesture.pointerId !== null && event && event.pointerId !== gesture.pointerId) return;

    var pointerX = event ? event.clientX : gesture.lastX;
    var wasTap = gesture.moved < GESTURE_TAP_PIXELS;
    var offsetX = dragOffset(pointerX - gesture.startX);
    var speed = gesture.speed;
    var amount = gesture.amount;

    gesture.active = false;
    gesture.pointerId = null;
    el.deck.classList.remove('is-grabbing');
    try { if (event) el.deck.releasePointerCapture(event.pointerId); } catch (error) { /* 忽略 */ }
    if (MO.audio) MO.audio.shuffleStop();

    if (wasTap) {
      startShuffle();                              // 点按 = 自动洗牌
      return;
    }

    /* 力度：位移与速度综合，越大交错越乱、落牌越快 */
    var intensity = core.clampNumber(Math.max(amount, speed / 1.4) * 0.78 + 0.12, 0.12, 1);
    reshuffleInterleave(intensity);
    shuffling = true;
    prepareShuffleRun();
    setText(el['draw-stage'], '松手，让牌落下来。');

    runReleaseTween(amount, offsetX, speed, function () {
      var tail = Math.max(620, (1 - amount * 0.2) * 980);
      runShuffleTimeline(0.25, tail);
    });
  }

  function onDeckPointerCancel() {
    if (pick.active) {
      /* 抽牌手势被中断：牌归位 */
      pick.active = false;
      pick.pointerId = null;
      if (pick.node) {
        writePose(pick.node, pick.base);
        pick.node.style.transition = '';
      }
      el.deck.classList.remove('is-picking');
      if (MO.audio) MO.audio.shuffleStop();
      return;
    }
    if (!gesture.active) return;
    gesture.active = false;
    gesture.pointerId = null;
    el.deck.classList.remove('is-grabbing');
    if (MO.audio) MO.audio.shuffleStop();
    applyInitialDeckPose();
    el['btn-shuffle'].removeAttribute('disabled');
    setText(el['draw-stage'], '让牌组重新排列，把注意力交给手。');
  }

  /* 洗牌刚结束的一小段时间内压制悬停提示：
     指针通常还停在牌堆上（洗牌是往右拖的），此时若卡片抬起并加亮，
     会被误读成「已经选中」。 */
  var calmTimer = 0;
  function calmDeck(duration) {
    var deck = el.deck;
    if (!deck) return;
    deck.classList.add('is-calm');
    if (calmTimer) window.clearTimeout(calmTimer);
    calmTimer = window.setTimeout(function () {
      calmTimer = 0;
      if (el.deck) el.deck.classList.remove('is-calm');
    }, duration || 1000);
  }

  function finishShuffle() {
    shuffling = false;
    deckLocked = false;
    deckWasShuffled = true;
    /* 收尾时无条件重写最终牌位：任何在途帧写回的中间状态都会被覆盖 */
    applyDeckPose(false);
    /* 焦点若还留在牌上，先清掉，避免看起来像被选中 */
    var active = document.activeElement;
    if (active && active.className && String(active.className).indexOf('deck-card') !== -1) {
      if (typeof active.blur === 'function') active.blur();
    }
    calmDeck(1100);
    el['btn-shuffle'].removeAttribute('disabled');
    setText(el['btn-shuffle'], '再洗一次');
    setText(el['draw-stage'], '牌已洗好。伸出手，选一张。');
    el.deck.setAttribute('aria-busy', 'false');
    el.deck.classList.remove('is-busy');
    el.deck.classList.remove('is-locked');
    el.deck.classList.add('is-ready');
    if (el['deck-stage']) {
      el['deck-stage'].classList.remove('is-busy');
      el['deck-stage'].classList.add('is-ready');
    }
    setDeckInteractive(true);
    setText(el['draw-hint'], '按住一张牌，把它拖出来。');
    show(el['draw-hint'], true);
  }

  /* 收敛洗牌：动画与看门狗共用的唯一出口 */
  function settleShuffle() {
    if (!shuffling) return;
    if (shuffleWatchdog) { window.clearTimeout(shuffleWatchdog); shuffleWatchdog = 0; }
    finishShuffle();
    deckSpreadWidth = 0;
  }

  /* ---------- 抽牌与翻面 ---------- */
  var REVEAL_LIFT_MS = 170;    // 抽出抬起
  var REVEAL_MOVE_MS = 430;    // 移到画面中央并放大
  var REVEAL_HOLD_MS = 170;    // 停顿一拍，让用户看清牌背
  var REVEAL_FLIP_MS = 620;    // 翻面
  var REVEAL_EXIT_MS = 200;    // 翻面后停留，再进书页

  function onDeckPick(node, fromPose) {
    if (deckLocked || shuffling) return;   // 未洗牌 / 洗牌中 / 已揭晓
    if (session.draw) return;              // 一次占卜只抽一次

    var index = Number(node.getAttribute('data-index'));
    if (!isFinite(index)) return;

    var cards = MO.cards.list;
    var card = cards[core.randomInt(cards.length)];
    var orientation = core.randomInt(2) === 0 ? 'upright' : 'reversed';

    /* 抽定即冻结：后续渲染不改变这副牌 */
    session.draw = {
      cardId: card.id,
      orientation: orientation,
      deckIndex: index,
      drawnAt: new Date().getTime()
    };

    deckLocked = true;
    el.deck.classList.add('is-locked');
    el.deck.setAttribute('aria-busy', 'false');
    setDeckInteractive(false);
    el['btn-shuffle'].setAttribute('disabled', '');
    el['btn-back-draw'].setAttribute('disabled', '');
    setText(el['draw-stage'], '就是这一张。');

    /* 把前脸换成真正抽到的牌面（并记住这个元素，书页直接复用，不再二次加载） */
    var front = node.getElementsByClassName('deck-card-front')[0];
    if (front) {
      session.pickedImg = MO.art.mountCardImage(front, card, {
        reversed: orientation === 'reversed'
      });
    }

    /* 揭示仪式：抽出 → 其余牌退开 → 移到画面中央放大 → 停顿 → 翻面 → 进书页 */
    var base = fromPose ? fromPose : (function () {
      var rest = restPose(index);
      return { x: rest.x, y: rest.y, rot: rest.rot, tiltX: rest.tiltX, tiltY: rest.tiltY, scale: 1 };
    })();

    node.classList.add('is-picked');
    el.deck.classList.add('is-revealing');

    /* 1. 抽出：抬起、扶正 */
    var lifted = {
      x: base.x,
      y: base.y - 18,
      rot: base.rot * 0.45,
      tiltX: 0,
      tiltY: 0,
      scale: 1.08,
      z: 300
    };
    node.style.zIndex = '300';
    node.style.transition = 'transform ' + REVEAL_LIFT_MS + 'ms cubic-bezier(.2,.8,.3,1)';
    node.style.transform = transformForPose(lifted);

    machine.go(STATES.CARD_REVEAL);

    /* 2. 牌面就位后再进入揭示动画：避免翻面时看到空框、图片再突然淡入 */
    MO.art.preloadCardImage(card, 600).then(function () {
      if (!session.draw || session.draw.cardId !== card.id) return;
      revealFromCenter(node, card, base);
    });
  }

  /* 移到版心中央并放大（相对版心与牌组区计算，任何视口一致） */
  function revealFromCenter(node, card, base) {
    shuffleTimer = window.setTimeout(function () {
      var rect = node.getBoundingClientRect();
      var column = el['app'] || document.body;
      var columnRect = column.getBoundingClientRect();
      var deckRect = el.deck.getBoundingClientRect();
      var targetWidth = Math.min(columnRect.width * 0.6, 260);
      var scale = node.offsetWidth ? targetWidth / node.offsetWidth : 2.4;
      var deltaX = (columnRect.left + columnRect.width / 2) - (rect.left + rect.width / 2);
      var deltaY = (deckRect.top + deckRect.height / 2) - (rect.top + rect.height / 2);

      var centered = {
        x: base.x + deltaX,
        y: base.y + deltaY,
        rot: 0,
        tiltX: 0,
        tiltY: 0,
        scale: scale,
        z: 300
      };
      node.style.transition = 'transform ' + REVEAL_MOVE_MS + 'ms cubic-bezier(.16,1,.3,1)';
      node.style.transform = transformForPose(centered);

      /* 3. 停顿一拍，然后翻面 */
      shuffleTimer = window.setTimeout(function () {
        node.style.transition = '';
        node.classList.add('is-flipped');
        if (MO.audio) MO.audio.flip();

        /* 4. 翻面完成并停留，再进书页 */
        shuffleTimer = window.setTimeout(function () {
          beginOraclePage();
        }, REVEAL_FLIP_MS + REVEAL_EXIT_MS);
      }, REVEAL_MOVE_MS + REVEAL_HOLD_MS);
    }, 0);
  }

  function cancelTimers() {
    if (shuffleTimer) { window.clearTimeout(shuffleTimer); shuffleTimer = 0; }
    if (shuffleRaf) { window.cancelAnimationFrame(shuffleRaf); shuffleRaf = 0; }
    if (shuffleWatchdog) { window.clearTimeout(shuffleWatchdog); shuffleWatchdog = 0; }
    shuffling = false;
  }

  /* ---------- 今晚这一页：牌面 + 一句提示语 + 三个自问 ---------- */
  function saltOf() {
    var d = session.draw;
    if (!d) return 'midnight';
    return d.cardId + '|' + d.orientation + '|' + d.drawnAt;
  }

  function renderOraclePage(lineOverride) {
    var draw = session.draw;
    if (!draw) return;
    var card = MO.cards.byId(draw.cardId);
    if (!card) return;

    /* 复用抽牌时已经加载好的 <img>：书页立刻出图，不再二次请求 */
    var picked = session.pickedImg;
    if (picked && picked.complete && picked.naturalWidth) {
      el['book-card-art'].innerHTML = '';
      el['book-card-art'].appendChild(picked);
    } else {
      MO.art.mountCardImage(el['book-card-art'], card, {
        reversed: draw.orientation === 'reversed'
      });
    }
    setText(el['book-card-name'], card.nameCN);
    setText(el['book-card-orient'], draw.orientation === 'upright' ? '正位' : '逆位');

    var page = MO.oracle.pageOf(card, draw.orientation);
    setText(
      el['book-page-no'],
      session.pageIndex === 0
        ? 'NO. ' + core.pad2(page) + ' / ' + MO.oracle.PAGE_TOTAL
        : 'NO. ' + core.pad2(page) + ' · 夹页'
    );

    session.line = lineOverride || MO.oracle.lineFor(
      card, draw.orientation, session.pageIndex, saltOf()
    );
    setText(el['book-line'], session.line);
    if (session.usedLines.indexOf(session.line) === -1) {
      session.usedLines.push(session.line);
    }

    /* 牌面释义：这张牌在当前朝向上意味着什么 */
    var meaning = draw.orientation === 'upright' ? card.upright : card.reversed;
    var meaningText = (meaning && meaning.summary) || '';
    var meaningSymbol = card.symbol || '';
    var meaningTags = (meaning && meaning.keywords) || [];
    session.meaning = { text: meaningText, symbol: meaningSymbol, tags: meaningTags };
    setText(el['card-meaning-text'], meaningText);
    setText(el['card-meaning-symbol'], meaningSymbol ? '象征 · ' + meaningSymbol : '');

    var tagList = el['card-meaning-tags'];
    while (tagList.firstChild) tagList.removeChild(tagList.firstChild);
    for (var t = 0; t < meaningTags.length; t++) {
      var tag = document.createElement('li');
      tag.className = 'card-meaning-tag';
      setText(tag, meaningTags[t]);
      tagList.appendChild(tag);
    }
    show(el['card-meaning'], true);

    show(el['result-actions'], true);
    show(el['result-disclaimer'], true);
    show(el['btn-back-result'], true);
    el['btn-back-result'].disabled = false;
    setText(el['screen-result-title'], session.pageIndex === 0 ? '今晚这一页' : '夹页');
    setText(el['screen-result-step'], '03 / 03');
  }

  /* 翻页动效：重播 CSS 动画 */
  function playFlip() {
    var book = el['book'];
    if (!book) return;
    book.classList.remove('is-opening');
    void book.offsetWidth;
    book.classList.add('is-opening');
    if (MO.audio) MO.audio.reveal();
  }

  /* 再翻一页：同一张牌，换一个说法；不与本页已出现过的句子重复 */
  function reflip() {
    if (!session.draw) return;
    var card = MO.cards.byId(session.draw.cardId);
    if (!card) return;

    var salt = saltOf();
    var chosen = '';
    for (var attempt = 0; attempt < 60; attempt++) {
      var candidate = MO.oracle.lineFor(
        card, session.draw.orientation, session.pageIndex + 1 + attempt, salt + '#' + attempt
      );
      if (candidate && session.usedLines.indexOf(candidate) === -1) {
        chosen = candidate;
        break;
      }
    }

    session.pageIndex++;
    renderOraclePage(chosen || undefined);
    playFlip();
  }

  /* ---------- 打开这一页 ---------- */
  function beginOraclePage() {
    if (!session.draw) return;

    if (!machine.go(STATES.RESULT)) return;
    applyScreen(STATES.RESULT);
    renderOraclePage();
    playFlip();
    if (MO.ambience) MO.ambience.reveal();
  }

  /* ---------- 导航 ---------- */
  function goHome() {
    cancelTimers();
    resetSession();
    machine.go(STATES.HOME);
    applyScreen(STATES.HOME);
  }

  function goRitual() {
    cancelTimers();
    if (!machine.go(STATES.RITUAL)) return;
    renderRitual();
    applyScreen(STATES.RITUAL);
  }

  function goDraw() {
    if (machine.is(STATES.SHUFFLING)) return;
    cancelTimers();
    /* 保留本周主题，只清掉上一轮的抽牌结果 */
    renderToken++;
    resetDraw();
    machine.go(STATES.SHUFFLING);
    applyScreen(STATES.SHUFFLING);
    deckLocked = true;
    /* 降低动效时只保留按钮洗牌，不邀请拖拽 */
    setText(el['draw-stage'], core.motion.tier === 'reduced'
      ? '点下面的按钮，让牌组重新排列。'
      : '按住牌堆，左右拖动洗牌。');
    setText(el['btn-shuffle'], '洗牌');
    el['btn-shuffle'].removeAttribute('disabled');
    el['btn-back-draw'].removeAttribute('disabled');
    show(el['draw-hint'], false);
  }

  /* ---------- 事件绑定 ---------- */
  function bindEvents() {
    on(document, 'keydown', function (event) {
      if (event.key === 'Tab' || event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
        document.documentElement.classList.add('keyboard-nav');
      }
    });

    on(document, 'pointerdown', function () {
      document.documentElement.classList.remove('keyboard-nav');
    });

    on(el['btn-start'], 'click', function () { goRitual(); });

    on(el['btn-ritual-back'], 'click', function () { goHome(); });

    on(el['btn-ritual'], 'click', function () {
      if (machine.is(STATES.SHUFFLING)) return;
      goDraw();
    });

    on(el['btn-back-draw'], 'click', function () {
      cancelTimers();
      deckLocked = true;
      machine.go(STATES.RITUAL);
      applyScreen(STATES.RITUAL);
    });

    on(el['btn-shuffle'], 'click', function () {
      if (machine.is(STATES.CARD_REVEAL)) return;
      startShuffle();
    });

    /* 手势洗牌：按住牌堆左右拖动 */
    on(el.deck, 'pointerdown', onDeckPointerDown);
    on(el.deck, 'pointermove', onDeckPointerMove);
    on(el.deck, 'pointerup', onDeckPointerUp);
    on(el.deck, 'pointercancel', onDeckPointerCancel);

    /* 首次手势解锁音频上下文 */
    on(document, 'pointerdown', function () {
      if (MO.audio) MO.audio.unlock();
    }, true);

    /* 全局声音开关：配乐 + 音效 */
    on(el['btn-sound'], 'click', function () {
      if (!MO.audio) return;
      var enable = MO.audio.isMuted();   // 当前静音 → 这次开启
      MO.audio.setMuted(!enable);
      if (enable) {
        MO.audio.unlock();
        if (MO.ambience) MO.ambience.start();
      } else if (MO.ambience) {
        MO.ambience.stop();
      }
      el['btn-sound'].setAttribute('aria-pressed', enable ? 'true' : 'false');
      el['btn-sound'].setAttribute('aria-label', enable ? '关闭声音' : '开启声音');
      el['btn-sound'].classList.toggle('is-on', enable);
    });

    on(el['btn-back-result'], 'click', function () { goHome(); });
    on(el['btn-again'], 'click', function () {
      cancelTimers();
      resetSession();
      machine.go(STATES.RITUAL);
      applyScreen(STATES.RITUAL);
    });

    on(el['btn-reflip'], 'click', function () { reflip(); });

    on(el['btn-save'], 'click', function () {
      if (MO.share && typeof MO.share.open === 'function') MO.share.open(session);
    });

    /* 页面不可见时停止动画，避免后台继续跑帧 */
    on(document, 'visibilitychange', function () {
      if (document.hidden) {
        if (shuffleRaf) { window.cancelAnimationFrame(shuffleRaf); shuffleRaf = 0; }
      }
    });
  }

  function bindPointerDepth() {
    if (!window.matchMedia || core.motion.tier === 'reduced') return;
    var finePointer = false;
    try {
      finePointer = window.matchMedia('(pointer: fine)').matches;
    } catch (error) {
      finePointer = false;
    }
    if (!finePointer) return;

    on(document, 'mousemove', function (event) {
      var x = (event.clientX / window.innerWidth - 0.5) * 10;
      var y = (event.clientY / window.innerHeight - 0.5) * 8;
      document.documentElement.style.setProperty('--hero-shift-x', x.toFixed(2) + 'px');
      document.documentElement.style.setProperty('--hero-shift-y', y.toFixed(2) + 'px');
    });
  }

  /* ---------- 启动 ---------- */
  /* 字体预热：首屏先用回退字体再跳变会很明显，这里提前拉起来 */
  function preloadFonts() {
    if (!document.fonts || typeof document.fonts.load !== 'function') return;
    var families = ['16px "Noto Serif SC"', '16px "Cinzel"'];
    for (var i = 0; i < families.length; i++) {
      try {
        var job = document.fonts.load(families[i]);
        if (job && typeof job.catch === 'function') job.catch(function () { /* 忽略 */ });
      } catch (error) { /* 忽略 */ }
    }
  }

  function boot() {
    preloadFonts();
    cacheElements();
    buildAmbient();
    buildDrawAtmosphere();
    bindEvents();
    bindPointerDepth();
    applyScreen(STATES.HOME);
    machine.go(STATES.HOME);
    renderRitual();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, false);
  } else {
    boot();
  }

})(window, document);
