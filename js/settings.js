/**
 * Staff System Control - Settings & Controlled Lists Manager
 * Includes: 22-Column Master Database Headers Customization & Table Header Titles (Left, Middle, Right)
 */

const SettingsManager = {
  getSettings() {
    return dataStore.getSettings();
  },

  addItem(category, value) {
    if (!value || !value.trim()) return false;
    const settings = this.getSettings();
    if (!settings[category]) {
      settings[category] = [];
    }
    const cleanVal = value.trim();
    if (!settings[category].includes(cleanVal)) {
      settings[category].push(cleanVal);
      dataStore.saveSettings(settings);
      if (typeof auditLogger !== 'undefined') {
        auditLogger.log('SETTING_ADD', 'SETTING', `បន្ថែម "${cleanVal}" ទៅក្នុង ${category}`);
      }
      return true;
    }
    return false;
  },

  addReasonRule(reasonName, requestDays, endDays) {
    if (!reasonName || !reasonName.trim()) return false;
    const settings = this.getSettings();
    const cleanName = reasonName.trim();
    if (!settings.requestReasons) settings.requestReasons = [];
    if (!settings.requestReasonRules) settings.requestReasonRules = {};

    if (!settings.requestReasons.includes(cleanName)) {
      settings.requestReasons.push(cleanName);
    }

    settings.requestReasonRules[cleanName] = {
      requestDays: requestDays ? parseInt(requestDays, 10) : null,
      endDays: endDays ? parseInt(endDays, 10) : null
    };

    dataStore.saveSettings(settings);
    if (typeof auditLogger !== 'undefined') {
      auditLogger.log('REASON_RULE_ADD', 'SETTING', `កំណត់ Rule សំណើ "${cleanName}" (Req: ${requestDays || 'None'}d, End: ${endDays || 'None'}d)`);
    }
    return true;
  },

  updateReasonRule(reasonName, field, value) {
    if (!reasonName) return;
    const settings = this.getSettings();
    if (!settings.requestReasonRules) settings.requestReasonRules = {};
    if (!settings.requestReasonRules[reasonName]) {
      settings.requestReasonRules[reasonName] = { requestDays: null, endDays: null };
    }
    settings.requestReasonRules[reasonName][field] = value ? parseInt(value, 10) : null;
    dataStore.saveSettings(settings);
  },

  removeItem(category, index) {
    const settings = this.getSettings();
    if (settings[category] && settings[category][index]) {
      const removed = settings[category].splice(index, 1);
      if (category === 'requestReasons' && settings.requestReasonRules && settings.requestReasonRules[removed[0]]) {
        delete settings.requestReasonRules[removed[0]];
      }
      dataStore.saveSettings(settings);
      if (typeof auditLogger !== 'undefined') {
        auditLogger.log('SETTING_REMOVE', 'SETTING', `លុប "${removed[0]}" ចេញពី ${category}`);
      }
      return true;
    }
    return false;
  },

  resetToDefault() {
    dataStore.saveSettings({ ...DEFAULT_SETTINGS });
    if (typeof auditLogger !== 'undefined') {
      auditLogger.log('SETTING_RESET', 'SETTING', 'បានកំណត់ការកំណត់ប្រព័ន្ធឡើងវិញតាមលំនាំដើម');
    }
  },

  /* ---------------- TABLE HEADER TITLES (LEFT, MIDDLE, RIGHT) ---------------- */
  getTableHeaderTitles() {
    return dataStore.getTableHeaderTitles();
  },

  saveTableHeaderTitles(titles) {
    dataStore.saveTableHeaderTitles(titles);
    if (typeof auditLogger !== 'undefined') {
      auditLogger.log('TABLE_TITLES_UPDATE', 'UI', 'បានកែប្រែចំណងជើងក្បាលតារាង (Left, Middle, Right Titles Updated)');
    }
    if (typeof app !== 'undefined') {
      app.renderTableHeaderBarTitles();
    }
  },

  resetTableHeaderTitles() {
    const defaults = dataStore.resetTableHeaderTitles();
    if (typeof auditLogger !== 'undefined') {
      auditLogger.log('TABLE_TITLES_RESET', 'UI', 'បានកំណត់ចំណងជើងក្បាលតារាងឡើងវិញតាមលំនាំដើម');
    }
    if (typeof app !== 'undefined') {
      app.renderTableHeaderBarTitles();
    }
    return defaults;
  },

  /* ---------------- 22-COLUMN HEADERS CUSTOMIZATION ---------------- */
  getHeaderFields() {
    return dataStore.getMasterFields();
  },

  saveCustomHeaders(fields) {
    const saved = dataStore.saveMasterFields(fields);
    if (saved && typeof auditLogger !== 'undefined') {
      auditLogger.log('HEADERS_UPDATE', 'SCHEMA', 'បានកែសម្រួលឈ្មោះជួរឈរទាំង ២២ (Updated 22-Column Headers)');
    }
    return saved;
  },

  resetHeadersToDefault() {
    const res = dataStore.resetMasterFields();
    if (typeof auditLogger !== 'undefined') {
      auditLogger.log('HEADERS_RESET', 'SCHEMA', 'បានកំណត់ឈ្មោះជួរឈរឡើងវិញតាមលំនាំដើម Book1 (Reset to Book1 Defaults)');
    }
    return res;
  },

  renderHeadersEditor(containerId = 'headers-editor-tbody') {
    const tbody = document.getElementById(containerId);
    if (!tbody) return;

    const fields = this.getHeaderFields();

    tbody.innerHTML = fields.map((f, idx) => `
      <tr>
        <td style="text-align: center; font-weight: 700; color: var(--primary);">${f.index}</td>
        <td>
          <code style="background: var(--bg-card-subtle); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">${f.key}</code>
        </td>
        <td>
          <input type="text" class="form-control header-input-kh" data-idx="${idx}" value="${f.kh}" style="font-weight: 600;">
        </td>
        <td>
          <input type="text" class="form-control header-input-en" data-idx="${idx}" value="${f.en}">
        </td>
        <td style="text-align: center;">
          <select class="form-control header-input-align" data-idx="${idx}" style="font-size: 0.75rem; padding: 0.25rem;">
            <option value="left" ${f.align === 'left' ? 'selected' : ''}>⬅️ ឆ្វេង (Left)</option>
            <option value="center" ${f.align === 'center' ? 'selected' : ''}>↔️ កណ្តាល (Center)</option>
            <option value="right" ${f.align === 'right' ? 'selected' : ''}>➡️ ស្តាំ (Right)</option>
          </select>
        </td>
        <td style="text-align: center;">
          <span class="status-badge ${f.required ? 'status-expired' : 'status-closed'}" style="font-size: 0.68rem;">
            ${f.required ? 'ចាំបាច់ (Req)' : 'ជម្រើស (Opt)'}
          </span>
        </td>
      </tr>
    `).join('');
  },

  collectAndSaveHeadersFromEditor() {
    const fields = [...this.getHeaderFields()];
    const khInputs = document.querySelectorAll('.header-input-kh');
    const enInputs = document.querySelectorAll('.header-input-en');
    const alignInputs = document.querySelectorAll('.header-input-align');

    khInputs.forEach((input) => {
      const idx = parseInt(input.getAttribute('data-idx'), 10);
      if (fields[idx]) {
        fields[idx].kh = input.value.trim() || fields[idx].kh;
      }
    });

    enInputs.forEach((input) => {
      const idx = parseInt(input.getAttribute('data-idx'), 10);
      if (fields[idx]) {
        fields[idx].en = input.value.trim() || fields[idx].en;
      }
    });

    alignInputs.forEach((input) => {
      const idx = parseInt(input.getAttribute('data-idx'), 10);
      if (fields[idx]) {
        fields[idx].align = input.value || 'left';
      }
    });

    this.saveCustomHeaders(fields);
    if (typeof app !== 'undefined') {
      app.refreshAll();
    }
    return true;
  }
};
