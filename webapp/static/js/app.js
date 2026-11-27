/**
 * EVA-ART Telegram Mini App
 * Slogan: "Если ЕВА коврики, то EVA-ART"
 * City: Кемерово, ул. Карболитовская, 12, бокс №3
 */

const state = {
  // Config from backend
  config: null,
  isAdmin: false,
  telegramUser: null,

  // Configurator state
  carMake: 'Toyota',
  carModel: 'Camry',
  carYear: '2020',
  hasPattern: true,

  packageType: 'Стандартный салон',
  has3dBorders: false,
  hasTrunk: false,
  cellType: 'romb', // 'romb' | 'sota'

  matColor: { id: 'black', name: 'Чёрный', hex: '#1a1a1a' },
  edgeColor: { id: 'red', name: 'Красный', hex: '#e02020' },
  heelPad: 'none', // 'none' | 'polymer' | 'metal'
  badgesCount: 0, // 0 | 2 | 4

  totalPrice: 2800,
  estimatedDays: '1-2 рабочих дня',

  // Booking state
  selectedDate: '',
  selectedSlot: '',
  availableSlots: [],

  // Admin state
  adminOrders: [],
  adminFilter: 'all',
};

// Telegram WebApp Integration
const tg = window.Telegram?.WebApp;
if (tg) {
  try {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#121316');
    tg.setBackgroundColor('#121316');
    if (tg.initDataUnsafe?.user) {
      state.telegramUser = tg.initDataUnsafe.user;
    }
  } catch (e) {
    console.warn('Telegram WebApp init warning:', e);
  }
}

// Fallback demo user if running in browser outside Telegram
if (!state.telegramUser) {
  state.telegramUser = {
    id: 123456789,
    first_name: 'Клиент',
    last_name: '',
    username: 'eva_client',
  };
}

function haptic(type = 'light') {
  if (tg?.HapticFeedback) {
    try {
      if (type === 'selection') tg.HapticFeedback.selectionChanged();
      else if (type === 'success') tg.HapticFeedback.notificationOccurred('success');
      else tg.HapticFeedback.impactOccurred(type);
    } catch (_) {}
  }
}

function showToast(text, duration = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ==========================================
// 1. INITIALIZATION & DATA FETCHING
// ==========================================
async function initApp() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    state.config = data;

    // Check admin privilege
    if (state.telegramUser && data.admin_ids && data.admin_ids.includes(state.telegramUser.id)) {
      state.isAdmin = true;
      const adminTab = document.getElementById('tab-admin');
      if (adminTab) adminTab.style.display = 'flex';
    }

    renderColorPickers();
    renderFAQ();
    initBookingDates();
    checkPattern();
    calculatePrice();

    // Initialize Liquid Glass TabBar
    window.initLiquidGlassTabBar();

    // Load admin data if admin
    if (state.isAdmin) {
      loadAdminOrders();
      loadAdminStats();
    }
  } catch (err) {
    console.error('App init error:', err);
  }
}

// Tab Switching Handler called by Liquid Glass Engine
window.onTabChange = function (index) {
  haptic('selection');
  const views = ['v-calc', 'v-booking', 'v-examples', 'v-contacts', 'v-admin'];
  views.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('active', i === index);
  });
};

// ==========================================
// 2. CONFIGURATOR & COLOR CONSTRUCTOR
// ==========================================
function renderColorPickers() {
  const matContainer = document.getElementById('mat-colors');
  const edgeContainer = document.getElementById('edge-colors');

  if (!state.config) return;

  // Render Mat Colors
  if (matContainer) {
    matContainer.innerHTML = state.config.colors_mat.map(c => `
      <div class="color-swatch ${c.id === state.matColor.id ? 'active' : ''}"
           style="background: ${c.hex};"
           data-id="${c.id}"
           data-name="${c.name}"
           data-hex="${c.hex}"
           title="${c.name}"></div>
    `).join('');

    matContainer.querySelectorAll('.color-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        haptic('light');
        state.matColor = { id: sw.dataset.id, name: sw.dataset.name, hex: sw.dataset.hex };
        matContainer.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        document.getElementById('current-mat-color').textContent = sw.dataset.name;
        updateMatSvgPreview();
      });
    });
  }

  // Render Edge Colors
  if (edgeContainer) {
    edgeContainer.innerHTML = state.config.colors_edge.map(c => `
      <div class="color-swatch ${c.id === state.edgeColor.id ? 'active' : ''}"
           style="background: ${c.hex};"
           data-id="${c.id}"
           data-name="${c.name}"
           data-hex="${c.hex}"
           title="${c.name}"></div>
    `).join('');

    edgeContainer.querySelectorAll('.color-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        haptic('light');
        state.edgeColor = { id: sw.dataset.id, name: sw.dataset.name, hex: sw.dataset.hex };
        edgeContainer.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        document.getElementById('current-edge-color').textContent = sw.dataset.name;
        updateMatSvgPreview();
      });
    });
  }
}

