// عنوان خدمة الوسيط — ملفٌّ واحد يُعدَّل، لا سطرٌ مبعثر في المنطق.
//
// ⚠️ **ولا سرَّ هنا ولا يجوز أن يكون.** هذا المستودع **عامّ**، وكلُّ ما
// فيه يُنزَّل إلى متصفّح كل زائر. فالعنوان وحده — أمّا الهوية فتوكنٌ
// يُصدره الوسيط لصاحبه عند الدخول، ولا يُكتب في ملفّ.
//
// ⚠️ **ولا مفتاح `API_READ_KEY` هنا أبداً**: ذاك مفتاحٌ مشترك للتشغيل،
// ووضعُه في صفحةٍ يعني نشرَه — ومعه بياناتُ كل مستخدم.

window.HISN = window.HISN || {};

// ⚠️ يُقرأ من التخزين المحلّي أوّلاً لتجربةٍ محلّية بلا تعديل ملفّ
// (`localStorage.setItem('hisn_api', 'http://127.0.0.1:8000')`)، ثم
// العنوان المنشور. وهذا لا يفتح شيئاً: من يغيّره في متصفّحه يغيّر
// خادمَ **نفسه** لا خادمَ غيره.
window.HISN.API = (function () {
  try {
    var override = window.localStorage.getItem('hisn_api');
    if (override) return override.replace(/\/+$/, '');
  } catch (e) { /* تصفّحٌ خاصّ أو تخزينٌ محجوب — العنوان المنشور يكفي */ }
  return 'https://hisn-api-production.up.railway.app';
})();

// لغةُ الواجهة. ⚠️ والنصوص لا تُكتب هنا: تأتي من `locales/` في مستودع
// البوت عبر `/api/i18n/{lang}` — الشرح في CLAUDE.md ← «لا ترجماتٍ
// مكتوبةً هنا».
window.HISN.LANG = (function () {
  try {
    var saved = window.localStorage.getItem('hisn_lang');
    if (saved) return saved;
  } catch (e) { /* لا شيء */ }
  var nav = (navigator.language || 'ar').slice(0, 2).toLowerCase();
  return ['ar', 'en', 'fr', 'es', 'fa', 'id'].indexOf(nav) >= 0 ? nav : 'ar';
})();
