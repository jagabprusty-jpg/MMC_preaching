/**
 * Attendance Management Logic
 * Session-based bulk & individual marking with instant metrics
 */

let allStudents = [];
let filteredStudents = [];
let currentSessionId = null;
let currentAttendanceMap = {}; // student_id -> 'present' | 'absent'

async function initAttendancePage() {
  const user = await requireAuth();
  if (!user) return;

  initNavigation();

  // Show loading indicator in table
  const tableBody = document.getElementById('attendance-table-body');
  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center" style="padding:40px;">
          <span class="loading-spinner"></span>
          <p style="margin-top:10px;color:var(--text-muted);">Loading students and sessions...</p>
        </td>
      </tr>
    `;
  }

  // Load students and sessions in parallel
  await Promise.all([
    loadAllStudents(),
    loadSessionsDropdown()
  ]);

  bindAttendanceControls();

  // Handle session selection (query param or auto-select first available session)
  const urlParams = new URLSearchParams(window.location.search);
  const qSessionId = urlParams.get('session_id');
  const sessionSelect = document.getElementById('attendance-session-select');

  if (qSessionId && sessionSelect) {
    sessionSelect.value = qSessionId;
    await onSessionSelected(parseInt(qSessionId));
  } else if (sessionSelect && sessionSelect.options.length > 1) {
    // Auto-select first available session so students are ready to be marked immediately
    sessionSelect.selectedIndex = 1;
    await onSessionSelected(parseInt(sessionSelect.value));
  } else {
    // Render students even if no session created yet
    renderAttendanceTable();
  }
}

// Load all students for the session attendance sheet
async function loadAllStudents() {
  try {
    const data = await apiRequest('/api/students?limit=500');
    allStudents = data.items || [];
    filteredStudents = [...allStudents];

    // Populate hostel filter dropdown dynamically
    populateHostelFilter(allStudents);
  } catch (err) {
    console.error('Failed to load students:', err);
    showToast(`Failed to load students: ${err.message}`, 'error');
  }
}

// Dynamically populate hostel filter options from student records
function populateHostelFilter(students) {
  const filterHostel = document.getElementById('attendance-filter-hostel');
  if (!filterHostel) return;

  const currentVal = filterHostel.value;
  const uniqueHostels = Array.from(new Set(students.map(s => s.hostel_name).filter(Boolean))).sort();

  filterHostel.innerHTML = '<option value="all">All Hostels</option>';
  uniqueHostels.forEach(h => {
    const opt = document.createElement('option');
    opt.value = h;
    opt.textContent = h;
    filterHostel.appendChild(opt);
  });

  if (uniqueHostels.includes(currentVal)) {
    filterHostel.value = currentVal;
  }
}

// Load sessions into the dropdown
async function loadSessionsDropdown() {
  const selectEl = document.getElementById('attendance-session-select');
  if (!selectEl) return;

  try {
    const data = await apiRequest('/api/sessions');
    selectEl.innerHTML = `<option value="">-- Choose a Meditation Session --</option>`;

    if (!data.items || data.items.length === 0) {
      selectEl.innerHTML += `<option value="" disabled>No sessions found. Please create one first.</option>`;
      return;
    }

    data.items.forEach(sess => {
      const opt = document.createElement('option');
      opt.value = sess.id;
      opt.textContent = `${sess.session_name} - ${sess.session_date} (${sess.start_time}) @ ${sess.location}`;
      selectEl.appendChild(opt);
    });

    selectEl.addEventListener('change', async (e) => {
      const sessId = parseInt(e.target.value);
      if (sessId) {
        await onSessionSelected(sessId);
      } else {
        currentSessionId = null;
        document.getElementById('session-info-card').style.display = 'none';
        renderAttendanceTable();
        updateAttendanceCounters();
      }
    });

  } catch (err) {
    console.error('Failed to load sessions:', err);
    showToast(`Failed to load sessions: ${err.message}`, 'error');
  }
}

// When a session is selected, fetch existing marked attendance
async function onSessionSelected(sessionId) {
  currentSessionId = sessionId;
  currentAttendanceMap = {};

  const summaryCard = document.getElementById('session-info-card');
  const detailsTitle = document.getElementById('selected-session-title');
  const detailsMeta = document.getElementById('selected-session-meta');

  try {
    // 1. Fetch session detail
    const sess = await apiRequest(`/api/sessions/${sessionId}`);
    if (summaryCard) summaryCard.style.display = 'block';
    if (detailsTitle) detailsTitle.textContent = sess.session_name;
    if (detailsMeta) {
      detailsMeta.textContent = `Date: ${sess.session_date} | Time: ${sess.start_time} | Location: ${sess.location}`;
    }

    // 2. Fetch existing attendance records for this session
    const attData = await apiRequest(`/api/attendance/session/${sessionId}`);
    if (attData.records) {
      attData.records.forEach(r => {
        currentAttendanceMap[r.student_id] = r.attendance_status;
      });
    }

    renderAttendanceTable();
    updateAttendanceCounters();

  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

// Bind search, bulk buttons, and save button
function bindAttendanceControls() {
  const searchInput = document.getElementById('attendance-search');
  const filterHostel = document.getElementById('attendance-filter-hostel');
  const btnAllPresent = document.getElementById('btn-mark-all-present');
  const btnAllAbsent = document.getElementById('btn-mark-all-absent');
  const btnSave = document.getElementById('btn-save-attendance');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      filterAttendanceList(q, filterHostel ? filterHostel.value : 'all');
    });
  }

  if (filterHostel) {
    filterHostel.addEventListener('change', (e) => {
      const h = e.target.value;
      const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
      filterAttendanceList(q, h);
    });
  }

  // Bulk actions
  if (btnAllPresent) {
    btnAllPresent.addEventListener('click', () => {
      if (!currentSessionId) {
        showToast('Please select a session from the dropdown first', 'error');
        return;
      }
      filteredStudents.forEach(st => {
        currentAttendanceMap[st.id] = 'present';
      });
      renderAttendanceTable();
      updateAttendanceCounters();
      showToast('Marked visible students as Present', 'info');
    });
  }

  if (btnAllAbsent) {
    btnAllAbsent.addEventListener('click', () => {
      if (!currentSessionId) {
        showToast('Please select a session from the dropdown first', 'error');
        return;
      }
      filteredStudents.forEach(st => {
        currentAttendanceMap[st.id] = 'absent';
      });
      renderAttendanceTable();
      updateAttendanceCounters();
      showToast('Marked visible students as Absent', 'info');
    });
  }

  // Save Attendance to Backend
  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      if (!currentSessionId) {
        showToast('Please select a session from the dropdown first', 'error');
        return;
      }

      const records = Object.keys(currentAttendanceMap).map(stId => ({
        student_id: parseInt(stId),
        attendance_status: currentAttendanceMap[stId]
      }));

      if (records.length === 0) {
        showToast('Please mark attendance for at least one student before saving', 'error');
        return;
      }

      const origBtn = btnSave.innerHTML;
      btnSave.disabled = true;
      btnSave.innerHTML = `<span class="loading-spinner" style="width:18px;height:18px;border-width:2px;"></span> Saving...`;

      try {
        const result = await apiRequest('/api/attendance', {
          method: 'POST',
          body: JSON.stringify({
            session_id: currentSessionId,
            records: records
          })
        });

        showToast(`Attendance saved! (${result.total_present} Present, ${result.total_absent} Absent)`, 'success');
        updateAttendanceCounters();

      } catch (err) {
        showToast(`Failed to save attendance: ${err.message}`, 'error');
      } finally {
        btnSave.disabled = false;
        btnSave.innerHTML = origBtn;
      }
    });
  }
}

function filterAttendanceList(query, hostel) {
  filteredStudents = allStudents.filter(st => {
    const matchesQuery = !query || 
      st.name.toLowerCase().includes(query) ||
      st.registration_number.toLowerCase().includes(query) ||
      st.room_number.toLowerCase().includes(query);

    const matchesHostel = !hostel || hostel === 'all' || st.hostel_name === hostel;
    return matchesQuery && matchesHostel;
  });

  renderAttendanceTable();
}

// Render Attendance Student List
function renderAttendanceTable() {
  const container = document.getElementById('attendance-table-body');
  if (!container) return;

  // Case 1: No students registered in the database at all
  if (allStudents.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="5" class="text-center" style="padding:40px;">
          <div class="empty-state">
            <i class="fas fa-user-plus empty-icon" style="width:50px;height:50px;font-size:1.5rem;"></i>
            <div class="empty-title">No Students Registered Yet</div>
            <p class="empty-desc">You need to register students before you can mark attendance.</p>
            <a href="/register-student.html" class="btn btn-primary btn-sm">
              <i class="fas fa-plus"></i> Register First Student
            </a>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  // Case 2: Filter/Search returned 0 matches
  if (filteredStudents.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="5" class="text-center" style="padding:40px;">
          <div class="empty-state">
            <i class="fas fa-search empty-icon" style="width:40px;height:40px;font-size:1.2rem;"></i>
            <p class="empty-desc">No students match current search or hostel filter.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  // Case 3: Students exist - Render them!
  const rows = filteredStudents.map(st => {
    const status = currentAttendanceMap[st.id] || null;
    const isPresent = status === 'present';
    const isAbsent = status === 'absent';

    return `
      <tr>
        <td data-label="Student">
          <strong>${escapeHtml(st.name)}</strong>
          <div style="font-size:0.8rem;color:var(--text-muted);">${escapeHtml(st.registration_number)}</div>
        </td>
        <td data-label="Room & Hostel">
          <div>${escapeHtml(st.room_number)}</div>
          <small style="color:var(--text-muted);">${escapeHtml(st.hostel_name)}</small>
        </td>
        <td data-label="Branch">${escapeHtml(st.branch)}</td>
        <td data-label="Overall Record">
          <span style="font-size:0.85rem;font-weight:600;color:var(--primary);">
            ${st.total_attended}/${st.total_sessions_recorded} (${st.attendance_rate}%)
          </span>
        </td>
        <td data-label="Mark Attendance">
          <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button 
              type="button" 
              class="btn btn-sm ${isPresent ? 'btn-success' : 'btn-secondary'}"
              style="min-width:85px;${isPresent ? 'font-weight:700;box-shadow:0 0 0 2px #10b981;' : ''}"
              onclick="setStudentAttendance(${st.id}, 'present')"
              ${!currentSessionId ? 'disabled title="Please select a session above first"' : ''}
            >
              <i class="fas fa-check"></i> Present
            </button>
            <button 
              type="button" 
              class="btn btn-sm ${isAbsent ? 'btn-danger' : 'btn-secondary'}"
              style="min-width:85px;${isAbsent ? 'font-weight:700;box-shadow:0 0 0 2px #ef4444;' : ''}"
              onclick="setStudentAttendance(${st.id}, 'absent')"
              ${!currentSessionId ? 'disabled title="Please select a session above first"' : ''}
            >
              <i class="fas fa-times"></i> Absent
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = rows;
}

