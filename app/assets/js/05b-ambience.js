/* =========================================================
   05b-ambience.js — 配乐播放器（包内音频文件，循环播放）
   音频：assets/audio/music.mp3
        源文件由用户提供，截取前一分钟后重编码为 64 kbps 立体声，
        首尾已做淡入淡出，循环点没有爆音。
   规则：只在用户点开声音后才加载与播放，不自动出声。
   ========================================================= */
(function (window, document) {
  'use strict';

  var MO = window.MO || (window.MO = {});

  var SRC = 'assets/audio/music.mp3';
  var VOLUME = 0.35;

  var el = null;
  var enabled = false;
  var failHandler = null;

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
      enabled = false;
      if (failHandler) failHandler();
    });
    return el;
  }

  function start() {
    if (enabled) return;
    var audio = ensureElement();
    enabled = true;
    try {
      var promise = audio.play();
      if (promise && typeof promise.catch === 'function') {
        promise.catch(function () { enabled = false; });
      }
    } catch (error) {
      enabled = false;
    }
  }

  function stop() {
    if (!enabled) return;
    enabled = false;
    if (!el) return;
    try {
      el.pause();
      el.currentTime = 0;
    } catch (error) { /* 忽略 */ }
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

  MO.ambience = {
    start: start,
    stop: stop,
    reveal: reveal,
    isEnabled: isEnabled,
    element: element,
    setFailHandler: setFailHandler
  };

})(window, document);
