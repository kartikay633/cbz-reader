"""Builds sample/sample.cbz: a tiny generated comic used by the "Try a sample" button.

Usage: python tools/make_sample.py   (needs Pillow: pip install pillow)
"""
import io
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

PAGES = 12
SIZE = (800, 1200)
COLORS = ["#ff6b4a", "#ffb547", "#4ad6a0", "#4aa8ff", "#a77bff", "#ff5c9e"]
OUT = Path(__file__).resolve().parent.parent / "sample" / "sample.cbz"

COMIC_INFO = """<?xml version="1.0" encoding="utf-8"?>
<ComicInfo>
  <Series>Sample Comic</Series>
  <Number>1</Number>
  <Title>Hello, CBZ</Title>
</ComicInfo>
"""


def font(size):
    for name in ("arialbd.ttf", "DejaVuSans-Bold.ttf", "Arial Bold.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default(size)


def page(n):
    img = Image.new("RGB", SIZE, "#f4f1ea")
    draw = ImageDraw.Draw(img)
    color = COLORS[(n - 1) % len(COLORS)]
    w, h = SIZE
    # Three comic-style panels.
    panels = [(40, 40, w - 40, 520), (40, 550, w // 2 - 15, 1160), (w // 2 + 15, 550, w - 40, 1160)]
    for i, box in enumerate(panels):
        draw.rectangle(box, fill=color if i == 0 else "#ffffff", outline="#111111", width=6)
    label = "COVER" if n == 1 else f"PAGE {n}"
    draw.text((w // 2, 280), label, font=font(110), fill="#111111", anchor="mm")
    draw.text((w // 4 + 5, 855), f"{n}", font=font(160), fill=color, anchor="mm")
    draw.text((3 * w // 4 - 5, 855), "→" if n < PAGES else "END", font=font(120), fill="#111111", anchor="mm")
    buf = io.BytesIO()
    img.save(buf, "PNG", optimize=True)
    return buf.getvalue()


def main():
    OUT.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("ComicInfo.xml", COMIC_INFO)
        # Unpadded names on purpose: the reader must sort page2 before page10.
        for n in range(1, PAGES + 1):
            zf.writestr(f"Sample Comic/page{n}.png", page(n))
    print(f"Wrote {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