// Single student mark toggle
function setStudentAttendance(studentId, status) {
  if (!currentSessionId) {
    showToast('Please select a session from the dropdown first', 'error');
    return;
  }

  if (currentAttendanceMap[studentId] === status) {
    delete currentAttendanceMap[studentId];
  } else {
    currentAttendanceMap[studentId] = status;
  }
  renderAttendanceTable();
  updateAttendanceCounters();
}

// Update the summary counter badges
function updateAttendanceCounters() {
  let presentCount = 0;
  let absentCount = 0;

  Object.values(currentAttendanceMap).forEach(s => {
    if (s === 'present') presentCount++;
    if (s === 'absent') absentCount++;
  });

  const totalMarked = presentCount + absentCount;
  const rate = totalMarked > 0 ? (presentCount / totalMarked * 100) : 0;

  const countPresentEl = document.getElementById('count-present');
  const countAbsentEl = document.getElementById('count-absent');
  const countTotalEl = document.getElementById('count-total-marked');
  const rateEl = document.getElementById('count-attendance-rate');

  if (countPresentEl) countPresentEl.textContent = presentCount;
  if (countAbsentEl) countAbsentEl.textContent = absentCount;
  if (countTotalEl) countTotalEl.textContent = `${totalMarked} / ${allStudents.length}`;
  if (rateEl) rateEl.textContent = `${rate.toFixed(1)}%`;
}
