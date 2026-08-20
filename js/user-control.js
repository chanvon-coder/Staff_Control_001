/**
 * Staff System Control - User & Role Access Control Engine
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

  isLoggedIn() {
    try {
      const saved = sessionStorage.getItem(this.CURRENT_USER_KEY) || localStorage.getItem(this.CURRENT_USER_KEY);
      return Boolean(saved && saved !== 'LOCKED');
    } catch (e) {
      return false;
    }
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

  setCurrentUser(username, roleId) {
    if (!roleId || roleId === 'LOCKED') return false;
    const key = roleId.toUpperCase();
    let target = this.ROLES[key];
    if (!target && key === 'STAFF') target = this.ROLES.OFFICER;
    if (!target) target = this.ROLES.VIEWER;

    try {
      sessionStorage.setItem(this.CURRENT_USER_KEY, target.id);
      sessionStorage.setItem(this.CURRENT_USERNAME_KEY, username || target.id.toLowerCase());
      localStorage.setItem(this.CURRENT_USER_KEY, target.id);
      localStorage.setItem(this.CURRENT_USERNAME_KEY, username || target.id.toLowerCase());
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

  clearUser() {
    try {
      sessionStorage.clear();
      sessionStorage.setItem(this.CURRENT_USER_KEY, 'LOCKED');
      sessionStorage.setItem(this.CURRENT_USERNAME_KEY, '');
      localStorage.setItem(this.CURRENT_USER_KEY, 'LOCKED');
      localStorage.setItem(this.CURRENT_USERNAME_KEY, '');
      localStorage.removeItem('STAFF_CONTROL_REMEMBERED_USER');
      localStorage.removeItem('STAFF_CONTROL_FILTER_COLLAPSED');
      if (typeof auditLogger !== 'undefined') {
        auditLogger.log('AUTH_LOGOUT', 'SYS', 'បានសម្អាត Cache, Session និងចាកចេញពីប្រព័ន្ធ');
      }
      return true;
    } catch (e) {
      return false;
    }
  }
};
