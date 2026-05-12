"""
Strip purple tile / black frame — keep only white die + motion lines.
Composite centered on white 1024 canvas for Expo icon & splash (matches white splash).
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image


OUT_SIZE = 1024
INNER_FRAC = 0.72  # smaller = more breathing room around die-only art
CANVAS_RGB = (255, 255, 255)


def rgb_to_hex(r: int, g: int, b: int) -> str:
    return f"#{r:02X}{g:02X}{b:02X}"


def rgb_to_hsv_np(rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    rgb = rgb.astype(np.float64) / 255.0
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    df = mx - mn + 1e-10

    h = np.zeros_like(mx)
    eq = mx == mn
    h[eq] = 0
    ir = (mx == r) & ~eq
    h[ir] = np.mod(60 * (((g[ir] - b[ir]) / df[ir]) % 6), 360)
    ig = (mx == g) & ~eq & ~ir
    h[ig] = np.mod(60 * (((b[ig] - r[ig]) / df[ig]) + 2), 360)
    ib = (mx == b) & ~eq & ~ir & ~ig
    h[ib] = np.mod(60 * (((r[ib] - g[ib]) / df[ib]) + 4), 360)

    s = np.where(mx < 1e-9, 0, df / (mx + 1e-10))
    v = mx
    return h, s, v


def mask_outer_black(rgba: np.ndarray) -> np.ndarray:
    r = rgba[:, :, 0].astype(np.float32)
    g = rgba[:, :, 1].astype(np.float32)
    b = rgba[:, :, 2].astype(np.float32)
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    spread = mx - mn

    black = (r < 42) & (g < 42) & (b < 42)
    black |= (lum < 32) & (spread < 35)
    black |= (lum < 22) & (spread < 50)

    out = rgba.copy()
    out[:, :, 3] = np.where(black, 0, np.clip(out[:, :, 3].astype(np.float32), 0, 255)).astype(
        np.uint8
    )
    return out


def strip_purple_keep_white_die(rgba: np.ndarray) -> np.ndarray:
    """Remove purple squircle; keep bright neutral / white artwork."""
    r = rgba[:, :, 0].astype(np.float32)
    g = rgba[:, :, 1].astype(np.float32)
    b = rgba[:, :, 2].astype(np.float32)
    a = rgba[:, :, 3].astype(np.float32)

    lum = (r + g + b) / 3.0
    rgb_stack = np.clip(np.stack([r, g, b], axis=-1), 0, 255).astype(np.uint8)
    h, s, v = rgb_to_hsv_np(rgb_stack)

    # Strong white / light-gray neutral (die faces, motion lines, AA)
    neutral = (np.abs(r - g) < 55) & (np.abs(g - b) < 55) & (lum > 118)

    # Purple / violet tile (gradient included): hue band + saturation
    purple_tile = (
        (h >= 245)
        & (h <= 335)
        & (s > 0.06)
        & (v > 0.04)
        & ~((lum > 195) & neutral)
    )

    # Fallback: saturated blue-violet by RGB shape (bottom gradient)
    purple_tile |= (
        (r > 55)
        & (b > 75)
        & (g < np.maximum(r, b) - 12)
        & (lum > 45)
        & (lum < 245)
        & ~neutral
    )

    kill = purple_tile & (a > 8)
    # Never kill obvious bright whites
    kill &= ~((lum > 208) & neutral)

    out = rgba.copy()
    out[:, :, 3] = np.where(kill, 0, np.clip(a, 0, 255)).astype(np.uint8)
    return out


def bbox_nontransparent(rgba: np.ndarray, thresh: int = 12) -> tuple[int, int, int, int]:
    a = rgba[:, :, 3]
    ys, xs = np.where(a > thresh)
    if len(xs) == 0:
        return 0, 0, rgba.shape[1], rgba.shape[0]
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def build_die_only(src: Path, assets_dir: Path) -> str:
    img = Image.open(src).convert("RGBA")
    rgba = np.array(img)
    rgba = mask_outer_black(rgba)
    rgba = strip_purple_keep_white_die(rgba)

    x0, y0, x1, y1 = bbox_nontransparent(rgba)
    cropped = rgba[y0:y1, x0:x1]

    pil_crop = Image.fromarray(cropped, "RGBA")
    cw, ch = pil_crop.size
    side = max(cw, ch)
    target = int(OUT_SIZE * INNER_FRAC)
    scale = target / float(side)
    nw = max(1, int(round(cw * scale)))
    nh = max(1, int(round(ch * scale)))
    resized = pil_crop.resize((nw, nh), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), (*CANVAS_RGB, 255))
    ox = (OUT_SIZE - nw) // 2
    oy = (OUT_SIZE - nh) // 2
    canvas.paste(resized, (ox, oy), resized)

    assets_dir.mkdir(parents=True, exist_ok=True)
    for name in ("icon.png", "adaptive-icon.png", "splash-icon.png"):
        canvas.save(assets_dir / name, "PNG")

    fav = canvas.resize((48, 48), Image.Resampling.LANCZOS)
    fav.save(assets_dir / "favicon.png", "PNG")

    hex_bg = rgb_to_hex(*CANVAS_RGB)
    print(f"Canvas background (splash/adaptive): {hex_bg} (die only, no purple tile)")
    return hex_bg


def patch_app_json(app_json: Path, hex_bg: str) -> None:
    data = json.loads(app_json.read_text(encoding="utf-8"))
    ex = data.setdefault("expo", {})
    sp = ex.setdefault("splash", {})
    sp["backgroundColor"] = hex_bg
    sp["resizeMode"] = "contain"
    sp["image"] = "./assets/splash-icon.png"
    ad = ex.setdefault("android", {})
    ai = ad.setdefault("adaptiveIcon", {})
    ai["foregroundImage"] = "./assets/adaptive-icon.png"
    ai["backgroundColor"] = hex_bg
    app_json.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Updated {app_json}")


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    assets = root / "assets"
    app_json = root / "app.json"

    if len(sys.argv) >= 2:
        src = Path(sys.argv[1])
    else:
        cursor_assets = Path(
            r"C:\Users\Lenovo\.cursor\projects\c-Users-Lenovo-Ivan-Demo\assets"
        )
        matches = sorted(cursor_assets.glob("*image-80df1620*.png"))
        if not matches:
            matches = sorted(cursor_assets.glob("*image-d675f73a*.png"))
        if not matches:
            print("Usage: build_die_only_icon.py <source.png>")
            sys.exit(1)
        src = matches[0]

    if not src.is_file():
        print(f"Missing file: {src}")
        sys.exit(1)

    print(f"Source: {src}")
    hex_bg = build_die_only(src, assets)
    patch_app_json(app_json, hex_bg)

    shutil.copy2(assets / "icon.png", assets / "source-logo.png")
    print(f"Copied icon -> {assets / 'source-logo.png'}")


if __name__ == "__main__":
    main()
