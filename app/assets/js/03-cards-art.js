/* =========================================================
   03-cards-art.js — 牌面视觉体系
   一套刻度语言，两个渲染后端（SVG / Canvas 2D），
   保证页面牌面与分享卡插画完全一致。
   坐标系：徽记 0..100 方格；卡面 0..100 x 0..168。
   ========================================================= */
(function (window, document) {
  'use strict';

  var MO = window.MO || (window.MO = {});

  /* ---------- 通用刻度原语 ---------- */
  function circle(cx, cy, r, w) {
    return { k: 'c', cx: cx, cy: cy, r: r, w: w == null ? 1.6 : w };
  }
  function disc(cx, cy, r) {
    return { k: 'd', cx: cx, cy: cy, r: r };
  }
  function line(x1, y1, x2, y2, w) {
    return { k: 'l', x1: x1, y1: y1, x2: x2, y2: y2, w: w == null ? 1.6 : w };
  }
  function strokePath(d, w) {
    return { k: 'p', d: d, w: w == null ? 1.6 : w };
  }
  function fillPath(d) {
    return { k: 'f', d: d };
  }

  /* ---------- 22 枚徽记 ----------
     统一线宽、统一圆头圆角、统一 0..100 方格，保证风格一致。 */
  var EMBLEMS = {

    /* 0 愚人 —— 悬崖边的一步与一轮小太阳 */
    fool: [
      strokePath('M2 92 L34 92 L34 66 L2 66 Z', 1.5),
      line(2, 66, 34, 66, 1.2),
      disc(50, 26, 7),
      line(50, 34, 50, 60, 2.4),
      line(50, 42, 64, 34, 1.7),
      line(50, 46, 38, 42, 1.7),
      line(50, 60, 62, 76, 1.8),
      line(50, 60, 40, 72, 1.8),
      line(72, 28, 68, 80, 1.5),
      disc(84, 18, 9),
      line(84, 4, 84, 7, 1.2), line(97, 18, 94, 18, 1.2), line(71, 18, 74, 18, 1.2),
      line(88, 8, 86, 10, 1.2), line(88, 28, 86, 26, 1.2)
    ],

    /* 1 魔术师 —— 无限符号与桌上四件法器 */
    magician: [
      strokePath('M33 28 C33 21 45 21 50 28 C55 35 67 35 67 28 C67 21 55 21 50 28 C45 35 33 35 33 28 Z', 1.5),
      line(50, 36, 50, 70),
      line(18, 72, 82, 72), line(28, 72, 24, 90, 1.3), line(72, 72, 76, 90, 1.3),
      circle(30, 67, 3.4, 1.3),
      strokePath('M41 60 L41 69 L48 69 L48 60', 1.3),
      line(59, 60, 59, 69, 1.3), line(55.5, 63, 62.5, 63, 1.3),
      line(68, 60, 76, 69, 1.3)
    ],

    /* 2 女祭司 —— 双柱、帷幕与足下新月 */
    priestess: [
      fillPath('M21 31 L29 31 L29 84 L21 84 Z'),
      fillPath('M71 31 L79 31 L79 84 L71 84 Z'),
      line(18, 27, 82, 27, 1.4), line(18, 88, 82, 88, 1.4),
      line(29, 33, 71, 33, 1.2),
      strokePath('M31 33 L35 60 M69 33 L65 60 M42 33 L40 54 M58 33 L60 54', 1.1),
      line(33, 44, 67, 44, 1), line(34, 52, 66, 52, 1),
      strokePath('M50 60 A8 8 0 1 0 50 76 A6.2 6.2 0 1 1 50 60 Z', 1.4),
      line(32, 82, 44, 82, 1), line(56, 82, 68, 82, 1)
    ],

    /* 3 皇后 —— 金星徽记与两侧饱满的麦穗 */
    empress: [
      circle(50, 20, 8, 1.6), line(50, 28, 50, 42, 1.6),
      line(50, 35, 44, 39, 1.3), line(50, 35, 56, 39, 1.3),
      line(26, 92, 26, 50, 1.5),
      disc(20.5, 58, 2.4), disc(31.5, 58, 2.4),
      disc(20.5, 67, 2.4), disc(31.5, 67, 2.4),
      disc(20.5, 76, 2.4), disc(31.5, 76, 2.4),
      disc(26, 45, 2.8),
      line(74, 92, 74, 50, 1.5),
      disc(68.5, 58, 2.4), disc(79.5, 58, 2.4),
      disc(68.5, 67, 2.4), disc(79.5, 67, 2.4),
      disc(68.5, 76, 2.4), disc(79.5, 76, 2.4),
      disc(74, 45, 2.8),
      line(14, 92, 86, 92, 1.5)
    ],

    /* 4 皇帝 —— 方正石座、外卷的公羊角与王冠 */
    emperor: [
      strokePath('M34 40 L66 40 L66 68 L34 68 Z', 1.5),
      strokePath('M34 40 C24 40 22 28 31 27 C37 26 38 34 33 36', 1.6),
      strokePath('M66 40 C76 40 78 28 69 27 C63 26 62 34 67 36', 1.6),
      strokePath('M42 40 L46 32 L50 40 L54 32 L58 40', 1.4),
      line(42, 40, 58, 40, 1.3),
      line(22, 52, 34, 52, 1.4), line(66, 52, 78, 52, 1.4),
      line(22, 45, 22, 59, 1.4), line(78, 45, 78, 59, 1.4),
      line(26, 68, 74, 68, 1.6),
      line(34, 68, 34, 86, 1.4), line(66, 68, 66, 86, 1.4),
      line(26, 86, 42, 86, 1.2), line(58, 86, 74, 86, 1.2)
    ],

    /* 5 教皇 —— 三重冠与并列的双钥匙 */
    hierophant: [
      strokePath('M18 44 L26 44 L26 84 L18 84 Z', 1.3),
      strokePath('M74 44 L82 44 L82 84 L74 84 Z', 1.3),
      strokePath('M50 12 A14 14 0 0 1 63 26 L37 26 A14 14 0 0 1 50 12 Z', 1.4),
      strokePath('M38 30 A12 12 0 0 1 62 30', 1.4),
      strokePath('M39 37 A11 11 0 0 1 61 37', 1.4),
      circle(38, 54, 4, 1.4), line(38, 58, 38, 84, 1.5),
      line(38, 74, 44, 74, 1.2), line(38, 79, 44, 79, 1.2),
      circle(62, 54, 4, 1.4), line(62, 58, 62, 84, 1.5),
      line(62, 74, 56, 74, 1.2), line(62, 79, 56, 79, 1.2)
    ],

    /* 6 恋人 —— 两人、太阳与结果之树 */
    lovers: [
      disc(50, 18, 8),
      line(50, 5, 50, 8, 1.1), line(50, 28, 50, 31, 1.1),
      line(37, 18, 40, 18, 1.1), line(60, 18, 63, 18, 1.1),
      line(41, 9, 43, 11, 1.1), line(59, 9, 57, 11, 1.1),
      line(59, 27, 57, 25, 1.1), line(41, 27, 43, 25, 1.1),
      circle(12, 44, 13, 1.4), line(12, 57, 12, 90, 1.5),
      disc(7, 42, 1.9), disc(17, 48, 1.9),
      disc(35, 52, 4.6), line(35, 57, 35, 78, 1.7),
      line(35, 62, 45, 56, 1.5), line(35, 78, 29, 88, 1.5), line(35, 78, 41, 86, 1.5),
      disc(65, 52, 4.6), line(65, 57, 65, 78, 1.7),
      line(65, 62, 55, 56, 1.5), line(65, 78, 59, 86, 1.5), line(65, 78, 71, 88, 1.5),
      line(6, 92, 94, 92, 1.3)
    ],

    /* 7 战车 —— 缀星华盖、车身与双轮 */
    chariot: [
      strokePath('M22 44 L22 26 L78 26 L78 44', 1.5),
      line(19, 26, 81, 26, 1.5),
      line(22, 26, 50, 18, 1.3), line(78, 26, 50, 18, 1.3), line(50, 18, 50, 25, 1.2),
      line(28, 32, 28, 44, 1), line(40, 32, 40, 44, 1),
      line(60, 32, 60, 44, 1), line(72, 32, 72, 44, 1),
      strokePath('M26 46 L74 46 L74 68 L26 68 Z', 1.5),
      line(26, 57, 74, 57, 1.1),
      line(38, 68, 38, 75, 1.3), line(62, 68, 62, 75, 1.3),
      circle(38, 82, 7, 1.5), circle(62, 82, 7, 1.5),
      line(38, 75, 38, 89, 1.2), line(62, 75, 62, 89, 1.2),
      line(12, 90, 88, 90, 1.3)
    ],

    /* 8 力量 —— 无限符号与被安抚的狮 */
    strength: [
      strokePath('M40 16 C40 10 48 10 52 16 C56 22 66 22 66 16 C66 10 58 10 52 16 C48 22 40 22 40 16 Z', 1.4),
      circle(48, 56, 21, 1.6),
      circle(34, 40, 5, 1.4), circle(62, 40, 5, 1.4),
      disc(41, 53, 2.6), disc(55, 53, 2.6),
      strokePath('M48 60 L43 68 L53 68 Z', 1.3),
      strokePath('M41 75 C45 79 51 79 55 75', 1.3),
      strokePath('M20 64 A7 7 0 1 1 20 78 A5.4 5.4 0 1 0 20 64 Z', 1.3),
      line(20, 80, 20, 86, 1.2)
    ],

    /* 9 隐士 —— 雪峰、提灯与杖 */
    hermit: [
      strokePath('M4 92 L30 52 L45 76 L58 62 L96 92 Z', 1.3),
      line(34, 54, 28, 92, 1.6),
      strokePath('M46 40 L62 40 L62 58 L46 58 Z', 1.5),
      strokePath('M48 40 L54 33 L60 40', 1.4),
      line(46, 48, 62, 48, 1.1),
      strokePath('M54 43.5 L56 48 L60.5 48.5 L57.2 52 L58.4 56.5 L54 54.2 L49.6 56.5 L50.8 52 L47.5 48.5 L52 48 Z', 1.1),
      line(54, 58, 54, 63, 1.2)
    ],

    /* 10 命运之轮 —— 三重轮盘与外圈标记 */
    wheel: [
      circle(50, 50, 32, 1.6),
      circle(50, 50, 11, 1.4),
      circle(50, 50, 22, 1.1),
      line(50, 18, 50, 82, 1.2), line(18, 50, 82, 50, 1.2),
      line(27, 27, 73, 73, 1.2), line(73, 27, 27, 73, 1.2),
      disc(50, 18, 2.4), disc(50, 82, 2.4), disc(18, 50, 2.4), disc(82, 50, 2.4),
      disc(27, 27, 2.4), disc(73, 27, 2.4), disc(27, 73, 2.4), disc(73, 73, 2.4),
      disc(50, 50, 2.6)
    ],

    /* 11 正义 —— 天平与立剑 */
    justice: [
      line(50, 24, 50, 76, 1.8),
      line(38, 58, 62, 58, 1.5),
      line(45, 70, 55, 70, 1.4), line(46, 76, 54, 76, 1.4),
      line(22, 34, 78, 34, 1.6), disc(50, 34, 2.4),
      line(22, 34, 22, 44, 1.2), line(78, 34, 78, 44, 1.2),
      strokePath('M14 44 A8 8 0 0 0 30 44', 1.4),
      strokePath('M70 44 A8 8 0 0 0 86 44', 1.4),
      strokePath('M43 18 L50 12 L57 18 L57 24 L43 24 Z', 1.3)
    ],

    /* 12 倒吊人 —— T 形架与倒悬的身影 */
    hangedman: [
      line(24, 20, 24, 92, 1.6), line(24, 20, 78, 20, 1.6),
      line(18, 92, 32, 92, 1.4),
      line(50, 20, 50, 30, 1.3),
      line(50, 30, 50, 62, 1.8),
      line(36, 38, 64, 38, 1.5),
      line(36, 38, 33, 48, 1.3), line(64, 38, 67, 48, 1.3),
      circle(50, 70, 6, 1.5),
      strokePath('M50 62 L40 54 M50 62 L60 54', 1.4),
      line(50, 76, 44, 88, 1.4), line(50, 76, 56, 88, 1.4),
      strokePath('M36 74 A16 16 0 0 1 64 74', 1.1)
    ],

    /* 13 死神 —— 拱门、长镰与门前的白玫瑰 */
    death: [
      strokePath('M34 88 L34 52 A22 22 0 0 1 78 52 L78 88', 1.4),
      line(28, 88, 84, 88, 1.4),
      line(10, 86, 56, 26, 1.8),
      strokePath('M56 26 C40 20 28 30 30 46', 1.6),
      line(30, 46, 35, 41, 1.2),
      strokePath('M18 70 A5 5 0 1 0 18 60 A3.8 3.8 0 1 1 18 70 Z', 1.3),
      line(18, 60, 18, 55, 1.2),
      strokePath('M13.5 55 A2.6 2.6 0 1 1 18 50 A2.6 2.6 0 1 1 22.5 55 Z', 1.2),
      line(18, 50, 18, 45, 1.1)
    ],

    /* 14 节制 —— 双杯与流动的水 */
    temperance: [
      strokePath('M46 14 L54 24 L46 34 L38 24 Z', 1.3),
      strokePath('M30 40 L30 52 L42 52 L42 40', 1.4),
      line(29, 40, 43, 40, 1.2),
      strokePath('M42 46 C50 52 44 58 50 64', 1.4),
      strokePath('M46 62 L46 76 L60 76 L60 62', 1.4),
      line(45, 62, 61, 62, 1.2),
      strokePath('M16 88 C24 82 32 94 40 88 C46 83 54 93 62 88 C68 84 74 90 84 86', 1.3),
      line(20, 92, 80, 92, 1),
      strokePath('M30 86 A6 6 0 0 1 40 84 M56 86 A6 6 0 0 1 66 84', 1.2)
    ],

    /* 15 恶魔 —— 倒悬五芒星与松开的锁链 */
    devil: [
      strokePath('M50 24 L68 62 L34 46 L66 46 L32 62 Z', 1.5),
      strokePath('M42 22 C44 14 56 14 58 22', 1.4),
      disc(20, 70, 3.4), line(20, 74, 20, 88, 1.3), line(20, 78, 25, 78, 1.1), line(20, 82, 25, 82, 1.1),
      line(14, 88, 26, 88, 1.2), line(23, 88, 23, 80, 1),
      disc(80, 70, 3.4), line(80, 74, 80, 88, 1.3), line(80, 78, 75, 78, 1.1), line(80, 82, 75, 82, 1.1),
      line(74, 88, 86, 88, 1.2), line(77, 88, 77, 80, 1),
      line(26, 92, 74, 92, 1.3),
      disc(20, 64, 1.6), disc(80, 64, 1.6)
    ],

    /* 16 高塔 —— 被击穿的塔与坠落的身影 */
    tower: [
      strokePath('M36 40 L64 40 L60 90 L40 90 Z', 1.5),
      line(34, 40, 34, 32, 1.3), line(44, 40, 44, 32, 1.3), line(56, 40, 56, 32, 1.3), line(66, 40, 66, 32, 1.3),
      line(32, 32, 68, 32, 1.3),
      line(48, 56, 52, 56, 1.1), line(47, 70, 53, 70, 1.1),
      strokePath('M74 8 L60 28 L70 30 L52 52', 1.6),
      disc(24, 64, 3.2), line(24, 68, 20, 78, 1.2), line(24, 68, 28, 76, 1.2),
      disc(84, 72, 3.2), line(84, 76, 80, 86, 1.2), line(84, 76, 88, 84, 1.2),
      line(12, 92, 88, 92, 1.4)
    ],

    /* 17 星星 —— 八芒主星、两只倾倒的壶与水中之鸟 */
    star: [
      strokePath('M50 8 L58 32 L84 32 L64 50 L72 78 L50 62 L28 78 L36 50 L16 32 L42 32 Z', 1.5),
      strokePath('M17 16 L20 23 L28 25 L22 30 L23 38 L17 34 L10 37 L12 29 L8 24 L15 23 Z', 1.1),
      strokePath('M87 52 L89 57 L94 58 L90 62 L91 67 L87 65 L82 67 L83 62 L80 59 L85 58 Z', 1.1),
      line(50, 62, 50, 88, 1.1),
      strokePath('M30 74 A6 6 0 0 1 42 74 L42 82 L30 82 Z', 1.2),
      strokePath('M70 74 A6 6 0 0 1 58 74 L58 82 L70 82 Z', 1.2),
      strokePath('M12 90 C24 86 32 94 44 90 M56 90 C68 86 76 94 88 90', 1.2)
    ],

    /* 18 月亮 —— 月轮、双塔与蜿蜒的路 */
    moon: [
      strokePath('M58 12 A17 17 0 1 0 58 46 A13 13 0 1 1 58 12 Z', 1.5),
      disc(34, 12, 1.5), disc(22, 26, 1.5), disc(76, 20, 1.5), disc(86, 38, 1.5),
      fillPath('M12 56 L20 56 L20 90 L12 90 Z'),
      fillPath('M80 56 L88 56 L88 90 L80 90 Z'),
      line(10, 56, 22, 56, 1.2), line(78, 56, 90, 56, 1.2),
      strokePath('M44 56 C56 64 38 70 50 78 C60 84 46 88 48 92', 1.4),
      disc(30, 84, 2.6), line(30, 80, 30, 78, 1.1), line(28, 82, 32, 82, 1.1),
      disc(72, 86, 2.6), line(72, 82, 72, 80, 1.1), line(70, 84, 74, 84, 1.1)
    ],

    /* 19 太阳 —— 辉煌日轮、向日葵与矮墙 */
    sun: [
      disc(50, 34, 13),
      line(50, 8, 50, 16, 1.5), line(50, 52, 50, 60, 1.5),
      line(24, 34, 32, 34, 1.5), line(68, 34, 76, 34, 1.5),
      strokePath('M31 15 L37 21 M63 15 L57 21 M31 53 L37 47 M63 53 L57 47', 1.4),
      line(18, 22, 25, 27, 1.3), line(75, 22, 68, 27, 1.3),
      line(18, 46, 25, 41, 1.3), line(75, 46, 68, 41, 1.3),
      line(10, 70, 90, 70, 1.5), line(10, 70, 10, 78, 1.2), line(90, 70, 90, 78, 1.2),
      line(10, 74, 90, 74, 1), line(30, 70, 30, 74, 1), line(50, 70, 50, 74, 1), line(70, 70, 70, 74, 1),
      circle(24, 88, 4.4, 1.3), line(24, 92, 24, 96, 1.2),
      circle(50, 90, 4.4, 1.3), line(50, 94, 50, 98, 1.2),
      circle(76, 88, 4.4, 1.3), line(76, 92, 76, 96, 1.2)
    ],

    /* 20 审判 —— 号角、云与起身的人形 */
    judgement: [
      strokePath('M22 22 C30 14 42 14 50 18 C58 14 70 14 78 22', 1.4),
      disc(50, 30, 6),
      strokePath('M40 36 C30 38 24 48 24 58 M60 36 C70 38 76 48 76 58', 1.3),
      strokePath('M56 32 L84 24 L84 40 L56 34 Z', 1.4),
      line(84, 26, 84, 38, 1.2),
      line(10, 78, 90, 78, 1.4),
      disc(36, 68, 3.4), line(36, 72, 36, 78, 1.3), line(36, 73, 42, 76, 1.1),
      disc(50, 64, 3.4), line(50, 68, 50, 78, 1.3), line(50, 69, 45, 72, 1.1), line(50, 69, 55, 72, 1.1),
      disc(64, 68, 3.4), line(64, 72, 64, 78, 1.3), line(64, 73, 58, 76, 1.1),
      strokePath('M14 84 C24 80 32 88 42 84 M58 84 C68 80 76 88 86 84', 1.2)
    ],

    /* 21 世界 —— 月桂花环与舞动的人 */
    world: [
      strokePath('M50 16 A34 34 0 0 0 16 50', 1.3),
      strokePath('M50 84 A34 34 0 0 0 84 50', 1.3),
      disc(20, 30, 2.6), disc(14, 42, 2.6), disc(14, 60, 2.6), disc(20, 72, 2.6),
      disc(80, 30, 2.6), disc(86, 42, 2.6), disc(86, 60, 2.6), disc(80, 72, 2.6),
      disc(50, 34, 5),
      line(50, 40, 50, 62, 1.8),
      line(50, 44, 32, 34, 1.4), line(50, 44, 68, 34, 1.4),
      line(50, 62, 38, 76, 1.6), line(50, 62, 62, 76, 1.6),
      strokePath('M50 46 C44 54 40 62 34 70', 1.2),
      fillPath('M84 10 L88 14 L84 18 L80 14 Z'),
      fillPath('M16 10 L20 14 L16 18 L12 14 Z'),
      fillPath('M84 82 L88 86 L84 90 L80 86 Z'),
      fillPath('M16 82 L20 86 L16 90 L12 86 Z')
    ]
  };

  /* ---------- 渲染：SVG 字符串（静态数据拼接，无用户输入） ---------- */
  function escapeXml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function opToSvg(op) {
    var s = '';
    var sw = op.w == null ? 1.6 : op.w;
    switch (op.k) {
      case 'c':
        s = '<circle cx="' + op.cx + '" cy="' + op.cy + '" r="' + op.r + '" fill="none" stroke="currentColor" stroke-width="' + sw + '"/>';
        break;
      case 'd':
        s = '<circle cx="' + op.cx + '" cy="' + op.cy + '" r="' + op.r + '" fill="currentColor" stroke="none"/>';
        break;
      case 'l':
        s = '<line x1="' + op.x1 + '" y1="' + op.y1 + '" x2="' + op.x2 + '" y2="' + op.y2 + '" stroke="currentColor" stroke-width="' + sw + '" stroke-linecap="round"/>';
        break;
      case 'p':
        s = '<path d="' + op.d + '" fill="none" stroke="currentColor" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round"/>';
        break;
      case 'f':
        s = '<path d="' + op.d + '" fill="currentColor" stroke="none"/>';
        break;
      default:
        s = '';
    }
    return s;
  }

  function emblemOps(cardId) {
    return EMBLEMS[cardId] || EMBLEMS.star;
  }

  /* 徽记独立渲染（画进指定方格） */
  function renderEmblemSvg(cardId, options) {
    var opt = options || {};
    var size = opt.size || 64;
    var boxX = opt.x == null ? 18 : opt.x;
    var boxY = opt.y == null ? 30 : opt.y;
    var ops = emblemOps(cardId);
    var body = '';
    for (var i = 0; i < ops.length; i++) body += opToSvg(ops[i]);
    return '<svg class="mo-svg" viewBox="' + boxX + ' ' + boxY + ' ' + size + ' ' + size +
           '" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">' +
           '<g stroke="currentColor" fill="none">' + body + '</g></svg>';
  }

  /* 完整卡面（含框、编号、徽记、牌名） */
  function renderCardFaceSvg(card, options) {
    var opt = options || {};
    var showName = opt.showName !== false;
    var body = '';

    body += '<rect x="3" y="3" width="94" height="162" rx="2" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.85"/>';
    body += '<rect x="6.4" y="6.4" width="87.2" height="155.2" rx="1" fill="none" stroke="currentColor" stroke-width="0.45" opacity="0.55"/>';
    /* 四角折线装饰 */
    body += '<path d="M6.5 20 L6.5 6.5 L20 6.5 M80 6.5 L93.5 6.5 L93.5 20 M93.5 148 L93.5 161.5 L80 161.5 M20 161.5 L6.5 161.5 L6.5 148" fill="none" stroke="currentColor" stroke-width="0.6" opacity="0.6"/>';

    body += '<text x="50" y="21" text-anchor="middle" font-size="9" letter-spacing="1.6" fill="currentColor" opacity="0.8" font-family="Georgia, Songti SC, serif">' +
            escapeXml(card.roman) + '</text>';

    /* 徽记 */
    var ops = emblemOps(card.id);
    var inner = '';
    for (var i = 0; i < ops.length; i++) inner += opToSvg(ops[i]);
    body += '<g transform="translate(18 30) scale(0.64)" stroke="currentColor" fill="none">' + inner + '</g>';

    if (showName) {
      body += '<line x1="26" y1="130" x2="74" y2="130" stroke="currentColor" stroke-width="0.5" opacity="0.55"/>';
      body += '<text x="50" y="146" text-anchor="middle" font-size="12" letter-spacing="2" fill="currentColor" font-family="Songti SC, Georgia, serif">' +
              escapeXml(card.nameCN) + '</text>';
      body += '<text x="50" y="157" text-anchor="middle" font-size="4.6" letter-spacing="0.9" fill="currentColor" opacity="0.62" font-family="Georgia, serif">' +
              escapeXml(card.nameEN.toUpperCase()) + '</text>';
    }

    return '<svg class="mo-svg" viewBox="0 0 100 168" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">' +
           '<g>' + body + '</g></svg>';
  }

  /* 牌背（首页主视觉与牌组共用同一套设计）
     以 180° 对称为骨架：双层书脊边框、四角藤纹、连续波纹与月轮星徽。
     缩小到 100px 宽时仍保留“圆环 + 十字星”单一主轮廓。 */
  function renderCardBackSvg(options) {
    var opt = options || {};
    var cls = opt.className ? ' ' + opt.className : '';
    var body = '';
    var i;

    /* 深墨色纸面与内层压印，让牌背在暗背景上仍像一个实体。 */
    body += '<rect x="1" y="1" width="98" height="166" rx="2.4" fill="#080E1C"/>';
    body += '<rect x="2.6" y="2.6" width="94.8" height="162.8" rx="1.8" fill="#0D1629" stroke="currentColor" stroke-width="0.55" opacity="0.9"/>';
    body += '<rect x="5.2" y="5.2" width="89.6" height="157.6" rx="1.2" fill="none" stroke="currentColor" stroke-width="0.3" opacity="0.46"/>';
    body += '<rect x="7.3" y="7.3" width="85.4" height="153.4" rx="0.8" fill="none" stroke="currentColor" stroke-width="0.18" opacity="0.25"/>';
    body += '<path d="M10 14 H90 M10 154 H90" stroke="currentColor" stroke-width="0.28" opacity="0.3"/>';

    /* 上下书脊：菱形节点与细密双线，使牌背首尾完全对称。 */
    body += '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">';
    body += '<path d="M50 8 V18 M50 150 V160" stroke-width="0.35" opacity="0.52"/>';
    body += '<path d="M46 13 L50 9 L54 13 L50 17 Z M46 155 L50 159 L54 155 L50 151 Z" stroke-width="0.45" opacity="0.68"/>';
    body += '<circle cx="50" cy="13" r="0.9" fill="currentColor" stroke="none" opacity="0.8"/>';
    body += '<circle cx="50" cy="155" r="0.9" fill="currentColor" stroke="none" opacity="0.8"/>';
    body += '</g>';

    /* 四角藤蔓。每角只画一次，再镜像复制，保证绝对对称。 */
    var corner =
      '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M9 28 C9 18 17 10 28 10" stroke-width="0.45" opacity="0.64"/>' +
        '<path d="M12 27 C13 19 19 13 27 12" stroke-width="0.22" opacity="0.35"/>' +
        '<path d="M13 13 C18 14 21 17 22 22 C17 21 14 18 13 13 Z" stroke-width="0.34" opacity="0.58"/>' +
        '<path d="M18 18 C23 19 26 22 27 27 C22 26 19 23 18 18 Z" stroke-width="0.28" opacity="0.48"/>' +
        '<circle cx="28" cy="10" r="0.7" fill="currentColor" stroke="none" opacity="0.72"/>' +
        '<circle cx="10" cy="28" r="0.7" fill="currentColor" stroke="none" opacity="0.72"/>' +
      '</g>';
    body += '<g opacity="0.88">' +
            corner +
            '<g transform="translate(100 0) scale(-1 1)">' + corner + '</g>' +
            '<g transform="translate(0 168) scale(1 -1)">' + corner + '</g>' +
            '<g transform="translate(100 168) scale(-1 -1)">' + corner + '</g>' +
            '</g>';

    /* 中央上下的连续波纹与侧边花窗。 */
    body += '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">';
    body += '<path d="M22 30 C34 40 42 40 50 32 C58 40 66 40 78 30 M22 138 C34 128 42 128 50 136 C58 128 66 128 78 138" stroke-width="0.28" opacity="0.36"/>';
    body += '<path d="M28 35 C37 43 43 43 50 37 C57 43 63 43 72 35 M28 133 C37 125 43 125 50 131 C57 125 63 125 72 133" stroke-width="0.18" opacity="0.24" stroke-dasharray="0.8 1.8"/>';
    body += '<path d="M15 53 C21 58 21 68 16 76 C21 84 21 94 15 99 M85 53 C79 58 79 68 84 76 C79 84 79 94 85 99" stroke-width="0.25" opacity="0.3"/>';
    body += '<path d="M21 58 L25 62 L21 66 L17 62 Z M79 58 L83 62 L79 66 L75 62 Z M21 106 L25 110 L21 114 L17 110 Z M79 106 L83 110 L79 114 L75 110 Z" stroke-width="0.3" opacity="0.4"/>';
    body += '</g>';

    /* 月轮星徽：双环、十二芒、四瓣玫瑰与中央十字星。 */
    body += '<g transform="translate(50 84)" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">';
    body += '<circle cx="0" cy="0" r="31.2" stroke-width="0.42" opacity="0.55"/>';
    body += '<circle cx="0" cy="0" r="28.8" stroke-width="0.22" opacity="0.45" stroke-dasharray="0.7 2.1"/>';
    body += '<circle cx="0" cy="0" r="21.8" stroke-width="0.28" opacity="0.55"/>';
    for (i = 0; i < 12; i++) {
      var angle = i * Math.PI / 6;
      var sx = Math.cos(angle) * 23.2;
      var sy = Math.sin(angle) * 23.2;
      var tx = Math.cos(angle) * 27.1;
      var ty = Math.sin(angle) * 27.1;
      var dx = Math.cos(angle) * 29.8;
      var dy = Math.sin(angle) * 29.8;
      body += '<path d="M' + sx.toFixed(2) + ' ' + sy.toFixed(2) +
              ' L' + tx.toFixed(2) + ' ' + ty.toFixed(2) +
              '" stroke-width="0.22" opacity="0.42"/>';
      body += '<circle cx="' + dx.toFixed(2) + '" cy="' + dy.toFixed(2) +
              '" r="0.44" fill="currentColor" stroke="none" opacity="0.56"/>';
    }
    body += '<path d="M0 -29 L0 -23 M29 0 L23 0 M0 29 L0 23 M-29 0 L-23 0" stroke-width="0.32" opacity="0.58"/>';
    body += '<path d="M0 -22.2 C5.5 -14 10.8 -8.6 20.8 -4.2 C11.4 1.3 7.2 6.3 3.1 14.6 C0.5 9.4 -1 5.2 0 0 C1.2 -5.9 -0.7 -11.7 0 -22.2 Z" stroke-width="0.48" opacity="0.66"/>';
    body += '<path d="M0 22.2 C-5.5 14 -10.8 8.6 -20.8 4.2 C-11.4 -1.3 -7.2 -6.3 -3.1 -14.6 C-0.5 -9.4 1 -5.2 0 0 C-1.2 5.9 0.7 11.7 0 22.2 Z" stroke-width="0.48" opacity="0.66"/>';
    body += '<path d="M0 -18.5 L3.2 -3.2 L18.5 0 L3.2 3.2 L0 18.5 L-3.2 3.2 L-18.5 0 L-3.2 -3.2 Z" stroke-width="0.52" opacity="0.84"/>';
    body += '<path d="M0 -9 L1.6 -1.6 L9 0 L1.6 1.6 L0 9 L-1.6 1.6 L-9 0 L-1.6 -1.6 Z" fill="currentColor" stroke="none" opacity="0.9"/>';
    body += '<circle cx="0" cy="0" r="1.3" fill="#0D1629" stroke="currentColor" stroke-width="0.35"/>';
    body += '</g>';

    /* 环外四枚小星，让整体向四方呼吸。 */
    body += '<g fill="none" stroke="currentColor" stroke-width="0.32" opacity="0.48">';
    body += '<path d="M50 44 L52 48 L56 50 L52 52 L50 56 L48 52 L44 50 L48 48 Z"/>';
    body += '<path d="M50 112 L52 116 L56 118 L52 120 L50 124 L48 120 L44 118 L48 116 Z"/>';
    body += '<path d="M18 84 L20 87 L23 88 L20 89 L18 92 L16 89 L13 88 L16 87 Z"/>';
    body += '<path d="M82 84 L84 87 L87 88 L84 89 L82 92 L80 89 L77 88 L80 87 Z"/>';
    body += '</g>';

    /* 极小的底部印记保留品牌，但不破坏牌背的古典对称。 */
    body += '<text x="50" y="163" text-anchor="middle" font-size="2.35" letter-spacing="1.2" fill="currentColor" opacity="0.4" font-family="Georgia, serif">MO</text>';

    return '<svg class="mo-svg' + cls + '" viewBox="0 0 100 168" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">' +
           '<g>' + body + '</g></svg>';
  }

  /* 品牌印记（首页小徽标） */
  function renderSigilSvg() {
    var body = '';
    body += '<circle cx="12" cy="12" r="10.2" fill="none" stroke="currentColor" stroke-width="1"/>';
    body += '<path d="M12 4.2 A7.8 7.8 0 1 0 12 19.8 A6 6 0 1 1 12 4.2 Z" fill="currentColor" stroke="none"/>';
    body += '<circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" opacity="0.9"/>';
    return '<svg class="mo-svg" viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true" focusable="false"><g>' + body + '</g></svg>';
  }

  /* ---------- 渲染：Canvas 2D（分享卡，与 SVG 使用同一套原语） ---------- */
  function drawEmblem(ctx, cardId, x, y, size, color, weight) {
    var ops = emblemOps(cardId);
    var scale = size / 100;
    var lw = weight == null ? 1.6 : weight;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    var hasPath2D = typeof window.Path2D === 'function';

    for (var i = 0; i < ops.length; i++) {
      var op = ops[i];
      var sw = op.w == null ? 1.6 : op.w;
      if (op.k === 'c') {
        ctx.lineWidth = sw;
        ctx.beginPath();
        ctx.arc(op.cx, op.cy, op.r, 0, Math.PI * 2, false);
        ctx.stroke();
      } else if (op.k === 'd') {
        ctx.beginPath();
        ctx.arc(op.cx, op.cy, op.r, 0, Math.PI * 2, false);
        ctx.fill();
      } else if (op.k === 'l') {
        ctx.lineWidth = sw;
        ctx.beginPath();
        ctx.moveTo(op.x1, op.y1);
        ctx.lineTo(op.x2, op.y2);
        ctx.stroke();
      } else if (op.k === 'p') {
        ctx.lineWidth = sw;
        if (hasPath2D) {
          ctx.stroke(new window.Path2D(op.d));
        } else {
          ctx.stroke();
        }
      } else if (op.k === 'f') {
        if (hasPath2D) {
          ctx.fill(new window.Path2D(op.d));
        } else {
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  /* ---------- 供分享卡复用的卡面线条（同一套坐标） ---------- */
  function drawCardFrame(ctx, x, y, w, h, color) {
    var sx = w / 100;
    var sy = h / 168;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    function px(v) { return v * sx; }
    function py(v) { return v * sy; }

    ctx.lineWidth = Math.max(1, 0.9 * sx);
    ctx.strokeRect(px(3), py(3), px(94), py(162));
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = Math.max(0.6, 0.45 * sx);
    ctx.strokeRect(px(6.4), py(6.4), px(87.2), py(155.2));
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = Math.max(0.8, 0.6 * sx);
    var corner = 13.5;
    ctx.beginPath();
    ctx.moveTo(px(6.5), py(6.5 + corner)); ctx.lineTo(px(6.5), py(6.5)); ctx.lineTo(px(6.5 + corner), py(6.5));
    ctx.moveTo(px(100 - 6.5 - corner), py(6.5)); ctx.lineTo(px(100 - 6.5), py(6.5)); ctx.lineTo(px(100 - 6.5), py(6.5 + corner));
    ctx.moveTo(px(100 - 6.5), py(168 - 6.5 - corner)); ctx.lineTo(px(100 - 6.5), py(168 - 6.5)); ctx.lineTo(px(100 - 6.5 - corner), py(168 - 6.5));
    ctx.moveTo(px(6.5 + corner), py(168 - 6.5)); ctx.lineTo(px(6.5), py(168 - 6.5)); ctx.lineTo(px(6.5), py(168 - 6.5 - corner));
    ctx.stroke();
    ctx.restore();
  }

  /* ---------- 经典牌面图片加载与挂载 ---------- */
  var cardImageCache = {};
  var cardImagePromises = {};

  function imagePath(card) {
    return card && card.image ? card.image : '';
  }

  /* 兜底：某一档尺寸目录缺失时自动换另一档。
     兼容「客户端缓存了旧版脚本、但包内已是新素材」的情况。 */
  function alternateImagePaths(src) {
    var list = [];
    if (!src) return list;
    if (src.indexOf('/360px/') !== -1) {
      list.push(src.replace('/360px/', '/720px/'));
    } else if (src.indexOf('/720px/') !== -1) {
      list.push(src.replace('/720px/', '/360px/'));
    }
    return list;
  }

  function loadImageSource(src) {
    if (!src) return Promise.reject(new Error('CARD_IMAGE_MISSING'));
    if (cardImageCache[src]) return Promise.resolve(cardImageCache[src]);
    if (cardImagePromises[src]) return cardImagePromises[src];

    cardImagePromises[src] = new Promise(function (resolve, reject) {
      var img = new window.Image();
      var alternates = alternateImagePaths(src);
      var attempt = 0;

      img.onload = function () {
        cardImageCache[src] = img;
        cardImagePromises[src] = null;
        resolve(img);
      };
      img.onerror = function () {
        if (attempt < alternates.length) {
          img.src = alternates[attempt++];
          return;
        }
        cardImagePromises[src] = null;
        reject(new Error('CARD_IMAGE_LOAD_FAILED'));
      };
      img.src = src;
    });
    return cardImagePromises[src];
  }

  function loadCardImage(card) {
    return loadImageSource(imagePath(card));
  }

  function loadCardImageForExport(card) {
    var embedded = MO.cardCanvasData && MO.cardCanvasData[card.id];
    return loadImageSource(embedded || imagePath(card));
  }

  function mountCardImage(host, card, options) {
    if (!host || !card) return;
    var opt = options || {};
    host.innerHTML = '';

    var img = new window.Image();
    var alternates = alternateImagePaths(imagePath(card));
    var attempt = 0;
    img.className = 'tarot-art-image' + (opt.reversed ? ' is-reversed' : '');
    img.alt = card.nameCN + (opt.reversed ? '，逆位' : '，正位');
    img.setAttribute('draggable', 'false');
    img.onload = function () {
      img.className += ' is-loaded';
    };
    img.onerror = function () {
      /* 换档位目录，再退到包内 data URI 副本（仍是同一张 RWS 牌面），
         最后才用代码生成的徽记。风格不会因为一次加载失败就变。 */
      if (attempt < alternates.length) {
        img.src = alternates[attempt++];
        return;
      }
      var embedded = MO.cardCanvasData && MO.cardCanvasData[card.id];
      if (embedded && img.getAttribute('src') !== embedded) {
        img.src = embedded;
        return;
      }
      host.innerHTML = renderCardFaceSvg(card);
    };
    img.src = imagePath(card);
    host.appendChild(img);
    return img;
  }

  /* 预加载牌面：揭示动画开始前先确保图片就位，
     否则翻面时会看到空框，图片再突然淡入。 */
  function preloadCardImage(card, timeoutMs) {
    var src = imagePath(card);
    if (!src) return Promise.resolve(null);
    return new Promise(function (resolve) {
      var img = new window.Image();
      var settled = false;
      var finish = function (value) {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      img.onload = function () { finish(img); };
      img.onerror = function () {
        /* 文件取不到时改用包内 data URI 副本，保证仍是同一张牌面 */
        var embedded = MO.cardCanvasData && MO.cardCanvasData[card.id];
        if (embedded) {
          img.src = embedded;
          return;
        }
        finish(null);
      };
      window.setTimeout(function () { finish(img); }, timeoutMs || 1500);
      img.src = src;
    });
  }

  MO.art = {
    EMBLEMS: EMBLEMS,
    emblemOps: emblemOps,
    renderEmblemSvg: renderEmblemSvg,
    renderCardFaceSvg: renderCardFaceSvg,
    renderCardBackSvg: renderCardBackSvg,
    renderSigilSvg: renderSigilSvg,
    drawEmblem: drawEmblem,
    drawCardFrame: drawCardFrame,
    loadCardImage: loadCardImage,
    loadCardImageForExport: loadCardImageForExport,
    mountCardImage: mountCardImage,
    preloadCardImage: preloadCardImage,
    CARD_ASPECT: 168 / 100,
    CARD_IMAGE_ASPECT: 5 / 3
  };

})(window, document);
