/**
 * Reports & Analytics Logic
 * Chart.js visual breakdowns and CSV data exports
 */

let branchChart = null;
let hostelChart = null;
let statusChart = null;
let attendanceTrendChart = null;

async function initReportsPage() {
  const user = await requireAuth();
  if (!user) return;

  initNavigation();
  bindReportControls();
  loadReportData();
}

function bindReportControls() {
  const applyBtn = document.getElementById('btn-apply-date-filter');
  const exportStudentsBtn = document.getElementById('btn-export-students-csv');
  const exportAttendanceBtn = document.getElementById('btn-export-attendance-csv');

  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const startDate = document.getElementById('report-start-date').value;
      const endDate = document.getElementById('report-end-date').value;
      loadAttendanceAnalytics(startDate, endDate);
    });
  }

  // Export Students CSV
  if (exportStudentsBtn) {
    exportStudentsBtn.addEventListener('click', async () => {
      exportStudentsBtn.disabled = true;
      const origText = exportStudentsBtn.innerHTML;
      exportStudentsBtn.innerHTML = `<span class="loading-spinner" style="width:16px;height:16px;border-width:2px;"></span> Downloading...`;

      try {
        const blob = await apiRequest('/api/reports/export/students');
        downloadBlob(blob, `student_directory_${new Date().toISOString().slice(0,10)}.csv`);
        showToast('Student directory exported successfully!', 'success');
      } catch (err) {
        showToast(`Export failed: ${err.message}`, 'error');
      } finally {
        exportStudentsBtn.disabled = false;
        exportStudentsBtn.innerHTML = origText;
      }
    });
  }

  // Export Attendance CSV
  if (exportAttendanceBtn) {
    exportAttendanceBtn.addEventListener('click', async () => {
      exportAttendanceBtn.disabled = true;
      const origText = exportAttendanceBtn.innerHTML;
      exportAttendanceBtn.innerHTML = `<span class="loading-spinner" style="width:16px;height:16px;border-width:2px;"></span> Downloading...`;

      try {
        const blob = await apiRequest('/api/reports/export/attendance');
        downloadBlob(blob, `attendance_records_${new Date().toISOString().slice(0,10)}.csv`);
        showToast('Attendance records exported successfully!', 'success');
      } catch (err) {
        showToast(`Export failed: ${err.message}`, 'error');
      } finally {
        exportAttendanceBtn.disabled = false;
        exportAttendanceBtn.innerHTML = origText;
      }
    });
  }
}

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}

async function loadReportData() {
  try {
    // 1. Load Student Overview Metrics
    const stReport = await apiRequest('/api/reports/students');
    renderStudentOverview(stReport);

    // 2. Load Branch, Hostel, and Status Distributions
    const distData = await apiRequest('/api/reports/branch-distribution');
    renderDistributions(distData);

    // 3. Load Attendance Analytics (Initial full range)
    loadAttendanceAnalytics();

  } catch (err) {
    showToast(`Error loading reports: ${err.message}`, 'error');
  }
}

function renderStudentOverview(data) {
  const totalEl = document.getElementById('rep-total-students');
  const regularEl = document.getElementById('rep-regular-students');
  const inactiveEl = document.getElementById('rep-inactive-students');
  const consentEl = document.getElementById('rep-consent-rate');

  if (totalEl) totalEl.textContent = data.total_students;
  if (regularEl) regularEl.textContent = data.regular_students;
  if (inactiveEl) inactiveEl.textContent = data.inactive_students;
  if (consentEl) consentEl.textContent = `${data.consent_rate}%`;
}

