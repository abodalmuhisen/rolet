"""
Build Expo app icons from a source image with black outer padding.
Removes black, centers the purple+die artwork on a 1024sq canvas filled with
the sampled purple from the artwork (no black ring).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image


OUT_SIZE = 1024
INNER_FRAC = 0.88  # logo scale inside canvas (safe area for masks)


def rgb_to_hex(r: int, g: int, b: int) -> str:
    return f"#{r:02X}{g:02X}{b:02X}"


def mask_outer_black(rgba: np.ndarray) -> np.ndarray:
    """Set alpha=0 for outer black / charcoal letterboxing."""
    r = rgba[:, :, 0].astype(np.float32)
    g = rgba[:, :, 1].astype(np.float32)
    b = rgba[:, :, 2].astype(np.float32)
    a = rgba[:, :, 3].astype(np.float32)
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    spread = mx - mn

    # Pure black / dark UI frame
    black = (r < 42) & (g < 42) & (b < 42)
    # Dark neutral gray (no purple / die tint)
    black |= (lum < 32) & (spread < 35)
    # Extra: very dark corners only (avoid eating purple shadow)
    black |= (lum < 22) & (spread < 50)

    out = rgba.copy()
    out[:, :, 3] = np.where(black, 0, np.clip(a, 0, 255)).astype(np.uint8)
    return out


def bbox_nontransparent(rgba: np.ndarray, thresh: int = 12) -> tuple[int, int, int, int]:
    a = rgba[:, :, 3]
    ys, xs = np.where(a > thresh)
    if len(xs) == 0:
        return 0, 0, rgba.shape[1], rgba.shape[0]
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def sample_purple_bg(rgba: np.ndarray) -> tuple[int, int, int]:
    r = rgba[:, :, 0].astype(np.float32)
    g = rgba[:, :, 1].astype(np.float32)
    b = rgba[:, :, 2].astype(np.float32)
    a = rgba[:, :, 3].astype(np.float32)
    # Ignore transparency and near-white (die + highlights)
    white = (r > 218) & (g > 218) & (b > 218)
    mask = (a > 40) & ~white
    if mask.sum() < 50:
        return 107, 33, 201  # #6B21C9 fallback
    return (
        int(np.mean(r[mask])),
        int(np.mean(g[mask])),
        int(np.mean(b[mask])),
    )


def build_icon(src: Path, assets_dir: Path) -> str:
    img = Image.open(src).convert("RGBA")
    rgba = np.array(img)
    rgba = mask_outer_black(rgba)

    x0, y0, x1, y1 = bbox_nontransparent(rgba)
    cropped = rgba[y0:y1, x0:x1]
    pr, pg, pb = sample_purple_bg(cropped)

    pil_crop = Image.fromarray(cropped, "RGBA")
    cw, ch = pil_crop.size
    side = min(cw, ch)
    target = int(OUT_SIZE * INNER_FRAC)
    scale = target / float(side)
    nw, nh = max(1, int(round(cw * scale))), max(1, int(round(ch * scale)))
    resized = pil_crop.resize((nw, nh), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), (pr, pg, pb, 255))
    ox = (OUT_SIZE - nw) // 2
    oy = (OUT_SIZE - nh) // 2
    canvas.paste(resized, (ox, oy), resized)

    assets_dir.mkdir(parents=True, exist_ok=True)
    for name in ("icon.png", "adaptive-icon.png", "splash-icon.png"):
        canvas.save(assets_dir / name, "PNG")

    fav = canvas.resize((48, 48), Image.Resampling.LANCZOS)
    fav.save(assets_dir / "favicon.png", "PNG")

    hex_bg = rgb_to_hex(pr, pg, pb)
    print(f"Sampled background (splash/adaptive): {hex_bg}")
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
        matches = list(cursor_assets.glob("*image-caaa75e8*.png"))
        if not matches:
            print("Pass path to source PNG, or add image-caaa75e8… under Cursor assets.")
            sys.exit(1)
        src = matches[0]

    if not src.is_file():
        print(f"Missing file: {src}")
        sys.exit(1)

    print(f"Source: {src}")
    hex_bg = build_icon(src, assets)
    patch_app_json(app_json, hex_bg)


if __name__ == "__main__":
    main()
