// حصن الزواج — منطق الهيكل.
//
// ⚠️ لا إطار عمل ولا خطوة بناء بقرار صريح: هذا المستودع يُنشر ملفّاتٍ
// ساكنة كما هي (نفس نمط ‎site/‎ و‎webapp/‎ في مستودع البوت). ومن أضاف
// أداةَ بناءٍ هنا أضاف معها ‎node_modules‎ وقفلَ تبعياتٍ وخطوةَ نشرٍ
// تفشل وحدها — مقابل صفحةٍ واحدة لا تحتاج شيئاً من ذلك.

(function () {
  'use strict';

  // ==========================================================
  // ١) عامل الخدمة — وبه وحده يعمل التطبيق بلا شبكة
  // ==========================================================
  //
  // ⚠️ يُسجَّل بعد ‎load‎ لا قبله: التسجيل ينافس تحميل الصفحة نفسها على
  // الشبكة، فتسجيلُه مبكراً يُبطئ أوّل زيارة — وهي الزيارة الوحيدة
  // التي يقرّر فيها الزائر إن كان سيبقى.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (err) {
        // ⚠️ الفشل هنا ليس عطلاً يُوقف شيئاً: التطبيق يعمل بلا عامل
        // خدمة، ويفقد العملَ بلا اتصال وحده. ويفشل فعلاً في سياقٍ غير
        // آمن (http) وفي التصفّح الخاص على بعض المتصفّحات.
        console.warn('تعذّر تسجيل عامل الخدمة:', err);
      });
    });
  }

  // ==========================================================
  // ٢) حالة الاتصال
  // ==========================================================
  var statusEl = document.getElementById('status');
  var statusText = document.getElementById('status-text');

  function paintStatus() {
    if (!statusEl || !statusText) return;
    // ⚠️ ‎navigator.onLine‎ تقول «توجد شبكة» لا «يوجد إنترنت»: جهازٌ
    // موصولٌ بواي فاي بلا نفاذٍ خارجي يُبلغ ‎true‎. فهي مؤشّرٌ للعرض،
    // ولا يُبنى عليها قرارُ جلبٍ إطلاقاً.
    var on = navigator.onLine;
    statusEl.setAttribute('data-state', on ? 'online' : 'offline');
    statusText.textContent = on ? 'متّصل' : 'بلا اتصال — وما حُمِّل يبقى متاحاً';
  }

  window.addEventListener('online', paintStatus);
  window.addEventListener('offline', paintStatus);
  paintStatus();

  // ==========================================================
  // ٣) زرّ التثبيت
  // ==========================================================
  //
  // ⚠️ الزرّ مخفيٌّ افتراضاً ولا يُظهره إلا الحدث. وسببُ ذلك أن
  // المتصفّح وحده يقرّر أهليّة التثبيت (HTTPS، وmanifest صالح، وعامل
  // خدمة مسجَّل)، و‎iOS لا تُطلق هذا الحدث إطلاقاً‎ — التثبيت هناك
  // يدويّ من «مشاركة ← إضافة إلى الشاشة الرئيسية».
  //
  // فزرٌّ ظاهرٌ دائماً يعني زرّاً لا يفعل شيئاً عند نصف المستخدمين.
  var deferred = null;
  var installBtn = document.getElementById('install');

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();          // وإلا عرض المتصفّح نافذته الخاصة
    deferred = e;
    if (installBtn) installBtn.hidden = false;
  });

  if (installBtn) {
    installBtn.addEventListener('click', function () {
      if (!deferred) return;
      deferred.prompt();
      deferred.userChoice.finally(function () {
        // ⚠️ الحدث يُستهلك مرّةً واحدة: إعادةُ استعماله ترمي استثناءً.
        deferred = null;
        installBtn.hidden = true;
      });
    });
  }

  window.addEventListener('appinstalled', function () {
    deferred = null;
    if (installBtn) installBtn.hidden = true;
  });
})();