function renderDistributions(data) {
  // 1. Branch Distribution Chart (Pie/Doughnut)
  const branchCtx = document.getElementById('branchChart');
  if (branchCtx && data.branches) {
    if (branchChart) branchChart.destroy();

    const labels = data.branches.map(b => b.branch);
    const counts = data.branches.map(b => b.count);

    branchChart = new Chart(branchCtx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: counts,
          backgroundColor: [
            '#1b4332', '#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2', '#b7e4c7'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
        }
      }
    });
  }

  // 2. Hostel Distribution Chart (Bar)
  const hostelCtx = document.getElementById('hostelChart');
  if (hostelCtx && data.hostels) {
    if (hostelChart) hostelChart.destroy();

    const labels = data.hostels.map(h => h.hostel.split('-')[0].trim());
    const counts = data.hostels.map(h => h.count);

    hostelChart = new Chart(hostelCtx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Students',
          data: counts,
          backgroundColor: '#2d6a4f',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // 3. Status Distribution Chart (Polar/Doughnut)
  const statusCtx = document.getElementById('statusChart');
  if (statusCtx && data.statuses) {
    if (statusChart) statusChart.destroy();

    const labels = data.statuses.map(s => s.status.toUpperCase());
    const counts = data.statuses.map(s => s.count);

    statusChart = new Chart(statusCtx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: counts,
          backgroundColor: ['#ca8a04', '#0284c7', '#16a34a', '#64748b']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
        }
      }
    });
  }
}

async function loadAttendanceAnalytics(startDate = '', endDate = '') {
  try {
    let url = '/api/reports/attendance';
    const params = [];
    if (startDate) params.push(`start_date=${encodeURIComponent(startDate)}`);
    if (endDate) params.push(`end_date=${encodeURIComponent(endDate)}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    const data = await apiRequest(url);

    // Summary numbers
    const summary = data.summary || {};
    const presentEl = document.getElementById('rep-total-present');
    const absentEl = document.getElementById('rep-total-absent');
    const rateEl = document.getElementById('rep-overall-rate');

    if (presentEl) presentEl.textContent = summary.total_present || 0;
    if (absentEl) absentEl.textContent = summary.total_absent || 0;
    if (rateEl) rateEl.textContent = `${summary.overall_attendance_rate || 0}%`;

    // Attendance Trend Chart (Sessions over time)
    const trendCtx = document.getElementById('attendanceTrendChart');
    if (trendCtx && data.sessions) {
      if (attendanceTrendChart) attendanceTrendChart.destroy();

      const labels = data.sessions.map(s => s.session_name.length > 20 ? s.session_name.substring(0, 20) + '...' : s.session_name);
      const rates = data.sessions.map(s => s.attendance_rate);
      const presents = data.sessions.map(s => s.present_count);

      attendanceTrendChart = new Chart(trendCtx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Turnout Rate (%)',
              data: rates,
              borderColor: '#16a34a',
              backgroundColor: 'rgba(22, 163, 74, 0.1)',
              yAxisID: 'yRate',
              fill: true,
              tension: 0.3
            },
            {
              label: 'Present Count',
              data: presents,
              borderColor: '#1b4332',
              backgroundColor: '#1b4332',
              yAxisID: 'yCount',
              type: 'bar',
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            yRate: {
              type: 'linear',
              position: 'left',
              max: 100,
              beginAtZero: true,
              title: { display: true, text: 'Turnout %' }
            },
            yCount: {
              type: 'linear',
              position: 'right',
              beginAtZero: true,
              grid: { drawOnChartArea: false },
              title: { display: true, text: 'Count' }
            }
          }
        }
      });
    }

    // Sessions attendance breakdown table
    const tableBody = document.getElementById('reports-session-table-body');
    if (tableBody) {
      if (!data.sessions || data.sessions.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:20px;">No sessions found for this range</td></tr>`;
      } else {
        tableBody.innerHTML = data.sessions.map(s => `
          <tr>
            <td data-label="Session"><strong>${escapeHtml(s.session_name)}</strong></td>
            <td data-label="Date">${escapeHtml(s.session_date)}</td>
            <td data-label="Location">${escapeHtml(s.location)}</td>
            <td data-label="Present"><span style="color:#16a34a;font-weight:700;">${s.present_count}</span></td>
            <td data-label="Absent"><span style="color:#dc2626;font-weight:700;">${s.absent_count}</span></td>
            <td data-label="Turnout Rate">
              <span class="badge ${s.attendance_rate >= 50 ? 'badge-regular' : 'badge-new'}">
                ${s.attendance_rate}%
              </span>
            </td>
          </tr>
        `).join('');
      }
    }

  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}
