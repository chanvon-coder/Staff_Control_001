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
    try {
      const existing = localStorage.getItem(this.STORAGE_KEY_LOGS);
      if (!existing || existing === '[]') {
        const initialLogs = [
          {
            id: 'LOG-1004',
            timestamp: new Date().toISOString(),
            user: 'admin',
            action: 'CREATE',
            staffId: 'GDCE-0189',
            description: 'Created initial staff record',
            details: 'នាយកដ្ឋានបុគ្គលិក និងរដ្ឋបាល'
          }
        ];
        this.safeSave(initialLogs);
      } else {
        const logs = this.getLogs();
        if (logs.length > 80) {
          this.safeSave(logs.slice(0, 80));
        }
      }
    } catch (e) {
      console.warn('AuditLogger init warning:', e);
    }
  }

  getLogs() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY_LOGS);
      if (!raw) return [];
      const logs = JSON.parse(raw);
      return Array.isArray(logs) ? logs : [];
    } catch (e) {
      return [];
    }
  }

  safeSave(logsArray) {
    try {
      const trimmed = logsArray.slice(0, 80);
      localStorage.setItem(this.STORAGE_KEY_LOGS, JSON.stringify(trimmed));
    } catch (err) {
      console.warn('Audit log QuotaExceededError detected, auto-pruning logs:', err);
      try {
        const minimal = logsArray.slice(0, 15);
        localStorage.setItem(this.STORAGE_KEY_LOGS, JSON.stringify(minimal));
      } catch (err2) {
        try {
          localStorage.setItem(this.STORAGE_KEY_LOGS, JSON.stringify([]));
        } catch (err3) {
          console.error('Critical quota error saving audit logs:', err3);
        }
      }
    }
  }

  log(action, staffId, description, details = '', user = 'Admin') {
    try {
      const logs = this.getLogs();

      let cleanDetails = '';
      if (typeof details === 'object' && details !== null) {
        cleanDetails = `ព័ត៌មានអត្តលេខ៖ ${staffId || 'N/A'}`;
      } else {
        cleanDetails = String(details || '').slice(0, 200);
      }

      const newLog = {
        id: 'LOG-' + (Date.now() % 1000000),
        timestamp: new Date().toISOString(),
        user: user || 'Admin',
        action: action,
        staffId: staffId || 'N/A',
        description: String(description || '').slice(0, 200),
        details: cleanDetails
      };

      logs.unshift(newLog);
      this.safeSave(logs);
    } catch (e) {
      console.warn('AuditLogger log error ignored safely:', e);
    }
  }

  clearLogs() {
    try {
      localStorage.setItem(this.STORAGE_KEY_LOGS, JSON.stringify([]));
    } catch (e) {
      console.warn('clearLogs error:', e);
    }
  }
}

const auditLogger = new AuditLogger();
