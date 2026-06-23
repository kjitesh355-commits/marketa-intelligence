/* =========================================================
   MARKETA Intelligence — Dashboard Charts & Logic
   ========================================================= */

const noDataPlugin = {
  id: 'noData',
  afterDraw(chart) {
    const hasData = chart.data.datasets.some(ds => ds.data && ds.data.length > 0);
    if (hasData) return;
    const { ctx, chartArea } = chart;
    const { left, right, top, bottom } = chartArea;
    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;
    ctx.save();
    ctx.font = '600 14px Inter, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('No data available', centerX, centerY);
    ctx.restore();
  },
};

Chart.register(noDataPlugin);

document.addEventListener('DOMContentLoaded', () => {
  initChartDefaults();
  renderTrafficChart();
  renderDonutChart();
  renderChannelChart();
  renderMiniCharts();
  initCampaignTable();
  initActivityFeed();
  initTimeFilter();
});

// ─── Traffic Over Time (Line Chart) ──────────────────────
function renderTrafficChart() {
  const ctx = document.getElementById('trafficChart');
  if (!ctx) return;

  const labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const data = {
    sessions:     [],
    conversions:  [],
  };

  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Sessions',
          data: data.sessions,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.08)',
          fill: true,
          tension: 0.4,
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: '#6366f1',
          pointBorderColor: '#070c1a',
          pointBorderWidth: 2,
          pointHoverRadius: 6,
          yAxisID: 'y',
        },
        {
          label: 'Conversions',
          data: data.conversions,
          borderColor: '#22d3ee',
          backgroundColor: 'rgba(34,211,238,0.06)',
          fill: true,
          tension: 0.4,
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: '#22d3ee',
          pointBorderColor: '#070c1a',
          pointBorderWidth: 2,
          pointHoverRadius: 6,
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const val = ctx.parsed.y;
              return ` ${ctx.dataset.label}: ${val.toLocaleString()}`;
            }
          }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' } },
        y: {
          type: 'linear',
          position: 'left',
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { callback: v => v >= 1000 ? (v/1000).toFixed(0)+'K' : v },
        },
        y1: {
          type: 'linear',
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { callback: v => v >= 1000 ? (v/1000).toFixed(1)+'K' : v },
        },
      },
    },
  });
}

// ─── Traffic Sources (Donut Chart) ───────────────────────
function renderDonutChart() {
  const ctx = document.getElementById('donutChart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['No Data'],
      datasets: [{
        data: [1],
        backgroundColor: ['#2a3352'],
        borderColor: '#0d1427',
        borderWidth: 3,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ctx.label === 'No Data' ? ' No data available' : ` ${ctx.label}: ${ctx.parsed}%`
          }
        }
      },
    },
  });
}

