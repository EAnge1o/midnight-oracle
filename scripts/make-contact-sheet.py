#!/usr/bin/env python3
"""生成牌面总览图：直接用交付包内的素材，标题口径与包一致。

用法（在项目根目录执行）：python scripts/make-contact-sheet.py
"""
import json
import os
import re

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, "app")
OUT = os.path.join(ROOT, "screenshots", "06-22张牌面总览.png")
FONT_TTF = os.path.join(ROOT, ".asset-cache", "fonts", "NotoSerifSC.ttf")

W = 1440
COLS = 6
CELL = 216
IMG_W = 196
PAD = 34
BG = (10, 13, 27)
GOLD = (199, 169, 107)
IVORY = (234, 226, 208)
MUTED = (150, 162, 190)


def main():
    manifest = json.load(open(os.path.join(APP, "assets/tarot/rider-waite/manifest.json"), encoding="utf-8"))
    cards = manifest["cards"]

    cards_src = open(os.path.join(APP, "assets/js/02-cards-data.js"), encoding="utf-8").read()
    names = dict(re.findall(
        r"id: '([a-z]+)',\s*num:\s*\d+,\s*roman:\s*'[^']*',\s*\n?\s*nameCN: '([^']+)'", cards_src))
    romans = dict(re.findall(r"id: '([a-z]+)',\s*num:\s*\d+,\s*roman: '([^']*)'", cards_src))

    rows = (len(cards) + COLS - 1) // COLS
    img_h = int(IMG_W * 480 / 288)
    head_h = 150
    cell_h = img_h + 46
    H = head_h + rows * cell_h + 40

    canvas = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(canvas)

    title_font = ImageFont.truetype(FONT_TTF, 34)
    small_font = ImageFont.truetype(FONT_TTF, 15)
    label_font = ImageFont.truetype(FONT_TTF, 16)
    num_font = ImageFont.truetype(FONT_TTF, 14)

    draw.text((PAD, 30), "MIDNIGHT ORACLE / ASSET ARCHIVE", font=small_font, fill=GOLD)
    draw.text((PAD, 58), "RIDER-WAITE-SMITH · MAJOR ARCANA", font=title_font, fill=IVORY)
    draw.text((W - PAD - 200, 34), "22 CARDS", font=small_font, fill=MUTED)
    draw.text((W - PAD - 240, 62), "288 × 480 · PUBLIC DOMAIN", font=small_font, fill=MUTED)
    draw.line([(PAD, 128), (W - PAD, 128)], fill=(46, 54, 80), width=1)

    for index, card in enumerate(cards):
        col = index % COLS
        row = index // COLS
        x = PAD + col * CELL
        y = head_h + row * cell_h
        path = os.path.join(APP, card["image"])
        art = Image.open(path).convert("RGB").resize((IMG_W, img_h), Image.Resampling.LANCZOS)
        canvas.paste(art, (x + 8, y))
        draw.rectangle([x + 8, y, x + 8 + IMG_W, y + img_h], outline=(70, 80, 108), width=1)
        draw.text((x + 8, y + img_h + 10), "%02d · %s" % (card["num"], names.get(card["id"], card["id"])), font=label_font, fill=IVORY)
        draw.text((x + 8 + IMG_W - 26, y + img_h + 12), romans.get(card["id"], ""), font=num_font, fill=GOLD)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    canvas.save(OUT, "PNG", optimize=True)
    print("生成: %s (%d×%d, %.1f KB)" % (OUT, W, H, os.path.getsize(OUT) / 1024))


if __name__ == "__main__":
    main()
