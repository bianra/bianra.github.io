#!/usr/bin/env python3
"""生成 PWA 图标(零依赖, 标准库手写 PNG)。

图标设计: 品牌色渐变背景 + 白色圆角文档卡片 + 三行文字线。
输出: frontend/public/icons/{icon-192.png, icon-512.png, apple-touch-icon-180.png}
"""
import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"

# 品牌色: #6C5CE7 -> #8E44AD
C_TOP = (108, 92, 231)
C_BOT = (142, 68, 173)
WHITE = (255, 255, 255)
LINE = (120, 100, 200, 90)  # 卡片文字行(半透明)


def in_round_rect(x, y, x0, y0, x1, y1, r):
    """点 (x,y) 是否在圆角矩形内(左上 x0y0, 右下 x1y1, 圆角半径 r)。"""
    if x < x0 or x > x1 or y < y0 or y > y1:
        return False
    cx = min(max(x, x0 + r), x1 - r)
    cy = min(max(y, y0 + r), y1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def render(size):
    px = bytearray()
    for y in range(size):
        px.append(0)  # filter: None
        t = y / size
        bg = lerp(C_TOP, C_BOT, t)
        for x in range(size):
            # 背景: 全尺寸圆角(半径 22%)
            r_all = size * 0.22
            if not in_round_rect(x, y, 0, 0, size - 1, size - 1, r_all):
                px += bytes((0, 0, 0, 0))  # 透明
                continue
            r, g, b = bg
            a = 255
            # 白色文档卡片: 居中, 宽 58% 高 68%
            cx0 = int(size * 0.21)
            cx1 = int(size * 0.79)
            cy0 = int(size * 0.16)
            cy1 = int(size * 0.84)
            card_r = int(size * 0.06)
            if in_round_rect(x, y, cx0, cy0, cx1, cy1, card_r):
                r, g, b = WHITE
                # 文字行: 三条横线(卡片内)
                lx0 = cx0 + int(size * 0.09)
                lx1 = cx1 - int(size * 0.09)
                ly = [cy0 + int(size * 0.20), cy0 + int(size * 0.36), cy0 + int(size * 0.52)]
                thick = max(1, size // 64)
                for i, liny in enumerate(ly):
                    if liny <= y <= liny + thick:
                        end = lx1 if i == 2 else int(lx0 + (lx1 - lx0) * 0.62)
                        if lx0 <= x <= end:
                            r, g, b = (100, 90, 200)
                            a = 255
            px += bytes((r, g, b, a))
    return px


def make_png(size):
    raw = bytes(render(size))
    w, h = size, size

    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    return png


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, size in [("icon-192.png", 192), ("icon-512.png", 512), ("apple-touch-icon-180.png", 180)]:
        (OUT / name).write_bytes(make_png(size))
        print(f"OK {OUT / name}  ({size}x{size}, { (OUT / name).stat().st_size // 1024 }KB)")


if __name__ == "__main__":
    main()