// Cell Type Toggle (Diamond / Honeycomb)
document.querySelectorAll('.seg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    haptic('light');
    document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.cellType = btn.dataset.cell;
    updateMatSvgPreview();
  });
});

// Option Toggles (3D borders, Trunk)
document.getElementById('opt-3d')?.addEventListener('click', function () {
  haptic('light');
  state.has3dBorders = !state.has3dBorders;
  this.classList.toggle('selected', state.has3dBorders);
  calculatePrice();
  updateMatSvgPreview();
});

document.getElementById('opt-trunk')?.addEventListener('click', function () {
  haptic('light');
  state.hasTrunk = !state.hasTrunk;
  this.classList.toggle('selected', state.hasTrunk);
  calculatePrice();
});

// Heel Pad Chips
document.querySelectorAll('#heel-chips .chip-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    haptic('light');
    document.querySelectorAll('#heel-chips .chip-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.heelPad = btn.dataset.heel;
    calculatePrice();
    updateMatSvgPreview();
  });
});

// Badges Chips
document.querySelectorAll('#badge-chips .chip-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    haptic('light');
    document.querySelectorAll('#badge-chips .chip-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.badgesCount = parseInt(btn.dataset.badges, 10);
    calculatePrice();
    updateMatSvgPreview();
  });
});

// Car make and model change
const makeInput = document.getElementById('car-make');
const modelInput = document.getElementById('car-model');
const yearInput = document.getElementById('car-year');

let checkPatternTimer = null;
function onCarInputChange() {
  state.carMake = makeInput.value.trim();
  state.carModel = modelInput.value.trim();
  state.carYear = yearInput.value.trim();

  clearTimeout(checkPatternTimer);
  checkPatternTimer = setTimeout(checkPattern, 400);
}

makeInput?.addEventListener('input', onCarInputChange);
modelInput?.addEventListener('input', onCarInputChange);
yearInput?.addEventListener('input', onCarInputChange);

async function checkPattern() {
  if (!state.carMake || !state.carModel) return;
  try {
    const url = `/api/patterns/check?make=${encodeURIComponent(state.carMake)}&model=${encodeURIComponent(state.carModel)}&year=${encodeURIComponent(state.carYear || '')}`;
    const res = await fetch(url);
    const data = await res.json();
    state.hasPattern = data.has_pattern;

    const badge = document.getElementById('pattern-badge');
    const badgeText = document.getElementById('pattern-badge-text');
    const badgeIcon = document.getElementById('pattern-badge-icon');

    if (badge && badgeText && badgeIcon) {
      if (data.has_pattern) {
        badge.className = 'pattern-badge ready';
        badgeIcon.textContent = '✅';
        badgeText.textContent = data.badge_text;
      } else {
        badge.className = 'pattern-badge need-measure';
        badgeIcon.textContent = '📏';
        badgeText.textContent = data.badge_text;
      }
    }
    updateMatSvgPreview();
  } catch (err) {
    console.error('Pattern check error:', err);
  }
}

