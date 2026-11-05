/**
 * Student Management (List, Search, Filters, CRUD, Details & Registration)
 */

let currentPage = 1;
const pageLimit = 15;
let currentFilterBranch = 'all';
let currentFilterHostel = 'all';
let currentFilterStatus = 'all';
let currentSearchQuery = '';

// Initialize Students Directory Page
async function initStudentsPage() {
  const user = await requireAuth();
  if (!user) return;

  initNavigation();
  loadFilterOptions();
  loadStudents();
  bindFilterEvents();
}

// Fetch filter options (branches, hostels)
async function loadFilterOptions() {
  try {
    const filters = await apiRequest('/api/students/meta/filters');
    const branchSelect = document.getElementById('filter-branch');
    const hostelSelect = document.getElementById('filter-hostel');

    if (branchSelect && filters.branches) {
      filters.branches.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b;
        opt.textContent = b;
        branchSelect.appendChild(opt);
      });
    }

    if (hostelSelect && filters.hostels) {
      filters.hostels.forEach(h => {
        const opt = document.createElement('option');
        opt.value = h;
        opt.textContent = h;
        hostelSelect.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Failed to load filter options:', err);
  }
}

// Bind search and filter events
function bindFilterEvents() {
  const searchInput = document.getElementById('student-search-input');
  const branchSelect = document.getElementById('filter-branch');
  const hostelSelect = document.getElementById('filter-hostel');
  const statusSelect = document.getElementById('filter-status');
  const resetBtn = document.getElementById('btn-reset-filters');

  let debounceTimer;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        currentSearchQuery = e.target.value.trim();
        currentPage = 1;
        loadStudents();
      }, 350);
    });
  }

  if (branchSelect) {
    branchSelect.addEventListener('change', (e) => {
      currentFilterBranch = e.target.value;
      currentPage = 1;
      loadStudents();
    });
  }

  if (hostelSelect) {
    hostelSelect.addEventListener('change', (e) => {
      currentFilterHostel = e.target.value;
      currentPage = 1;
      loadStudents();
    });
  }

  if (statusSelect) {
    statusSelect.addEventListener('change', (e) => {
      currentFilterStatus = e.target.value;
      currentPage = 1;
      loadStudents();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (branchSelect) branchSelect.value = 'all';
      if (hostelSelect) hostelSelect.value = 'all';
      if (statusSelect) statusSelect.value = 'all';
      currentSearchQuery = '';
      currentFilterBranch = 'all';
      currentFilterHostel = 'all';
      currentFilterStatus = 'all';
      currentPage = 1;
      loadStudents();
    });
  }
}

