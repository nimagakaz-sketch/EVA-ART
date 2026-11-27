/**
 * Liquid Glass UI Engine (iOS 27 Fluid Glass Physics)
 * Adapted from liquid-glass-kit for Telegram Mini App
 */

(function () {
  const isChromium = /Chrome\//.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
  const $ = id => document.getElementById(id);
  const surf = x => Math.pow(1 - Math.pow(1 - x, 4), 0.25);

  function profile(T, B, ior, N = 128) {
    const eta = 1 / ior, p = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const x = i / N, y = surf(x), dx = x < 1 ? 1e-4 : -1e-4;
      const d = (surf(x + dx) - y) / dx, m = Math.hypot(d, 1), nx = -d / m, ny = -1 / m;
      const k = 1 - eta * eta * (1 - ny * ny);
      if (k < 0) continue;
      const s = Math.sqrt(k);
      p[i] = -(eta * ny + s) * nx * ((y * B + T) / (eta - (eta * ny + s) * ny));
    }
    return p;
  }

  const k0 = (x, y, w) => (y * w + x) * 4 + 3;

  function maps(w, h, r, B, p, mx) {
    const mk = () => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const x = c.getContext('2d');
      return [c, x, x.createImageData(w, h)];
    };
    const [c1, x1, i1] = mk(), [c2, x2, i2] = mk();
    const a = i1.data, b = i2.data;
    const N = p.length, wB = w - 2 * r, hB = h - 2 * r, Bs = B * 2.5;
    const sx = Math.cos(Math.PI / 3), sy = Math.sin(Math.PI / 3);

    for (let i = 0; i < a.length; i += 4) { a[i] = a[i + 1] = 128; a[i + 3] = 255; }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const X = x < r ? x - r : x >= w - r ? x - r - wB : 0;
        const Y = y < r ? y - r : y >= h - r ? y - r - hB : 0;
        const d2 = X * X + Y * Y;
        if (d2 > (r + 1) ** 2) continue;
        const d = Math.sqrt(d2);
        if (!d) { b[k0(x, y, w)] = 0; continue; }
        const op = d < r ? 1 : 1 - (d - r), k = (y * w + x) * 4;
        const cs = X / d, sn = Y / d, fs = r - d;
        if (op <= 0) continue;
        if (d2 >= Math.max(r - B, 0) ** 2) {
          const disp = p[Math.min(Math.max((fs / B * N) | 0, 0), N - 1)] || 0;
          a[k] = (128 + (-cs * disp / mx) * 127 * op + 0.5) | 0;
          a[k + 1] = (128 + (-sn * disp / mx) * 127 * op + 0.5) | 0;
        }
        if (d2 >= Math.max(r - Bs, 0) ** 2) {
          const dot = Math.abs(cs * sx + (-sn) * sy);
          const edge = Math.sqrt(Math.max(0, 1 - (1 - fs) ** 2));
          const co = dot * edge, col = (255 * co) | 0;
          b[k] = b[k + 1] = b[k + 2] = col;
          b[k + 3] = (col * co * op) | 0;
        }
      }
    }
    x1.putImageData(i1, 0, 0);
    x2.putImageData(i2, 0, 0);
    return [c1.toDataURL(), c2.toDataURL()];
  }

  function filterFor(el, id) {
    const w = el.offsetWidth, h = el.offsetHeight;
    if (w < 2 || h < 2) return '';
    const soft = !!el.dataset.soft, r = h / 2, B = Math.min(h * (soft ? 0.15 : 0.34), r - 1);
    const p = profile(h * (soft ? 0.2 : 0.42), B, soft ? 1.5 : 1.9);
    const mx = Math.max(...Array.from(p, Math.abs)) || 1;
    const [disp, spec] = maps(w, h, r, B, p, mx);

    return `<filter id="${id}" x="0%" y="0%" width="100%" height="100%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="0.2" result="bl"/>
      <feImage href="${disp}" x="0" y="0" width="${w}" height="${h}" result="dm"/>
      <feDisplacementMap in="bl" in2="dm" scale="${mx * (soft ? 0.1 : id === 'lg-thumb' ? 0.45 : 0.4)}" xChannelSelector="R" yChannelSelector="G" result="dp"/>
      <feColorMatrix in="dp" type="saturate" values="5" result="ds"/>
      <feImage href="${spec}" x="0" y="0" width="${w}" height="${h}" result="sl"/>
      <feComposite in="ds" in2="sl" operator="in" result="sm"/>
      <feComponentTransfer in="sl" result="sf"><feFuncA type="linear" slope="${soft ? 0 : id === 'lg-thumb' ? 0.22 : 1}"/></feComponentTransfer>
      <feBlend in="sm" in2="dp" mode="normal" result="ws"/>
      <feBlend in="sf" in2="ws" mode="normal"/>
    </filter>`;
  }

  window.initLiquidGlassTabBar = function (options = {}) {
    const bar = $('bar');
    const base = $('base');
    const fil = $('fil');
    const thumb = $('thumb');
    const lens = $('lens');
    const tabsEl = $('tabs');
    const solid = document.querySelector('.solid');

    if (!bar || !tabsEl) return;

    let tabs = [...tabsEl.querySelectorAll('.tab')];
    let numTabs = tabs.length;

    // Unit dimensions
    const TAB_W_U = numTabs === 5 ? 190 : 225;
    const THUMB_W_U = numTabs === 5 ? 175 : 210;
    const BAR_H_U = 175;
    const THUMB_H_U = 152;
    const PAD_U = 12;

    const totalWidthU = numTabs * TAB_W_U + PAD_U * 2;
    bar.style.width = `calc(${totalWidthU} * var(--u))`;
    bar.style.height = `calc(${BAR_H_U} * var(--u))`;
    tabsEl.style.gridTemplateColumns = `repeat(${numTabs}, calc(${TAB_W_U} * var(--u)))`;

    // Lens & Solid sizing
    if (solid) {
      solid.style.width = `calc(${THUMB_W_U} * var(--u))`;
      solid.style.height = `calc(${THUMB_H_U} * var(--u))`;
      solid.style.top = `calc(11.5 * var(--u))`;
    }
    if (thumb) {
      thumb.style.width = `calc(${THUMB_W_U} * var(--u))`;
      thumb.style.height = `calc(${THUMB_H_U} * var(--u))`;
      thumb.style.top = `calc(11.5 * var(--u))`;
    }

    // Filter build
    const bdEls = [[base, 'bd-base']], glassEls = [[lens, 'lg-thumb']];
    bdEls.forEach(([el]) => el && (el.dataset.soft = '1'));

    function rebuild() {
      const defs = $('defs');
      if (!defs) return;
      defs.innerHTML = glassEls.concat(isChromium ? bdEls : []).map(([el, id]) => el ? filterFor(el, id) : '').join('');
      glassEls.forEach(([el, id]) => el && (el.style.filter = `url(#${id})`));
      if (isChromium) {
        bdEls.forEach(([el, id]) => {
          if (!el) return;
          const v = `url(#${id}) blur(4px) saturate(1.8)`;
          el.style.backdropFilter = v;
          el.style.webkitBackdropFilter = v;
        });
      }
    }

    let rt;
    const ro = new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(rebuild, 90); });
    glassEls.concat(bdEls).forEach(([el]) => el && ro.observe(el));
    rebuild();

    // Clone tabs inside lens for reflective optics
    lens.innerHTML = '';
    const clone = tabsEl.cloneNode(true);
    clone.removeAttribute('id');
    clone.setAttribute('aria-hidden', 'true');
    clone.querySelectorAll('.tab').forEach(b => (b.tabIndex = -1));
    lens.appendChild(clone);
    const cloneTabs = [...clone.children];

    let cur = 0, vel = 0, target = 0, press = 0, pvel = 0, down = false, grab = 0, active = 0;
    let pRaw = 0, pT = 0, pV = 0, mv = 0, mvv = 0, zz = 0, zzv = 0, wasMoving = false, lag = 0, lagv = 0;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    let hi = 0;
    function highlight(i) {
      if (i === hi) return;
      hi = i;
      [tabs, cloneTabs].forEach(arr => arr.forEach((el, n) => el.classList.toggle('on', n === i)));
      if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
        try { window.Telegram.WebApp.HapticFeedback.selectionChanged(); } catch (_) {}
      }
    }

    function setActive(i) {
      highlight(i);
      if (i === active) return;
      active = i;
      if (typeof window.onTabChange === 'function') {
        window.onTabChange(i);
      }
    }

    function ptr(e) {
      const rc = tabsEl.getBoundingClientRect();
      const w = tabs[0].offsetWidth;
      const pad = (rc.width - w * numTabs) / 2;
      return (e.clientX - rc.left - pad) / w;
    }

    function place(p, now) {
      const raw = p - 0.5 - grab;
      const maxIdx = numTabs - 1;
      target = raw < 0 ? raw * 0.3 : raw > maxIdx ? maxIdx + (raw - maxIdx) * 0.3 : raw;
      if (pT) {
        const dt = Math.max(0.008, (now - pT) / 1000);
        pV += ((raw - pRaw) / dt - pV) * 0.35;
      }
      pRaw = raw; pT = now;
      highlight(clamp(Math.round(raw), 0, maxIdx));
    }

    bar.addEventListener('pointerdown', e => {
      bar.setPointerCapture(e.pointerId);
      down = true;
      bar.classList.add('down');
      pV = 0; pT = 0;
      const p = ptr(e);
      grab = Math.abs(p - (cur + 0.5)) < 0.5 ? p - (cur + 0.5) : 0;
      place(p, e.timeStamp);
    });

    bar.addEventListener('pointermove', e => { if (down) place(ptr(e), e.timeStamp); });

    ['pointerup', 'pointercancel'].forEach(n => bar.addEventListener(n, e => {
      if (!down) return;
      down = false;
      bar.classList.remove('down');
      const maxIdx = numTabs - 1;
      if (e.timeStamp - pT > 90) pV = 0;
      pV = clamp(pV, -9, 9);
      const dest = clamp(Math.round(pRaw + pV * 0.1), 0, maxIdx);
      target = dest;
      setActive(dest);
      vel += pV * 0.22;
    }));

    tabs.forEach((el, n) => {
      el.addEventListener('click', e => {
        target = n;
        setActive(n);
      });
    });

    // Physics Animation Loop
    let last = performance.now();
    function loop(now) {
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;

      const k = down ? 210 : 230, c = down ? 22 : 1.6 * Math.sqrt(230), pk = 200, pc = 11;
      const n = 4, h = dt / n;
      for (let i = 0; i < n; i++) {
        vel += (-k * (cur - target) - c * vel) * h;
        cur += vel * h;
        pvel += (-pk * (press - (down ? 1 : 0)) - pc * pvel) * h;
        press += pvel * h;
        lagv += (-180 * (lag - cur) - 2 * Math.sqrt(180) * lagv) * h;
        lag += lagv * h;
      }

      const moving = Math.abs(cur - target) > 0.08 || Math.abs(vel) > 0.8;
      if (wasMoving && !moving && !down) zzv -= 2.2;
      if (!wasMoving && moving) zzv += 1.3;
      wasMoving = moving;

      const mk = moving ? 380 : 900, mc = 2 * Math.sqrt(mk);
      for (let i = 0; i < 4; i++) {
        mvv += (-mk * (mv - (moving ? 1 : 0)) - mc * mvv) * (dt / 4);
        mv += mvv * (dt / 4);
      }
      mv = clamp(mv, -0.2, 1.6);

      const zt = 0.02 * clamp(Math.abs(vel) / 6, 0, 1) + 0.04 * press;
      for (let i = 0; i < 4; i++) {
        zzv += (-170 * (zz - zt) - 1.2 * Math.sqrt(170) * zzv) * (dt / 4);
        zz += zzv * (dt / 4);
      }
      zz = clamp(zz, -0.3, 0.3);

      const g = (mv < 0 && press < 0.02) ? mv : Math.max(mv, press);
      const st = clamp(Math.abs(vel) * 0.055, 0, 0.26) * (down ? 1 : 0.6);
      const s = 1 + 0.05 * g + 0.06 * press, sy = 1 + 0.24 * g + 0.16 * press;

      const sm = (v, m, K) => (v <= m - K ? v : m - K * Math.exp(-(v - (m - K)) / K));
      const leftOffset = PAD_U + (TAB_W_U - THUMB_W_U) / 2;
      const cx = PAD_U + cur * TAB_W_U + TAB_W_U / 2;
      const barRightLimit = totalWidthU + 40;

      const horiz = w => [-sm(-(cx - w / 2), 40, 26), sm(cx + w / 2, barRightLimit, 26)];
      let dirv = Math.sign(vel) || 1;
      const jel = clamp((cur - lag) * dirv, -0.55, 0.55);
      let sxv = s * (1 + st) * (1 + 0.48 * jel) * (1 - 0.45 * zz);
      let syv = sy * (1 + zz);
      sxv = Math.min(sxv, 1.35);

      let [Lc, Rc] = horiz(THUMB_W_U * sxv);
      const cmp = Math.max(0, 1 - (Rc - Lc) / (THUMB_W_U * sxv));
      vel *= 1 - Math.min(0.3, cmp * 4 * dt);
      syv *= 1 + 0.45 * cmp;

      const h0 = THUMB_H_U * syv, h1 = sm(h0, BAR_H_U + 25, 14);
      sxv *= Math.sqrt(h0 / h1);
      syv = h1 / THUMB_H_U;

      [Lc, Rc] = horiz(THUMB_W_U * sxv);

      // Apply to CSS variables
      const calculatedX = leftOffset + cur * TAB_W_U;
      bar.style.setProperty('--x', cur.toFixed(4));
      if (solid) solid.style.left = `calc(${calculatedX} * var(--u))`;
      if (thumb) thumb.style.left = `calc(${calculatedX} * var(--u))`;

      bar.style.setProperty('--tx', ((Lc + Rc) / 2 - cx).toFixed(3));
      bar.style.setProperty('--sx', ((Rc - Lc) / THUMB_W_U).toFixed(4));
      bar.style.setProperty('--sy', syv.toFixed(4));
      bar.style.setProperty('--p', clamp(g, 0, 1).toFixed(3));

      if (lens) {
        const lensTabs = lens.querySelector('.tabs');
        if (lensTabs) {
          const shiftX = -leftOffset - cur * TAB_W_U - ((Lc + Rc) / 2 - cx);
          lensTabs.style.left = `calc(${shiftX} * var(--u))`;
          lensTabs.style.width = `calc(${totalWidthU} * var(--u))`;
        }
      }

      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);

    // Expose programmatic switch
    window.switchTabTo = function (index) {
      const idx = clamp(index, 0, numTabs - 1);
      target = idx;
      setActive(idx);
    };
  };
})();
