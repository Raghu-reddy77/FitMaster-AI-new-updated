/**
 * FitMaster AI – Authentication Management
 * Handles login, registration, token persistence, logout, and page auth guards.
 */

function isAuthenticated() {
  return Boolean(localStorage.getItem('fitmaster_token'));
}

function getCurrentUser() {
  const userStr = localStorage.getItem('fitmaster_user');
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

function logout() {
  api.post('/auth/logout', {}).catch(() => {});
  localStorage.removeItem('fitmaster_token');
  localStorage.removeItem('fitmaster_user');
  window.location.href = 'login.html';
}

// Route Guard Check
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;

  // Public pages: login, register, and root (which now serves login)
  const isAuthPage = path.includes('login.html') ||
                     path.includes('register.html') ||
                     path === '/' ||
                     path === '/index.html' ||
                     path.endsWith('/frontend/') ||
                     path.endsWith('/frontend/login.html') ||
                     path.endsWith('/frontend/register.html');

  if (isAuthenticated()) {
    // Already logged in — redirect away from auth pages to dashboard
    if (path.includes('login.html') || path.includes('register.html') || path === '/') {
      window.location.href = 'dashboard.html';
    }
  } else {
    // Not logged in — block all app pages, redirect to login
    if (!isAuthPage) {
      window.location.href = 'login.html';
    }
  }

  // Populate user identity in sidebar if present
  const user = getCurrentUser();
  if (user) {
    const nameEl = document.getElementById('sidebar-user-name');
    const emailEl = document.getElementById('sidebar-user-email');
    const avatarEl = document.getElementById('sidebar-user-avatar');

    if (nameEl) nameEl.textContent = user.name;
    if (emailEl) emailEl.textContent = user.email;
    if (avatarEl) {
      const initials = user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      avatarEl.textContent = initials || 'FM';
    }
  }

  // Attach login form handler
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const errorBanner = document.getElementById('auth-error-banner');
      const submitBtn = document.getElementById('login-submit-btn');

      if (!email || !password) {
        showAuthError('Please enter both email and password.');
        return;
      }

      setLoading(submitBtn, true, 'Signing In...');
      hideAuthError();

      try {
        const response = await api.post('/auth/login', { email, password });
        localStorage.setItem('fitmaster_token', response.data.token);
        localStorage.setItem('fitmaster_user', JSON.stringify(response.data.user));

        showToast('Login Successful', `Welcome back, ${response.data.user.name}!`, 'success');

        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 600);
      } catch (err) {
        showAuthError(err.message || 'Login failed. Please check your credentials.');
        setLoading(submitBtn, false, 'Sign In');
      }
    });
  }

  // Attach registration form handler
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('register-name').value.trim();
      const email = document.getElementById('register-email').value.trim();
      const password = document.getElementById('register-password').value;
      const confirmPassword = document.getElementById('register-confirm-password').value;
      const submitBtn = document.getElementById('register-submit-btn');

      if (!name || !email || !password) {
        showAuthError('Please complete all required fields.');
        return;
      }

      if (password.length < 6) {
        showAuthError('Password must be at least 6 characters long.');
        return;
      }

      if (password !== confirmPassword) {
        showAuthError('Passwords do not match.');
        return;
      }

      setLoading(submitBtn, true, 'Creating Account...');
      hideAuthError();

      try {
        const response = await api.post('/auth/register', { name, email, password });
        localStorage.setItem('fitmaster_token', response.data.token);
        localStorage.setItem('fitmaster_user', JSON.stringify(response.data.user));

        showToast('Account Created', 'Registration successful! Set up your profile next.', 'success');

        setTimeout(() => {
          window.location.href = 'profile.html';
        }, 800);
      } catch (err) {
        showAuthError(err.message || 'Registration failed.');
        setLoading(submitBtn, false, 'Create Free Account');
      }
    });
  }
});

function showAuthError(msg) {
  const banner = document.getElementById('auth-error-banner');
  if (banner) {
    banner.textContent = msg;
    banner.style.display = 'block';
  } else {
    showToast('Authentication Error', msg, 'error');
  }
}

function hideAuthError() {
  const banner = document.getElementById('auth-error-banner');
  if (banner) banner.style.display = 'none';
}

function setLoading(btn, isLoading, text) {
  if (!btn) return;
  btn.disabled = isLoading;
  btn.innerHTML = isLoading ? `<span class="spinner"></span> ${text}` : text;
}

window.logout = logout;
window.getCurrentUser = getCurrentUser;
