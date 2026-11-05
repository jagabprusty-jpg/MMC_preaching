/**
 * Dashboard Logic & Chart.js Visualizations
 */

let weeklyChart = null;
let monthlyChart = null;

async function initDashboard() {
  const user = await requireAuth();
  if (!user) return;

  initNavigation();
  loadDashboardData();
}

async function loadDashboardData() {
  try {
    // 1. Fetch Stats from backend API
    const stats = await apiRequest('/api/dashboard/stats');
    renderStats(stats);

    // 2. Fetch Attendance Trends (Charts)
    const trends = await apiRequest('/api/dashboard/attendance-trends');
    renderCharts(trends);

    // 3. Fetch Recent Students
    const recentStudents = await apiRequest('/api/dashboard/recent-students?limit=5');
    renderRecentStudents(recentStudents);

    // 4. Fetch Upcoming Sessions
    const upcomingSessions = await apiRequest('/api/dashboard/upcoming-sessions?limit=4');
    renderUpcomingSessions(upcomingSessions);

  } catch (err) {
    showToast(`Error loading dashboard: ${err.message}`, 'error');
  }
}

function renderStats(stats) {
  // 1. Total Students
  const totalStudentsEl = document.getElementById('stat-total-students');
  if (totalStudentsEl) totalStudentsEl.textContent = stats.total_students;

  // 2. Today's Attendance
  const todayAttEl = document.getElementById('stat-today-attendance');
  const todayObj = stats.todays_attendance || {};
  if (todayAttEl) todayAttEl.textContent = todayObj.present || 0;

  const todaySubtextEl = document.getElementById('stat-today-subtext');
  if (todaySubtextEl) {
    if (todayObj.sessions_count > 0) {
      todaySubtextEl.textContent = `${todayObj.present} Present, ${todayObj.absent} Absent across ${todayObj.sessions_count} session(s) today`;
    } else {
      todaySubtextEl.textContent = 'No sessions held today';
    }
  }

  // Today banner stats
  const bannerPresentEl = document.getElementById('today-banner-present');
  const bannerAbsentEl = document.getElementById('today-banner-absent');
  const bannerTotalEl = document.getElementById('today-banner-total');
  const bannerBarEl = document.getElementById('today-banner-bar');

  const totalMarkedToday = (todayObj.present || 0) + (todayObj.absent || 0);
  if (bannerPresentEl) bannerPresentEl.textContent = todayObj.present || 0;
  if (bannerAbsentEl) bannerAbsentEl.textContent = todayObj.absent || 0;
  if (bannerTotalEl) bannerTotalEl.textContent = totalMarkedToday;
  if (bannerBarEl) {
    const pct = totalMarkedToday > 0 ? ((todayObj.present || 0) / totalMarkedToday * 100) : 0;
    bannerBarEl.style.width = `${pct}%`;
  }

  // 3. Regular Students
  const regularStudentsEl = document.getElementById('stat-regular-students');
  if (regularStudentsEl) regularStudentsEl.textContent = stats.regular_students;

  // 4. Inactive Students
  const inactiveStudentsEl = document.getElementById('stat-inactive-students');
  if (inactiveStudentsEl) inactiveStudentsEl.textContent = stats.inactive_students;

  // 5. Pending Follow-ups
  const pendingFollowupsEl = document.getElementById('stat-pending-followups');
  if (pendingFollowupsEl) pendingFollowupsEl.textContent = stats.pending_followups;

  // Urgent follow-up banner
  const alertBanner = document.getElementById('followup-alert-banner');
  const alertCount = document.getElementById('followup-alert-count');
  if (alertBanner && alertCount) {
    if (stats.pending_followups > 0) {
      alertCount.textContent = `${stats.pending_followups} student${stats.pending_followups > 1 ? 's' : ''}`;
      alertBanner.style.display = 'flex';
    } else {
      alertBanner.style.display = 'none';
    }
  }

  // 6. Total Sessions
  const totalSessionsEl = document.getElementById('stat-total-sessions');
  if (totalSessionsEl) totalSessionsEl.textContent = stats.total_sessions;
}

