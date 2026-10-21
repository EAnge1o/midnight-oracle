/* =========================================================
   05-audio.js — 离线合成音效引擎
   约束：不引入任何音频资源文件，全部用 Web Audio 实时合成；
        不支持或被拒绝时静默降级，绝不影响主流程。
   参考思路：白噪声缓冲 + 带通滤波模拟洗牌沙沙；
            短噪声 + 低频正弦模拟牌落桌；
            多个衰减正弦叠加强调神秘提示音。
   ========================================================= */
(function (window) {
  'use strict';

  var MO = window.MO || (window.MO = {});

  var ctx = null;
  var master = null;
  var noiseBuffer = null;

  var shuffleSource = null;
  var shuffleGain = null;
  var shuffleFilter = null;

  var muted = true;          // 默认静音：由全局声音按钮显式开启
  var unlocked = false;
  var stats = { nodes: 0 };

  function countNode() {
    stats.nodes++;
  }

  function isSupported() {
    return typeof window.AudioContext !== 'undefined' ||
           typeof window.webkitAudioContext !== 'undefined';
  }

  function ensureContext() {
    if (ctx) return ctx;
    if (!isSupported()) return null;
    var Ctor = window.AudioContext || window.webkitAudioContext;
    try {
      ctx = new Ctor();
      countNode();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.85;
      master.connect(ctx.destination);
    } catch (error) {
      ctx = null;
      master = null;
    }
    return ctx;
  }

  /* 1.2 秒白噪声缓冲：可循环复用，避免每次播放都重新生成 */
  function getNoiseBuffer() {
    if (noiseBuffer) return noiseBuffer;
    var c = ensureContext();
    if (!c) return null;
    try {
      var length = Math.floor(c.sampleRate * 1.2);
      noiseBuffer = c.createBuffer(1, length, c.sampleRate);
      var data = noiseBuffer.getChannelData(0);
      var seed = 20261021;
      for (var i = 0; i < length; i++) {
        seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff;
        data[i] = (seed / 0x3fffffff) - 1;
      }
    } catch (error) {
      noiseBuffer = null;
    }
    return noiseBuffer;
  }

  function now() {
    return ctx ? ctx.currentTime : 0;
  }

  function canPlay() {
    if (!unlocked || muted) return false;
    return !!ensureContext();
  }

  /* 首次用户手势时解锁音频上下文 */
  function unlock() {
    if (unlocked) return;
    var c = ensureContext();
    if (!c) return;
    unlocked = true;
    try {
      if (typeof c.resume === 'function') c.resume();
    } catch (error) { /* 忽略：部分环境需要真实手势后再试 */ }
  }

  /* ---------- 洗牌沙沙声：循环噪声 + 带通滤波 ---------- */
  function shuffleStart() {
    if (shuffleSource) return;
    if (!canPlay()) return;
    var c = ensureContext();
    var buffer = getNoiseBuffer();
    if (!c || !buffer) return;
    try {
      shuffleSource = c.createBufferSource();
      countNode();
      shuffleSource.buffer = buffer;
      shuffleSource.loop = true;

      shuffleFilter = c.createBiquadFilter();
      countNode();
      shuffleFilter.type = 'bandpass';
      shuffleFilter.frequency.value = 1100;
      shuffleFilter.Q.value = 0.75;

      shuffleGain = c.createGain();
      countNode();
      shuffleGain.gain.value = 0;

      shuffleSource.connect(shuffleFilter);
      shuffleFilter.connect(shuffleGain);
      shuffleGain.connect(master);
      shuffleSource.start();

      var t = now();
      shuffleGain.gain.setValueAtTime(0, t);
      shuffleGain.gain.linearRampToValueAtTime(0.16, t + 0.09);
    } catch (error) {
      shuffleStop();
    }
  }

  /* 拖动速度决定沙沙声的响度与音高：越快越急促 */
  function shuffleLevel(intensity) {
    if (!shuffleGain || !shuffleFilter) return;
    var value = Math.max(0, Math.min(1, Number(intensity) || 0));
    try {
      var t = now();
      shuffleGain.gain.cancelScheduledValues(t);
      shuffleGain.gain.setValueAtTime(shuffleGain.gain.value, t);
      shuffleGain.gain.linearRampToValueAtTime(0.03 + value * 0.2, t + 0.06);
      shuffleFilter.frequency.cancelScheduledValues(t);
      shuffleFilter.frequency.setValueAtTime(shuffleFilter.frequency.value, t);
      shuffleFilter.frequency.linearRampToValueAtTime(760 + value * 1750, t + 0.06);
    } catch (error) { /* 忽略参数平滑失败 */ }
  }

  function shuffleStop() {
    if (!shuffleSource) return;
    try {
      var t = now();
      shuffleGain.gain.cancelScheduledValues(t);
      shuffleGain.gain.setValueAtTime(shuffleGain.gain.value, t);
      shuffleGain.gain.linearRampToValueAtTime(0, t + 0.12);
      var source = shuffleSource;
      shuffleSource = null;
      shuffleGain = null;
      shuffleFilter = null;
      if (source.stop) source.stop(t + 0.16);
    } catch (error) {
      shuffleSource = null;
      shuffleGain = null;
      shuffleFilter = null;
    }
  }

  /* ---------- 牌落桌：短噪声 + 低频闷响 ---------- */
  function deal(strength) {
    if (!canPlay()) return;
    var c = ensureContext();
    var buffer = getNoiseBuffer();
    if (!c || !buffer) return;
    var power = Math.max(0.2, Math.min(1, Number(strength) || 0.6));
    try {
      var t = now();

      var noise = c.createBufferSource();
      countNode();
      noise.buffer = buffer;
      var high = c.createBiquadFilter();
      countNode();
      high.type = 'highpass';
      high.frequency.value = 1100;
      var ng = c.createGain();
      countNode();
      ng.gain.setValueAtTime(0.16 * power, t);
      ng.gain.exponentialRampToValueAtTime(0.0008, t + 0.07);
      noise.connect(high);
      high.connect(ng);
      ng.connect(master);
      noise.start(t);
      noise.stop(t + 0.1);

      var body = c.createOscillator();
      countNode();
      body.type = 'sine';
      body.frequency.setValueAtTime(168, t);
      body.frequency.exponentialRampToValueAtTime(96, t + 0.09);
      var bg = c.createGain();
      countNode();
      bg.gain.setValueAtTime(0.13 * power, t);
      bg.gain.exponentialRampToValueAtTime(0.0008, t + 0.11);
      body.connect(bg);
      bg.connect(master);
      body.start(t);
      body.stop(t + 0.14);
    } catch (error) { /* 静默忽略 */ }
  }

  /* ---------- 翻牌：短促摩擦声 ---------- */
  function flip() {
    if (!canPlay()) return;
    var c = ensureContext();
    var buffer = getNoiseBuffer();
    if (!c || !buffer) return;
    try {
      var t = now();
      var noise = c.createBufferSource();
      countNode();
      noise.buffer = buffer;
      var band = c.createBiquadFilter();
      countNode();
      band.type = 'bandpass';
      band.frequency.setValueAtTime(2600, t);
      band.frequency.exponentialRampToValueAtTime(900, t + 0.16);
      band.Q.value = 1.4;
      var g = c.createGain();
      countNode();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.13, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0006, t + 0.2);
      noise.connect(band);
      band.connect(g);
      g.connect(master);
      noise.start(t);
      noise.stop(t + 0.24);
    } catch (error) { /* 静默忽略 */ }
  }

  /* ---------- 揭示：三个衰减正弦叠加的神秘铃音 ---------- */
  function reveal() {
    if (!canPlay()) return;
    var c = ensureContext();
    if (!c) return;
    try {
      var t = now();
      var partials = [
        { freq: 523.25, delay: 0, gain: 0.085 },
        { freq: 784.0, delay: 0.07, gain: 0.06 },
        { freq: 1046.5, delay: 0.15, gain: 0.042 }
      ];
      for (var i = 0; i < partials.length; i++) {
        var p = partials[i];
        var osc = c.createOscillator();
        countNode();
        osc.type = 'sine';
        osc.frequency.value = p.freq;
        var g = c.createGain();
        countNode();
        g.gain.setValueAtTime(0.0001, t + p.delay);
        g.gain.exponentialRampToValueAtTime(p.gain, t + p.delay + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0004, t + p.delay + 1.5);
        osc.connect(g);
        g.connect(master);
        osc.start(t + p.delay);
        osc.stop(t + p.delay + 1.6);
      }
    } catch (error) { /* 静默忽略 */ }
  }

  /* ---------- 静音开关 ---------- */
  function setMuted(value) {
    muted = !!value;
    if (master && ctx) {
      try {
        var t = now();
        master.gain.cancelScheduledValues(t);
        master.gain.setValueAtTime(master.gain.value, t);
        master.gain.linearRampToValueAtTime(muted ? 0 : 0.85, t + 0.08);
      } catch (error) { /* 忽略 */ }
    }
    return muted;
  }

  function isMuted() {
    return muted;
  }

  function toggleMuted() {
    return setMuted(!muted);
  }

  /* 状态探针：便于验收时确认音效链路真的被建立 */
  function debug() {
    return {
      supported: isSupported(),
      unlocked: unlocked,
      muted: muted,
      hasContext: !!ctx,
      state: ctx && ctx.state ? ctx.state : 'none',
      nodes: stats.nodes
    };
  }

  /* 揭示牌面时的一记清亮钟音 */
  function bell() {
    if (!canPlay()) return;
    var c = ensureContext();
    if (!c) return;
    var t = c.currentTime;
    var partials = [[1, 0.5, 2.6], [2.76, 0.16, 1.8], [5.4, 0.06, 1.2]];
    for (var i = 0; i < partials.length; i++) {
      var osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 880 * partials[i][0];
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(partials[i][1] * 0.16, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + partials[i][2]);
      osc.connect(g);
      g.connect(master);
      osc.start(t);
      osc.stop(t + partials[i][2] + 0.1);
    }
  }

  MO.audio = {
    isSupported: isSupported,
    ensureContext: ensureContext,
    unlock: unlock,
    shuffleStart: shuffleStart,
    shuffleLevel: shuffleLevel,
    shuffleStop: shuffleStop,
    deal: deal,
    flip: flip,
    bell: bell,
    reveal: reveal,
    setMuted: setMuted,
    isMuted: isMuted,
    toggleMuted: toggleMuted,
    debug: debug
  };

})(window);
