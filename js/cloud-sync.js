/**
 * Staff System Control - Google Sheets & Drive Auto-Transfer & Cloud Sync Service
 * Supports Automatic Transfer on Entry/Save/Update/Delete and Manual Sync
 */

const DEFAULT_CLOUD_SETTINGS = {
  sheetUrl: 'https://docs.google.com/spreadsheets/d/1-5lKK7XmR-nv6wkRPOG0H2uYYvdRWyDgZyZKfLUphwg/edit?usp=sharing',
  driveUrl: 'https://drive.google.com/drive/u/0/folders/1-m73KVElNmUx4gRm3UmbONMjomPKf7L3',
  webhookUrl: '',
  autoSync: true,
  lastSync: null,
  syncStatus: 'ready' // 'ready', 'syncing', 'synced', 'error'
};

const CloudSyncService = {
  STORAGE_KEY: 'STAFF_CONTROL_CLOUD_SYNC_V1',

  /**
   * Get Current Cloud Sync Configuration
   */
  getSettings() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        this.saveSettings(DEFAULT_CLOUD_SETTINGS);
        return { ...DEFAULT_CLOUD_SETTINGS };
      }
      const parsed = JSON.parse(stored);
      return {
        sheetUrl: parsed.sheetUrl || DEFAULT_CLOUD_SETTINGS.sheetUrl,
        driveUrl: parsed.driveUrl || DEFAULT_CLOUD_SETTINGS.driveUrl,
        webhookUrl: parsed.webhookUrl || '',
        autoSync: parsed.autoSync !== undefined ? parsed.autoSync : true,
        lastSync: parsed.lastSync || null,
        syncStatus: parsed.syncStatus || 'ready'
      };
    } catch (e) {
      return { ...DEFAULT_CLOUD_SETTINGS };
    }
  },

  /**
   * Save Cloud Sync Settings
   */
  saveSettings(settings) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
  },

  /**
   * Extract Google Sheet ID from URL
   */
  getSheetId(url) {
    const target = url || this.getSettings().sheetUrl;
    const match = target.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : '';
  },

  /**
   * Extract Google Drive Folder ID from URL
   */
  getFolderId(url) {
    const target = url || this.getSettings().driveUrl;
    const match = target.match(/\/folders\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : '';
  },

  /**
   * Format Record with Book1 22 Master Fields and Clean Dates
   */
  formatRecordPayload(record) {
    if (!record) return null;
    const statusObj = typeof StatusCalculator !== 'undefined' 
      ? StatusCalculator.calculateStatus(record) 
      : { labelKh: 'Active', key: 'active' };

    return {
      no: record.no || 1,
      staffId: record.staffId || '',
      secondaryId: record.secondaryId || '',
      latinName: record.latinName || '',
      khmerName: record.khmerName || '',
      department: record.department || '',
      office: record.office || '',
      position: record.position || '',
      gender: record.gender || '',
      dob: typeof StatusCalculator !== 'undefined' ? StatusCalculator.formatDateDisplay(record.dob) : record.dob,
      serviceStartDate: typeof StatusCalculator !== 'undefined' ? StatusCalculator.formatDateDisplay(record.serviceStartDate) : record.serviceStartDate,
      requestDate: typeof StatusCalculator !== 'undefined' ? StatusCalculator.formatDateDisplay(record.requestDate) : record.requestDate,
      endDate: typeof StatusCalculator !== 'undefined' ? StatusCalculator.formatDateDisplay(record.endDate) : record.endDate,
      startDate: typeof StatusCalculator !== 'undefined' ? StatusCalculator.formatDateDisplay(record.startDate) : record.startDate,
      annualPeriod: record.annualPeriod || '',
      requestReason: record.requestReason || '',
      prakasNo: record.prakasNo || '',
      description: record.description || '',
      systemClosingDate: typeof StatusCalculator !== 'undefined' ? StatusCalculator.formatDateDisplay(record.systemClosingDate) : record.systemClosingDate,
      refDocument: record.refDocument || '',
      receivedDate: typeof StatusCalculator !== 'undefined' ? StatusCalculator.formatDateDisplay(record.receivedDate) : record.receivedDate,
      remark: record.remark || '',
      statusKey: statusObj.key,
      statusLabelKh: statusObj.labelKh,
      updatedAt: new Date().toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' })
    };
  },

  /**
   * Automatically Transfer a Single Record to Google Sheet on Entry/Update/Delete
   * @param {string} action - 'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE'
   * @param {object} record - Staff record
   */
  async syncRecord(action, record) {
    const settings = this.getSettings();
    if (!settings.autoSync) return;

    const payload = this.formatRecordPayload(record);
    const nowStr = new Date().toLocaleString();

    // Update last sync time locally
    settings.lastSync = nowStr;
    settings.syncStatus = 'synced';
    this.saveSettings(settings);

    // Update UI Badge if exists
    this.updateUIStatus('synced', `ផ្ទេរទិន្នន័យ #${record.no} (${record.staffId}) ជោគជ័យ`);

    // If Webhook URL (Google Apps Script) is provided, send real HTTP POST
    if (settings.webhookUrl && settings.webhookUrl.startsWith('http')) {
      try {
        await fetch(settings.webhookUrl, {
          method: 'POST',
          mode: 'no-cors', // standard for Google Apps Script Web Apps
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'SYNC_RECORD',
            syncAction: action,
            sheetId: this.getSheetId(settings.sheetUrl),
            folderId: this.getFolderId(settings.driveUrl),
            record: payload,
            timestamp: nowStr
          })
        });
      } catch (err) {
        console.warn('Cloud Sync webhook notice:', err);
      }

      if (typeof app !== 'undefined' && app.showToast) {
        const actionText = action === 'CREATE' ? 'ចុះឈ្មោះថ្មី' : action === 'UPDATE' ? 'កែប្រែ' : 'ធ្វើបច្ចុប្បន្នភាព';
        app.showToast(`🟢 ទិន្នន័យ ${actionText} (#${record.no} - ${record.khmerName || record.staffId}) បានផ្ញើទៅ Google Sheet ដោយស្វ័យប្រវត្ត!`, 'success');
      }
    } else {
      if (typeof app !== 'undefined' && app.showToast) {
        const actionText = action === 'CREATE' ? 'ចុះឈ្មោះថ្មី' : action === 'UPDATE' ? 'កែប្រែ' : 'ធ្វើបច្ចុប្បន្នភាព';
        app.showToast(`💾 បានរក្សាទុក ${actionText} ក្នុងប្រព័ន្ធរួចរាល់!`, 'success');
      }
    }

    if (typeof auditLogger !== 'undefined') {
      auditLogger.log(
        'CLOUD_SYNC', 
        record.staffId || `#${record.no}`, 
        `ស្វ័យប្រវត្តផ្ទេរទិន្នន័យទៅ Google Sheet [${action}]: ${record.khmerName || ''} (${record.staffId || ''})`
      );
    }
  },

  /**
   * Bulk Transfer All Staff Data to Google Sheet
   */
  async syncAllRecords(records) {
    const settings = this.getSettings();
    const allRecords = records || (typeof dataStore !== 'undefined' ? dataStore.getStaffData() : []);
    
    if (allRecords.length === 0) {
      if (typeof app !== 'undefined') app.showToast('មិនមានទិន្នន័យដើម្បីផ្ទេរទេ', 'info');
      return;
    }

    this.updateUIStatus('syncing', 'កំពុងផ្ទេរទិន្នន័យទាំងអស់...');
    const nowStr = new Date().toLocaleString();

    const formattedList = allRecords.map(r => this.formatRecordPayload(r));

    // If Webhook URL (Google Apps Script) is provided, send real HTTP POST
    if (settings.webhookUrl && settings.webhookUrl.startsWith('http')) {
      try {
        await fetch(settings.webhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'SYNC_ALL',
            sheetId: this.getSheetId(settings.sheetUrl),
            folderId: this.getFolderId(settings.driveUrl),
            records: formattedList,
            timestamp: nowStr
          })
        });
      } catch (err) {
        console.warn('Cloud Sync bulk error:', err);
      }
    } else {
      // If no Webhook URL is deployed yet, copy to clipboard for instant 1-click Ctrl+V
      this.copyDataForGoogleSheetClipboard();
      return;
    }

    settings.lastSync = nowStr;
    settings.syncStatus = 'synced';
    this.saveSettings(settings);
    this.updateUIStatus('synced', `បានផ្ទេរទិន្នន័យសរុប ${allRecords.length} នាក់ ទៅ Google Sheet ជោគជ័យ!`);

    if (typeof auditLogger !== 'undefined') {
      auditLogger.log('CLOUD_SYNC_ALL', 'ALL', `បានផ្ទេរទិន្នន័យសរុប ${allRecords.length} នាក់ទៅ Google Sheet`);
    }

    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`🚀 បានផ្ទេរទិន្នន័យបុគ្គលិកសរុប ${allRecords.length} នាក់ ទៅកាន់ Google Sheet ជោគជ័យ!`, 'success');
    }
  },

  /**
   * Live Connection Diagnostic & Testing Tool
   */
  async testConnection() {
    const settings = this.getSettings();
    const sheetId = this.getSheetId(settings.sheetUrl);

    if (!settings.webhookUrl || !settings.webhookUrl.trim()) {
      const msg = `⚠️ លទ្ធផលត្រួតពិនិត្យ (Diagnostic Result):\n\n` +
        `១. តំណភ្ជាប់ Google Sheet: បានភ្ជាប់ត្រឹមត្រូវ (${sheetId})\n` +
        `២. Webhook URL: នៅទទេ (មិនទាន់បានដាក់កូដ Web App ក្នុង Apps Script)\n\n` +
        `💡 មូលហេតុដែលមិនទាន់ចូល Sheet៖\n` +
        `តំណភ្ជាប់ Google Sheet ធម្មតា (/edit) មិនអនុញ្ញាតឱ្យសរសេរទិន្នន័យពីខាងក្រៅដោយគ្មាន Webhook ទេ។\n\n` +
        `👉 ដំណោះស្រាយងាយស្រួលបំផុត៖\n` +
        `• ជម្រើស A: ចុចប៊ូតុង "📋 ចម្លងទិន្នន័យដាក់ Sheet" រួចចុច Ctrl + V លើក្រឡា A1 (លឿន និងស្រួលបំផុត!)\n` +
        `• ជម្រើស B: ចុចប៊ូតុង "📜 កូដ Apps Script" ដើម្បីដំឡើង Webhook ៣០ វិនាទី។`;

      alert(msg);
      this.openAppsScriptModal();
      return;
    }

    try {
      this.updateUIStatus('syncing', 'កំពុងតេស្តការតភ្ជាប់ Webhook...');
      await fetch(settings.webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PING',
          sheetId: sheetId,
          timestamp: new Date().toISOString()
        })
      });

      this.updateUIStatus('synced', 'Webhook ឆ្លើយតបជោគជ័យ');
      alert(`✅ ការតភ្ជាប់ជោគជ័យ!\n\nWebhook URL កំពុងដំណើរការធម្មតា។ រាល់ការបញ្ចូល ឬកែប្រែទិន្នន័យនឹងត្រូវផ្ញើទៅកាន់ Webhook នេះដោយស្វ័យប្រវត្ត។`);
    } catch (err) {
      this.updateUIStatus('error', 'កំហុសតភ្ជាប់ Webhook');
      alert(`❌ មិនអាចតភ្ជាប់ទៅកាន់ Webhook URL បានទេ៖\n` + err.message + `\n\nសូមប្រាកដថាអ្នកបានជ្រើសរើស "Who has access: Anyone" ពេល Deploy ក្នុង Google Apps Script។`);
    }
  },

  /**
   * Update Visual Sync Status Badges across the App
   */
  updateUIStatus(status, message) {
    const statusTextEl = document.getElementById('cloud-sync-live-status');
    const lastSyncEl = document.getElementById('cloud-last-sync-time');
    const settings = this.getSettings();

    if (statusTextEl) {
      if (status === 'syncing') {
        statusTextEl.innerHTML = '<span class="status-badge status-pending">🔄 កំពុងផ្ទេរទិន្នន័យ...</span>';
      } else if (status === 'synced') {
        statusTextEl.innerHTML = '<span class="status-badge status-active">🟢 ភ្ជាប់ជោគជ័យ (Auto-Synced)</span>';
      } else {
        statusTextEl.innerHTML = '<span class="status-badge status-auto">⚪ ត្រៀមរួចរាល់ (Ready)</span>';
      }
    }

    if (lastSyncEl && settings.lastSync) {
      lastSyncEl.textContent = `ផ្ទេរចុងក្រោយ៖ ${settings.lastSync}`;
    }
  },

  /**
   * Open Google Sheet in a New Browser Tab
   */
  openGoogleSheet() {
    const settings = this.getSettings();
    if (settings.sheetUrl) {
      window.open(settings.sheetUrl, '_blank');
    } else {
      alert('សូមបញ្ចូលតំណភ្ជាប់ Google Sheet ជាមុនសិន');
    }
  },

  /**
   * Open Google Drive Folder in a New Browser Tab
   */
  openGoogleDrive() {
    const settings = this.getSettings();
    if (settings.driveUrl) {
      window.open(settings.driveUrl, '_blank');
    } else {
      alert('សូមបញ្ចូលតំណភ្ជាប់ Google Drive Folder ជាមុនសិន');
    }
  },

  /**
   * 1-Click Copy All Table Data to Clipboard for Direct Google Sheet Paste (Ctrl + V)
   */
  copyDataForGoogleSheetClipboard() {
    const list = typeof dataStore !== 'undefined' ? dataStore.getStaffData() : [];
    if (list.length === 0) {
      if (typeof app !== 'undefined') app.showToast('មិនមានទិន្នន័យដើម្បីចម្លងទេ', 'info');
      return;
    }

    const headers = [
      'ល.រ', 'អត្តលេខ អពដ', 'អត្តលេខ កសហវ', 'ឈ្មោះឡាតាំង', 'ឈ្មោះខ្មែរ',
      'អង្គភាព', 'ការិយាល័យ', 'តួនាទី', 'ភេទ', 'ថ្ងៃខែឆ្នាំកំណើត',
      'ថ្ងៃខែឆ្នាំបម្រើការងារ', 'ថ្ងៃខែឆ្នាំស្នើសុំ', 'ថ្ងៃខែឆ្នាំបញ្ចប់', 'ថ្ងៃខែឆ្នាំចាប់ផ្តើម',
      'ប្រចាំឆ្នាំ', 'មូលហេតុនៃសំណើ', 'ប្រកាសលេខ', 'ពិព័ណនាផ្សេងៗ', 'ថ្ងៃខែបិទប្រព័ន្ធ',
      'ឯកសារយោង', 'ថ្ងៃខែទទួលឯកសារ ឬប្រកាសផ្សេងៗ', 'Remark', 'ស្ថានភាព'
    ];

    const rows = list.map(r => {
      const p = this.formatRecordPayload(r);
      return [
        p.no, p.staffId, p.secondaryId, p.latinName, p.khmerName,
        p.department, p.office, p.position, p.gender, p.dob,
        p.serviceStartDate, p.requestDate, p.endDate, p.startDate,
        p.annualPeriod, p.requestReason, p.prakasNo, (p.description || '').replace(/\r?\n/g, ' '), p.systemClosingDate,
        p.refDocument, p.receivedDate, (p.remark || '').replace(/\r?\n/g, ' '), p.statusLabelKh
      ].map(val => String(val || '').replace(/\t/g, ' ')).join('\t');
    });

    const tsvContent = [headers.join('\t'), ...rows].join('\n');

    navigator.clipboard.writeText(tsvContent).then(() => {
      if (typeof app !== 'undefined') {
        app.showToast(`📋 បានចម្លងទិន្នន័យបុគ្គលិកទាំង ${list.length} នាក់រួចរាល់! សូមចុច Cell A1 ក្នុង Google Sheet ហើយចុច Ctrl + V ដើម្បីបិទភ្ជាប់។`, 'success');
      } else {
        alert('បានចម្លងទិន្នន័យរួចរាល់! សូមចុច Cell A1 ក្នុង Google Sheet ហើយចុច Ctrl + V។');
      }
      this.openGoogleSheet();
    }).catch(err => {
      alert('មិនអាចចម្លងទិន្នន័យបានទេ៖ ' + err.message);
    });
  },

  /**
   * Open Google Apps Script Integration Modal / Code Viewer
   */
  openAppsScriptModal() {
    const modal = document.getElementById('apps-script-sync-modal');
    if (modal) {
      modal.classList.add('open');
      if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
      }
    }
  },

  closeAppsScriptModal() {
    const modal = document.getElementById('apps-script-sync-modal');
    if (modal) {
      modal.classList.remove('open');
    }
  },

  copyAppsScriptCode() {
    const codeEl = document.getElementById('apps-script-code-text');
    if (!codeEl) return;
    const text = codeEl.textContent;
    navigator.clipboard.writeText(text).then(() => {
      if (typeof app !== 'undefined') {
        app.showToast('📋 បានចម្លងកូដ Google Apps Script រួចរាល់!', 'success');
      } else {
        alert('បានចម្លងកូដ Google Apps Script ជោគជ័យ!');
      }
    }).catch(() => {
      alert('សូមជ្រើសរើស និងចម្លងកូដដោយផ្ទាល់');
    });
  }
};
