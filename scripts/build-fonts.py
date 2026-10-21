#!/usr/bin/env python3
"""构建内置字体子集：只保留应用真正用到的字，输出 WOFF2。

字体（均为 SIL Open Font License 1.1，可商用可内嵌）：
  - 思源宋体 Noto Serif SC   → 全部中文（界面 + 提示语 + 自问）
  - Cinzel                  → 英文眉题与字标（罗马碑刻大写）

用法：python scripts/build-fonts.py
"""
import io
import json
import os

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, ".asset-cache", "fonts")
OUT = os.path.join(ROOT, "app", "assets", "fonts")
APP = os.path.join(ROOT, "app")

LICENSES = {
    "NotoSerifSC": {
        "file": "NotoSerifSC.woff2",
        "name": "Noto Serif SC / 思源宋体",
        "version": "variable 2.003 (subset)",
        "license": "SIL Open Font License 1.1",
        "source": "https://github.com/google/fonts/tree/main/ofl/notoserifsc",
        "usage": "中文正文、标题、牌名"
    },
    "Cinzel": {
        "file": "Cinzel.woff2",
        "name": "Cinzel",
        "version": "variable (subset)",
        "license": "SIL Open Font License 1.1",
        "source": "https://github.com/google/fonts/tree/main/ofl/cinzel",
        "usage": "英文眉题、字标与页码"
    }
}


ASCII = "".join(chr(c) for c in range(0x20, 0x7F))
PUNCT = "　，。、；：？！（）「」《》【】—…·×÷°′″“”‘’々〜¥"

# 只跑界面文案的模块（内容文案交给楷体）
UI_MODULES = ("01-core.js", "03-cards-art.js", "06-views.js", "07-share.js")
CONTENT_MODULES = ("08b-oracle-lines.js", "08-oracle-book.js")


def read_js(name):
    with io.open(os.path.join(APP, "assets", "js", name), encoding="utf-8") as handle:
        return handle.read()


def card_names():
    """牌名等会被衬线渲染的短词。"""
    import re
    text = read_js("02-cards-data.js")
    return " ".join(re.findall(r"nameCN: '([^']+)'", text))


def ui_text():
    """思源宋体子集：界面文案 + 内容文案（提示语/自问/通用句）+ 牌名。"""
    parts = []
    with io.open(os.path.join(APP, "index.html"), encoding="utf-8") as handle:
        parts.append(handle.read())
    for name in UI_MODULES:
        parts.append(read_js(name))
    for name in CONTENT_MODULES:
        parts.append(read_js(name))
    parts.append(card_names())
    return "\n".join(parts) + ASCII + PUNCT


def content_text():
    """内容用字：提示语、自问、通用句。"""
    parts = []
    for name in CONTENT_MODULES:
        parts.append(read_js(name))
    return "\n".join(parts) + ASCII + "　，。、；：？！（）「」《》【】—…·“”‘’"


def latin_text():
    return ASCII + "·—…’"


def build(src_path, out_path, text, weight=None):
    font = TTFont(src_path)
    if weight is not None and "fvar" in font:
        font = instancer.instantiateVariableFont(
            font, {"wght": weight}, inplace=True, updateFontNames=True
        )
    options = subset.Options()
    options.flavor = "woff2"
    options.desubroutinize = True
    options.layout_features = ["kern", "liga"]
    options.name_IDs = ["*"]
    options.notdef_outline = True
    options.recalc_bounds = True
    options.drop_tables = ["DSIG"]
    options.glyph_names = False
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=text)
    subsetter.subset(font)
    font.save(out_path)
    return os.path.getsize(out_path)


def main():
    if not os.path.isdir(OUT):
        os.makedirs(OUT)
    full = ui_text()
    latin = latin_text()

    jobs = [
        ("NotoSerifSC.ttf", "NotoSerifSC.woff2", full, 400),
        ("Cinzel.ttf", "Cinzel.woff2", latin, 400),
    ]
    total = 0
    for src, out, text, weight in jobs:
        src_path = os.path.join(SRC, src)
        if not os.path.isfile(src_path):
            print("ERROR: 缺少字体源文件 %s" % src_path)
            return 1
        out_path = os.path.join(OUT, out)
        size = build(src_path, out_path, text, weight)
        total += size
        print("%-22s %8.1f KB  (%d 字符集)" % (out, size / 1024.0, len(set(text))))
    print("字体总计: %.1f KB" % (total / 1024.0))

    with io.open(os.path.join(OUT, "licenses.json"), "w", encoding="utf-8") as handle:
        json.dump(LICENSES, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print("授权信息: app/assets/fonts/licenses.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
