/**
 * Follow-up Management Logic
 * Smart reminders, WhatsApp template links, call actions & log history
 */

let activeTab = 'pending'; // 'pending' or 'history'
let pendingStudents = [];
let followupLogs = [];

async function initFollowupsPage() {
  const user = await requireAuth();
  if (!user) return;

  initNavigation();
  bindFollowupTabs();
  bindAddFollowupForm();
  loadPendingFollowups();
}

function bindFollowupTabs() {
  const tabPending = document.getElementById('tab-btn-pending');
  const tabHistory = document.getElementById('tab-btn-history');

  if (tabPending && tabHistory) {
    tabPending.addEventListener('click', () => {
      activeTab = 'pending';
      tabPending.classList.add('active');
      tabHistory.classList.remove('active');
      document.getElementById('pending-followups-view').style.display = 'block';
      document.getElementById('history-followups-view').style.display = 'none';
      loadPendingFollowups();
    });

    tabHistory.addEventListener('click', () => {
      activeTab = 'history';
      tabHistory.classList.add('active');
      tabPending.classList.remove('active');
      document.getElementById('pending-followups-view').style.display = 'none';
      document.getElementById('history-followups-view').style.display = 'block';
      loadFollowupHistory();
    });
  }

  // Filter history by status
  const statusFilter = document.getElementById('filter-followup-status');
  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      loadFollowupHistory(statusFilter.value);
    });
  }
}

