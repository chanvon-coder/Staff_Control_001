/**
 * Staff System Control - Enterprise User & Role Access Control Engine
 * Strictly compliant with Web Security Standards (Session Invalidation, Cookie Purge, Token Revocation)
 */

const UserControl = {
  ROLES: {
    ADMIN: {
      id: 'ADMIN',
      titleKh: 'អ្នកគ្រប់គ្រងប្រព័ន្ធ (Admin)',
      titleEn: 'Administrator',
      canAdd: true,
      canEdit: true,
      canDelete: true,
      canSettings: true,
      canExport: true,
      canImport: true,
      canClearLogs: true,
      canSeeSystemAction: true,
      canSeeNavPage: true
    },
    OFFICER: {
      id: 'OFFICER',
      titleKh: 'មន្ត្រីបញ្ចូលទិន្នន័យ (Officer)',
      titleEn: 'Data Entry Officer',
      canAdd: true,
      canEdit: true,
      canDelete: false,
      canSettings: false,
      canExport: true,
      canImport: false,
      canClearLogs: false,
      canSeeSystemAction: false,
      canSeeNavPage: true
    },
    MANAGER: {
      id: 'MANAGER',
      titleKh: 'ប្រធានគ្រប់គ្រង (Manager)',
      titleEn: 'Management Supervisor',
      canAdd: true,
      canEdit: true,
      canDelete: true,
      canSettings: true,
      canExport: true,
      canImport: true,
      canClearLogs: true,
      canSeeSystemAction: true,
      canSeeNavPage: true
    },
    VIEWER: {
      id: 'VIEWER',
      titleKh: 'អ្នកត្រួតពិនិត្យ (Viewer)',
      titleEn: 'Read-Only Viewer',
      canAdd: false,
      canEdit: false,
      canDelete: false,
      canSettings: false,
      canExport: true,
      canImport: false,
      canClearLogs: false,
      canSeeSystemAction: false,
      canSeeNavPage: true
    },
    LOCKED: {
      id: 'LOCKED',
      titleKh: 'មិនទាន់ចូលប្រព័ន្ធ (Logged Out)',
      titleEn: 'Logged Out',
      canAdd: false,
      canEdit: false,
      canDelete: false,
      canSettings: false,
      canExport: false,
      canImport: false,
      canClearLogs: false,
      canSeeSystemAction: false,
      canSeeNavPage: false
    }
  },

  CURRENT_USER_KEY: 'STAFF_CONTROL_CURRENT_ROLE',
  CURRENT_USERNAME_KEY: 'STAFF_CONTROL_CURRENT_USERNAME',
  SESSION_TOKEN_KEY: 'STAFF_CONTROL_SESSION_TOKEN',
  SESSION_EXPIRES_KEY: 'STAFF_CONTROL_SESSION_EXPIRES',
  SESSION_MAX_INACTIVE_MS: 30 * 60 * 1000, // 30 Minutes Session Timeout

  /**
   * Check if current session is active and unexpired
   */
  isLoggedIn() {
    try {
      const role = sessionStorage.getItem(this.CURRENT_USER_KEY) || localStorage.getItem(this.CURRENT_USER_KEY);
      const token = sessionStorage.getItem(this.SESSION_TOKEN_KEY) || localStorage.getItem(this.SESSION_TOKEN_KEY);
      const expStr = sessionStorage.getItem(this.SESSION_EXPIRES_KEY) || localStorage.getItem(this.SESSION_EXPIRES_KEY);

      if (!role || role === 'LOCKED' || !token) {
        return false;
      }

      if (expStr) {
        const expiresAt = parseInt(expStr, 10);
        if (isNaN(expiresAt) || Date.now() > expiresAt) {
          this.clearUser();
          return false;
        }
      }
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Refresh session active timestamp
   */
  touchSession() {
    if (!this.isLoggedIn()) return;
    try {
      const newExpiry = Date.now() + this.SESSION_MAX_INACTIVE_MS;
      sessionStorage.setItem(this.SESSION_EXPIRES_KEY, String(newExpiry));
      localStorage.setItem(this.SESSION_EXPIRES_KEY, String(newExpiry));
    } catch (e) {}
  },

  getCurrentUsername() {
    try {
      if (!this.isLoggedIn()) return 'GUEST';
      return sessionStorage.getItem(this.CURRENT_USERNAME_KEY) || localStorage.getItem(this.CURRENT_USERNAME_KEY) || 'admin';
    } catch (e) {
      return 'GUEST';
    }
  },

  getCurrentRole() {
    try {
      if (!this.isLoggedIn()) {
        return this.ROLES.LOCKED;
      }
      const saved = (sessionStorage.getItem(this.CURRENT_USER_KEY) || localStorage.getItem(this.CURRENT_USER_KEY) || 'LOCKED').toUpperCase();
      if (saved === 'LOCKED') {
        return this.ROLES.LOCKED;
      }
      if (this.ROLES[saved]) {
        return this.ROLES[saved];
      }
      if (saved === 'STAFF') return this.ROLES.OFFICER;
      return this.ROLES.ADMIN;
    } catch (e) {
      return this.ROLES.LOCKED;
    }
  },

  isViewer() {
    return this.getCurrentRole().id === 'VIEWER';
  },

  /**
   * Set Session & User Tokens upon Successful Login
   */
  setCurrentUser(username, roleId) {
    if (!roleId || roleId === 'LOCKED') return false;
    const key = roleId.toUpperCase();
    let target = this.ROLES[key];
    if (!target && key === 'STAFF') target = this.ROLES.OFFICER;
    if (!target) target = this.ROLES.VIEWER;

    // Generate secure pseudo-random session token
    const randomBuffer = new Uint8Array(16);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(randomBuffer);
    }
    const hexToken = Array.from(randomBuffer).map(b => b.toString(16).padStart(2, '0')).join('');
    const token = `sess_${Date.now()}_${hexToken}`;
    const expiresAt = Date.now() + this.SESSION_MAX_INACTIVE_MS;

    try {
      // Store in Session Storage & Local Storage
      sessionStorage.setItem(this.CURRENT_USER_KEY, target.id);
      sessionStorage.setItem(this.CURRENT_USERNAME_KEY, username || target.id.toLowerCase());
      sessionStorage.setItem(this.SESSION_TOKEN_KEY, token);
      sessionStorage.setItem(this.SESSION_EXPIRES_KEY, String(expiresAt));

      localStorage.setItem(this.CURRENT_USER_KEY, target.id);
      localStorage.setItem(this.CURRENT_USERNAME_KEY, username || target.id.toLowerCase());
      localStorage.setItem(this.SESSION_TOKEN_KEY, token);
      localStorage.setItem(this.SESSION_EXPIRES_KEY, String(expiresAt));

      // Purge any legacy plaintext password keys
      localStorage.removeItem('staff_control_remembered_auth');
      localStorage.removeItem('STAFF_CONTROL_REMEMBERED_AUTH');
      localStorage.removeItem('STAFF_CONTROL_REMEMBERED_USER');

      // Set Secure Cookie
      document.cookie = `staff_session_token=${token}; path=/; SameSite=Strict; Secure; max-age=1800`;

      if (typeof auditLogger !== 'undefined') {
        auditLogger.log('AUTH_LOGIN', username || target.id, `បានចូលប្រព័ន្ធជា ${target.titleKh}`);
      }
      return true;
    } catch (e) {
      return false;
    }
  },

  setCurrentRole(roleId) {
    return this.setCurrentUser(this.getCurrentUsername() || roleId, roleId);
  },

  /**
   * Complete Logout & Session Revocation
   */
  clearUser() {
    try {
      // 1. Clear SessionStorage completely
      sessionStorage.clear();

      // 2. Set storage keys to LOCKED
      sessionStorage.setItem(this.CURRENT_USER_KEY, 'LOCKED');
      sessionStorage.setItem(this.CURRENT_USERNAME_KEY, '');
      sessionStorage.removeItem(this.SESSION_TOKEN_KEY);
      sessionStorage.removeItem(this.SESSION_EXPIRES_KEY);

      // 3. Clear LocalStorage auth state
      localStorage.setItem(this.CURRENT_USER_KEY, 'LOCKED');
      localStorage.setItem(this.CURRENT_USERNAME_KEY, '');
      localStorage.removeItem(this.SESSION_TOKEN_KEY);
      localStorage.removeItem(this.SESSION_EXPIRES_KEY);
      localStorage.removeItem('STAFF_CONTROL_REMEMBERED_USER');
      localStorage.removeItem('staff_control_remembered_auth');
      localStorage.removeItem('STAFF_CONTROL_REMEMBERED_AUTH');
      localStorage.removeItem('STAFF_CONTROL_FILTER_COLLAPSED');

      // 4. Invalidate & Clear Authentication Cookie
      document.cookie = "staff_session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Strict; Secure";

      if (typeof auditLogger !== 'undefined') {
        auditLogger.log('AUTH_LOGOUT', 'SYS', 'បានសម្អាត Cache, Session និងចាកចេញពីប្រព័ន្ធ');
      }
      return true;
    } catch (e) {
      return false;
    }
  }
};
