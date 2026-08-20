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
    const existing = localStorage.getItem(this.STORAGE_KEY_LOGS);
    if (!existing || existing === '[]') {
      const initialLogs = [
        {
          id: 'LOG-1004',
          timestamp: '2026-01-15 08:30',
          user: 'admin',
          action: 'CREATE',
          staffId: 'GDCE-0189',
          staffName: 'សុខ សំណាង',
          description: 'Created initial staff record (ដោយ admin)',
          details: 'នាយកដ្ឋានបុគ្គលិក និងរដ្ឋបាល'
        },
        {
          id: 'LOG-1003',
          timestamp: '2026-02-15 09:00',
          user: 'admin',
          action: 'UPDATE',
          staffId: 'GDCE-0245',
          staffName: 'ចាន់ សុផល',
          description: 'Updated request reason for doctorate scholarship (ដោយ admin)',
          details: 'មូលហេតុ៖ ស្នើសុំបន្តការសិក្សា'
        },
        {
          id: 'LOG-1002',
          timestamp: '2026-03-12 11:45',
          user: 'staff_officer',
          action: 'CREATE',
          staffId: 'GDCE-0312',
          staffName: 'កែវ វិសាល',
          description: 'Added leave request profile (ដោយ staff_officer)',
          details: 'ការិយាល័យរដ្ឋបាល'
        },
        {
          id: 'LOG-1001',
          timestamp: '2026-02-01 16:00',
          user: 'admin',
          action: 'LOCK',
          staffId: 'GDCE-0418',
          staffName: 'ហេង ធីតា',
          description: 'Locked transferred record and closed system date (ដោយ admin)',
          details: 'បានបិទប្រព័ន្ធ (Closed)'
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
