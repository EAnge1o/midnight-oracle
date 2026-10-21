# 平台事实核对

核对日期：2026-10-19  
官方文档：https://miniapp-sandbox.xiaohongshu.com/minitool/doc  
文档标注最后更新：2026-10-13

## 容器能力

- 最低 Android 基线：Chrome / WebView 61（Android 8.1）。
- iOS 最低支持：iOS 18.4。
- 包内允许 `.html`、`.css`、`.js`、常见图片、`.woff/.woff2`、`.json`。
- 必须有且只有一个 HTML 入口。
- 脚本必须外置；内联脚本、行内事件、`eval`、`new Function`、WASM、Worker、iframe 均禁止。
- 页面不能联网，所有资源必须打包在包内，或使用允许的 `data:` / `blob:` 内存资源。

## 分享与发布

- `miniTool.writeTempFile({ data })` 返回临时 `filePath`。
- `miniTool.saveImageToPhotosAlbum({ filePath })` 接受 base64 data URI 或临时文件路径，不接受网络地址。
- `miniTool.postNote({ title, content, pageType, mediaInfo })`：
  - `photo_publish` 图文发布。
  - `mediaInfo.image_resources` 为 `{ url }[]`，支持 base64 或本地路径。
  - 标题最长 20 字，正文最长 1000 字。

## 当前验证边界

- 当前环境没有创服平台登录态。
- 尚未在真实容器、Android 真机或 iOS 真机中验证保存与发布接口。
- 普通浏览器中的相册与发布入口会显示不支持提示，并保留长按保存方式。

