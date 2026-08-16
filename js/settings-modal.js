/**
 * Staff System Control - System Settings & Management Modal Controller
 * Matches exactly the UI and tabs in user reference screenshots:
 * 1. App Name & Branding
 * 2. Theme & Colors (Presets + Custom Picker)
 * 3. Document Types
 * 4. User Accounts & Security Control
 * 5. 22 Column Headers Customization
 */

const COLOR_PRESETS = {
  indigo: { name: 'Indigo (Default)', primary: '#4f46e5', hover: '#4338ca', light: '#eef2ff', accent: '#6366f1', dot: '#4f46e5' },
  ocean_blue: { name: 'Ocean Blue', primary: '#0284c7', hover: '#0369a1', light: '#e0f2fe', accent: '#38bdf8', dot: '#0284c7' },
  emerald: { name: 'Emerald', primary: '#059669', hover: '#047857', light: '#ecfdf5', accent: '#10b981', dot: '#059669' },
  royal_violet: { name: 'Royal Violet', primary: '#7c3aed', hover: '#6d28d9', light: '#f5f3ff', accent: '#8b5cf6', dot: '#7c3aed' },
  crimson: { name: 'Crimson', primary: '#e11d48', hover: '#be123c', light: '#ffe4e6', accent: '#f43f5e', dot: '#e11d48' },
  sunset_orange: { name: 'Sunset Orange', primary: '#ea580c', hover: '#c2410c', light: '#fff7ed', accent: '#f97316', dot: '#ea580c' },
  teal_cyan: { name: 'Teal Cyan', primary: '#0d9488', hover: '#0f766e', light: '#f0fdfa', accent: '#14b8a6', dot: '#0d9488' },
  amber_gold: { name: 'Amber Gold', primary: '#d97706', hover: '#b45309', light: '#fffbeb', accent: '#f59e0b', dot: '#d97706' }
};

const DEFAULT_BRANDING = {
  appTitle: 'DocuControl',
  appBadge: 'PRO',
  appSubtitle: 'Enterprise Document Control & Archival',
  docPrefix: 'DOC',
  activeTheme: 'light',
  accentPreset: 'indigo',
  customColor: '#4f46e5'
};

const DEFAULT_USER_ACCOUNTS = [
  {
    id: 'usr-1',
    username: 'admin',
    fullName: 'System Administrator',
    role: 'ADMIN',
    roleLabel: 'Admin (Full Access)',
    password: 'Password123!',
    status: 'ACTIVE',
    isCurrent: true
  },
  {
    id: 'usr-2',
    username: 'staff',
    fullName: 'Document Officer',
    role: 'STAFF',
    roleLabel: 'Staff (Create & Edit Documents)',
    password: 'StaffSecret2026',
    status: 'ACTIVE',
    isCurrent: false
  },
  {
    id: 'usr-3',
    username: 'viewer',
    fullName: 'Guest Viewer',
    role: 'VIEWER',
    roleLabel: 'Guest Viewer (Read-Only)',
    password: 'ViewerPass123',
    status: 'ACTIVE',
    isCurrent: false
  }
];

class SettingsModalController {
  constructor() {
    this.STORAGE_KEY_BRANDING = 'STAFF_CONTROL_BRANDING_V1';
    this.STORAGE_KEY_USERS = 'STAFF_CONTROL_ACCOUNTS_V1';
    this.currentSettingsTab = 'branding';
    this.init();
  }

  init() {
    if (!localStorage.getItem(this.STORAGE_KEY_BRANDING)) {
      localStorage.setItem(this.STORAGE_KEY_BRANDING, JSON.stringify(DEFAULT_BRANDING));
    }
    if (!localStorage.getItem(this.STORAGE_KEY_USERS)) {
      localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(DEFAULT_USER_ACCOUNTS));
    }

