/* =========================================================
   MARKETA Intelligence — Automation Page Logic
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  renderWorkflows();
  initCreateModal();
  initWorkflowSearch();
  initStatusFilters();
});

// ─── Workflow Data ────────────────────────────────────────
const workflows = [];

const statusBadge = {
  active:    '<span class="badge badge-emerald"><span class="dot dot-emerald"></span>Active</span>',
  paused:    '<span class="badge badge-amber"><span class="dot dot-amber"></span>Paused</span>',
  draft:     '<span class="badge badge-indigo">Draft</span>',
  scheduled: '<span class="badge badge-cyan">Scheduled</span>',
};

let filteredWorkflows = [...workflows];

function renderWorkflows(data = workflows) {
  const grid = document.getElementById('workflow-grid');
  if (!grid) return;

  if (data.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-muted)">
        <div style="font-size:2.5rem;margin-bottom:12px">🔍</div>
        <div style="font-weight:600;font-size:1rem;margin-bottom:6px">No workflows yet</div>
        <div style="font-size:0.875rem">Create your first automation to get started</div>
      </div>`;
    return;
  }

  grid.innerHTML = data.map(wf => `
    <div class="glass-card workflow-card" data-id="${wf.id}" onclick="openWorkflowDetail('${wf.id}')">
      <div class="workflow-header">
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="workflow-icon" style="background:${wf.iconBg};font-size:1.125rem">${wf.icon}</div>
          <div>
            <div class="workflow-name">${wf.name}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:3px"><path d="M13 2L3 14h9l-1 8 10-12h-9z"/></svg>
              ${wf.trigger}
            </div>
          </div>
        </div>
        ${statusBadge[wf.status]}
      </div>
      <p class="workflow-desc">${wf.desc}</p>
      <div class="workflow-stats">
        <div>
          <div class="workflow-stat-label">Sent</div>
          <div class="workflow-stat-value">${wf.sent > 0 ? wf.sent.toLocaleString() : '—'}</div>
        </div>
        <div>
          <div class="workflow-stat-label">Open Rate</div>
          <div class="workflow-stat-value">${wf.opens}</div>
        </div>
        <div>
          <div class="workflow-stat-label">Conversions</div>
          <div class="workflow-stat-value">${wf.conversions > 0 ? wf.conversions.toLocaleString() : '—'}</div>
        </div>
        <div style="margin-left:auto;text-align:right">
          <div class="workflow-stat-label">Last Run</div>
          <div style="font-size:0.8125rem;color:var(--text-secondary)">${wf.lastRun}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;padding-top:12px;border-top:1px solid var(--glass-border)">
        <button class="btn btn-primary btn-sm" style="flex:1" onclick="event.stopPropagation();toggleWorkflow('${wf.id}')">
          ${wf.status === 'active' ? '⏸ Pause' : wf.status === 'paused' ? '▶ Resume' : '🚀 Launch'}
        </button>
        <button class="btn-icon" onclick="event.stopPropagation();openWorkflowDetail('${wf.id}')" title="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-icon" onclick="event.stopPropagation();cloneWorkflow('${wf.id}')" title="Duplicate">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
      </div>
    </div>
  `).join('');
}

// ─── Toggle Workflow Status ───────────────────────────────
function toggleWorkflow(id) {
  const wf = workflows.find(w => w.id === id);
  if (!wf) return;
  if (wf.status === 'active') {
    wf.status = 'paused';
    showToast(`"${wf.name}" paused`, 'info');
  } else if (['paused','draft','scheduled'].includes(wf.status)) {
    wf.status = 'active';
    showToast(`"${wf.name}" is now active!`, 'success');
  }
  renderWorkflows(filteredWorkflows);
  updateStats();
}

// ─── Clone Workflow ───────────────────────────────────────
function cloneWorkflow(id) {
  const wf = workflows.find(w => w.id === id);
  if (!wf) return;
  const clone = { ...wf, id: 'wf' + Date.now(), name: wf.name + ' (Copy)', status: 'draft', sent: 0, conversions: 0, lastRun: 'Never' };
  workflows.push(clone);
  filteredWorkflows = [...workflows];
  renderWorkflows(filteredWorkflows);
  updateStats();
  showToast(`"${wf.name}" duplicated`, 'success');
}

// ─── Open Workflow Detail (Modal) ─────────────────────────
function openWorkflowDetail(id) {
  const wf = workflows.find(w => w.id === id);
  if (!wf) return;
  const modal = document.getElementById('workflow-detail-modal');
  if (!modal) return;
  modal.querySelector('#wf-modal-name').textContent = wf.name;
  modal.querySelector('#wf-modal-desc').textContent = wf.desc;
  modal.querySelector('#wf-modal-status').innerHTML = statusBadge[wf.status];
  modal.querySelector('#wf-modal-trigger').textContent = wf.trigger;
  modal.querySelector('#wf-modal-sent').textContent = wf.sent.toLocaleString() || '0';
  modal.querySelector('#wf-modal-opens').textContent = wf.opens;
  modal.querySelector('#wf-modal-clicks').textContent = wf.clicks;
  modal.querySelector('#wf-modal-conv').textContent = wf.conversions.toLocaleString() || '0';
  openModal('workflow-modal-overlay');
}

// ─── Create Automation Modal ──────────────────────────────
function initCreateModal() {
  const createBtn = document.getElementById('create-automation-btn');
  if (createBtn) {
    createBtn.addEventListener('click', () => openModal('create-modal-overlay'));
  }

  const form = document.getElementById('create-workflow-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = form.querySelector('#wf-name').value;
      const trigger = form.querySelector('#wf-trigger').value;
      const newWf = {
        id: 'wf' + Date.now(),
        icon: '✨', iconBg: 'rgba(99,102,241,0.15)',
        name, desc: 'Custom automation workflow',
        status: 'draft', trigger,
        sent: 0, opens: '—', clicks: '—', conversions: 0,
        lastRun: 'Never',
      };
      workflows.unshift(newWf);
      filteredWorkflows = [...workflows];
      renderWorkflows(filteredWorkflows);
      updateStats();
      closeModal('create-modal-overlay');
      form.reset();
      showToast(`Automation "${name}" created!`, 'success');
    });
  }
}

// ─── Search ───────────────────────────────────────────────
function initWorkflowSearch() {
  const search = document.getElementById('workflow-search');
  if (!search) return;
  search.addEventListener('input', applyFilters);
}

// ─── Status Filters ───────────────────────────────────────
function initStatusFilters() {
  document.querySelectorAll('.status-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.status-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilters();
    });
  });
}

function applyFilters() {
  const query = (document.getElementById('workflow-search')?.value || '').toLowerCase();
  const activeFilter = document.querySelector('.status-filter-btn.active')?.dataset.status || 'all';

  filteredWorkflows = workflows.filter(wf => {
    const matchSearch = wf.name.toLowerCase().includes(query) || wf.desc.toLowerCase().includes(query);
    const matchStatus = activeFilter === 'all' || wf.status === activeFilter;
    return matchSearch && matchStatus;
  });

  renderWorkflows(filteredWorkflows);
}

// ─── Update Header Stats ──────────────────────────────────
function updateStats() {
  const active = workflows.filter(w => w.status === 'active').length;
  const totalSent = workflows.reduce((s, w) => s + w.sent, 0);
  const totalConv = workflows.reduce((s, w) => s + w.conversions, 0);

  const el = id => document.getElementById(id);
  if (el('stat-active'))    el('stat-active').textContent    = active;
  if (el('stat-sent'))      el('stat-sent').textContent      = totalSent.toLocaleString();
  if (el('stat-conv'))      el('stat-conv').textContent      = totalConv.toLocaleString();
}

document.addEventListener('DOMContentLoaded', updateStats);
