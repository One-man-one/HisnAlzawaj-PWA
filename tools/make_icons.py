# -*- coding: utf-8 -*-
"""
مولّد أيقونات التطبيق من **الشعار الرسمي**.

    python3 tools/make_icons.py

المصدر: ‎brand/logo_mark.png‎ — وهو نسخةٌ من ‎assets/logo_mark.png‎ في
مستودع البوت (العلامة بلا نصّ: الحصن والزوجان والقلب).

⚠️ **ولماذا العلامة لا الشعار الكامل:** ‎assets/logo.png‎ يحمل الاسم
مكتوباً تحت العلامة، وأيقونة التطبيق تُعرض في ٤٨ بكسل على شاشة
الهاتف — فالنصّ هناك ضبابٌ لا يُقرأ، ويسرق من مساحة العلامة نفسها.
واسمُ التطبيق مكتوبٌ تحت الأيقونة أصلاً في نظام التشغيل.

⚠️ **ونسخةٌ لا رابط، والفرق مقصود:** هذا المستودع واجهةٌ ساكنة تُنشر
وحدها، ولا تملك مستودع البوت وقت البناء. فالملفّ منسوخٌ هنا —
و**تحديثُ الشعار في مستودع البوت لا يصل هذه الأيقونات من نفسه**:
انسخ الملفّ وأعد التوليد.

⚠️ **ومولّدٌ لا ملفّات PNG مرفوعة وحدها:** الأيقونة تُطلب بستّة
مقاسات ونسختين (عادية وmaskable)، وكلّ تغييرٍ يعني إعادة تصدير ستّة
ملفّات يدوياً. وأوّل مرّةٍ يُنسى فيها ملفٌّ واحد تصير الأيقونة مختلفةً
على جهازٍ دون جهاز، بلا أي خطأ يدلّ على السبب. المصدر هنا كود،
والملفّات ناتجُه — وهي تُرفَع رغم ذلك لأن الاستضافة ساكنة بلا خطوة
بناء، فما لا يُرفع لا يوجد.

⚠️ **وmaskable ليست نسخةً مكبّرة:** أندرويد يقصّ الأيقونة بشكلٍ
يختاره النظام (دائرة، مربّع مستدير، قطرة)، ويضمن ظهور **الثمانين
بالمئة الوسطى** وحدها. فنسخةٌ عاديةٌ أُعلنت ‎maskable‎ يُقصّ حصنُها
فعلاً — ولذلك العلامة هنا أصغر داخل إطارٍ ممتلئ.
"""

import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..'))
SOURCE = os.path.join(ROOT, 'brand', 'logo_mark.png')
OUT_DIR = os.path.join(ROOT, 'icons')

# ⚠️ خلفيةٌ فاتحة لا خضراء: الحصن نفسه أخضرٌ داكن بإطارٍ ذهبي، ووضعُه
# على أخضرَ آخر يُذيب حدوده فلا يُقرأ في ٤٨ بكسل. والفاتح يُبرز
# الذهبيّ والداكن معاً. (نفس ‎--bg‎ في app.css.)
BG = (246, 244, 239, 255)     # #F6F4EF

# ⚠️ الرسم يتمّ في أربعة أضعاف المقاس ثم يُصغَّر: التصغير بمرشّح
# ‎LANCZOS‎ يُنعّم الحواف المائلة للحصن، أمّا الرسم في المقاس النهائي
# مباشرةً فيعطي زوايا مسنَّنة تظهر في ١٩٢ بكسل بوضوح.
SUPERSAMPLE = 4


def _rounded_mask(size, radius):
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [(0, 0), (size - 1, size - 1)], radius=radius, fill=255)
    return mask


def render(size, maskable=False, rounded=True):
    """يركّب العلامة على خلفيةٍ مربّعة بالمقاس المطلوب."""
    big = size * SUPERSAMPLE
    canvas = Image.new('RGBA', (big, big), BG)

    mark = Image.open(SOURCE).convert('RGBA')

    # ⚠️ النسبة محكومة بالقصّ لا بالذوق: في ‎maskable‎ يضمن النظام
    # الثمانين بالمئة الوسطى وحدها، فالعلامة تُصغَّر لتبقى داخلها
    # بهامش. وفي العادية الزوايا مستديرة فيكفي هامشٌ بصريّ.
    target_h = big * (0.60 if maskable else 0.74)
    scale = target_h / mark.height
    new_size = (max(1, round(mark.width * scale)),
                max(1, round(mark.height * scale)))
    mark = mark.resize(new_size, Image.LANCZOS)

    # ⚠️ توسيطٌ بصريّ لا حسابيّ: للحصن رايةٌ نحيلة في أعلاه، فالتوسيط
    # الحسابيّ يجعل الكتلة الثقيلة (جسم الحصن) تبدو هابطة. ورفعُها
    # ٢٪ يصحّح ما تراه العين.
    x = (big - mark.width) // 2
    y = (big - mark.height) // 2 - round(big * 0.02)

    canvas.alpha_composite(mark, (x, y))

    if rounded and not maskable:
        canvas.putalpha(_rounded_mask(big, round(big * 0.22)))

    return canvas.resize((size, size), Image.LANCZOS)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    # ⚠️ 192 و512 إلزاميان لتثبيت التطبيق على أندرويد؛ و180 هو
    # ‎apple-touch-icon‎ الذي تقرؤه iOS وحدها ولا تقرأ الـmanifest له
    # — وiOS تقصّ زواياه بنفسها، فيُسلَّم ممتلئاً بلا استدارة.
    targets = [
        ('icon-192.png',          192, False, True),
        ('icon-512.png',          512, False, True),
        ('icon-maskable-192.png', 192, True,  False),
        ('icon-maskable-512.png', 512, True,  False),
        ('apple-touch-icon.png',  180, False, False),
        ('favicon-32.png',         32, False, True),
    ]

    for name, size, maskable, rounded in targets:
        render(size, maskable, rounded).save(
            os.path.join(OUT_DIR, name), 'PNG', optimize=True)
        kind = 'maskable' if maskable else ('مستديرة' if rounded else 'ممتلئة')
        print(f'✓ {name}  ({size}×{size}, {kind})')


if __name__ == '__main__':
    main()