    this.applyCurrentThemeAndBranding();
  }

  notify(msg, type = 'info') {
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(msg, type);
    } else {
      const container = document.getElementById('toast-container');
      if (container) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<div>${msg}</div>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
      }
    }
  }

  getBranding() {
    try {
      const data = JSON.parse(localStorage.getItem(this.STORAGE_KEY_BRANDING));
      return data || { ...DEFAULT_BRANDING };
    } catch (e) {
      return { ...DEFAULT_BRANDING };
    }
  }

  saveBranding(branding) {
    localStorage.setItem(this.STORAGE_KEY_BRANDING, JSON.stringify(branding));
    this.applyCurrentThemeAndBranding();
  }

  getUserAccounts() {
    try {
      const data = JSON.parse(localStorage.getItem(this.STORAGE_KEY_USERS));
      return Array.isArray(data) ? data : [...DEFAULT_USER_ACCOUNTS];
    } catch (e) {
      return [...DEFAULT_USER_ACCOUNTS];
    }
  }

  saveUserAccounts(users) {
    localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));
  }

  /**
   * Apply Theme Colors, Branding, and Title across DOM
   */
  applyCurrentThemeAndBranding() {
    const branding = this.getBranding();

    // 1. App Title & Subtitle in Header
    const titleEl = document.getElementById('header-app-title-text');
    if (titleEl) titleEl.textContent = branding.appTitle || DEFAULT_BRANDING.appTitle;

    const badgeEl = document.getElementById('header-app-badge-text');
    if (badgeEl) badgeEl.textContent = branding.appBadge || DEFAULT_BRANDING.appBadge;

    const subEl = document.getElementById('header-app-sub-text');
    if (subEl) subEl.textContent = branding.appSubtitle || DEFAULT_BRANDING.appSubtitle;

    // 2. Light / Dark Appearance Mode
    document.documentElement.setAttribute('data-theme', branding.activeTheme || 'light');
    if (typeof app !== 'undefined' && app.updateThemeIcon) {
      app.updateThemeIcon(branding.activeTheme || 'light');
    }

    // 3. Accent Color Scheme Injection
    const root = document.documentElement;
    if (branding.accentPreset && COLOR_PRESETS[branding.accentPreset]) {
      const preset = COLOR_PRESETS[branding.accentPreset];
      root.style.setProperty('--primary', preset.primary);
      root.style.setProperty('--primary-hover', preset.hover);
      root.style.setProperty('--primary-light', preset.light);
      root.style.setProperty('--primary-glow', `rgba(${this.hexToRgb(preset.primary)}, 0.2)`);
      root.style.setProperty('--accent', preset.accent);
      root.style.setProperty('--border-focus', preset.primary);
    } else if (branding.customColor) {
      const hex = branding.customColor;
      root.style.setProperty('--primary', hex);
      root.style.setProperty('--primary-hover', hex);
      root.style.setProperty('--primary-light', `rgba(${this.hexToRgb(hex)}, 0.1)`);
      root.style.setProperty('--primary-glow', `rgba(${this.hexToRgb(hex)}, 0.2)`);
      root.style.setProperty('--accent', hex);
      root.style.setProperty('--border-focus', hex);
    }
  }

  hexToRgb(hex) {
    if (!hex) return '79, 70, 229';
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    if (isNaN(num)) return '79, 70, 229';
    return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
  }

  /**
   * Open the System Settings & Management Modal
   */
  openModal(tab = 'branding') {
    this.currentSettingsTab = tab;
    const modal = document.getElementById('settings-management-modal');
    if (!modal) return;

    this.switchModalTab(tab);
    this.populateModalFields();
    this.renderDocumentTypes();
    this.renderUserAccountsTable();
    this.renderModalHeadersEditor();
    modal.classList.add('open');

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  closeModal() {
    const modal = document.getElementById('settings-management-modal');
    if (modal) modal.classList.remove('open');
  }

  switchModalTab(tabId) {
    this.currentSettingsTab = tabId;
    document.querySelectorAll('.settings-nav-tab').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-setting-tab') === tabId);
    });
    document.querySelectorAll('.settings-pane').forEach(pane => {
      pane.style.display = pane.id === `set-pane-${tabId}` ? 'block' : 'none';
    });

    if (tabId === 'doctypes') {
      this.renderDocumentTypes();
    } else if (tabId === 'users') {
      this.renderUserAccountsTable();
    } else if (tabId === 'headers') {
      this.renderModalHeadersEditor();
    }

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  populateModalFields() {
    const branding = this.getBranding();

    // Tab 1: Branding Fields
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };

    setVal('set-app-title', branding.appTitle);
    setVal('set-app-badge', branding.appBadge);
    setVal('set-app-subtitle', branding.appSubtitle);
    setVal('set-doc-prefix', branding.docPrefix);

    // Tab 2: Theme & Accent
    this.updateThemeModePills(branding.activeTheme || 'light');
    this.updateAccentColorPills(branding.accentPreset || 'indigo', branding.customColor || '#4f46e5');
  }

  updateThemeModePills(theme) {
    const darkBtn = document.getElementById('btn-mode-dark');
    const lightBtn = document.getElementById('btn-mode-light');
    if (darkBtn && lightBtn) {
      darkBtn.classList.toggle('active', theme === 'dark');
      lightBtn.classList.toggle('active', theme === 'light');
    }
  }

  updateAccentColorPills(activePreset, customColor) {
    const container = document.getElementById('accent-color-pills-container');
    if (!container) return;

    container.innerHTML = Object.keys(COLOR_PRESETS).map(key => {
      const p = COLOR_PRESETS[key];
      const isActive = activePreset === key;
      return `
        <button class="color-pill ${isActive ? 'active' : ''}" type="button" onclick="settingsModalController.selectAccentPreset('${key}')">
          <span class="color-dot" style="background: ${p.dot};"></span>
          <span>${p.name}</span>
        </button>
      `;
    }).join('');

    const picker = document.getElementById('set-custom-brand-color');
    if (picker) picker.value = customColor || '#4f46e5';
  }

  selectAccentPreset(presetKey) {
    const branding = this.getBranding();
    branding.accentPreset = presetKey;
    this.saveBranding(branding);
    this.updateAccentColorPills(presetKey, branding.customColor);
    this.notify(`បានប្តូរពណ៌ចម្បងទៅជា ${COLOR_PRESETS[presetKey].name}`, 'success');
  }

  selectThemeMode(mode) {
    const branding = this.getBranding();
    branding.activeTheme = mode;
    this.saveBranding(branding);
    this.updateThemeModePills(mode);
    this.notify(`បានប្តូររូបរាងទៅជា ${mode === 'dark' ? 'Dark Theme' : 'Light Theme'}`, 'info');
  }

  handleCustomColorChange(e) {
    const hex = e.target.value;
    const branding = this.getBranding();
    branding.customColor = hex;
    branding.accentPreset = null; // Custom
    this.saveBranding(branding);
    this.updateAccentColorPills(null, hex);
    this.notify(`បានកំណត់ពណ៌ផ្ទាល់ខ្លួន៖ ${hex}`, 'success');
  }

  /**
   * Tab 3: Render Document Types
   */
  renderDocumentTypes() {
    const listEl = document.getElementById('modal-list-requestReasons');
    if (!listEl) return;

    const settings = dataStore.getSettings();
    const reasons = settings.requestReasons || [];

    listEl.innerHTML = reasons.map((reason, idx) => `
      <li class="settings-item">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <i data-lucide="tag" style="width: 14px; height: 14px; color: var(--primary);"></i>
          <span>${reason}</span>
        </div>
        <button class="icon-btn icon-btn-danger" style="width: 22px; height: 22px; font-size: 0.7rem;" onclick="
          SettingsManager.removeItem('requestReasons', ${idx});
          settingsModalController.renderDocumentTypes();
          if (typeof app !== 'undefined') app.refreshAll();
        ">
          ✕
        </button>
      </li>
    `).join('');

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  /**
   * Tab 5: Render 22 Column Headers inside Modal
   */
  renderModalHeadersEditor() {
    SettingsManager.renderHeadersEditor('modal-headers-editor-tbody');
  }

  handleSaveModalHeaders() {
    SettingsManager.collectAndSaveHeadersFromEditor();
    this.notify('បានរក្សាទុកឈ្មោះជួរឈរទាំង ២២ ដោយជោគជ័យ!', 'success');
  }

  handleResetModalHeaders() {
    if (confirm('តើអ្នកពិតជាចង់កំណត់ឈ្មោះជួរឈរទាំងអស់ឡើងវិញតាមលំនាំដើម Book1 មែនទេ?')) {
      SettingsManager.resetHeadersToDefault();
      this.renderModalHeadersEditor();
      if (typeof app !== 'undefined') app.refreshAll();
      this.notify('បានកំណត់ឈ្មោះជួរឈរឡើងវិញតាមលំនាំដើម Book1 ជោគជ័យ', 'info');
    }
  }

  /**
   * Action: Save All Settings Changes
   */
  handleSaveAll() {
    const branding = this.getBranding();

    const titleEl = document.getElementById('set-app-title');
    if (titleEl) branding.appTitle = titleEl.value.trim() || DEFAULT_BRANDING.appTitle;

    const badgeEl = document.getElementById('set-app-badge');
    if (badgeEl) branding.appBadge = badgeEl.value.trim() || DEFAULT_BRANDING.appBadge;

    const subEl = document.getElementById('set-app-subtitle');
    if (subEl) branding.appSubtitle = subEl.value.trim() || DEFAULT_BRANDING.appSubtitle;

    const prefixEl = document.getElementById('set-doc-prefix');
    if (prefixEl) branding.docPrefix = prefixEl.value.trim() || DEFAULT_BRANDING.docPrefix;

    this.saveBranding(branding);
    if (typeof auditLogger !== 'undefined') {
      auditLogger.log('SETTINGS_UPDATE', 'SYS', 'បានធ្វើបច្ចុប្បន្នភាពការកំណត់ប្រព័ន្ធ (System settings updated)');
    }

    this.notify('បានរក្សាទុកការកំណត់ប្រព័ន្ធដោយជោគជ័យ! (Settings saved successfully)', 'success');
    this.closeModal();
    if (typeof app !== 'undefined') {
      app.refreshAll();
    }
  }

  /**
   * Action: Reset to Defaults
   */
  handleResetToDefaults() {
    if (confirm('តើលោកអ្នកពិតជាចង់កំណត់ឡើងវិញតាមលំនាំដើមមែនទេ? (Reset all branding and theme to defaults)')) {
      localStorage.setItem(this.STORAGE_KEY_BRANDING, JSON.stringify(DEFAULT_BRANDING));
      this.applyCurrentThemeAndBranding();
      this.populateModalFields();
      this.notify('បានកំណត់ឡើងវិញតាមលំនាំដើមរួចរាល់', 'info');
    }
  }

  /* ---------------- USER ACCOUNTS MANAGEMENT ---------------- */
  renderUserAccountsTable() {
    const tbody = document.getElementById('user-accounts-tbody');
    if (!tbody) return;

    const users = this.getUserAccounts();

    tbody.innerHTML = users.map(user => {
      let roleColor = '#d97706'; // Admin
      if (user.role === 'STAFF' || user.role === 'OFFICER') roleColor = '#2563eb';
      if (user.role === 'VIEWER') roleColor = '#059669';

      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--text-primary);">
              ${user.username} ${user.isCurrent ? '<span style="color: var(--primary); font-weight: 600; font-size: 0.75rem;">(You)</span>' : ''}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${user.fullName}</div>
          </td>
          <td>
            <span style="font-weight: 800; color: ${roleColor}; font-size: 0.75rem; text-transform: uppercase;">
              ${user.role}
            </span>
          </td>
          <td>
            <span style="font-family: var(--font-mono); color: var(--text-muted); letter-spacing: 2px;">•••••••</span>
          </td>
          <td>
            <span class="user-active-badge">ACTIVE</span>
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.4rem;">
              <button class="icon-btn" title="កែប្រែគណនី (Edit User)" onclick="settingsModalController.handleEditUser('${user.id}')">
                <i data-lucide="edit-2"></i>
              </button>
              ${user.username !== 'admin' ? `
                <button class="icon-btn icon-btn-danger" title="លុបគណនី (Delete User)" onclick="settingsModalController.handleDeleteUser('${user.id}')">
                  <i data-lucide="trash-2"></i>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  generateRandomPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const input = document.getElementById('set-new-user-pass');
    if (input) {
      input.value = pass;
      input.type = 'text';
      this.notify(`បានបង្កើតពាក្យសម្ងាត់ស្វ័យប្រវត្ត៖ ${pass}`, 'info');
    }
  }

  handleAddUserAccount() {
    const username = document.getElementById('set-new-user-name').value.trim();
    const fullName = document.getElementById('set-new-user-fullname').value.trim();
    const password = document.getElementById('set-new-user-pass').value.trim();
    const roleSelect = document.getElementById('set-new-user-role');
    const role = roleSelect.value;
    const roleLabel = roleSelect.options[roleSelect.selectedIndex].text;

    if (!username || !fullName || !password) {
      alert('សូមបញ្ចូលព័ត៌មានគណនីឲ្យបានគ្រប់គ្រាន់ (All fields are required)');
      return;
    }

    const users = this.getUserAccounts();
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      alert(`ឈ្មោះគណនី "${username}" មានរួចហើយ (Username already exists)`);
      return;
    }

    const newUser = {
      id: 'usr-' + Date.now(),
      username: username,
      fullName: fullName,
      role: role,
      roleLabel: roleLabel,
      password: password,
      status: 'ACTIVE',
      isCurrent: false
    };

    users.push(newUser);
    this.saveUserAccounts(users);
    this.renderUserAccountsTable();

    // Set as remembered user for login dropdown
    localStorage.setItem('STAFF_CONTROL_REMEMBERED_USER', username);
    if (typeof app !== 'undefined' && app.populateAuthUserDropdown) {
      app.populateAuthUserDropdown();
    }

    // Clear inputs
    document.getElementById('set-new-user-name').value = '';
    document.getElementById('set-new-user-fullname').value = '';
    document.getElementById('set-new-user-pass').value = '';

    if (typeof auditLogger !== 'undefined') {
      auditLogger.log('USER_CREATE', username, `បានបង្កើតគណនីអ្នកប្រើប្រាស់ថ្មី៖ ${fullName} (${role})`);
    }
    this.notify(`បានបន្ថែមគណនី ${fullName} (${username}) ដោយជោគជ័យ!`, 'success');
  }

  handleDeleteUser(userId) {
    const users = this.getUserAccounts();
    const targetIdx = users.findIndex(u => u.id === userId);
    if (targetIdx === -1) return;

    const user = users[targetIdx];
    if (user.username === 'admin') {
      alert('មិនអាចលុបគណនីមេ Admin បានទេ!');
      return;
    }

    if (confirm(`តើលោកអ្នកពិតជាចង់លុបគណនី "${user.fullName}" (${user.username}) មែនទេ?`)) {
      users.splice(targetIdx, 1);
      this.saveUserAccounts(users);
      this.renderUserAccountsTable();
      if (typeof auditLogger !== 'undefined') {
        auditLogger.log('USER_DELETE', user.username, `បានលុបគណនី ${user.fullName}`);
      }
      this.notify(`បានលុបគណនី ${user.fullName} រួចរាល់`, 'warning');
    }
  }

  handleEditUser(userId) {
    const users = this.getUserAccounts();
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const newName = prompt('កែប្រែឈ្មោះពេញ (Full Name):', user.fullName);
    if (newName && newName.trim()) {
      user.fullName = newName.trim();
      const newPass = prompt('កំណត់ពាក្យសម្ងាត់ថ្មី (New Password - ទុកទទេបើមិនចង់ប្តូរ):');
      if (newPass && newPass.trim()) {
        user.password = newPass.trim();
      }
      this.saveUserAccounts(users);
      this.renderUserAccountsTable();
      if (typeof app !== 'undefined' && app.populateAuthUserDropdown) {
        app.populateAuthUserDropdown();
      }
      this.notify(`បានកែប្រែព័ត៌មានគណនី ${user.username} ជោគជ័យ`, 'success');
    }
  }

  handleResetDefaultPasswords() {
    if (confirm('តើលោកអ្នកចង់កំណត់ពាក្យសម្ងាត់គណនីទាំងអស់តាមលំនាំដើមឡើងវិញមែនទេ? (Reset all accounts & passwords to defaults)')) {
      localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(DEFAULT_USER_ACCOUNTS));
      this.renderUserAccountsTable();
      if (typeof app !== 'undefined' && app.populateAuthUserDropdown) {
        app.populateAuthUserDropdown();
      }
      this.notify('បានកំណត់លេខសម្ងាត់គណនីទាំងអស់តាមលំនាំដើមរួចរាល់ (admin: Password123!, staff: StaffSecret2026, viewer: ViewerPass123)', 'success');
    }
  }
}

// Global instance
const settingsModalController = new SettingsModalController();