// Load students requiring follow-up
async function loadPendingFollowups() {
  const container = document.getElementById('pending-followups-list');
  const countEl = document.getElementById('pending-followup-count');

  if (!container) return;

  container.innerHTML = `
    <div style="text-align:center;padding:40px;">
      <span class="loading-spinner"></span>
      <p style="margin-top:10px;color:var(--text-muted);">Analyzing student attendance and follow-up criteria...</p>
    </div>
  `;

  try {
    const data = await apiRequest('/api/followups/pending');
    pendingStudents = data.items || [];

    if (countEl) countEl.textContent = `${pendingStudents.length} students requiring contact`;

    if (pendingStudents.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-check-double empty-icon" style="color:#16a34a;background:#dcfce7;"></i>
          <div class="empty-title">All Caught Up!</div>
          <p class="empty-desc">No students currently require urgent follow-up. Great job!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = pendingStudents.map(st => {
      const waLink = getWhatsAppLink(st.phone_number, st.name);
      const consentHtml = st.consent_to_contact
        ? `<span class="badge badge-regular" style="font-size:0.7rem;"><i class="fas fa-check"></i> Consented</span>`
        : `<span class="badge badge-absent" style="font-size:0.7rem;"><i class="fas fa-ban"></i> No Consent</span>`;

      return `
        <div class="card" style="margin-bottom:14px;border-left:4px solid var(--warning);">
          <div class="card-body">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
              <div>
                <a href="/student-details.html?id=${st.student_id}" style="font-size:1.05rem;font-weight:700;color:var(--text-main);">
                  ${escapeHtml(st.name)}
                </a>
                <div style="font-size:0.8rem;color:var(--text-muted);display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:2px;">
                  <span><i class="fas fa-id-badge"></i> ${escapeHtml(st.registration_number)}</span>
                  <span><i class="fas fa-building"></i> ${escapeHtml(st.hostel_name)} (${escapeHtml(st.room_number)})</span>
                  <span><i class="fas fa-graduation-cap"></i> ${escapeHtml(st.branch)}</span>
                </div>
              </div>
              <div style="display:flex;gap:6px;align-items:center;">
                ${getStatusBadge(st.status)}
                ${consentHtml}
              </div>
            </div>

            <!-- Followup Reason Tags -->
            <div style="margin-bottom:14px;">
              ${st.reasons.map(r => `
                <span class="badge" style="background:#fef3c7;color:#92400e;margin-right:6px;margin-bottom:4px;">
                  <i class="fas fa-exclamation-circle"></i> ${escapeHtml(r)}
                </span>
              `).join('')}
              <div style="font-size:0.8rem;color:var(--text-muted);margin-top:6px;">
                Attendance: <strong>${st.total_attended} sessions</strong> (${st.attendance_rate}%) | Last Follow-up: ${st.last_followup_date || 'Never'}
              </div>
            </div>

            <!-- Action Buttons: Call, WhatsApp, Record -->
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;border-top:1px solid var(--border-light);padding-top:12px;">
              ${st.consent_to_contact 
                ? `
                  <a href="tel:${escapeHtml(st.phone_number)}" class="btn btn-secondary btn-sm" title="Direct Phone Call">
                    <i class="fas fa-phone-alt" style="color:var(--primary);"></i> Call Student
                  </a>
                  <a href="${waLink}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm" style="color:#16a34a;" title="Open WhatsApp Chat">
                    <i class="fab fa-whatsapp"></i> WhatsApp
                  </a>
                `
                : `<span style="font-size:0.8rem;color:var(--danger);display:flex;align-items:center;gap:4px;">
                    <i class="fas fa-exclamation-triangle"></i> Student has not consented to regular phone calls.
                   </span>`
              }
              <button class="btn btn-primary btn-sm" style="margin-left:auto;" onclick="openAddFollowupModal(${st.student_id}, '${escapeHtml(st.name)}')">
                <i class="fas fa-edit"></i> Log Follow-up
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    container.innerHTML = `<div style="color:var(--danger);text-align:center;padding:20px;">Failed to load pending follow-ups: ${escapeHtml(err.message)}</div>`;
  }
}

// Load Followup History logs
async function loadFollowupHistory(status = 'all') {
  const container = document.getElementById('history-followups-list');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align:center;padding:30px;">
      <span class="loading-spinner"></span>
      <p style="margin-top:10px;color:var(--text-muted);">Loading logs...</p>
    </div>
  `;

  try {
    let url = '/api/followups';
    if (status && status !== 'all') url += `?status=${encodeURIComponent(status)}`;

    const data = await apiRequest(url);
    followupLogs = data.items || [];

    if (followupLogs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-history empty-icon"></i>
          <div class="empty-title">No Follow-up Logs Recorded</div>
          <p class="empty-desc">Logged conversations with students will appear here.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = followupLogs.map(f => `
      <div class="card" style="margin-bottom:12px;">
        <div class="card-body">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
            <div>
              <a href="/student-details.html?id=${f.student_id}" style="font-weight:700;color:var(--primary);font-size:1rem;">
                ${escapeHtml(f.student_name || 'Student')}
              </a>
              <span style="font-size:0.8rem;color:var(--text-muted);margin-left:8px;">
                ${escapeHtml(f.student_hostel_name || '')} (${escapeHtml(f.student_room_number || '')})
              </span>
            </div>
            <div style="display:flex;gap:6px;align-items:center;">
              <span class="badge badge-interested">${escapeHtml(f.contact_status)}</span>
              <button class="btn btn-secondary btn-icon btn-sm" style="color:var(--danger);" onclick="deleteFollowupRecord(${f.id})" title="Delete log">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </div>
          <p style="font-size:0.9rem;margin-bottom:8px;color:var(--text-main);">${escapeHtml(f.notes)}</p>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.78rem;color:var(--text-muted);border-top:1px dashed var(--border-light);padding-top:8px;">
            <span>Contacted on: ${new Date(f.contact_date).toLocaleDateString()} by ${escapeHtml(f.created_by_name || 'Volunteer')}</span>
            ${f.next_followup_date 
              ? `<span style="color:var(--primary);font-weight:600;"><i class="fas fa-calendar-alt"></i> Next: ${escapeHtml(f.next_followup_date)}</span>` 
              : ''}
          </div>
        </div>
      </div>
    `).join('');

  } catch (err) {
    container.innerHTML = `<div style="color:var(--danger);text-align:center;padding:20px;">Failed to load history: ${escapeHtml(err.message)}</div>`;
  }
}

// Bind modal form for recording follow-up
function bindAddFollowupForm() {
  const form = document.getElementById('form-add-followup');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const studentId = parseInt(document.getElementById('modal-fu-student-id').value);
      const contact_status = document.getElementById('modal-fu-status').value;
      const notes = document.getElementById('modal-fu-notes').value.trim();
      const next_followup_date = document.getElementById('modal-fu-next-date').value || null;
      const update_student_status = document.getElementById('modal-fu-student-status').value || null;

      try {
        await apiRequest('/api/followups', {
          method: 'POST',
          body: JSON.stringify({
            student_id: studentId,
            contact_status,
            notes,
            next_followup_date,
            update_student_status
          })
        });

        showToast('Follow-up logged successfully!', 'success');
        document.getElementById('add-followup-modal').classList.remove('active');
        form.reset();

        // Refresh views
        if (activeTab === 'pending') {
          loadPendingFollowups();
        } else {
          loadFollowupHistory();
        }

        // If on student details page, reload profile
        if (window.location.pathname.includes('student-details.html')) {
          loadStudentDetails(studentId);
        }

      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
}

// Open modal to record follow-up
function openAddFollowupModal(studentId, studentName) {
  const modal = document.getElementById('add-followup-modal');
  const idInput = document.getElementById('modal-fu-student-id');
  const nameDisplay = document.getElementById('modal-fu-student-name');

  if (modal && idInput) {
    idInput.value = studentId;
    if (nameDisplay) nameDisplay.textContent = studentName || `Student #${studentId}`;
    modal.classList.add('active');
  }
}

// Delete follow-up log record
async function deleteFollowupRecord(followupId) {
  if (!confirm('Are you sure you want to delete this follow-up record?')) return;

  try {
    await apiRequest(`/api/followups/${followupId}`, { method: 'DELETE' });
    showToast('Record deleted', 'info');
    loadFollowupHistory();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
