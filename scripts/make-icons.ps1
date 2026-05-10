Add-Type -AssemblyName System.Drawing

$cs = @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class IconHelper {
    public static void FloodFillBgTransparent(Bitmap bmp, int satThreshold, int brightnessThreshold) {
        int w = bmp.Width;
        int h = bmp.Height;
        Rectangle rect = new Rectangle(0, 0, w, h);
        BitmapData data = bmp.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        int stride = data.Stride;
        int len = stride * h;
        byte[] bytes = new byte[len];
        Marshal.Copy(data.Scan0, bytes, 0, len);

        bool[] visited = new bool[w * h];
        Stack<int> stack = new Stack<int>(w * h / 4);

        // Seed: every pixel along all 4 edges (covers thin gaps).
        for (int x = 0; x < w; x++) {
            stack.Push(x);
            stack.Push((h - 1) * w + x);
        }
        for (int y = 0; y < h; y++) {
            stack.Push(y * w);
            stack.Push(y * w + (w - 1));
        }

        while (stack.Count > 0) {
            int packed = stack.Pop();
            if (packed < 0 || packed >= w * h) continue;
            if (visited[packed]) continue;
            int x = packed % w;
            int y = packed / w;
            int i = y * stride + x * 4;
            byte b = bytes[i];
            byte g = bytes[i + 1];
            byte r = bytes[i + 2];
            int maxC = Math.Max(Math.Max(r, g), b);
            int minC = Math.Min(Math.Min(r, g), b);
            int sat = maxC - minC;
            int brightness = r + g + b;

            if (sat > satThreshold) continue;
            if (brightness > brightnessThreshold) continue;

            visited[packed] = true;
            bytes[i] = 0;
            bytes[i + 1] = 0;
            bytes[i + 2] = 0;
            bytes[i + 3] = 0;

            if (x > 0) stack.Push(packed - 1);
            if (x < w - 1) stack.Push(packed + 1);
            if (y > 0) stack.Push(packed - w);
            if (y < h - 1) stack.Push(packed + w);
        }

        Marshal.Copy(bytes, 0, data.Scan0, len);
        bmp.UnlockBits(data);
    }
}
"@

Add-Type -TypeDefinition $cs -ReferencedAssemblies "System.Drawing"

$assets = "C:\Users\Lenovo\Ivan\Demo\Dice\assets"
$src = Join-Path $assets "source-logo.png"
$srcImg = [System.Drawing.Bitmap]::FromFile($src)

$cropX = 272
$cropY = 35
$cropSize = 480

# Tight opaque crop for iOS icon, splash, favicon (iOS masks the corners).
$tight = New-Object System.Drawing.Bitmap $cropSize, $cropSize
$g1 = [System.Drawing.Graphics]::FromImage($tight)
$g1.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$srcRect = New-Object System.Drawing.Rectangle $cropX, $cropY, $cropSize, $cropSize
$dstRect = New-Object System.Drawing.Rectangle 0, 0, $cropSize, $cropSize
$g1.DrawImage($srcImg, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

$tight.Save((Join-Path $assets "icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$tight.Save((Join-Path $assets "splash-icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$tight.Save((Join-Path $assets "favicon.png"), [System.Drawing.Imaging.ImageFormat]::Png)

# Adaptive icon: flood-fill background to transparent, place on 800x800 transparent canvas.
$adaCropped = New-Object System.Drawing.Bitmap $cropSize, $cropSize, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g3 = [System.Drawing.Graphics]::FromImage($adaCropped)
$g3.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g3.DrawImage($srcImg, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

# satThreshold=45, brightnessThreshold=380 — generous enough to swallow gradient bands
# and shadows around the icon, while protecting purple (high saturation) and
# pure white pips/motion lines (very high brightness > 380).
[IconHelper]::FloodFillBgTransparent($adaCropped, 45, 380)

$adaSize = 800
$ada = New-Object System.Drawing.Bitmap $adaSize, $adaSize, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g2 = [System.Drawing.Graphics]::FromImage($ada)
$g2.Clear([System.Drawing.Color]::Transparent)
$offset = [int](($adaSize - $cropSize) / 2)
$g2.DrawImage($adaCropped, $offset, $offset)
$ada.Save((Join-Path $assets "adaptive-icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)

$g1.Dispose()
$g2.Dispose()
$g3.Dispose()
$tight.Dispose()
$ada.Dispose()
$adaCropped.Dispose()
$srcImg.Dispose()

Write-Output "Done"
