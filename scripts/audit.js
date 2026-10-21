/* Static delivery audit for the container build. Run with: node scripts/audit.js */
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');
var crypto = require('crypto');

var root = path.resolve(__dirname, '..');
var appDir = path.join(root, 'app');
var jsDir = path.join(appDir, 'assets', 'js');

var failures = [];
function check(condition, message) {
  if (!condition) failures.push(message);
}

var allowedExtensions = [
  '.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.gif',
  '.webp', '.svg', '.woff', '.woff2', '.json', '.mp3'
];
function walkFiles(dir, list) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
    var full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, list);
    else list.push(full);
  });
}
var appFiles = [];
walkFiles(appDir, appFiles);
appFiles.forEach(function (file) {
  check(
    allowedExtensions.indexOf(path.extname(file).toLowerCase()) !== -1,
    '包内存在容器不支持的文件类型：' + path.relative(appDir, file)
  );
});

var htmlFiles = fs.readdirSync(appDir).filter(function (name) {
  return /\.html$/i.test(name);
});
check(htmlFiles.length === 1, 'app 目录必须有且只有一个 HTML 入口');

var indexHtml = fs.readFileSync(path.join(appDir, 'index.html'), 'utf8');
var jsFiles = fs.readdirSync(jsDir).filter(function (name) {
  return /\.js$/i.test(name);
});
var js = jsFiles.map(function (name) {
  return fs.readFileSync(path.join(jsDir, name), 'utf8');
}).join('\n');
var shareJs = fs.readFileSync(path.join(jsDir, '07-share.js'), 'utf8');
var runtimeText = js + '\n' + shareJs + '\n' + indexHtml;

check(
  !fs.existsSync(path.join(jsDir, '05-xhs-ai-adapter.js')),
  '运行包不得包含平台 AI 适配层'
);
check(
  !/window\.xhs\.AI|generateText|deepseek-v4-flash|AI_NOT_ALLOWED|btn-retry-ai|source-badge/.test(runtimeText),
  '运行包不得包含平台 AI 调用或相关界面'
);

var inlineScripts = [];
var scriptPattern = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
var scriptMatch;
while ((scriptMatch = scriptPattern.exec(indexHtml))) {
  if (scriptMatch[1].trim()) inlineScripts.push(scriptMatch[0]);
}
check(inlineScripts.length === 0, '禁止内联脚本');
check(!/\son[a-z]+\s*=/i.test(indexHtml), '禁止 HTML 行内事件');

var banned = [
  'eval(',
  'new Function',
  'XMLHttpRequest',
  'WebSocket',
  'fetch(',
  'WebAssembly',
  'new Worker',
  '<iframe'
];
banned.forEach(function (entry) {
  check(js.indexOf(entry) === -1 && indexHtml.indexOf(entry) === -1, '禁止能力：' + entry);
});

