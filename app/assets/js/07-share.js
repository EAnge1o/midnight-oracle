/* =========================================================
   07-share.js — 今晚这一页分享卡（Canvas 2D）
   竖版 3:4，1080x1440。使用与页面牌面完全相同的徽记原语，
   保证分享图与页面中已确定的结果一致。
   用户原始问题默认不出现在分享图上。
   保存 / 发笔记走容器 JS API，不使用 a[download]。
   ========================================================= */
(function (window, document) {
  'use strict';

  var MO = window.MO;
  var core = MO.core;
  var qs = core.qs;
  var setText = core.setText;
  var show = core.show;
  var on = core.on;

  var W = 1080;
  var H = 1440;

  var INK = '#0A0D1B';
  var NIGHT = '#151C35';
  var PANEL = '#202744';
  var GOLD = '#C7A96B';
  var IVORY = '#EAE2D0';

  var SANS = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", Helvetica, Arial, sans-serif';
  var SERIF = '"Noto Serif SC", "Songti SC", "STSong", "Source Han Serif SC", "Noto Serif CJK SC", "SimSun", Georgia, serif';
  var LATIN = '"Cinzel", "Noto Serif SC", Georgia, serif';

  var current = null;   // { dataUrl, reading, card, draw }
  var lastFocused = null;
  var shareLoadToken = 0;

  /* ---------- 文本工具 ---------- */
  function fontOf(weight, size, family) {
    return (weight || 400) + ' ' + size + 'px ' + (family || SANS);
  }

  /* 逐字换行：CJK 可任意断行，兼顾西文单词，避免标点出现在行首 */
  var NO_LINE_START = '，。、；：？！）」』】》%·…';

  function wrapText(ctx, text, maxWidth, maxLines) {
    var str = String(text == null ? '' : text);
    var lines = [];
    var line = '';

    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(i);
      if (ch === '\n') {
        lines.push(line);
        line = '';
        continue;
      }
      var test = line + ch;
      if (ctx.measureText(test).width > maxWidth && line.length > 0) {
        /* 避免标点被推到下一行行首 */
        if (NO_LINE_START.indexOf(ch) !== -1) {
          lines.push(test);
          line = '';
          continue;
        }
        /* 西文单词尽量不从中间断开 */
        var broken = /[A-Za-z0-9]$/.test(line) && /[A-Za-z0-9]/.test(ch);
        if (broken) {
          var cut = line.length - 1;
          while (cut > 1 && /[A-Za-z0-9]/.test(line.charAt(cut - 1))) cut--;
          if (cut > 1) {
            lines.push(line.slice(0, cut));
            line = line.slice(cut) + ch;
            continue;
          }
        }
        lines.push(line);
        line = ch;
        continue;
      }
      line = test;
    }
    if (line.length) lines.push(line);

    if (maxLines && lines.length > maxLines) {
      var kept = lines.slice(0, maxLines);
      var last = kept[maxLines - 1];
      while (last.length > 1 && ctx.measureText(last + '…').width > maxWidth) {
        last = last.slice(0, -1);
      }
      kept[maxLines - 1] = last + '…';
      return kept;
    }
    return lines;
  }

  function balancedHeadlineLines(ctx, text, maxWidth, maxLines) {
    var lines = wrapText(ctx, text, maxWidth, maxLines);
    if (lines.length !== 2 || lines[1].length >= 6) return lines;

    var combined = lines[0] + lines[1];
    var middle = Math.floor(combined.length / 2);
    for (var offset = 0; offset < middle; offset++) {
      var cuts = [middle - offset, middle + offset];
      for (var i = 0; i < cuts.length; i++) {
        var cut = cuts[i];
        if (cut <= 0 || cut >= combined.length) continue;
        var first = combined.slice(0, cut);
        var second = combined.slice(cut);
        if (ctx.measureText(first).width <= maxWidth && ctx.measureText(second).width <= maxWidth) {
          return [first, second];
        }
      }
    }
    return lines;
  }

  function drawLines(ctx, lines, x, y, lineHeight, align) {
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    for (var i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x, y + i * lineHeight);
    }
    return y + lines.length * lineHeight;
  }

  function letterSpacedText(ctx, text, x, y, spacing, align) {
    var chars = String(text).split('');
    var total = 0;
    var i;
    for (i = 0; i < chars.length; i++) total += ctx.measureText(chars[i]).width + spacing;
    total -= spacing;

    var cursor = x;
    if (align === 'center') cursor = x - total / 2;
    else if (align === 'right') cursor = x - total;

    var prevAlign = ctx.textAlign;
    ctx.textAlign = 'left';
    for (i = 0; i < chars.length; i++) {
      ctx.fillText(chars[i], cursor, y);
      cursor += ctx.measureText(chars[i]).width + spacing;
    }
    ctx.textAlign = prevAlign;
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    var radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function drawTarotPlate(ctx, card, image, orientation, x, y, width, angle) {
    var imageW = image.naturalWidth || 720;
    var imageH = image.naturalHeight || 1200;
    var height = Math.round(width * imageH / imageW);
    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate(angle || 0);
    ctx.translate(-width / 2, -height / 2);

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.58)';
    ctx.shadowBlur = 42;
    ctx.shadowOffsetY = 24;
    ctx.fillStyle = NIGHT;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    ctx.save();
    if (orientation === 'reversed') {
      ctx.translate(width, height);
      ctx.rotate(Math.PI);
    }
    ctx.drawImage(image, 0, 0, width, height);
    ctx.restore();

    ctx.strokeStyle = 'rgba(200,171,112,0.82)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-4, -4, width + 8, height + 8);
    ctx.restore();
  }

  /* ---------- 绘制分享卡 ---------- */
  function renderShareCanvas(page, card, orientation, cardImage) {
    var canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;

    var ctx;
    try {
      ctx = canvas.getContext('2d');
    } catch (error) {
      ctx = null;
    }
    if (!ctx) throw new Error('CANVAS_UNAVAILABLE');
    ctx.clearRect(0, 0, W, H);

    /* 深夜档案底色 */
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, W, H);

    var glow = ctx.createRadialGradient(W / 2, 120, 30, W / 2, 120, 820);
    glow.addColorStop(0, 'rgba(72,88,142,0.32)');
    glow.addColorStop(1, 'rgba(10,14,27,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, 1060);

    /* 档案框线 */
    ctx.strokeStyle = 'rgba(200,171,112,0.62)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(48, 48, W - 96, H - 96);
    ctx.strokeStyle = 'rgba(200,171,112,0.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(66, 66, W - 132, H - 132);

    /* 顶部印记 */
    ctx.save();
    ctx.translate(112, 112);
    ctx.strokeStyle = GOLD;
    ctx.fillStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0.34, Math.PI * 1.66, false);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = GOLD;
    ctx.font = fontOf(400, 25, LATIN);
    letterSpacedText(ctx, 'MIDNIGHT ORACLE', 150, 106, 6, 'left');

    ctx.fillStyle = 'rgba(240,232,216,0.58)';
    ctx.font = fontOf(400, 16, SERIF);
    letterSpacedText(ctx, '午 夜 来 信 · 答 案 之 书', 150, 134, 2.4, 'left');

    ctx.fillStyle = 'rgba(200,171,112,0.72)';
    ctx.font = fontOf(400, 15, LATIN);
    ctx.textAlign = 'right';
    letterSpacedText(ctx, 'ORACLE PAGE / NO. ' + core.pad2(page.pageNo) + ' / ' + MO.oracle.PAGE_TOTAL, W - 104, 104, 2.4, 'right');
    ctx.fillStyle = 'rgba(240,232,216,0.46)';
    letterSpacedText(ctx, 'VOL. I  ·  00:00', W - 104, 132, 2.2, 'right');

    rule(ctx, W / 2, 174, W / 2 - 96, 'rgba(200,171,112,0.26)', 1);

    /* 左侧装订线 */
    ctx.strokeStyle = 'rgba(200,171,112,0.18)';
    ctx.beginPath();
    ctx.moveTo(96, 216);
    ctx.lineTo(96, 1246);
    ctx.stroke();

    ctx.fillStyle = 'rgba(200,171,112,0.72)';
    ctx.font = fontOf(400, 14, LATIN);
    letterSpacedText(ctx, 'A PAGE FOR THE NIGHT', 120, 236, 2.2, 'left');

    /* 牌面：居中，作为这一页的插图 */
    drawTarotPlate(ctx, card, cardImage, orientation, W / 2 - 125, 220, 250, -0.03);

    ctx.fillStyle = IVORY;
    ctx.font = fontOf(400, 30, SERIF);
    letterSpacedText(ctx, card.nameCN, W / 2, 690, 4, 'center');

    ctx.fillStyle = 'rgba(200,171,112,0.82)';
    ctx.font = fontOf(400, 16, LATIN);
    letterSpacedText(
      ctx,
      'ARCANA ' + core.pad2(card.num) + ' · ' + card.roman + ' · ' + (orientation === 'upright' ? '正位' : '逆位'),
      W / 2,
      724,
      2,
      'center'
    );

    rule(ctx, W / 2, 772, W / 2 - 96, 'rgba(200,171,112,0.24)', 1);

    /* 提示语：这一页的主体（按行数在版心内垂直居中） */
    ctx.fillStyle = IVORY;
    ctx.font = fontOf(400, 46, SERIF);
    var lineLines = balancedHeadlineLines(ctx, page.line, 760, 3);
    var lineTop = 772;
    var lineBottom = 1052;
    var lineBox = lineBottom - lineTop;
    var lineStart = lineTop + (lineBox - lineLines.length * 66) / 2 + 46;

    ctx.fillStyle = 'rgba(200,171,112,0.62)';
    ctx.font = fontOf(400, 96, SERIF);
    ctx.fillText('“', W / 2 - 320, lineStart + 8);

    ctx.fillStyle = IVORY;
    ctx.font = fontOf(400, 46, SERIF);
    drawLines(ctx, lineLines, W / 2, lineStart, 66, 'center');

    /* 关于这张牌 */
    rule(ctx, W / 2, 1064, W / 2 - 96, 'rgba(200,171,112,0.24)', 1);
    ctx.fillStyle = 'rgba(200,171,112,0.72)';
    ctx.font = fontOf(400, 14, LATIN);
    letterSpacedText(ctx, 'ABOUT THIS CARD', W / 2, 1102, 2.2, 'center');

    var meaning = page.meaning || {};
    ctx.fillStyle = 'rgba(240,232,216,0.86)';
    ctx.font = fontOf(400, 23, SERIF);
    var meaningLines = wrapText(ctx, meaning.text || '', 820, 3);
    drawLines(ctx, meaningLines, W / 2, 1148, 36, 'center');

    if (meaning.symbol) {
      ctx.fillStyle = 'rgba(240,232,216,0.46)';
      ctx.font = fontOf(400, 15, SERIF);
      letterSpacedText(ctx, '象征 · ' + meaning.symbol, W / 2, 1272, 0.6, 'center');
    }

    /* 页脚 */
    ctx.fillStyle = 'rgba(240,232,216,0.4)';
    ctx.font = fontOf(400, 14, SANS);
    letterSpacedText(ctx, core.formatDateCN() + ' · 塔罗占卜，仅供自我反思',
      W / 2, H - 98, 1.6, 'center');

    return canvas;
  }

  function rule(ctx, cx, y, halfWidth, color, width) {
    ctx.save();
    ctx.strokeStyle = color || 'rgba(199,169,107,0.42)';
    ctx.lineWidth = width || 1;
    ctx.beginPath();
    ctx.moveTo(cx - halfWidth, y);
    ctx.lineTo(cx + halfWidth, y);
    ctx.stroke();
    ctx.restore();
  }

  /* ---------- 打开分享面板 ---------- */
  /* 画布用字前先确保字体已加载（最多等 1.5 秒，超时就用回退字体） */
  function ensureFonts() {
    if (!document.fonts || typeof document.fonts.load !== 'function') {
      return Promise.resolve();
    }
    var targets = [
      '400 46px "Noto Serif SC"',
      '400 24px "Noto Serif SC"',
      '400 30px "Noto Serif SC"',
      '400 16px "Noto Serif SC"',
      '400 25px "Cinzel"',
      '400 15px "Cinzel"'
    ];
    var jobs = [];
    for (var i = 0; i < targets.length; i++) {
      try {
        var job = document.fonts.load(targets[i]);
        if (job && typeof job.then === 'function') jobs.push(job);
      } catch (error) { /* 忽略单个字体失败 */ }
    }
    return Promise.race([
      Promise.all(jobs),
      new Promise(function (resolve) { window.setTimeout(resolve, 1500); })
    ]);
  }

  function open(session) {
    if (!session || !session.draw) return;
    var card = MO.cards.byId(session.draw.cardId);
    if (!card) return;
    if (!session.line) return;

    /* 这一页只包含牌面与一句提示语：工具不收集问题，分享图也不会带出问题原文 */
    var page = {
      line: session.line,
      pageNo: MO.oracle.pageOf(card, session.draw.orientation),
      meaning: session.meaning || { text: '', symbol: '', tags: [] }
    };

    var sheet = qs('#share-sheet');
    var preview = qs('#share-preview');
    var status = qs('#share-status');
    var actions = qs('#share-actions');
    var token = ++shareLoadToken;

    lastFocused = document.activeElement;
    current = null;
    while (preview.firstChild) preview.removeChild(preview.firstChild);
    show(actions, false);
    setText(status, '正在生成分享卡……');
    show(sheet, true);
    var closeButton = qs('#btn-close-share');
    if (closeButton && typeof closeButton.focus === 'function') closeButton.focus();

    MO.art.loadCardImageForExport(card).then(function (cardImage) {
      if (token !== shareLoadToken) return;
      /* canvas 不会自动等 webfont，先确保字体就位，否则会画成回退字体 */
      return ensureFonts().then(function () {
        if (token !== shareLoadToken) return null;
        var canvas;
        try {
          canvas = renderShareCanvas(page, card, session.draw.orientation, cardImage);
        } catch (error) {
          setText(status, '分享卡生成失败：' + (error && error.message ? error.message : '未知错误') + '，请关闭后重试。');
          status.className = 'share-status is-error';
          return null;
        }

        var dataUrl;
        try {
          dataUrl = canvas.toDataURL('image/jpeg', 0.94);
        } catch (error) {
          setText(status, '图片导出失败，请关闭后重试。');
          status.className = 'share-status is-error';
          return null;
        }

        current = { dataUrl: dataUrl, page: page, card: card, orientation: session.draw.orientation };

        while (preview.firstChild) preview.removeChild(preview.firstChild);
        var img = document.createElement('img');
        img.setAttribute('alt', '午夜来信 · 今晚这一页分享卡');
        img.src = dataUrl;
        preview.appendChild(img);

        var miniTool = window.xhs && window.xhs.miniTool;
        if (miniTool && typeof miniTool.saveImageToPhotosAlbum === 'function') {
          setText(status, '长按图片也可以保存。这一页不包含你的任何输入。');
          status.className = 'share-status';
          show(actions, true);
          show(qs('#btn-post-note'), typeof miniTool.postNote === 'function');
        } else {
          setText(status, '当前环境不支持保存到相册，请长按上方图片保存。');
          status.className = 'share-status';
          show(actions, false);
        }
        return null;
      });
    }, function () {
      if (token !== shareLoadToken) return;
      setText(status, '经典牌面加载失败，请关闭后重试。');
      status.className = 'share-status is-error';
    });
  }

  function close() {
    shareLoadToken++;
    show(qs('#share-sheet'), false);
    current = null;
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    lastFocused = null;
  }

  /* ---------- 端能力调用 ---------- */
  function filePathFromResponse(response) {
    if (!response) return '';
    if (response.filePath) return response.filePath;
    if (response.data && response.data.filePath) return response.data.filePath;
    return '';
  }

  function toFile(dataUrl) {
    var miniTool = window.xhs && window.xhs.miniTool;
    if (!miniTool) return Promise.reject(new Error('当前环境未注入容器能力'));
    if (typeof miniTool.writeTempFile !== 'function') return Promise.resolve(dataUrl);

    function write(data) {
      return Promise.resolve().then(function () {
        return miniTool.writeTempFile({ data: data });
      }).then(function (response) {
        var filePath = filePathFromResponse(response);
        if (filePath) return filePath;
        throw new Error('EMPTY_FILE_PATH');
      });
    }

    return write(dataUrl).then(null, function () {
      var comma = dataUrl.indexOf(',');
      if (comma === -1) return dataUrl;
      return write(dataUrl.slice(comma + 1));
    }).then(null, function () {
      return dataUrl;
    });
  }

  function saveToAlbum() {
    if (!current) return;
    var miniTool = window.xhs && window.xhs.miniTool;
    if (!miniTool || typeof miniTool.saveImageToPhotosAlbum !== 'function') {
      setStatus('当前环境不支持保存到相册，请长按图片保存。', true);
      return;
    }
    setStatus('正在保存到相册……', false);
    toFile(current.dataUrl).then(function (filePath) {
      return Promise.resolve().then(function () {
        return miniTool.saveImageToPhotosAlbum({ filePath: filePath });
      }).then(null, function (error) {
        if (filePath === current.dataUrl || isPermissionError(error)) throw error;
        return miniTool.saveImageToPhotosAlbum({ filePath: current.dataUrl });
      });
    }).then(function () {
      setStatus('已保存到相册。', false);
    }, function (error) {
      setStatus('保存失败：' + friendlySaveError(error) + '。可以长按图片手动保存。', true);
    });
  }

  function postNote() {
    if (!current) return;
    var miniTool = window.xhs && window.xhs.miniTool;
    if (!miniTool || typeof miniTool.postNote !== 'function') {
      setStatus('当前环境不支持发布笔记。', true);
      return;
    }
    var content = '「' + current.page.line + '」' +
      '\n\n' + current.card.nameCN + '（' + (current.orientation === 'upright' ? '正位' : '逆位') + '）· 第 ' +
      current.page.pageNo + ' 页' +
      '\n\n—— 午夜来信 MIDNIGHT ORACLE';
    /* 官方限制：标题 ≤20 字，正文 ≤1000 字 */
    setStatus('正在打开发布页……', false);
    toFile(current.dataUrl).then(function (filePath) {
      return miniTool.postNote({
        title: '午夜来信 · 今日一牌',
        content: content.slice(0, 1000),
        pageType: 'photo_publish',
        mediaInfo: { image_resources: [{ url: filePath }] }
      });
    }).then(function () {
      setStatus('已打开发布页，发布与否由你决定。', false);
    }, function (error) {
      setStatus('打开发布页失败：' + describeApiError(error), true);
    });
  }

  function describeApiError(error) {
    if (!error) return '未知错误';
    var msg = error.errMsg || error.message || '未知错误';
    return String(msg).slice(0, 60);
  }

  function isPermissionError(error) {
    var message = describeApiError(error);
    return /auth|authorize|permission|denied|not allowed|相册|权限/i.test(message);
  }

  function friendlySaveError(error) {
    var message = describeApiError(error);
    if (isPermissionError(error)) {
      return '未获得相册权限，请在系统设置中允许小红书访问照片后重试';
    }
    if (/cancel/i.test(message)) return '已取消保存';
    if (/writeTempFile|filePath|path|invalid|EMPTY_FILE_PATH/i.test(message)) {
      return '图片暂存失败，请长按上方图片手动保存';
    }
    return message;
  }

  function setStatus(text, isError) {
    var status = qs('#share-status');
    setText(status, text);
    status.className = isError ? 'share-status is-error' : 'share-status';
  }

  function bind() {
    on(qs('#btn-close-share'), 'click', close);
    on(qs('#share-sheet-mask'), 'click', close);
    on(qs('#btn-save-album'), 'click', saveToAlbum);
    on(qs('#btn-post-note'), 'click', postNote);
    on(document, 'keydown', function (event) {
      var sheet = qs('#share-sheet');
      if (event.key === 'Escape' && sheet && !sheet.hidden) close();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, false);
  } else {
    bind();
  }

  MO.share = {
    open: open,
    close: close,
    renderShareCanvas: renderShareCanvas
  };

})(window, document);