// Load Students list with pagination and filters
async function loadStudents() {
  const container = document.getElementById('students-table-body');
  const paginationContainer = document.getElementById('students-pagination');
  const countEl = document.getElementById('students-count-summary');

  if (!container) return;

  container.innerHTML = `
    <tr>
      <td colspan="7" class="text-center" style="padding:40px;">
        <span class="loading-spinner"></span>
        <p style="margin-top:10px;color:var(--text-muted);">Loading students...</p>
      </td>
    </tr>
  `;

  try {
    let url = `/api/students?page=${currentPage}&limit=${pageLimit}`;
    if (currentSearchQuery) url += `&search=${encodeURIComponent(currentSearchQuery)}`;
    if (currentFilterBranch !== 'all') url += `&branch=${encodeURIComponent(currentFilterBranch)}`;
    if (currentFilterHostel !== 'all') url += `&hostel=${encodeURIComponent(currentFilterHostel)}`;
    if (currentFilterStatus !== 'all') url += `&status=${encodeURIComponent(currentFilterStatus)}`;

    const data = await apiRequest(url);

    if (countEl) {
      countEl.textContent = `Showing ${data.items.length} of ${data.total} registered students`;
    }

    if (!data.items || data.items.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="7" class="text-center" style="padding:40px;">
            <div class="empty-state">
              <i class="fas fa-search empty-icon" style="width:48px;height:48px;font-size:1.4rem;"></i>
              <div class="empty-title">No matching students found</div>
              <p class="empty-desc">Try clearing filters or search terms.</p>
              <a href="/register-student.html" class="btn btn-primary btn-sm">Register New Student</a>
            </div>
          </td>
        </tr>
      `;
      if (paginationContainer) paginationContainer.innerHTML = '';
      return;
    }

    // Render table rows / responsive cards
    container.innerHTML = data.items.map(s => {
      const waLink = getWhatsAppLink(s.phone_number, s.name);
      return `
        <tr>
          <td data-label="Name">
            <a href="/student-details.html?id=${s.id}" style="font-weight:600;color:var(--primary);">
              ${escapeHtml(s.name)}
            </a>
          </td>
          <td data-label="Reg Number">
            <span style="font-family:monospace;font-weight:600;">${escapeHtml(s.registration_number)}</span>
          </td>
          <td data-label="Hostel & Room">
            <div>${escapeHtml(s.hostel_name)}</div>
            <small style="color:var(--text-muted);">${escapeHtml(s.room_number)}</small>
          </td>
          <td data-label="Branch">${escapeHtml(s.branch)}</td>
          <td data-label="Contact">
            <div>${getTelLink(s.phone_number)}</div>
            ${s.consent_to_contact 
              ? `<a href="${waLink}" target="_blank" rel="noopener" style="font-size:0.78rem;color:#16a34a;display:inline-flex;align-items:center;gap:4px;margin-top:2px;">
                  <i class="fab fa-whatsapp"></i> WhatsApp
                </a>`
              : `<span style="font-size:0.75rem;color:var(--text-dim);"><i class="fas fa-ban"></i> No consent</span>`}
          </td>
          <td data-label="Status & Attendance">
            <div>${getStatusBadge(s.status)}</div>
            <div style="font-size:0.78rem;color:var(--text-muted);margin-top:3px;">
              ${s.total_attended}/${s.total_sessions_recorded} sessions (${s.attendance_rate}%)
            </div>
          </td>
          <td data-label="Actions">
            <div style="display:flex;gap:6px;justify-content:flex-end;">
              <a href="/student-details.html?id=${s.id}" class="btn btn-secondary btn-icon btn-sm" title="View Details">
                <i class="fas fa-eye"></i>
              </a>
              <button class="btn btn-secondary btn-icon btn-sm" onclick="openEditStudentModal(${s.id})" title="Edit Student">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-secondary btn-icon btn-sm" style="color:var(--danger);" onclick="confirmDeleteStudent(${s.id}, '${escapeHtml(s.name)}')" title="Delete Student">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Render pagination
    renderPagination(data.total, data.page, data.limit, data.total_pages);

  } catch (err) {
    container.innerHTML = `
      <tr>
        <td colspan="7" class="text-center" style="color:var(--danger);padding:30px;">
          Failed to load students: ${escapeHtml(err.message)}
        </td>
      </tr>
    `;
  }
}

function renderPagination(total, page, limit, totalPages) {
  const container = document.getElementById('students-pagination');
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = `
    <div style="font-size:0.85rem;color:var(--text-muted);">
      Page ${page} of ${totalPages}
    </div>
    <div class="page-numbers">
      <button class="page-btn" ${page <= 1 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''} onclick="goToPage(${page - 1})">
        <i class="fas fa-chevron-left"></i>
      </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      html += `
        <button class="page-btn ${i === page ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>
      `;
    } else if (i === page - 2 || i === page + 2) {
      html += `<span style="padding:0 4px;">...</span>`;
    }
  }

  html += `
      <button class="page-btn" ${page >= totalPages ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''} onclick="goToPage(${page + 1})">
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>
  `;

  container.innerHTML = html;
}

function goToPage(p) {
  currentPage = p;
  loadStudents();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Register Student Page Initialization
function initRegisterStudentPage() {
  requireAuth().then(user => {
    if (!user) return;
    initNavigation();

    const form = document.getElementById('form-register-student');
    const btnSubmit = document.getElementById('btn-submit-registration');

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const payload = {
          name: document.getElementById('reg-name').value.trim(),
          registration_number: document.getElementById('reg-regno').value.trim().toUpperCase(),
          room_number: document.getElementById('reg-room').value.trim(),
          branch: document.getElementById('reg-branch').value.trim(),
          phone_number: document.getElementById('reg-phone').value.trim(),
          hostel_name: document.getElementById('reg-hostel').value.trim(),
          interested: document.getElementById('reg-interested').checked,
          status: document.getElementById('reg-status').value,
          consent_to_contact: document.getElementById('reg-consent').checked,
        };

        const origBtnText = btnSubmit.innerHTML;
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<span class="loading-spinner" style="width:18px;height:18px;border-width:2px;"></span> Saving...`;

        try {
          const created = await apiRequest('/api/students', {
            method: 'POST',
            body: JSON.stringify(payload)
          });

          showToast(`Student "${created.name}" registered successfully!`, 'success');

          // Show success state modal or options
          const successModal = document.getElementById('registration-success-modal');
          const studentNameDisplay = document.getElementById('success-student-name');
          const viewProfileLink = document.getElementById('success-view-profile-link');

          if (successModal) {
            if (studentNameDisplay) studentNameDisplay.textContent = created.name;
            if (viewProfileLink) viewProfileLink.href = `/student-details.html?id=${created.id}`;
            successModal.classList.add('active');
          } else {
            setTimeout(() => {
              window.location.href = `/student-details.html?id=${created.id}`;
            }, 600);
          }

          form.reset();
          // Reset defaults
          document.getElementById('reg-interested').checked = true;
          document.getElementById('reg-consent').checked = true;

        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = origBtnText;
        }
      });
    }
  });
}