var remoteUrls = (js + '\n' + indexHtml).match(/https?:\/\/[^'"\s)]+/g) || [];
remoteUrls = remoteUrls.filter(function (url) {
  return [
    'http://www.w3.org/2000/svg',
    'https://github.com/mixvlad/TarotCards',
    'https://github.com/mixvlad/TarotCards/tree/main/tarot/rider-waite'
  ].indexOf(url) === -1;
});
check(remoteUrls.length === 0, '运行资源不得依赖远程 URL');

[
  'result-actions',
  'book-page',
  'book-page-no',
  'book-line',
  'card-meaning',
  'card-meaning-text',
  'card-meaning-symbol',
  'card-meaning-tags',
  'screen-ritual',
  'btn-ritual',
  'btn-reflip'
].forEach(function (id) {
  check(indexHtml.indexOf('id="' + id + '"') !== -1, '缺少关键节点：' + id);
});

check(
  indexHtml.indexOf('08-oracle-book.js') !== -1,
  '必须加载答案之书内容层'
);

/* 答案之书：页面不收集问题，问题也不进入分享物 */
check(indexHtml.indexOf('question-input') === -1, '页面不得收集用户问题');
check(indexHtml.indexOf('<textarea') === -1, '页面不得包含问题输入框');
check(indexHtml.indexOf('mood-row') === -1, '不应保留情绪选择控件');
check(indexHtml.indexOf('topic-row') === -1, '不应保留主题选择控件');
check(indexHtml.indexOf('ritual-topic') === -1, '不应替用户设定主题');
check(indexHtml.indexOf('book-note') === -1, '书页不应带主题题注');
check(shareJs.indexOf('page.line') !== -1, '分享卡必须以这一页的提示语为主体');
check(shareJs.indexOf('session.localReading') === -1, '分享卡不得依赖旧版解读结构');
check(
  shareJs.indexOf('current.page.line') !== -1,
  '发布正文必须使用这一页的提示语'
);
check(
  shareJs.indexOf('current.card.nameCN') !== -1,
  '发布正文必须使用牌名'
);
check(
  shareJs.indexOf('scrubQuestion') === -1,
  '分享内容不再需要问题清洗逻辑（页面不收集问题）'
);

var cardSandbox = { window: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(jsDir, '02-cards-data.js'), 'utf8'),
  cardSandbox
);
vm.runInNewContext(
  fs.readFileSync(path.join(jsDir, '02b-tarot-research.js'), 'utf8'),
  cardSandbox
);
var cards = cardSandbox.window.MO.cards.list;
check(cards.length === 22, '牌库必须包含 22 张大阿尔卡那');

var topicIds = cardSandbox.window.MO.cards.topics.map(function (topic) {
  return topic.id;
});
cards.forEach(function (card) {
  check(!!card.upright && !!card.reversed, card.id + ' 缺少正逆位牌义');
  topicIds.forEach(function (topicId) {
    check(!!card.topics[topicId], card.id + ' 缺少主题：' + topicId);
  });
  check(!!card.verdict.upright && !!card.verdict.reversed, card.id + ' 缺少正逆位倾向权重');
  check(!!card.image, card.id + ' 缺少本地牌面映射');
  check(!!card.tradition, card.id + ' 缺少传统主题');
  check(!!card.misread, card.id + ' 缺少易误读说明');
  check(!!card.boundary, card.id + ' 缺少解释边界');
});

/* ---------- 答案之书内容层：22 牌 × 正逆位 × 6 句 + 三个自问 ---------- */
var linesSandbox = { window: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(jsDir, '08b-oracle-lines.js'), 'utf8'),
  linesSandbox
);
var oracleLines = linesSandbox.window.MO.oracleLines;
check(!!oracleLines, '缺少提示语句库');

var oracleSandbox = { window: { MO: linesSandbox.window.MO } };
vm.runInNewContext(
  fs.readFileSync(path.join(jsDir, '08-oracle-book.js'), 'utf8'),
  oracleSandbox
);
var oracle = oracleSandbox.window.MO.oracle;
check(!!oracle, '缺少答案之书内容层');
if (oracle && oracleLines) {
  var stateIds = oracleLines.STATES.map(function (state) { return state.id; });
  check(stateIds.length === 6, '每张牌必须覆盖 6 种此刻状态');
  check(oracle.GENERAL.length >= 40, '通用句数量不足');
  check(oracle.PAGE_TOTAL === 44, '书页总数必须为 44 页（22 牌 × 正逆位）');

  var seenLines = {};
  cards.forEach(function (card) {
    ['upright', 'reversed'].forEach(function (orientation) {
      var entry = oracle.LINES[card.id] && oracle.LINES[card.id][orientation];
      check(!!entry, card.id + ' 缺少提示语：' + orientation);
      if (!entry) return;

      stateIds.forEach(function (key) {
        var line = entry[key];
        check(!!line, card.id + '/' + orientation + ' 缺少提示语：' + key);
        if (!line) return;
        check(!seenLines[line], '提示语重复：' + line);
        seenLines[line] = true;
        /* 口径：句子只说「人」不说「事」，不出现任何具体话题词，
           这样任何问题（关系 / 工作 / 去留 / 等待）都能套上同一句。 */
        check(
          !/工作|上班|老板|工资|升职|离职|分手|复合|男友|女友|暗恋|前任|股票|房子/.test(line),
          '提示语不应出现具体话题：' + line
        );
        check(line.length >= 10 && line.length <= 26, '提示语长度应控制在 10–26 字：' + line);
      });

    });
  });
}

/* 音效与手势：音效必须离线实时合成，包内不得出现音频资源 */
check(
  indexHtml.indexOf('05-audio.js') !== -1,
  '必须加载音效引擎'
);
check(indexHtml.indexOf('btn-sound') !== -1, '缺少声音开关');