// ─── Channel Performance (Bar Chart) ─────────────────────
function renderChannelChart() {
  const ctx = document.getElementById('channelChart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Revenue ($K)',
          data: [],
          backgroundColor: 'rgba(99,102,241,0.8)',
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: 'Spend ($K)',
          data: [],
          backgroundColor: 'rgba(34,211,238,0.5)',
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: $${ctx.parsed.y}K`
          }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' } },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { callback: v => '$' + v + 'K' },
        },
      },
    },
  });
}

// ─── Mini Sparkline Charts ────────────────────────────────
function renderMiniCharts() {
  const miniConfigs = [
    { id: 'mini1', color: '#6366f1', data: [] },
    { id: 'mini2', color: '#22d3ee', data: [] },
    { id: 'mini3', color: '#10b981', data: [] },
    { id: 'mini4', color: '#f59e0b', data: [] },
  ];

  miniConfigs.forEach(({ id, color, data }) => {
    const ctx = document.getElementById(id);
    if (!ctx) return;
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array.from({ length: data.length }, (_, i) => i),
        datasets: [{ data, borderColor: color, borderWidth: 2, fill: true, tension: 0.4,
          backgroundColor: color.replace(')', ',0.1)').replace('rgb', 'rgba'),
          pointRadius: 0 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
        animation: { duration: 800 },
      },
    });
  });
}

// ─── Campaign Table ───────────────────────────────────────
const campaigns = [];

const statusConfig = {
  active:    { cls: 'badge-emerald', label: 'Active' },
  paused:    { cls: 'badge-amber',   label: 'Paused' },
  draft:     { cls: 'badge-indigo',  label: 'Draft'  },
  scheduled: { cls: 'badge-cyan',    label: 'Scheduled' },
};

const channelColors = {
  'Google Ads': '#6366f1','Meta Ads': '#8b5cf6','Email': '#22d3ee',
  'TikTok': '#ec4899','LinkedIn': '#0ea5e9','YouTube': '#f43f5e',
};

function initCampaignTable() {
  const tbody = document.getElementById('campaign-tbody');
  if (!tbody) return;

  if (campaigns.length === 0) {
    const colCount = tbody.closest('table')?.querySelectorAll('th').length || 7;
    tbody.innerHTML = `<tr><td colspan="${colCount}" style="text-align:center;padding:32px 16px;color:#475569;font-size:0.875rem;">No campaigns yet. Create one to get started.</td></tr>`;
    return;
  }

  tbody.innerHTML = campaigns.map(c => {
    const cfg = statusConfig[c.status];
    const pct = c.budget > 0 ? Math.round((c.spent / c.budget) * 100) : 0;
    const channelColor = channelColors[c.channel] || '#6366f1';
    return `
      <tr>
        <td>
          <div style="font-weight:600;font-size:0.875rem">${c.name}</div>
          <div style="font-size:0.75rem;color:#94a3b8;margin-top:2px">Updated 2h ago</div>
        </td>
        <td>
          <span style="display:inline-flex;align-items:center;gap:6px;font-size:0.8125rem;">
            <span style="width:8px;height:8px;border-radius:50%;background:${channelColor};flex-shrink:0;box-shadow:0 0 6px ${channelColor};"></span>
            ${c.channel}
          </span>
        </td>
        <td><span class="badge ${cfg.cls}"><span class="dot dot-${cfg.cls.split('-')[1]}"></span>${cfg.label}</span></td>
        <td>
          <div style="font-size:0.875rem;font-weight:600;margin-bottom:4px;">$${c.spent.toLocaleString()} / $${c.budget.toLocaleString()}</div>
          <div class="progress-bar" style="width:120px"><div class="progress-fill" style="width:${pct}%;background:${channelColor};opacity:0.85"></div></div>
        </td>
        <td style="font-weight:600">${c.conversions > 0 ? c.conversions.toLocaleString() : '—'}</td>
        <td>
          ${c.roas > 0
            ? `<span style="font-weight:700;color:${c.roas >= 4 ? '#10b981' : c.roas >= 3 ? '#f59e0b' : '#f43f5e'}">${c.roas}x</span>`
            : '<span style="color:#475569">—</span>'}
        </td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" onclick="showToast('Opening campaign editor…','info')">Edit</button>
            <button class="btn-icon" onclick="showToast('Report generated!','success')" title="Report" style="padding:6px 8px">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ─── Activity Feed ────────────────────────────────────────
const activities = [];

function initActivityFeed() {
  const feed = document.getElementById('activity-feed');
  if (!feed) return;

  if (activities.length === 0) {
    feed.innerHTML = '<div style="text-align:center;padding:32px 16px;color:#475569;font-size:0.875rem;">No recent activity.</div>';
    return;
  }

  feed.innerHTML = activities.map(a => `
    <div class="activity-item">
      <div class="activity-icon" style="background:${a.color};font-size:1rem">${a.icon}</div>
      <div class="activity-content">
        <div class="activity-text">${a.text}</div>
        <div class="activity-time">${a.time}</div>
      </div>
    </div>
  `).join('');
}

// ─── Time Filter ──────────────────────────────────────────
function initTimeFilter() {
  document.querySelectorAll('.time-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.time-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Simulate data reload
      showToast(`Data updated for ${btn.textContent}`, 'success', 2000);
    });
  });
}
