(function () {
  'use strict';

  var state = { open: false, user: null, messages: [], poll: null, sending: false, unread: 0 };
  var root;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function timeLabel(value) {
    if (!value) return '';
    var date = new Date(value);
    if (!isNaN(date.getTime())) return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    return esc(value);
  }

  function currentReturnUrl() {
    return encodeURIComponent(location.pathname + location.search + location.hash);
  }

  async function request(path, options) {
    var opts = options || {};
    opts.credentials = 'include';
    opts.cache = 'no-store';
    opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    var response = await fetch(path, opts);
    var body = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      var error = new Error(body.error || 'تعذر الاتصال بالدعم');
      error.status = response.status;
      throw error;
    }
    return body;
  }

  function scaffold() {
    if (document.getElementById('rab7naSupportRoot')) return document.getElementById('rab7naSupportRoot');
    root = document.createElement('div');
    root.id = 'rab7naSupportRoot';
    root.innerHTML = '' +
      '<button class="support-launch" type="button" aria-label="فتح شات الدعم" aria-expanded="false">' +
        '<span class="support-launch-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 5h14v11H8l-3 3V5Z"/><path d="M8 9h8M8 12h5"/></svg></span>' +
        '<span class="support-launch-copy"><b>محتاج مساعدة؟</b><small>فريق الدعم هنا لمساعدتك</small></span>' +
        '<span class="support-launch-badge" hidden>!</span>' +
      '</button>' +
      '<section class="support-panel" role="dialog" aria-modal="false" aria-label="شات دعم Rab7na" aria-hidden="true">' +
        '<header class="support-panel-header">' +
          '<span class="support-panel-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 5h14v11H8l-3 3V5Z"/><path d="M8 9h8M8 12h5"/></svg></span>' +
          '<span class="support-panel-headcopy"><b>مركز دعم Rab7na</b><small>محادثة آمنة من داخل حسابك</small></span>' +
          '<button class="support-panel-close" type="button" aria-label="إغلاق شات الدعم">×</button>' +
        '</header>' +
        '<div class="support-panel-body" id="supportPanelBody"></div>' +
      '</section>';
    document.body.appendChild(root);
    root.querySelector('.support-launch').addEventListener('click', toggle);
    root.querySelector('.support-panel-close').addEventListener('click', close);
    return root;
  }

  function setOpen(open) {
    state.open = open;
    var panel = root.querySelector('.support-panel');
    var launch = root.querySelector('.support-launch');
    panel.classList.toggle('is-open', open);
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    launch.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      state.unread = 0;
      updateBadge();
      startPolling();
    } else {
      stopPolling();
    }
  }

  function updateBadge() {
    var badge = root.querySelector('.support-launch-badge');
    badge.hidden = !state.unread;
    if (state.unread) badge.textContent = state.unread > 9 ? '9+' : String(state.unread);
  }

  function toggle() {
    if (!state.open) {
      setOpen(true);
      loadConversation();
    } else close();
  }

  function close() {
    if (!root) return;
    setOpen(false);
  }

  function renderLoading() {
    root.querySelector('#supportPanelBody').innerHTML = '<div class="support-loading"><div class="support-typing"><i></i><i></i><i></i></div><p style="margin-top:10px">نجهّز محادثتك...</p></div>';
  }

  function renderLogin() {
    stopPolling();
    root.querySelector('#supportPanelBody').innerHTML = '' +
      '<div class="support-login">' +
        '<div class="support-login-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></div>' +
        '<h3>الدعم متاح من داخل حسابك</h3>' +
        '<p>سجّل دخولك حتى نربط رسالتك بطلباتك وحسابك، ونقدر نتابع معك بشكل أسرع وأكثر أمانًا.</p>' +
        '<a href="/login.html?return=' + currentReturnUrl() + '">تسجيل الدخول وبدء المحادثة</a>' +
      '</div>';
  }

  function renderConversation() {
    var body = root.querySelector('#supportPanelBody');
    var name = state.user && (state.user.name || state.user.email || state.user.phone) || 'صديقي';
    body.innerHTML = '' +
      '<div class="support-welcome"><b>أهلًا ' + esc(name) + '، كيف نساعدك؟</b><p>اكتب استفسارك وسيتابعه فريق الدعم من داخل المنصة.</p>' +
        '<div class="support-quick" aria-label="أسئلة سريعة">' +
          '<button type="button" data-support-text="أين وصل طلبي؟">متابعة طلب</button>' +
          '<button type="button" data-support-text="أحتاج مساعدة في اختيار منتج">اختيار منتج</button>' +
          '<button type="button" data-support-text="أريد معرفة طريقة السحب">السحب والأرباح</button>' +
        '</div>' +
      '</div>' +
      '<div class="support-messages" id="supportMessages" aria-live="polite"></div>' +
      '<form class="support-composer" id="supportComposer">' +
        '<textarea id="supportInput" rows="1" maxlength="2000" placeholder="اكتب رسالتك هنا..." aria-label="رسالة الدعم"></textarea>' +
        '<button class="support-send" id="supportSend" type="submit" aria-label="إرسال الرسالة"><svg viewBox="0 0 24 24"><path d="m4 4 16 8-16 8 3-8-3-8Z"/><path d="M7 12h13"/></svg></button>' +
      '</form>' +
      '<div class="support-note">محادثتك خاصة ومربوطة بحسابك فقط</div>';
    root.querySelectorAll('[data-support-text]').forEach(function (button) {
      button.addEventListener('click', function () { sendText(button.getAttribute('data-support-text')); });
    });
    root.querySelector('#supportComposer').addEventListener('submit', function (event) {
      event.preventDefault();
      sendText(root.querySelector('#supportInput').value);
    });
    root.querySelector('#supportInput').addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendText(event.currentTarget.value);
      }
    });
    paintMessages(false);
  }

  function paintMessages(forceBottom) {
    var messages = root.querySelector('#supportMessages');
    if (!messages) return;
    var shouldStick = forceBottom || (messages.scrollHeight - messages.scrollTop - messages.clientHeight < 70);
    if (!state.messages.length) {
      messages.innerHTML = '<div class="support-empty"><div class="support-empty-icon"><svg viewBox="0 0 24 24"><path d="M5 5h14v11H8l-3 3V5Z"/><path d="M8 9h8M8 12h5"/></svg></div><b>ابدأ محادثتك الآن</b><span>فريق الدعم جاهز لمساعدتك</span></div>';
      return;
    }
    messages.innerHTML = state.messages.map(function (message) {
      var side = message.from === 'user' ? 'user' : 'support';
      return '<div class="support-message ' + side + '"><div class="support-bubble">' + esc(message.text || '') + '</div><span class="support-time">' + timeLabel(message.time) + (side === 'support' ? ' • الدعم' : '') + '</span></div>';
    }).join('');
    if (shouldStick) messages.scrollTop = messages.scrollHeight;
  }

  async function loadConversation() {
    if (!root) return;
    renderLoading();
    try {
      var auth = await request('/api/auth/me');
      state.user = auth.user || null;
      if (!state.user) return renderLogin();
      var messages = await request('/api/chat/messages');
      state.messages = Array.isArray(messages) ? messages : [];
      renderConversation();
    } catch (error) {
      if (error.status === 401 || error.status === 403) return renderLogin();
      root.querySelector('#supportPanelBody').innerHTML = '<div class="support-error"><b>تعذر تحميل المحادثة</b><span style="margin-top:5px">تحقق من الاتصال وحاول مرة أخرى.</span><button class="support-retry" type="button">إعادة المحاولة</button></div>';
      root.querySelector('.support-retry').addEventListener('click', loadConversation);
    }
  }

  async function refreshMessages() {
    if (!state.open || !state.user) return;
    try {
      var messages = await request('/api/chat/messages');
      if (!Array.isArray(messages)) messages = [];
      if (messages.length > state.messages.length && !state.open) state.unread += messages.length - state.messages.length;
      if (messages.length !== state.messages.length) {
        state.messages = messages;
        paintMessages(false);
      }
    } catch (_) {}
  }

  function startPolling() {
    stopPolling();
    state.poll = setInterval(refreshMessages, 15000);
  }

  function stopPolling() {
    if (state.poll) clearInterval(state.poll);
    state.poll = null;
  }

  async function sendText(value) {
    var text = String(value || '').trim().slice(0, 2000);
    if (!text || state.sending || !state.user) return;
    var input = root.querySelector('#supportInput');
    var button = root.querySelector('#supportSend');
    state.sending = true;
    if (input) input.value = '';
    if (button) button.disabled = true;
    try {
      var result = await request('/api/chat/send', { method: 'POST', body: JSON.stringify({ type: 'text', text: text }) });
      if (result.message) state.messages.push(result.message);
      paintMessages(true);
    } catch (error) {
      if (input) input.value = text;
      var message = root.querySelector('#supportMessages');
      if (message) message.insertAdjacentHTML('beforeend', '<div class="support-error" style="min-height:0;padding:8px">' + esc(error.message || 'تعذر إرسال الرسالة') + '</div>');
    } finally {
      state.sending = false;
      if (button) button.disabled = false;
      if (input) input.focus();
    }
  }

  function boot() {
    if (!document.body) return;
    scaffold();
  }

  window.Rab7naSupport = { open: function () { if (!state.open) toggle(); }, close: close, refresh: loadConversation };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
