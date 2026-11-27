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
    loadExamples();

    // Initialize Liquid Glass TabBar
    window.initLiquidGlassTabBar();

    // Load admin data if admin
    if (state.isAdmin) {
      loadAdminOrders();
      loadAdminAppointments();
      loadAdminStats();
      loadAdminPrices();
      loadAdminSlots();
      loadAdminExamples();
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
  const meshFillSotaRect = document.getElementById('mat-fill-sota-rect');

  if (matBorder) {
    matBorder.setAttribute('stroke', state.edgeColor.hex);
  }

  if (meshFillRect) {
    meshFillRect.setAttribute('fill', state.matColor.hex);
  }
  if (meshFillSotaRect) {
    meshFillSotaRect.setAttribute('fill', state.matColor.hex);
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
function getPriceByCode(itemKey, defaultVal) {
  if (state.config && state.config.prices) {
    const p = state.config.prices.find(x => x.key === itemKey || x.item_key === itemKey);
    if (p && p.price !== undefined) return p.price;
  }
  return defaultVal;
}

function calculatePrice() {
  let price = getPriceByCode('package_standard', 2800);

  if (state.has3dBorders) price += getPriceByCode('addon_3d_borders', 1200);
  if (state.hasTrunk) price += getPriceByCode('addon_trunk', 2000);
  if (state.heelPad === 'metal') price += getPriceByCode('heel_pad_metal', 700);
  if (state.heelPad === 'polymer') price += getPriceByCode('heel_pad_polymer', 400);
  if (state.badgesCount === 2) price += getPriceByCode('badge_pair_2', 500);
  if (state.badgesCount === 4) price += getPriceByCode('badge_pair_4', 900);

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

// Booking purpose chips switcher
document.querySelectorAll('#booking-purpose-chips .chip-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    haptic('light');
    document.querySelectorAll('#booking-purpose-chips .chip-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    const hiddenInput = document.getElementById('booking-purpose');
    if (hiddenInput) hiddenInput.value = this.dataset.purpose;
  });
});

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
// 7. EXAMPLES GALLERY "ХОЧУ ТАК ЖЕ!" (DYNAMIC)
// ==========================================
async function loadExamples() {
  const container = document.getElementById('examples-gallery-grid');
  if (!container) return;

  try {
    const res = await fetch('/api/examples');
    if (!res.ok) return;
    const data = await res.json();
    const items = data.examples || [];

    if (!items.length) {
      container.innerHTML = '<div style="color:var(--text-sec);padding:20px;text-align:center;">Примеры работ скоро появятся</div>';
      return;
    }

    container.innerHTML = items.map(item => `
      <div class="example-card">
        <div class="example-img-wrap">
          ${item.badge ? `<span class="example-badge">${item.badge}</span>` : ''}
          <img src="${item.image_url}" alt="${item.car_name}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=600&auto=format&fit=crop&q=80';">
        </div>
        <div class="example-body">
          <div class="example-car">${item.car_name}</div>
          <div class="example-details">${item.description}</div>
          <button class="btn-copy-config" 
                  data-car="${item.car_name}" 
                  data-mat="${item.mat_color || 'black'}" 
                  data-edge="${item.edge_color || 'red'}" 
                  data-cell="${item.cell_type || 'romb'}">
            ✨ Хочу так же!
          </button>
        </div>
      </div>
    `).join('');

    // Attach click events to "Хочу так же!"
    container.querySelectorAll('.btn-copy-config').forEach(btn => {
      btn.addEventListener('click', function () {
        haptic('medium');
        const carStr = this.dataset.car || '';
        const matColorId = this.dataset.mat || 'black';
        const edgeColorId = this.dataset.edge || 'red';
        const cellType = this.dataset.cell || 'romb';

        const parts = carStr.split(' ');
        const make = parts[0] || 'EVA-ART';
        const model = parts.slice(1).join(' ') || '';

        if (makeInput) makeInput.value = make;
        if (modelInput) modelInput.value = model;
        state.carMake = make;
        state.carModel = model;

        state.cellType = cellType;
        document.querySelectorAll('.seg-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.cell === cellType);
        });

        const foundMat = state.config?.colors_mat.find(c => c.id === matColorId);
        if (foundMat) {
          state.matColor = foundMat;
          document.getElementById('current-mat-color').textContent = foundMat.name;
          document.querySelectorAll('#mat-colors .color-swatch').forEach(s => {
            s.classList.toggle('active', s.dataset.id === matColorId);
          });
        }

        const foundEdge = state.config?.colors_edge.find(c => c.id === edgeColorId);
        if (foundEdge) {
          state.edgeColor = foundEdge;
          document.getElementById('current-edge-color').textContent = foundEdge.name;
          document.querySelectorAll('#edge-colors .color-swatch').forEach(s => {
            s.classList.toggle('active', s.dataset.id === edgeColorId);
          });
        }

        calculatePrice();
        updateMatSvgPreview();
        checkPattern();

        if (window.switchTabTo) {
          window.switchTabTo(0);
        }
        showToast(`Применена конфигурация для ${carStr}!`);
      });
    });
  } catch (err) {
    console.error('Failed to load examples:', err);
    container.innerHTML = '<div style="color:red;padding:10px;">Ошибка загрузки примеров</div>';
  }
}

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
          <button class="btn-status-act ready-btn" onclick="updateOrderStatus(${o.id}, 'ready')">✅ Готово</button>
          <button class="btn-status-act" onclick="updateOrderStatus(${o.id}, 'completed')">📦 Выдан</button>
          <button class="btn-status-act" onclick="updateOrderStatus(${o.id}, 'cancelled')">❌ Отменить</button>
          <button class="btn-status-act" style="background:rgba(239,68,68,0.18);color:#EF4444;border-color:rgba(239,68,68,0.35);" onclick="deleteAdminOrder(${o.id})">🗑️ Удалить</button>
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

