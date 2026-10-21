/* =========================================================
   01-core.js — 环境探测 / 工具 / 状态机 / 存储
   目标基线：ES2017（Chrome 61 / WebView 61）
   本文件不使用 ES2018+ 语法、动态代码执行、WASM、Worker、
   任何联网请求与被容器禁用的能力（详见 references/device-capabilities.md）。
   ========================================================= */
(function (window, document) {
  'use strict';

  var MO = window.MO || (window.MO = {});

  /* ---------- DOM 工具（全部走纯文本，不拼接用户内容） ---------- */
  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    var list = (root || document).querySelectorAll(sel);
    return Array.prototype.slice.call(list);
  }

  function setText(node, value) {
    if (node) node.textContent = value == null ? '' : String(value);
  }

  function show(node, visible) {
    if (!node) return;
    if (visible) node.removeAttribute('hidden');
    else node.setAttribute('hidden', '');
  }

  function on(node, type, handler, options) {
    if (node) node.addEventListener(type, handler, options || false);
  }

  /* ---------- 基础工具 ---------- */
  function clampNumber(value, min, max) {
    var n = Number(value);
    if (!isFinite(n)) return min;
    if (n < min) return min;
    if (n > max) return max;
    return n;
  }

  function trim(str) {
    return String(str == null ? '' : str).replace(/^[\s　]+|[\s　]+$/g, '');
  }

  function randomInt(maxExclusive) {
    return Math.floor(Math.random() * maxExclusive);
  }

  function pick(list) {
    return list[randomInt(list.length)];
  }

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  /* 日期：拆分为年月日构造，避免非标准字符串解析 */
  function formatDate(d) {
    var date = d || new Date();
    return date.getFullYear() + '.' + pad2(date.getMonth() + 1) + '.' + pad2(date.getDate());
  }

  function formatDateCN(d) {
    var date = d || new Date();
    return date.getFullYear() + ' 年 ' + (date.getMonth() + 1) + ' 月 ' + date.getDate() + ' 日';
  }

  /* =========== 环境探测 =========== */
  function readXhs() {
    return window.xhs || null;
  }

  var env = {
    /* 容器注入端能力的最小判定 */
    get hasXhs() { return !!readXhs(); },
    get hasMiniTool() {
      var xhs = readXhs();
      return !!(xhs && xhs.miniTool && typeof xhs.miniTool === 'object');
    }
  };

  /* 客户端版本：buildVersion 末 3 位是编译序号，比较时忽略 */
  function readBuildVersion(launchOptions) {
    var envInfo = launchOptions && launchOptions.miniToolEnv;
    return Number(envInfo && envInfo.buildVersion) || 0;
  }

  function getClientVersion(buildVersion) {
    return Math.floor((Number(buildVersion) || 0) / 1000);
  }

  var STORAGE_MIN_CLIENT_VERSION = 9460;   // Storage JS API：客户端 9.46+
  var COMMENT_MIN_CLIENT_VERSION = 9490;  // 评论区：客户端 9.49+

  var cachedBuildVersion = 0;
  var buildVersionResolved = false;

  function getBuildVersion() {
    if (buildVersionResolved) return Promise.resolve(cachedBuildVersion);
    var xhs = readXhs();
    var sync = readBuildVersion(xhs && xhs.launchOptions);
    if (sync) {
      cachedBuildVersion = sync;
      buildVersionResolved = true;
      return Promise.resolve(cachedBuildVersion);
    }
    var miniTool = xhs && xhs.miniTool;
    if (!miniTool || typeof miniTool.getLaunchOptions !== 'function') {
      buildVersionResolved = true;
      return Promise.resolve(0);
    }
    return miniTool.getLaunchOptions().then(function (options) {
      cachedBuildVersion = readBuildVersion(options);
      buildVersionResolved = true;
      return cachedBuildVersion;
    }, function () {
      buildVersionResolved = true;
      return 0;
    });
  }

  function isClientAtLeast(minimum) {
    if (cachedBuildVersion) return getClientVersion(cachedBuildVersion) >= minimum;
    return false;
  }

  /* =========== 本地存储（低版本降级，失败必须被调用方感知） =========== */
  function setLocalData(key, data) {
    var serialized;
    try {
      serialized = JSON.stringify(data);
    } catch (error) {
      return Promise.resolve(false);
    }
    if (typeof serialized !== 'string') return Promise.resolve(false);

    return getBuildVersion().then(function (buildVersion) {
      var miniTool = readXhs() && readXhs().miniTool;
      if (
        buildVersion &&
        getClientVersion(buildVersion) >= STORAGE_MIN_CLIENT_VERSION &&
        miniTool &&
        typeof miniTool.setStorage === 'function'
      ) {
        try {
          return miniTool.setStorage({ key: key, data: serialized }).then(function () {
            return true;
          }, function () {
            return false;
          });
        } catch (error) {
          return false;
        }
      }
      try {
        window.localStorage.setItem(key, serialized);
        return true;
      } catch (error) {
        return false;
      }
    });
  }

  function getLocalData(key) {
    return getBuildVersion().then(function (buildVersion) {
      var miniTool = readXhs() && readXhs().miniTool;
      if (
        buildVersion &&
        getClientVersion(buildVersion) >= STORAGE_MIN_CLIENT_VERSION &&
        miniTool &&
        typeof miniTool.getStorage === 'function'
      ) {
        try {
          return miniTool.getStorage({ key: key }).then(function (res) {
            var raw = res && res.data;
            if (raw == null) return null;
            try { return JSON.parse(raw); } catch (e) { return null; }
          }, function () {
            return null;
          });
        } catch (error) {
          return null;
        }
      }
      try {
        var raw = window.localStorage.getItem(key);
        if (raw == null) return null;
        return JSON.parse(raw);
      } catch (error) {
        return null;
      }
    });
  }

  /* =========== 状态机 ===========
     home → ritual → shuffling → card_reveal → result
  */
  var STATES = {
    HOME: 'home',
    RITUAL: 'ritual',
    SHUFFLING: 'shuffling',
    CARD_REVEAL: 'card_reveal',
    RESULT: 'result'
  };

  var ALLOWED = {};
  ALLOWED[STATES.HOME] = [STATES.RITUAL];
  ALLOWED[STATES.RITUAL] = [STATES.HOME, STATES.SHUFFLING];
  ALLOWED[STATES.SHUFFLING] = [STATES.RITUAL, STATES.CARD_REVEAL];
  ALLOWED[STATES.CARD_REVEAL] = [STATES.RESULT];
  ALLOWED[STATES.RESULT] = [STATES.HOME, STATES.RITUAL];

  var machine = {
    state: STATES.HOME,
    context: {},

    is: function (name) { return this.state === name; },

    can: function (next) {
      if (next === this.state) return true;
      var list = ALLOWED[this.state] || [];
      return list.indexOf(next) !== -1;
    },

    go: function (next, context) {
      if (!this.can(next)) return false;
      this.state = next;
      this.context = context || {};
      document.documentElement.setAttribute('data-state', next);
      return true;
    },

    isBusy: function () {
      return this.state === STATES.SHUFFLING ||
             this.state === STATES.CARD_REVEAL;
    }
  };

  /* =========== 动效档位：按实测帧耗时决定，不猜机型 =========== */
  var motion = {
    tier: 'full',       // 'full' | 'reduced'
    samples: [],
    maxSamples: 24,

    /* 采样一次动画帧间隔；持续偏慢即降档 */
    observe: function (deltaMs) {
      if (this.tier === 'reduced') return;
      this.samples.push(deltaMs);
      if (this.samples.length > this.maxSamples) this.samples.shift();
      if (this.samples.length < 12) return;
      var sum = 0;
      for (var i = 0; i < this.samples.length; i++) sum += this.samples[i];
      var avg = sum / this.samples.length;
      if (avg > 40) {
        this.tier = 'reduced';
        document.documentElement.classList.add('motion-reduced');
      }
    },

    reset: function () {
      this.samples = [];
    }
  };

  /* =========== 能力检测：Flex gap 必须验证布局行为 =========== */
  function supportsFlexGap() {
    var flex = document.createElement('div');
    flex.style.position = 'absolute';
    flex.style.visibility = 'hidden';
    flex.style.display = 'flex';
    flex.style.flexDirection = 'column';
    flex.style.rowGap = '1px';
    flex.appendChild(document.createElement('div'));
    flex.appendChild(document.createElement('div'));
    document.body.appendChild(flex);
    var supported = flex.scrollHeight === 1;
    flex.parentNode.removeChild(flex);
    return supported;
  }

  function supportsBackdropFilter() {
    return typeof window.CSS !== 'undefined' &&
           typeof window.CSS.supports === 'function' &&
           (window.CSS.supports('-webkit-backdrop-filter', 'blur(10px)') ||
            window.CSS.supports('backdrop-filter', 'blur(10px)'));
  }

  /* =========== 视口高度：100vh 基线 + JS 维护变量 =========== */
  function syncAppHeight() {
    var vv = window.visualViewport;
    var height = vv && vv.height ? vv.height : window.innerHeight;
    if (!height) return;
    document.documentElement.style.setProperty('--app-height', height + 'px');
  }

  /* =========== 工具集合导出 =========== */
  MO.core = {
    qs: qs,
    qsa: qsa,
    setText: setText,
    show: show,
    on: on,
    clampNumber: clampNumber,
    trim: trim,
    randomInt: randomInt,
    pick: pick,
    pad2: pad2,
    formatDate: formatDate,
    formatDateCN: formatDateCN,
    env: env,
    getBuildVersion: getBuildVersion,
    getClientVersion: getClientVersion,
    isClientAtLeast: isClientAtLeast,
    setLocalData: setLocalData,
    getLocalData: getLocalData,
    STATES: STATES,
    machine: machine,
    motion: motion,
    supportsFlexGap: supportsFlexGap,
    supportsBackdropFilter: supportsBackdropFilter,
    syncAppHeight: syncAppHeight,
    STORAGE_MIN_CLIENT_VERSION: STORAGE_MIN_CLIENT_VERSION,
    COMMENT_MIN_CLIENT_VERSION: COMMENT_MIN_CLIENT_VERSION
  };

  /* =========== 启动期的全局装配 =========== */
  function boot() {
    if (supportsFlexGap()) {
      document.documentElement.classList.add('supports-flex-gap');
    }
    if (window.matchMedia) {
      try {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          motion.tier = 'reduced';
          document.documentElement.classList.add('motion-reduced');
        }
      } catch (error) { /* 忽略：不支持时保持默认动效 */ }
    }
    syncAppHeight();

    window.addEventListener('resize', syncAppHeight, false);
    window.addEventListener('orientationchange', syncAppHeight, false);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncAppHeight, false);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, false);
  } else {
    boot();
  }

})(window, document);