// ==========================================
// 3. INTERACTIVE CAR MAT SVG DIAGRAM
// ==========================================
function updateMatSvgPreview() {
  const matBody = document.getElementById('svg-mat-body');
  const matBorder = document.getElementById('svg-mat-border');
  const heelMetal = document.getElementById('svg-heel-metal');
  const heelPolymer = document.getElementById('svg-heel-polymer');
  const badgePlate = document.getElementById('svg-badge-plate');
  const badgeText = document.getElementById('svg-badge-text');
  const borders3D = document.getElementById('svg-3d-borders');

  // Update cell mesh pattern color and type
  const meshPattern = document.getElementById('mat-cell-pattern');
  const meshFillRect = document.getElementById('mat-fill-rect');

  if (matBorder) {
    matBorder.setAttribute('stroke', state.edgeColor.hex);
  }

  if (meshFillRect) {
    meshFillRect.setAttribute('fill', state.matColor.hex);
  }

  // Cell pattern switch (romb or sota)
  const patternRomb = document.getElementById('pattern-romb');
  const patternSota = document.getElementById('pattern-sota');
  if (patternRomb && patternSota) {
    if (state.cellType === 'romb') {
      patternRomb.style.display = 'block';
      patternSota.style.display = 'none';
      matBody.setAttribute('fill', 'url(#pattern-romb)');
    } else {
      patternRomb.style.display = 'none';
      patternSota.style.display = 'block';
      matBody.setAttribute('fill', 'url(#pattern-sota)');
    }
  }

  // Heel pad display
  if (heelMetal) heelMetal.style.display = state.heelPad === 'metal' ? 'block' : 'none';
  if (heelPolymer) heelPolymer.style.display = state.heelPad === 'polymer' ? 'block' : 'none';

  // Badges display
  if (badgePlate && badgeText) {
    if (state.badgesCount > 0) {
      badgePlate.style.display = 'block';
      badgeText.textContent = (state.carMake || 'EVA-ART').toUpperCase();
    } else {
      badgePlate.style.display = 'none';
    }
  }

  // 3D Borders overlay highlight
  if (borders3D) {
    borders3D.style.display = state.has3dBorders ? 'block' : 'none';
  }
}

// ==========================================
// 4. PRICE CALCULATION
// ==========================================
function calculatePrice() {
  let price = 2800; // Base standard salon

  if (state.has3dBorders) price += 1200;
  if (state.hasTrunk) price += 2000;
  if (state.heelPad === 'metal') price += 700;
  if (state.heelPad === 'polymer') price += 400;
  if (state.badgesCount === 2) price += 500;
  if (state.badgesCount === 4) price += 900;

  state.totalPrice = price;
  const priceDisplay = document.getElementById('price-total-display');
  if (priceDisplay) {
    priceDisplay.textContent = `${price.toLocaleString('ru-RU')} ₽`;
  }
}

// ==========================================
// 5. ORDER CHECKOUT MODAL & SUBMISSION
// ==========================================
const checkoutModal = document.getElementById('checkout-modal');
document.getElementById('btn-open-checkout')?.addEventListener('click', () => {
  haptic('medium');
  if (!state.carMake || !state.carModel) {
    showToast('Пожалуйста, укажите марку и модель авто');
    return;
  }

  // Populate checkout summary
  document.getElementById('modal-car-name').textContent = `${state.carMake} ${state.carModel} ${state.carYear || ''}`;
  document.getElementById('modal-color-summary').textContent = `${state.matColor.name} (${state.cellType === 'romb' ? 'Ромб' : 'Сота'}) + кант ${state.edgeColor.name}`;
  document.getElementById('modal-total-price').textContent = `${state.totalPrice.toLocaleString('ru-RU')} ₽`;

  // Pre-fill user data
  const nameInput = document.getElementById('order-name');
  if (nameInput && state.telegramUser) {
    nameInput.value = `${state.telegramUser.first_name || ''} ${state.telegramUser.last_name || ''}`.trim() || 'Клиент';
  }

  checkoutModal.classList.add('open');
});

document.getElementById('btn-close-modal')?.addEventListener('click', () => {
  checkoutModal.classList.remove('open');
});
checkoutModal?.addEventListener('click', e => {
  if (e.target === checkoutModal) checkoutModal.classList.remove('open');
});

