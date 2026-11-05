/**
 * Student Outreach & Mantra Meditation Management System
 * Core API Client & Shared UI Utilities
 */

const API_BASE = window.location.origin.includes(':3000') 
  ? 'http://localhost:8000' 
  : window.location.origin;

/**
 * Token management
 */
function getToken() {
  return localStorage.getItem('outreach_token') || sessionStorage.getItem('outreach_token');
}

function setToken(token, remember = true) {
  if (remember) {
    localStorage.setItem('outreach_token', token);
  } else {
    sessionStorage.setItem('outreach_token', token);
  }
}

function clearAuth() {
  localStorage.removeItem('outreach_token');
  sessionStorage.removeItem('outreach_token');
  localStorage.removeItem('outreach_user');
  sessionStorage.removeItem('outreach_user');
}

function getStoredUser() {
  const u = localStorage.getItem('outreach_user') || sessionStorage.getItem('outreach_user');
  try {
    return u ? JSON.parse(u) : null;
  } catch (e) {
    return null;
  }
}

function setStoredUser(user, remember = true) {
  const str = JSON.stringify(user);
  if (remember) {
    localStorage.setItem('outreach_user', str);
  } else {
    sessionStorage.setItem('outreach_user', str);
  }
}

/**
 * Universal API Request Wrapper with automatic Bearer token injection
 */
async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If passing FormData or non-JSON body, don't force application/json
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    // Handle 401 Unauthorized -> redirect to login
    if (response.status === 401) {
      if (!window.location.pathname.includes('login.html')) {
        clearAuth();
        window.location.href = `/login.html?session_expired=1&redirect=${encodeURIComponent(window.location.pathname)}`;
      }
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Authentication required');
    }

    // For file downloads (like CSV)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/csv')) {
      return response.blob();
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = data.detail || `Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (err) {
    console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, err);
    throw err;
  }
}

/**
 * Toast Notification System
 */
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'info-circle';
  if (type === 'success') icon = 'check-circle';
  if (type === 'error') icon = 'exclamation-circle';

  toast.innerHTML = `
    <i class="fas fa-${icon}"></i>
    <span style="flex:1;">${escapeHtml(message)}</span>
    <button style="background:none;border:none;color:var(--text-dim);cursor:pointer;font-size:1rem;" onclick="this.parentElement.remove()">
      <i class="fas fa-times"></i>
    </button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * HTML Escaping for safe rendering
 */
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Helper: Format status badge
 */
function getStatusBadge(status) {
  const s = (status || 'new').toLowerCase();
  let badgeClass = 'badge-new';
  if (s === 'regular') badgeClass = 'badge-regular';
  if (s === 'interested') badgeClass = 'badge-interested';
  if (s === 'inactive') badgeClass = 'badge-inactive';

  return `<span class="badge ${badgeClass}"><i class="fas fa-circle" style="font-size:0.5rem;"></i> ${s}</span>`;
}

/**
 * Helper: Phone tel link
 */
function getTelLink(phone) {
  if (!phone) return '-';
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  return `<a href="tel:${cleanPhone}" class="touch-target" title="Call student" style="color:var(--primary);display:inline-flex;align-items:center;gap:6px;">
    <i class="fas fa-phone-alt" style="font-size:0.8rem;"></i> ${escapeHtml(phone)}
  </a>`;
}

/**
 * Helper: WhatsApp direct link
 */
function getWhatsAppLink(phone, studentName = '') {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  const greeting = encodeURIComponent(`Hare Krishna ${studentName ? studentName : ''}! Hope you are having a peaceful day. Regarding the upcoming Mantra Meditation session on campus...`);
  return `https://wa.me/${digits}?text=${greeting}`;
}

/**
 * Initialize Mobile Navigation and Drawer
 */
function initNavigation() {
  const menuBtn = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('drawer-backdrop');

  if (menuBtn && sidebar && backdrop) {
    const toggleMenu = () => {
      sidebar.classList.toggle('open');
      backdrop.classList.toggle('active');
    };

    menuBtn.addEventListener('click', toggleMenu);
    backdrop.addEventListener('click', toggleMenu);
  }

  // Active link detection based on current page
  const currentPath = window.location.pathname;
  const pageName = currentPath.split('/').pop() || 'dashboard.html';

  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href && (href === pageName || (pageName === '' && href === 'dashboard.html') || (pageName === 'index.html' && href === 'dashboard.html'))) {
      link.classList.add('active');
    }
  });

  document.querySelectorAll('.bottom-nav-item').forEach(link => {
    const href = link.getAttribute('href');
    if (href && href === pageName) {
      link.classList.add('active');
    }
  });

  // Populate user badge in header if element exists
  const user = getStoredUser();
  const userNameEl = document.getElementById('header-user-name');
  const userAvatarEl = document.getElementById('header-user-avatar');
  const userRoleEl = document.getElementById('header-user-role');

  if (user) {
    if (userNameEl) userNameEl.textContent = user.full_name || user.username;
    if (userAvatarEl) userAvatarEl.textContent = (user.full_name || user.username).charAt(0).toUpperCase();
    if (userRoleEl) {
      userRoleEl.textContent = user.role;
      userRoleEl.className = `user-role-pill ${user.role}`;
    }
  }

  // Bind logout button
  const logoutBtns = document.querySelectorAll('.btn-logout-action');
  logoutBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await apiRequest('/api/auth/logout', { method: 'POST' });
      } catch (err) {
        // Ignore logout errors
      } finally {
        clearAuth();
        window.location.href = '/login.html';
      }
    });
  });
}

// Register service worker if available
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('PWA service worker registration skipped/failed:', err);
    });
  });
}
