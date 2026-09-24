// حصن الزواج — منطق التطبيق: البوّابة، والرزمة، والتبويبات.
//
// (‎app.js‎ يبقى لما لا يخصّ شاشةً بعينها: عامل الخدمة، وحالة
// الاتصال، والتثبيت. وفصلُهما ليس ترتيباً: ذاك يعمل ولو لم يوجد
// وسيطٌ أصلاً، وهذا لا معنى له بلا وسيط.)
//
// ⚠️ **ولا نصَّ مترجَماً هنا** — القاعدة في CLAUDE.md: النصوص من
// ‎/api/i18n/{lang}‎ وحده. وما تراه من عربيةٍ في هذا الملفّ تعليقاتٌ
// وأسماءُ مفاتيح، لا شيءٌ يظهر للمستخدم.

(function () {
  'use strict';

  var api = window.HISN.api;
  var LANG = window.HISN.LANG;

  // ==========================================================
  // ١) النصوص — من الوسيط، ونسخةٌ محلّية كي تعمل بلا اتصال
  // ==========================================================
  //
  // ⚠️ **والنسخة المحلّية ليست «ترجماتٍ هنا»:** لا تُكتب في مستودع،
  // ولا تُحرَّر بيد، ولا تعيش إلا في متصفّح صاحبها — هي ذاكرةُ آخر ما
  // أرسله الوسيط. ومصدرُها ‎locales/‎ في مستودع البوت كما هو.
  //
  // ⚠️ وبدونها تفتح الشاشةُ **فارغةً** بلا اتصال: عامل الخدمة يخزّن
  // الصفحة والأنماط، ولا يخزّن ردَّ الوسيط.
  var STRINGS = {};
  var CACHE_KEY = 'hisn_strings_' + LANG;

  function readCache() {
    try {
      var raw = window.localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function writeCache(strings) {
    try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(strings)); }
    catch (e) { /* تخزينٌ ممتلئ أو محجوب — الشاشة تعمل ما دامت الشبكة */ }
  }

  // ⚠️ المفتاح الناقص يظهر **باسمه** لا فارغاً: شاشةٌ فيها فراغٌ صامت
  // لا يعرف أحدٌ أن فيها عطلاً، وشاشةٌ فيها ‎web.like‎ تُبلغ عن نفسها.
  function T(key, vars) {
    var text = STRINGS[key];
    if (text === undefined || text === null) return key;
    if (vars) {
      Object.keys(vars).forEach(function (name) {
        text = text.split('{' + name + '}').join(vars[name]);
      });
    }
    return text;
  }

  // ⚠️ **والاتّجاه يتبع اللغة، وإلا قرأ الإنجليزيُّ صفحةً معكوسة.**
  // الصفحة تبدأ `rtl` لأن العربية هي الأكثر، فمن فتحها بمتصفّحٍ
  // إنجليزي كان يرى الأزرار والقوائم من اليمين — وهو عطلٌ لا يشتكي:
  // الشاشة سليمة، والقارئ وحده هو المقلوب.
  var RTL = ['ar', 'fa', 'ur', 'he'];

  function applyDirection() {
    var root = document.documentElement;
    root.setAttribute('lang', LANG);
    root.setAttribute('dir', RTL.indexOf(LANG) >= 0 ? 'rtl' : 'ltr');
  }

  function paint(root) {
    (root || document).querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = T(el.getAttribute('data-i18n'));
    });
  }

  // ==========================================================
  // ٢) أدوات الشاشة
  // ==========================================================
  var $ = function (id) { return document.getElementById(id); };

  var toastTimer = null;
  // ✅ اهتزازةٌ قصيرة لما يستحقّ الانتباه وحده (تطابق، رسالةٌ واردة) —
  // لا لكل سحبة، فتفقد معناها. ⚠️ و`navigator.vibrate` غائبٌ في سفاري
  // (iOS) كلّه، ويرمي في بعض المتصفّحات قبل أوّل لمسة: فتُبتلع.
  function buzz() {
    try { if (navigator.vibrate) navigator.vibrate(30); } catch (e) { /* لا شيء */ }
  }

  // `ms` لما يطول نصُّه (فاصلُ العشوائيّ جملةٌ لا كلمة) — ثانيتان
  // ونصف لا تكفيان لقراءتها، فتختفي قبل أن تُفهم.
  function toast(text, ms) {
    var el = $('toast');
    el.textContent = text;
    el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('on'); }, ms || 2400);
  }

  // ⚠️ **النصّ يُركَّب عقدةً لا سلسلةَ HTML.** بطاقاتُ الناس نصٌّ
  // كتبوه بأنفسهم (الاسم، النبذة)، و`innerHTML` عليه يعني أن نبذةً
  // فيها وسمٌ تصير كوداً يعمل في صفحة غيره — وهي عينُ الثغرة التي
  // تحمل التوكن من التخزين المحلّي إلى خادمٍ بعيد.
  function lines(container, text) {
    String(text || '').split('\n').forEach(function (line) {
      if (!line.trim()) return;
      var row = document.createElement('div');
      row.className = 'pcard__line';
      row.textContent = line;
      container.appendChild(row);
    });
  }

  function errorText(err) {
    if (!err) return T('web.err_generic');
    if (err.code === 'network') return T('web.err_network');
    if (err.status === 401) return T('web.err_auth');
    if (err.status === 403) return T('web.err_invite');
    // ⚠️ **الرسالة تتبع الحقل الذي يسمّيه الخادم** (`field`) لا تخميناً:
    // كانت كلُّ 400 «سنةَ ميلادٍ غير صالحة» — فرفضُ اسمٍ فيه أرقام يُخبر
    // صاحبه أن سنته خاطئة. والخادم لا يعيد نصَّ الخطأ بقرار (قد يحمل
    // القيمة كما أُرسلت)، ويعيد اسمَ الحقل وحده.
    if (err.status === 400) {
      var field = err.data && err.data.field;
      if (field === 'full_name') return T('web.err_name');
      if (field === 'preferred_age') return T('web.err_age_range');
      if (field === 'birth_year' || !field) return T('web.err_birth_year');
      return T('web.err_field');
    }
    return T('web.err_generic');
  }

  // ==========================================================
  // ٣) البوّابة
  // ==========================================================
  function showGate() {
    // ⚠️ **ويتوقّف الاستطلاع عند كل مغادرة**: مؤقّتٌ ينجو من الخروج
    // يسأل الخادمَ بتوكنٍ باطل إلى الأبد.
    stopChatPolling();
    document.body.classList.remove('is-app');
    $('boot').hidden = true;
    $('app').hidden = true;
    $('complete').hidden = true;
    $('gate').hidden = false;
  }

  // ⚠️ **شاشةٌ ثالثة لا خطوةٌ داخل التطبيق، بقرار:** صاحب الحساب
  // الناقص **لا يظهر لأحد ولا يُقترح عليه أحد** — فلو أدخلناه إلى
  // التبويبات لَرأى رزمةً فارغة و«لا مطابقات» ولم يعرف أن السبب هو
  // ملفُّه لا قلّة الناس. والشاشة تقول له ذلك في سطرٍ واحد.

  var schemaGender = null;   // آخرُ جنسٍ رُسم به النموذج
  var SCHEMA = {};           // الوصفُ كما وصل، بالاسم — تقرؤه `fillGrouped`

  function showComplete() {
    document.body.classList.remove('is-app');
    $('boot').hidden = true;
    $('gate').hidden = true;
    $('app').hidden = true;
    $('complete').hidden = false;
    langPicker($('complete-lang'));
    renderSchema().then(prefillComplete);
  }

  // ⚠️ **مستخدمُ البوت القديم لا يعيد كتابة ملفّه** (البند ١١ في
  // `docs/PRE_ADS_FIXES.md`): يدخل الموقع فيُطلب منه ما نقص — سؤالٌ أُضيف
  // بعد تسجيله — وكانت الشاشة تعرض الأسئلة كلَّها فارغة. فما أجاب عنه
  // يُملأ من الوسيط (`/api/me/profile/prefill`)، والناقصُ وحده يبقى فارغاً.
  //
  // ⚠️ **وما كتبه في الشاشة لا يُمحى**: الردُّ قد يصل بعد أن بدأ الكتابة،
  // فيُملأ الفارغُ وحده. ⚠️ **والجنسُ أوّلاً**: سؤالُ الحجاب لا يُرسم إلا
  // للنساء، فمن جنسُها معروف يُعاد رسمُ النموذج بجنسها قبل الملء.
  // ⚠️ **وعونٌ لا شرط**: وسيطٌ أقدم بلا المسار، أو عطلٌ، = الشاشة كما كانت.
  function prefillComplete() {
    if (editMode || !api.profilePrefill) return;
    api.profilePrefill().then(function (d) {
      var values = (d && d.values) || {};
      if (!Object.keys(values).length || editMode) return;
      var fill = function () {
        var typed = collect();
        var todo = {};
        Object.keys(values).forEach(function (name) {
          if (typed[name] === undefined) todo[name] = values[name];
        });
        restore(todo);
      };
      if (values.gender && values.gender !== schemaGender && !collect().gender) {
        return renderSchema(values.gender).then(fill);
      }
      fill();
    }).catch(function () { /* الشاشةُ فارغةٌ كما كانت */ });
  }

  // ==========================================================
  // موافقةُ النشر العام — آخرُ خطوةٍ في التسجيل، كما في البوت
  // ==========================================================
  // ⚠️ **وأيُّ عطلٍ هنا يُكمل إلى التطبيق لا يحبس صاحبه**: الملفُّ حُفظ
  // قبل هذه الشاشة، وشاشةٌ عالقة بعد عشرين سؤالاً أسوأ من شاشةٍ غائبة.
  // ومن لم يختر يبقى على افتراض البوت نفسه (النشر، بعد مراجعة المشرف).
  function showConsent() {
    // ⚠️ **وكلُّ مخرجٍ من هنا يمرّ بالتفضيلات** — لا الزرّ وحده: موافقةٌ
    // غائبة أو عطلٌ كانا يقفزان إلى التطبيق فيفوت صاحبَهما «من تبحث عنه؟».
    api.publishConsent().then(function (data) {
      if (!data || !data.available) { showPrefs(true); return; }
      $('complete').hidden = true;
      $('consent-text').textContent = data.text;
      $('consent-yes').textContent = data.yes;
      $('consent-no').textContent = data.no;
      $('consent-yes').hidden = $('consent-no').hidden = false;
      $('consent-go').hidden = true;
      $('consent').hidden = false;
      window.scrollTo(0, 0);
    }).catch(function () { showPrefs(true); });
  }

  function chooseConsent(publish) {
    $('consent-yes').disabled = $('consent-no').disabled = true;
    api.publishChoice(publish).then(function (out) {
      $('consent-text').textContent = (out && out.message) || '';
      $('consent-yes').hidden = $('consent-no').hidden = true;
      $('consent-go').hidden = false;
    }).catch(function (err) {
      toast(errorText(err));
    }).then(function () {
      $('consent-yes').disabled = $('consent-no').disabled = false;
    });
  }

  function bindConsent() {
    $('consent-yes').addEventListener('click', function () { chooseConsent(true); });
    $('consent-no').addEventListener('click', function () { chooseConsent(false); });
    // ✅ **ومن الموافقة إلى «من تبحث عنه؟» لا إلى التطبيق مباشرةً** — الشرح
    // عند `showPrefs`. وهي تُكمل إلى التطبيق بنفسها عند التخطّي أو العطل.
    $('consent-go').addEventListener('click', function () {
      $('consent').hidden = true;
      showPrefs(true);
    });
  }

  function renderSchema(gender) {
    var host = $('complete-fields');
    host.textContent = '';
    var wait = document.createElement('p');
    wait.className = 'empty';
    wait.textContent = T('web.loading');
    host.appendChild(wait);

    // ⚠️ **ويُعاد الوعد لا يُبتلع** — والسبب عطلٌ وقع: إعادةُ رسم
    // النموذج بعد اختيار الجنس تجلب المخطَّط من الشبكة، ومن أعاد
    // القيم المحفوظة بـ`setTimeout(0)` أعادها **قبل** أن تُرسم
    // الحقول فضاعت كلُّها — ومنها الجنس نفسه. فيمنع المتصفّح الإرسال
    // لحقلٍ مطلوبٍ فارغ، ولا يعمل معالجُنا، ولا تظهر رسالة: ضغطةٌ لا
    // تفعل شيئاً ولا تقول شيئاً.
    return api.profileSchema(LANG, gender).then(function (data) {
      schemaGender = gender || null;
      host.textContent = '';
      SCHEMA = {};
      (data.fields || []).forEach(function (spec) {
        SCHEMA[spec.name] = spec;
        host.appendChild(fieldNode(spec));
      });
    }).catch(function (err) {
      if (err.code === 'unauthorized') return boot();
      host.textContent = '';
      var line = document.createElement('p');
      line.className = 'fld__err';
      line.textContent = errorText(err);
      host.appendChild(line);
    });
  }

  // ⚠️ **يُبنى من وصف الحقل لا من `innerHTML`**: عناوين الخيارات نصٌّ
  // يأتي من الوسيط، ولصقُه سلسلةَ HTML يجعل أي وسمٍ فيه كوداً يعمل في
  // الصفحة — وهي الثغرة التي تقرأ التوكن من التخزين المحلّي.
  function fieldNode(spec) {
    var wrap = document.createElement('label');
    wrap.className = 'fld';
    wrap.setAttribute('data-field', spec.name);

    // ⚠️ **والعنوان نصٌّ جاهز من الوسيط لا مفتاحٌ يُترجَم هنا.** كان
    // `T(spec.label_key)`، و`/api/i18n` لا يشحن إلا مفاتيح `web.*` —
    // فظهر خمسةَ عشرَ عنواناً بمفتاحه الخام على الشاشة
    // (`lbl.nationality`، `lbl.religion`، `lbl.job`…). والمفاتيح
    // موجودةٌ في اللغات الستّ، لكنها لا تعبر الشبكة.
    var title = document.createElement('span');
    title.textContent = spec.label
                        + (spec.required ? '' : ' (' + T('web.optional') + ')');
    wrap.appendChild(title);

    var input;
    if (spec.kind === 'choice') {
      input = document.createElement('select');
      // ⚠️ خيارٌ فارغ أوّلاً: بدونه يبدو أوّلُ الخيارات مُجاباً عنه —
      // وهو بالضبط ما جعل «ذكر» يُسجَّل بلا أن يسأله أحد.
      input.appendChild(new Option('—', ''));
      (spec.options || []).forEach(function (o) {
        input.appendChild(new Option(o.label, o.key));
      });
      // ⚠️ **والمذهب يتبع الدين كما تتبع المدينةُ الدولة.** وخياراته
      // تصل مجموعةً (تسعةٌ في المجموع) فلا تحتاج رحلةً ثانية.
      if (spec.options_by) {
        input.disabled = true;
        input.setAttribute('data-grouped', spec.depends_on || '');
      }
      if (spec.name === 'gender') {
        input.addEventListener('change', function () {
          // الحجاب يظهر للنساء وحدهنّ — والشرط عند الوسيط لا هنا.
          if (input.value && input.value !== schemaGender) {
            var kept = collect();
            renderSchema(input.value).then(function () {
              restore(kept);
              // ⚠️ إعادةُ الرسم تمحو التحديد الأحمر — فيُعاد إن سبق إرسال.
              var fm = $('form-complete');
              if (fm.dataset.tried) markMissing(fm);
            });
          }
        });
      }
      if (spec.name === 'country') {
        input.addEventListener('change', function () { loadCities(input.value); });
      }
      if (spec.name === 'religion') {
        input.addEventListener('change', function () { fillGrouped('religion'); });
      }
    } else if (spec.kind === 'city') {
      input = document.createElement('select');
      input.appendChild(new Option('—', ''));
      input.disabled = true;
    } else if (spec.kind === 'multi') {
      input = document.createElement('select');
      input.multiple = true;
      input.size = Math.min(6, (spec.options || []).length || 3);
      (spec.options || []).forEach(function (o) {
        input.appendChild(new Option(o.label, o.key));
      });
    } else if (spec.kind === 'textarea') {
      input = document.createElement('textarea');
      input.rows = 3;
      if (spec.max) input.maxLength = spec.max;
    } else {
      input = document.createElement('input');
      input.type = (spec.kind === 'year' || spec.kind === 'number')
                   ? 'number' : 'text';
      if (spec.kind === 'year') {
        var now = new Date().getFullYear();
        input.min = now - 80; input.max = now - 19;
      }
      if (spec.min !== undefined) input.min = spec.min;
      if (spec.max !== undefined && spec.kind === 'number') input.max = spec.max;
      if (spec.max && spec.kind === 'text') input.maxLength = spec.max;
      if (spec.kind === 'number' || spec.kind === 'year') input.inputMode = 'numeric';
    }

    input.name = spec.name;
    if (spec.required) input.required = true;
    wrap.appendChild(input);
    if (spec.kind === 'multi' || CHIP_FIELDS.indexOf(spec.name) !== -1) {
      wrap.appendChild(chipsFor(input));
    }
    return wrap;
  }

  // ✅ **الاختيارُ أزرارٌ تُضغط لا قائمةٌ منسدلة** (بطلب صاحب المشروع، ٢٣
  // سبتمبر ٢٠٢٦) — الشخصيةُ واللغاتُ (متعدّدة) والمهنةُ (واحدة)، بشكل
  // أزرار البحث المتقدّم. `<select multiple>` على الهاتف قائمةٌ لا يُرى
  // فيها ما اختير بعد إغلاقها، وعشرون مهنةً في منسدلةٍ تُقرأ سطراً سطراً.
  //
  // ⚠️ **والقائمةُ باقيةٌ تحت الأزرار ومصدرُ الحقيقة**: `collect` و`restore`
  // وفحصُ `required` في المتصفّح كلُّها تقرؤها كما كانت، والأزرار مرآةٌ
  // لها لا نسخةٌ ثانية من الحالة. ومرآتان تتباعدان إن كتبت إحداهما
  // وحدها — فالأزرار تكتب في القائمة، وترسم نفسها من حدثها `change`.
  var CHIP_FIELDS = ['job_title'];

  function chipsFor(select) {
    // ⚠️ مخفيّةٌ بصرياً لا `display:none`: المتصفّح لا يعرض تنبيهَ
    // «هذا الحقل مطلوب» لحقلٍ لا يُرسم، فيرفض الإرسال بلا أي رسالة.
    select.classList.add('sr-select');
    select.tabIndex = -1;
    var box = document.createElement('div');
    box.className = 'chips';

    function paint() {
      box.querySelectorAll('.chip').forEach(function (chip) {
        var opt = select.querySelector('option[value="' +
                                       chip.getAttribute('data-key') + '"]');
        var on = !!(opt && opt.selected && opt.value);
        chip.classList.toggle('on', on);
        chip.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    Array.prototype.forEach.call(select.options, function (o) {
      if (!o.value) return;
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = o.text;
      chip.setAttribute('data-key', o.value);
      chip.addEventListener('click', function () {
        if (select.multiple) o.selected = !o.selected;
        else select.value = (select.value === o.value) ? '' : o.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
      box.appendChild(chip);
    });
    select.addEventListener('change', paint);
    paint();
    return box;
  }

  // يملأ كلَّ حقلٍ خياراتُه مجموعةٌ بمفتاحِ حقلٍ آخر (المذهب بالدين).
  function fillGrouped(parentName, preselect) {
    var parent = document.querySelector(
      '#complete-fields [name="' + parentName + '"]');
    if (!parent) return;

    document.querySelectorAll(
      '#complete-fields [data-grouped="' + parentName + '"]').forEach(
      function (select) {
        var spec = SCHEMA[select.name] || {};
        var groups = spec.options_by || {};
        var options = groups[parent.value] || [];
        select.textContent = '';
        select.appendChild(new Option('—', ''));
        options.forEach(function (o) {
          select.appendChild(new Option(o.label, o.key));
        });
        // ⚠️ **ويبقى معطَّلاً بلا خيارات، لا فارغاً قابلاً للفتح**:
        // قائمةٌ تُفتح على لا شيء تبدو عطلاً، والحقل هنا اختياريّ أصلاً.
        select.disabled = options.length === 0;
        if (preselect) select.value = preselect;
      });
  }

  function loadCities(country, preselect) {
    var select = document.querySelector('#complete-fields [name="city"]');
    if (!select) return;
    select.textContent = '';
    select.appendChild(new Option('—', ''));
    select.disabled = true;
    if (!country) return;

    api.cities(country, LANG).then(function (data) {
      (data.cities || []).forEach(function (c) {
        select.appendChild(new Option(c.label, c.key));
      });
      select.disabled = false;
      if (preselect) select.value = preselect;
    }).catch(function () { /* تبقى معطَّلة، والخادم يرفض الفراغ */ });
  }

  function collect() {
    var out = {};
    document.querySelectorAll('#complete-fields [name]').forEach(function (el) {
      if (el.multiple) {
        var picked = [];
        Array.prototype.forEach.call(el.selectedOptions, function (o) {
          picked.push(o.value);
        });
        if (picked.length) out[el.name] = picked;
      } else if (el.value !== '') {
        out[el.name] = el.type === 'number' ? parseInt(el.value, 10) : el.value;
      }
    });
    return out;
  }

  // ⚠️ **وإعادةُ ما أُدخل ليست تجميلاً**: النموذج يُعاد رسمُه عند اختيار
  // الجنس (الحجاب)، فما لم يُعَد ضاع — وخمسةٌ وعشرون سؤالاً تُملأ مرّتين
  // بابٌ يُترك عنده.
  function restore(values) {
    var kept = values || {};
    Object.keys(kept).forEach(function (name) {
      var el = document.querySelector('#complete-fields [name="' + name + '"]');
      if (!el) return;

      if (el.multiple) {
        // الاختيارُ المتعدّد لا يُعاد بإسنادٍ واحد
        var wanted = kept[name] || [];
        Array.prototype.forEach.call(el.options, function (o) {
          o.selected = wanted.indexOf(o.value) !== -1;
        });
        // الإسنادُ لا يُطلق `change` — والأزرار ترسم نفسها منه.
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }

      // ⚠️ والمدينة تُعاد **بعد** أن تصل قائمتُها: إسنادٌ إلى قائمةٍ
      // فارغة يسقط صامتاً فتعود المدينة فارغةً بلا سبب ظاهر. والمذهب
      // مثلُها — قائمتُه تُبنى من الدين لا من المخطَّط.
      if (name === 'city' || name === 'sect') return;

      el.value = kept[name];
      if (CHIP_FIELDS.indexOf(name) !== -1) {
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (name === 'country') loadCities(el.value, kept.city);
      if (name === 'religion') fillGrouped('religion', kept.sect);
    });
  }

  function showApp() {
    document.body.classList.add('is-app');
    $('boot').hidden = true;
    $('gate').hidden = true;
    $('complete').hidden = true;
    $('app').hidden = false;
    openTab('browse');
    startBell();
  }

  // ==========================================================
  // الإشعارات — الجرس والصندوق
  // ==========================================================
  var bellTimer = null;
  var lastMatch = null;

  // ==========================================================
  // «تعديل بياناتي» — شاشةُ الإكمال نفسها في وضع التعديل
  // ==========================================================
  // ⚠️ **شاشةٌ واحدة لا اثنتان بقرار**: بانيةُ الحقول (`fieldNode`)،
  // والمدنُ التابعة للدولة، و`restore` — كلُّها كُتبت للإكمال وأصلحت أعطالاً
  // موثّقة فوقها. ونسخةٌ ثانية للتعديل كانت ستعيد تلك الأعطال في الثانية.
  // والفرقُ ثلاثة: مصدرُ الحقول (`/api/me/profile/edit` بقيمها وبحقول
  // البوت وحدها)، ومسارُ الحفظ، وزرُّ الخروج (إغلاقٌ لا تسجيلُ خروج).
  var editMode = false;

  function showEdit() {
    editMode = true;
    document.body.classList.remove('is-app');
    $('app').hidden = true;
    $('complete').hidden = false;
    document.querySelector('#complete .brand__name').textContent = T('web.edit_profile');
    document.querySelector('#complete .brand__line').hidden = true;
    $('complete-out').textContent = T('web.close');
    window.scrollTo(0, 0);

    var host = $('complete-fields');
    host.textContent = T('web.loading');
    api.profileEditForm().then(function (data) {
      host.textContent = '';
      SCHEMA = {};
      var values = {};
      (data.fields || []).forEach(function (spec) {
        SCHEMA[spec.name] = spec;
        host.appendChild(fieldNode(spec));
        if (spec.value !== null && spec.value !== undefined && spec.value !== '') {
          values[spec.name] = spec.value;
        }
      });
      restore(values);
    }).catch(function (err) {
      if (err.code === 'unauthorized') return boot();
      host.textContent = errorText(err);
    });
  }

  function leaveEdit(saved) {
    editMode = false;
    document.querySelector('#complete .brand__name').textContent = T('web.complete_title');
    document.querySelector('#complete .brand__line').hidden = false;
    $('complete-out').textContent = T('web.logout');
    showApp();
    openTab('profile');
    if (saved) toast(T('web.saved'));
  }

  // ==========================================================
  // «تفضيلات الشريك» — الشاشةُ نفسها في وضعٍ ثالث (٢٤ سبتمبر ٢٠٢٦)
  // ==========================================================
  // ⚠️ **ولماذا وُجدت: عطلٌ صامت.** من سجّل من الموقع لم يكن له بابٌ إلى
  // تفضيلاته، فبقيت كلُّها فارغة — وفلترُ «المقترحون لك» لا يطبّق فارغاً،
  // فكان مقترحوه كلَّ من هو من الجنس الآخر.
  //
  // ⚠️ **وهي التفضيلاتُ المحفوظة لا مرشّحاتُ شاشة**: الحقولُ وخياراتُها
  // وقيمُها من الوسيط (`/api/me/preferences` — قائمةُ «تعديل تفضيلاتي» في
  // البوت نفسها)، وما يُحفظ هنا يراه البوت. فلا قائمةَ مكتوبةً في الصفحة.
  //
  // ✅ **وتُعرض بعد الإكمال مباشرةً ويجوز تخطّيها**، لا في الملفّ وحده:
  // من لا يعرف أنها موجودة لا يفتحها، فيبقى بلا فلتر.
  var prefsMode = false;
  var prefsAfterSignup = false;
  var PREFS = [];
  var PREF_ANY = '';

  function showPrefs(afterSignup) {
    prefsMode = true;
    prefsAfterSignup = !!afterSignup;
    document.body.classList.remove('is-app');
    ['boot', 'gate', 'app', 'consent'].forEach(function (id) { $(id).hidden = true; });
    $('complete').hidden = false;
    document.querySelector('#complete .brand__name').textContent = T('web.prefs_title');
    var why = document.querySelector('#complete .brand__line');
    why.textContent = T('web.prefs_why');
    why.hidden = false;
    document.querySelector('#form-complete button[type="submit"]').textContent = T('web.prefs_save');
    // ⚠️ **بعد التسجيل «تخطَّ» لا «إغلاق»**: الشاشةُ عرضٌ لا حاجز، ومن
    // لا يريدها الآن يمضي إلى التطبيق بلا أن يظنّ أنه يُلغي تسجيله.
    $('complete-out').textContent = T(afterSignup ? 'web.prefs_skip' : 'web.close');
    $('form-complete').querySelector('[data-err]').hidden = true;
    delete $('form-complete').dataset.tried;
    window.scrollTo(0, 0);

    var host = $('complete-fields');
    host.textContent = T('web.loading');
    api.prefsForm().then(function (data) {
      host.textContent = '';
      PREFS = (data && data.fields) || [];
      PREF_ANY = (data && data.any_label) || T('web.pref_any');
      PREFS.forEach(function (spec) { host.appendChild(prefNode(spec)); });
    }).catch(function (err) {
      if (err.code === 'unauthorized') return boot();
      // ⚠️ **بعد التسجيل لا تحبس صاحبها**: وسيطٌ أقدم بلا المسار (404)
      // أو عطلٌ = يمضي إلى التطبيق كما كان يمضي قبل هذه الشاشة.
      if (prefsAfterSignup) return leavePrefs(false);
      host.textContent = errorText(err);
    });
  }

  function leavePrefs(saved) {
    var afterSignup = prefsAfterSignup;
    prefsMode = false;
    prefsAfterSignup = false;
    document.querySelector('#complete .brand__name').textContent = T('web.complete_title');
    document.querySelector('#complete .brand__line').textContent = T('web.complete_why');
    document.querySelector('#form-complete button[type="submit"]').textContent = T('web.complete_btn');
    $('complete-out').textContent = T('web.logout');
    if (afterSignup) {
      boot();
    } else {
      showApp();
      openTab('profile');
    }
    if (saved) toast(T('web.saved'));
  }

  // حقلٌ واحد — والبناءُ بـ`fieldNode` نفسها حيث يصلح، لا بانيةٌ ثانية.
  function prefNode(spec) {
    if (spec.kind === 'range') return prefRange(spec);

    var wrap = fieldNode({
      name: spec.name, label: spec.label, options: spec.options,
      // `marriage` قائمةٌ متعدّدة إلزاميّة — والباقي اختياريٌّ كلُّه.
      kind: spec.kind === 'choice' ? 'choice' : 'multi',
      required: !!spec.required
    });
    // ⚠️ **بلا «(اختياري)» بعد كل عنوان**: كلُّ تفضيلٍ هنا اختياريّ
    // و«لا يهمّني» هي معنى الفراغ — فالكلمة تتكرّر اثنتي عشرة مرّة بلا خبر.
    wrap.querySelector('span').textContent = spec.label;
    var input = wrap.querySelector('[name]');

    if (spec.kind === 'choice') {
      // الخيارُ الفارغ «لا يهمّني» لا «—»: هو جوابٌ هنا لا سؤالٌ لم يُجَب.
      input.options[0].text = PREF_ANY;
      input.value = spec.value || '';
      return wrap;
    }

    var picked = spec.value || [];
    Array.prototype.forEach.call(input.options, function (o) {
      o.selected = picked.indexOf(o.value) !== -1;
    });
    var box = wrap.querySelector('.chips');
    // ⚠️ **ما لا يُنزع يُعطَّل زرُّه** (التعدد على المتزوّج — `locked` من
    // الوسيط): زرٌّ يُطفأ ثم يعود عند الحفظ بلا تفسير يبدو عطلاً.
    (spec.locked || []).forEach(function (key) {
      var chip = box.querySelector('.chip[data-key="' + key + '"]');
      if (chip) chip.disabled = true;
    });
    if (!spec.required) box.insertBefore(anyChip(input), box.firstChild);
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return wrap;
  }

  // «لا يهمّني» زرٌّ في أوّل القائمة المتعدّدة: مضاءٌ حين لا يُختار شيء،
  // وضغطُه يمسح الاختيار — فالفراغُ يُرى جواباً لا نسياناً.
  function anyChip(select) {
    var chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = PREF_ANY;
    function paint() {
      var none = !select.selectedOptions.length;
      chip.classList.toggle('on', none);
      chip.setAttribute('aria-pressed', none ? 'true' : 'false');
    }
    chip.addEventListener('click', function () {
      Array.prototype.forEach.call(select.options, function (o) { o.selected = false; });
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    select.addEventListener('change', paint);
    return chip;
  }

  function prefRange(spec) {
    var wrap = document.createElement('div');
    wrap.className = 'fld';
    wrap.setAttribute('data-field', spec.name);
    var title = document.createElement('span');
    title.textContent = spec.label;
    wrap.appendChild(title);
    var row = document.createElement('div');
    row.className = 'search__age';
    [['min', 'web.age_from'], ['max', 'web.age_to']].forEach(function (pair) {
      var input = document.createElement('input');
      input.type = 'number';
      input.inputMode = 'numeric';
      input.name = spec.name + '__' + pair[0];
      input.placeholder = T(pair[1]);
      input.setAttribute('aria-label', T(pair[1]));
      if (spec.min !== undefined) input.min = spec.min;
      if (spec.max !== undefined) input.max = spec.max;
      if (spec.value && spec.value[pair[0]]) input.value = spec.value[pair[0]];
      row.appendChild(input);
    });
    wrap.appendChild(row);
    return wrap;
  }

  // ⚠️ **كلُّ تفضيلٍ يُرسَل، والفارغُ `null` أو `[]`** — لا يُحذف كما
  // يحذفه `collect`: الوسيط لا يمسّ ما لم يُرسَل، فمن مسح اختياراً
  // وحذفناه من الطلب بقي اختيارُه القديم محفوظاً وهو يظنّه ممسوحاً.
  function prefsCollect() {
    var out = {};
    PREFS.forEach(function (spec) {
      var q = function (name) {
        return document.querySelector('#complete-fields [name="' + name + '"]');
      };
      if (spec.kind === 'range') {
        var lo = q(spec.name + '__min').value, hi = q(spec.name + '__max').value;
        out[spec.name] = (lo === '' && hi === '') ? null
          : { min: parseInt(lo, 10), max: parseInt(hi, 10) };
        return;
      }
      var el = q(spec.name);
      if (!el) return;
      if (el.multiple) {
        out[spec.name] = Array.prototype.map.call(el.selectedOptions,
                                                  function (o) { return o.value; });
      } else {
        out[spec.name] = el.value || null;
      }
    });
    return out;
  }

  // المدى نصفين: الحدّان معاً أو لا شيء، والأدنى لا يتجاوز الأعلى —
  // يُقال هنا قبل الشبكة، والخادمُ يرفض الأمرين أيضاً (`partner_prefs._clean`).
  function prefsRangeError() {
    for (var i = 0; i < PREFS.length; i++) {
      var spec = PREFS[i];
      if (spec.kind !== 'range') continue;
      var lo = document.querySelector('#complete-fields [name="' + spec.name + '__min"]').value;
      var hi = document.querySelector('#complete-fields [name="' + spec.name + '__max"]').value;
      var at = document.querySelector('#complete-fields [data-field="' + spec.name + '"]');
      if ((lo === '') !== (hi === '')) return { at: at, text: T('web.err_range_both') };
      if (lo !== '' && Number(lo) > Number(hi)) return { at: at, text: T('web.err_age_range') };
    }
    return null;
  }

  function setBell(n) {
    var badge = $('bell-n');
    badge.textContent = n > 99 ? '99+' : String(n || '');
    badge.hidden = !n;
    $('bell').setAttribute('aria-label', T('web.notifications')
                           + (n ? ' (' + n + ')' : ''));
  }

  function refreshBell() {
    // ⚠️ **لا سؤالَ والصفحة في الخلفية**: هاتفٌ يبقي التبويب مفتوحاً
    // ساعاتٍ يسأل الوسيط كلَّ دقيقة بلا أن ينظر إليه أحد.
    if (document.hidden) return;
    api.notificationsCount().then(function (d) {
      setBell((d && d.unread) || 0);
    }).catch(function () { /* الجرس زينةٌ لا شرط — يعيد في الدورة التالية */ });
  }

  function startBell() {
    refreshBell();
    if (!bellTimer) bellTimer = setInterval(refreshBell, 60000);
    // ✅ **لا يتكرّر بتكرار `showApp`** — وقد ظنّته مراجعةُ ما قبل الإعلانات
    // عطلاً (البند ١٣): المتصفّح يتجاهل `addEventListener` ثانياً بالدالّة
    // نفسها والحدث نفسه، و`refreshBell` معرَّفةٌ مرّةً في الوحدة. ولا
    // «تضاعف» في العدّاد: `setBell` يضع الرقم لا يضيفه. فلا تُلفّ بعلامةٍ.
    document.addEventListener('visibilitychange', refreshBell);
  }

  function ago(iso) {
    if (!iso) return '';
    try {
      var secs = (Date.now() - new Date(iso).getTime()) / 1000;
      // ⚠️ **`Intl.RelativeTimeFormat` لا نصوصٌ مكتوبة**: «منذ ٥ دقائق»
      // بلغة الواجهة وأرقامها من المتصفّح نفسه، بلا مفتاحٍ لكل وحدة.
      var fmt = new Intl.RelativeTimeFormat(LANG, { numeric: 'auto' });
      var steps = [[60, 'second'], [3600, 'minute'], [86400, 'hour'],
                   [604800, 'day'], [2629800, 'week'], [31557600, 'month']];
      var unit = 'year', size = 31557600;
      for (var i = 0; i < steps.length; i++) {
        if (secs < steps[i][0]) {
          unit = steps[i][1];
          size = i ? steps[i - 1][0] : 1;
          break;
        }
      }
      return fmt.format(-Math.max(0, Math.round(secs / size)), unit);
    } catch (e) { return ''; }
  }

  // ✅ **سطرُ الهوية الواحد: «أحمد (36) · HS-…»** — في الإشعار ورأس
  // المحادثة وقائمة «مطابقاتي». الاسم الأول ليس هوية (عشرات «أحمد»)،
  // والمعرّف وحده رمزٌ لا إنسان فيه؛ فلا يظهر أحدهما بلا الآخر.
  // ⚠️ ويرتدّ إلى ما وُجد منهما: ردٌّ من وسيطٍ أقدم لا يحمل `who`.
  function identity(who, pid) {
    if (who && pid) return who + ' · ' + pid;
    return who || pid || '';
  }

  function renderNotes(data) {
    var list = $('notes-list');
    list.textContent = '';
    var items = (data && data.items) || [];
    $('notes-all').hidden = !(data && data.unread);
    setBell((data && data.unread) || 0);

    if (!items.length) {
      var empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = T('web.notif_empty');
      list.appendChild(empty);
      return;
    }

    items.forEach(function (item) {
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'note' + (item.unread ? ' note--new' : '');

      var main = document.createElement('span');
      main.className = 'note__main';
      var text = document.createElement('span');
      text.className = 'note__text';
      // ⚠️ `textContent` لا `innerHTML`: النصّ قد يحمل اسمَ مستخدمٍ
      // كتبه بنفسه، ورسالةُ البوت جُرِّدت من وسومها في الوسيط أصلاً.
      text.textContent = item.text || '';
      main.appendChild(text);
      if (item.who) {
        var who = document.createElement('span');
        who.className = 'note__who';
        who.textContent = identity(item.who, item.public_id);
        main.appendChild(who);
      }
      row.appendChild(main);

      var when = document.createElement('span');
      when.className = 'note__at';
      when.textContent = ago(item.at);
      // ✅ **عددُ رسائل المرسل غير المقروءة** — الوسيط يجمعها سطراً
      // واحداً (`count`)، بشكل شارة 💬 في «مطابقاتي».
      if (item.count > 1) {
        var n = document.createElement('span');
        n.className = 'bell__n note__n';
        n.textContent = item.count > 99 ? '99+' : String(item.count);
        when.appendChild(n);
      }
      row.appendChild(when);

      row.addEventListener('click', function () { openNote(item); });
      list.appendChild(row);
    });
  }

  function openNotes() {
    $('notes').hidden = false;
    $('notes-list').textContent = T('web.loading');
    api.notifications().then(renderNotes).catch(function (err) {
      $('notes-list').textContent = errorText(err);
    });
  }

  function openNote(item) {
    // الإعجابات سطرٌ مجمَّع بلا معرّف — تُعلَّم بنوعها.
    // وسطرُ المرسل يُعلَّم كلُّه (`ids`) — لا أحدثُ رسائله وحده.
    var body = (item.ids && item.ids.length) ? { ids: item.ids }
             : item.id ? { ids: [item.id] } : { types: [item.type] };
    var go = item.action;
    api.notificationsRead(body).then(function (d) {
      setBell((d && d.unread) || 0);
    }).catch(function () { /* يُعاد التعليم عند الفتح التالي */ });

    if (go === 'chat' && item.public_id) {
      // ✅ إشعارُ التطابق يفتح الدردشة مع صاحبه، لا القائمة.
      $('notes').hidden = true;
      openChat(refId(item.public_id), identity(item.who, item.public_id));
      return;
    }
    if (go === 'person' && item.public_id) {
      // ✅ **بطاقةُ المعجِب نفسه لا التصفّحُ العامّ** — كان الضغطُ يفتح
      // بطاقاتٍ مقترحة لا علاقة لها به، فلا يرى صاحبُ الإشعار من أعجب به.
      api.person(refId(item.public_id)).then(function (card) {
        $('notes').hidden = true;
        openSheet(card);
      }).catch(function (err) { toast(errorText(err)); });
      return;
    }
    if (go === 'photo_requests') {
      $('notes').hidden = true;
      openPhotoRequests();
      return;
    }
    // ✅ **الإعجابُ المجمَّع بلا أسماء** يفتح «مطابقاتي» حيث صفُّ «من أعجب بي».
    if (go === 'person' && !item.public_id) {
      $('notes').hidden = true;
      openTab('matches');
      return;
    }
    // ✅ **رسالةُ البوت بلا مرسل** تُفتح نصّاً كاملاً — لا شخصَ ولا محادثة
    // (قرارُ مشرف، اشتراك، نتيجةُ توثيق)، وكان الضغطُ عليها بلا أثر.
    if (go === 'message') {
      $('notes').hidden = true;
      modTarget = null;
      $('mod-name').textContent = T('web.notifications');
      var mb = $('mod-body');
      mb.textContent = '';
      var p = document.createElement('p');
      p.className = 'verify__text';
      p.textContent = item.text || '';
      mb.appendChild(p);
      modFromSheet = false;
      $('mod').hidden = false;
      return;
    }
    if (go && go !== 'chat' && go !== 'person') {
      $('notes').hidden = true;
      openTab(go);
      return;
    }
    item.unread = false;
    api.notifications().then(renderNotes).catch(function () {});
  }

  // ==========================================================
  // البحث — البحث المجانيّ في البوت، معيارٌ واحد في كل مرّة
  // ==========================================================
  //
  // ⚠️ **والقوائم من الوسيط لا من هذه الصفحة** (`/api/profile/schema`):
  // جنسياتٌ ودولٌ وأديان بستّ لغات، ونسخةٌ ثانية منها هنا تعني خياراً
  // يُضاف في البوت ولا يظهر في البحث.
  //
  // ⚠️ **والجنس لا يُسأل عنه**: البحث دائماً عن الجنس الآخر، ويقرّره
  // الوسيط من صاحب التوكن.
  var SEARCH_TYPES = ['age', 'location', 'nationality', 'religion',
                      'education', 'marital', 'verified'];
  var SEARCH_FIELD = { nationality: 'nationality', religion: 'religion',
                       education: 'education_level', marital: 'marital_status' };
  var searchSpecs = null;
  var searchLabel = '';
  var searchPremium = false;

  // ✅ **معاييرُ البحث المتقدّم في البوت، ظاهرةً مقفلة** (بطلب صاحب
  // المشروع): تُعرِّف بما يفتحه الاشتراك بدل أن تغيب فلا يُعرف وجودها.
  // والعناوين من المخطَّط نفسه كبقية الحقول.
  // ⚠️ **والقفل هنا عرضٌ لا حماية**: الحماية في الوسيط، الذي لا يقبل
  // هذه المفاتيح في `/api/search` أصلاً ولا الجمعَ لغير المميّز.
  var LOCKED_FIELDS = ['sect', 'job_title', 'monthly_income', 'height',
                       'weight', 'body_type', 'skin_color', 'eye_color',
                       'hair_color', 'smoking', 'personality_traits',
                       'spoken_languages'];

  function renderLocked() {
    var chips = $('search-locked-chips');
    chips.textContent = '';
    var labels = [T('web.search_combine')];
    LOCKED_FIELDS.forEach(function (name) {
      var spec = searchSpecs[name];
      if (spec && spec.label) labels.push(spec.label);
    });
    labels.forEach(function (label) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip--locked';
      // ⚠️ `aria-disabled` لا `disabled`: الزرّ المعطَّل لا يستقبل
      // الضغط، والضغطُ هنا هو ما يُظهر رسالة «للمميّزين».
      chip.setAttribute('aria-disabled', 'true');
      chip.textContent = '💎 ' + label;
      chip.addEventListener('click', function () {
        // المميّز يملك البحث المتقدّم في البوت، ولم يُبنَ هنا بعد.
        toast(T(searchPremium ? 'web.premium_soon' : 'web.premium_only'));
      });
      chips.appendChild(chip);
    });
    $('search-locked').hidden = false;
  }

  function setSearchLabel(text) {
    searchLabel = text || '';
    $('search-label').textContent = searchLabel;
    $('search-on').hidden = !searchLabel;
    $('view-browse').classList.toggle('is-search', !!searchLabel);
  }

  function searchTypeLabel(type) {
    if (type === 'age') return T('web.search_age');
    if (type === 'location') return T('web.country');
    if (type === 'verified') return T('web.search_verified');
    if (type === 'marital') return T('web.marital');
    var spec = searchSpecs && searchSpecs[SEARCH_FIELD[type]];
    return (spec && spec.label) || type;
  }

  function selectNode(label, name, options, blank) {
    var wrap = document.createElement('label');
    wrap.className = 'fld';
    var title = document.createElement('span');
    title.textContent = label;
    wrap.appendChild(title);
    var input = document.createElement('select');
    input.name = name;
    // ⚠️ `new Option` لا `innerHTML`: الخيارات نصوصٌ من الوسيط.
    input.appendChild(new Option(blank || '—', ''));
    (options || []).forEach(function (o) {
      input.appendChild(new Option(o.label, o.key));
    });
    wrap.appendChild(input);
    return wrap;
  }

  function ageNode(label, name) {
    var wrap = document.createElement('label');
    wrap.className = 'fld';
    var title = document.createElement('span');
    title.textContent = label;
    wrap.appendChild(title);
    var input = document.createElement('input');
    input.type = 'number';
    input.inputMode = 'numeric';
    input.name = name;
    input.min = 18;
    input.max = 80;
    input.required = true;
    wrap.appendChild(input);
    return wrap;
  }

  function renderSearchFields(type, target) {
    var box = target || $('search-fields');
    box.textContent = '';
    if (type === 'age') {
      // ⚠️ **الحدّان معاً إلزاميّان**: دالّةُ البحث تتجاهل حدّاً وحيداً
      // بصمت، فيعود بحثٌ «بالعمر» بلا عمرٍ فيه.
      var row = document.createElement('div');
      row.className = 'search__age';
      row.appendChild(ageNode(T('web.age_from'), 'age_min'));
      row.appendChild(ageNode(T('web.age_to'), 'age_max'));
      box.appendChild(row);
    } else if (type === 'location') {
      var country = selectNode(T('web.country'), 'country',
                               (searchSpecs.country || {}).options);
      country.querySelector('select').required = true;
      var city = selectNode(T('web.city'), 'city', [], T('web.any_city'));
      var citySelect = city.querySelector('select');
      citySelect.disabled = true;
      country.querySelector('select').addEventListener('change', function (e) {
        var key = e.target.value;
        citySelect.textContent = '';
        citySelect.appendChild(new Option(T('web.any_city'), ''));
        citySelect.disabled = true;
        if (!key) return;
        api.cities(key, LANG).then(function (data) {
          if (country.querySelector('select').value !== key) return;
          (data.cities || []).forEach(function (o) {
            citySelect.appendChild(new Option(o.label, o.key));
          });
          citySelect.disabled = !(data.cities || []).length;
        }).catch(function () { /* الدولة كاملةً تكفي */ });
      });
      box.appendChild(country);
      box.appendChild(city);
    } else if (SEARCH_FIELD[type]) {
      var spec = searchSpecs[SEARCH_FIELD[type]] || {};
      var node = selectNode(searchTypeLabel(type), SEARCH_FIELD[type], spec.options);
      node.querySelector('select').required = true;
      box.appendChild(node);
    }
    // «الموثّقون فقط» بلا حقل — اختيارُ النوع هو المعيار.
  }

  // ==========================================================
  // البحث المتقدّم — للمميّز وحده، كلُّ معايير البوت معاً
  // ==========================================================
  //
  // ⚠️ **والقفل في الوسيط لا هنا**: غيرُ المميّز لا يرى هذه الشاشة،
  // ولو بنى الرابط بيده ردّه `/api/search` بـ403.
  //
  // ✅ **والمتعدّد أزرارٌ تُضغط لا `<select multiple>`**: تلك على
  // الهاتف قائمةٌ منسدلة لا يُرى فيها ما اختير بعد إغلاقها.
  var searchMode = 'quick';
  var searchFor = null;       // 'female' | 'male' — من الوسيط (`/api/me`)

  // [اسم الحقل في المخطَّط، مفتاح الوسيط، النوع]
  var ADV_FIELDS = [
    ['nationality', 'nationality', 'one'],
    ['religion', 'religion', 'one'],
    ['sect', 'sect', 'sect'],
    ['marital_status', 'marital_status', 'one'],
    ['education_level', 'education', 'many'],
    ['job_title', 'job', 'many'],
    ['monthly_income', 'income', 'many'],
    ['height', 'height', 'range'],
    ['weight', 'weight', 'range'],
    ['body_type', 'body_type', 'many'],
    ['skin_color', 'skin_color', 'many'],
    ['eye_color', 'eye_color', 'many'],
    ['hair_color', 'hair_color', 'many'],
    ['smoking', 'smoking', 'many'],
    ['hijab', 'hijab', 'many'],
    ['personality_traits', 'personality', 'many'],
    ['spoken_languages', 'spoken_languages', 'many']
  ];

  function rangeNode(label, name, min, max, required) {
    var wrap = document.createElement('div');
    wrap.className = 'fld';
    var title = document.createElement('span');
    title.textContent = label;
    wrap.appendChild(title);
    var row = document.createElement('div');
    row.className = 'search__age';
    [['_min', 'web.range_from'], ['_max', 'web.range_to']].forEach(function (end) {
      var input = document.createElement('input');
      input.type = 'number';
      input.inputMode = 'numeric';
      input.name = name + end[0];
      input.placeholder = T(end[1]);
      input.min = min;
      input.max = max;
      if (required) input.required = true;
      row.appendChild(input);
    });
    wrap.appendChild(row);
    return wrap;
  }

  function chipsNode(label, name, options) {
    var wrap = document.createElement('div');
    wrap.className = 'fld';
    var title = document.createElement('span');
    title.textContent = label;
    wrap.appendChild(title);
    var box = document.createElement('div');
    box.className = 'chips';
    box.setAttribute('data-many', name);
    (options || []).forEach(function (o) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = o.label;
      chip.setAttribute('data-key', o.key);
      chip.setAttribute('aria-pressed', 'false');
      chip.addEventListener('click', function () {
        var on = chip.classList.toggle('on');
        chip.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      box.appendChild(chip);
    });
    wrap.appendChild(box);
    return wrap;
  }

  function renderAdvanced() {
    var box = $('search-adv');
    box.textContent = '';
    box.className = 'adv';

    box.appendChild(rangeNode(T('web.search_age'), 'age', 18, 80));

    // الدولة ثم مدينتها — نفسُ حقلَي البحث السريع، بالدالّة نفسها.
    var loc = document.createElement('div');
    renderSearchFields('location', loc);
    loc.querySelector('select[name="country"]').required = false;
    box.appendChild(loc);

    ADV_FIELDS.forEach(function (f) {
      var spec = searchSpecs[f[0]];
      if (f[0] === 'hijab') {
        // الحجاب للنساء وحدهنّ — ومن يبحث عن رجالٍ لا يُعرض عليه.
        if (searchFor !== 'female') return;
        spec = searchSpecs.hijab;
      }
      if (!spec) return;
      if (f[2] === 'range') {
        box.appendChild(rangeNode(spec.label, f[1], spec.min || 0, spec.max || 300));
      } else if (f[2] === 'many') {
        box.appendChild(chipsNode(spec.label, f[1], spec.options));
      } else if (f[2] === 'sect') {
        var sect = selectNode(spec.label, 'sect', []);
        var select = sect.querySelector('select');
        select.disabled = true;
        box.appendChild(sect);
        box.addEventListener('change', function (e) {
          if (e.target.name !== 'religion') return;
          var groups = spec.options_by || {};
          var opts = groups[e.target.value] || [];
          select.textContent = '';
          select.appendChild(new Option('—', ''));
          opts.forEach(function (o) { select.appendChild(new Option(o.label, o.key)); });
          select.disabled = !opts.length;
        });
      } else {
        box.appendChild(selectNode(spec.label, f[1], spec.options));
      }
    });

    var check = document.createElement('label');
    check.className = 'check';
    var tick = document.createElement('input');
    tick.type = 'checkbox';
    tick.name = 'verified';
    var text = document.createElement('span');
    text.textContent = T('web.search_verified');
    check.appendChild(tick);
    check.appendChild(text);
    box.appendChild(check);
  }

  function setSearchMode(mode) {
    searchMode = mode;
    document.querySelectorAll('#search-modes .mode').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-mode') === mode);
    });
    var advanced = mode === 'advanced';
    $('search-adv').hidden = !advanced;
    $('search-type-wrap').hidden = advanced;
    $('search-fields').hidden = advanced;
    // ⚠️ حقولُ الوضع المخفيّ الإلزامية تمنع الإرسال بصمت — فتُعطَّل.
    $('search-fields').querySelectorAll('input, select').forEach(function (i) {
      i.disabled = advanced;
    });
  }

  function advancedParams() {
    var box = $('search-adv');
    var out = {};
    box.querySelectorAll('input[type="number"], select').forEach(function (i) {
      if (i.value && !i.disabled) out[i.name] = i.value;
    });
    box.querySelectorAll('[data-many]').forEach(function (group) {
      var keys = [];
      group.querySelectorAll('.chip.on').forEach(function (c) {
        keys.push(c.getAttribute('data-key'));
      });
      if (keys.length) out[group.getAttribute('data-many')] = keys;
    });
    if (box.querySelector('input[name="verified"]').checked) out.verified = 'true';
    return out;
  }

  function openSearch() {
    $('search').hidden = false;
    if (searchSpecs) return;
    var type = $('search-type');
    type.textContent = '';
    $('search-fields').textContent = T('web.loading');
    // ⚠️ **المخطَّط والحساب معاً قبل الرسم**: شاشةُ المميّز غيرُ شاشة
    // غيره، ورسمُ إحداهما قبل أن يُعرف أيُّهما يُظهر القفل لمن دفع.
    Promise.all([
      api.me().catch(function () { return null; }),
      // الحجاب في المخطَّط للنساء وحدهنّ، والبحث عنهنّ يحتاجه.
      api.profileSchema(LANG, 'female')
    ]).then(function (both) {
      var mine = both[0], data = both[1];
      searchPremium = !!(mine && mine.is_premium);
      searchFor = (mine && mine.search_gender) || null;
      searchSpecs = {};
      (data.fields || []).forEach(function (f) { searchSpecs[f.name] = f; });
      SEARCH_TYPES.forEach(function (key) {
        type.appendChild(new Option(searchTypeLabel(key), key));
      });
      renderSearchFields(type.value);
      if (searchPremium) {
        $('search-modes').hidden = false;
        renderAdvanced();
        setSearchMode('quick');
      } else {
        renderLocked();
      }
    }).catch(function (err) {
      $('search-fields').textContent = errorText(err);
    });
  }

  function searchParams(form) {
    var type = form.type.value;
    var out = {};
    if (type === 'verified') { out.verified = 'true'; return out; }
    Array.prototype.forEach.call(
      $('search-fields').querySelectorAll('[name]'), function (input) {
        if (input.value) out[input.name] = input.value;
      });
    return out;
  }

  function searchSummary(form) {
    var type = form.type.value;
    var parts = [];
    if (type === 'age') {
      // ⚠️ عزلٌ اتّجاهيّ (U+2066…U+2069): بدونه يقلب السياقُ العربيّ
      // المدى فيُقرأ «32–25».
      parts.push('⁦' + form.age_min.value + '–' + form.age_max.value
                 + '⁩');
    } else {
      Array.prototype.forEach.call(
        $('search-fields').querySelectorAll('select'), function (s) {
          if (s.value) parts.push(s.options[s.selectedIndex].text);
        });
    }
    return '🔍 ' + searchTypeLabel(type)
           + (parts.length ? ': ' + parts.join(' · ') : '');
  }

  function runSearch(e) {
    e.preventDefault();
    var form = $('search-form');
    if (searchMode === 'advanced') return runAdvanced();
    var params = searchParams(form);
    if (form.type.value === 'age'
        && Number(params.age_min) > Number(params.age_max)) {
      toast(T('web.err_age_range'));
      return;
    }
    var summary = searchSummary(form);
    api.search(params).then(function (data) {
      $('search').hidden = true;
      deck = (data && data.results) || [];
      setSearchLabel(summary);
      renderDeck();
    }).catch(function (err) {
      if (err.code === 'unauthorized') return boot();
      // ⚠️ **403 هنا «للمميّزين» لا «رمز دعوة»**: `errorText` تقرأ 403
      // رمزَ دعوةٍ خاطئاً — وهو معنى شاشة الدخول لا هذه.
      if (err.status === 403) return toast(T('web.search_premium'));
      toast(errorText(err));
    });
  }

  function runAdvanced() {
    var params = advancedParams();
    var count = Object.keys(params).length;
    if (!count) { toast(T('web.search_pick_one')); return; }
    // المدى كاملٌ أو لا شيء — والوسيط يردّ نصفَه 400 على أي حال.
    var ranges = ['age', 'height', 'weight'];
    for (var i = 0; i < ranges.length; i++) {
      var lo = params[ranges[i] + '_min'], hi = params[ranges[i] + '_max'];
      if (!!lo !== !!hi) { toast(T('web.err_range_both')); return; }
      if (lo && Number(lo) > Number(hi)) { toast(T('web.err_age_range')); return; }
    }
    // المدى معيارٌ واحد لا اثنان — «من» و«إلى» حقلان لسؤالٍ واحد.
    var criteria = Object.keys(params).filter(function (k) {
      return !/_max$/.test(k);
    }).length;
    var summary = T('web.search_adv_label', { count: criteria });
    api.search(params).then(function (data) {
      $('search').hidden = true;
      deck = (data && data.results) || [];
      setSearchLabel(summary);
      renderDeck();
    }).catch(function (err) {
      if (err.code === 'unauthorized') return boot();
      if (err.status === 403) return toast(T('web.premium_only'));
      toast(errorText(err));
    });
  }

  function bindSearch() {
    document.querySelectorAll('#search-modes .mode').forEach(function (b) {
      b.addEventListener('click', function () {
        setSearchMode(b.getAttribute('data-mode'));
      });
    });
    $('search-btn').setAttribute('aria-label', T('web.search'));
    $('search-btn').addEventListener('click', openSearch);
    $('search-back').addEventListener('click', function () {
      $('search').hidden = true;
    });
    $('search-type').addEventListener('change', function (e) {
      renderSearchFields(e.target.value);
    });
    $('search-form').addEventListener('submit', runSearch);
    $('search-clear').addEventListener('click', loadDeck);
  }

  // ==========================================================
  // الاشتراك المميّز — الدفعُ الآليّ (نجوم/رقمية) واليدويّ
  // ==========================================================
  //
  // ⚠️ **الطرقُ من الوسيط لا من هذه الصفحة** (`/api/me/pay`): الفارغُ
  // في إعداد الخادم غائبٌ هنا، وبلا طريقةٍ واحدة لا يظهر الزرّ أصلاً.
  // ⚠️ **والتفعيلُ بيد المشرف** بعد مطابقة رقم العملية — فالصفحة تقول
  // «وصل إيصالك» لا «فُعّلت».
  var payState = { plan: null, method: null, data: null };

  function chipRow(options, current, onPick) {
    var box = document.createElement('div');
    box.className = 'chips';
    options.forEach(function (o) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip' + (o.key === current ? ' on' : '');
      chip.textContent = o.label;
      chip.addEventListener('click', function () { onPick(o.key); });
      box.appendChild(chip);
    });
    return box;
  }

  function payField(label, node) {
    var wrap = document.createElement('div');
    wrap.className = 'fld';
    var title = document.createElement('span');
    title.textContent = label;
    wrap.appendChild(title);
    wrap.appendChild(node);
    return wrap;
  }

  function renderPay() {
    var d = payState.data;
    var body = $('pay-body');
    body.textContent = '';

    var status = document.createElement('p');
    status.className = 'pay-status';
    status.textContent = d.is_premium && d.expiry
      ? T('web.pay_active', { date: d.expiry }) : T('web.pay_why');
    body.appendChild(status);

    body.appendChild(payField(T('web.pay_plan'), chipRow(
      d.plans.map(function (p) { return { key: p.key, label: p.title }; }),
      payState.plan, function (k) { payState.plan = k; renderPay(); })));

    if (!payState.plan) return;
    // ✅ الآليّةُ أوّلاً (نجومٌ ثم رقمية): تُفعَّل بلا انتظار مشرف.
    var all = payMethods(d);
    body.appendChild(payField(T('web.pay_method'), chipRow(
      all.map(function (m) {
        return { key: m.key, label: m.name + ' — ' + m.prices[payState.plan] };
      }),
      payState.method, function (k) { payState.method = k; renderPay(); })));

    var method = all.filter(function (m) { return m.key === payState.method; })[0];
    if (!method) return;
    if (method.auto) { body.appendChild(autoPayBox(method)); return; }

    var box = document.createElement('div');
    box.className = 'paybox';
    var line = document.createElement('div');
    line.textContent = T('web.pay_send', { amount: method.prices[payState.plan] });
    box.appendChild(line);
    // ⚠️ `textContent` لا `innerHTML`: القيمة من إعداد الخادم، ومع ذلك
    // لا يُلصق نصٌّ خامٌ في الصفحة — القاعدة في رأس هذا الملفّ.
    var code = document.createElement('code');
    code.textContent = method.details;
    box.appendChild(code);
    var copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'btn btn--ghost';
    copy.textContent = T('web.copy');
    copy.addEventListener('click', function () {
      try {
        navigator.clipboard.writeText(method.details).then(function () {
          toast(T('web.copied'));
        });
      } catch (e) { /* النسخُ راحةٌ لا شرط — القيمة ظاهرةٌ للنسخ باليد */ }
    });
    box.appendChild(copy);
    if (method.key === 'paypal' && /^https:\/\//.test(method.details)) {
      var open = document.createElement('a');
      open.className = 'btn btn--primary';
      open.href = method.details;
      open.target = '_blank';
      open.rel = 'noopener';
      open.textContent = T('web.pay_open_paypal');
      box.appendChild(open);
    }
    body.appendChild(box);

    var ref = document.createElement('input');
    ref.name = 'ref';
    ref.maxLength = 120;
    ref.autocomplete = 'off';
    ref.placeholder = T('web.pay_ref_hint');
    body.appendChild(payField(T('web.pay_ref'), ref));

    // ✅ **صورةُ الإيصال** (بطلب صاحب المشروع، ٢٤ سبتمبر ٢٠٢٦) — تُعرض حين
    // تصل تيليجرامَ فعلاً (`receipt_photo`: قناةُ التخزين). وتُصغَّر ويُنزع
    // منها EXIF كالصورة الشخصية (`prepareJpeg`)، وتُرسل مع الإيصال في طلبٍ
    // واحد — فلا يصل المشرفَ إيصالٌ صورتُه في الطريق.
    var receipt = null;
    if (d.receipt_photo) {
      var pickInput = document.createElement('input');
      pickInput.type = 'file';
      pickInput.accept = 'image/*';
      pickInput.hidden = true;
      var shot = document.createElement('img');
      shot.className = 'pay-receipt';
      shot.alt = '';
      shot.hidden = true;
      var pickBtn = document.createElement('button');
      pickBtn.type = 'button';
      pickBtn.className = 'btn btn--ghost';
      pickBtn.textContent = T('web.pay_receipt_photo');
      pickBtn.addEventListener('click', function () { pickInput.click(); });
      pickInput.addEventListener('change', function () {
        var file = pickInput.files && pickInput.files[0];
        pickInput.value = '';
        if (!file) return;
        receipt = file;
        try { shot.src = URL.createObjectURL(file); shot.hidden = false; }
        catch (e) { /* المعاينةُ راحةٌ لا شرط */ }
        pickBtn.textContent = T('web.pay_receipt_change');
      });
      body.appendChild(pickInput);
      body.appendChild(pickBtn);
      body.appendChild(shot);
    }

    var send = document.createElement('button');
    send.type = 'button';
    send.className = 'btn btn--primary';
    send.textContent = T('web.pay_submit');
    send.addEventListener('click', function () {
      var value = ref.value.trim();
      // ⚠️ **الصورةُ تكفي وحدها** — كما في البوت (`attach_receipt`): رقمٌ أو
      // صورةٌ أو كلاهما، ولا شيء منهما رفضٌ.
      if (!receipt && value.length < 3) {
        toast(T(d.receipt_photo ? 'web.pay_ref_or_photo' : 'web.pay_err_ref'));
        return;
      }
      send.disabled = true;
      var fields = { method: payState.method, plan: payState.plan, ref: value };
      var sending = receipt
        ? prepareJpeg(receipt).then(function (blob) {
            return api.payManualPhoto(fields, blob);
          })
        : api.payManual(fields);
      sending
        .then(function () {
          body.textContent = '';
          var done = document.createElement('p');
          done.className = 'empty';
          done.textContent = T('web.pay_done');
          body.appendChild(done);
        }).catch(function (err) {
          send.disabled = false;
          if (err.code === 'unauthorized') return boot();
          if (err.status === 429) return toast(T('web.pay_too_many'));
          if (receipt && (err.status === 400 || err.status === 413 || !err.code)) {
            return toast(T('web.photo_bad'));
          }
          if (err.status === 400) return toast(T('web.pay_err_ref'));
          toast(errorText(err));
        });
    });
    body.appendChild(send);
  }

  function payMethods(d) {
    return (d.auto_methods || []).concat(d.methods || []);
  }

  // ⚠️ **الدفعُ نفسه في تطبيق تيليجرام** — والرابطُ يُفتح بلمسةٍ من صاحبه
  // لا بـ`window.open` بعد انتظار: المتصفّحُ يحجب النافذةَ التي لا تتبع
  // لمسةً مباشرة، فيبدو الزرُّ ميتاً. فالرابطُ يُجهَّز أوّلاً ثم يصير زرّاً.
  function autoPayBox(method) {
    var box = document.createElement('div');
    box.className = 'paybox';
    var note = document.createElement('p');
    note.className = 'pay-status';
    note.textContent = T('web.pay_auto_note');
    box.appendChild(note);

    var go = document.createElement('button');
    go.type = 'button';
    go.className = 'btn btn--primary';
    go.textContent = T('web.pay_auto_btn');
    box.appendChild(go);

    var plan = payState.plan;
    function ready(url) {
      var open = document.createElement('a');
      open.className = 'btn btn--primary';
      open.href = url;
      open.target = '_blank';
      open.rel = 'noopener';
      open.textContent = T('web.pay_open_tg');
      box.replaceChild(open, go);
    }
    function failed(err) {
      go.disabled = false;
      go.textContent = T('web.pay_auto_btn');
      if (err && err.code === 'unauthorized') return boot();
      toast(T('web.pay_link_failed'));
    }
    // ⚠️ النجومُ تنتظر مهمّةَ البوت (دورتُها عشرُ ثوانٍ) — فتُسأل بمهلةٍ
    // لا إلى الأبد: خدمةُ البوت المتوقّفة تعني زرّاً يدور بلا نهاية.
    function poll(id, tries) {
      api.payStarsStatus(id).then(function (r) {
        if (r.link) return ready(r.link);
        if (r.status === 'failed' || tries <= 0) return failed();
        setTimeout(function () { poll(id, tries - 1); }, 2000);
      }).catch(failed);
    }
    go.addEventListener('click', function () {
      go.disabled = true;
      go.textContent = T('web.pay_preparing');
      if (method.key === 'crypto') {
        api.payCrypto(plan).then(function (r) { ready(r.url); }).catch(failed);
        return;
      }
      api.payStars(plan).then(function (r) {
        if (r.link) return ready(r.link);
        poll(r.id, 20);
      }).catch(failed);
    });
    return box;
  }

  function openPay() {
    $('pay').hidden = false;
    $('pay-body').textContent = T('web.loading');
    api.payOptions().then(function (data) {
      payState = { plan: null, method: null, data: data };
      renderPay();
    }).catch(function (err) { $('pay-body').textContent = errorText(err); });
  }

  // زرُّ «ملفّي» — يُضاف حين توجد طريقةٌ مضبوطة وحدها.
  function payButton(slot) {
    api.payOptions().then(function (data) {
      if (!data || !payMethods(data).length) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn--primary';
      btn.textContent = data.is_premium ? T('web.premium_btn_active')
                                        : T('web.premium_btn');
      btn.addEventListener('click', openPay);
      slot.appendChild(btn);
    }).catch(function () { /* بلا طرق لا زرّ — تدهورٌ صامت */ });
  }

  // ==========================================================
  // الحظرُ والإبلاغ
  // ==========================================================
  //
  // ⚠️ **المنطقُ كلُّه في الوسيط** (`/api/me/block` و`/api/me/report`) وهو
  // منطقُ البوت نفسه: حدودُ البلاغ، وأفعالُ الحظر الأربعة. والصفحة تعرض
  // الأزرار وتترجم الرفض إلى جملةٍ مفهومة لا أكثر.
  // ⚠️ **والحظرُ صامتٌ للمحظور** — لا نصَّ هنا يوحي بأنه سيُخطَر.
  var modTarget = null;
  // ⚠️ **الورقةُ تُطوى ما دامت شاشةُ الحظر مفتوحة — عطلٌ رآه صاحب المشروع
  // على هاتفه:** زرُّ «إبلاغ · حظر» في آخر `.sheet` (طبقة ‎200‎ على مستوى
  // `body`)، والشاشة داخل `.app` — و`.app` بـ`position: fixed` فهي سياقُ
  // تكديسٍ مستقلّ، فلا `z-index` داخلها يعلو الورقة مهما كبر. فكانت تُفتح
  // **خلفها**: حوافّها تُرى من أعلى الشاشة ولا يظهر أمامك شيء.
  // ⚠️ **ولا تُنقل الشاشة خارج `.app` علاجاً**: `boot()` يُخفي `.app`
  // حين ينتهي التوكن — فشاشةٌ خارجها تبقى معلّقةً فوق بوّابة الدخول.
  // والرجوع يُعيد الورقة، فيعود المستخدم إلى الملفّ الذي كان يقرؤه.
  var modFromSheet = false;

  function closeModeration() {
    // ⚠️ **الصورة الواضحة تُحرَّر مع كل إغلاقٍ لهذه الشاشة** — لا تبقى في
    // ذاكرة الصفحة بعد أن يغادرها صاحبها.
    closeClearPhoto();
    // ⚠️ **والكاميرا كذلك**: شاشةٌ تُغلق وضوءُ الكاميرا باقٍ يعني أن الصفحة
    // ما تزال تنظر إلى صاحبها.
    stopVerifyCamera();
    $('mod').hidden = true;
    if (modFromSheet) $('sheet').hidden = false;
    modFromSheet = false;
  }

  function afterBlock(publicId) {
    // المحظورُ يختفي فوراً من كل ما أمامك — لا بعد تحديث الصفحة.
    deck = deck.filter(function (c) { return refId(c.public_id) !== publicId; });
    if (chatWith === publicId) closeChat();
    modFromSheet = false;
    $('mod').hidden = true;
    $('sheet').hidden = true;
    if (!$('view-matches').hidden) loadMutual();
    else if (!$('view-browse').hidden) renderDeck();
  }

  function renderReport(reasons) {
    var body = $('mod-body');
    body.textContent = '';
    var picked = null;
    var box = document.createElement('div');
    box.className = 'chips';
    reasons.forEach(function (r) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = r.label;
      chip.addEventListener('click', function () {
        picked = r.key;
        box.querySelectorAll('.chip').forEach(function (c) {
          c.classList.toggle('on', c === chip);
        });
      });
      box.appendChild(chip);
    });
    body.appendChild(payField(T('web.report_title'), box));

    var details = document.createElement('textarea');
    details.className = 'mod-details';
    details.maxLength = 1000;
    body.appendChild(payField(T('web.report_details'), details));

    var send = document.createElement('button');
    send.type = 'button';
    send.className = 'btn btn--primary';
    send.textContent = T('web.report_send');
    send.addEventListener('click', function () {
      if (!picked) { toast(T('web.report_title')); return; }
      send.disabled = true;
      api.report({ public_id: modTarget, reason: picked, details: details.value })
        .then(function () {
          closeModeration();
          toast(T('web.reported_done'));
        }).catch(function (err) {
          send.disabled = false;
          if (err.code === 'unauthorized') return boot();
          var code = err.data && err.data.detail;
          if (code === 'too_soon') return toast(T('web.report_too_soon'));
          if (code === 'daily_limit') return toast(T('web.report_daily'));
          if (code === 'details_required') return toast(T('web.report_need_details'));
          toast(errorText(err));
        });
    });
    body.appendChild(send);
  }

  function openModeration(publicId, label) {
    if (!publicId) return;
    modTarget = publicId;
    $('mod-name').textContent = label || publicId;
    var body = $('mod-body');
    body.textContent = '';
    var row = document.createElement('div');
    row.className = 'mod-row';

    var blockBtn = document.createElement('button');
    blockBtn.type = 'button';
    blockBtn.className = 'btn btn--danger-soft';
    blockBtn.textContent = T('web.block');
    blockBtn.addEventListener('click', function () {
      // ⚠️ تأكيدٌ صريح: الحظرُ يطوي المحادثة ولا يُفكّ من الموقع بعد.
      if (!window.confirm(T('web.block_confirm'))) return;
      api.block({ public_id: publicId }).then(function () {
        toast(T('web.blocked_done'));
        afterBlock(publicId);
      }).catch(function (err) {
        if (err.code === 'unauthorized') return boot();
        toast(errorText(err));
      });
    });

    var reportBtn = document.createElement('button');
    reportBtn.type = 'button';
    reportBtn.className = 'btn btn--ghost';
    reportBtn.textContent = T('web.report');
    reportBtn.addEventListener('click', function () {
      body.textContent = T('web.loading');
      api.reportReasons().then(function (d) { renderReport(d.reasons || []); })
        .catch(function (err) { body.textContent = errorText(err); });
    });

    row.appendChild(reportBtn);
    row.appendChild(blockBtn);
    body.appendChild(row);
    modFromSheet = !$('sheet').hidden;
    $('sheet').hidden = true;
    $('mod').hidden = false;
  }

  // ✅ **«المحظورون» وفكُّ الحظر (٢٤ سبتمبر ٢٠٢٦)** — كان الحظرُ يُكتب من
  // هنا ولا يُفكّ إلا من البوت، فمن حظر بالخطأ لا رجعة له. والقائمةُ
  // قائمةُ البوت نفسها (`/api/me/blocked`)، في شاشة الحظر نفسها (`#mod`)
  // لا شاشةٍ ثالثة.
  // ⚠️ **والفكُّ يرفع المنعَ ولا يستأنف علاقة** — لا تعِد الصفحةُ بعودة
  // المحادثة أو الإعجاب؛ الطرفان يلتقيان من جديد كغريبَين.
  function openBlocked() {
    modTarget = null;
    $('mod-name').textContent = T('web.blocked_list');
    var body = $('mod-body');
    body.textContent = T('web.loading');
    modFromSheet = !$('sheet').hidden;
    $('sheet').hidden = true;
    $('mod').hidden = false;

    api.blocked().then(function (d) {
      body.textContent = '';
      var people = (d && d.people) || [];
      if (!people.length) {
        var none = document.createElement('p');
        none.className = 'empty';
        none.textContent = T('web.blocked_empty');
        body.appendChild(none);
        return;
      }
      people.forEach(function (p) {
        var row = document.createElement('div');
        row.className = 'row';

        var main = document.createElement('div');
        main.className = 'row__main';
        var name = document.createElement('div');
        name.className = 'row__name';
        name.textContent = identity(p.name, p.public_id);
        main.appendChild(name);
        row.appendChild(main);

        var free = document.createElement('button');
        free.type = 'button';
        free.className = 'btn btn--ghost row__unblock';
        free.textContent = T('web.unblock');
        free.addEventListener('click', function () {
          free.disabled = true;
          api.unblock({ public_id: p.public_id }).then(function () {
            // ⚠️ **الصفُّ يُزال فوراً**: بقاؤه بعد النجاح يدعو إلى ضغطةٍ
            // ثانية تقول «ليس محظوراً» فيُظنّ أن الأولى فشلت (نفس درس
            // `blk_unblock_callback` في البوت).
            row.remove();
            toast(T('web.unblocked_done'));
            if (!body.querySelector('.row')) {
              var none = document.createElement('p');
              none.className = 'empty';
              none.textContent = T('web.blocked_empty');
              body.appendChild(none);
            }
          }).catch(function (err) {
            free.disabled = false;
            if (err.code === 'unauthorized') return boot();
            toast(errorText(err));
          });
        });
        row.appendChild(free);
        body.appendChild(row);
      });
    }).catch(function (err) {
      if (err.code === 'unauthorized') return boot();
      body.textContent = errorText(err);
    });
  }

  function bindNotes() {
    $('bell').addEventListener('click', openNotes);
    $('notes-back').addEventListener('click', function () {
      $('notes').hidden = true;
      refreshBell();
    });
    $('notes-all').addEventListener('click', function () {
      api.notificationsRead({ all: true }).then(function () {
        return api.notifications();
      }).then(renderNotes).catch(function (err) { toast(errorText(err)); });
    });
  }

  function bindGate() {
    // ⚠️ **لا نموذجَ تسجيلٍ بالبريد بعد ٢٢ سبتمبر ٢٠٢٦**: الأبواب
    // الثلاثة تغطّيه وكلٌّ منها يؤكّد البريد نيابةً عنّا. والدخول
    // وحده باقٍ، خلف رابطٍ لا في الواجهة — لأن حساباتٍ أُنشئت به قبل
    // القرار، وإسقاطُه يحبس أصحابها خارج حساباتهم.
    $('show-login').addEventListener('click', function () {
      $('form-login').hidden = false;
      $('show-login').hidden = true;
      $('form-login').querySelector('input').focus();
    });

    $('form-login').addEventListener('submit', function (e) {
      e.preventDefault();
      submit(this, function (data) {
        return api.login(data.email, data.password);
      });
    });
  }

  // ==========================================================
  // ٣ ب) الدخول بحسابٍ قائم
  // ==========================================================
  //
  // ⚠️ **ولا مكتبةَ مزوّدٍ في هذه الصفحة ولا واحدة** — الشرح في
  // `api.js`: التوكن في `localStorage`، وكلُّ سكربتٍ يعمل في الصفحة
  // يقرؤه. فجوجل وفيسبوك **روابط** إلى الوسيط، وتيليجرام مصافحةٌ
  // يقودها البوت.

  // ⚠️ **الشعاراتُ الرسمية مرسومةً هنا بـSVG، لا صوراً من مواقع أصحابها
  // ولا مكتبةَ أيقونات**: لا سكربت ولا ملفَّ من طرفٍ ثالث في صفحةٍ يسكن
  // فيها التوكن (CLAUDE.md). وكانت «G» و«f» حرفين و«✈️» رمزاً تعبيرياً —
  // فبدت الأزرار مرتجلةً في أوّل ما يراه القادم الجديد.
  var PROVIDER_ICON = {
    google: '<svg viewBox="0 0 48 48" aria-hidden="true">'
      + '<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>'
      + '<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>'
      + '<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>'
      + '<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#FFFFFF" '
      + 'd="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#FFFFFF" '
      + 'd="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg>'
  };
  var pollTimer = null;

  // ⚠️ **متصفّحُ فيسبوك وإنستغرام المدمج يرفضه جوجل** (`disallowed_useragent`
  // — سياسةُ جوجل لا عطلٌ عندنا): من ضغط إعلاناً على ميتا يفتح الصفحة
  // داخل التطبيق، فيضغط «المتابعة بجوجل» فيرى صفحةَ خطأٍ من جوجل «403»
  // لا تشرح شيئاً، ويظنّ الموقع معطّلاً. فالزرّ يُخفى هناك ومكانه سطرٌ
  // يقول كيف يُفتح في المتصفّح — وفيسبوك وتيليجرام يعملان داخله فيبقيان.
  // البند ٥ في `docs/PRE_ADS_FIXES.md` بمستودع البوت.
  //
  // ⚠️ **الكشفُ بالعلامات التي يضعها التطبيقان في `userAgent`**: `FBAN`
  // و`FBAV` (فيسبوك وماسنجر) و`Instagram`. وهي تخمينٌ لا ضمان — متصفّحٌ
  // مدمجٌ لا يعلن نفسه يرى الزرّ كما كان، أي لا أسوأ من قبل.
  function inMetaInAppBrowser() {
    return /FBAN|FBAV|FB_IAB|Instagram/i.test(navigator.userAgent || '');
  }

  function renderProviders() {
    api.providers().then(function (data) {
      var names = (data && data.providers) || [];
      var googleBlocked = inMetaInAppBrowser() && names.indexOf('google') >= 0;
      if (googleBlocked) {
        names = names.filter(function (n) { return n !== 'google'; });
      }
      if (!names.length && !googleBlocked) return;

      var box = document.getElementById('provider-buttons');
      box.textContent = '';

      names.forEach(function (name) {
        var label = T('web.with_' + name);
        var icon = PROVIDER_ICON[name] || '';

        if (name === 'telegram') {
          var button = document.createElement('button');
          button.type = 'button';
          button.className = 'prov prov--telegram';
          button.innerHTML = '';
          var ti = document.createElement('i');
          // ⚠️ `innerHTML` هنا آمن: `icon` ثابتٌ مكتوب في هذا الملفّ، لا
          // نصٌّ من الوسيط ولا من المستخدم.
          ti.innerHTML = icon;
          button.appendChild(ti);
          button.appendChild(document.createTextNode(label));
          button.addEventListener('click', function () {
            startTelegram(button);
          });
          box.appendChild(button);
          return;
        }

        // ⚠️ **رابطٌ لا `fetch`**: هذه ملاحةُ صفحة إلى نطاق المزوّد،
        // و`fetch` عليها يصطدم بـCORS عنده بلا أي فائدة.
        var link = document.createElement('a');
        link.className = 'prov prov--' + name;
        link.rel = 'noopener';
        var gi = document.createElement('i');
        gi.innerHTML = icon;
        link.appendChild(gi);
        link.appendChild(document.createTextNode(label));
        link.addEventListener('click', function (e) {
          e.preventDefault();
          var invite = (document.querySelector('#provider-invite input') || {}).value;
          window.location.href = api.oauthUrl(name, (invite || '').trim());
        });
        box.appendChild(link);
      });

      // ⚠️ **ولا سطرَ إن لم يصل المفتاح بعد**: `T` تعيد اسمَ المفتاح نفسه
      // حين يغيب، ووسيطٌ لم يُنشر بعد (أو نسخةٌ مخبّأة في `localStorage`
      // من قبله) كان سيعرض `web.inapp_google_hint` خاماً. فالزرّ يُخفى
      // على أي حال، والسطرُ يظهر متى وصل نصُّه — فلا يلزم ترتيبُ نشر.
      var hintText = T('web.inapp_google_hint');
      if (googleBlocked && hintText !== 'web.inapp_google_hint') {
        // ⚠️ `textContent` لا `innerHTML`: النصّ من الوسيط.
        var hint = document.createElement('p');
        hint.className = 'prov-hint';
        hint.textContent = hintText;
        box.appendChild(hint);
      }

      // حقلُ الدعوة يظهر مع جوجل وفيسبوك وحدهما: الداخل بتيليجرام
      // مستخدمٌ عندنا أصلاً، فلا دعوةَ تُطلب منه.
      //
      // ⚠️ **و«هل يلزم رمز» من الوسيط لا من تخمينٍ هنا**: الحالة
      // تُبدَّل من لوحة الأدمن في ثانية. و`!== false` لا `=== true`:
      // وسيطٌ قديم لا يرسل الحقل يعني **بقاءَ** الحقل لا إخفاءه —
      // فالتخلّف إلى الإغلاق لا إلى الفتح.
      var required = data.invite_required !== false;
      var needsInvite = required && (names.indexOf('google') >= 0
                                  || names.indexOf('facebook') >= 0);
      document.getElementById('provider-invite').hidden = !needsInvite;
      document.getElementById('providers').hidden = false;
    }).catch(function () {
      // ⚠️ وسيطٌ لا يردّ لا يمنع الدخول بالبريد: الكتلة تبقى مخفيّة
      // ولا رسالة — الفشل الحقيقي سيظهر عند أوّل محاولة دخول.
    });
  }

  function providerNote(text) {
    var note = document.getElementById('provider-note');
    // ⚠️ **يُفرَّغ أوّلاً**: هو الآن حاوٍ لا فقرة، وقد يحمل مخرجَ
    // تيليجرام اليدويّ من محاولةٍ سابقة.
    note.textContent = '';
    if (text) {
      var line = document.createElement('p');
      line.className = 'fld__err';
      line.textContent = text;
      note.appendChild(line);
    }
    note.hidden = !text;
  }

  function startTelegram(button) {
    button.setAttribute('aria-busy', 'true');
    providerNote(T('web.loading'));

    api.telegramStart().then(function (data) {
      // ⚠️ **يُفتح في تبويبٍ آخر بقرار**: الصفحة تبقى مفتوحة تسأل،
      // ومن عاد إليها يجد نفسه داخلاً. ولو انتقلت الصفحة نفسها إلى
      // تيليجرام لانقطع السؤال ولم يُسلَّم التوكن لأحد.
      window.open(data.deeplink, '_blank', 'noopener');
      providerNote(T('web.waiting_telegram'));
      telegramFallback(data);
      pollTelegram(data.code, Date.now() + 10 * 60 * 1000, button);
    }).catch(function (err) {
      button.removeAttribute('aria-busy');
      providerNote(errorText(err));
    });
  }

  // ⚠️ **مخرجٌ يدويّ يُعرض مع الرابط دائماً لا عند فشله.**
  //
  // الرابط العميق يطلب من المتصفّح أن يسلّم `tg://` إلى تطبيقٍ مثبَّت.
  // وعلى سطح المكتب بلا «تيليجرام ديسكتوب» تفتح صفحةُ `t.me` وزرُّها
  // «START BOT» **يسقط منه `start=`** — فيفتح البوتُ بلا حمولة، ولا
  // يصل الرمز، وتبقى هذه الصفحة تسأل حتى تنتهي المهلة بـ«انتهت
  // الصلاحية». ولا خطأ في أي طرف: كلُّ مكوّنٍ فعل ما صُمّم له، ولذلك
  // لا يظهر في سجلٍّ ولا يسقط له اختبار.
  //
  // ⚠️ **ولا يُخفى خلف «هل فشل؟»**: من لا يُفتح عنده تيليجرام لا يرى
  // فشلاً يضغط عليه — يرى صفحةً تنتظر. فالمخرجُ ظاهرٌ منذ اللحظة
  // الأولى، وهو نفسُ مسار `handlers/deeplink.py` حرفاً بحرف.
  function telegramFallback(data) {
    if (!data || !data.command) return;
    var note = document.getElementById('provider-note');

    var hint = document.createElement('p');
    hint.className = 'tgfb__hint';
    hint.textContent = T('web.tg_fallback');
    note.appendChild(hint);

    if (data.bot) {
      var open = document.createElement('a');
      open.className = 'tgfb__bot';
      open.href = 'https://t.me/' + encodeURIComponent(data.bot);
      open.target = '_blank';
      open.rel = 'noopener';
      // ⚠️ **`dir="ltr"` هنا أيضاً**: «@» محرفٌ محايد الاتجاه، فيُدفع
      // إلى آخر السطر داخل صفحةٍ عربية — فيُقرأ «HisnAlzawajBot@»،
      // ومن ينسخه كما رآه لا يجد شيئاً في بحث تيليجرام.
      open.setAttribute('dir', 'ltr');
      open.textContent = '@' + data.bot;
      note.appendChild(open);
    }

    var box = document.createElement('div');
    box.className = 'tgfb';

    var cmd = document.createElement('code');
    cmd.className = 'tgfb__cmd';
    // ⚠️ `textContent` لا `innerHTML`: النصّ من الوسيط، والعرفُ في
    // هذا الملفّ ألّا تُبنى عقدةٌ من سلسلةٍ أبداً.
    cmd.textContent = data.command;
    // ⚠️ **و`dir="ltr"` صراحةً**: الأمرُ لاتينيّ داخل صفحةٍ عربية،
    // وبلا هذا تُزحزح الشرطةُ المائلة إلى آخره فيُنسخ مقلوباً بصرياً
    // — فيراه المستخدم خطأً ويظنّ الرمز تالفاً.
    cmd.setAttribute('dir', 'ltr');
    box.appendChild(cmd);

    var copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'tgfb__copy';
    copy.textContent = T('web.copy');
    copy.addEventListener('click', function () {
      var done = function () { copy.textContent = T('web.copied'); };
      // ⚠️ **و`clipboard` غائبةٌ خارج HTTPS وفي بعض المتصفّحات**،
      // وغيابُها لا يجوز أن يترك الزرّ صامتاً: التحديدُ يدويّاً
      // يجعل النسخَ بـCtrl+C ممكناً في كل الحالات.
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(data.command).then(done, selectCmd);
          return;
        }
      } catch (e) { /* يسقط إلى التحديد */ }
      selectCmd();
    });
    box.appendChild(copy);

    function selectCmd() {
      try {
        var range = document.createRange();
        range.selectNodeContents(cmd);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (e) { /* لا شيء */ }
    }

    note.appendChild(box);
  }

  function pollTelegram(code, deadline, button) {
    clearTimeout(pollTimer);

    // ⚠️ **ومهلةٌ للسؤال لا سؤالٌ إلى الأبد**: من فتح تيليجرام ثم
    // نسي يترك تبويباً يسأل الخادم كلّ ثانيتين إلى أن يُغلق.
    if (Date.now() > deadline) {
      button.removeAttribute('aria-busy');
      providerNote(T('web.err_expired'));
      return;
    }

    pollTimer = setTimeout(function () {
      api.telegramPoll(code).then(function (data) {
        if (data && data.token) {
          api.setToken(data.token);
          button.removeAttribute('aria-busy');
          providerNote('');
          boot();
          return;
        }
        pollTelegram(code, deadline, button);
      }).catch(function (err) {
        if (err.code === 'network') {
          // انقطاعٌ عابر — تُعاد المحاولة، ولا تُلغى المصافحة.
          pollTelegram(code, deadline, button);
          return;
        }
        button.removeAttribute('aria-busy');
        providerNote(errorText(err));
      });
    }, 2000);
  }

  // ⚠️ **عودةُ المزوّد تصل في «شظيّة» الرابط لا في مَعلَم استعلام**:
  // الشظيّة لا تُرسَل إلى أي خادم ولا تُكتب في سجلّاته. وتُمسح فور
  // قراءتها كي لا تبقى في تاريخ المتصفّح.
  function consumeHandoff() {
    var hash = (window.location.hash || '').replace(/^#/, '');
    if (!hash) return null;

    var params = {};
    hash.split('&').forEach(function (pair) {
      var bits = pair.split('=');
      params[decodeURIComponent(bits[0])] = decodeURIComponent(bits[1] || '');
    });

    try {
      window.history.replaceState(null, '',
        window.location.pathname + window.location.search);
    } catch (e) { window.location.hash = ''; }

    // ⚠️ **يُعاد الرمز خاماً لا مترجَماً**: هذه الدالّة تعمل في أوّل
    // سطرٍ من الإقلاع — قبل أن تصل النصوص — فترجمةٌ هنا تعطي اسم
    // المفتاح نصّاً على الشاشة لمن لا نسخة محلّية عنده.
    if (params.error) return { error: params.error };
    return params.code ? { code: params.code } : null;
  }

  function submit(form, run) {
    var box = form.querySelector('[data-err]');
    var button = form.querySelector('button[type="submit"]');
    var data = {};
    new FormData(form).forEach(function (value, name) {
      var clean = typeof value === 'string' ? value.trim() : value;
      // ⚠️ الفارغ لا يُرسَل: حقلٌ اختياريّ تُركَ فارغاً يصل الخادمَ
      // نصّاً فارغاً فيُخزَّن «بلدٌ اسمه لا شيء» — ويصير بعدها مرشِّحاً
      // يطابق نفسه ولا يطابق أحداً.
      if (clean !== '') data[name] = clean;
    });

    box.hidden = true;
    // ⚠️ الزرّ يُعطَّل أثناء الطلب: ضغطتان متتاليتان على «إنشاء
    // الحساب» تعنيان محاولتَي تسجيلٍ بنفس البريد، والثانية تفشل
    // برسالةٍ تُقرأ «الحساب موجود» — فيظنّ من سجّل للتوّ أنه فشل.
    button.disabled = true;

    run(data).then(function () {
      button.disabled = false;
      boot();
    }).catch(function (err) {
      button.disabled = false;
      box.textContent = errorText(err);
      box.hidden = false;
    });
  }

  // ==========================================================
  // ٤) الرزمة
  // ==========================================================
  //
  // ⚠️ **ولا مرشِّحات في هذه الشاشة بقرار، خلافاً للعينة.** المقترحون
  // يُبنَون من **تفضيلات الحساب المحفوظة** (`build_match_candidates`
  // في البوت: أربعةَ عشرَ فلتراً)، فمرشِّحٌ ثانٍ هنا يعني أن الموقع
  // يُري غير ما يُري البوت للشخص نفسه — وهي شكوى لا يجد صاحبها
  // تفسيراً لها. والتفضيلات تُعدَّل في مكانٍ واحد: البوت.

  var deck = [];          // بطاقاتٌ لم تُعرض بعد
  var busy = false;
  var photoUrls = [];     // روابط `blob:` تُحرَّر عند إعادة الرسم

  function releasePhotos() {
    photoUrls.forEach(function (url) {
      // ⚠️ بلا التحرير تتراكم البايتات في الذاكرة حتى إغلاق التبويب —
      // وهي صورٌ لا صفحات: عشراتُ البطاقات تعني عشرات الميغابايت.
      try { URL.revokeObjectURL(url); } catch (e) { /* لا شيء */ }
    });
    photoUrls = [];
  }

  function refId(publicId) {
    // المعرّفُ المعروض صار رمزاً عشوائياً («HS-7K4M92») بعد أن كان
    // رقمَ صفٍّ تسلسلياً («#4821») — والوسيط يقبل الشكلين معاً.
    //
    // ⚠️ **وكانت هذه الدالّة تقصّ كلَّ ما ليس رقماً.** فلو بقيت،
    // لأعادت `NaN` من الرمز الجديد، ولارتدّ كلُّ مستدعٍ على فحص
    // `if (!id) return;` — أي **صورةٌ لا تُجلب، وإعجابٌ لا يُرسَل،
    // ومحادثةٌ لا تُفتح**، وكلُّها صامتة بلا رسالةٍ ولا سطرِ سجلّ.
    //
    // ⚠️ **وتُقصّ `#` هنا لا في الوسيط**: `%23` داخل مسارٍ يمرّ على
    // وسطاء لا يصل دائماً كما أُرسل، ومعرّفٌ يسقط أوّلُ محرفه يصير
    // 404 لا يدلّ على سببه.
    return String(publicId || '').replace(/^#/, '').trim();
  }

  // ✅ **فاصلٌ مرئيّ بين المقترحين والعشوائيّ** (بطلب صاحب المشروع، ٢٤
  // سبتمبر ٢٠٢٦): العشوائيّ لا يطبّق التفضيلات — والتعدّدُ منها عمداً
  // (`random_cards` في مستودع البوت). وبلا فاصلٍ تُخلط بطاقاتُه في الرزمة
  // نفسها، فترى من رفضت التعدد طالبَه بعد آخر مقترَح وتظنّ تفضيلها لا
  // يعمل. فالبطاقةُ العشوائيّة تحمل وسمها، وأوّلُها يُعلَن مرّةً.
  var randomAnnounced = false;

  function loadDeck() {
    // الرزمةُ تعود مقترحاتٍ — فلا يبقى شريطُ «نتائج البحث» فوقها.
    setSearchLabel('');
    randomAnnounced = false;
    var stack = $('stack');
    stack.textContent = '';
    var wait = document.createElement('p');
    wait.className = 'empty';
    wait.textContent = T('web.loading');
    stack.appendChild(wait);

    return api.matches(10).then(function (data) {
      deck = (data && data.results) || [];
      // ✅ **المقترحون أوّلاً، ثم عشوائيٌّ يُكمل الرزمة بلا زرّ** (بطلب
      // صاحب المشروع): المقترحون قلّةٌ بتفضيلاتٍ صارمة، ورزمةٌ تنفد عند
      // ثلاث بطاقات تُوقف المستخدم أمام «انتهت البطاقات». والبوت يعطي
      // عندها زرّ «🎲 ملفات عشوائية»؛ هنا تأتي من نفسها بعد المقترحين.
      // ⚠️ **وبلا تكرار**: العشوائيّ قد يطابق مقترحاً في الرزمة نفسها.
      if (deck.length >= 10) return renderDeck();
      return api.random(10 - deck.length).then(function (more) {
        var have = {};
        deck.forEach(function (c) { have[c.public_id] = true; });
        ((more && more.results) || []).forEach(function (c) {
          // ⚠️ الوسمُ على البطاقة لا موضعٌ في الرزمة: الرزمةُ تُقصّ من
          // أوّلها بكل إعجابٍ وتخطٍّ، فحدٌّ محفوظٌ برقمٍ يتقادم عند أوّل ضغطة.
          if (!have[c.public_id]) { c._random = true; deck.push(c); }
        });
      }).catch(function () { /* العشوائيّ إكمالٌ لا شرط */ }).then(renderDeck);
    }).catch(function (err) {
      if (err.code === 'unauthorized') return boot();
      stack.textContent = '';
      var box = document.createElement('div');
      box.className = 'empty';
      var line = document.createElement('p');
      line.textContent = errorText(err);
      var again = document.createElement('button');
      again.className = 'btn btn--ghost';
      again.textContent = T('web.retry');
      again.addEventListener('click', loadDeck);
      box.appendChild(line);
      box.appendChild(again);
      stack.appendChild(box);
    });
  }

  function renderDeck() {
    var stack = $('stack');
    releasePhotos();
    stack.textContent = '';

    $('counter').textContent = deck.length
      ? T('web.remaining', { count: deck.length }) : '';
    $('btn-like').disabled = $('btn-skip').disabled = !deck.length;

    if (!deck.length) {
      var done = document.createElement('div');
      done.className = 'empty';
      var line = document.createElement('p');
      // ⚠️ **بحثٌ بلا نتائج ليس «انتهت البطاقات»**: تلك توحي بأن لا
      // أحد في الموقع، والصحيح أن المعيار ضيّق.
      line.textContent = T(searchLabel ? 'web.search_none' : 'web.no_more');
      var again = document.createElement('button');
      again.className = 'btn btn--ghost';
      again.textContent = T('web.retry');
      again.addEventListener('click', loadDeck);
      done.appendChild(line);
      done.appendChild(again);
      stack.appendChild(done);
      return;
    }

    // ⚠️ ثلاثٌ لا أكثر: ما تحت الثالثة لا يُرى، ورسمُه بطاقاتٌ كاملة
    // في DOM بلا أن يراها أحد.
    if (deck[0]._random && !randomAnnounced) {
      randomAnnounced = true;
      toast(T('web.random_divider'), 6000);
    }

    if (deck[2]) stack.appendChild(cardNode(deck[2], 'pcard--b2'));
    if (deck[1]) stack.appendChild(cardNode(deck[1], 'pcard--b1'));
    var front = cardNode(deck[0], 'pcard--front');
    stack.appendChild(front);
    bindSwipe(front);
  }

  // ✅ **البطاقة بشكلٍ لا نصّاً سطراً سطراً**: الاسم كبيراً في المنتصف
  // وتحته المكان، ثم صفوفُ «العنوان ···· القيمة»، والنبذةُ في صندوقها.
  //
  // ⚠️ **والنصّ نفسه نصُّ البوت (`profile_card_text`) لا بياناتٌ ثانية**:
  // يُقسَم هنا عند أوّل «: » ويُعرَف دورُ السطر بإيموجيه — وهو ثابتٌ في
  // اللغات الستّ (`_line` في `profile_service.py`)، بخلاف العنوان المترجَم.
  // فالبطاقة واحدةٌ في البابين، وتغييرٌ فيها هناك يصل هنا بلا تعديل.
  // ⚠️ وما لا يُعرف دوره يبقى سطراً كما كان — لا يسقط شيءٌ بصمت.
  var CARD_NAME = '👤', CARD_PLACE = '📍', CARD_BIO = '📝';

  // ✅ **أقسامُ شاشة التفاصيل** (كصفحة الاختبار): الصفّ يُنسب إلى قسمه
  // بإيموجيه. ⚠️ **و`U+FE0F` يُقصّ قبل المقارنة**: «⚖️» و«⚖» حرفان
  // مختلفان في النصّ ورمزٌ واحد على الشاشة، فبدون القصّ يسقط الصفّ من
  // قسمه بصمت. وما لا قسمَ له يبقى في رأس الورقة بلا عنوان.
  var CARD_SECTIONS = [
    ['web.sec_specs', ['📏', '⚖', '🏋', '👁', '💇', '🏽', '🧕', '🚬', '🚭']],
    ['web.sec_faith', ['🕌', '💍', '👶']],
    ['web.sec_work', ['🎓', '💼', '💰']]
  ];

  function sectionOf(head) {
    var mark = head.replace(/\uFE0F/g, '');
    for (var i = 0; i < CARD_SECTIONS.length; i++) {
      var marks = CARD_SECTIONS[i][1];
      for (var j = 0; j < marks.length; j++) {
        if (mark.indexOf(marks[j]) === 0) return i;
      }
    }
    return -1;
  }

  // ⚠️ **الرمز في رأس البطاقة، فلا يُكرَّر بجوار الاسم**: سطرُ البوت
  // «محمد (24 سنة) · HS-…» يحمله لأن البوت لا رأسَ له.
  function withoutCode(name, code) {
    if (!code) return name;
    var tail = ' · ' + code;
    var at = name.lastIndexOf(tail);
    return at > 0 && at + tail.length === name.length ? name.slice(0, at) : name;
  }

  function cardBody(node, text, opts) {
    opts = opts || {};
    var rows = document.createElement('div');
    rows.className = 'pcard__lines';
    var sections = CARD_SECTIONS.map(function () { return null; });
    var name = null, place = null, bio = null;

    String(text || '').split('\n').forEach(function (line) {
      line = line.trim();
      if (!line) return;
      var cut = line.indexOf(': ');
      var head = cut > 0 ? line.slice(0, cut) : '';
      var value = cut > 0 ? line.slice(cut + 2) : '';
      if (head.indexOf(CARD_NAME) === 0 && !name) { name = value; return; }
      if (head.indexOf(CARD_PLACE) === 0 && !place) { place = value; return; }
      if (head.indexOf(CARD_BIO) === 0 && !bio) { bio = value; return; }

      var row = document.createElement('div');
      if (!head) {
        row.className = 'pcard__line';
        row.textContent = line;
      } else {
        row.className = 'pcard__row';
        var l = document.createElement('span');
        l.className = 'pcard__label';
        l.textContent = head;
        var v = document.createElement('span');
        v.className = 'pcard__value';
        v.textContent = value;
        row.appendChild(l);
        row.appendChild(v);
      }
      var sec = opts.sections && head ? sectionOf(head) : -1;
      if (sec < 0) { rows.appendChild(row); return; }
      if (!sections[sec]) {
        sections[sec] = document.createElement('div');
        sections[sec].className = 'pcard__lines';
        var h = document.createElement('div');
        h.className = 'pcard__sec';
        h.textContent = T(CARD_SECTIONS[sec][0]);
        sections[sec].appendChild(h);
      }
      sections[sec].appendChild(row);
    });

    if (name) {
      var n = document.createElement('div');
      n.className = 'pcard__name';
      n.textContent = withoutCode(name, opts.code);
      node.appendChild(n);
    }
    if (place) {
      var pl = document.createElement('div');
      pl.className = 'pcard__place';
      pl.textContent = place;
      node.appendChild(pl);
    }
    node.appendChild(rows);
    sections.forEach(function (s) { if (s) node.appendChild(s); });
    if (bio) {
      var b = document.createElement('div');
      b.className = 'pcard__bio';
      // ⚠️ `dir=auto`: نبذةٌ إنجليزية في صفحةٍ عربية تنقلب نقطتُها إلى أوّلها.
      b.dir = 'auto';
      b.textContent = bio;
      node.appendChild(b);
    }
  }

  function cardNode(card, cls) {
    var node = document.createElement('article');
    node.className = 'pcard ' + cls;

    var head = document.createElement('div');
    head.className = 'pcard__head';

    var left = document.createElement('div');
    var pid = document.createElement('div');
    pid.className = 'pcard__id';
    pid.textContent = card.public_id || '';
    left.appendChild(pid);

    if (typeof card.score === 'number') {
      var score = document.createElement('div');
      score.className = 'pcard__score';
      score.textContent = T('web.score', { score: card.score });
      left.appendChild(score);
    }
    if (card._random) {
      var tag = document.createElement('span');
      tag.className = 'pcard__badge pcard__badge--random';
      tag.textContent = T('web.random_tag');
      left.appendChild(tag);
    }
    if (card.is_verified) {
      var badge = document.createElement('span');
      badge.className = 'pcard__badge';
      // ✅ رمزُ الشارة كما في البوت (يختاره المشرف) — لا الكلمة وحدها.
      badge.textContent = (card.verified_badge ? card.verified_badge + ' ' : '')
        + T('web.verified');
      left.appendChild(badge);
    }
    head.appendChild(left);

    var ava = document.createElement('div');
    ava.className = 'ava';
    ava.textContent = '👤';
    head.appendChild(ava);
    node.appendChild(head);

    if (card.has_photo) attachPhoto(ava, card, node);

    cardBody(node, card.card, { code: card.public_id });

    // ✅ **ختما القرار** — يظهران أثناء السحب وحده (`bindSwipe`)، فيعرف
    // الساحب قبل أن يُفلت ماذا سيحدث، ويتراجع بإعادة البطاقة للوسط.
    [['yes', 'web.like', '♥ '], ['no', 'web.skip', '✕ ']].forEach(function (s) {
      var stamp = document.createElement('span');
      stamp.className = 'pcard__stamp pcard__stamp--' + s[0];
      stamp.textContent = s[2] + T(s[1]);
      stamp.setAttribute('aria-hidden', 'true');
      node.appendChild(stamp);
    });

    var hint = document.createElement('p');
    hint.className = 'pcard__hint';
    hint.textContent = T('web.details');
    node.appendChild(hint);

    return node;
  }

  // ⚠️ **الصورة تُجلب بايتاتٍ ثم تُعرض من `blob:`** — الشرح في
  // `api.js`: المسار خلف ترويسة توكن، ورابطُ `getFile` من تيليجرام
  // (يحمل توكن البوت) لا يظهر هنا ولا في أي موضع.
  function attachPhoto(holder, card, noteHost) {
    var id = refId(card.public_id);
    if (!id) return;

    api.photoUrl(id).then(function (url) {
      photoUrls.push(url);
      var img = document.createElement('img');
      img.className = 'ava';
      img.alt = '';
      img.src = url;
      if (holder.parentNode) holder.parentNode.replaceChild(img, holder);

      // ⚠️ والملاحظة في البطاقة وحدها لا في صفّ القائمة: سطرٌ تحت كل
      // صفٍّ يملأ الشاشة بتكرارٍ لا يقرؤه أحد بعد أوّل مرّة.
      if (noteHost) {
        var note = document.createElement('p');
        note.className = 'pcard__note';
        note.textContent = T('web.blurred_note');
        noteHost.appendChild(note);
      }
    }).catch(function () {
      // ⚠️ غيابُ الصورة ليس عطلاً يُبلَّغ عنه: الرمز 👤 يبقى، والبطاقة
      // كاملةٌ بدونها. ورسالةُ خطأٍ هنا تُخيف من لا شأن له بالسبب.
    });
  }

  // السحب — مؤشّراتٌ موحّدة (لمسٌ وفأرةٌ وقلم) لا ثلاثةُ مسارات
  // ⚠️ **السحبُ العموديّ تمريرٌ لمحتوى البطاقة، لا ضغطة** — عطلٌ رآه
  // صاحب المشروع في فيديو: من يسحب للأعلى ليقرأ بقية الملفّ كانت تنفتح
  // له ورقةُ التفاصيل. فالمتصفّح حين يبدأ التمرير (`touch-action: pan-y`)
  // يُلغي اللمسة بـ`pointercancel`، وكان ذلك يمرّ بمسار الإفلات نفسه —
  // و«لم يتحرّك أفقياً» كانت تُقرأ ضغطة. والآن: المحورُ يُحسم عند أوّل
  // حركة؛ العموديّ يُترك للمتصفّح، والإلغاءُ لا يفتح شيئاً أبداً.
  var AXIS_SLOP = 8;

  function bindSwipe(node) {
    var startX = 0, startY = 0, dx = 0, dragging = false, axis = null;

    node.addEventListener('pointerdown', function (e) {
      if (busy) return;
      dragging = true; axis = null; dx = 0;
      startX = e.clientX;
      startY = e.clientY;
      node.style.transition = 'none';
    });

    // ⚠️ العتبة بالنسبة إلى عرض الشاشة لا برقمٍ ثابت: ١٠٠ بكسل على
    // هاتفٍ ضيّق نصفُ البطاقة، وعلى لوحيٍّ إزاحةٌ لا تكاد تُرى.
    function threshold() { return Math.min(120, window.innerWidth * 0.28); }

    var yes = node.querySelector('.pcard__stamp--yes');
    var no = node.querySelector('.pcard__stamp--no');

    // ✅ **ما سيحدث يُرى قبل الإفلات**: الختمُ يشتدّ مع المسافة حتى
    // يكتمل عند العتبة، والتوهّجُ يظهر بعد نصفها — أخضر للإعجاب وبلون
    // التخطّي للتخطّي، بلونَي الزرّين تحت البطاقة.
    function feedback(offset) {
      var k = Math.max(-1, Math.min(1, offset / threshold()));
      if (yes) yes.style.opacity = k > 0 ? k : 0;
      if (no) no.style.opacity = k < 0 ? -k : 0;
      node.classList.toggle('is-yes', k >= 0.5);
      node.classList.toggle('is-no', k <= -0.5);
    }

    node.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (!axis) {
        if (Math.abs(dx) < AXIS_SLOP && Math.abs(dy) < AXIS_SLOP) return;
        axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (axis === 'y') { dragging = false; return; }
        // ⚠️ **الأسر بعد حسم المحور لا عند اللمس**: أسرُ اللمسة من أوّلها
        // يسلبها من التمرير الذي قد تكونه.
        try { node.setPointerCapture(e.pointerId); } catch (err) { /* لا شيء */ }
      }
      node.style.transform = 'translate(' + dx + 'px,' + (dx / 20) + 'px) rotate('
                             + (dx / 18) + 'deg)';
      feedback(dx);
    });

    function end() {
      if (!dragging) return;
      dragging = false;
      node.style.transition = 'transform .3s';

      if (!axis) { openSheet(deck[0], true); node.style.transform = ''; return; }

      if (dx > threshold()) act('like');
      else if (dx < -threshold()) act('skip');
      else { node.style.transform = ''; feedback(0); }
      dx = 0;
    }

    node.addEventListener('pointerup', end);
    // الإلغاءُ (تمريرٌ بدأ، أو مكالمةٌ قطعت اللمسة) يُعيد البطاقة مكانها
    // ولا يفتح شيئاً ولا يقرّر شيئاً.
    node.addEventListener('pointercancel', function () {
      if (!dragging) return;
      dragging = false;
      node.style.transition = 'transform .3s';
      node.style.transform = '';
      feedback(0);
    });
  }

  // ==========================================================
  // ٥) الإعجاب والتخطّي
  // ==========================================================
  function act(action) {
    if (busy || !deck.length) return;
    var card = deck[0];
    var id = refId(card.public_id);
    if (!id) return;

    // ⚠️ **قفلٌ لا حرفَ زائد**: ضغطتان سريعتان (أو ضغطةٌ مع سحبة)
    // ترسلان فعلين على **نفس** البطاقة — والثاني يعود «سبق أن
    // تفاعلت»، فيبتلع الفعلُ الثاني بطاقةً لم يرها صاحبها.
    busy = true;
    var front = document.querySelector('.pcard--front');
    if (front) {
      var away = action === 'like' ? window.innerWidth : -window.innerWidth;
      // ✅ والختم يظهر كاملاً مع الزرّ أيضاً لا مع السحب وحده — فالضغطُ
      // على ♥ يقول «إعجاب» بالشكل نفسه.
      var stamp = front.querySelector(
        '.pcard__stamp--' + (action === 'like' ? 'yes' : 'no'));
      if (stamp) stamp.style.opacity = 1;
      front.classList.add(action === 'like' ? 'is-yes' : 'is-no');
      front.style.transition = 'transform .4s, opacity .4s';
      front.style.transform = 'translate(' + away + 'px,0) rotate('
                              + (action === 'like' ? 30 : -30) + 'deg)';
      front.style.opacity = '0';
    }

    api.interact(id, action).then(function (out) {
      var result = (out && out.result) || '';
      if (result === 'mutual') {
        // يُحفظ مَن تطابقتَ معه الآن، فيفتح زرُّ «مراسلة» دردشتَه هو.
        lastMatch = card.public_id;
        $('pop').hidden = false;
        buzz();
      }
      else if (result === 'limit') toast(T('web.limit_reached'));
      else if (result === 'already') toast(T('web.already'));
      else if (result === 'gone' || result === 'blocked') toast(T('web.gone'));
      else if (action === 'like') toast(T('web.liked'));
      advance();
    }).catch(function (err) {
      if (err.code === 'unauthorized') return boot();
      // ⚠️ **والبطاقة تبقى مكانها عند الفشل.** إسقاطُها بعد إعجابٍ لم
      // يصل يعني أن المستخدم أعجب بمن لا يعرف أنه أُعجب به، ولا سبيل
      // إلى رؤيته ثانيةً — فالإعجاب يُستبعد من البِركة بعدها.
      busy = false;
      if (front) {
        front.style.transform = '';
        front.style.opacity = '';
      }
      toast(errorText(err));
    });
  }

  function advance() {
    deck.shift();
    busy = false;
    // ⚠️ التعبئة قبل النفاد لا بعده: طلبٌ يبدأ عند آخر بطاقةٍ يترك
    // الشاشة فارغةً بين ردّين.
    if (deck.length <= 1) { loadDeck(); return; }
    renderDeck();
  }

  // ==========================================================
  // ٦) التبويبات
  // ==========================================================
  // ✅ **الجيبُ المنحني حول التبويب الحاليّ** — الشرح عند `.tabs__shape`
  // في app.css. المسارُ من موضع التبويب الفعليّ (`getBoundingClientRect`)
  // لا من ترتيبه، فلا حسابَ لاتجاه الصفحة ولا لعدد التبويبات.
  function drawTabNotch() {
    var bar = document.querySelector('.tabs');
    var on = bar && bar.querySelector('.tab.on');
    if (!bar || !on) return;
    var svg = bar.querySelector('.tabs__shape');
    var NS = 'http://www.w3.org/2000/svg';
    if (!svg) {
      svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'tabs__shape');
      svg.setAttribute('aria-hidden', 'true');
      var fill = document.createElementNS(NS, 'path');
      fill.setAttribute('class', 'fill');
      // ⚠️ **والجيبُ مملوءٌ بلون الصفحة لا شفّاف**: المحتوى يمرّ تحت الشريط
      // عند التمرير، فجيبٌ شفّاف يُظهر نصَّ الصفحة خلف أيقونة التبويب.
      var pocket = document.createElementNS(NS, 'path');
      pocket.setAttribute('class', 'pocket');
      svg.appendChild(pocket);
      var edge = document.createElementNS(NS, 'path');
      edge.setAttribute('class', 'edge');
      svg.appendChild(fill);
      svg.appendChild(edge);
      bar.insertBefore(svg, bar.firstChild);
    }
    var box = bar.getBoundingClientRect();
    var tab = on.getBoundingClientRect();
    var W = box.width, H = box.height;
    var pad = 6, r = 16;                                  // هامشُ الجيب وانحناءُ كتفيه
    var a = Math.max(0, tab.left - box.left + pad);
    var b = Math.min(W, tab.right - box.left - pad);
    var d = H - 6;                                        // عمقُ الجيب
    var y = 1;                                            // الخطّ داخل الحافة لا عليها
    // الحافة: خطٌّ مستقيم، ثم كتفٌ منحنٍ إلى الداخل، ثم قاعُ حرف U، ثم صعود.
    var edgePath = 'M0 ' + y + ' H' + (a - r) +
      ' Q' + a + ' ' + y + ' ' + a + ' ' + (y + r) +
      ' V' + (d - r) +
      ' Q' + a + ' ' + d + ' ' + (a + r) + ' ' + d +
      ' H' + (b - r) +
      ' Q' + b + ' ' + d + ' ' + b + ' ' + (d - r) +
      ' V' + (y + r) +
      ' Q' + b + ' ' + y + ' ' + (b + r) + ' ' + y +
      ' H' + W;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.querySelector('.edge').setAttribute('d', edgePath);
    // الخلفيةُ: الحافةُ نفسها مغلقةً من الأسفل — فالجيبُ خارجها بلون الصفحة.
    svg.querySelector('.fill').setAttribute('d', edgePath + ' V' + H + ' H0 Z');
    svg.querySelector('.pocket').setAttribute('d',
      'M' + a + ' 0 V' + (d - r) + ' Q' + a + ' ' + d + ' ' + (a + r) + ' ' + d +
      ' H' + (b - r) + ' Q' + b + ' ' + d + ' ' + b + ' ' + (d - r) + ' V0 Z');
  }
  window.addEventListener('resize', drawTabNotch);

  function openTab(name) {
    document.querySelectorAll('.tab').forEach(function (button) {
      button.classList.toggle('on', button.getAttribute('data-tab') === name);
    });
    drawTabNotch();

    var browsing = name === 'browse';
    $('search-btn').hidden = !browsing;
    $('view-browse').hidden = !browsing;
    $('swipe').hidden = !browsing;
    $('view-matches').hidden = name !== 'matches';
    $('view-profile').hidden = name !== 'profile';
    $('view-settings').hidden = name !== 'settings';

    if (browsing) { if (!deck.length) loadDeck(); else renderDeck(); }
    else if (name === 'matches') loadMutual();
    else if (name === 'settings') loadSettings();
    else loadProfile();
  }

  // ==========================================================
  // ❤️ من أعجب بي (٢٤ سبتمبر ٢٠٢٦)
  // ==========================================================
  //
  // ⚠️ **التعريفُ والقاعدةُ من البوت** (`services/likers.py`): المميَّزُ يرى
  // الأسماء دائماً، وغيرُه ما دام صاحبُ المشروع فتحها — والمغلقُ يرى العدد
  // وحده. والضغطُ على شخصٍ يفتح بطاقته بزرّ «إعجاب»، ومنه يقع التطابق.
  function likersEntry(slot) {
    api.likers().then(function (d) {
      if (!d || !d.count) return;
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'row likers-entry';
      var main = document.createElement('div');
      main.className = 'row__main';
      var name = document.createElement('div');
      name.className = 'row__name';
      name.textContent = T('web.likers');
      main.appendChild(name);
      row.appendChild(main);
      var n = document.createElement('span');
      n.className = 'bell__n row__n likers-entry__n';
      n.textContent = d.count > 99 ? '99+' : String(d.count);
      row.appendChild(n);
      row.addEventListener('click', function () { openLikers(d); });
      slot.appendChild(row);
    }).catch(function () { /* بلا قائمة لا صفّ — و«مطابقاتي» كاملةٌ بدونه */ });
  }

  function openLikers(d) {
    modTarget = null;
    $('mod-name').textContent = T('web.likers');
    var body = $('mod-body');
    body.textContent = '';
    modFromSheet = false;
    $('mod').hidden = false;

    if (d.locked) {
      var lock = document.createElement('p');
      lock.className = 'empty';
      lock.textContent = T('web.likers_locked', { count: d.count });
      body.appendChild(lock);
      var paySlot = document.createElement('div');
      body.appendChild(paySlot);
      payButton(paySlot);
      return;
    }
    if (!d.people || !d.people.length) {
      var none = document.createElement('p');
      none.className = 'empty';
      none.textContent = T('web.likers_empty');
      body.appendChild(none);
      return;
    }
    d.people.forEach(function (card) {
      var row = document.createElement('button');
      row.type = 'button';
      row.className = 'row';
      var ava = document.createElement('div');
      ava.className = 'ava';
      ava.textContent = '👤';
      row.appendChild(ava);
      if (card.has_photo) attachPhoto(ava, card);
      var main = document.createElement('div');
      main.className = 'row__main';
      var name = document.createElement('div');
      name.className = 'row__name';
      name.textContent = identity(card.who, card.public_id);
      var sub = document.createElement('div');
      sub.className = 'row__sub';
      sub.textContent = String(card.card || '').split('\n')[0] || '';
      main.appendChild(name);
      main.appendChild(sub);
      row.appendChild(main);
      // ⚠️ **الورقةُ فوق شاشة القائمة**: تُغلق هذه أوّلاً — `#mod` داخل
      // `.app` وسياقُ تكديسها أدنى من الورقة (الشرح عند `modFromSheet`).
      row.addEventListener('click', function () {
        $('mod').hidden = true;
        openSheet(card);
      });
      body.appendChild(row);
    });
  }

  function loadMutual() {
    var view = $('view-matches');
    view.textContent = '';
    var wait = document.createElement('p');
    wait.className = 'empty';
    wait.textContent = T('web.loading');
    view.appendChild(wait);

    api.mutual(20).then(function (data) {
      var rows = (data && data.results) || [];
      view.textContent = '';
      $('counter').textContent = '';

      // ✅ «❤️ من أعجب بي» فوق القائمة — موضعُه يُحجز الآن ويُملأ بعد ردّه.
      var likersSlot = document.createElement('div');
      view.appendChild(likersSlot);
      likersEntry(likersSlot);

      if (!rows.length) {
        var none = document.createElement('p');
        none.className = 'empty';
        none.textContent = T('web.no_matches');
        view.appendChild(none);
        return;
      }

      rows.forEach(function (card) {
        var row = document.createElement('button');
        row.type = 'button';
        row.className = 'row';

        var ava = document.createElement('div');
        ava.className = 'ava';
        ava.textContent = '👤';
        row.appendChild(ava);
        if (card.has_photo) attachPhoto(ava, card);

        var main = document.createElement('div');
        main.className = 'row__main';
        var name = document.createElement('div');
        name.className = 'row__name';
        name.textContent = identity(card.who, card.public_id);
        var sub = document.createElement('div');
        sub.className = 'row__sub';
        // أوّل سطرٍ من البطاقة يكفي في قائمة — والباقي في الورقة.
        sub.textContent = String(card.card || '').split('\n')[0] || '';
        main.appendChild(name);
        main.appendChild(sub);
        row.appendChild(main);

        row.addEventListener('click', function () { openSheet(card); });

        // ⚠️ **زرٌّ مستقلّ لا نقرةٌ على الصفّ كلِّه**: الصفُّ يفتح
        // البطاقة، والمراسلةُ فعلٌ آخر — ودمجُهما يجعل من أراد أن
        // يقرأ الملفَّ يفتح محادثةً بلا قصد.
        var talk = document.createElement('button');
        talk.type = 'button';
        talk.className = 'row__go';
        talk.textContent = '💬';
        // ✅ **عددُ ما لم يُقرأ من هذا الشريك فوق الزرّ** — بشكل شارة
        // الجرس نفسه. وبدونه يتساوى صفُّ من ينتظر ردَّك بصفٍّ ساكن.
        var unread = card.unread || 0;
        if (unread) {
          var n = document.createElement('span');
          n.className = 'bell__n row__n';
          n.textContent = unread > 99 ? '99+' : String(unread);
          talk.appendChild(n);
        }
        talk.setAttribute('aria-label', T('web.chat')
                          + (unread ? ' (' + unread + ')' : ''));
        talk.addEventListener('click', function (e) {
          e.stopPropagation();
          // ⚠️ **`refId` لا `public_id` خاماً**: تمريرُ النصّ كما هو
          // يعطي `/api/me/chats/%23…` — أي 422 صامتة عند المستخدم:
          // شاشةٌ تُفتح فارغةً بلا رسالة.
          openChat(refId(card.public_id), identity(card.who, card.public_id));
        });
        row.appendChild(talk);

        view.appendChild(row);
      });
    }).catch(function (err) {
      if (err.code === 'unauthorized') return boot();
      view.textContent = '';
      var line = document.createElement('p');
      line.className = 'empty';
      line.textContent = errorText(err);
      view.appendChild(line);
    });
  }

  // ==========================================================
  // ٦ ب) المحادثة
  // ==========================================================
  //
  // ⚠️ **واستطلاعٌ لا دفعٌ فوريّ، بقرارٍ لا كسلاً.** الدفعُ الحقيقيّ
  // يحتاج WebSocket أو SSE — أي اتصالاً مفتوحاً لكل قارئ على خدمةٍ
  // بذاكرةٍ محدودة، وطابورَ رسائلَ بين عمليتين. والاستطلاع كلفتُه
  // استعلامٌ واحد بفهرسٍ كلَّ بضع ثوانٍ، ويتوقّف فورَ إغلاق الشاشة.
  //
  // ⚠️ **ولا يعمل إلا والمحادثة مفتوحة**: مؤقّتٌ يبقى بعد الخروج يسأل
  // الخادمَ إلى الأبد عن شاشةٍ لا يراها أحد — وهو أكثر ما يستنزف
  // بطارية الهاتف وحصّة الخدمة بلا أن يشتكي شيء.

  var chatWith = null;      // معرّفُ الشريك العامّ، أو null
  var chatLastId = 0;       // آخرُ رسالةٍ رُسمت — أساسُ الاستطلاع
  var chatTimer = null;

  var CHAT_POLL_MS = 4000;

  function openChat(publicId, name) {
    chatWith = publicId;
    chatLastId = 0;
    $('chat-name').textContent = name || '';
    $('chat-log').textContent = '';
    $('chat').hidden = false;
    $('chat-text').value = '';

    // ⚠️ **ويُرفع حارسُ التزامن عند كل فتح.** بدونه: من يغلق
    // محادثةً وطلبُها في الطريق ثم يفتح أخرى، يجد شاشتَه **فارغة أربع
    // ثوانٍ** — لأن `pullMessages(true)` ترتدّ على الحارس، ومعها
    // يضيع `first` (اسمُ الشريك والقفزُ إلى الأسفل). ورفعُه هنا آمن:
    // ردُّ الطلب القديم يرتدّ على `chatWith !== asked`، والتكرارُ
    // — إن وقع — يمنعه فحصُ `data-id` أدناه.
    pulling = false;
    pullMessages(true);
    stopChatPolling();
    // ⚠️ **ولا سؤالَ والتبويبُ مخفيّ** (البند ١٢ في `docs/PRE_ADS_FIXES.md`):
    // دردشةٌ تُركت مفتوحة في تبويبٍ منسيّ كانت تسأل الوسيط كلَّ أربع ثوانٍ
    // إلى الأبد — خمسةَ عشرَ طلباً في الدقيقة لشاشةٍ لا يراها أحد. والجرسُ
    // يفعل هذا من قبل. والعودةُ إلى التبويب تسأل فوراً (`chatVisible`).
    chatTimer = setInterval(function () {
      if (!document.hidden) pullMessages(false);
    }, CHAT_POLL_MS);
  }

  // العائدُ إلى تبويبٍ فيه محادثةٌ مفتوحة يرى الجديد فوراً لا بعد أربع ثوانٍ.
  // ✅ ويُسجَّل مرّةً عند تحميل الوحدة — والمتصفّح يتجاهل التكرار أصلاً.
  function chatVisible() {
    if (!document.hidden && chatWith && chatTimer) pullMessages(false);
  }
  document.addEventListener('visibilitychange', chatVisible);

  function closeChat() {
    stopChatPolling();
    chatWith = null;
    $('chat').hidden = true;
    // العودةُ تُحدّث الصندوق: عدّادُ غير المقروء تغيّر بالقراءة نفسها.
    if (!$('view-matches').hidden) loadMutual();
  }

  // ✅ **الضغطُ على اسم الشريك يفتح ملفَّه** (بطلب صاحب المشروع) — كما في
  // تيليجرام وواتساب. والورقةُ فوق المحادثة، فالرجوعُ منها يعيد إليها.
  function openChatPartner() {
    if (!chatWith) return;
    api.person(chatWith).then(function (card) { openSheet(card); })
      .catch(function (err) { toast(errorText(err)); });
  }

  function stopChatPolling() {
    if (chatTimer) { clearInterval(chatTimer); chatTimer = null; }
  }

  // ⚠️ **حارسٌ على استطلاعين متزامنين.** الإرسال يستدعي `pullMessages`
  // فوراً، والمؤقّت يستدعيها كل أربع ثوانٍ — فقد يكون طلبان في الطريق
  // بنفس `chatLastId`، فيعودان بنفس الصفوف **فتُرسَم الرسالة مرّتين**.
  // وقع هذا في الإنتاج ورآه صاحب المشروع.
  var pulling = false;

  function pullMessages(first) {
    if (!chatWith || pulling) return;
    var asked = chatWith;
    pulling = true;

    api.chatMessages(asked, chatLastId).then(function (data) {
      // ⚠️ **وقد تُغلق الشاشة والطلبُ في الطريق**: الردُّ حينها يرسم
      // في محادثةٍ أخرى — أو في لا شيء. فيُقارَن الشريك قبل الرسم.
      if (chatWith !== asked) return;

      if (first && (data.who || data.partner)) {
        $('chat-name').textContent = identity(data.who || data.partner,
                                              data.public_id);
      }

      // ⚠️ **وتُحدَّث علامةُ القراءة في كل دورة ولو لم تصل رسالة**:
      // «قرأها» حدثٌ يقع على رسالةٍ **قديمة**، والاستطلاع لا يجلب
      // القديم — فبلا هذا السطر لا تضيء «✓✓» أبداً.
      applySeen(data.seen_upto || 0);

      var rows = data.messages || [];
      if (!rows.length) return;

      var log = $('chat-log');
      var atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 60;

      // اهتزازةٌ لرسالةٍ واردة جديدة — لا لتاريخ المحادثة عند فتحها.
      if (!first && rows.some(function (m) { return !m.mine; })) buzz();

      rows.forEach(function (message) {
        // ⚠️ **وفحصٌ بالمعرّف مهما كان مصدر التكرار.** الحارس أعلاه
        // يمنع السببَ المعروف، وهذا يمنع **الأثر** أياً كان سببه —
        // تكرارٌ في الردّ، أو رسمٌ بعد عودةٍ إلى الشاشة. والرسالةُ
        // المكرّرة في محادثةٍ عطلٌ يراه المستخدم ويظنّه إرسالاً مضاعفاً.
        if (log.querySelector('[data-id="' + message.id + '"]')) return;
        log.appendChild(bubble(message));
        if (message.id > chatLastId) chatLastId = message.id;
      });

      // ⚠️ **ولا يُقفز إلى الأسفل إلا إن كان القارئ هناك أصلاً**: من
      // يقرأ رسالةً قديمة فوق يُقذف إلى الأسفل مع كل وصولٍ جديد.
      if (first || atBottom) log.scrollTop = log.scrollHeight;
    }).catch(function (err) {
      if (err.code === 'unauthorized') { stopChatPolling(); boot(); }
      // وعطلُ شبكةٍ عابر لا يُغلق شيئاً: الدورةُ التالية تحاول.
    }).then(function () { pulling = false; });
  }

  // ⚠️ **تُبنى عقدةَ نصٍّ لا `innerHTML`**: محتواها كتبه **إنسانٌ آخر**،
  // ولصقُه سلسلةَ HTML يجعل أيَّ وسمٍ فيه كوداً يعمل في متصفّحك —
  // وهي الثغرة التي تقرأ التوكن من التخزين المحلّي. وهذا الموضع أخطر
  // من غيره في التطبيق كلّه: هو الوحيد الذي يعرض نصّاً حرّاً من الغير.
  function bubble(message) {
    var wrap = document.createElement('div');
    wrap.className = 'msg' + (message.mine ? ' msg--mine' : '');
    wrap.setAttribute('data-id', message.id);

    var body = document.createElement('div');
    body.className = 'msg__text';
    body.textContent = message.text;
    wrap.appendChild(body);

    var meta = document.createElement('div');
    meta.className = 'msg__meta';
    meta.setAttribute('data-time', shortTime(message.at));
    meta.textContent = meta.getAttribute('data-time');
    wrap.appendChild(meta);
    return wrap;
  }

  // يُضيء «✓✓» على كل رسالةٍ لي بلغها الطرف الآخر.
  function applySeen(upto) {
    if (!upto) return;
    document.querySelectorAll('#chat-log .msg--mine').forEach(function (node) {
      if (parseInt(node.getAttribute('data-id'), 10) > upto) return;
      var meta = node.querySelector('.msg__meta');
      if (meta && meta.textContent.indexOf('✓✓') < 0) {
        meta.textContent = meta.getAttribute('data-time') + ' ✓✓';
      }
    });
  }

  function shortTime(iso) {
    if (!iso) return '';
    try {
      // ⚠️ **والخادم يكتب UTC بلا لاحقة** (`datetime.utcnow`)، فبلا
      // `Z` يقرؤها المتصفّح بتوقيته المحلّي — فتظهر رسالةُ الآن قبل
      // ساعاتٍ أو بعدها بحسب مكان القارئ.
      var stamp = /(Z|[+-]\d\d:?\d\d)$/.test(iso) ? iso : iso + 'Z';
      return new Date(stamp).toLocaleTimeString(LANG, {
        hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
  }

  function bindChat() {
    $('chat-back').addEventListener('click', closeChat);

    $('chat-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = $('chat-text');
      var text = input.value.trim();
      if (!text || !chatWith) return;

      var target = chatWith;
      var button = this.querySelector('button[type="submit"]');
      input.value = '';
      input.disabled = true;
      // ⚠️ **والزرُّ يُعطَّل مع الحقل لا الحقلُ وحده.** كان الحقل وحده
      // يُعطَّل، والزرُّ يبقى قابلاً للنقر — فنقرتان سريعتان على هاتف
      // (وهو ما يفعله من لا يرى استجابةً فورية) تُرسلان **رسالتين**.
      if (button) button.disabled = true;

      api.sendMessage(target, text).then(function () {
        input.disabled = false;
        if (button) button.disabled = false;
        input.focus();
        pullMessages(false);
      }).catch(function (err) {
        input.disabled = false;
        if (button) button.disabled = false;
        // ⚠️ **ويُعاد النصُّ إلى الحقل عند الفشل**: من كتب سطرين ثم
        // انقطعت شبكتُه يجب ألّا يفقدهما — وإفراغُ الحقل قبل نجاح
        // الإرسال هو ما يُفقدهما.
        if (!input.value) input.value = text;
        // ✅ **ونصُّ الخادم حين يرسله** — «انتظر ردّه» في المراسلة المباشرة
        // (رسالتان قبل الردّ) جملةٌ لها معنى، لا «حدث خطأ».
        toast((err && err.data && err.data.message) || errorText(err));
      });
    });
  }

  // ✅ **تذكيرٌ بالصفات الجسدية الناقصة** (بقرار صاحب المشروع، ٢٤ سبتمبر
  // ٢٠٢٦): صارت إلزاميةً في التسجيل، ومن تخطّاها قبلها يُذكَّر هنا **ولا
  // يُحبس** — القائمةُ من الخادم (`services/profile_gaps.py`)، والزرُّ يفتح
  // «تعديل بياناتي» حيث تظهر الحقولُ نفسها.
  function gapsCard(gaps) {
    if (!gaps || !gaps.length) return null;
    var box = document.createElement('section');
    box.className = 'card gaps';
    var h = document.createElement('p');
    h.className = 'gaps__title';
    h.textContent = T('web.gaps_title');
    box.appendChild(h);
    var sep = (LANG === 'ar' || LANG === 'fa') ? '، ' : ', ';
    var p = document.createElement('p');
    p.className = 'gaps__body';
    p.textContent = T('web.gaps_body', {
      fields: gaps.map(function (g) { return g.label; }).join(sep)
    });
    box.appendChild(p);
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn--primary';
    b.textContent = T('web.gaps_button');
    b.addEventListener('click', showEdit);
    box.appendChild(b);
    return box;
  }

  // ✅ **مؤشّرُ اكتمال الملفّ** (بطلب صاحب المشروع، ٢٤ سبتمبر ٢٠٢٦): نسبةٌ
  // وشريط، وكلُّ ناقصٍ زرٌّ يفتحه نفسه — التعديلُ أو الصورةُ أو التوثيق.
  // الحسابُ في الخادم (`services/profile_completion.py`) وهو حسابُ البوت
  // نفسه، فلا نسبةَ في الموقع تخالف ما في «ملفي» هناك. ويغيب عند المئة.
  var COMPLETION_SHOWN = 6;

  function completionCard(mine, view) {
    var info = mine && mine.completion;
    if (!info || !info.missing || !info.missing.length) return null;
    // الصورةُ المرفوعة التي تنتظر البوت ليست ناقصة — قالت الصفحة «جارٍ».
    var missing = info.missing.filter(function (m) {
      return !(m.action === 'photo' && mine.photo_pending);
    });
    if (!missing.length) return null;

    var box = document.createElement('section');
    box.className = 'card gaps completion';
    var h = document.createElement('p');
    h.className = 'gaps__title';
    h.textContent = T('web.completion_title', { percent: info.percent });
    box.appendChild(h);

    var track = document.createElement('div');
    track.className = 'completion__track';
    var fill = document.createElement('div');
    fill.className = 'completion__fill';
    fill.style.width = Math.max(4, Math.min(100, info.percent)) + '%';
    track.appendChild(fill);
    box.appendChild(track);

    var p = document.createElement('p');
    p.className = 'gaps__body';
    p.textContent = T('web.completion_hint');
    box.appendChild(p);

    var chips = document.createElement('div');
    chips.className = 'chips';
    missing.slice(0, COMPLETION_SHOWN).forEach(function (m) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = '+ ' + m.label;
      chip.addEventListener('click', function () {
        if (m.action === 'verify') return openVerify();
        if (m.action === 'photo') {
          var pick = view.querySelector('.photo-block .btn--ghost');
          if (pick) { pick.scrollIntoView({ block: 'center' }); return pick.click(); }
        }
        showEdit();
      });
      chips.appendChild(chip);
    });
    if (missing.length > COMPLETION_SHOWN) {
      var more = document.createElement('button');
      more.type = 'button';
      more.className = 'chip';
      more.textContent = '+' + (missing.length - COMPLETION_SHOWN);
      more.addEventListener('click', showEdit);
      chips.appendChild(more);
    }
    box.appendChild(chips);
    return box;
  }

  function loadProfile() {
    var view = $('view-profile');
    view.textContent = '';
    $('counter').textContent = '';

    var wait = document.createElement('p');
    wait.className = 'empty';
    wait.textContent = T('web.loading');
    view.appendChild(wait);

    api.me().then(function (mine) {
      view.textContent = '';

      var card = document.createElement('section');
      card.className = 'card';
      // ⚠️ **ونصُّ «ملفّي» من البوت نفسه لا من نسخةٍ ثانية** — هو ما
      // يراه صاحبه هناك حرفياً.
      lines(card, mine && (mine.text || mine.card));
      // الصورةُ فوق النصّ — أوّلُ ما يُرى في أي ملفٍّ شخصيّ.
      var photo = photoBlock(mine);
      if (photo) view.appendChild(photo);
      // ⚠️ `gapsCard` احتياطٌ لوسيطٍ أقدم لا يرسل `completion`.
      var gaps = (mine && mine.completion) ? completionCard(mine, view)
                                           : gapsCard(mine && mine.profile_gaps);
      if (gaps) view.appendChild(gaps);
      view.appendChild(card);

      // ✅ «تعديل بياناتي» (٢٣ سبتمبر ٢٠٢٦) — حقولُ البوت نفسها، يقرّرها
      // الوسيط (`services/web_profile.py::EDITABLE`) لا هذه الصفحة.
      var editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn btn--primary';
      editBtn.textContent = T('web.edit_profile');
      editBtn.addEventListener('click', showEdit);
      view.appendChild(editBtn);
      // ✅ «تفضيلات الشريك» بجواره — كما في قائمة البوت: البيانات ثم التفضيلات.
      var prefsBtn = document.createElement('button');
      prefsBtn.type = 'button';
      prefsBtn.className = 'btn btn--ghost';
      prefsBtn.textContent = T('web.prefs_button');
      prefsBtn.addEventListener('click', function () { showPrefs(false); });
      view.appendChild(prefsBtn);
      // ⚠️ **وما سوى الملفّ في «⚙️ الإعدادات»** (٢٤ سبتمبر ٢٠٢٦): الإشعارات
      // والخصوصية والحساب والمساعدة — `loadSettings` أدناه.
    }).catch(function (err) {
      if (err.code === 'unauthorized') return boot();
      view.textContent = '';
      var line = document.createElement('p');
      line.className = 'empty';
      line.textContent = errorText(err);
      view.appendChild(line);
    });
  }


  // ==========================================================
  // ⚙️ الإعدادات (٢٤ سبتمبر ٢٠٢٦، بطلب صاحب المشروع)
  // ==========================================================
  //
  // ✅ **أربعة أقسام، و«ملفّي» للملفّ وحده**: الصورة والبطاقة والتعديل هناك،
  // وكلُّ ما سواها هنا. وكلُّ مفتاحٍ عَلَمُ البوت نفسه
  // (`services/web_settings.py`) — لا إعدادٌ للموقع يخالف ما في البوت.
  function settingsSection(view, titleKey) {
    var box = document.createElement('section');
    box.className = 'card settings';
    var h = document.createElement('h3');
    h.className = 'settings__title';
    h.textContent = T(titleKey);
    box.appendChild(h);
    view.appendChild(box);
    return box;
  }

  function settingsButton(box, text, onClick, cls) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ' + (cls || 'btn--ghost');
    b.textContent = text;
    b.addEventListener('click', onClick);
    box.appendChild(b);
    return b;
  }

  // ⚠️ **المفتاحُ يُرسل وحده** (`{reminders: …}`) — والخادم لا يقرأ الغائب
  // إيقافاً. وعند الفشل يعود المربّع إلى حاله: مربّعٌ يقول «مفعّل» والخادمُ
  // لم يسمع أسوأُ من رسالة خطأ.
  function settingsToggle(box, text, checked, key) {
    var row = document.createElement('label');
    row.className = 'toggle';
    var span = document.createElement('span');
    span.textContent = text;
    var input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = !!checked;
    row.appendChild(span);
    row.appendChild(input);
    input.addEventListener('change', function () {
      var body = {};
      body[key] = input.checked;
      input.disabled = true;
      api.saveSettings(body).then(function () {
        input.disabled = false;
        toast(T('web.saved'));
      }).catch(function (err) {
        input.disabled = false;
        input.checked = !input.checked;
        if (err.code === 'unauthorized') return boot();
        toast(errorText(err));
      });
    });
    box.appendChild(row);
  }

  function loadSettings() {
    var view = $('view-settings');
    view.textContent = '';
    $('counter').textContent = '';

    var wait = document.createElement('p');
    wait.className = 'empty';
    wait.textContent = T('web.loading');
    view.appendChild(wait);

    api.settings().then(function (st) {
      view.textContent = '';
      st = st || {};

      // 🔔 الإشعارات
      var notes = settingsSection(view, 'web.settings_notifications');
      var pushSlot = document.createElement('div');
      notes.appendChild(pushSlot);
      pushBlock(pushSlot);
      settingsToggle(notes, T('web.reminders'), st.reminders, 'reminders');

      // 🔒 الخصوصية
      var priv = settingsSection(view, 'web.settings_privacy');
      settingsButton(priv, T('web.photo_access'), openPhotoAccess);
      settingsButton(priv, T('web.photo_requests'), openPhotoRequests);
      settingsButton(priv, T('web.blocked_list'), openBlocked);
      if (st.publish && st.publish.available) {
        settingsToggle(priv, T('web.publish_profile'), st.publish.on, 'publish');
      }

      // 👤 الحساب
      var acct = settingsSection(view, 'web.settings_account');
      var langRow = document.createElement('div');
      langRow.className = 'langpick';
      acct.appendChild(langRow);
      langPicker(langRow);
      // 💎 الاشتراك — ⚠️ **موضعٌ يُحجز ويُملأ بعد الردّ**، وإلا نزل الزرّ
      // تحت «حذف حسابي» حين يصل.
      var paySlot = document.createElement('div');
      acct.appendChild(paySlot);
      payButton(paySlot);
      var inviteSlot = document.createElement('div');
      acct.appendChild(inviteSlot);
      inviteButton(inviteSlot);
      var verifySlot = document.createElement('div');
      acct.insertBefore(verifySlot, acct.children[1] || null);
      verifyButton(verifySlot);
      var links = st.links || {};
      var bot = document.createElement('a');
      bot.className = 'btn btn--ghost';
      bot.href = links.bot || 'https://t.me/HisnAlzawaj_bot';
      bot.rel = 'noopener';
      bot.textContent = T('web.open_bot');
      acct.appendChild(bot);
      settingsButton(acct, T('web.logout'), function () {
        // ⚠️ **الاشتراكُ يُلغى قبل الخروج**: الهاتفُ المشترك يبقى وإلا
        // يتلقّى تنبيهاتِ الحساب الذي خرج منه صاحبُه.
        pushOff();
        api.logout();
        deck = [];
        releasePhotos();
        boot();
      });

      // ❓ المساعدة — صفحاتُ الموقع الساكن بلغة القارئ، من الخادم.
      var help = settingsSection(view, 'web.settings_help');
      [['guide', 'web.help_guide'], ['privacy', 'web.help_privacy'],
       ['terms', 'web.help_terms'], ['channel', 'web.help_channel']].forEach(function (pair) {
        if (!links[pair[0]]) return;
        var a = document.createElement('a');
        a.className = 'btn btn--ghost';
        a.href = links[pair[0]];
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = T(pair[1]);
        help.appendChild(a);
      });
      var install = window.HISN && window.HISN.install;
      if (install && install.available()) {
        settingsButton(help, T('web.install_app'), function () { install.run(); });
      }

      // ✅ **«حذف حسابي» في ذيل الشاشة لا وسط «الحساب»** (بطلب صاحب
      // المشروع، ٢٤ سبتمبر ٢٠٢٦): فعلٌ لا رجعة فيه لا يجاور «خروج» و«افتح
      // البوت» — ضغطةٌ خاطئة بينها أوّلُ طريقٍ إليه. وتأكيدُه باقٍ كما كان.
      var danger = document.createElement('section');
      danger.className = 'card settings__danger';
      danger.appendChild(deleteBlock());
      view.appendChild(danger);
    }).catch(function (err) {
      if (err.code === 'unauthorized') return boot();
      view.textContent = '';
      var line = document.createElement('p');
      line.className = 'empty';
      line.textContent = errorText(err);
      view.appendChild(line);
    });
  }

  // ✅ **«ادعُ أصدقاءك» (٢٤ سبتمبر ٢٠٢٦)** — نصوصُ البوت ورابطُه
  // (`referral_service.web_invite`)؛ ولا زرّ حين تكون الميزة معطَّلة.
  // ⚠️ **الرابطُ رابطُ البوت**: الإحالةُ مكافأةٌ تُختم هناك، ولا طريقَ ثانياً.
  function inviteButton(slot) {
    api.invite().then(function (d) {
      if (!d || !d.enabled) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn--ghost';
      b.textContent = d.label;
      b.addEventListener('click', function () { openInvite(d); });
      slot.appendChild(b);
    }).catch(function () { /* بلا دعوة لا زرّ */ });
  }

  function openInvite(d) {
    modTarget = null;
    $('mod-name').textContent = d.label;
    var body = $('mod-body');
    body.textContent = '';
    modFromSheet = false;
    $('mod').hidden = false;

    var text = document.createElement('p');
    text.className = 'invite__text';
    text.textContent = d.text;
    body.appendChild(text);

    var link = document.createElement('p');
    link.className = 'invite__link';
    link.dir = 'ltr';
    link.textContent = d.link;
    body.appendChild(link);

    var copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'btn btn--primary';
    copy.textContent = T('web.copy_link');
    copy.addEventListener('click', function () {
      var done = function () { toast(T('web.copied')); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(d.link).then(done).catch(function () {
          window.prompt('', d.link);
        });
      } else {
        window.prompt('', d.link);
      }
    });
    body.appendChild(copy);

    // ✅ **مشاركةُ النظام حين توجد** (هاتف)، وإلا رابطُ مشاركة تيليجرام —
    // وهو ما يفتحه زرّ البوت نفسه (`handlers/referral.py::_share_url`).
    var share = document.createElement('button');
    share.type = 'button';
    share.className = 'btn btn--ghost';
    share.textContent = d.share_label;
    share.addEventListener('click', function () {
      if (navigator.share) {
        navigator.share({ text: d.share_text, url: d.link }).catch(function () {});
        return;
      }
      window.open('https://t.me/share/url?url=' + encodeURIComponent(d.link)
                  + '&text=' + encodeURIComponent(d.share_text), '_blank', 'noopener');
    });
    body.appendChild(share);
  }

  // ============================================================
  // ✅ **توثيقُ الهوية (٢٤ سبتمبر ٢٠٢٦، بقرار صاحب المشروع)** — تسجيلٌ من
  // الكاميرا في المتصفّح، وتحليلٌ في البوت (`services/web_verification.py`).
  // ⚠️ **من الكاميرا لا من المعرض**: `getUserMedia` لا `<input type=file>` —
  // الفيديو المرفوع من المعرض قد يكون مسجَّلاً قبل أن يصدر الرمز.
  // ⚠️ **ونصُّ الموافقة من الخادم**: وعدُ البوت لا يصدق هنا، فللويب نصُّه.
  // ============================================================
  var verifyStream = null;
  var verifyRecorder = null;
  var verifyTimer = null;

  function stopVerifyCamera() {
    if (verifyTimer) { clearInterval(verifyTimer); verifyTimer = null; }
    if (verifyRecorder && verifyRecorder.state === 'recording') {
      verifyRecorder.onstop = null;
      try { verifyRecorder.stop(); } catch (e) { /* لا شيء */ }
    }
    verifyRecorder = null;
    if (verifyStream) {
      verifyStream.getTracks().forEach(function (tr) { tr.stop(); });
      verifyStream = null;
    }
  }

  function verifyButton(slot) {
    api.verifyStatus().then(function (st) {
      if (!st || st.state === 'disabled' || st.state === 'verified') return;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn--primary';
      // ✅ بشارة التوثيق نفسها التي في البوت (`st.badge`) — كانت 🔵 ثابتة.
      b.textContent = (st.badge ? st.badge + ' ' : '') + T('web.verify_button');
      b.addEventListener('click', openVerify);
      slot.appendChild(b);
    }).catch(function () { /* بلا حالة لا زرّ */ });
  }

  function verifyShell() {
    modTarget = null;
    $('mod-name').textContent = T('web.verify_button');
    var body = $('mod-body');
    body.textContent = '';
    return body;
  }

  function verifyText(body, text, cls) {
    if (!text) return;
    var p = document.createElement('p');
    p.className = cls || 'verify__text';
    p.textContent = text;
    body.appendChild(p);
  }

  function verifyAction(body, label, primary, fn) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ' + (primary ? 'btn--primary' : 'btn--ghost');
    b.textContent = label;
    b.addEventListener('click', fn);
    body.appendChild(b);
    return b;
  }

  function openVerify() {
    stopVerifyCamera();
    var body = verifyShell();
    body.textContent = T('web.loading');
    modFromSheet = false;
    $('mod').hidden = false;
    api.verifyStatus().then(verifyShowStatus).catch(function (err) {
      verifyShell();
      verifyText($('mod-body'), errorText(err));
    });
  }

  // ما تقوله الحالة: تحليلٌ جارٍ، أو نتيجةٌ حديثة، أو منعٌ، أو بدء.
  // ✅ **«تحتاج صورةً» ومعها زرُّ الرفع** (بطلب صاحب المشروع، ٢٤ سبتمبر
  // ٢٠٢٦): كانت الشاشة تطلب صورةً ولا تعطي طريقاً إليها. الرفعُ نفسُه رفعُ
  // «ملفي» (`prepareJpeg` ثم `uploadPhoto` — تصغيرٌ ونزعُ EXIF)، ثم تنتظر
  // الشاشةُ أن يحملها البوت إلى تيليجرام وتكمل إلى الموافقة وحدها.
  function verifyNeedPhoto(body, message) {
    verifyText(body, message);
    api.me().then(function (mine) {
      if (!mine || !mine.photo_upload) return;       // بلا قناة تخزين لا رفع
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.hidden = true;
      body.appendChild(input);
      var line = document.createElement('p');
      line.className = 'verify__note';
      body.appendChild(line);
      var pick = verifyAction(body, T('web.photo_add'), true, function () { input.click(); });
      var waitReady = function (tries) {
        if ($('mod').hidden || tries <= 0) return;
        setTimeout(function () {
          api.me().then(function (m) {
            if (m && m.has_photo && !m.photo_pending) verifyConsent();
            else waitReady(tries - 1);
          }).catch(function () { waitReady(tries - 1); });
        }, 4000);
      };
      if (mine.photo_pending) {
        pick.disabled = true;
        line.textContent = T('web.photo_pending');
        waitReady(22);
      }
      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        input.value = '';
        if (!file) return;
        pick.disabled = true;
        line.textContent = T('web.photo_pending');
        prepareJpeg(file).then(function (blob) {
          return api.uploadPhoto(blob);
        }).then(function () {
          waitReady(22);
        }).catch(function (err) {
          pick.disabled = false;
          line.textContent = '';
          if (err.code === 'unauthorized') return boot();
          toast(err.code === 'http' || !err.code ? T('web.photo_bad') : errorText(err));
        });
      });
    }).catch(function () { /* الرسالة وحدها تكفي */ });
  }

  function verifyShowStatus(st) {
    if (!st) return;
    if (st.state === 'analyzing') return verifyWait(st.message);
    if (st.state === 'idle') return verifyConsent();
    var body = verifyShell();
    if (st.state === 'no_photo') return verifyNeedPhoto(body, st.message);
    verifyText(body, st.message);
    verifyText(body, st.tips);
    if (st.can_start) verifyAction(body, T('web.verify_retry'), true, verifyConsent);
  }

  function verifyConsent() {
    var body = verifyShell();
    body.textContent = T('web.loading');
    api.verifyConsent().then(function (c) {
      body = verifyShell();
      if (c.state === 'no_photo') return verifyNeedPhoto(body, c.message);
      if (c.state !== 'ready') { verifyText(body, c.message); return; }
      $('mod-name').textContent = c.title;
      verifyText(body, c.body);
      verifyText(body, c.ai_notice, 'verify__note');
      verifyAction(body, c.agree, true, verifyChallenge);
    }).catch(function (err) { verifyText(verifyShell(), errorText(err)); });
  }

  // ✨ **مسرحُ المسح** — ثلاثُ حالات: `camera` (المعاينة الحيّة)، و`wait`
  // (التحليل)، و`done` (وُثِّق). حلقةٌ من ٧٢ شَرطة تضيء مع ثواني التسجيل
  // (كإعداد Face ID)، وشبكةُ نقاطٍ فوق الوجه يوقظها خطُّ المسح، ورأسٌ من
  // نقاطٍ يدور أثناء التحليل، ثم تتجمّع نقاطُه علامةَ ✓ عند التوثيق.
  //
  // ⚠️ **زينةٌ لا فحص**: الحكمُ من التحليل في البوت
  // (`services/web_verification.py`)، والمسرحُ لا يعرف عن الوجه شيئاً —
  // فلا نصَّ فيه يدّعي «تعرّفنا على وجهك» قبل أن يصل القرار.
  //
  // ⚠️ **وبلا مكتبة**: Canvas وSVG من المتصفّح وحدهما (لا سكربتَ من طرفٍ
  // ثالث في صفحةٍ يسكنها التوكن — CLAUDE.md). والحلقةُ تتوقّف بنفسها متى
  // خرج المسرح من الصفحة (`isConnected`)، فلا تدور في الخلفية بلا قارئ.
  // ومن طلب تقليل الحركة يرى إطاراً واحداً ثابتاً.
  var VS_TICKS = 72;
  var VS_STILL = !!(window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // رأسٌ من نقاط: سطحُ مجسّمٍ بيضاويّ، ومعه عينان وأنفٌ وفم — إحداثيّاتٌ بين -1 و1.
  function vsHead() {
    var pts = [], i, j;
    for (i = 0; i <= 22; i++) {
      var lat = -Math.PI / 2 + Math.PI * i / 22;
      var ring = Math.max(6, Math.round(34 * Math.cos(lat)));
      for (j = 0; j < ring; j++) {
        var lon = 2 * Math.PI * j / ring;
        pts.push([0.66 * Math.cos(lat) * Math.sin(lon), 0.9 * Math.sin(lat),
                  0.72 * Math.cos(lat) * Math.cos(lon), 0]);
      }
    }
    var feature = function (x, y, z) { pts.push([x, y, z, 1]); };
    for (j = 0; j < 14; j++) {
      var a = 2 * Math.PI * j / 14;
      feature(-0.25 + 0.1 * Math.cos(a), -0.14 + 0.05 * Math.sin(a), 0.66);
      feature(0.25 + 0.1 * Math.cos(a), -0.14 + 0.05 * Math.sin(a), 0.66);
    }
    for (j = 0; j < 9; j++) feature(0, -0.08 + j * 0.04, 0.7 + j * 0.012);
    for (j = 0; j < 15; j++) {
      var m = Math.PI * (0.15 + 0.7 * j / 14);
      feature(0.2 * Math.cos(m), 0.36 + 0.07 * Math.sin(m), 0.64);
    }
    return pts;
  }

  // موضعُ النقطة `i` من `n` على علامة ✓ — ليتجمّع الرأسُ فيها.
  function vsCheckAt(i, n) {
    var P = [[-0.46, 0.02], [-0.13, 0.34], [0.5, -0.34]];
    var l1 = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]);
    var l2 = Math.hypot(P[2][0] - P[1][0], P[2][1] - P[1][1]);
    var d = (i / n) * (l1 + l2), A, B, f;
    if (d < l1) { A = P[0]; B = P[1]; f = d / l1; } else { A = P[1]; B = P[2]; f = (d - l1) / l2; }
    var jit = ((i * 7919) % 13 - 6) / 260;
    return [A[0] + (B[0] - A[0]) * f + jit, A[1] + (B[1] - A[1]) * f - jit];
  }

  function vsCanvas(stage, clip, kind) {
    var cv = document.createElement('canvas');
    cv.className = 'vs__cv';
    clip.appendChild(cv);
    var ctx = cv.getContext('2d');
    if (!ctx) return;
    var head = kind === 'camera' ? null : vsHead();
    var mesh = [];
    if (kind === 'camera') {
      for (var y = -0.8; y <= 0.72; y += 0.075) {
        for (var x = -0.6; x <= 0.6; x += 0.075) {
          var ex = x / 0.52, ey = (y + 0.06) / 0.72;
          if (ex * ex + ey * ey <= 1) mesh.push([x + (y * 10 % 2 ? 0.037 : 0), y]);
        }
      }
    }
    var born = performance.now();
    var pink = [236, 143, 178], green = [79, 192, 138];

    function frame(now) {
      if (!cv.isConnected) return;
      var size = clip.clientWidth || 260, dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (cv.width !== Math.round(size * dpr)) {
        cv.width = cv.height = Math.round(size * dpr);
      }
      var W = cv.width, R = W / 2, t = now - born;
      ctx.clearRect(0, 0, W, W);
      // خطُّ المسح: من أعلى إلى أسفل ثم يعود، بين -1 و1
      var scan = Math.sin(t / 700) * 1.05;

      if (kind === 'camera') {
        var live = stage.classList.contains('is-recording');
        mesh.forEach(function (p) {
          var near = Math.max(0, 1 - Math.abs(p[1] - scan) / 0.22);
          var alpha = live ? 0.1 + 0.85 * near : 0.08 + 0.06 * Math.sin(t / 400);
          if (alpha <= 0.02) return;
          ctx.fillStyle = 'rgba(255,' + (200 + 55 * near | 0) + ',230,' + alpha.toFixed(3) + ')';
          var r = (1 + 1.4 * near) * dpr;
          ctx.beginPath(); ctx.arc(R + p[0] * R, R + p[1] * R, r, 0, 6.2832); ctx.fill();
        });
        if (live) vsBeam(ctx, W, R + scan * R * 0.95, dpr, pink);
      } else {
        var turn = Math.sin(t / 1500) * 0.55;
        var morph = 0;
        if (kind === 'done') {
          var k = Math.min(1, Math.max(0, (t - 250) / 900));
          morph = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
          turn *= 1 - morph;
        }
        var cs = Math.cos(turn), sn = Math.sin(turn), n = head.length;
        var col = [0, 1, 2].map(function (c) {
          return Math.round(pink[c] + (green[c] - pink[c]) * morph);
        });
        for (var i = 0; i < n; i++) {
          var p = head[i];
          var X = p[0] * cs + p[2] * sn, Z = -p[0] * sn + p[2] * cs;
          var persp = 1 / (1.9 - Z * 0.55);
          var px = X * persp * 1.55 * 0.78, py = p[1] * persp * 1.55 * 0.78;
          if (morph) {
            var c = vsCheckAt(i, n);
            px += (c[0] - px) * morph; py += (c[1] - py) * morph;
          }
          var near2 = kind === 'wait' ? Math.max(0, 1 - Math.abs(p[1] - scan) / 0.2) : 0;
          var depth = (Z + 0.8) / 1.6;
          var alpha2 = (0.12 + 0.6 * depth + (p[3] ? 0.25 : 0)) * (1 - morph) + morph;
          alpha2 = Math.min(1, alpha2 + near2 * 0.7);
          var lit = near2 > 0.4 ? 255 : col[1];
          ctx.fillStyle = 'rgba(' + (near2 > 0.4 ? 255 : col[0]) + ',' + lit + ','
            + (near2 > 0.4 ? 255 : col[2]) + ',' + alpha2.toFixed(3) + ')';
          var rr = ((p[3] ? 1.5 : 1.1) + depth * 0.9 + near2 * 1.2 + morph * 0.9) * dpr;
          ctx.beginPath(); ctx.arc(R + px * R, R + py * R, rr, 0, 6.2832); ctx.fill();
        }
        if (kind === 'wait') vsBeam(ctx, W, R + scan * R * 0.78 * 0.8, dpr, pink);
      }
      if (!VS_STILL && !(kind === 'done' && t > 1400)) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // شعاعُ المسح: خطٌّ مضيء بذيلٍ متلاشٍ فوقه.
  function vsBeam(ctx, W, y, dpr, rgb) {
    var tail = ctx.createLinearGradient(0, y - 46 * dpr, 0, y);
    tail.addColorStop(0, 'rgba(' + rgb + ',0)');
    tail.addColorStop(1, 'rgba(' + rgb + ',.22)');
    ctx.fillStyle = tail;
    ctx.fillRect(0, y - 46 * dpr, W, 46 * dpr);
    var line = ctx.createLinearGradient(0, 0, W, 0);
    line.addColorStop(0, 'rgba(255,255,255,0)');
    line.addColorStop(0.5, 'rgba(255,255,255,.95)');
    line.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = line;
    ctx.fillRect(0, y - 1 * dpr, W, 2 * dpr);
  }

  function verifyStage(kind) {
    var stage = document.createElement('div');
    stage.className = 'vs vs--' + kind;

    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', 'vs__ticks');
    svg.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < VS_TICKS; i++) {
      var tick = document.createElementNS(NS, 'line');
      tick.setAttribute('x1', '50'); tick.setAttribute('y1', '1.5');
      tick.setAttribute('x2', '50'); tick.setAttribute('y2', '6.5');
      tick.setAttribute('transform', 'rotate(' + (i * 360 / VS_TICKS) + ' 50 50)');
      tick.style.setProperty('--i', i);
      svg.appendChild(tick);
    }
    stage.appendChild(svg);

    var clip = document.createElement('div');
    clip.className = 'vs__clip';
    stage.appendChild(clip);
    var glow = document.createElement('div');
    glow.className = 'vs__glow';
    stage.appendChild(glow);

    // ‏يُستدعى من العدّ التنازليّ: نسبةُ ما مضى بين 0 و1 ← عددُ الشَّرطات المضيئة
    stage.setProgress = function (p) {
      var lit = Math.round(Math.max(0, Math.min(1, p)) * VS_TICKS);
      var ticks = svg.childNodes;
      for (var k = 0; k < ticks.length; k++) ticks[k].classList.toggle('on', k < lit);
    };
    // يُنادى بعد وضع الفيديو في `clip` — كي ترتسم الشبكةُ فوقه لا تحته
    stage.start = function () { vsCanvas(stage, clip, kind); };
    if (kind !== 'camera') stage.start();
    return stage;
  }

  function verifyChallenge() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia
        || !window.MediaRecorder) {
      verifyText(verifyShell(), T('web.verify_unsupported'));
      return;
    }
    var body = verifyShell();
    body.textContent = T('web.loading');
    api.verifyChallenge().then(function (ch) {
      body = verifyShell();
      if (ch.state !== 'challenge') { verifyText(body, ch.message); return; }
      verifyText(body, ch.text, 'verify__challenge');
      var video = document.createElement('video');
      video.className = 'verify__preview';
      video.muted = true;
      video.autoplay = true;
      video.setAttribute('playsinline', '');
      var stage = verifyStage('camera');
      stage.querySelector('.vs__clip').appendChild(video);
      stage.start();
      stage.hidden = true;
      body.appendChild(stage);
      var line = document.createElement('p');
      line.className = 'verify__note';
      body.appendChild(line);
      var open = verifyAction(body, T('web.verify_open_camera'), true, function () {
        navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
          audio: true
        }).then(function (stream) {
          verifyStream = stream;
          video.srcObject = stream;
          stage.hidden = false;
          open.remove();
          verifyRecord(body, stage, line, ch.max_seconds || 15);
        }).catch(function () {
          line.textContent = T('web.verify_camera_denied');
        });
      });
    }).catch(function (err) { verifyText(verifyShell(), errorText(err)); });
  }

  // أوّلُ نوعٍ يدعمه المتصفّح: WebM في كروم وفايرفوكس، وMP4 في سفاري.
  function verifyMime() {
    var types = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
    for (var i = 0; i < types.length; i++) {
      if (!MediaRecorder.isTypeSupported || MediaRecorder.isTypeSupported(types[i])) {
        return types[i];
      }
    }
    return '';
  }

  function verifyRecord(body, stage, line, maxSeconds) {
    var chunks = [];
    var mime = verifyMime();
    var start = verifyAction(body, T('web.verify_record'), true, function () {
      start.remove();
      try {
        // ⚠️ **معدّلٌ منخفض عمداً**: خمس عشرة ثانية بميغابت واحد ≈ ميغابايتان
        // — تكفي وجهاً وصوتاً، ولا تثقل رفعاً على شبكة هاتف.
        verifyRecorder = new MediaRecorder(verifyStream, mime
          ? { mimeType: mime, videoBitsPerSecond: 1000000 }
          : { videoBitsPerSecond: 1000000 });
      } catch (e) {
        line.textContent = T('web.verify_unsupported');
        return;
      }
      verifyRecorder.ondataavailable = function (ev) {
        if (ev.data && ev.data.size) chunks.push(ev.data);
      };
      verifyRecorder.onstop = function () {
        var type = (verifyRecorder && verifyRecorder.mimeType) || mime || 'video/webm';
        var blob = new Blob(chunks, { type: type });
        stopVerifyCamera();
        verifyUpload(blob, type);
      };
      var left = maxSeconds;
      line.textContent = T('web.verify_recording', { seconds: left });
      stage.classList.add('is-recording');
      stage.setProgress(0);
      verifyRecorder.start(1000);
      verifyTimer = setInterval(function () {
        left -= 1;
        line.textContent = T('web.verify_recording', { seconds: Math.max(left, 0) });
        stage.setProgress((maxSeconds - left) / maxSeconds);
        if (left <= 0 && verifyRecorder && verifyRecorder.state === 'recording') {
          clearInterval(verifyTimer);
          verifyTimer = null;
          verifyRecorder.stop();
        }
      }, 1000);
      var stop = verifyAction(body, T('web.verify_stop'), false, function () {
        stop.disabled = true;
        if (verifyRecorder && verifyRecorder.state === 'recording') verifyRecorder.stop();
      });
    });
  }

  function verifyUpload(blob, type) {
    var body = verifyShell();
    body.appendChild(verifyStage('wait'));
    verifyText(body, T('web.verify_uploading'), 'verify__text verify__center');
    api.verifyVideo(blob, type.split(';')[0]).then(function (r) {
      verifyWait();
    }).catch(function (err) {
      var detail = err && err.data && err.data.detail;
      body = verifyShell();
      if (detail === 'expired' || detail === 'no_challenge') {
        verifyText(body, T('web.verify_err_expired'));
      } else if (detail === 'too_large' || err.status === 413) {
        verifyText(body, T('web.verify_err_too_large'));
      } else if (detail === 'bad_type' || detail === 'empty') {
        verifyText(body, T('web.verify_err_bad_type'));
      } else if (detail === 'analyzing') {
        return verifyWait();
      } else {
        verifyText(body, errorText(err));
      }
      verifyAction(body, T('web.verify_retry'), true, verifyConsent);
    });
  }

  // ⚠️ **يسأل ما دامت الشاشة مفتوحة، ولا يسأل بعدها**: القرارُ يصل صاحبه
  // إشعاراً على كل حال، والسؤالُ من شاشةٍ مغلقة حِملٌ بلا قارئ.
  function verifyWait(message) {
    var body = verifyShell();
    body.appendChild(verifyStage('wait'));
    verifyText(body, message || T('web.verify_uploading'), 'verify__text verify__center');
    var tick = function () {
      if ($('mod').hidden || $('mod-name').textContent !== T('web.verify_button')) return;
      api.verifyStatus().then(function (st) {
        if (st && st.state === 'analyzing') { setTimeout(tick, 3000); return; }
        if (st && st.state === 'verified') {
          var b = verifyShell();
          b.appendChild(verifyStage('done'));
          verifyText(b, st.message, 'verify__text verify__center');
          return;
        }
        verifyShowStatus(st);
      }).catch(function () { setTimeout(tick, 5000); });
    };
    setTimeout(tick, 3000);
  }

  // ✅ **«من يرى صورتي» والسحب** — كان الموقع يمنح الإذن ولا يسحبه. والسطورُ
  // نصوصُ البوت (`photoaccess.item_*`)، والسحبُ أفعالُه (`apply_revoke`)
  // ومعها حذفُ نسخة الموقع الواضحة فوراً.
  function openPhotoAccess() {
    modTarget = null;
    $('mod-name').textContent = T('web.photo_access');
    var body = $('mod-body');
    body.textContent = T('web.loading');
    modFromSheet = !$('sheet').hidden;
    $('sheet').hidden = true;
    $('mod').hidden = false;

    var empty = function () {
      var none = document.createElement('p');
      none.className = 'empty';
      none.textContent = T('web.photo_access_empty');
      body.appendChild(none);
    };
    api.photoGranted().then(function (d) {
      body.textContent = '';
      var people = (d && d.people) || [];
      if (!people.length) return empty();
      people.forEach(function (p) {
        var row = document.createElement('div');
        row.className = 'row';
        var main = document.createElement('div');
        main.className = 'row__main';
        var name = document.createElement('div');
        name.className = 'row__name';
        name.textContent = p.label;
        main.appendChild(name);
        row.appendChild(main);
        var off = document.createElement('button');
        off.type = 'button';
        off.className = 'btn btn--danger-soft row__unblock';
        off.textContent = T('web.revoke');
        off.addEventListener('click', function () {
          off.disabled = true;
          api.photoRevoke(p.public_id).then(function (out) {
            row.remove();
            toast((out && out.message) || '');
            if (!body.querySelector('.row')) empty();
          }).catch(function (err) {
            off.disabled = false;
            if (err.code === 'unauthorized') return boot();
            toast(errorText(err));
          });
        });
        row.appendChild(off);
        body.appendChild(row);
      });
    }).catch(function (err) {
      if (err.code === 'unauthorized') return boot();
      body.textContent = errorText(err);
    });
  }

  // ==========================================================
  // الصورةُ الشخصية (٢٤ سبتمبر ٢٠٢٦)
  // ==========================================================
  //
  // ⚠️ **الصورة `file_id` من تيليجرام، والوسيط لا يملك توكن البوت** —
  // فالرفعُ يكتبها في صندوق انتظار، ومهمّةُ البوت تحملها كلَّ عشر ثوانٍ
  // (`services/web_photo_upload.py`). فالصفحة تقول «جارٍ» وتسأل حتى تظهر.
  //
  // ⚠️ **والصورة تُصغَّر ويُعاد ترميزها هنا قبل أن تغادر الهاتف** — لسببين:
  // حجمٌ يحتمله الخادم (١٢٨٠ بكسل)، و**نزعُ بيانات EXIF، وفيها موقعُ
  // التصوير بالـGPS** في أغلب الهواتف. فالرسمُ على `canvas` لا ينقلها.
  var PHOTO_MAX_SIDE = 1280;
  var PHOTO_MAX_BYTES = 1800 * 1024;

  function prepareJpeg(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
        var canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        var attempt = function (quality) {
          canvas.toBlob(function (blob) {
            if (!blob) return reject(new Error('encode'));
            if (blob.size > PHOTO_MAX_BYTES && quality > 0.5) return attempt(quality - 0.15);
            resolve(blob);
          }, 'image/jpeg', quality);
        };
        attempt(0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }

  // ⚠️ **سؤالٌ محدود لا حلقةٌ مفتوحة**: دورةُ البوت عشر ثوانٍ، فدقيقةٌ
  // ونصف تكفي أسوأ الحالات. وبعدها تبقى «جارٍ» ظاهرةً حتى يعود المستخدم.
  var photoPoll = null;

  function watchPhoto(triesLeft) {
    clearTimeout(photoPoll);
    if (triesLeft <= 0) return;
    photoPoll = setTimeout(function () {
      if ($('view-profile').hidden) return;
      api.me().then(function (mine) {
        if (mine && !mine.photo_pending) loadProfile();
        else watchPhoto(triesLeft - 1);
      }).catch(function () { watchPhoto(triesLeft - 1); });
    }, 4000);
  }

  function photoBlock(mine) {
    if (!mine || (!mine.photo_upload && !mine.has_photo)) return null;

    var box = document.createElement('section');
    box.className = 'card photo-block';

    var row = document.createElement('div');
    row.className = 'photo-block__row';
    box.appendChild(row);

    var ava = document.createElement('div');
    ava.className = 'ava';
    ava.textContent = '👤';
    row.appendChild(ava);
    if (mine.has_photo && !mine.photo_pending) attachPhoto(ava, mine);

    var side = document.createElement('div');
    side.className = 'photo-block__side';
    row.appendChild(side);

    var status = document.createElement('p');
    status.className = 'row__sub';
    side.appendChild(status);
    if (mine.photo_pending) {
      status.textContent = T('web.photo_pending');
      watchPhoto(22);
    }

    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.hidden = true;
    box.appendChild(input);

    if (mine.photo_upload) {
      var pick = document.createElement('button');
      pick.type = 'button';
      pick.className = 'btn btn--ghost';
      pick.textContent = T(mine.has_photo ? 'web.photo_change' : 'web.photo_add');
      pick.addEventListener('click', function () { input.click(); });
      side.appendChild(pick);

      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        input.value = '';
        if (!file) return;
        pick.disabled = true;
        status.textContent = T('web.photo_pending');
        prepareJpeg(file).then(function (blob) {
          return api.uploadPhoto(blob);
        }).then(function () {
          toast(T('web.photo_sent'));
          watchPhoto(22);
        }).catch(function (err) {
          pick.disabled = false;
          status.textContent = '';
          if (err.code === 'unauthorized') return boot();
          if (err.code === 'http' || !err.code) return toast(T('web.photo_bad'));
          toast(errorText(err));
        });
      });
    }

    if (mine.has_photo) {
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn btn--danger-soft';
      del.textContent = T('web.photo_delete');
      del.addEventListener('click', function () {
        if (!window.confirm(T('web.photo_delete_confirm'))) return;
        del.disabled = true;
        api.deletePhoto().then(function () {
          toast(T('web.photo_deleted'));
          loadProfile();
        }).catch(function (err) {
          del.disabled = false;
          if (err.code === 'unauthorized') return boot();
          toast(errorText(err));
        });
      });
      side.appendChild(del);
    }

    if (mine.has_photo) {
      var reqs = document.createElement('button');
      reqs.type = 'button';
      reqs.className = 'btn btn--ghost';
      reqs.textContent = T('web.photo_requests');
      reqs.addEventListener('click', openPhotoRequests);
      side.appendChild(reqs);
    }

    var note = document.createElement('p');
    note.className = 'pcard__note';
    note.textContent = T('web.photo_note');
    box.appendChild(note);
    return box;
  }

  // ==========================================================
  // الصورةُ الواضحة لمشاهدٍ على الموقع (٢٤ سبتمبر ٢٠٢٦)
  // ==========================================================
  //
  // ⚠️ **الإذنُ يُفحص في الخادم عند كل عرض** (`services/web_clear_photo.py`)
  // — والزرّ هنا تيسيرٌ لا حارس. والصورة تُعرض من `blob:` يُحرَّر عند
  // الإغلاق، ولا يمرّ ردُّها بعامل الخدمة (نطاقٌ آخر) ولا بالكاش (`no-store`).
  //
  // ⚠️ **ولا يمنع هذا لقطةَ الشاشة** — لا تملك صفحةُ ويبٍ ذلك، كما لا يملكه
  // البوت إلا بـ`protect_content` داخل تيليجرام. فالسطر تحت الصورة يقول ذلك.
  function photoAccessButton(slot, card) {
    slot.textContent = '';
    var id = refId(card.public_id);
    api.photoAccess(id).then(function (st) {
      var state = st && st.state;
      if (!state || state === 'own' || state === 'no_photo') return;

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn--ghost';
      slot.appendChild(btn);

      if (state === 'approved') {
        btn.textContent = T('web.photo_view');
        btn.addEventListener('click', function () { openClearPhoto(card); });
        return;
      }
      if (state === 'pending') {
        btn.textContent = T('web.photo_ask_waiting');
        btn.disabled = true;
        return;
      }
      btn.textContent = T('web.photo_ask');
      btn.addEventListener('click', function () {
        btn.disabled = true;
        api.photoAsk(id).then(function (out) {
          toast((out && out.message) || '');
          photoAccessButton(slot, card);
        }).catch(function (err) {
          btn.disabled = false;
          if (err.code === 'unauthorized') return boot();
          toast((err.data && err.data.message) || errorText(err));
          if (err.status === 409) photoAccessButton(slot, card);
        });
      });
    }).catch(function () { /* بلا حالة لا زرّ — والبطاقة كاملةٌ بدونه */ });
  }

  var clearUrl = null;
  var clearTimer = null;

  // ✅ **طمسُ الواضحة لحظةَ تغادر الصفحةُ العين** (بقرار صاحب المشروع، ٢٤
  // سبتمبر ٢٠٢٦): تبويبٌ آخر، أو تطبيقٌ آخر، أو نافذةٌ فقدت التركيز —
  // وهو ما يسبق أغلبَ برامج تسجيل الشاشة على الحاسوب. وتعود بالرجوع.
  // ⚠️ **ولا يمنع هذا لقطةَ الشاشة** (نظامُ التشغيل يلتقطها لا الصفحة) —
  // الردعُ الحقيقيّ العلامةُ المائية المطبوعة في الخادم على الصورة نفسها.
  function guardClearPhoto(hide) {
    var img = $('mod-body') && $('mod-body').querySelector('img.clear-photo');
    if (img) img.classList.toggle('clear-photo--hidden', hide);
  }
  document.addEventListener('visibilitychange', function () {
    guardClearPhoto(document.visibilityState !== 'visible');
  });
  window.addEventListener('blur', function () { guardClearPhoto(true); });
  window.addEventListener('focus', function () { guardClearPhoto(false); });

  function closeClearPhoto() {
    clearTimeout(clearTimer);
    clearInterval(clearTimer);
    clearTimer = null;
    if (clearUrl) { URL.revokeObjectURL(clearUrl); clearUrl = null; }
    var img = $('mod-body').querySelector('img.clear-photo');
    if (img) img.removeAttribute('src');
  }

  function openClearPhoto(card) {
    var id = refId(card.public_id);
    modTarget = null;
    closeClearPhoto();
    $('mod-name').textContent = identity('', card.public_id);
    var body = $('mod-body');
    body.textContent = T('web.photo_view_loading');
    modFromSheet = !$('sheet').hidden;
    $('sheet').hidden = true;
    $('mod').hidden = false;

    var tries = 0;
    var fail = function (text) {
      if ($('mod').hidden) return;
      body.textContent = text || T('web.photo_view_unavailable');
    };
    var show = function (got) {
      if ($('mod').hidden) return;
      body.textContent = '';
      clearUrl = URL.createObjectURL(got.blob);
      var img = document.createElement('img');
      img.className = 'clear-photo';
      img.alt = '';
      img.draggable = false;
      img.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      img.src = clearUrl;
      body.appendChild(img);

      // ✅ **عدّادٌ حيّ على الصورة نفسها، كلَّ ثانية** (بطلب صاحب المشروع،
      // ٢٤ سبتمبر ٢٠٢٦) وتحته شريطٌ يتناقص — بدل «⏱ الوقت المتبقّي: ٥ د»
      // الثابتة. والثواني من الخادم (`X-Seconds-Left`)، وإلا فالدقائق.
      var total = (got.seconds !== null && !isNaN(got.seconds)) ? got.seconds
        : ((got.minutes !== null && !isNaN(got.minutes)) ? got.minutes * 60 : null);
      if (total !== null) {
        var frame = document.createElement('div');
        frame.className = 'clear-frame';
        body.replaceChild(frame, img);
        frame.appendChild(img);
        var badge = document.createElement('div');
        badge.className = 'clear-timer';
        frame.appendChild(badge);
        var track = document.createElement('div');
        track.className = 'clear-track';
        var fill = document.createElement('div');
        fill.className = 'clear-track__fill';
        track.appendChild(fill);
        body.appendChild(track);

        var endAt = Date.now() + total * 1000;
        var span = Math.max(total, 1);
        var tick = function () {
          var left = Math.max(0, Math.round((endAt - Date.now()) / 1000));
          badge.textContent = '⏱ ' + Math.floor(left / 60) + ':' + ('0' + (left % 60)).slice(-2);
          fill.style.width = (100 * left / span) + '%';
          if (left <= 0) {
            // ⚠️ **الصفحة تُغلق نفسها عند انتهاء النافذة** — والخادم يرفض
            // بعدها على أيّ حال؛ هذا كي لا تبقى الصورة بعد أن انتهى إذنُها.
            closeClearPhoto();
            closeModeration();
            toast(T('web.photo_view_over'));
          }
        };
        tick();
        clearTimer = setInterval(tick, 1000);
      }
      var note = document.createElement('p');
      note.className = 'pcard__note';
      note.textContent = T('web.photo_view_private');
      body.appendChild(note);
    };
    var poll = function () {
      if ($('mod').hidden) return;
      api.photoClear(id).then(function (got) {
        if (got.pending) {
          if (++tries > 20) return fail();
          // صفٌّ انتهى أو تبدّلت صورته يُعاد طلبُه، والبوت يجلبها في دورته.
          if (tries % 5 === 0) api.photoView(id).catch(function () {});
          return setTimeout(poll, 2000);
        }
        show(got);
      }).catch(function (err) {
        if (err.code === 'unauthorized') return boot();
        fail();
      });
    };
    api.photoView(id).then(poll).catch(function (err) {
      if (err.code === 'unauthorized') return boot();
      fail();
    });
  }

  // ✅ **طلباتُ رؤية صورتي (٢٤ سبتمبر ٢٠٢٦)** — كانت تصل الصندوق ولا
  // يُردّ عليها من هنا، فينتظر الطالب ردّاً لن يأتي. والأفعال أفعالُ البوت
  // (`services/photo_consent_core.py`)، وأسماءُ الأزرار نصوصُه يرسلها الوسيط.
  // ⚠️ **وهذا لا يكشف صورةً في الموقع** — يمنح الإذن، والعرضُ في البوت.
  function openPhotoRequests() {
    modTarget = null;
    $('mod-name').textContent = T('web.photo_requests');
    var body = $('mod-body');
    body.textContent = T('web.loading');
    modFromSheet = !$('sheet').hidden;
    $('sheet').hidden = true;
    $('mod').hidden = false;

    api.photoRequests().then(function (d) {
      body.textContent = '';
      var list = (d && d.requests) || [];
      var empty = function () {
        var none = document.createElement('p');
        none.className = 'empty';
        none.textContent = T('web.photo_requests_empty');
        body.appendChild(none);
      };
      if (!list.length) return empty();

      list.forEach(function (r) {
        var card = document.createElement('div');
        card.className = 'row photo-req';

        var name = document.createElement('div');
        name.className = 'row__name';
        name.textContent = identity(r.name, r.public_id)
          + (r.count > 1 ? ' (' + r.count + ')' : '');
        card.appendChild(name);

        var actions = document.createElement('div');
        actions.className = 'photo-req__actions';
        card.appendChild(actions);

        var reply = function (decision, kind, btn) {
          actions.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
          api.photoRequestReply(kind ? { public_id: r.public_id, decision: decision, kind: kind }
                                     : { public_id: r.public_id, decision: decision })
            .then(function (out) {
              card.remove();
              toast((out && out.message) || '');
              if (!body.querySelector('.photo-req')) empty();
            }).catch(function (err) {
              if (err.code === 'unauthorized') return boot();
              if (err.status === 409) {
                card.remove();
                toast(T('web.photo_req_gone'));
                if (!body.querySelector('.photo-req')) empty();
                return;
              }
              actions.querySelectorAll('button').forEach(function (b) { b.disabled = false; });
              toast(errorText(err));
            });
        };

        (d.choices || []).forEach(function (c) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'btn btn--ghost';
          b.textContent = c.label;
          b.addEventListener('click', function () { reply('approve', c.kind, b); });
          actions.appendChild(b);
        });
        var no = document.createElement('button');
        no.type = 'button';
        no.className = 'btn btn--danger-soft';
        no.textContent = d.deny || '✖';
        no.addEventListener('click', function () { reply('deny', null, no); });
        actions.appendChild(no);

        body.appendChild(card);
      });
    }).catch(function (err) {
      if (err.code === 'unauthorized') return boot();
      body.textContent = errorText(err);
    });
  }

  // ==========================================================
  // إشعاراتُ المتصفّح (٢٤ سبتمبر ٢٠٢٦)
  // ==========================================================
  //
  // ⚠️ **مستخدمُ الويب لا يعرف بإعجابٍ أو رسالةٍ إلا إن فتح الصفحة** —
  // هذا جرسُه خارجها. والاشتراك يحفظه الوسيط، ومهمّةُ البوت تُرسل
  // (`services/web_push.py`). وغيابُ المفتاح في الخادم يُخفي كلَّ هذا.
  //
  // ⚠️ **وعلى آيفون لا إشعارات إلا لتطبيقٍ مُضافٍ إلى الشاشة الرئيسية**
  // (iOS 16.4+) — فمن فتح الصفحة في سفاري يرى كيف، لا زرّاً لا يعمل.
  function pushSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window
      && 'Notification' in window;
  }

  function isIosBrowserTab() {
    var ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    var standalone = window.navigator.standalone === true
      || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    return ios && !standalone;
  }

  function keyBytes(base64url) {
    var pad = '='.repeat((4 - base64url.length % 4) % 4);
    var raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function currentSubscription() {
    if (!pushSupported()) return Promise.resolve(null);
    return navigator.serviceWorker.ready.then(function (reg) {
      return reg.pushManager.getSubscription();
    });
  }

  function pushOff() {
    return currentSubscription().then(function (sub) {
      if (!sub) return;
      var json = sub.toJSON();
      return api.pushUnsubscribe(json).catch(function () { /* الخروج لا ينتظر الخادم */ })
        .then(function () { return sub.unsubscribe(); });
    }).catch(function () { /* لا اشتراك يُلغى — لا شيء يُقال */ });
  }

  function pushBlock(slot) {
    slot.textContent = '';
    api.pushKey().then(function (d) {
      var key = d && d.key;
      if (!key) return;

      var note = document.createElement('p');
      note.className = 'pcard__note';

      if (isIosBrowserTab()) {
        note.textContent = T('web.push_ios');
        slot.appendChild(note);
        return;
      }
      if (!pushSupported()) return;
      if (Notification.permission === 'denied') {
        note.textContent = T('web.push_denied');
        slot.appendChild(note);
        return;
      }

      currentSubscription().then(function (sub) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn--ghost';
        slot.appendChild(btn);

        if (sub) {
          // ⚠️ **يُعاد إرساله في كل فتح**: الحفظ بالـendpoint، فهذا يُبقي
          // الخادم على الجهاز نفسه لو ضاع الصفّ أو تبدّل الحساب.
          api.pushSubscribe(sub.toJSON()).catch(function () {});
          btn.textContent = T('web.push_disable');
          btn.addEventListener('click', function () {
            btn.disabled = true;
            pushOff().then(function () {
              toast(T('web.push_off'));
              pushBlock(slot);
            });
          });
          return;
        }

        btn.textContent = T('web.push_enable');
        btn.addEventListener('click', function () {
          btn.disabled = true;
          Notification.requestPermission().then(function (perm) {
            if (perm !== 'granted') {
              btn.disabled = false;
              if (perm === 'denied') pushBlock(slot);
              return;
            }
            return navigator.serviceWorker.ready.then(function (reg) {
              return reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: keyBytes(key)
              });
            }).then(function (fresh) {
              return api.pushSubscribe(fresh.toJSON());
            }).then(function () {
              toast(T('web.push_on'));
              pushBlock(slot);
            });
          }).catch(function (err) {
            btn.disabled = false;
            if (err && err.code === 'unauthorized') return boot();
            toast(errorText(err));
          });
        });
      });
    }).catch(function () { /* بلا مفتاح أو بلا شبكة — لا زرّ، ولا خطأ */ });
  }

  // ⚠️ **حذفُ الحساب بخطوتين في الصفحة، وبكلمةٍ في المسار.** الزرّ
  // الأوّل لا يحذف شيئاً — يكشف تأكيداً. والخادم نفسه يشترط
  // `confirm=delete` فلا يكفي سطرُ `fetch` عارض، ولا تكفي ضغطةٌ واحدة
  // على هاتفٍ في جيب. ولا رجعةَ بعدها: لا سلّةَ محذوفات ولا استرجاع.
  function deleteBlock() {
    var box = document.createElement('div');
    box.className = 'danger';

    var open = document.createElement('button');
    open.type = 'button';
    open.className = 'btn btn--danger';
    open.textContent = T('web.delete_account');
    box.appendChild(open);

    var confirm = document.createElement('div');
    confirm.hidden = true;
    box.appendChild(confirm);

    var warn = document.createElement('p');
    warn.className = 'danger__warn';
    warn.textContent = T('web.delete_warn');
    confirm.appendChild(warn);

    var yes = document.createElement('button');
    yes.type = 'button';
    yes.className = 'btn btn--danger';
    yes.textContent = T('web.delete_yes');
    confirm.appendChild(yes);

    var no = document.createElement('button');
    no.type = 'button';
    no.className = 'btn btn--ghost';
    no.textContent = T('web.delete_no');
    confirm.appendChild(no);

    open.addEventListener('click', function () {
      open.hidden = true;
      confirm.hidden = false;
    });
    no.addEventListener('click', function () {
      confirm.hidden = true;
      open.hidden = false;
    });
    yes.addEventListener('click', function () {
      yes.disabled = no.disabled = true;
      api.deleteAccount().then(function () {
        // ⚠️ **والخروج محلّيّاً بعدها لا اختياريّ**: التوكن يبقى
        // موقَّعاً حتى ينتهي أجله (لا سبيل إلى إبطال توكنٍ بلا حالة)،
        // فلو بقي في التخزين لأقلعت الصفحة عليه ثم رأت 401 — شاشةُ
        // خطأٍ بدل وداع.
        api.logout();
        deck = [];
        releasePhotos();
        toast(T('web.delete_done'));
        boot();
      }).catch(function (err) {
        yes.disabled = no.disabled = false;
        toast(errorText(err));
      });
    });

    return box;
  }

  // ============================================================
  // منتقي اللغة
  // ============================================================
  // ⚠️ **ولغتان لا واحدة، وهذا بيتُ العطل:** شاشةُ الويب تُترجَم في
  // المتصفّح (`hisn_lang`)، أمّا **نصُّ البطاقة فيُبنى في الخادم** من
  // عمود `users.language` — هو نفسه الذي يخاطب به البوت صاحبه. فمن
  // بدّل الصفحة وحدها رأى **واجهةً إنجليزية وبطاقاتٍ عربية**، وهو عطلٌ
  // سبق أن شُحن ورآه المتصفّح. فالتبديل يكتب الاثنين معاً.
  var LANGS = null;

  function langPicker(host, onDone) {
    if (!host) return;
    host.textContent = '';

    var load = LANGS ? Promise.resolve({ languages: LANGS })
                     : api.languages();

    load.then(function (data) {
      LANGS = data.languages || [];
      if (LANGS.length < 2) return;      // لغةٌ واحدة لا تُنتقى

      var select = document.createElement('select');
      select.className = 'langpick__select';
      select.setAttribute('aria-label', T('web.language'));
      LANGS.forEach(function (l) {
        select.appendChild(new Option(l.flag + ' ' + l.name, l.code));
      });
      select.value = LANG;

      select.addEventListener('change', function () {
        var chosen = select.value;
        if (chosen === LANG) return;
        select.disabled = true;

        // ⚠️ **والكتابة في الخادم أوّلاً حين يكون ثمّ حساب**: لو أُعيد
        // التحميل قبلها لضاع الاختيار عند الخادم وبقي في المتصفّح
        // وحده — فتعود اللغتان تتباعدان.
        var save = api.isSignedIn()
          ? api.setLanguage(chosen).catch(function () { /* الصفحة تكفي */ })
          : Promise.resolve();

        save.then(function () {
          try { localStorage.setItem('hisn_lang', chosen); } catch (e) { /* تصفّحٌ خاصّ */ }
          // ⚠️ **وإعادةُ تحميلٍ كاملة لا إعادةَ رسم**: `LANG` تُقرأ مرّةً
          // عند الإقلاع وتسكن في `config.js`، والاتجاه (rtl/ltr) على
          // `<html>`، ونصوصُ الشاشة في ذاكرةٍ بمفتاح اللغة. فالتحميل
          // أصدقُ من ملاحقة ثلاثتها.
          location.reload();
        });
      });

      host.appendChild(select);
      if (onDone) onDone(select);
    }).catch(function () { /* تتدهور بصمت: اللغة تبقى كما هي */ });
  }

  function translateButton(body, card) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn--ghost';
    b.textContent = T('web.translate_bio');
    var bio = body.querySelector('.pcard__bio');
    var anchor = bio ? bio.nextSibling : null;
    b.addEventListener('click', function () {
      b.disabled = true;
      api.translateBio(card.public_id).then(function (r) {
        var box = document.createElement('div');
        box.className = 'pcard__bio pcard__bio--tr';
        var h = document.createElement('div');
        h.className = 'pcard__sec';
        h.textContent = T('web.translation_label');
        box.appendChild(h);
        var tr = document.createElement('div');
        tr.dir = 'auto';
        tr.textContent = r.text;
        box.appendChild(tr);
        b.replaceWith(box);
      }).catch(function (err) {
        if (err.code === 'unauthorized') return boot();
        b.disabled = false;
        toast(T('web.translate_failed'));
      });
    });
    body.insertBefore(b, anchor);
  }

  function openSheet(card, fromDeck) {
    if (!card) return;
    var body = $('sheet-body');
    body.textContent = '';

    var title = document.createElement('p');
    title.className = 'card__title';
    title.textContent = card.public_id || '';
    body.appendChild(title);

    // ✅ **بأقسامٍ وصفوف لا أسطراً** — البطاقة نفسها، بعناوين «المواصفات»
    // و«الدين والحالة» و«التعليم والعمل» (كصفحة الاختبار).
    cardBody(body, card.card, { code: card.public_id, sections: true });

    // ✅ **«🌐 ترجمة الوصف»** بشرط البوت (`can_translate`: نبذة، ولغةٌ
    // يدعمها DeepL، ومفتاحٌ مضبوط) — والترجمةُ تحت النبذة لا مكانها، فيبقى
    // الأصلُ ظاهراً للمقارنة كما في البوت.
    if (card.can_translate && card.public_id) translateButton(body, card);

    // ✅ **الصورةُ الواضحة بإذن صاحبها** — طلبٌ أو عرض (٢٤ سبتمبر ٢٠٢٦).
    if (card.has_photo && card.public_id) {
      var photoSlot = document.createElement('div');
      body.appendChild(photoSlot);
      photoAccessButton(photoSlot, card);
    }

    // ✅ **وإعجابٌ من التفاصيل لبطاقة الرزمة**: من قرأ الملفّ كاملاً
    // وقرّر لا يُعاد إلى الرزمة ليبحث عن الزرّ. وهو `act` نفسه — يسحب
    // البطاقة ويحفظ القفل ضدّ الضغطة المكرّرة.
    if (fromDeck && !card.can_like && !card.mutual) {
      var like = document.createElement('button');
      like.type = 'button';
      like.className = 'btn btn--primary';
      like.textContent = '❤ ' + T('web.like');
      like.addEventListener('click', function () {
        $('sheet').hidden = true;
        act('like');
      });
      body.appendChild(like);
    }

    // ✅ **والبطاقةُ تُردّ عليها لا تُقرأ وحدها**: من أعجب بك ولم تردّ بعد
    // يأخذ زرَّ «إعجاب» — ومنه يقع التطابق وتُفتح الدردشة. ومن تطابقتَ
    // معه يأخذ «مراسلة». وبطاقاتُ التصفّح لا تحمل الحقلين، فلا زرَّ لها.
    // ⚠️ `reply` لا `act`: متغيّرٌ بهذا الاسم هنا يحجب دالّة `act` في
    // الورقة كلِّها (رفعُ `var`) — فيسقط زرُّ الإعجاب أعلاه بـTypeError.
    if (card.can_like || card.mutual) {
      var reply = document.createElement('button');
      reply.type = 'button';
      reply.className = 'btn btn--primary';
      reply.textContent = T(card.mutual ? 'web.chat' : 'web.like');
      reply.addEventListener('click', function () {
        if (card.mutual) {
          $('sheet').hidden = true;
          openChat(refId(card.public_id), card.public_id);
          return;
        }
        reply.disabled = true;
        api.interact(refId(card.public_id), 'like').then(function (out) {
          $('sheet').hidden = true;
          if (out && out.result === 'mutual') {
            lastMatch = card.public_id;
            $('pop').hidden = false;
          } else {
            toast(T('web.liked'));
          }
          refreshBell();
        }).catch(function (err) {
          reply.disabled = false;
          toast(errorText(err));
        });
      });
      body.appendChild(reply);
    }

    // 🚩/🚫 في آخر الورقة — لكل بطاقة: من التصفّح أو الإعجاب أو المطابقة.
    var modRow = document.createElement('div');
    modRow.className = 'mod-row';
    var more = document.createElement('button');
    more.type = 'button';
    more.className = 'btn btn--ghost';
    more.textContent = T('web.report') + ' · ' + T('web.block');
    more.addEventListener('click', function () {
      openModeration(refId(card.public_id), card.public_id);
    });
    modRow.appendChild(more);
    body.appendChild(modRow);

    $('sheet').hidden = false;
  }

  // ==========================================================
  // ٧) الإقلاع
  // ==========================================================
  function boot() {
    applyDirection();

    var cached = readCache();
    if (cached) { STRINGS = cached; paint(); }

    var handoff = consumeHandoff();

    var decide = function () {
      paint();
      if (api.isSignedIn()) {
        // ⚠️ **ولا يُفتح التطبيق قبل سؤال الوسيط**: التوكن يقول «هذا
        // فلان» ولا يقول «ملفُّه مكتمل». والقرار من `/api/me` وحدها —
        // فهي المصدر، وأي تخمينٍ في الصفحة يتباعد عنه.
        api.me().then(function (mine) {
          if (mine && mine.needs_profile) showComplete();
          else showApp();
        }).catch(function (err) {
          if (err.code === 'unauthorized') { showGate(); renderProviders(); }
          else showApp();   // عطلُ شبكةٍ عابر — التطبيق يعرض خطأه بنفسه
        });
        return;
      }
      showGate();
      renderProviders();
      langPicker($('gate-lang'));
      if (handoff && handoff.error) {
        // ⚠️ `banned` من الوسيط عند عودة المزوّد — كان المحظور يعود إلى هنا
        // بلا كلمة فيظنّ الموقع معطّلاً. ومفتاحٌ لم يصل بعد (وسيطٌ أقدم)
        // يرتدّ إلى الرسالة العامّة لا إلى اسمه خاماً.
        var bannedText = T('web.err_banned');
        providerNote(handoff.error === 'invite' ? T('web.err_invite')
                     : handoff.error === 'banned' && bannedText !== 'web.err_banned'
                       ? bannedText
                       : T('web.err_generic'));
      }
    };

    // رمزُ عودةٍ من مزوّد: يُبادَل بتوكن قبل أن يُقرَّر أين يذهب.
    if (handoff && handoff.code) {
      api.exchange(handoff.code)
         .then(function () { handoff = null; decide(); })
         .catch(function () {
           handoff = { error: 'generic' };
           decide();
         });
      return;
    }

    // ⚠️ النصوص تُطلب دائماً ولو وُجدت نسخة: مفتاحٌ يُصحَّح في
    // `locales/` لا يصل من يحمل النسخة القديمة أبداً لو اكتُفي بها.
    api.strings(LANG).then(function (data) {
      if (data && data.strings) {
        STRINGS = data.strings;
        writeCache(STRINGS);
      }
      decide();
    }).catch(function (err) {
      if (cached) { decide(); return; }
      // لا نصوص ولا نسخة — وهنا وحدها يُقرأ السطر العربي المكتوب في
      // الصفحة، لأنه الوحيد الموجود.
      $('boot-line').textContent = 'تعذّر الاتصال بالخادم';
      $('boot-retry').hidden = false;
    });
  }

  // ✅ **الحقلُ المطلوب الفارغ يُحدَّد بالأحمر — كلُّها لا أوّلُها** (بطلب
  // صاحب المشروع، ٢٤ سبتمبر ٢٠٢٦). فحصُ المتصفّح الأصليّ يعرض فقاعةً على
  // أوّل حقلٍ وحده وتختفي بعد ثانيتين، فمن ترك خمسةً يكتشفها واحداً واحداً
  // — وعلى الأزرار (المهنة) لا تظهر الفقاعة أصلاً، لأن القائمة تحتها مخفيّة.
  // فالنموذج `novalidate`، وهذا يحدّد كلَّ حقلٍ ناقص ويعلّق تحته سببه.
  // ⚠️ **والمعطَّل لا يُفحص** (المدينة قبل الدولة): `checkValidity` تتخطّاه
  // أصلاً، فلا يُطالَب صاحبه بما لا يستطيع ملأه.
  function markMissing(form) {
    form.querySelectorAll('.fld--missing').forEach(clearMissing);
    var marked = [];
    form.querySelectorAll('input, select, textarea').forEach(function (el) {
      if (el.disabled || el.checkValidity()) return;
      var wrap = el.closest('.fld');
      if (!wrap || marked.indexOf(wrap) !== -1) return;
      flagField(wrap, el.validity.valueMissing ? T('web.field_required')
                                               : T('web.field_invalid'));
      marked.push(wrap);
    });
    return marked;
  }

  function flagField(wrap, text) {
    wrap.classList.add('fld--missing');
    var note = wrap.querySelector('.fld__need');
    if (!note) {
      note = document.createElement('small');
      note.className = 'fld__need';
      wrap.appendChild(note);
    }
    note.textContent = text;
  }

  function clearMissing(wrap) {
    wrap.classList.remove('fld--missing');
    var note = wrap.querySelector('.fld__need');
    if (note) note.remove();
  }

  function bindComplete() {
    var formEl = $('form-complete');
    formEl.noValidate = true;
    // التحديدُ يزول لحظةَ يصير الحقلُ صالحاً — لا عند الإرسال التالي.
    ['input', 'change'].forEach(function (type) {
      formEl.addEventListener(type, function (e) {
        var wrap = e.target.closest && e.target.closest('.fld--missing');
        if (!wrap) return;
        var bad = Array.prototype.some.call(
          wrap.querySelectorAll('input, select, textarea'),
          function (el) { return !el.disabled && !el.checkValidity(); });
        if (!bad) clearMissing(wrap);
      });
    });

    formEl.addEventListener('submit', function (e) {
      e.preventDefault();
      var form = this;
      var box = form.querySelector('[data-err]');
      var button = form.querySelector('button[type="submit"]');

      form.dataset.tried = '1';
      var missing = markMissing(form);
      if (missing.length) {
        box.textContent = T('web.fill_required', { n: missing.length });
        box.hidden = false;
        missing[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (prefsMode) {
        var bad = prefsRangeError();
        if (bad) {
          flagField(bad.at, bad.text);
          box.textContent = bad.text;
          box.hidden = false;
          bad.at.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }
      box.hidden = true;
      button.disabled = true;
      (prefsMode ? api.savePrefs(prefsCollect())
       : editMode ? api.profileEdit(collect()) : api.completeProfile(collect()))
      .then(function () {
        button.disabled = false;
        if (prefsMode) leavePrefs(true);
        else if (editMode) leaveEdit(true);
        else showConsent();
      }).catch(function (err) {
        button.disabled = false;
        // ⚠️ واسمُ الحقل من الخادم يُبرز موضعَ الخطأ: رسالةٌ عامّة فوق
        // خمسةٍ وعشرين سؤالاً تترك صاحبها يبحث عن أيّها.
        var field = err.data && err.data.field;
        var at = field && document.querySelector('#complete-fields [data-field="' + field + '"]');
        if (at) {
          flagField(at, errorText(err));
          at.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        box.textContent = errorText(err);
        box.hidden = false;
      });
    });

    $('complete-out').addEventListener('click', function () {
      // في التعديل: إغلاقٌ بلا حفظ — لا تسجيلُ خروجٍ من الحساب.
      if (editMode) { leaveEdit(false); return; }
      // وفي التفضيلات: «تخطَّ» بعد التسجيل، أو «إغلاق» من الملفّ.
      if (prefsMode) { leavePrefs(false); return; }
      api.logout();
      boot();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    bindGate();
    bindComplete();
    bindChat();
    bindNotes();
    $('mod-back').addEventListener('click', closeModeration);
    $('chat-more').addEventListener('click', function () {
      openModeration(chatWith, $('chat-name').textContent);
    });
    $('pay-back').addEventListener('click', function () { $('pay').hidden = true; });
    $('chat-name').addEventListener('click', openChatPartner);
    bindSearch();
    bindConsent();

    document.querySelectorAll('.tab').forEach(function (button) {
      button.addEventListener('click', function () {
        openTab(button.getAttribute('data-tab'));
      });
    });

    $('btn-like').addEventListener('click', function () { act('like'); });
    $('btn-skip').addEventListener('click', function () { act('skip'); });

    $('sheet-close').addEventListener('click', function () {
      $('sheet').hidden = true;
    });
    $('sheet').addEventListener('click', function (e) {
      if (e.target === $('sheet')) $('sheet').hidden = true;
    });
    // ⚠️ **إلى «مطابقاتي» في الموقع لا إلى البوت**: كان الزرّ رابطاً إلى
    // ‎t.me‎ — ومن سجّل من الموقع قد لا يملك تيليجرام أصلاً، فكان أوّل
    // تطابقٍ له ينتهي عند بابٍ لا يُفتح. والمراسلة هنا تعمل منذ #83.
    // ✅ **يفتح الدردشة مع من تطابقتَ معه مباشرةً** (بطلب صاحب المشروع،
    // ٢٣ سبتمبر ٢٠٢٦) — لا قائمة «مطابقاتي» ليبحث فيها عنه. والقائمةُ
    // مخرجٌ إن لم يُعرف الطرف (صفحةٌ أُعيد تحميلها بين التطابق والضغط).
    $('pop-chat').addEventListener('click', function () {
      $('pop').hidden = true;
      if (lastMatch) openChat(refId(lastMatch), lastMatch);
      else openTab('matches');
    });
    $('pop-close').addEventListener('click', function () {
      $('pop').hidden = true;
    });
    $('boot-retry').addEventListener('click', function () {
      $('boot-retry').hidden = true;
      $('boot-line').textContent = 'لحظة…';
      boot();
    });

    boot();
  });
})();
