/**
 * Authentication & User Session Management
 */

// Guard: Require authentication on protected pages
async function requireAuth() {
  const token = getToken();
  if (!token) {
    clearAuth();
    window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
    return null;
  }

  try {
    const user = await apiRequest('/api/auth/me');
    setStoredUser(user);
    return user;
  } catch (err) {
    clearAuth();
    window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
    return null;
  }
}

// Redirect away from login if already authenticated
async function redirectIfAuthenticated() {
  const token = getToken();
  if (token) {
    try {
      await apiRequest('/api/auth/me');
      window.location.href = '/dashboard.html';
    } catch (e) {
      clearAuth();
    }
  }
}

// Initialize Login Page
function initLoginPage() {
  const loginForm = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');
  const btnSubmit = document.getElementById('btn-login-submit');

  // Fill demo credentials helpers
  const btnAdminDemo = document.getElementById('btn-demo-admin');
  const btnVolDemo = document.getElementById('btn-demo-volunteer');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');

  if (btnAdminDemo) {
    btnAdminDemo.addEventListener('click', () => {
      usernameInput.value = 'admin';
      passwordInput.value = 'admin123';
      if (errorEl) errorEl.style.display = 'none';
    });
  }

  if (btnVolDemo) {
    btnVolDemo.addEventListener('click', () => {
      usernameInput.value = 'volunteer';
      passwordInput.value = 'volunteer123';
      if (errorEl) errorEl.style.display = 'none';
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (errorEl) errorEl.style.display = 'none';

      const username = usernameInput.value.trim();
      const password = passwordInput.value;
      const remember = document.getElementById('remember-me')?.checked ?? true;

      if (!username || !password) {
        if (errorEl) {
          errorEl.textContent = 'Please enter both username and password';
          errorEl.style.display = 'block';
        }
        return;
      }

      const origBtnHtml = btnSubmit.innerHTML;
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = `<span class="loading-spinner" style="width:18px;height:18px;border-width:2px;"></span> Signing in...`;

      try {
        const response = await apiRequest('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username, password })
        });

        setToken(response.access_token, remember);
        setStoredUser(response.user, remember);

        showToast(`Welcome back, ${response.user.full_name}!`, 'success');

        // Check redirect parameter in URL
        const params = new URLSearchParams(window.location.search);
        const redirectUrl = params.get('redirect') || '/dashboard.html';
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 400);

      } catch (err) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = origBtnHtml;
        if (errorEl) {
          errorEl.textContent = err.message || 'Invalid username or password';
          errorEl.style.display = 'block';
        }
      }
    });
  }
}

// Initialize Settings Page (Change Password + Volunteer Management)
async function initSettingsPage() {
  const user = await requireAuth();
  if (!user) return;

  initNavigation();

  // Populate profile info
  const profileName = document.getElementById('settings-profile-name');
  const profileUsername = document.getElementById('settings-profile-username');
  const profileEmail = document.getElementById('settings-profile-email');
  const profileRole = document.getElementById('settings-profile-role');

  if (profileName) profileName.textContent = user.full_name;
  if (profileUsername) profileUsername.textContent = user.username;
  if (profileEmail) profileEmail.textContent = user.email || 'None';
  if (profileRole) {
    profileRole.textContent = user.role;
    profileRole.className = `user-role-pill ${user.role}`;
  }

  // Bind change password form
  const pwdForm = document.getElementById('form-change-password');
  if (pwdForm) {
    pwdForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const current_password = document.getElementById('current-password').value;
      const new_password = document.getElementById('new-password').value;
      const confirm_password = document.getElementById('confirm-password').value;

      if (new_password !== confirm_password) {
        showToast('New passwords do not match', 'error');
        return;
      }

      if (new_password.length < 6) {
        showToast('New password must be at least 6 characters long', 'error');
        return;
      }

      try {
        await apiRequest('/api/auth/change-password', {
          method: 'POST',
          body: JSON.stringify({ current_password, new_password })
        });
        showToast('Password changed successfully!', 'success');
        pwdForm.reset();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // If Admin: show Volunteer Management section
  const adminSection = document.getElementById('admin-volunteer-section');
  if (user.role === 'admin' && adminSection) {
    adminSection.style.display = 'block';
    loadVolunteers();

    // Bind Add Volunteer form
    const createVolForm = document.getElementById('form-create-volunteer');
    if (createVolForm) {
      createVolForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const full_name = document.getElementById('vol-full-name').value.trim();
        const username = document.getElementById('vol-username').value.trim();
        const email = document.getElementById('vol-email').value.trim();
        const password = document.getElementById('vol-password').value;
        const role = document.getElementById('vol-role').value;

        try {
          await apiRequest('/api/auth/users', {
            method: 'POST',
            body: JSON.stringify({ full_name, username, email: email || null, password, role })
          });
          showToast(`User ${full_name} created successfully!`, 'success');
          createVolForm.reset();
          loadVolunteers();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }
  }
}

// Load volunteers list (Admin only)
async function loadVolunteers() {
  const tableBody = document.getElementById('volunteers-table-body');
  if (!tableBody) return;

  try {
    const users = await apiRequest('/api/auth/users');
    if (!users || users.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:20px;">No volunteers registered yet</td></tr>`;
      return;
    }

    tableBody.innerHTML = users.map(u => `
      <tr>
        <td data-label="Name"><strong>${escapeHtml(u.full_name)}</strong></td>
        <td data-label="Username">@${escapeHtml(u.username)}</td>
        <td data-label="Email">${escapeHtml(u.email || '-')}</td>
        <td data-label="Role"><span class="user-role-pill ${u.role}">${escapeHtml(u.role)}</span></td>
        <td data-label="Status">
          ${u.is_active 
            ? '<span class="badge badge-regular">Active</span>' 
            : '<span class="badge badge-inactive">Deactivated</span>'}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center" style="color:var(--danger);padding:14px;">Failed to load users: ${escapeHtml(err.message)}</td></tr>`;
  }
}