document.getElementById('form-submit-order')?.addEventListener('submit', async e => {
  e.preventDefault();
  haptic('medium');

  const name = document.getElementById('order-name').value.trim();
  const phone = document.getElementById('order-phone').value.trim();
  const delivery = document.querySelector('input[name="delivery"]:checked')?.value || 'Самовывоз (бокс №3)';
  const comment = document.getElementById('order-comment').value.trim();

  if (!name || phone.length < 8) {
    showToast('Пожалуйста, укажите корректное имя и номер телефона');
    return;
  }

  const payload = {
    user_id: state.telegramUser?.id || null,
    user_name: name,
    phone: phone,
    car_make: state.carMake,
    car_model: state.carModel,
    car_year: state.carYear || null,
    has_pattern: state.hasPattern,
    package_type: state.has3dBorders ? '3D с бортами' : 'Стандартный салон',
    cell_type: state.cellType === 'romb' ? 'Ромб' : 'Сота',
    mat_color: state.matColor.name,
    edge_color: state.edgeColor.name,
    heel_pad: state.heelPad === 'metal' ? 'Металлический' : state.heelPad === 'polymer' ? 'Полимерный' : 'Без подпятника',
    badges_count: state.badgesCount,
    total_price: state.totalPrice,
    estimated_days: state.estimatedDays,
    delivery_type: delivery,
    comment: comment,
  };

  try {
    const btn = document.getElementById('btn-submit-order');
    btn.disabled = true;
    btn.textContent = 'Оформляем...';

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    btn.disabled = false;
    btn.textContent = 'Подтвердить заказ';

    if (data.success) {
      haptic('success');
      checkoutModal.classList.remove('open');
      showToast(`🎉 Заказ ${data.order.order_number} успешно принят!`);
      // Reset inputs
      document.getElementById('order-comment').value = '';
    } else {
      showToast('Ошибка при оформлении. Попробуйте еще раз.');
    }
  } catch (err) {
    console.error('Order submit error:', err);
    showToast('Ошибка сети. Проверьте соединение.');
  }
});

// ==========================================
// 6. APPOINTMENT BOOKING
// ==========================================
function initBookingDates() {
  const container = document.getElementById('dates-carousel');
  if (!container) return;

  const dates = [];
  const daysOfWeek = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const isoDate = `${yyyy}-${mm}-${dd}`;

    dates.push({
      iso: isoDate,
      day: daysOfWeek[d.getDay()],
      dateNum: d.getDate(),
      month: months[d.getMonth()],
    });
  }

  container.innerHTML = dates.map((d, idx) => `
    <div class="date-pill ${idx === 0 ? 'active' : ''}" data-date="${d.iso}">
      <span class="date-pill-day">${d.day}</span>
      <span class="date-pill-num">${d.dateNum}</span>
    </div>
  `).join('');

  state.selectedDate = dates[0].iso;
  loadSlotsForDate(state.selectedDate);

  container.querySelectorAll('.date-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      haptic('light');
      container.querySelectorAll('.date-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.selectedDate = pill.dataset.date;
      loadSlotsForDate(state.selectedDate);
    });
  });
}

async function loadSlotsForDate(dateStr) {
  const container = document.getElementById('slots-container');
  if (!container) return;

  container.innerHTML = '<div style="color:var(--text-sec);font-size:13px;">Загрузка слотов...</div>';
  try {
    const res = await fetch(`/api/appointments/available-slots?date=${dateStr}`);
    const data = await res.json();
    state.availableSlots = data.slots;

    container.innerHTML = data.slots.map(s => `
      <div class="slot-pill ${!s.is_available ? 'disabled' : ''}" data-slot="${s.slot}">
        ${s.slot}
      </div>
    `).join('');

    container.querySelectorAll('.slot-pill:not(.disabled)').forEach(pill => {
      pill.addEventListener('click', () => {
        haptic('light');
        container.querySelectorAll('.slot-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.selectedSlot = pill.dataset.slot;
      });
    });
  } catch (err) {
    container.innerHTML = '<div style="color:red;font-size:13px;">Ошибка загрузки слотов</div>';
  }
}

document.getElementById('form-booking')?.addEventListener('submit', async e => {
  e.preventDefault();
  haptic('medium');

  if (!state.selectedDate || !state.selectedSlot) {
    showToast('Пожалуйста, выберите дату и время');
    return;
  }

  const carInfo = document.getElementById('booking-car').value.trim();
  const phone = document.getElementById('booking-phone').value.trim();
  const name = document.getElementById('booking-name').value.trim();
  const purpose = document.getElementById('booking-purpose').value;
  const comment = document.getElementById('booking-comment').value.trim();

  if (!carInfo || phone.length < 8 || !name) {
    showToast('Заполните обязательные поля');
    return;
  }

  const payload = {
    user_id: state.telegramUser?.id || null,
    user_name: name,
    phone: phone,
    car_info: carInfo,
    date: state.selectedDate,
    time_slot: state.selectedSlot,
    purpose: purpose,
    comment: comment,
  };

  try {
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      haptic('success');
      showToast('✅ Вы записаны! Ждём вас в боксе №3');
      loadSlotsForDate(state.selectedDate);
      document.getElementById('booking-comment').value = '';
    } else {
      showToast(data.detail || 'Ошибка бронирования');
    }
  } catch (err) {
    showToast('Ошибка сети');
  }
});

