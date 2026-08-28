/* =========================================================
   Сайт за 15 минут - логика лендинга
   Без зависимостей, всё на нативных API.
   ========================================================= */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Год в подвале ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* =========================================================
     Демонстрация «запрос - сайт» на первом экране
     Печатает промпт, затем собирает макет и повторяет цикл.
     ========================================================= */
  var typedEl = document.querySelector('.demo__typed');
  var previewEl = document.querySelector('.demo__preview');
  var statusEl = document.querySelector('.demo__statusText');
  var PROMPT = 'Сделай сайт для моей мастерской: обо мне, галерея работ, цены и форма заявки в WhatsApp';

  if (typedEl && previewEl && statusEl) {
    if (reduceMotion) {
      // При отключённой анимации сразу показываем финальное состояние
      typedEl.textContent = PROMPT;
      previewEl.classList.add('is-built');
      statusEl.textContent = 'Сайт готов и опубликован';
    } else {
      var i = 0;
      var timer;

      function type() {
        typedEl.textContent = PROMPT.slice(0, ++i);
        if (i < PROMPT.length) {
          // Небольшая случайность в скорости выглядит живее ровного интервала
          timer = setTimeout(type, 18 + Math.random() * 34);
        } else {
          statusEl.textContent = 'Нейросеть собирает страницу…';
          timer = setTimeout(build, 500);
        }
      }

      function build() {
        previewEl.classList.add('is-built');
        timer = setTimeout(function () {
          statusEl.textContent = 'Готово. Ссылка работает';
          timer = setTimeout(reset, 3600);
        }, 1100);
      }

      function reset() {
        previewEl.classList.remove('is-built');
        typedEl.textContent = '';
        statusEl.textContent = 'Пишем запрос…';
        i = 0;
        timer = setTimeout(type, 700);
      }

      // Анимация не крутится в фоновой вкладке
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
          clearTimeout(timer);
        } else {
          clearTimeout(timer);
          timer = setTimeout(reset, 200);
        }
      });

      timer = setTimeout(type, 600);
    }
  }

  /* ---------- Появление карточек программы ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, index) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        setTimeout(function () { el.classList.add('is-visible'); }, index * 80);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });

    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* =========================================================
     Липкая кнопка на телефоне
     Появляется, когда кнопка из хиро ушла с экрана,
     и прячется, когда пользователь уже дошёл до формы.
     ========================================================= */
  var dock = document.getElementById('dock');
  var heroCta = document.querySelector('.hero__actions .btn');
  var formSection = document.getElementById('form');

  if (dock && heroCta && formSection && 'IntersectionObserver' in window) {
    var heroVisible = true;
    var formVisible = false;

    function syncDock() {
      dock.hidden = heroVisible || formVisible;
    }

    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
      syncDock();
    }, { threshold: 0 }).observe(heroCta);

    new IntersectionObserver(function (entries) {
      formVisible = entries[0].isIntersecting;
      syncDock();
    }, { threshold: 0 }).observe(formSection);
  }

  /* =========================================================
     Форма записи
     ========================================================= */
  var form = document.getElementById('signupForm');
  if (!form) return;

  var submitBtn = document.getElementById('submitBtn');
  var backBtn = document.getElementById('backBtn');
  var errorBox = document.getElementById('formError');
  var successBox = document.getElementById('formSuccess');
  var successTitle = document.getElementById('successTitle');
  var successText = document.getElementById('successText');
  var phoneInput = document.getElementById('phone');
  var sessionSelect = document.getElementById('session');
  var sessionField = document.getElementById('sessionField');
  var waitlistSession = document.getElementById('waitlistSession');
  var waitlistNotice = document.getElementById('waitlistNotice');
  var waitlistField = document.getElementById('waitlistField');
  var preferredInput = document.getElementById('preferred');

  var SUBMIT_LABEL = 'Записаться';
  var WAITLIST_LABEL = 'Записаться в лист ожидания';

  /* ---------------------------------------------------------
     Занятость потоков.
     Formspree не умеет считать заявки по вариантам ответа и не отдаёт
     статистику публично, поэтому источник данных - файл slots.js рядом
     со страницей: правите в нём taken, страница сама закрывает потоки.
     Данные приходят через <script>, а не fetch: так они читаются и при
     открытии страницы локально через file://, где запросы заблокированы.
     --------------------------------------------------------- */
  var slots = [];
  var waitlistMode = false;

  function slotsFromMarkup() {
    return Array.prototype.slice.call(sessionSelect.options)
      .filter(function (option) { return option.value; })
      .map(function (option) {
        return { value: option.value, capacity: 5, taken: 0 };
      });
  }

  function seatWord(n) {
    var tail = n % 10;
    var hundred = n % 100;
    if (tail === 1 && hundred !== 11) return 'место';
    if (tail >= 2 && tail <= 4 && (hundred < 12 || hundred > 14)) return 'места';
    return 'мест';
  }

  function seatsLeft(slot) {
    return Math.max(0, Number(slot.capacity) - Number(slot.taken));
  }

  function renderSlots() {
    var openSlots = slots.filter(function (slot) { return seatsLeft(slot) > 0; });
    waitlistMode = openSlots.length === 0;

    sessionSelect.innerHTML = '';

    if (waitlistMode) {
      // Список остаётся на виду, чтобы были видны все потоки,
      // но выбрать нечего и в заявку он не уходит
      var closed = new Option('Все потоки заполнены', '', true, true);
      closed.disabled = true;
      sessionSelect.add(closed);

      slots.forEach(function (slot) {
        var soldOut = new Option(slot.value + ' - мест нет', slot.value);
        soldOut.disabled = true;
        sessionSelect.add(soldOut);
      });

      sessionSelect.removeAttribute('name');   // без name значение не попадает в отправку
      sessionSelect.required = false;
      waitlistSession.disabled = false;        // вместо него уходит пометка о листе ожидания

      sessionField.hidden = false;
      waitlistNotice.hidden = false;
      waitlistField.hidden = false;
      preferredInput.disabled = false;
      submitBtn.textContent = WAITLIST_LABEL;
      return;
    }

    var placeholder = new Option('Выберите поток', '', true, true);
    placeholder.disabled = true;
    sessionSelect.add(placeholder);

    slots.forEach(function (slot) {
      var left = seatsLeft(slot);
      var label = slot.value;

      if (left === 0) {
        label += ' - мест нет';
      } else if (left <= 2) {
        label += ' - осталось ' + left + ' ' + seatWord(left);
      }

      var option = new Option(label, slot.value);
      option.disabled = left === 0;      // занятый поток нельзя выбрать
      sessionSelect.add(option);
    });

    sessionSelect.name = 'session';
    sessionSelect.required = true;
    waitlistSession.disabled = true;

    sessionField.hidden = false;
    waitlistNotice.hidden = true;
    waitlistField.hidden = true;
    preferredInput.disabled = true;      // отключённое поле не уходит в заявку
    submitBtn.textContent = SUBMIT_LABEL;
  }

  function loadSlots() {
    var configured = window.WEBINAR_SLOTS;

    if (!Array.isArray(configured) || !configured.length) {
      // Файл не подключён или повреждён: не закрываем запись молча
      console.warn('slots.js не найден - все потоки показаны открытыми.');
      slots = slotsFromMarkup();
    } else {
      slots = configured.filter(function (slot) { return slot && slot.value; });
    }

    renderSlots();
  }

  loadSlots();

  // Разрешаем в телефоне только осмысленные символы
  if (phoneInput) {
    phoneInput.addEventListener('input', function () {
      var cleaned = phoneInput.value.replace(/[^\d+()\-\s]/g, '');
      if (cleaned !== phoneInput.value) phoneInput.value = cleaned;
    });
  }

  function showError(message, field) {
    errorBox.textContent = message;
    errorBox.hidden = false;
    if (field) {
      field.classList.add('is-invalid');
      field.focus();
    }
  }

  function clearErrors() {
    errorBox.hidden = true;
    errorBox.textContent = '';
    form.querySelectorAll('.is-invalid').forEach(function (el) {
      el.classList.remove('is-invalid');
    });
  }

  function validate() {
    var name = form.elements.name;
    var phone = form.elements.phone;

    if (name.value.trim().length < 2) {
      showError('Напишите, как к вам обращаться.', name);
      return false;
    }
    if (phone.value.replace(/\D/g, '').length < 7) {
      showError('Проверьте номер: он нужен, чтобы прислать ссылку.', phone);
      return false;
    }
    if (!waitlistMode && !sessionSelect.value) {
      showError('Выберите дату и время вебинара.', sessionSelect);
      return false;
    }
    return true;
  }

  function setBusy(busy) {
    submitBtn.classList.toggle('is-busy', busy);
    submitBtn.disabled = busy;
    submitBtn.textContent = busy
      ? 'Отправляем…'
      : (waitlistMode ? WAITLIST_LABEL : SUBMIT_LABEL);
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    clearErrors();
    if (!validate()) return;

    var chosen = sessionSelect.value;
    var isWaitlist = waitlistMode;

    setBusy(true);

    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' }
    })
      .then(function (response) {
        if (!response.ok) throw new Error('Formspree ответил статусом ' + response.status);

        if (isWaitlist) {
          successTitle.textContent = 'Вы в списке ожидания';
          successText.textContent = 'Напишем в WhatsApp, если место освободится или как только назначим новые даты.';
        } else {
          successTitle.textContent = 'Вы записаны';
          successText.textContent = 'Поток: ' + chosen + ' (по Канкуну). Ссылку пришлём в WhatsApp за час до начала.';
        }

        form.hidden = true;
        successBox.hidden = false;
        setBusy(false);
        successBox.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      })
      .catch(function () {
        showError('Не получилось отправить заявку. Проверьте интернет и попробуйте ещё раз.');
        setBusy(false);
      });
  });

  /* ---------- Возврат к форме после отправки ---------- */
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      successBox.hidden = true;
      form.hidden = false;
      form.reset();
      clearErrors();
      renderSlots();                 // заново рисуем список потоков и состояние кнопки
      setBusy(false);
      form.elements.name.focus({ preventScroll: true });
      form.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    });
  }
})();
