#!/usr/bin/env python3
"""素材体积优化：按真机展示尺寸重编码牌面，收敛交付包体积。

背景
----
牌面在页面上最大只显示 174 CSS px（@2x 约 348px 宽），分享卡里只画 260px 宽；
原包却打包了 720×1200 原图，并且页面文件与分享卡 data URI 各存一份，
导致 zip 达 7.6 MiB，超过官方建议的 2 MiB。

本脚本
------
1. 从 .asset-cache 的原始素材重新编码出「页面用」小图（360×600）；
2. 重新生成「分享卡专用」的 data URI 副本（280×467）；
3. 同步 manifest 的路径与 SHA-256；
4. 同步 02b-tarot-research.js 里的 imageRoot。

用法（在项目根目录执行）：python scripts/optimize-assets.py
"""
import base64
import hashlib
import io
import json
import os
import re
import sys

from PIL import Image

APP = "app"
SRC_DIR = os.path.join(".asset-cache", "rider-waite", "720px")
DECK_DIR = os.path.join(APP, "assets", "tarot", "rider-waite")
DISPLAY_DIR = os.path.join(DECK_DIR, "360px")
DATA_FILE = os.path.join(APP, "assets", "js", "03b-card-canvas-data.js")
RESEARCH_FILE = os.path.join(APP, "assets", "js", "02b-tarot-research.js")

DISPLAY_SIZE = (288, 480)
DISPLAY_QUALITY = 52
DATA_SIZE = (220, 367)
DATA_QUALITY = 54


def parse_args(argv):
    """允许覆盖默认档位，便于压测不同组合的体积与画质。"""
    global DISPLAY_SIZE, DISPLAY_QUALITY, DATA_SIZE, DATA_QUALITY
    if len(argv) >= 6:
        DISPLAY_SIZE = (int(argv[0]), int(argv[1]))
        DISPLAY_QUALITY = int(argv[2])
        DATA_SIZE = (int(argv[3]), int(argv[4]))
        DATA_QUALITY = int(argv[5])
    return DISPLAY_SIZE, DISPLAY_QUALITY, DATA_SIZE, DATA_QUALITY


def encode(path, size, quality):
    image = Image.open(path).convert("RGB").resize(size, Image.Resampling.LANCZOS)
    buffer = io.BytesIO()
    image.save(buffer, "JPEG", quality=quality, optimize=True, progressive=False, subsampling=1)
    return buffer.getvalue()


def main() -> int:
    parse_args(sys.argv[1:])
    manifest_path = os.path.join(DECK_DIR, "manifest.json")
    with open(manifest_path, "r", encoding="utf-8") as handle:
        manifest = json.load(handle)

    os.makedirs(DISPLAY_DIR, exist_ok=True)
    data_map = {}
    display_total = 0
    data_total = 0

    for entry in manifest["cards"]:
        old_name = os.path.basename(entry["image"])
        source = os.path.join(SRC_DIR, old_name)
        if not os.path.isfile(source):
            print("ERROR: 缺少原始素材 %s" % source)
            return 1

        # 1. 页面用小图
        target = os.path.join(DISPLAY_DIR, old_name)
        payload = encode(source, DISPLAY_SIZE, DISPLAY_QUALITY)
        with open(target, "wb") as handle:
            handle.write(payload)
        display_total += len(payload)

        entry["image"] = "assets/tarot/rider-waite/360px/" + old_name
        entry["sha256"] = hashlib.sha256(payload).hexdigest()
        entry["source"] = (
            "mixvlad/TarotCards tarot/rider-waite/720px"
            "（本地重编码 %dx%d）" % (DISPLAY_SIZE[0], DISPLAY_SIZE[1])
        )

        # 2. 分享卡 data URI 副本
        small = encode(source, DATA_SIZE, DATA_QUALITY)
        data_total += len(small)
        data_map[entry["id"]] = "data:image/jpeg;base64," + base64.b64encode(small).decode("ascii")

    manifest["imageFormat"] = (
        "JPEG %dx%d（页面）/ %dx%d（分享卡副本）"
        % (DISPLAY_SIZE[0], DISPLAY_SIZE[1], DATA_SIZE[0], DATA_SIZE[1])
    )
    manifest["optimizedFrom"] = "mixvlad/TarotCards 720x1200 原图本地重编码"
    with open(manifest_path, "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    # 3. 重新生成分享卡 data 文件
    body = json.dumps(data_map, ensure_ascii=False, separators=(",", ":"))
    with open(DATA_FILE, "w", encoding="utf-8") as handle:
        handle.write(
            "/* 03b-card-canvas-data.js - 分享卡专用 280x467 牌面数据。\n"
            "   由同一批 Rider-Waite-Smith 原图等比缩放生成，\n"
            "   以 data URI 提供给 Canvas，避免容器跨域来源导致画布污染。 */\n"
            "(function(window){window.MO=window.MO||{};window.MO.cardCanvasData=" + body + ";})(window);\n"
        )

    # 4. 同步牌面路径
    with open(RESEARCH_FILE, "r", encoding="utf-8") as handle:
        research = handle.read()
    research = re.sub(
        r"var imageRoot = '[^']*';",
        "var imageRoot = 'assets/tarot/rider-waite/360px/';",
        research,
    )
    with open(RESEARCH_FILE, "w", encoding="utf-8") as handle:
        handle.write(research)

    # 5. 移除旧的大图目录
    old_dir = os.path.join(DECK_DIR, "720px")
    if os.path.isdir(old_dir):
        for name in os.listdir(old_dir):
            os.remove(os.path.join(old_dir, name))
        os.rmdir(old_dir)

    print("display images: %d files, %.2f MB" % (len(manifest["cards"]), display_total / 1048576))
    print("share data uri: %d entries, %.2f MB binary" % (len(data_map), data_total / 1048576))
    print("data file size: %.2f MB" % (os.path.getsize(DATA_FILE) / 1048576))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
