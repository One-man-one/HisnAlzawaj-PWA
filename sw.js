// عامل الخدمة — ما يجعل التطبيق يعمل بلا اتصال.
//
// ============================================================
// ⚠️ الرقم أدناه هو أخطر سطرٍ في هذا المستودع
// ============================================================
// عامل الخدمة يخدم من الكاش أوّلاً، فالمستخدم لا يرى نسخةً جديدة إلا
// حين يتغيّر هذا الرقم. ومن نشر تعديلاً ونسي رفعه يبقى **كل مستخدمٍ
// مثبِّتٍ للتطبيق عالقاً على النسخة القديمة إلى الأبد** — لا يُصلحه
// تحديثُ الصفحة ولا إعادةُ فتح التطبيق، ولا شيء في الإنتاج يشير إلى
// السبب: السيرفر يحمل الجديد، والمستخدم يرى القديم.
//
// ✅ فالقاعدة: **كل دفعةٍ تمسّ ملفّاً في ‎SHELL‎ ترفع هذا الرقم.**
const VERSION = 'v45';
const CACHE = 'hisn-shell-' + VERSION;

// ⚠️ مسارات نسبيّة بلا شرطة بادئة — الاستضافة قد تكون على مسارٍ فرعي
// (‎…github.io/hisnalzawaj-pwa/‎)، و‎'/app.css'‎ هناك يشير إلى جذر
// النطاق فيعطي 404 صامتاً: التخزين يفشل، والتطبيق يعمل ما دامت
// الشبكة، ثم ينهار بلا اتصال وحده.
const SHELL = [
  '.',
  'index.html',
  'offline.html',
  'app.css',
  'app.js',
  // ⚠️ الثلاثة الجديدة في الهيكل لا خارجه: بدونها يعمل التطبيق ما
  // دامت الشبكة ثم يفتح **بلا منطقٍ إطلاقاً** بلا اتصال — أي شاشةَ
  // إقلاعٍ معلّقة، وهي أسوأ من صفحةٍ لا تفتح.
  'config.js',
  'api.js',
  'ui.js',
  'manifest.webmanifest',
  'brand/logo_mark.png',
  'icons/icon-192.png',
  'icons/favicon-32.png',
];

// ------------------------------------------------------------
// التثبيت — تخزين الهيكل
// ------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // ⚠️ ‎addAll‎ ذرّية: ملفٌّ واحد يفشل فيسقط التثبيت كلّه ويبقى
    // العامل القديم يعمل. وهو سلوكٌ مقصود هنا — هيكلٌ نصفُ مخزَّن
    // أسوأ من هيكلٍ قديمٍ كامل.
    await cache.addAll(SHELL);
    // نسخةٌ جديدة تحلّ محلّ القديمة فوراً بدل انتظار إغلاق كل
    // التبويبات. ⚠️ ومعها ‎clients.claim‎ أدناه، وإلا بقي التبويب
    // المفتوح على العامل القديم.
    await self.skipWaiting();
  })());
});

// ------------------------------------------------------------
// التفعيل — كنس الإصدارات القديمة
// ------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((n) => n.startsWith('hisn-shell-') && n !== CACHE)
        .map((n) => caches.delete(n))
    );
    await self.clients.claim();
  })());
});

// ------------------------------------------------------------
// الجلب
// ------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // ⚠️ ‎GET‎ وحدها تُخزَّن. وأي طلبٍ إلى نطاقٍ آخر يُترك للشبكة كما هو:
  // تخزينُ ردودٍ من نطاقٍ ثالث يعني ردوداً مبهمة (‎opaque‎) لا يُعرف
  // نجاحها من فشلها، فتُخزَّن صفحةُ خطأٍ ويُخدَم منها إلى الأبد.
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  // التنقّل: الشبكة أوّلاً — وإلا بقي المستخدم على صفحةٍ قديمة حتى
  // وهو متّصل. والكاش شبكةُ أمانٍ لا مصدرٌ أوّل.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put('index.html', fresh.clone());
        return fresh;
      } catch (err) {
        const cache = await caches.open(CACHE);
        return (await cache.match('index.html'))
            || (await cache.match('offline.html'))
            || Response.error();
      }
    })());
    return;
  }

  // الأصول الساكنة: من الكاش فوراً، مع تحديثٍ صامت في الخلفية.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);

    const update = fetch(req).then((res) => {
      // ⚠️ ‎res.ok‎ شرطٌ لا زينة: بدونه تُخزَّن صفحةُ 404 وتُخدَم
      // مكان الملفّ إلى أن يتغيّر ‎VERSION‎.
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);

    return hit || (await update) || Response.error();
  })());
});

// ------------------------------------------------------------
// إشعاراتُ المتصفّح (٢٤ سبتمبر ٢٠٢٦)
// ------------------------------------------------------------
// ⚠️ **النصّ يصل مشفّراً من مهمّة البوت** (`services/web_push.py` في
// مستودع البوت) ويفكّه المتصفّح قبل أن يصل هنا. وهو عامٌّ بقرار —
// «رسالةٌ جديدة» لا نصُّها: التنبيه يظهر على شاشة القفل.
//
// ⚠️ **وكلُّ `push` يُظهر تنبيهاً، بلا استثناء**: الاشتراك بـ
// `userVisibleOnly`، ودفعٌ بلا تنبيهٍ ظاهر يعاقبه المتصفّح بتنبيهٍ عامٍّ
// من عنده («تحدّث الموقع في الخلفية») ثم بسحب الإذن.
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }
  event.waitUntil(self.registration.showNotification(data.title || 'حصن الزواج', {
    body: data.body || '',
    icon: 'icons/icon-192.png',
    badge: 'icons/favicon-32.png',
    dir: 'auto',
    // ⚠️ **وسمٌ واحد**: التنبيه الجديد يحلّ محلّ القديم لا يتراكم فوقه —
    // و`renotify` كي يرنّ الهاتف مع ذلك.
    tag: 'hisn',
    renotify: true,
    data: { url: data.url || './' },
  }));
});

// الضغطُ على التنبيه: تبويبٌ مفتوح يُستعاد، وإلا يُفتح التطبيق.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || './',
                         self.registration.scope).href;
  event.waitUntil((async () => {
    const open = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of open) {
      if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
        return client.focus();
      }
    }
    return clients.openWindow(target);
  })());
});
