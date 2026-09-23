// نداءُ خدمة الوسيط — موضعٌ واحد للتوكن وللأخطاء.
//
// ⚠️ **ولماذا موضعٌ واحد:** التوكن يُرسل في ترويسة كل طلب، ونسيانُه في
// نداءٍ واحد يعطي 401 غامضاً في شاشةٍ بعينها دون سائرها. والشاشات لا
// تعرف الشبكة أصلاً: تنادي `HISN.api.*` وتتلقّى بياناتٍ أو خطأً
// مسمّى.

(function () {
  'use strict';

  var TOKEN_KEY = 'hisn_token';

  function readToken() {
    try { return window.localStorage.getItem(TOKEN_KEY) || ''; }
    catch (e) { return ''; }
  }

  function writeToken(value) {
    try {
      if (value) window.localStorage.setItem(TOKEN_KEY, value);
      else window.localStorage.removeItem(TOKEN_KEY);
    } catch (e) { /* تصفّحٌ خاصّ — الجلسة تعيش حتى إغلاق الصفحة */ }
  }

  // ⚠️ **التخزين المحلّي لا كوكي**، والسبب معماريّ لا ذوقيّ: الواجهة على
  // نطاقٍ (GitHub Pages) والوسيط على آخر (Railway)، والكوكي عبر الأصول
  // يحتاج `SameSite=None; Secure` وثقةً بين نطاقين — وأعسرُ ما يُشخَّص
  // في المتصفّح كوكيٌّ يرفضه المتصفّح بصمت.
  //
  // ⚠️ وثمنُه معروف: نصٌّ يقرؤه أي سكربت يعمل في الصفحة. ولذلك لا
  // سكربتَ من طرفٍ ثالث في هذا المستودع إطلاقاً — ولا واحد.

  function request(path, options) {
    options = options || {};
    var headers = { 'Accept': 'application/json' };
    var token = readToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (options.body) headers['Content-Type'] = 'application/json';

    return fetch(window.HISN.API + path, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      // ⚠️ `omit` صراحةً: لا كوكيز في هذا المسار أصلاً، وإرسالُها عبر
      // الأصول يستدعي `allow_credentials` في الخادم — وذاك يفتح CSRF
      // بلا مقابل.
      credentials: 'omit',
      cache: 'no-store'
    }).then(function (res) {
      if (res.status === 401) {
        // توكنٌ منتهٍ أو مزوَّر — تُمسح الجلسة ويُعاد المستخدم للدخول.
        writeToken('');
        var err = new Error('unauthorized');
        err.code = 'unauthorized';
        throw err;
      }
      var type = res.headers.get('content-type') || '';
      if (type.indexOf('application/json') < 0) {
        if (!res.ok) { var e2 = new Error('http'); e2.code = 'http'; e2.status = res.status; throw e2; }
        return res;
      }
      return res.json().then(function (data) {
        if (!res.ok) {
          var e3 = new Error('http');
          e3.code = 'http';
          e3.status = res.status;
          e3.data = data;
          throw e3;
        }
        return data;
      });
    }, function () {
      // ⚠️ فشلُ الشبكة يُميَّز عن خطأ الخادم: الأوّل يُعالَج بإعادة
      // المحاولة، والثاني برسالةٍ للمستخدم. وخلطُهما يجعل «حاول ثانيةً»
      // جواباً عن عطلٍ لا تُصلحه محاولة.
      var err = new Error('network');
      err.code = 'network';
      throw err;
    });
  }

  window.HISN.api = {
    token: readToken,
    setToken: writeToken,
    isSignedIn: function () { return !!readToken(); },

    strings: function (lang) {
      return request('/api/i18n/' + encodeURIComponent(lang));
    },
    login: function (email, password) {
      return request('/api/auth/login', {
        method: 'POST', body: { email: email, password: password }
      }).then(function (data) { writeToken(data.token); return data; });
    },
    signup: function (payload) {
      return request('/api/auth/signup', { method: 'POST', body: payload })
        .then(function (data) { writeToken(data.token); return data; });
    },
    logout: function () { writeToken(''); },

    // ============================================================
    // الدخول بحسابٍ قائم — المرحلة ٦ ب
    // ============================================================
    // ⚠️ **ولا مكتبةَ مزوّدٍ في هذه الصفحة ولا واحدة.** أزرار «سجّل
    // بجوجل» الجاهزة سكربتاتٌ مستضافة عند صاحبها، والتوكن هنا في
    // `localStorage` — فكلُّ سكربتٍ يعمل في الصفحة يقرؤه. فالزرُّ
    // **رابط**، والوسيط هو من يعرف المفاتيح ويبادل الرموز.

    providers: function () { return request('/api/auth/providers'); },

    // رابطُ الذهاب — لا `fetch`: هذه **ملاحةُ صفحة** إلى نطاقٍ آخر،
    // و`fetch` عليها يصطدم بـCORS عند المزوّد بلا أي فائدة.
    oauthUrl: function (provider, invite) {
      var q = invite ? '?invite=' + encodeURIComponent(invite) : '';
      return window.HISN.API + '/api/auth/oauth/'
             + encodeURIComponent(provider) + '/start' + q;
    },

    telegramStart: function () {
      return request('/api/auth/telegram/start', { method: 'POST', body: {} });
    },
    // ⚠️ تعيد `{status:'pending'}` ما دام البوت لم يؤكّد — و202 ليست
    // خطأً، فلا تُوقف السؤال.
    telegramPoll: function (code) {
      return request('/api/auth/telegram/poll',
                     { method: 'POST', body: { code: code } });
    },
    exchange: function (code) {
      return request('/api/auth/exchange', { method: 'POST', body: { code: code } })
        .then(function (data) { writeToken(data.token); return data; });
    },

    me: function () { return request('/api/me'); },
    // إكمالُ ملفٍّ أنشأه مزوّد — مرّةً واحدة، وللناقص وحده (409 لغيره).
    // موافقةُ النشر العام في آخر التسجيل — `available: false` = لا شاشة.
    publishConsent: function () { return request('/api/me/publish-consent'); },
    publishChoice: function (publish) {
      return request('/api/me/publish-consent',
                     { method: 'POST', body: { publish: !!publish } });
    },
    completeProfile: function (answers) {
      return request('/api/me/profile',
                     { method: 'POST', body: { answers: answers } });
    },
    // ⚠️ **و`confirm=delete` يشترطه الخادم لا هذه السطور**: طلبٌ بلا
    // الكلمة يردّه بأربعمئة مهما جاء من أين. فهي هنا تكرارٌ لما هناك
    // لا مصدرُ الشرط.
    deleteAccount: function () {
      return request('/api/me?confirm=delete', { method: 'DELETE' });
    },
    // ⚠️ **اللغاتُ من الوسيط لا قائمةً هنا**: هو وحده يعرف أيُّها له
    // ملفُّ ترجمةٍ فعليّ. وقائمةٌ مكتوبةً في الصفحة تعرض لغةً ترتدّ
    // إلى العربية بصمت عند من يختارها.
    languages: function () { return request('/api/languages'); },
    // ============================================================
    // الدردشة
    // ============================================================
    // ⚠️ **و`after` استطلاعٌ رخيص لا ترقيمُ صفحات**: الشاشة تسأل كلَّ
    // بضع ثوانٍ «هل جدَّ شيءٌ بعد آخر معرّفٍ عندي؟»، فيخرج الردُّ
    // فارغاً في أكثر الأحيان بلا أن يُعاد تاريخُ المحادثة كلَّ مرّة.
    chats: function () { return request('/api/me/chats'); },
    chatMessages: function (publicId, after) {
      return request('/api/me/chats/' + encodeURIComponent(publicId)
                     + '?after=' + (after || 0));
    },
    sendMessage: function (publicId, text) {
      return request('/api/me/chats',
                     { method: 'POST',
                       body: { public_id: publicId, text: text } });
    },
    setLanguage: function (lang) {
      return request('/api/me/language',
                     { method: 'POST', body: { lang: lang } });
    },
    // ⚠️ الأسئلة وخياراتها من الوسيط لا من الصفحة — الشرح في index.html
    // «تعديل بياناتي» — حقولُ البوت نفسها بقيمها الحالية، والحفظ.
    profileEditForm: function () { return request('/api/me/profile/edit'); },
    profileEdit: function (answers) {
      return request('/api/me/profile/edit',
                     { method: 'POST', body: { answers: answers } });
    },
    profileSchema: function (lang, gender) {
      return request('/api/profile/schema/' + encodeURIComponent(lang)
                     + (gender ? '?gender=' + encodeURIComponent(gender) : ''));
    },
    cities: function (country, lang) {
      return request('/api/profile/cities/' + encodeURIComponent(country)
                     + '?lang=' + encodeURIComponent(lang || 'ar'));
    },
    // ⚠️ **الاثنان ليسا واحداً، والخلط بينهما يكسر المعنى:**
    // `matches` تقترح من **قد** يناسبك، و`mutual` تسرد من تبادلتَ معه
    // الإعجاب **فعلاً**. الشرح في `services/mutual.py` بمستودع البوت.
    // الإشعارات — صندوق البوت نفسه. ⚠️ والفتحُ لا يعلّم شيئاً مقروءاً:
    // القراءة `notificationsRead` وحدها، بعد أن يراها صاحبها.
    notifications: function () { return request('/api/me/notifications'); },
    // بطاقةُ من أعجب بك أو تطابقتَ معه — 404 لمن لا علاقة لك به.
    person: function (publicId) {
      return request('/api/me/person/' + encodeURIComponent(publicId));
    },
    notificationsCount: function () {
      return request('/api/me/notifications/count');
    },
    notificationsRead: function (body) {
      return request('/api/me/notifications/read', { method: 'POST', body: body });
    },
    matches: function (limit) {
      return request('/api/me/matches?limit=' + (limit || 10));
    },
    mutual: function (limit) {
      return request('/api/me/mutual?limit=' + (limit || 20));
    },
    search: function (params) {
      var query = Object.keys(params || {})
        .filter(function (k) { return params[k] !== '' && params[k] != null; })
        .map(function (k) {
          return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
        }).join('&');
      return request('/api/search' + (query ? '?' + query : ''));
    },
    interact: function (publicId, action) {
      return request('/api/interactions', {
        method: 'POST', body: { public_id: publicId, action: action }
      });
    },

    // ⚠️ **الصورة تمرّ بترويسة التوكن، فلا تصلح في `src` مباشرةً.**
    // ولذلك تُجلب بايتاتٍ وتُحوَّل إلى `blob:` — ورابطُ `getFile` من
    // تيليجرام لا يظهر هنا ولا في أي موضع (يحمل توكن البوت).
    photoUrl: function (publicId) {
      return request('/api/photo/' + publicId).then(function (res) {
        return res.blob().then(function (blob) {
          return URL.createObjectURL(blob);
        });
      });
    }
  };
})();
