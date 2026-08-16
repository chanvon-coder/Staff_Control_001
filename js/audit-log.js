/**
 * Staff System Control - Audit Logging Engine
 * Tracks all user operations (Create, Update, Delete, Export, Import)
 */

class AuditLogger {
  constructor() {
    this.STORAGE_KEY_LOGS = 'STAFF_CONTROL_LOGS_V1';
    this.init();
  }

  init() {
    if (!localStorage.getItem(this.STORAGE_KEY_LOGS)) {
      const initialLogs = [
        {
          id: 'LOG-1001',
          timestamp: new Date().toISOString(),
          user: 'Admin (គ្រប់គ្រងប្រព័ន្ធ)',
          action: 'SYSTEM_INIT',
          staffId: 'ALL',
          description: 'ប្រព័ន្ធបានចាប់ផ្តើមដំណើរការដំបូង (Initial system startup)',
          details: 'Initialized 22-field master data store'
        }
      ];
      localStorage.setItem(this.STORAGE_KEY_LOGS, JSON.stringify(initialLogs));
    }
  }

  getLogs() {
    try {
      const logs = JSON.parse(localStorage.getItem(this.STORAGE_KEY_LOGS));
      return Array.isArray(logs) ? logs : [];
    } catch (e) {
      return [];
    }
  }

  log(action, staffId, description, details = '', user = 'Admin') {
    const logs = this.getLogs();
    const newLog = {
      id: 'LOG-' + (Date.now() % 1000000),
      timestamp: new Date().toISOString(),
      user: user || 'Admin',
      action: action, // CREATE, UPDATE, DELETE, EXPORT, IMPORT
      staffId: staffId || 'N/A',
      description: description,
      details: typeof details === 'object' ? JSON.stringify(details) : details
    };

    logs.unshift(newLog); // latest on top
    // Keep max 500 records
    if (logs.length > 500) {
      logs.length = 500;
    }
    localStorage.setItem(this.STORAGE_KEY_LOGS, JSON.stringify(logs));
  }

  clearLogs() {
    localStorage.setItem(this.STORAGE_KEY_LOGS, JSON.stringify([]));
  }
}

const auditLogger = new AuditLogger();
