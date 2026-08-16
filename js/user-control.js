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
    }
  },

  CURRENT_USER_KEY: 'STAFF_CONTROL_CURRENT_ROLE',

  getCurrentRole() {
    try {
      const saved = (localStorage.getItem(this.CURRENT_USER_KEY) || 'ADMIN').toUpperCase();
      if (this.ROLES[saved]) {
        return this.ROLES[saved];
      }
      if (saved === 'STAFF') return this.ROLES.OFFICER;
      return this.ROLES.ADMIN;
    } catch (e) {
      return this.ROLES.ADMIN;
    }
  },

  isViewer() {
    return this.getCurrentRole().id === 'VIEWER';
  },

  setCurrentRole(roleId) {
    if (!roleId) return false;
    const key = roleId.toUpperCase();
    let target = this.ROLES[key];
    if (!target && key === 'STAFF') target = this.ROLES.OFFICER;
    if (!target) target = this.ROLES.ADMIN;

    try {
      localStorage.setItem(this.CURRENT_USER_KEY, target.id);
      if (typeof auditLogger !== 'undefined') {
        auditLogger.log('AUTH_SWITCH', 'SYS', `បានប្តូរសិទ្ធិប្រើប្រាស់ទៅជា ${target.titleKh}`);
      }
      return true;
    } catch (e) {
      return false;
    }
  }
};
