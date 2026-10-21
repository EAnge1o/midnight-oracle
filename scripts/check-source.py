#!/usr/bin/env python3
"""源码目录终检：直接检查 app/ 目录（不是打包产物）。

检查项：
  1. 引用完整性：HTML 的 src/href、JS 里拼出的资源路径，
     按**大小写敏感**逐个核对（Android / Linux 容器文件系统区分大小写，
     大小写不一致会直接 404）
  2. 离线自足：源码里不出现会被真正请求的外部 URL
  3. 关键内容：22 张牌面、22 条 data URI 副本、2 个字体、1 个配乐
  4. 禁用能力复核：内联脚本 / 行内事件 / eval / iframe / fetch / XHR

用法（在项目根目录执行）：python scripts/check-source.py
"""
import io
import json
import os
import re
import sys

APP = "app"
errors = []
warnings = []


def read(path):
    return io.open(path, encoding="utf-8").read()


def main():
    if not os.path.isdir(APP):
        print("ERROR: 找不到 %s 目录" % APP)
        return 1

    files = []
    for folder, _dirs, names in os.walk(APP):
        for name in names:
            files.append(os.path.relpath(os.path.join(folder, name), APP).replace(os.sep, "/"))
    files.sort()

    print("== 1. 引用完整性（大小写敏感）==")
    index_html = read(os.path.join(APP, "index.html"))
    refs = set()
    for m in re.finditer(r'(?:src|href)="([^"]+)"', index_html):
        ref = m.group(1)
        if ref.startswith(("http", "data:", "#", "mailto:")):
            continue
        refs.add(ref.lstrip("./"))
    for name in files:
        if not name.endswith(".js"):
            continue
        js = read(os.path.join(APP, name))
        for m in re.finditer(r"'((?:\./)?assets/[^']+)'", js):
            refs.add(m.group(1).lstrip("./"))
        for m in re.finditer(r"'(assets/[^']*\.(?:jpg|png|woff2|mp3|json))'", js):
            refs.add(m.group(1))

    for ref in sorted(refs):
        if ref.endswith("/") or "?" in ref or "*" in ref:
            continue
        if ref not in files:
            errors.append("引用了不存在的文件（注意大小写）：%s" % ref)
    print("  核对 %d 个资源引用 → %s" % (len(refs), "全部命中 OK" if not errors else "有缺失 X"))

    print("== 2. 离线自足 ==")
    attribution = []
    for name in files:
        if not name.endswith((".html", ".js", ".css")):
            continue
        for line in read(os.path.join(APP, name)).split("\n"):
            for m in re.finditer(r'https?://[^"\'\s)]+', line):
                url = m.group(0)
                if url.startswith("http://www.w3.org"):
                    continue
                if re.search(r'(src|href)\s*=|url\(|fetch\(|XMLHttpRequest|importScripts|\.src\s*=', line):
                    errors.append("运行时外链（容器不联网会失败）：%s → %s" % (name, url))
                else:
                    attribution.append(url)
    print("  无运行时外链 OK（容器不联网也能跑）")
    for url in attribution[:3]:
        print("  纯文本出处标注，不会发起请求: %s" % url[:70])

    print("== 3. 关键内容 ==")
    jpgs = [n for n in files if n.lower().endswith(".jpg")]
    woffs = [n for n in files if n.lower().endswith(".woff2")]
    mp3s = [n for n in files if n.lower().endswith(".mp3")]
    print("  牌面 jpg: %d | 字体 woff2: %d | 配乐 mp3: %d" % (len(jpgs), len(woffs), len(mp3s)))
    if len(jpgs) != 22:
        errors.append("牌面数量应为 22，实际 %d" % len(jpgs))
    if len(woffs) != 2:
        errors.append("字体数量应为 2，实际 %d" % len(woffs))
    if len(mp3s) != 1:
        warnings.append("包内没有 music.mp3（配乐按要求不入版本库，发布前需自行放入）")

    data = read(os.path.join(APP, "assets", "js", "03b-card-canvas-data.js"))
    count = len(re.findall(r'"data:image/jpeg;base64,', data))
    print("  分享卡 data URI 副本: %d" % count)
    if count != 22:
        errors.append("data URI 副本应为 22，实际 %d" % count)

    manifest_path = os.path.join(APP, "assets", "tarot", "rider-waite", "manifest.json")
    if os.path.isfile(manifest_path):
        manifest = json.loads(read(manifest_path))
        if len(manifest.get("cards", [])) != 22:
            errors.append("manifest 牌数不是 22")
        print("  manifest: %d 张牌" % len(manifest.get("cards", [])))

    print("== 4. 禁用能力复核 ==")
    # 按 device-capabilities.md 的扫描清单：联网、定位、剪贴板、
    # 后台运行（Worker）、音频抓取等在容器里都不可用
    banned = {
        "eval(": "eval",
        "new Function(": "new Function",
        "<iframe": "iframe",
        "fetch(": "fetch",
        "XMLHttpRequest": "XHR",
        "importScripts(": "importScripts",
        "WebSocket": "WebSocket",
        "navigator.geolocation": "定位",
        "navigator.clipboard": "剪贴板",
        "new Worker(": "Worker",
        "new SharedWorker(": "SharedWorker",
        "navigator.serviceWorker": "Service Worker",
        "getUserMedia": "音频抓取",
        "navigator.vibrate": "震动",
        "RTCPeerConnection": "WebRTC",
    }
    hits = 0
    for name in files:
        if not name.endswith((".html", ".js")):
            continue
        text = read(os.path.join(APP, name))
        for token, label in banned.items():
            if token in text:
                errors.append("%s 出现在 %s" % (label, name))
                hits += 1
    if re.search(r"<script(?![^>]*\bsrc=)[^>]*>[^<]", index_html, re.I):
        errors.append("index.html 里有内联脚本")
        hits += 1
    if re.search(r"\son[a-z]+\s*=\s*[\"']", index_html, re.I):
        errors.append("index.html 里有行内事件属性")
        hits += 1
    print("  %s" % ("未发现禁用能力 OK" if hits == 0 else "发现 %d 处禁用能力 X" % hits))

    print("== 5. HTML 结构 ==")
    html_rules = [
        ("DOCTYPE html", index_html.lstrip().lower().startswith("<!doctype html>")),
        ('lang="zh-CN"', 'lang="zh-CN"' in index_html),
        ("charset UTF-8", bool(re.search(r'charset=["\']?utf-8', index_html, re.I))),
        ("viewport-fit=cover", "viewport-fit=cover" in index_html),
        ("无 <base>", "<base" not in index_html.lower()),
        ("无 <object>", "<object" not in index_html.lower()),
        ("无 type=module", 'type="module"' not in index_html),
        ("无自建 CSP meta", "http-equiv" not in index_html.lower()),
        ("无 javascript: URL", "javascript:" not in index_html.lower()),
    ]
    for name, ok in html_rules:
        if not ok:
            errors.append("index.html: " + name)
    print("  %d 项结构检查 %s" % (
        len(html_rules),
        "全部通过 OK" if all(ok for _, ok in html_rules) else "有不合规 X"))

    print("== 6. JS 基线（ES2017 / Chrome 61）==")
    modern = [
        ("可选链 ?.", r"\?\.\s*[A-Za-z_$]"),
        ("空值合并 ??", r"\?\?"),
        ("对象扩散 ...", r"\.\.\.[A-Za-z_$]"),
        ("无参数 catch", r"catch\s*\{"),
        ("Array.flat", r"\.flat\("),
        ("flatMap", r"\.flatMap\("),
        ("trimStart/trimEnd", r"\.trim(Start|End)\("),
        ("Object.hasOwn", r"Object\.hasOwn"),
        ("globalThis", r"\bglobalThis\b"),
        ("动态 import/export", r"^\s*(import|export)\s"),
    ]
    modern_hits = 0
    for name in files:
        if not name.endswith(".js"):
            continue
        text = read(os.path.join(APP, name))
        for label, pattern in modern:
            if re.search(pattern, text, re.M):
                errors.append("%s 用了 ES2018+ 语法（%s）" % (name, label))
                modern_hits += 1
    print("  %s" % ("未发现 ES2018+ 语法 OK" if modern_hits == 0 else "发现 %d 处 X" % modern_hits))

    print("")
    if errors:
        print("!! 发现 %d 个问题：" % len(errors))
        for e in errors:
            print("   - " + e)
    else:
        print("源码终检全部通过 OK")
    for w in warnings:
        print("   ! " + w)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
