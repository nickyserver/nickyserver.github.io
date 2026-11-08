"""Generate PNG icons with only the standard library (no Pillow needed)."""
import struct, zlib, math, os

def png(path, size, maskable=False):
    bg = (15, 20, 25)
    accent = (94, 234, 212)
    accent2 = (56, 189, 248)
    rows = []
    cx = cy = size / 2
    # Maskable icons need content inside the central ~80% safe zone.
    ring_outer = size * (0.30 if maskable else 0.38)
    ring_inner = ring_outer * 0.72
    corner = 0 if maskable else size * 0.22
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            # rounded-square background (full bleed when maskable)
            inside = True
            if corner:
                dx = max(corner - x, 0, x - (size - 1 - corner))
                dy = max(corner - y, 0, y - (size - 1 - corner))
                inside = dx * dx + dy * dy <= corner * corner
            if not inside:
                row += bytes([0, 0, 0, 0]); continue
            r, g, b = bg
            d = math.hypot(x - cx, y - cy)
            if ring_inner <= d <= ring_outer:
                # gradient ring, with a gap at the top-right to read as a timer
                ang = math.atan2(y - cy, x - cx)
                if not (-1.45 < ang < -0.75):
                    t = (x + y) / (2 * size)
                    r = int(accent[0] * (1 - t) + accent2[0] * t)
                    g = int(accent[1] * (1 - t) + accent2[1] * t)
                    b = int(accent[2] * (1 - t) + accent2[2] * t)
            # clock hands
            hl = ring_inner * 0.85
            if abs(x - cx) < size * 0.018 and cy - hl <= y <= cy:
                r, g, b = accent
            if abs(y - cy) < size * 0.018 and cx <= x <= cx + hl * 0.65:
                r, g, b = accent2
            if math.hypot(x - cx, y - cy) < size * 0.035:
                r, g, b = (240, 250, 255)
            row += bytes([r, g, b, 255])
        rows.append(bytes(row))
    raw = b''.join(rows)

    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    data = b'\x89PNG\r\n\x1a\n'
    data += chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
    data += chunk(b'IDAT', zlib.compress(raw, 9))
    data += chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(data)

here = os.path.dirname(os.path.abspath(__file__))
png(os.path.join(here, 'icons', 'icon-192.png'), 192)
png(os.path.join(here, 'icons', 'icon-512.png'), 512)
png(os.path.join(here, 'icons', 'icon-maskable-512.png'), 512, maskable=True)
print('icons written')