window.deleteAdminOrder = async function (orderId) {
  if (!confirm('Вы уверены, что хотите удалить эту заявку на коврики?')) return;
  haptic('medium');
  try {
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'DELETE',
      headers: {
        'X-Telegram-User-Id': String(state.telegramUser?.id || 0),
      },
    });
    const data = await res.json();
    if (data.success) {
      haptic('success');
      showToast(data.message || 'Заявка успешно удалена');
      loadAdminOrders(state.adminFilter);
      loadAdminStats();
    } else {
      showToast('Ошибка удаления заявки');
    }
  } catch (err) {
    showToast('Ошибка сети');
  }
};

// Section switcher between Orders and Appointments in Admin Tab
window.switchAdminSubTab = function (sec) {
  haptic('selection');
  const btnOrders = document.getElementById('btn-admin-sub-orders');
  const btnApps = document.getElementById('btn-admin-sub-apps');
  const secOrders = document.getElementById('admin-sec-orders');
  const secApps = document.getElementById('admin-sec-appointments');

  if (sec === 'orders') {
    btnOrders?.classList.add('active');
    btnApps?.classList.remove('active');
    if (secOrders) secOrders.style.display = 'block';
    if (secApps) secApps.style.display = 'none';
  } else {
    btnOrders?.classList.remove('active');
    btnApps?.classList.add('active');
    if (secOrders) secOrders.style.display = 'none';
    if (secApps) secApps.style.display = 'block';
    loadAdminAppointments(state.adminAppFilter || 'all');
  }
};

