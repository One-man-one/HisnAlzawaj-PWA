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
  function toast(text) {
    var el = $('toast');
    el.textContent = text;
    el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('on'); }, 2400);
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
    return T('web.err_generic');
  }

  // ==========================================================
  // ٣) البوّابة
  // ==========================================================
  function showGate() {
    document.body.classList.remove('is-app');
    $('boot').hidden = true;
    $('app').hidden = true;
    $('gate').hidden = false;
  }

  function showApp() {
    document.body.classList.add('is-app');
    $('boot').hidden = true;
    $('gate').hidden = true;
    $('app').hidden = false;
    openTab('browse');
  }

  function bindGate() {
    $('to-signup').addEventListener('click', function () {
      $('form-login').hidden = true;
      $('form-signup').hidden = false;
    });
    $('to-login').addEventListener('click', function () {
      $('form-signup').hidden = true;
      $('form-login').hidden = false;
    });

    $('form-login').addEventListener('submit', function (e) {
      e.preventDefault();
      submit(this, function (data) {
        return api.login(data.email, data.password);
      });
    });

    $('form-signup').addEventListener('submit', function (e) {
      e.preventDefault();
      submit(this, function (data) {
        if (data.birth_year) data.birth_year = parseInt(data.birth_year, 10);
        else delete data.birth_year;
        // ⚠️ اللغة تُرسَل مع التسجيل وتُحفظ في الصفّ: بطاقاتُ الآخرين
        // تُبنى بلغة صاحب الحساب لا بلغة الواجهة، فمن سجّل من متصفّحٍ
        // إنجليزي وبقي عموده عربياً يرى واجهةً بلغةٍ وبطاقاتٍ بأخرى.
        data.lang = LANG;
        return api.signup(data);
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

  var PROVIDER_ICON = { telegram: '✈️', google: 'G', facebook: 'f' };
  var pollTimer = null;

  function renderProviders() {
    api.providers().then(function (data) {
      var names = (data && data.providers) || [];
      if (!names.length) return;

      var box = document.getElementById('provider-buttons');
      box.textContent = '';

      names.forEach(function (name) {
        var label = T('web.with_' + name);
        var icon = PROVIDER_ICON[name] || '';

        if (name === 'telegram') {
          var button = document.createElement('button');
          button.type = 'button';
          button.className = 'prov';
          button.innerHTML = '';
          var ti = document.createElement('i');
          ti.textContent = icon;
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
        link.className = 'prov';
        link.rel = 'noopener';
        var gi = document.createElement('i');
        gi.textContent = icon;
        link.appendChild(gi);
        link.appendChild(document.createTextNode(label));
        link.addEventListener('click', function (e) {
          e.preventDefault();
          var invite = (document.querySelector('#provider-invite input') || {}).value;
          window.location.href = api.oauthUrl(name, (invite || '').trim());
        });
        box.appendChild(link);
      });

      // حقلُ الدعوة يظهر مع جوجل وفيسبوك وحدهما: الداخل بتيليجرام
      // مستخدمٌ عندنا أصلاً، فلا دعوةَ تُطلب منه.
      var needsInvite = names.indexOf('google') >= 0
                     || names.indexOf('facebook') >= 0;
      document.getElementById('provider-invite').hidden = !needsInvite;
      document.getElementById('providers').hidden = false;
    }).catch(function () {
      // ⚠️ وسيطٌ لا يردّ لا يمنع الدخول بالبريد: الكتلة تبقى مخفيّة
      // ولا رسالة — الفشل الحقيقي سيظهر عند أوّل محاولة دخول.
    });
  }

  function providerNote(text) {
    var note = document.getElementById('provider-note');
    note.textContent = text;
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
      pollTelegram(data.code, Date.now() + 10 * 60 * 1000, button);
    }).catch(function (err) {
      button.removeAttribute('aria-busy');
      providerNote(errorText(err));
    });
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

  function numericId(publicId) {
    // البطاقة تحمل «#4821»، والوسيط يقبل رقم الصفّ وحده.
    return parseInt(String(publicId || '').replace(/[^0-9]/g, ''), 10);
  }

  function loadDeck() {
    var stack = $('stack');
    stack.textContent = '';
    var wait = document.createElement('p');
    wait.className = 'empty';
    wait.textContent = T('web.loading');
    stack.appendChild(wait);

    return api.matches(10).then(function (data) {
      deck = (data && data.results) || [];
      renderDeck();
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
      line.textContent = T('web.no_more');
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
    if (deck[2]) stack.appendChild(cardNode(deck[2], 'pcard--b2'));
    if (deck[1]) stack.appendChild(cardNode(deck[1], 'pcard--b1'));
    var front = cardNode(deck[0], 'pcard--front');
    stack.appendChild(front);
    bindSwipe(front);
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
    if (card.is_verified) {
      var badge = document.createElement('span');
      badge.className = 'pcard__badge';
      badge.textContent = T('web.verified');
      left.appendChild(badge);
    }
    head.appendChild(left);

    var ava = document.createElement('div');
    ava.className = 'ava';
    ava.textContent = '👤';
    head.appendChild(ava);
    node.appendChild(head);

    if (card.has_photo) attachPhoto(ava, card, node);

    var body = document.createElement('div');
    body.className = 'pcard__lines';
    lines(body, card.card);
    node.appendChild(body);

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
    var id = numericId(card.public_id);
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
  function bindSwipe(node) {
    var startX = 0, dx = 0, dragging = false, moved = false;

    node.addEventListener('pointerdown', function (e) {
      if (busy) return;
      dragging = true; moved = false; dx = 0;
      startX = e.clientX;
      node.style.transition = 'none';
      node.setPointerCapture(e.pointerId);
    });

    node.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      dx = e.clientX - startX;
      if (Math.abs(dx) > 6) moved = true;
      node.style.transform = 'translate(' + dx + 'px,' + (dx / 20) + 'px) rotate('
                             + (dx / 18) + 'deg)';
    });

    function end() {
      if (!dragging) return;
      dragging = false;
      node.style.transition = 'transform .25s';

      if (!moved) { openSheet(deck[0]); node.style.transform = ''; return; }

      // ⚠️ العتبة بالنسبة إلى عرض الشاشة لا برقمٍ ثابت: ١٠٠ بكسل على
      // هاتفٍ ضيّق نصفُ البطاقة، وعلى لوحيٍّ إزاحةٌ لا تكاد تُرى.
      var threshold = Math.min(120, window.innerWidth * 0.28);
      if (dx > threshold) act('like');
      else if (dx < -threshold) act('skip');
      else node.style.transform = '';
      dx = 0;
    }

    node.addEventListener('pointerup', end);
    node.addEventListener('pointercancel', end);
  }

  // ==========================================================
  // ٥) الإعجاب والتخطّي
  // ==========================================================
  function act(action) {
    if (busy || !deck.length) return;
    var card = deck[0];
    var id = numericId(card.public_id);
    if (!id) return;

    // ⚠️ **قفلٌ لا حرفَ زائد**: ضغطتان سريعتان (أو ضغطةٌ مع سحبة)
    // ترسلان فعلين على **نفس** البطاقة — والثاني يعود «سبق أن
    // تفاعلت»، فيبتلع الفعلُ الثاني بطاقةً لم يرها صاحبها.
    busy = true;
    var front = document.querySelector('.pcard--front');
    if (front) {
      var away = action === 'like' ? window.innerWidth : -window.innerWidth;
      front.style.transition = 'transform .3s, opacity .3s';
      front.style.transform = 'translate(' + away + 'px,0) rotate('
                              + (action === 'like' ? 22 : -22) + 'deg)';
      front.style.opacity = '0';
    }

    api.interact(id, action).then(function (out) {
      var result = (out && out.result) || '';
      if (result === 'mutual') $('pop').hidden = false;
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
  function openTab(name) {
    document.querySelectorAll('.tab').forEach(function (button) {
      button.classList.toggle('on', button.getAttribute('data-tab') === name);
    });

    var browsing = name === 'browse';
    $('view-browse').hidden = !browsing;
    $('swipe').hidden = !browsing;
    $('view-matches').hidden = name !== 'matches';
    $('view-profile').hidden = name !== 'profile';

    if (browsing) { if (!deck.length) loadDeck(); else renderDeck(); }
    else if (name === 'matches') loadMutual();
    else loadProfile();
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
        name.textContent = card.public_id || '';
        var sub = document.createElement('div');
        sub.className = 'row__sub';
        // أوّل سطرٍ من البطاقة يكفي في قائمة — والباقي في الورقة.
        sub.textContent = String(card.card || '').split('\n')[0] || '';
        main.appendChild(name);
        main.appendChild(sub);
        row.appendChild(main);

        row.addEventListener('click', function () { openSheet(card); });
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
      // يراه صاحبه هناك حرفياً. وشاشةُ تحريرٍ هنا تعني حقلين لنفس
      // البيان يتباعدان؛ والتحرير بابه البوت حتى مرحلةٍ لاحقة.
      lines(card, mine && (mine.text || mine.card));
      view.appendChild(card);

      var bot = document.createElement('a');
      bot.className = 'btn btn--ghost';
      bot.href = 'https://t.me/HisnAlzawaj_bot';
      bot.rel = 'noopener';
      bot.textContent = T('web.open_bot');
      view.appendChild(bot);

      var out = document.createElement('button');
      out.type = 'button';
      out.className = 'btn btn--ghost';
      out.textContent = T('web.logout');
      out.addEventListener('click', function () {
        api.logout();
        deck = [];
        releasePhotos();
        boot();
      });
      view.appendChild(out);
    }).catch(function (err) {
      if (err.code === 'unauthorized') return boot();
      view.textContent = '';
      var line = document.createElement('p');
      line.className = 'empty';
      line.textContent = errorText(err);
      view.appendChild(line);
    });
  }

  function openSheet(card) {
    if (!card) return;
    var body = $('sheet-body');
    body.textContent = '';

    var title = document.createElement('p');
    title.className = 'card__title';
    title.textContent = card.public_id || '';
    body.appendChild(title);

    lines(body, card.card);
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
      if (api.isSignedIn()) { showApp(); return; }
      showGate();
      renderProviders();
      if (handoff && handoff.error) {
        providerNote(handoff.error === 'invite' ? T('web.err_invite')
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

  document.addEventListener('DOMContentLoaded', function () {
    bindGate();

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