var audioJs = fs.readFileSync(path.join(jsDir, '05-audio.js'), 'utf8');
check(
  /AudioContext|webkitAudioContext/.test(audioJs),
  '音效引擎必须使用 Web Audio 实时合成'
);

/* 包内允许音频（平台规范支持），但格式与体积受限 */
var audioAssets = appFiles.filter(function (file) {
  return /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file);
});
audioAssets.forEach(function (file) {
  var assetName = path.relative(appDir, file);
  check(/\.mp3$/i.test(file), '音频只支持 mp3（兼容面最广）：' + assetName);
  check(fs.statSync(file).size <= 1024 * 1024, '单个音频文件不得超过 1 MiB：' + assetName);
});
check(
  fs.existsSync(path.join(appDir, 'assets', 'audio', 'music.mp3')),
  '缺少配乐文件 assets/audio/music.mp3'
);
check(
  fs.existsSync(path.join(appDir, 'assets', 'js', '05b-ambience.js')),
  '缺少配乐播放器'
);

var viewsJs = fs.readFileSync(path.join(jsDir, '06-views.js'), 'utf8');
check(
  viewsJs.indexOf('pointerdown') !== -1 && viewsJs.indexOf('pointermove') !== -1,
  '洗牌必须支持指针手势'
);
check(viewsJs.indexOf('buildRifflePlan') !== -1, '洗牌必须使用 riffle 交错模型');
check(viewsJs.indexOf('MO.audio') !== -1, '抽牌与翻页必须接入音效引擎');

var manifestPath = path.join(appDir, 'assets', 'tarot', 'rider-waite', 'manifest.json');var manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
check(manifest.cards.length === 22, '牌面 manifest 必须包含 22 张牌');
manifest.cards.forEach(function (entry) {
  var imagePath = path.join(appDir, entry.image);
  check(fs.existsSync(imagePath), entry.id + ' 图片文件不存在');
  if (fs.existsSync(imagePath)) {
    var hash = crypto.createHash('sha256').update(fs.readFileSync(imagePath)).digest('hex');
    check(hash === entry.sha256, entry.id + ' 图片校验失败');
  }
});
check(
  fs.existsSync(path.join(root, 'ASSET_CREDITS.md')),
  '缺少 ASSET_CREDITS.md'
);
check(
  fs.existsSync(path.join(root, 'TAROT_RESEARCH_NOTES.md')),
  '缺少 TAROT_RESEARCH_NOTES.md'
);

var artSandbox = { window: {}, document: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(jsDir, '03-cards-art.js'), 'utf8'),
  artSandbox
);
var emblemCount = Object.keys(artSandbox.window.MO.art.EMBLEMS).length;
check(emblemCount === 22, '牌面徽记必须覆盖 22 张牌');

var canvasDataSandbox = { window: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(jsDir, '03b-card-canvas-data.js'), 'utf8'),
  canvasDataSandbox
);
var canvasData = canvasDataSandbox.window.MO.cardCanvasData || {};
check(Object.keys(canvasData).length === 22, '分享卡专用牌面数据必须覆盖 22 张牌');
Object.keys(canvasData).forEach(function (id) {
  check(
    /^data:image\/jpeg;base64,/.test(canvasData[id]),
    id + ' 分享卡专用牌面不是 JPEG data URI'
  );
});

var css = fs.readFileSync(path.join(appDir, 'assets', 'style.css'), 'utf8');
check(css.indexOf('padding: 26px 22px 46px;') !== -1, 'screen-body 缺少 Chrome 61 padding 回退');
check(css.indexOf('padding: 54px 28px 38px;') !== -1, 'home-inner 缺少 Chrome 61 padding 回退');
check(css.indexOf('padding: 18px 18px 20px;') !== -1, 'sheet-body 缺少 Chrome 61 padding 回退');
check(css.indexOf('height: 52px;') !== -1, 'screen-head 缺少 Chrome 61 高度回退');

if (failures.length) {
  console.error('AUDIT FAILED');
  failures.forEach(function (message) {
    console.error('- ' + message);
  });
  process.exit(1);
}

console.log('AUDIT PASS');
console.log('HTML entries: ' + htmlFiles.length);
console.log('JS files: ' + jsFiles.length);
console.log('Cards: ' + cards.length);
console.log('Emblems: ' + emblemCount);
console.log('Topics per card: ' + topicIds.length);
console.log('RWS image files: ' + manifest.cards.length);
console.log('Embedded canvas cards: ' + Object.keys(canvasData).length);