// ==========================================
// 7. EXAMPLES GALLERY "ХОЧУ ТАК ЖЕ!"
// ==========================================
document.querySelectorAll('.btn-copy-config').forEach(btn => {
  btn.addEventListener('click', function () {
    haptic('medium');
    const make = this.dataset.make;
    const model = this.dataset.model;
    const matColorId = this.dataset.mat;
    const edgeColorId = this.dataset.edge;
    const cellType = this.dataset.cell;
    const heel = this.dataset.heel;
    const has3d = this.dataset.has3d === 'true';

    // Set car
    if (makeInput) makeInput.value = make;
    if (modelInput) modelInput.value = model;
    state.carMake = make;
    state.carModel = model;

    // Set cell type
    state.cellType = cellType;
    document.querySelectorAll('.seg-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.cell === cellType);
    });

    // Set mat color
    const foundMat = state.config?.colors_mat.find(c => c.id === matColorId);
    if (foundMat) {
      state.matColor = foundMat;
      document.getElementById('current-mat-color').textContent = foundMat.name;
      document.querySelectorAll('#mat-colors .color-swatch').forEach(s => {
        s.classList.toggle('active', s.dataset.id === matColorId);
      });
    }

    // Set edge color
    const foundEdge = state.config?.colors_edge.find(c => c.id === edgeColorId);
    if (foundEdge) {
      state.edgeColor = foundEdge;
      document.getElementById('current-edge-color').textContent = foundEdge.name;
      document.querySelectorAll('#edge-colors .color-swatch').forEach(s => {
        s.classList.toggle('active', s.dataset.id === edgeColorId);
      });
    }

    // Set heel pad
    state.heelPad = heel;
    document.querySelectorAll('#heel-chips .chip-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.heel === heel);
    });

    // Set 3D borders
    state.has3dBorders = has3d;
    document.getElementById('opt-3d')?.classList.toggle('selected', has3d);

    calculatePrice();
    updateMatSvgPreview();
    checkPattern();

    // Switch to tab 0 (Calculator)
    if (window.switchTabTo) {
      window.switchTabTo(0);
    }
    showToast(`Применена конфигурация для ${make} ${model}!`);
  });
});

// ==========================================
// 8. FAQ ACCORDION
// ==========================================
function renderFAQ() {
  const container = document.getElementById('faq-accordion');
  if (!container || !state.config?.faq) return;

  container.innerHTML = state.config.faq.map(item => `
    <div class="faq-item">
      <div class="faq-question">
        <span>${item.question}</span>
        <svg class="faq-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
      </div>
      <div class="faq-answer">${item.answer}</div>
    </div>
  `).join('');

  container.querySelectorAll('.faq-question').forEach(q => {
    q.addEventListener('click', () => {
      haptic('light');
      const item = q.parentElement;
      item.classList.toggle('open');
    });
  });
}

// ==========================================
// 9. ADMIN PANEL FUNCTIONS
// ==========================================
async function loadAdminStats() {
  try {
    const res = await fetch('/api/admin/stats', {
      headers: { 'X-Telegram-User-Id': String(state.telegramUser?.id || 0) },
    });
    if (!res.ok) return;
    const stats = await res.json();
    document.getElementById('stat-new-orders').textContent = stats.new_orders;
    document.getElementById('stat-in-work').textContent = stats.in_progress_orders;
    document.getElementById('stat-ready').textContent = stats.ready_orders;
    document.getElementById('stat-appointments').textContent = stats.active_appointments;
  } catch (err) {
    console.error('Admin stats error:', err);
  }
}

