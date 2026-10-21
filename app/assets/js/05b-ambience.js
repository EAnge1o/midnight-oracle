/* =========================================================
   05b-ambience.js — 配乐播放器（包内音频文件，循环播放）
   音频：assets/audio/music.mp3
        源文件由用户提供，截取前一分钟后重编码为 64 kbps 立体声，
        首尾已做淡入淡出，循环点没有爆音。
   规则：默认自动开启。
        浏览器自动播放策略会拦下无手势的 play()，
        此时挂一个一次性手势监听，用户第一次点击时自动开始；
        用户主动关掉后不再自动开启。
   ========================================================= */
(function (window, document) {
  'use strict';

  var MO = window.MO || (window.MO = {});

  var SRC = 'assets/audio/music.mp3';
  var VOLUME = 0.35;

  var el = null;
  var enabled = false;
  var userMuted = false;
  var failHandler = null;
  var stateHandler = null;
  var gestureBound = false;

  function ensureElement() {
    if (el) return el;
    el = document.createElement('audio');
    el.setAttribute('loop', '');
    el.setAttribute('playsinline', '');
    el.setAttribute('preload', 'none');
    el.src = SRC;
    el.volume = VOLUME;
    /* 音频取不到时（例如没把配乐放进包里），通知调用方把界面状态改回去 */
    el.addEventListener('error', function () {
      setEnabled(false);
      if (failHandler) failHandler();
    });
    return el;
  }

  function setEnabled(on) {
    var next = !!on;
    if (next === enabled) return;
    enabled = next;
    if (stateHandler) stateHandler(enabled);
  }

  /* 被自动播放策略拦下时，等用户第一次交互再开始 */
  function bindFirstGesture() {
    if (gestureBound) return;
    gestureBound = true;
    var handler = function () {
      window.removeEventListener('pointerdown', handler, true);
      window.removeEventListener('touchstart', handler, true);
      window.removeEventListener('keydown', handler, true);
      gestureBound = false;
      if (userMuted) return;
      start();
    };
    window.addEventListener('pointerdown', handler, true);
    window.addEventListener('touchstart', handler, true);
    window.addEventListener('keydown', handler, true);
  }

  function start() {
    if (enabled) return;
    var audio = ensureElement();
    setEnabled(true);
    try {
      var promise = audio.play();
      if (promise && typeof promise.catch === 'function') {
        promise.catch(function () {
          /* 自动播放被拦：等第一次交互 */
          setEnabled(false);
          bindFirstGesture();
        });
      }
    } catch (error) {
      setEnabled(false);
      bindFirstGesture();
    }
  }

  function stop() {
    setEnabled(false);
    if (!el) return;
    try {
      el.pause();
      el.currentTime = 0;
    } catch (error) { /* 忽略 */ }
  }

  /* 启动即尝试播放 */
  function autoStart() {
    if (userMuted) return;
    start();
  }

  /* 用户主动开关：关掉之后不再自动开启 */
  function setUserMuted(muted) {
    userMuted = !!muted;
    if (userMuted) stop();
  }

  function isUserMuted() {
    return userMuted;
  }

  /* 揭示牌面时补一记钟音（合成，与音乐文件并行） */
  function reveal() {
    if (!enabled) return;
    if (MO.audio && typeof MO.audio.bell === 'function') MO.audio.bell();
  }

  function isEnabled() {
    return enabled;
  }

  /* 验收用：暴露音频元素，便于确认确实在播放 */
  function element() {
    return el;
  }

  /* 配乐加载失败时的回调 */
  function setFailHandler(fn) {
    failHandler = fn;
  }

  /* 播放状态变化时的回调（用于同步按钮） */
  function setStateHandler(fn) {
    stateHandler = fn;
  }

  MO.ambience = {
    start: start,
    stop: stop,
    autoStart: autoStart,
    setUserMuted: setUserMuted,
    isUserMuted: isUserMuted,
    reveal: reveal,
    isEnabled: isEnabled,
    element: element,
    setFailHandler: setFailHandler,
    setStateHandler: setStateHandler
  };

})(window, document);
