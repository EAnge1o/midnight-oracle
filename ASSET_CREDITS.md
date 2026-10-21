# 素材来源与许可

## 正式采用的牌组

- 牌组名称：Rider-Waite-Smith Tarot
- 原画作者：Pamela Colman Smith（1878–1951）
- 项目指导：Arthur Edward Waite
- 初版出版：Rider & Company，1909
- 本项目使用范围：22 张大阿尔卡那，编号 0–21
- 原始版本：`tarot/rider-waite/720px/`，JPEG，720×1200；交付包内为本地重编码版 288×480（分享卡副本 220×367）

## 素材仓库

- 仓库：https://github.com/mixvlad/TarotCards
- 牌组目录：https://github.com/mixvlad/TarotCards/tree/main/tarot/rider-waite
- 仓库元数据：`tarot/rider-waite/metadata.json`
- 仓库说明：`README.md`、`SOURCES.md`

## 原始来源

- 扫描来源：https://steve-p.org/cards/RWSa.html
- 仓库记录：Steve P. 对 1909 年 Pam-A 牌组进行扫描、清理与修复
- 仓库与元数据将 Rider-Waite-Smith 牌组标记为 Public Domain

## 许可边界

- 仓库代码与文档使用 MIT License。
- Rider-Waite-Smith 图片不使用 MIT License，而是由仓库单独标记为 Public Domain。
- 本项目没有把仓库代码许可误用于图片。
- 原作品已出版于 1909 年，仓库将其视为进入公共领域。不同司法辖区对扫描、修复版本及数字化成果的保护标准可能不同，正式商业发行前仍建议按目标发行地区做最终法务确认。

## 本项目如何处理图片

- 仅复制仓库已有的 720px JPEG 版本，没有重新绘制、重上色或覆盖原画。
- 没有裁掉牌框或关键象征元素。
- 逆位只通过运行时 CSS / Canvas 旋转 180° 表达，不修改原文件。
- 分享卡按原始宽高比绘制同一张本地图片。
- 页面显示、结果页与分享卡使用同一份 `manifest.json` 映射。
- 为避免容器内 Canvas 把本地文件 URL 判定为跨域，分享卡另使用由同一原图等比缩放生成的
  320×533 JPEG data URI 副本；该副本只用于 Canvas 合成，不改变画面内容。

## 校验

每张图片的 SHA-256 记录在 `app/assets/tarot/rider-waite/manifest.json`，可直接用于核对最终包内文件是否与本次采用的素材一致。

## 文本研究来源

- A. E. Waite, *The Pictorial Key to the Tarot*（1910，Public Domain）
- Wikisource 目标页面：https://en.wikisource.org/wiki/The_Pictorial_Key_to_the_Tarot
- 本次环境无法稳定访问 Wikisource 页面，因此牌义交叉核对使用了公开的 Waite 文本转录：
  https://github.com/tani-ro-hei/Acme-Tarot-PictorialKey
- 该转录仓库仅用于查阅 Waite 的传统牌义文本，不进入本项目运行包，也没有复制其代码。

详细牌义修订记录见 `TAROT_RESEARCH_NOTES.md`。

## 牌背设计研究（未打包第三方素材）

本轮重新设计牌背时，查阅了以下许可清晰的开源纸牌项目，仅用于归纳共同设计规律，没有把任何第三方 SVG、PNG 或纹样直接复制进运行包：

- [AustinGabriel/Public-Domain-and-CC0-Playing-Cards](https://github.com/AustinGabriel/Public-Domain-and-CC0-Playing-Cards)
  - 许可：CC0 1.0。
  - 参考点：内外双框、四角主题装饰、中央图章与低对比连续纹样共同维持 180° 对称。
- [letele/playing-cards](https://github.com/letele/playing-cards)
  - 许可：CC0 1.0。
  - 上游来源：Adrian Kennard 的 SVG and print ready playing card designs。
  - 参考点：小尺寸下保持一个高识别度主轮廓，纹样只承担层次，不与主轮廓争夺注意力。
- [rnvannatta/playing-cards](https://github.com/rnvannatta/playing-cards)
  - 许可：CC0 1.0。
  - 牌背上游来源：[Tiled blue broken line rhombus card back](https://commons.wikimedia.org/wiki/File:Tiled_blue_broken_line_rhombus_card_back.svg)。
  - 参考点：可平铺纹样、月牙形边饰和书脊式边框可以形成历史纸牌感，同时不必堆叠大面积高亮。

调研中另见到 `billowwalker/Tarot-cards` 的牌背图片，但 GitHub 仓库未声明许可证，因此明确排除，不进入设计资产、运行包或可再分发文件。

最终牌背 `renderCardBackSvg()` 为本项目原创代码：月轮星徽、十二芒、四瓣玫瑰、连续波纹、四角藤纹与双层书脊边框均由项目内 SVG 路径构成。

## 洗牌交互研究（未打包第三方代码）

本轮重新设计洗牌动作与牌扇时，查阅了以下开源实现：

- [evoluteur/tarot-reading](https://github.com/evoluteur/tarot-reading)
  - 许可：MIT。
  - 参考点：所有牌围绕屏幕外同一枢轴展开；按剩余牌数计算弧宽和枢轴偏移；牌从扇面飞向目标牌位。
  - 本项目只采用枢轴扇形与逐卡运动原则，时间线、函数与响应式尺寸均独立实现。
- [datturbomoon/Mystic-Draw](https://github.com/datturbomoon/Mystic-Draw)
  - 许可：MIT。
  - 参考点：散牌与重聚拆成独立阶段，使用逐卡延迟建立第二层节奏，并配合轻量粒子而不遮挡卡牌。
- [deck-of-cards/deck-of-cards](https://github.com/deck-of-cards/deck-of-cards)
  - GitHub 未提供可识别的标准许可声明，因此没有复制其代码。
  - 仅参考三角函数扇形、逐卡层级与连续帧动画的通用组织方式。
- [y-okudera/tarot-shuffle](https://github.com/y-okudera/tarot-shuffle)
  - 仓库未声明许可，仅查看公开演示与源码行为，没有复制代码或素材。
- [nippe-y0815/card_shuffle](https://github.com/nippe-y0815/card_shuffle)
  - 仓库未声明许可，仅参考旋转牌堆、分叠和牌序重排的公开运动概念，没有复制代码或素材。

本项目没有新增第三方 JavaScript 依赖。运行包中的洗牌代码、缓动函数、
响应式扇形半径和层级策略均为项目内实现。
