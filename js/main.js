/* =========================================================
   MARKETA Intelligence — Shared JS Utilities
   ========================================================= */

// ─── Sidebar Active State ────────────────────────────────
function initSidebar() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage) {
      link.classList.add('active');
    }
  });

  // Mobile toggle
  const menuBtn = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }
}

// ─── Toast Notifications ─────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`,
    error:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>`,
    info:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
  };
  const colors = { success: '#10b981', error: '#f43f5e', info: '#6366f1' };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.style.color = colors[type];
  toast.innerHTML = `
    <span style="color:${colors[type]};flex-shrink:0">${icons[type]}</span>
    <span style="flex:1;font-size:0.875rem;color:#f1f5f9">${message}</span>
    <button onclick="this.parentElement.remove()" style="color:#475569;font-size:1.1rem;line-height:1;padding:0 4px;cursor:pointer;background:none;border:none;">×</button>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ─── Modal ───────────────────────────────────────────────
function openModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}
function closeModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Close modal on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
    document.body.style.overflow = '';
  }
});

// ─── Animate Numbers ─────────────────────────────────────
function animateCount(el, target, prefix = '', suffix = '', duration = 1500) {
  const start = 0;
  const startTime = performance.now();
  const isFloat = target % 1 !== 0;

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start + (target - start) * eased;
    el.textContent = prefix + (isFloat ? current.toFixed(1) : Math.floor(current).toLocaleString()) + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// ─── Observe & Animate KPI Cards ─────────────────────────
function initCountUpObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseFloat(el.dataset.count);
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';
        animateCount(el, target, prefix, suffix);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('[data-count]').forEach(el => observer.observe(el));
}

// ─── Filter Chips ─────────────────────────────────────────
function initFilterChips() {
  document.querySelectorAll('.filter-chip[data-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      const group = chip.dataset.group;
      if (group) {
        document.querySelectorAll(`.filter-chip[data-group="${group}"]`).forEach(c => c.classList.remove('active'));
      }
      chip.classList.toggle('active');
    });
  });
}

// ─── Toggle Switch Interactions ───────────────────────────
function initToggles() {
  document.querySelectorAll('.toggle input').forEach(toggle => {
    toggle.addEventListener('change', () => {
      const label = toggle.closest('.toggle-wrap')?.querySelector('.toggle-label');
      if (label) {
        label.textContent = toggle.checked ? 'Enabled' : 'Disabled';
      }
    });
  });
}

// ─── Date Range Picker (Simple) ───────────────────────────
function initDateRange() {
  document.querySelectorAll('.date-range').forEach(btn => {
    btn.addEventListener('click', () => {
      const options = ['Last 7 days', 'Last 30 days', 'Last 90 days', 'This year', 'Custom range'];
      const menu = document.createElement('div');
      menu.style.cssText = `
        position:absolute; z-index:200; background:#0d1427; border:1px solid rgba(255,255,255,0.08);
        border-radius:12px; padding:8px; min-width:160px; box-shadow:0 16px 40px rgba(0,0,0,0.4);
        animation: fadeInUp 0.2s ease;
      `;
      const rect = btn.getBoundingClientRect();
      menu.style.top = (rect.bottom + 6) + 'px';
      menu.style.left = rect.left + 'px';

      options.forEach(opt => {
        const item = document.createElement('div');
        item.textContent = opt;
        item.style.cssText = `padding:8px 14px;border-radius:8px;font-size:0.875rem;cursor:pointer;color:#94a3b8;transition:background 0.15s;`;
        item.onmouseenter = () => { item.style.background = 'rgba(255,255,255,0.06)'; item.style.color = '#f1f5f9'; };
        item.onmouseleave = () => { item.style.background = ''; item.style.color = '#94a3b8'; };
        item.onclick = () => {
          btn.querySelector('.date-range-label').textContent = opt;
          menu.remove();
        };
        menu.appendChild(item);
      });

      document.body.appendChild(menu);
      setTimeout(() => document.addEventListener('click', function remove(e) {
        if (!menu.contains(e.target) && e.target !== btn) {
          menu.remove();
          document.removeEventListener('click', remove);
        }
      }), 10);
    });
  });
}

// ─── Progress Bar Animate ─────────────────────────────────
function initProgressBars() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const fill = entry.target.querySelector('.progress-fill');
        if (fill && fill.dataset.width) {
          setTimeout(() => { fill.style.width = fill.dataset.width; }, 100);
        }
        observer.unobserve(entry.target);
      }
    });
  });
  document.querySelectorAll('.progress-bar').forEach(bar => observer.observe(bar));
}

// ─── Chart.js Global Defaults ─────────────────────────────
function initChartDefaults() {
  if (typeof Chart === 'undefined') return;
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.plugins.legend.labels.boxWidth = 10;
  Chart.defaults.plugins.legend.labels.padding = 16;
  Chart.defaults.plugins.tooltip.backgroundColor = '#0d1427';
  Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.1)';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.padding = 12;
  Chart.defaults.plugins.tooltip.titleFont = { weight: '700', size: 13 };
  Chart.defaults.plugins.tooltip.bodyFont = { size: 12 };
  Chart.defaults.plugins.tooltip.cornerRadius = 10;
  Chart.defaults.plugins.tooltip.displayColors = true;
  Chart.defaults.plugins.tooltip.boxPadding = 4;
}

// ─── Init All ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initCountUpObserver();
  initFilterChips();
  initToggles();
  initDateRange();
  initProgressBars();
  initChartDefaults();
});