// Admin Appointments Management
async function loadAdminAppointments(purpose = 'all') {
  const container = document.getElementById('admin-appointments-list');
  if (!container) return;

  container.innerHTML = '<div style="color:var(--text-sec);padding:10px;">Загрузка записей в бокс...</div>';

  try {
    const url = `/api/admin/appointments${purpose !== 'all' ? `?purpose=${encodeURIComponent(purpose)}` : ''}`;
    const res = await fetch(url, {
      headers: { 'X-Telegram-User-Id': String(state.telegramUser?.id || 0) },
    });
    if (!res.ok) {
      container.innerHTML = '<div style="color:red;padding:10px;">Нет доступа</div>';
      return;
    }
    const data = await res.json();
    state.adminAppointments = data.appointments || [];

    if (!data.appointments.length) {
      container.innerHTML = '<div style="color:var(--text-dim);padding:20px;text-align:center;">Записей в этой категории нет</div>';
      return;
    }

    container.innerHTML = data.appointments.map(a => `
      <div class="order-admin-card" id="card-app-${a.id}">
        <div class="order-admin-head">
          <span class="order-num">📅 ${a.date} · ${a.time_slot}</span>
          <span class="status-pill status-${a.status}">${a.status === 'confirmed' ? 'Подтверждена' : a.status === 'cancelled' ? 'Отменена' : a.status}</span>
        </div>
        <div style="margin: 6px 0; font-size:13px; font-weight:700; color:#A78BFA;">
          🎯 ${a.purpose}
        </div>
        <div class="order-client-row">Клиент: <b>${a.user_name}</b> · <a href="tel:${a.phone}" style="color:#60A5FA;text-decoration:none;">${a.phone}</a></div>
        <div class="order-car-row">🚗 ${a.car_info}</div>
        ${a.comment ? `<div style="font-size:12px;color:var(--text-sec);margin-top:4px;">💬 ${a.comment}</div>` : ''}
        <div class="order-actions-bar" style="margin-top:10px;">
          <button class="btn-status-act ready-btn" onclick="updateAppStatus(${a.id}, 'confirmed')">✅ Подтвердить</button>
          <button class="btn-status-act" onclick="updateAppStatus(${a.id}, 'cancelled')">❌ Отменить</button>
          <button class="btn-status-act" style="background:rgba(239,68,68,0.18);color:#EF4444;border-color:rgba(239,68,68,0.35);" onclick="deleteAdminAppointment(${a.id})">🗑️ Удалить</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<div style="color:red;padding:10px;">Ошибка загрузки записей</div>';
  }
}

window.deleteAdminAppointment = async function (appId) {
  if (!confirm('Вы уверены, что хотите удалить эту запись в бокс?')) return;
  haptic('medium');
  try {
    const res = await fetch(`/api/admin/appointments/${appId}`, {
      method: 'DELETE',
      headers: {
        'X-Telegram-User-Id': String(state.telegramUser?.id || 0),
      },
    });
    const data = await res.json();
    if (data.success) {
      haptic('success');
      showToast('Запись успешно удалена');
      loadAdminAppointments(state.adminAppFilter || 'all');
      loadAdminStats();
    } else {
      showToast('Ошибка удаления');
    }
  } catch (err) {
    showToast('Ошибка сети');
  }
};

window.updateAppStatus = async function (appId, status) {
  haptic('medium');
  try {
    const res = await fetch(`/api/admin/appointments/${appId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-User-Id': String(state.telegramUser?.id || 0),
      },
      body: JSON.stringify({ status: status }),
    });
    const data = await res.json();
    if (data.success) {
      haptic('success');
      showToast(data.message || 'Статус записи обновлен');
      loadAdminAppointments(state.adminAppFilter || 'all');
      loadAdminStats();
    } else {
      showToast('Ошибка обновления статуса');
    }
  } catch (err) {
    showToast('Ошибка сети');
  }
};

// Admin Filters for Orders
document.querySelectorAll('#orders-filter-bar .admin-filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    haptic('light');
    document.querySelectorAll('#orders-filter-bar .admin-filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.adminFilter = chip.dataset.status;
    loadAdminOrders(state.adminFilter);
  });
});

