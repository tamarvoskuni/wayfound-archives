#!/usr/bin/env python3
"""Crop and clean the public-domain engravings used on the page.

Usage: .venv/bin/python tools/prepare_images.py <folder with full-res downloads>
Expects a1.jpg, a2.jpg, b1.jpg in that folder (sources listed in CREDITS.md).

Each print is cropped, turned grayscale and levelled so the paper goes white
(so CSS `multiply` blends it into the sky). The treelines are joined to a
mirrored copy of themselves so they tile with no visible seam.
"""
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter, ImageOps

OUT = Path(__file__).resolve().parent.parent / "assets" / "img"


def clean(img, black_pct=0.04, paper_pct=0.80):
    """Grayscale, then stretch so the paper tone becomes pure white."""
    g = ImageOps.grayscale(img)
    hist = g.histogram()
    total = sum(hist)

    def pct(p):
        acc = 0
        for v, n in enumerate(hist):
            acc += n
            if acc >= total * p:
                return v
        return 255

    lo, hi = pct(black_pct), pct(paper_pct)
    scale = 255 / max(1, hi - lo)
    return g.point(lambda v: max(0, min(255, round((v - lo) * scale))))


def crop_frac(img, preview_w, box):
    """Crop using coordinates measured on a preview `preview_w` pixels wide."""
    s = img.width / preview_w
    return img.crop(tuple(round(c * s) for c in box))


def mirrored_tile(img, height):
    img = img.resize((round(img.width * height / img.height), height), Image.LANCZOS)
    tile = Image.new("L", (img.width * 2, height), 255)
    tile.paste(img, (0, 0))
    tile.paste(ImageOps.mirror(img), (img.width, 0))
    return tile


def silhouette(tile, out_path, spread=4):
    """Fill the tree shapes into solid ink, for the dusk/night silhouette layer."""
    ink = ImageOps.invert(tile)                      # lines -> bright
    ink = ink.filter(ImageFilter.GaussianBlur(spread))
    ink = ink.point(lambda v: 255 if v > 52 else 0)  # canopy mass
    ink = ink.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    # Ground the bottom so the forest floor is solid.
    w, h = ink.size
    floor = Image.linear_gradient("L").resize((w, h))
    ink = ImageChops.lighter(ink, floor.point(lambda v: 255 if v > 232 else 0))
    rgba = Image.new("RGBA", (w, h), (8, 10, 8, 0))
    rgba.putalpha(ink)
    rgba.save(out_path, optimize=True)


def main(src: Path):
    OUT.mkdir(parents=True, exist_ok=True)

    # Front treeline: "Rij bomen", Isendoorn à Blois. Trees only, no border or foreground.
    a1 = crop_frac(Image.open(src / "a1.jpg"), 1200, (94, 72, 972, 700))
    front = mirrored_tile(clean(a1), 900)
    front.save(OUT / "trees-front.jpg", quality=80, optimize=True, progressive=True)
    silhouette(front, OUT / "trees-front-night.png")

    # Back treeline: "Bomen" (1836), same artist.
    a2 = crop_frac(Image.open(src / "a2.jpg"), 1200, (160, 112, 1034, 742))
    back = mirrored_tile(clean(a2, paper_pct=0.7), 800)
    back.save(OUT / "trees-back.jpg", quality=78, optimize=True, progressive=True)
    silhouette(back, OUT / "trees-back-night.png", spread=3)

    # Wall: Piranesi, the underground foundations of Hadrian's mausoleum. Masonry only.
    b1 = crop_frac(Image.open(src / "b1.jpg"), 822, (40, 20, 620, 880))
    b1 = clean(b1, black_pct=0.02, paper_pct=0.92)
    b1 = b1.resize((1400, round(b1.height * 1400 / b1.width)), Image.LANCZOS)
    b1.save(OUT / "wall.jpg", quality=72, optimize=True, progressive=True)

    for f in ("trees-front.jpg", "trees-front-night.png", "trees-back.jpg", "trees-back-night.png", "wall.jpg"):
        im = Image.open(OUT / f)
        print(f, im.size, f"{(OUT / f).stat().st_size // 1024} KB")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(Path(sys.argv[1]))
