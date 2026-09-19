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
    // ⚠️ **نافذة تبدّل الإصدارات — عطلٌ وقع فعلاً ورآه المستخدم.**
    //
    // التنقّل يُجلب من الشبكة أوّلاً، والأصول من الكاش أوّلاً. فأثناء
    // التحديث يرسم المتصفّح **صفحةً جديدة** بينما يخدمه العامل القديم
    // **جافاسكربت قديماً** من كاشه: عنصرٌ جديد في الصفحة لا يعرفه
    // الكود الذي يعمل، فلا يتصرّف فيه أحد.
    //
    // وقع هذا حرفياً: ظهر دليل التثبيت اليدويّ داخل تطبيقٍ مثبَّت،
    // لأن الكود الذي كان يُفترض به إخفاؤه لم يكن قد وصل الجهاز بعد.
    //
    // ✅ والعلاج إعادةُ تحميلٍ **واحدة** حين يتسلّم عاملٌ جديد التحكّم،
    // فتأتي الصفحة والكود من إصدارٍ واحد.
    var hadController = !!navigator.serviceWorker.controller;
    var reloading = false;

    navigator.serviceWorker.addEventListener('controllerchange', function () {
      // ⚠️ الشرطان معاً لا أحدهما: بلا ‎hadController‎ تُعاد صفحةُ كلّ
      // زائرٍ جديد بلا سبب (أوّل تسجيلٍ يُبدّل المتحكّم أيضاً)، وبلا
      // ‎reloading‎ تدخل الصفحة حلقةَ إعادةِ تحميلٍ لا تنتهي.
      if (!hadController || reloading) return;
      reloading = true;
      window.location.reload();
    });

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
  // ٣) التثبيت
  // ==========================================================
  //
  // ⚠️ **العطل الذي جاء منه هذا الكود:** كان الزرّ ينادي ‎prompt()‎ ثم
  // ينتظر ‎userChoice‎ ولا شيء غير ذلك. وعلى جهازٍ حقيقي (شاومي) ظهر
  // الزرّ — أي أن الحدث أُطلق فعلاً — ثم **لم تفعل الضغطة شيئاً ولم
  // تقل شيئاً**. ولا سجلّ يُقرأ ولا رسالة تظهر: مستخدمٌ يظنّ التطبيق
  // معطَّلاً وهو سليم.
  //
  // والسبب خارجُ أيدينا: متصفّحات أندرويد كثيرة نسخٌ من Chromium
  // تُطلق ‎beforeinstallprompt‎ ثم تتجاهل ‎prompt()‎ بصمت. فلا يُصلَح
  // ذلك بكودٍ «أصحّ» — يُصلَح بأن **يبقى للمستخدم طريقٌ آخر دائماً**،
  // وأن يُقال له ذلك حين يفشل الأول.

  var deferred = null;
  var installBtn = document.getElementById('install');
  var howto = document.getElementById('howto');
  var howtoSummary = document.getElementById('howto-summary');

  // ⚠️ مهلةٌ لا اتّكالَ على وعدٍ قد لا يُحسم أبداً: المتصفّح الذي
  // يتجاهل ‎prompt()‎ لا يرفض ‎userChoice‎ ولا يحسمها — تبقى معلّقة
  // إلى الأبد، وهو بالضبط شكلُ العطل الذي وقع.
  var PROMPT_TIMEOUT_MS = 1200;

  function openManual(reason) {
    if (!howto) return;
    if (howtoSummary && reason) howtoSummary.textContent = reason;
    howto.open = true;
    howto.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // هل هو مفتوحٌ أصلاً كتطبيقٍ مثبَّت؟
  function isInstalled() {
    return (window.matchMedia
            && window.matchMedia('(display-mode: standalone)').matches)
        || window.navigator.standalone === true;   // سفاري على iOS
  }

  function syncInstalledState() {
    // ⚠️ إخفاء الدليل مقصود: عرضُ «كيف أثبّته» داخل تطبيقٍ مثبَّت
    // يجعل المستخدم يشكّ أن التثبيت لم ينجح.
    if (howto) howto.hidden = isInstalled();
  }

  syncInstalledState();

  // ⚠️ ولا يكفي الفحص مرّةً عند الإقلاع: الصفحة نفسها قد تنتقل إلى
  // الوضع المستقلّ وهي مفتوحة (تثبيتٌ من قائمة المتصفّح)، فتبقى
  // شاشةُ تطبيقٍ مثبَّت تعرض «كيف أثبّته».
  if (window.matchMedia) {
    var mq = window.matchMedia('(display-mode: standalone)');
    if (mq.addEventListener) mq.addEventListener('change', syncInstalledState);
    else if (mq.addListener) mq.addListener(syncInstalledState);   // متصفّحات أقدم
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();          // وإلا عرض المتصفّح نافذته الخاصة
    deferred = e;
    if (installBtn) installBtn.hidden = false;
  });

  if (installBtn) {
    installBtn.addEventListener('click', function () {
      if (!deferred) {
        openManual('المتصفّح لا يعرض التثبيت التلقائي — إليك الطريقة اليدوية');
        return;
      }

      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        openManual('لم يستجب المتصفّح — إليك الطريقة اليدوية');
      }, PROMPT_TIMEOUT_MS);

      function done(manualReason) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (manualReason) openManual(manualReason);
      }

      try {
        deferred.prompt();
      } catch (err) {
        // ⚠️ الحدث يُستهلك مرّةً واحدة: إعادةُ استعماله ترمي استثناءً.
        done('تعذّر فتح نافذة التثبيت — إليك الطريقة اليدوية');
        deferred = null;
        return;
      }

      deferred.userChoice.then(function (choice) {
        done(choice && choice.outcome === 'accepted'
             ? null
             : 'أُلغي التثبيت — ويمكنك فعله يدوياً متى شئت');
        if (choice && choice.outcome === 'accepted' && installBtn) {
          installBtn.hidden = true;
        }
        deferred = null;
      }).catch(function () {
        done('تعذّر إكمال التثبيت — إليك الطريقة اليدوية');
        deferred = null;
      });
    });
  }

  window.addEventListener('appinstalled', function () {
    deferred = null;
    if (installBtn) installBtn.hidden = true;
    if (howto) howto.hidden = true;
  });

})();