async function loadAdminOrders(status = 'all') {
  const container = document.getElementById('admin-orders-list');
  if (!container) return;

  container.innerHTML = '<div style="color:var(--text-sec);padding:10px;">Загрузка заказов...</div>';

  try {
    const url = `/api/admin/orders${status !== 'all' ? `?status=${status}` : ''}`;
    const res = await fetch(url, {
      headers: { 'X-Telegram-User-Id': String(state.telegramUser?.id || 0) },
    });
    if (!res.ok) {
      container.innerHTML = '<div style="color:red;padding:10px;">Нет доступа</div>';
      return;
    }
    const data = await res.json();
    state.adminOrders = data.orders;

    if (!data.orders.length) {
      container.innerHTML = '<div style="color:var(--text-dim);padding:20px;text-align:center;">Заказов в этой категории нет</div>';
      return;
    }

    container.innerHTML = data.orders.map(o => `
      <div class="order-admin-card" id="card-order-${o.id}">
        <div class="order-admin-head">
          <span class="order-num">${o.order_number}</span>
          <span class="status-pill status-${o.status}">${getStatusName(o.status)}</span>
        </div>
        <div class="order-client-row">Клиент: <b>${o.user_name}</b> · <a href="tel:${o.phone}" style="color:#60A5FA;text-decoration:none;">${o.phone}</a></div>
        <div class="order-car-row">🚗 ${o.car_make} ${o.car_model} (${o.car_year || '–'})</div>
        <div class="order-specs-row">
          • ${o.package_type} · ${o.cell_type} · ${o.mat_color} / ${o.edge_color}<br>
          • Подпятник: ${o.heel_pad} · Шильдики: ${o.badges_count} шт.<br>
          • Сумма: <b>${o.total_price} ₽</b> · ${o.delivery_type}
        </div>
        <div class="order-actions-bar">
          <button class="btn-status-act" onclick="updateOrderStatus(${o.id}, 'in_progress')">⚙️ В работу</button>
          <button class="btn-status-act ready-btn" onclick="updateOrderStatus(${o.id}, 'ready')">✅ Готово (в боксе)</button>
          <button class="btn-status-act" onclick="updateOrderStatus(${o.id}, 'completed')">📦 Выдан</button>
          <button class="btn-status-act" onclick="updateOrderStatus(${o.id}, 'cancelled')">❌ Отменить</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<div style="color:red;padding:10px;">Ошибка загрузки заказов</div>';
  }
}

function getStatusName(status) {
  const map = {
    new: 'Новый',
    in_progress: 'В работе',
    ready: 'Готово в боксе №3',
    completed: 'Выдан / Оплачен',
    cancelled: 'Отменён',
  };
  return map[status] || status;
}

window.updateOrderStatus = async function (orderId, newStatus) {
  haptic('medium');
  try {
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-User-Id': String(state.telegramUser?.id || 0),
      },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();
    if (data.success) {
      haptic('success');
      showToast(data.message);
      loadAdminOrders(state.adminFilter);
      loadAdminStats();
    } else {
      showToast('Ошибка при обновлении статуса');
    }
  } catch (err) {
    showToast('Ошибка сети');
  }
};

// Admin Filters
document.querySelectorAll('.admin-filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    haptic('light');
    document.querySelectorAll('.admin-filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.adminFilter = chip.dataset.status;
    loadAdminOrders(state.adminFilter);
  });
});

// Admin add pattern form
document.getElementById('form-add-pattern')?.addEventListener('submit', async e => {
  e.preventDefault();
  haptic('medium');

  const make = document.getElementById('pat-make').value.trim();
  const model = document.getElementById('pat-model').value.trim();
  const notes = document.getElementById('pat-notes').value.trim();

  if (!make || !model) {
    showToast('Укажите марку и модель');
    return;
  }

  try {
    const res = await fetch('/api/admin/patterns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-User-Id': String(state.telegramUser?.id || 0),
      },
      body: JSON.stringify({
        car_make: make,
        car_model: model,
        notes: notes || null,
        has_3d: true,
      }),
    });
    const data = await res.json();
    if (data.success) {
      haptic('success');
      showToast(`Лекала для ${make} ${model} добавлены!`);
      document.getElementById('pat-make').value = '';
      document.getElementById('pat-model').value = '';
      document.getElementById('pat-notes').value = '';
    }
  } catch (err) {
    showToast('Ошибка добавления');
  }
});

// Run App on DOMContentLoaded
document.addEventListener('DOMContentLoaded', initApp);