// Student Details Page Initialization
async function initStudentDetailsPage() {
  const user = await requireAuth();
  if (!user) return;

  initNavigation();

  const urlParams = new URLSearchParams(window.location.search);
  const studentId = urlParams.get('id');

  if (!studentId) {
    showToast('Invalid student ID', 'error');
    setTimeout(() => window.location.href = '/students.html', 1000);
    return;
  }

  loadStudentDetails(studentId);
}

async function loadStudentDetails(studentId) {
  try {
    const data = await apiRequest(`/api/students/${studentId}`);
    const s = data.student;
    const attStats = data.attendance_stats;
    const followups = data.followups;

    // Header info
    document.getElementById('student-profile-name').textContent = s.name;
    document.getElementById('student-profile-regno').textContent = s.registration_number;
    document.getElementById('student-status-badge').innerHTML = getStatusBadge(s.status);

    // Profile Fields
    document.getElementById('detail-room').textContent = s.room_number;
    document.getElementById('detail-hostel').textContent = s.hostel_name;
    document.getElementById('detail-branch').textContent = s.branch;

    const phoneContainer = document.getElementById('detail-phone-wrap');
    if (phoneContainer) {
      phoneContainer.innerHTML = `${getTelLink(s.phone_number)} &nbsp; 
        <a href="${getWhatsAppLink(s.phone_number, s.name)}" target="_blank" rel="noopener" class="btn btn-sm btn-outline" style="color:#16a34a;border-color:#86efac;">
          <i class="fab fa-whatsapp"></i> WhatsApp
        </a>`;
    }

    document.getElementById('detail-consent').innerHTML = s.consent_to_contact
      ? '<span class="badge badge-regular"><i class="fas fa-check-circle"></i> Yes, Consented</span>'
      : '<span class="badge badge-absent"><i class="fas fa-times-circle"></i> No Consent</span>';

    document.getElementById('detail-interested').innerHTML = s.interested
      ? '<span class="badge badge-interested"><i class="fas fa-thumbs-up"></i> Interested</span>'
      : '<span class="badge badge-inactive">Not Interested</span>';

    document.getElementById('detail-registered-by').textContent = s.registered_by_name || 'Volunteer';
    document.getElementById('detail-registered-at').textContent = new Date(s.created_at).toLocaleDateString();

    // Attendance stats
    document.getElementById('stat-attended-count').textContent = attStats.sessions_attended;
    document.getElementById('stat-sessions-count').textContent = attStats.total_sessions_held;
    document.getElementById('stat-attendance-rate').textContent = `${attStats.attendance_rate}%`;
    document.getElementById('attendance-progress-bar').style.width = `${attStats.attendance_rate}%`;

    // Attendance History Table
    const attBody = document.getElementById('student-attendance-table-body');
    if (attBody) {
      if (!attStats.records || attStats.records.length === 0) {
        attBody.innerHTML = `<tr><td colspan="4" class="text-center" style="padding:20px;color:var(--text-muted);">No attendance marked yet</td></tr>`;
      } else {
        attBody.innerHTML = attStats.records.map(r => `
          <tr>
            <td data-label="Session">Session #${r.session_id}</td>
            <td data-label="Status">
              ${r.attendance_status === 'present' 
                ? '<span class="badge badge-present"><i class="fas fa-check"></i> Present</span>' 
                : '<span class="badge badge-absent"><i class="fas fa-times"></i> Absent</span>'}
            </td>
            <td data-label="Marked By">${escapeHtml(r.marked_by_name || 'Volunteer')}</td>
            <td data-label="Date">${new Date(r.marked_at).toLocaleDateString()}</td>
          </tr>
        `).join('');
      }
    }

    // Followup History List
    const fuContainer = document.getElementById('student-followup-timeline');
    if (fuContainer) {
      if (!followups || followups.length === 0) {
        fuContainer.innerHTML = `
          <div class="empty-state" style="padding:24px;">
            <i class="fas fa-comment-slash empty-icon" style="width:40px;height:40px;font-size:1.2rem;"></i>
            <p class="empty-desc">No follow-up logged yet for this student.</p>
          </div>
        `;
      } else {
        fuContainer.innerHTML = followups.map(f => `
          <div style="background:var(--bg-subtle);border-radius:var(--radius-md);padding:14px;margin-bottom:10px;border-left:4px solid var(--primary-light);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:6px;">
              <span class="badge badge-interested">${escapeHtml(f.contact_status)}</span>
              <small style="color:var(--text-muted);">${new Date(f.contact_date).toLocaleDateString()} by ${escapeHtml(f.created_by_name || 'Volunteer')}</small>
            </div>
            <p style="font-size:0.9rem;margin-bottom:6px;">${escapeHtml(f.notes)}</p>
            ${f.next_followup_date ? `<small style="color:var(--primary);font-weight:600;"><i class="fas fa-calendar-alt"></i> Next: ${escapeHtml(f.next_followup_date)}</small>` : ''}
          </div>
        `).join('');
      }
    }

    // Bind edit button
    const editBtn = document.getElementById('btn-open-edit-student');
    if (editBtn) {
      editBtn.onclick = () => openEditStudentModal(s.id);
    }

    // Bind delete button
    const delBtn = document.getElementById('btn-delete-student-profile');
    if (delBtn) {
      delBtn.onclick = () => confirmDeleteStudent(s.id, s.name, true);
    }

    // Bind new follow-up button on profile
    const addFuBtn = document.getElementById('btn-add-student-followup');
    if (addFuBtn) {
      addFuBtn.onclick = () => openAddFollowupModal(s.id, s.name);
    }

  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Edit Student Modal
async function openEditStudentModal(studentId) {
  try {
    const data = await apiRequest(`/api/students/${studentId}`);
    const s = data.student;

    const modal = document.getElementById('edit-student-modal');
    if (!modal) return;

    document.getElementById('edit-student-id').value = s.id;
    document.getElementById('edit-name').value = s.name;
    document.getElementById('edit-regno').value = s.registration_number;
    document.getElementById('edit-room').value = s.room_number;
    document.getElementById('edit-branch').value = s.branch;
    document.getElementById('edit-phone').value = s.phone_number;
    document.getElementById('edit-hostel').value = s.hostel_name;
    document.getElementById('edit-status').value = s.status;
    document.getElementById('edit-interested').checked = s.interested;
    document.getElementById('edit-consent').checked = s.consent_to_contact;

    modal.classList.add('active');

    const form = document.getElementById('form-edit-student');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const updatedData = {
        name: document.getElementById('edit-name').value.trim(),
        registration_number: document.getElementById('edit-regno').value.trim().toUpperCase(),
        room_number: document.getElementById('edit-room').value.trim(),
        branch: document.getElementById('edit-branch').value.trim(),
        phone_number: document.getElementById('edit-phone').value.trim(),
        hostel_name: document.getElementById('edit-hostel').value.trim(),
        status: document.getElementById('edit-status').value,
        interested: document.getElementById('edit-interested').checked,
        consent_to_contact: document.getElementById('edit-consent').checked
      };

      try {
        await apiRequest(`/api/students/${s.id}`, {
          method: 'PUT',
          body: JSON.stringify(updatedData)
        });
        showToast('Student profile updated successfully!', 'success');
        modal.classList.remove('active');

        // Reload appropriate view
        if (window.location.pathname.includes('student-details.html')) {
          loadStudentDetails(s.id);
        } else {
          loadStudents();
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    };

  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

// Delete Student confirmation
function confirmDeleteStudent(studentId, studentName, redirectAfter = false) {
  const modal = document.getElementById('delete-student-modal');
  const nameEl = document.getElementById('delete-student-name-confirm');
  const confirmBtn = document.getElementById('btn-confirm-delete-student');

  if (modal && confirmBtn) {
    if (nameEl) nameEl.textContent = studentName;
    modal.classList.add('active');

    confirmBtn.onclick = async () => {
      confirmBtn.disabled = true;
      try {
        await apiRequest(`/api/students/${studentId}`, { method: 'DELETE' });
        showToast(`Student "${studentName}" deleted successfully`, 'success');
        modal.classList.remove('active');

        if (redirectAfter) {
          window.location.href = '/students.html';
        } else {
          loadStudents();
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        confirmBtn.disabled = false;
      }
    };
  }
}
