"""Generate flat-color PNGs for icon/splash when no artwork is desired."""
from pathlib import Path

from PIL import Image

BG = (14, 17, 23, 255)  # #0E1117 — matches COLORS.bg


def solid(size: tuple[int, int], path: Path) -> None:
    img = Image.new("RGBA", size, BG)
    img.save(path, "PNG")
    print(path, size)


def main() -> None:
    root = Path(__file__).resolve().parent.parent / "assets"
    root.mkdir(parents=True, exist_ok=True)
    solid((1024, 1024), root / "icon.png")
    solid((1024, 1024), root / "adaptive-icon.png")
    solid((1024, 1024), root / "splash-icon.png")
    solid((48, 48), root / "favicon.png")


if __name__ == "__main__":
    main()