// Admin Filters for Appointments (Замер / Установка / Консультация)
document.querySelectorAll('#apps-filter-bar .admin-filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    haptic('light');
    document.querySelectorAll('#apps-filter-bar .admin-filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.adminAppFilter = chip.dataset.purpose;
    loadAdminAppointments(state.adminAppFilter);
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

// Admin Price Management
async function loadAdminPrices() {
  const container = document.getElementById('admin-prices-list');
  if (!container) return;
  try {
    const res = await fetch('/api/admin/prices', {
      headers: { 'X-Telegram-User-Id': String(state.telegramUser?.id || 0) },
    });
    if (!res.ok) return;
    const data = await res.json();
    container.innerHTML = data.prices.map(p => `
      <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.03);padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,0.06);">
        <div style="flex:1;">
          <div style="font-weight:600;font-size:14px;">${p.title}</div>
          <div style="font-size:12px;color:var(--text-sec);">${p.description || ''}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <input type="number" id="price-input-${p.id}" value="${p.price}" style="width:80px;padding:6px 8px;border-radius:8px;background:var(--bg-input);border:1px solid var(--border-color);color:white;font-weight:700;text-align:right;">
          <span style="font-size:13px;color:var(--text-sec);">₽</span>
          <button class="btn-status-act ready-btn" style="padding:6px 10px;font-size:12px;" onclick="saveAdminPrice(${p.id})">💾</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading admin prices:', err);
  }
}

window.saveAdminPrice = async function(priceId) {
  haptic('medium');
  const input = document.getElementById(`price-input-${priceId}`);
  if (!input) return;
  const newPrice = parseFloat(input.value);
  if (isNaN(newPrice) || newPrice < 0) {
    showToast('Введите корректную цену');
    return;
  }
  try {
    const res = await fetch(`/api/admin/prices/${priceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-User-Id': String(state.telegramUser?.id || 0),
      },
      body: JSON.stringify({ price: newPrice }),
    });
    const data = await res.json();
    if (data.success) {
      haptic('success');
      showToast('Цена успешно обновлена!');
      const cfgRes = await fetch('/api/config');
      state.config = await cfgRes.json();
      calculatePrice();
      loadAdminPrices();
    } else {
      showToast('Ошибка сохранения цены');
    }
  } catch (err) {
    showToast('Ошибка сети');
  }
};

// Admin Slot Management
async function loadAdminSlots() {
  const container = document.getElementById('admin-slots-list');
  if (!container) return;
  try {
    const res = await fetch('/api/admin/slots', {
      headers: { 'X-Telegram-User-Id': String(state.telegramUser?.id || 0) },
    });
    if (!res.ok) return;
    const data = await res.json();
    if (!data.slots.length) {
      container.innerHTML = '<span style="color:var(--text-dim);font-size:13px;">Нет добавленных слотов</span>';
      return;
    }
    container.innerHTML = data.slots.map(s => `
      <div style="display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:10px;background:${s.is_active ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.05)'};border:1px solid ${s.is_active ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.1)'};">
        <span onclick="toggleAdminSlot(${s.id})" style="cursor:pointer;font-weight:700;font-size:13px;color:${s.is_active ? '#A78BFA' : 'var(--text-dim)'};text-decoration:${s.is_active ? 'none' : 'line-through'};">
          ${s.slot || s.slot_time} ${s.is_active ? '✓' : '✗'}
        </span>
        <button onclick="deleteAdminSlot(${s.id})" style="background:none;border:none;color:#EF4444;cursor:pointer;font-size:13px;padding:0 2px;">✕</button>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading admin slots:', err);
  }
}

window.toggleAdminSlot = async function(slotId) {
  haptic('light');
  try {
    const res = await fetch(`/api/admin/slots/${slotId}/toggle`, {
      method: 'POST',
      headers: { 'X-Telegram-User-Id': String(state.telegramUser?.id || 0) },
    });
    const data = await res.json();
    if (data.success) {
      loadAdminSlots();
      if (state.selectedBookingDate) loadAvailableSlots(state.selectedBookingDate);
    }
  } catch (err) {
    showToast('Ошибка сети');
  }
};

window.deleteAdminSlot = async function(slotId) {
  if (!confirm('Удалить этот слот времени?')) return;
  haptic('medium');
  try {
    const res = await fetch(`/api/admin/slots/${slotId}`, {
      method: 'DELETE',
      headers: { 'X-Telegram-User-Id': String(state.telegramUser?.id || 0) },
    });
    const data = await res.json();
    if (data.success) {
      showToast('Слот удален');
      loadAdminSlots();
      if (state.selectedBookingDate) loadAvailableSlots(state.selectedBookingDate);
    }
  } catch (err) {
    showToast('Ошибка сети');
  }
};

document.getElementById('form-add-slot')?.addEventListener('submit', async e => {
  e.preventDefault();
  haptic('medium');
  const input = document.getElementById('slot-time');
  const val = input.value.trim();
  if (!val) return;
  try {
    const res = await fetch('/api/admin/slots', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-User-Id': String(state.telegramUser?.id || 0),
      },
      body: JSON.stringify({ slot: val }),
    });
    const data = await res.json();
    if (data.success) {
      haptic('success');
      showToast(`Слот ${val} добавлен!`);
      input.value = '';
      loadAdminSlots();
      if (state.selectedBookingDate) loadAvailableSlots(state.selectedBookingDate);
    } else {
      showToast('Слот уже существует или некорректен');
    }
  } catch (err) {
    showToast('Ошибка добавления');
  }
});

// Admin Examples Management
async function loadAdminExamples() {
  const container = document.getElementById('admin-examples-list');
  if (!container) return;

  try {
    const res = await fetch('/api/examples');
    if (!res.ok) return;
    const data = await res.json();
    const items = data.examples || [];

    if (!items.length) {
      container.innerHTML = '<span style="color:var(--text-dim);font-size:13px;">Примеров пока нет</span>';
      return;
    }

    container.innerHTML = items.map(ex => `
      <div style="display:flex;gap:12px;align-items:center;background:rgba(255,255,255,0.03);padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,0.06);">
        <img src="${ex.image_url}" alt="${ex.car_name}" style="width:55px;height:55px;object-fit:cover;border-radius:8px;background:#222;" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=600&auto=format&fit=crop&q=80';">
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${ex.car_name}</div>
          <div style="font-size:12px;color:var(--text-sec);line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${ex.description}</div>
          ${ex.badge ? `<span style="font-size:10px;background:rgba(124,58,237,0.25);color:#A78BFA;padding:2px 6px;border-radius:4px;display:inline-block;margin-top:2px;">${ex.badge}</span>` : ''}
        </div>
        <button class="btn-status-act" style="background:rgba(239,68,68,0.2);color:#EF4444;border-color:rgba(239,68,68,0.3);padding:6px 10px;font-size:13px;" onclick="deleteAdminExample(${ex.id})">
          🗑️
        </button>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading admin examples:', err);
  }
}

window.deleteAdminExample = async function(id) {
  if (!confirm('Удалить этот пример работы из галереи?')) return;
  haptic('medium');
  try {
    const res = await fetch(`/api/examples/${id}`, {
      method: 'DELETE',
      headers: {
        'X-Telegram-User-Id': String(state.telegramUser?.id || 0),
      },
    });
    const data = await res.json();
    if (data.success) {
      showToast('Пример работы удален');
      loadAdminExamples();
      loadExamples();
    } else {
      showToast('Ошибка удаления');
    }
  } catch (err) {
    showToast('Ошибка сети');
  }
};

document.getElementById('form-add-example')?.addEventListener('submit', async e => {
  e.preventDefault();
  haptic('medium');

  const carName = document.getElementById('ex-car-name').value.trim();
  const desc = document.getElementById('ex-desc').value.trim();
  const badge = document.getElementById('ex-badge').value.trim();
  const fileInput = document.getElementById('ex-file');
  const urlInput = document.getElementById('ex-url').value.trim();
  const mat = document.getElementById('ex-mat').value;
  const edge = document.getElementById('ex-edge').value;

  if (!carName || !desc) {
    showToast('Заполните марку/модель авто и описание');
    return;
  }

  const submitBtn = document.getElementById('btn-submit-example');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Публикация...';
  }

  try {
    const formData = new FormData();
    formData.append('car_name', carName);
    formData.append('description', desc);
    if (badge) formData.append('badge', badge);
    formData.append('mat_color', mat);
    formData.append('edge_color', edge);
    formData.append('cell_type', 'romb');

    if (fileInput && fileInput.files && fileInput.files[0]) {
      formData.append('image_file', fileInput.files[0]);
    }
    if (urlInput) {
      formData.append('image_url', urlInput);
    }

    const res = await fetch('/api/examples', {
      method: 'POST',
      headers: {
        'X-Telegram-User-Id': String(state.telegramUser?.id || 0),
      },
      body: formData,
    });

    const data = await res.json();
    if (data.success) {
      haptic('success');
      showToast(`Пример для ${carName} успешно опубликован!`);
      document.getElementById('form-add-example').reset();
      loadAdminExamples();
      loadExamples();
    } else {
      showToast(data.detail || 'Ошибка публикации');
    }
  } catch (err) {
    showToast('Ошибка сети при загрузке фото');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '+ Опубликовать пример работы';
    }
  }
});

// Run App on DOMContentLoaded
document.addEventListener('DOMContentLoaded', initApp);
