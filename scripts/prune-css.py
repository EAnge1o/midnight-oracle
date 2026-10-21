#!/usr/bin/env python3
"""清理未使用的样式：只保留 index.html 与 JS 里真正引用到的类。

判定方式很保守：
  - 「用到的类」= HTML 里 class 属性的值 + JS 字符串字面量里出现的类名；
  - 逐条规则取选择器中的类名，只有当它们一个都没被用到时才丢弃该条；
  - @media 内部同样逐条判断，@keyframes 等整块保留；
  - 保留的规则按原文片段回写，格式与注释完全不动。
"""
import os
import re
import sys

APP = "app"
CSS = os.path.join(APP, "assets", "style.css")
HTML = os.path.join(APP, "index.html")
JS_DIR = os.path.join(APP, "assets", "js")


def collect_used_classes():
    used = set()
    with open(HTML, "r", encoding="utf-8") as handle:
        html = handle.read()
    for value in re.findall(r'class="([^"]*)"', html):
        for name in value.split():
            used.add(name)
    for name in sorted(os.listdir(JS_DIR)):
        if not name.endswith(".js"):
            continue
        with open(os.path.join(JS_DIR, name), "r", encoding="utf-8") as handle:
            source = handle.read()
        for literal in re.findall(r"'([^']*)'|\"([^\"]*)\"", source):
            token = literal[0] or literal[1]
            for part in re.split(r"[\s+]+", token):
                if part and re.fullmatch(r"[A-Za-z][\w-]*", part):
                    used.add(part)
    return used


def blocks(css):
    """返回 (start, end, header, body_start, body_end) 列表，覆盖嵌套。"""
    result = []
    i = 0
    n = len(css)
    while i < n:
        open_brace = css.find("{", i)
        if open_brace == -1:
            break
        header = css[i:open_brace].strip()
        depth = 1
        j = open_brace + 1
        while j < n and depth:
            if css[j] == "{":
                depth += 1
            elif css[j] == "}":
                depth -= 1
            j += 1
        result.append((i, j, header, open_brace + 1, j - 1))
        i = j
    return result


def prune(css, used):
    out = []
    cursor = 0
    for start, end, header, body_start, body_end in blocks(css):
        out.append(css[cursor:start])
        body = css[body_start:body_end]
        # 选择器头部可能粘着上一条规则的注释，判定前先剥掉注释
        clean = re.sub(r"/\*.*?\*/", "", header, flags=re.S).strip()
        if clean.startswith("@media"):
            kept = prune(body, used)
        elif clean.startswith("@"):
            kept = body
        else:
            names = re.findall(r"\.([A-Za-z][\w-]*)", clean)
            if names and not any(name in used for name in names):
                cursor = end
                continue
            kept = body
        out.append(css[start:body_start] + kept + "}")
        cursor = end
    out.append(css[cursor:])
    return "".join(out)


def main():
    used = collect_used_classes()
    with open(CSS, "r", encoding="utf-8", newline="") as handle:
        css = handle.read()
    before = len(css)
    kept = prune(css, used)
    with open(CSS, "w", encoding="utf-8", newline="") as handle:
        handle.write(kept)
    print("used classes: %d" % len(used))
    print("css: %d -> %d bytes (removed %d)" % (before, len(kept), before - len(kept)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
