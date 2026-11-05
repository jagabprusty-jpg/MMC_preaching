/**
 * Session Management Logic
 * Full CRUD for outreach & meditation sessions
 */

let allSessions = [];

async function initSessionsPage() {
  const user = await requireAuth();
  if (!user) return;

  initNavigation();
  loadSessions();
  bindSessionForms();
}

async function loadSessions() {
  const container = document.getElementById('sessions-grid-container');
  if (!container) return;

  container.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
      <span class="loading-spinner"></span>
      <p style="margin-top:10px; color:var(--text-muted);">Loading sessions...</p>
    </div>
  `;

  try {
    const data = await apiRequest('/api/sessions');
    allSessions = data.items || [];

    if (allSessions.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center;">
          <div class="empty-state">
            <i class="fas fa-calendar-plus empty-icon" style="width:54px;height:54px;font-size:1.6rem;"></i>
            <div class="empty-title">No Meditation Sessions Created</div>
            <p class="empty-desc">Create your first outreach session to begin marking attendance.</p>
            <button class="btn btn-primary" onclick="openCreateSessionModal()">
              <i class="fas fa-plus"></i> Create Session
            </button>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = allSessions.map(s => {
      const totalMarked = s.total_marked || 0;
      const rate = totalMarked > 0 ? (s.total_present / totalMarked * 100).toFixed(0) : 0;

      return `
        <div class="card" style="display:flex;flex-direction:column;justify-content:space-between;">
          <div class="card-header">
            <div>
              <span class="badge ${s.total_present > 0 ? 'badge-regular' : 'badge-interested'}">
                <i class="fas fa-om"></i> Session #${s.id}
              </span>
            </div>
            <div style="display:flex;gap:4px;">
              <button class="btn btn-secondary btn-icon btn-sm" onclick="openEditSessionModal(${s.id})" title="Edit">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-secondary btn-icon btn-sm" style="color:var(--danger);" onclick="confirmDeleteSession(${s.id}, '${escapeHtml(s.session_name)}')" title="Delete">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </div>
          <div class="card-body">
            <h3 style="margin-bottom:8px;color:var(--primary);">${escapeHtml(s.session_name)}</h3>
            <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:14px;">
              ${escapeHtml(s.description || 'Guided mantra meditation and spiritual discussion session.')}
            </p>
            <div style="display:flex;flex-direction:column;gap:6px;font-size:0.88rem;">
              <div><i class="fas fa-calendar-day" style="width:20px;color:var(--primary-light);"></i> <strong>${escapeHtml(s.session_date)}</strong> at ${escapeHtml(s.start_time)}</div>
              <div><i class="fas fa-map-marker-alt" style="width:20px;color:var(--primary-light);"></i> ${escapeHtml(s.location)}</div>
              <div><i class="fas fa-user-circle" style="width:20px;color:var(--primary-light);"></i> Created by ${escapeHtml(s.creator_name || 'Volunteer')}</div>
            </div>
            <div style="margin-top:16px;padding:10px;background:var(--bg-subtle);border-radius:var(--radius-md);display:flex;justify-content:space-around;text-align:center;">
              <div>
                <div style="font-size:1.1rem;font-weight:700;color:#16a34a;">${s.total_present}</div>
                <div style="font-size:0.72rem;text-transform:uppercase;color:var(--text-muted);">Present</div>
              </div>
              <div>
                <div style="font-size:1.1rem;font-weight:700;color:#dc2626;">${s.total_absent}</div>
                <div style="font-size:0.72rem;text-transform:uppercase;color:var(--text-muted);">Absent</div>
              </div>
              <div>
                <div style="font-size:1.1rem;font-weight:700;color:var(--primary);">${rate}%</div>
                <div style="font-size:0.72rem;text-transform:uppercase;color:var(--text-muted);">Turnout</div>
              </div>
            </div>
          </div>
          <div class="card-footer" style="gap:8px;">
            <a href="/attendance.html?session_id=${s.id}" class="btn btn-primary btn-sm btn-full">
              <i class="fas fa-clipboard-check"></i> Mark Attendance
            </a>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    container.innerHTML = `<div style="grid-column: 1/-1; color:var(--danger); text-align:center;">Failed to load sessions: ${escapeHtml(err.message)}</div>`;
  }
}

function bindSessionForms() {
  const btnCreate = document.getElementById('btn-open-create-session');
  if (btnCreate) {
    btnCreate.addEventListener('click', openCreateSessionModal);
  }

  const createForm = document.getElementById('form-create-session');
  if (createForm) {
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        session_name: document.getElementById('session-name').value.trim(),
        session_date: document.getElementById('session-date').value.trim(),
        start_time: document.getElementById('session-time').value.trim(),
        location: document.getElementById('session-location').value.trim(),
        description: document.getElementById('session-description').value.trim() || null
      };

      try {
        await apiRequest('/api/sessions', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        showToast('Session created successfully!', 'success');
        document.getElementById('create-session-modal').classList.remove('active');
        createForm.reset();
        loadSessions();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
}

function openCreateSessionModal() {
  const modal = document.getElementById('create-session-modal');
  if (modal) {
    // Set default date to today and default time
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('session-date');
    const timeInput = document.getElementById('session-time');
    if (dateInput) dateInput.value = today;
    if (timeInput) timeInput.value = '18:30';
    modal.classList.add('active');
  }
}

async function openEditSessionModal(sessionId) {
  try {
    const s = await apiRequest(`/api/sessions/${sessionId}`);
    const modal = document.getElementById('edit-session-modal');
    if (!modal) return;

    document.getElementById('edit-session-id').value = s.id;
    document.getElementById('edit-session-name').value = s.session_name;
    document.getElementById('edit-session-date').value = s.session_date;
    document.getElementById('edit-session-time').value = s.start_time;
    document.getElementById('edit-session-location').value = s.location;
    document.getElementById('edit-session-description').value = s.description || '';

    modal.classList.add('active');

    const form = document.getElementById('form-edit-session');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const updated = {
        session_name: document.getElementById('edit-session-name').value.trim(),
        session_date: document.getElementById('edit-session-date').value.trim(),
        start_time: document.getElementById('edit-session-time').value.trim(),
        location: document.getElementById('edit-session-location').value.trim(),
        description: document.getElementById('edit-session-description').value.trim() || null
      };

      try {
        await apiRequest(`/api/sessions/${s.id}`, {
          method: 'PUT',
          body: JSON.stringify(updated)
        });
        showToast('Session updated successfully!', 'success');
        modal.classList.remove('active');
        loadSessions();
      } catch (err) {
        showToast(err.message, 'error');
      }
    };

  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

function confirmDeleteSession(sessionId, sessionName) {
  const modal = document.getElementById('delete-session-modal');
  const nameEl = document.getElementById('delete-session-name-confirm');
  const confirmBtn = document.getElementById('btn-confirm-delete-session');

  if (modal && confirmBtn) {
    if (nameEl) nameEl.textContent = sessionName;
    modal.classList.add('active');

    confirmBtn.onclick = async () => {
      try {
        await apiRequest(`/api/sessions/${sessionId}`, { method: 'DELETE' });
        showToast(`Session "${sessionName}" deleted successfully`, 'success');
        modal.classList.remove('active');
        loadSessions();
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  }
}
