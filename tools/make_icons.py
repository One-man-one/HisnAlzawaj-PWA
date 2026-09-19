# -*- coding: utf-8 -*-
"""
مولّد أيقونات التطبيق — بلا أي تبعية خارجية.

    python tools/make_icons.py

⚠️ **لماذا مولّدٌ لا ملفّات PNG مرفوعة:** الأيقونة تُطلب بأربعة مقاسات
وبنسختين (عادية وmaskable)، وكلّ تغييرٍ في اللون أو الشكل يعني إعادة
تصدير ستّة ملفّات يدوياً — وأولُ مرّةٍ يُنسى فيها ملفٌّ واحد تصير
الأيقونة مختلفةً على جهازٍ دون جهاز، بلا أي خطأ يدلّ على السبب.
المصدر هنا هو الكود، والملفّات ناتجُه.

⚠️ **وPillow ليست شرطاً عمداً:** هذا المستودع واجهةٌ ساكنة بلا تبعيات
(`requirements.txt` لا وجود له أصلاً)، وإضافةُ حزمةٍ ثقيلة لأجل ستّ
أيقونات تجعل من يستنسخه يحتاج بيئةً بايثونية كاملة ليغيّر لوناً.
فالكتابة هنا PNG خام: zlib في المكتبة القياسية، وترويسة الملفّ
أربعةُ أسطر.

⚠️ **وmaskable ليست نسخةً مكبّرة:** أندرويد يقصّ الأيقونة بشكلٍ يختاره
النظام (دائرة، مربّع مستدير، قطرة)، ويضمن ظهور **الثمانين بالمئة
الوسطى** وحدها. فنسخةٌ عاديةٌ أُعلنت `maskable` تُقصّ أطرافها فعلاً —
ولذلك الرسم هنا أصغر داخل إطارٍ ممتلئ.
"""

import os
import struct
import zlib

# لوحة اللون — الأخضر خلفيةً والذهبيّ علامةً.
BG = (14, 90, 74)       # #0E5A4A
FG = (232, 196, 106)    # #E8C46A

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'icons')


def _png(width, height, pixels):
    """يبني ملفّ PNG من قائمة صفوفٍ، كلُّ صفٍّ قائمةُ (r, g, b, a)."""
    raw = bytearray()
    for row in pixels:
        raw.append(0)  # نوع المرشّح: لا شيء
        for (r, g, b, a) in row:
            raw += bytes((r, g, b, a))

    def chunk(tag, data):
        out = struct.pack('>I', len(data)) + tag + data
        return out + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    return (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', ihdr)
            + chunk(b'IDAT', zlib.compress(bytes(raw), 9))
            + chunk(b'IEND', b''))


def _cover(dist, edge, softness=1.0):
    """تغطيةٌ متدرّجة عند الحافة — بها وحدها تبدو الحواف ناعمة."""
    if dist <= edge - softness:
        return 1.0
    if dist >= edge + softness:
        return 0.0
    return (edge + softness - dist) / (2.0 * softness)


def _blend(base, top, alpha):
    return tuple(int(round(b + (t - b) * alpha)) for b, t in zip(base, top))


def render(size, maskable):
    """
    حلقتان متشابكتان — رمزُ اقترانٍ يُقرأ في ٤٨ بكسل كما يُقرأ في ٥١٢.

    ⚠️ الشكل بسيطٌ بقرار: الأيقونة تُعرض غالباً في ٤٨×٤٨ على شاشة
    الهاتف، وكلُّ تفصيلٍ أدقّ من ذلك يصير ضباباً.
    """
    # ⚠️ نصفُ القطر محكومٌ بالعرض الكلّي لا بالذوق: الشكل يمتدّ
    # ‎2×offset + 2×radius = 3.24×radius‎ أفقياً، فنصفُ قطرٍ أكبر من
    # ‎0.27×size‎ يقصّ الحلقتين عند الحافّتين. وقع هذا فعلاً في أول
    # توليد: بدت الأيقونة حلقتين مقطوعتين لا متشابكتين.
    # وmaskable أصغر لأن النظام يقصّ الخُمس الخارجيّ فوق ذلك.
    scale = 0.215 if maskable else 0.265
    radius = size * scale
    stroke = max(2.0, size * (0.055 if maskable else 0.06))
    offset = radius * 0.62

    cx1, cy1 = size / 2.0 - offset, size / 2.0
    cx2, cy2 = size / 2.0 + offset, size / 2.0

    # زوايا مستديرة للنسخة العادية، وامتلاءٌ كامل للـmaskable.
    corner = 0.0 if maskable else size * 0.22

    rows = []
    for y in range(size):
        row = []
        py = y + 0.5
        for x in range(size):
            px = x + 0.5

            # ١) الخلفية وحدودها المستديرة
            if corner <= 0:
                bg_a = 1.0
            else:
                dx = max(corner - px, px - (size - corner), 0.0)
                dy = max(corner - py, py - (size - corner), 0.0)
                bg_a = _cover((dx * dx + dy * dy) ** 0.5, corner)

            if bg_a <= 0.0:
                row.append((0, 0, 0, 0))
                continue

            color = BG

            # ٢) الحلقتان — تغطيةُ أقربِ حافةٍ من الاثنتين
            ring = 0.0
            for (cx, cy) in ((cx1, cy1), (cx2, cy2)):
                d = (((px - cx) ** 2 + (py - cy) ** 2) ** 0.5) - radius
                ring = max(ring, _cover(abs(d), stroke / 2.0))

            if ring > 0.0:
                color = _blend(color, FG, ring)

            row.append(color + (int(round(bg_a * 255)),))
        rows.append(row)

    return _png(size, size, rows)


def main():
    out = os.path.normpath(OUT_DIR)
    os.makedirs(out, exist_ok=True)

    # ⚠️ 192 و512 إلزاميان لتثبيت التطبيق على أندرويد؛ و180 هو
    # apple-touch-icon الذي تقرؤه iOS وحدها ولا تقرأ الـmanifest له.
    targets = [
        ('icon-192.png', 192, False),
        ('icon-512.png', 512, False),
        ('icon-maskable-192.png', 192, True),
        ('icon-maskable-512.png', 512, True),
        ('apple-touch-icon.png', 180, True),
        ('favicon-32.png', 32, False),
    ]

    for name, size, maskable in targets:
        path = os.path.join(out, name)
        with open(path, 'wb') as fh:
            fh.write(render(size, maskable))
        print(f'✓ {name}  ({size}×{size})')


if __name__ == '__main__':
    main()
