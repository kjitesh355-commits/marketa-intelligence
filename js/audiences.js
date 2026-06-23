/* =========================================================
   MARKETA Intelligence — Audiences Page Logic
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  renderSegments();
  initAudienceSearch();
  initCreateSegmentModal();
  renderAudienceGrowthChart();
});

// ─── Segment Data ─────────────────────────────────────────
const segments = [];

let filteredSegments = [...segments];
let selectedSegment = null;

function renderSegments(data = segments) {
  const grid = document.getElementById('segment-grid');
  if (!grid) return;

  grid.innerHTML = data.map(seg => `
    <div class="glass-card segment-card" onclick="openSegmentDetail('${seg.id}')">
      <div class="segment-header">
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="segment-icon" style="background:${seg.iconGrad};font-size:1.125rem;width:44px;height:44px;">${seg.icon}</div>
          <div>
            <div class="segment-name">${seg.name}</div>
            <div class="segment-count">${seg.count.toLocaleString()} contacts</div>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:0.8125rem;font-weight:700;color:${seg.growthUp ? '#10b981' : '#f43f5e'}">${seg.growth}</div>
          <div style="font-size:0.7rem;color:var(--text-muted);margin-top:2px">this month</div>
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
        ${seg.tags.map(t => `<span class="badge badge-indigo" style="font-size:0.7rem">${t}</span>`).join('')}
      </div>
      <p style="font-size:0.8125rem;color:var(--text-secondary);line-height:1.5;margin-top:4px">${seg.desc}</p>
      <div class="segment-engagement">
        <div class="segment-engagement-label">
          <span>Engagement Score</span>
          <span class="engagement-score" style="color:${seg.engagement > 70 ? '#10b981' : seg.engagement > 40 ? '#f59e0b' : '#f43f5e'}">${seg.engagement}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${seg.engagement}%;background:${seg.engagement > 70 ? '#10b981' : seg.engagement > 40 ? '#f59e0b' : '#f43f5e'}"></div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid var(--glass-border);margin-top:8px">
        <span style="font-size:0.75rem;color:var(--text-muted)">Updated ${seg.lastUpdated}</span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();sendCampaign('${seg.id}')">Send Campaign</button>
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();exportSegment('${seg.id}')">Export</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ─── Segment Detail Modal ─────────────────────────────────
function openSegmentDetail(id) {
  selectedSegment = segments.find(s => s.id === id);
  if (!selectedSegment) return;
  const s = selectedSegment;

  const modal = document.getElementById('segment-modal-overlay');
  if (!modal) return;

  modal.querySelector('#seg-modal-icon').textContent = s.icon;
  modal.querySelector('#seg-modal-icon').style.background = s.iconGrad;
  modal.querySelector('#seg-modal-name').textContent = s.name;
  modal.querySelector('#seg-modal-desc').textContent = s.desc;
  modal.querySelector('#seg-modal-count').textContent = s.count.toLocaleString();
  modal.querySelector('#seg-modal-ltv').textContent = s.avgLTV;
  modal.querySelector('#seg-modal-churn').textContent = s.churnRisk;
  modal.querySelector('#seg-modal-engagement').textContent = s.engagement + '%';
  modal.querySelector('#seg-modal-growth').textContent = s.growth;
  modal.querySelector('#seg-modal-growth').style.color = s.growthUp ? '#10b981' : '#f43f5e';
  openModal('segment-modal-overlay');
}

// ─── Actions ──────────────────────────────────────────────
function sendCampaign(id) {
  const seg = segments.find(s => s.id === id);
  showToast(`Campaign queued for "${seg.name}"!`, 'success');
}

function exportSegment(id) {
  const seg = segments.find(s => s.id === id);
  showToast(`Exporting "${seg.name}" contacts…`, 'info');
}

// ─── Search ───────────────────────────────────────────────
function initAudienceSearch() {
  const search = document.getElementById('audience-search');
  if (!search) return;
  search.addEventListener('input', () => {
    const q = search.value.toLowerCase();
    filteredSegments = segments.filter(s =>
      s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q) || s.tags.join(' ').toLowerCase().includes(q)
    );
    renderSegments(filteredSegments);
  });
}

// ─── Create Segment Modal ─────────────────────────────────
function initCreateSegmentModal() {
  const btn = document.getElementById('create-segment-btn');
  if (btn) btn.addEventListener('click', () => openModal('create-segment-modal-overlay'));

  const form = document.getElementById('create-segment-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = form.querySelector('#seg-name').value;
      const newSeg = {
        id: 'seg' + Date.now(),
        icon: '✨', iconGrad: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
        name, count: 0, growth: '+0%', growthUp: true,
        tags: ['New'],
        engagement: 0, lastUpdated: 'Just now',
        desc: 'Custom audience segment',
        avgLTV: '$0', churnRisk: 'Unknown',
      };
      segments.unshift(newSeg);
      filteredSegments = [...segments];
      renderSegments(filteredSegments);
      closeModal('create-segment-modal-overlay');
      form.reset();
      showToast(`Segment "${name}" created!`, 'success');
    });
  }
}

// ─── Audience Growth Chart ────────────────────────────────
function renderAudienceGrowthChart() {
  const ctx = document.getElementById('audienceGrowthChart');
  if (!ctx) return;

  const labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const totalAudience = [0,0,0,0,0,0,0,0,0,0,0,0];

  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Total Audience Size',
        data: totalAudience,
        borderColor: '#6366f1',
        backgroundColor: (ctx) => {
          const chart = ctx.chart;
          const {ctx: canvasCtx, chartArea} = chart;
          if (!chartArea) return 'transparent';
          const gradient = canvasCtx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(99,102,241,0.25)');
          gradient.addColorStop(1, 'rgba(99,102,241,0)');
          return gradient;
        },
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
        pointRadius: 5,
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#070c1a',
        pointBorderWidth: 2,
        pointHoverRadius: 7,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` Total: ${ctx.parsed.y.toLocaleString()} contacts` } }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { callback: v => (v/1000).toFixed(0)+'K' } },
      },
    },
  });
}
