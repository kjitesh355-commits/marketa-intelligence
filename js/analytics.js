/* =========================================================
   MARKETA Intelligence — Analytics Page Logic
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initChartDefaults();
  renderOverviewChart();
  renderFunnelChart();
  renderHeatmapChart();
  renderDeviceChart();
  initSegmentFilter();
  initExportBtn();
});

// ─── Overview (Multi-Line) Chart ──────────────────────────
function renderOverviewChart() {
  const ctx = document.getElementById('overviewChart');
  if (!ctx) return;

  const labels = generateDayLabels(30);
  const sessions  = new Array(30).fill(0);
  const pageviews = new Array(30).fill(0);
  const bounces   = new Array(30).fill(0);

  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Sessions',
          data: sessions,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.07)',
          fill: true,
          tension: 0.4, borderWidth: 2.5,
          pointRadius: 0, pointHoverRadius: 5,
          pointBackgroundColor: '#6366f1',
        },
        {
          label: 'Page Views',
          data: pageviews,
          borderColor: '#22d3ee',
          backgroundColor: 'rgba(34,211,238,0.05)',
          fill: true,
          tension: 0.4, borderWidth: 2.5,
          pointRadius: 0, pointHoverRadius: 5,
          pointBackgroundColor: '#22d3ee',
        },
        {
          label: 'Bounce Events',
          data: bounces,
          borderColor: '#f43f5e',
          backgroundColor: 'rgba(244,63,94,0.04)',
          fill: true,
          tension: 0.4, borderWidth: 2,
          borderDash: [5, 4],
          pointRadius: 0, pointHoverRadius: 5,
          pointBackgroundColor: '#f43f5e',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', align: 'end' },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()}`
          }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { maxTicksLimit: 8 } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { callback: v => v >= 1000 ? (v/1000).toFixed(0)+'K' : v } },
      },
    },
  });
}

// ─── Funnel Chart (Horizontal Bars) ──────────────────────
function renderFunnelChart() {
  const ctx = document.getElementById('funnelChart');
  if (!ctx) return;

  const stages = ['Visitors','Engaged','Leads','Prospects','Customers'];
  const values = [0, 0, 0, 0, 0];
  const pcts   = values.map(v => (v/values[0]*100).toFixed(1));

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: stages,
      datasets: [{
        data: values,
        backgroundColor: ['#6366f1','#7c6ff0','#9479ef','#a882ef','#bd8cf4'],
        borderRadius: 8,
        borderSkipped: false,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed.x.toLocaleString()} (${pcts[ctx.dataIndex]}%)`
          }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { callback: v => v >= 1000 ? (v/1000).toFixed(0)+'K' : v } },
        y: { grid: { display: false } },
      },
    },
  });
}

// ─── Heatmap-style Chart (Hour × Day) ────────────────────
function renderHeatmapChart() {
  const ctx = document.getElementById('heatmapChart');
  if (!ctx) return;

  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const hours = ['6am','8am','10am','12pm','2pm','4pm','6pm','8pm','10pm'];

  const datasets = days.map((day, di) => ({
    label: day,
    data: hours.map(() => 0),
    backgroundColor: `hsl(${240 + di * 18},70%,55%)`,
    borderRadius: 4,
    borderSkipped: false,
  }));

  new Chart(ctx, {
    type: 'bar',
    data: { labels: hours, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', align: 'end' },
        tooltip: {
          mode: 'index',
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()} visits`
          }
        }
      },
      scales: {
        x: { stacked: true, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { stacked: true, grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { callback: v => v >= 1000 ? (v/1000).toFixed(0)+'K' : v } },
      },
    },
  });
}

// ─── Device Share (Pie) ───────────────────────────────────
function renderDeviceChart() {
  const ctx = document.getElementById('deviceChart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Mobile','Desktop','Tablet'],
      datasets: [{
        data: [0, 0, 0],
        backgroundColor: ['#6366f1','#22d3ee','#f59e0b'],
        borderColor: '#0d1427',
        borderWidth: 3,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right' },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}%` } }
      },
    },
  });
}

// ─── Segment Filter ───────────────────────────────────────
function initSegmentFilter() {
  const chips = document.querySelectorAll('.segment-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      showToast(`Segment: ${chip.textContent.trim()}`, 'info', 1800);
    });
  });
}

// ─── Export ───────────────────────────────────────────────
function initExportBtn() {
  const btn = document.getElementById('export-report-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    btn.disabled = true;
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Generating…`;
    setTimeout(() => {
      showToast('Analytics report exported successfully!', 'success');
      btn.disabled = false;
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg> Export Report`;
    }, 1800);
  });
}

// ─── Helpers ──────────────────────────────────────────────
function generateDayLabels(n) {
  const labels = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }
  return labels;
}

