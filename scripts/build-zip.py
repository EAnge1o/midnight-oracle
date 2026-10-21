#!/usr/bin/env python3
"""打包交付产物：把 app/ 打成 zip，index.html 位于包根，条目名一律正斜杠。

用法（在项目根目录执行）：python scripts/build-zip.py
"""
import os
import sys
import zipfile

APP_DIR = "app"
OUT_FILE = os.path.join("dist", "mirror-of-the-heart-1.0.0.zip")


def main() -> int:
    if not os.path.isdir(APP_DIR):
        print("ERROR: 找不到 app 目录：%s" % APP_DIR)
        return 1
    if not os.path.isfile(os.path.join(APP_DIR, "index.html")):
        print("ERROR: app 根目录必须存在 index.html")
        return 1

    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    if os.path.exists(OUT_FILE):
        os.remove(OUT_FILE)

    names = []
    with zipfile.ZipFile(OUT_FILE, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for folder, _dirs, files in os.walk(APP_DIR):
            for name in sorted(files):
                full = os.path.join(folder, name)
                # zip 条目名必须用正斜杠：Windows 默认的反斜杠会让容器解压后路径失效
                relative = os.path.relpath(full, APP_DIR).replace(os.sep, "/")
                archive.write(full, relative)
                names.append(relative)

    bad = [n for n in names if "\\" in n]
    if bad:
        print("ERROR: 条目分隔符异常：%s" % ", ".join(bad))
        return 1
    if "index.html" not in names:
        print("ERROR: index.html 不在包根")
        return 1

    size = os.path.getsize(OUT_FILE)
    print("entries: %d" % len(names))
    print("index.html at root: True")
    print("separators: OK (all forward slash)")
    print("zip size: %d bytes (%.2f MiB)" % (size, size / 1024 / 1024))

    music = os.path.join(APP_DIR, "assets", "audio", "music.mp3")
    if not os.path.isfile(music):
        print("")
        print("[注意] 包内没有配乐：app/assets/audio/music.mp3 不在版本库里，需要自己提供。")
        print("       用项目根目录的 music.mp3 裁出前一分钟：")
        print("         ffmpeg -y -i music.mp3 -t 60 -af 'afade=t=in:st=0:d=1.2,afade=t=out:st=58.4:d=1.6' \\")
        print("           -c:a libmp3lame -b:a 64k -ar 48000 -ac 2 app/assets/audio/music.mp3")
        print("       没有配乐时应用仍可正常运行，只是没有背景音乐。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
