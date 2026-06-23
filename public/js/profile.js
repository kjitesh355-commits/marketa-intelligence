/* =========================================================
   MARKETA Intelligence — Profile System (localStorage)
   ========================================================= */

const MARKETA_PROFILE_KEY = 'marketa_profile';

function getProfile() {
  try {
    return JSON.parse(localStorage.getItem(MARKETA_PROFILE_KEY)) || null;
  } catch { return null; }
}

function saveProfile(name, role) {
  localStorage.setItem(MARKETA_PROFILE_KEY, JSON.stringify({ name, role }));
  renderProfile();
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function renderProfile() {
  const profile = getProfile();
  const name = profile?.name || '';
  const role = profile?.role || '';

  // Sidebar name + role
  document.querySelectorAll('.sidebar-user-name').forEach(el => {
    el.textContent = name || 'Set your name';
  });
  document.querySelectorAll('.sidebar-user-role').forEach(el => {
    el.textContent = role || 'Click to set up profile';
  });

  // Avatar initials (sidebar + topbar)
  const initial = getInitials(name);
  document.querySelectorAll('#sidebar-avatar, #topbar-avatar').forEach(el => {
    el.textContent = initial;
  });

  // Greeting
  const greetingEl = document.getElementById('greeting-text');
  if (greetingEl) {
    const h = new Date().getHours();
    const timeGreet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    greetingEl.textContent = name ? `${timeGreet}, ${name.split(' ')[0]}` : timeGreet;
  }
}

function openProfileModal() {
  const profile = getProfile();
  const existing = document.getElementById('profile-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'profile-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);';
  modal.innerHTML = `
    <div style="background:var(--bg-secondary);border:1px solid var(--glass-border);border-radius:var(--radius-lg);padding:var(--space-8);width:90%;max-width:420px;box-shadow:var(--shadow-lg);">
      <h2 style="font-family:var(--font-display);font-size:1.25rem;font-weight:700;margin-bottom:var(--space-2);">Your Profile</h2>
      <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:var(--space-6);">Set your name and role. This is stored locally in your browser.</p>
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div>
          <label style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px;">Full Name</label>
          <input type="text" id="profile-name-input" value="${profile?.name || ''}" placeholder="e.g. Sarah Chen"
            style="width:100%;padding:10px 14px;border-radius:var(--radius-md);border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:var(--text-primary);font-size:0.9rem;font-family:var(--font);outline:none;transition:border-color 0.2s;"
            onfocus="this.style.borderColor='rgba(0,217,255,0.4)'" onblur="this.style.borderColor='rgba(255,255,255,0.08)'" />
        </div>
        <div>
          <label style="font-size:0.78rem;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:6px;">Role / Title</label>
          <input type="text" id="profile-role-input" value="${profile?.role || ''}" placeholder="e.g. Marketing Manager"
            style="width:100%;padding:10px 14px;border-radius:var(--radius-md);border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.04);color:var(--text-primary);font-size:0.9rem;font-family:var(--font);outline:none;transition:border-color 0.2s;"
            onfocus="this.style.borderColor='rgba(0,217,255,0.4)'" onblur="this.style.borderColor='rgba(255,255,255,0.08)'" />
        </div>
        <div style="display:flex;gap:var(--space-3);margin-top:var(--space-2);">
          <button onclick="saveProfileFromModal()" style="flex:1;padding:10px;border-radius:var(--radius-md);border:none;background:var(--grad-primary);color:#fff;font-family:var(--font-display);font-weight:600;font-size:0.85rem;cursor:pointer;">Save Profile</button>
          <button onclick="document.getElementById('profile-modal').remove()" style="padding:10px 20px;border-radius:var(--radius-md);border:1px solid rgba(255,255,255,0.08);background:transparent;color:var(--text-secondary);font-family:var(--font);font-size:0.85rem;cursor:pointer;">Cancel</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  setTimeout(() => document.getElementById('profile-name-input')?.focus(), 100);
}

function saveProfileFromModal() {
  const name = document.getElementById('profile-name-input').value.trim();
  const role = document.getElementById('profile-role-input').value.trim();
  saveProfile(name, role);
  document.getElementById('profile-modal').remove();
  if (typeof showToast === 'function') {
    showToast(name ? `Profile saved — welcome, ${name.split(' ')[0]}!` : 'Profile cleared', 'success');
  }
}

// Make sidebar-user clickable to open profile modal
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.sidebar-user').forEach(el => {
    el.addEventListener('click', openProfileModal);
    el.style.cursor = 'pointer';
  });
  renderProfile();
});