function renderCharts(trends) {
  // Weekly Attendance Chart
  const weeklyCtx = document.getElementById('weeklyAttendanceChart');
  if (weeklyCtx && trends.weekly_attendance) {
    if (weeklyChart) weeklyChart.destroy();

    const wData = trends.weekly_attendance;
    weeklyChart = new Chart(weeklyCtx, {
      type: 'bar',
      data: {
        labels: wData.labels && wData.labels.length > 0 ? wData.labels : ['No sessions recorded'],
        datasets: [
          {
            label: 'Present',
            data: wData.present && wData.present.length > 0 ? wData.present : [0],
            backgroundColor: '#2d6a4f',
            borderRadius: 6,
          },
          {
            label: 'Absent',
            data: wData.absent && wData.absent.length > 0 ? wData.absent : [0],
            backgroundColor: '#fee2e2',
            borderColor: '#f87171',
            borderWidth: 1,
            borderRadius: 6,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 12, font: { family: 'inherit', size: 12 } }
          },
          tooltip: {
            padding: 10,
            cornerRadius: 8
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 } }
          },
          y: {
            beginAtZero: true,
            ticks: { stepSize: 2, font: { size: 11 } },
            grid: { color: '#f1f5f9' }
          }
        }
      }
    });
  }

  // Monthly Registrations Chart
  const monthlyCtx = document.getElementById('monthlyRegistrationsChart');
  if (monthlyCtx && trends.monthly_registrations) {
    if (monthlyChart) monthlyChart.destroy();

    const mData = trends.monthly_registrations;
    monthlyChart = new Chart(monthlyCtx, {
      type: 'line',
      data: {
        labels: mData.labels || [],
        datasets: [{
          label: 'New Registrations',
          data: mData.data || [],
          borderColor: '#1b4332',
          backgroundColor: 'rgba(45, 106, 79, 0.1)',
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: '#1b4332',
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { padding: 10, cornerRadius: 8 }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 } }
          },
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, font: { size: 11 } },
            grid: { color: '#f1f5f9' }
          }
        }
      }
    });
  }
}

function renderRecentStudents(students) {
  const container = document.getElementById('recent-students-list');
  if (!container) return;

  if (!students || students.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:24px;">
        <i class="fas fa-user-slash empty-icon" style="width:40px;height:40px;font-size:1.2rem;"></i>
        <p class="empty-desc">No students registered yet.</p>
        <a href="/register-student.html" class="btn btn-primary btn-sm">Register First Student</a>
      </div>
    `;
    return;
  }

  container.innerHTML = students.map(s => `
    <div class="mini-item-card">
      <div class="mini-item-info">
        <a href="/student-details.html?id=${s.id}" class="mini-item-name">${escapeHtml(s.name)}</a>
        <div class="mini-item-meta">
          <span><i class="fas fa-id-badge"></i> ${escapeHtml(s.registration_number)}</span>
          <span><i class="fas fa-building"></i> ${escapeHtml(s.room_number)}</span>
          ${getStatusBadge(s.status)}
        </div>
      </div>
      <div class="mini-item-actions">
        <a href="tel:${escapeHtml(s.phone_number)}" class="btn btn-secondary btn-icon btn-sm" title="Call">
          <i class="fas fa-phone"></i>
        </a>
        <a href="/student-details.html?id=${s.id}" class="btn btn-secondary btn-icon btn-sm" title="View Profile">
          <i class="fas fa-chevron-right"></i>
        </a>
      </div>
    </div>
  `).join('');
}

function renderUpcomingSessions(sessions) {
  const container = document.getElementById('upcoming-sessions-list');
  if (!container) return;

  if (!sessions || sessions.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:24px;">
        <i class="fas fa-calendar-times empty-icon" style="width:40px;height:40px;font-size:1.2rem;"></i>
        <p class="empty-desc">No scheduled sessions found.</p>
        <a href="/sessions.html" class="btn btn-primary btn-sm">Create Session</a>
      </div>
    `;
    return;
  }

  container.innerHTML = sessions.map(sess => `
    <div class="mini-item-card">
      <div class="mini-item-info">
        <div class="mini-item-name">${escapeHtml(sess.session_name)}</div>
        <div class="mini-item-meta">
          <span><i class="fas fa-calendar"></i> ${escapeHtml(sess.session_date)} at ${escapeHtml(sess.start_time)}</span>
          <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(sess.location)}</span>
        </div>
      </div>
      <div class="mini-item-actions">
        <a href="/attendance.html?session_id=${sess.id}" class="btn btn-outline btn-sm" title="Mark Attendance">
          <i class="fas fa-clipboard-check"></i> Attendance
        </a>
      </div>
    </div>
  `).join('');
}
