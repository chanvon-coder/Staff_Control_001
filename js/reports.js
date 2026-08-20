/**
 * Staff System Control - Official Reports Controller
 * Single Unified Master Toolbar: Clean, streamlined, no duplicated buttons.
 * Supports:
 *   - Font Family selector including Khmer OS Muol Light, Khmer OS Muol, Khmer OS Siemreap, Battambang, Kantumruy Pro.
 *   - Font Size selector & increase/decrease (A- / A+ / 7.5pt to 16pt).
 *   - Font Color picker & color presets (Black, Navy Blue, Maroon, Emerald).
 *   - Table Border Line Styles: Solid (ត្រង់), Dashed (ដាច់ៗ), Dotted (ចុចៗ), Double (ពីរជាន់), None (គ្មាន).
 *   - Border Widths: 0.5px (ស្តើង), 1px (ស្តង់ដារ), 1.5px (មធ្យម), 2px (ក្រាស់).
 *   - Border Color picker & swatches.
 *   - Option Tick Box for Each Row & Quick-Delete (🗑️) button to easily delete/exclude rows from report.
 *   - Batch Delete Action Bar: Select All, Delete Selected Rows, and Restore Excluded Rows (🔄).
 *   - 1 Official Sheet Per Case Reason (No artificial sub-page fragmentation within a single reason).
 *   - Continuous Global Page Numbering: Page 1 of N, Page 2 of N, ..., Page N of N to the end of case reasons.
 *   - Clean Administrative Report Titles without unwanted pagination badges.
 *   - Clean Official Summary Bar with exact gender and record counts dynamically updated when rows are deleted.
 *   - Rank Numbers (ល.រ) numbered from 1..N cleanly per reason (automatically re-indexed).
 *   - Signatures Block (ប្លុកហត្ថលេខាទាំង ៣) displayed once at the bottom of each reason's report sheet.
 *   - Natural document flow (no forced space-between stretching or empty voids on short sheets).
 *   - Middle Centered Header Titles with discreet corner action tools.
 *   - Page Number Footer (លេខទំព័រ Page X of Y):
 *       * Automatically positioned at the bottom END OF PAPER & IN THE MIDDLE.
 *       * Inline on-hover / on-click floating quick tools [ ⬅️ ⏺️ ➡️ ⇦ ⇨ ⇧ ⇩ ✕ ] right next to page number!
 *       * Move Up / Down (Y-Offset & Nudge ⇧ ⇩)
 *       * Move Left / Right (X-Offset & Nudge ⇦ ⇨)
 *       * Alignment: Left (ឆ្វេង), Center (កណ្តាល), Right (ស្តាំ)
 *       * Show / Hide Toggle & Live In-Place Text Editing
 *   - Signatures Block (ប្លុកហត្ថលេខាទាំង ៣):
 *       * Re-size Font (A- / A+ / 7pt to 16pt)
 *       * Change Font Family (Khmer OS Siemreap, Battambang, Kantumruy Pro, Muol Light)
 *       * Move Up / Down (Y-Offset & Nudge ⇧ ⇩)
 *       * Move Left / Right (X-Offset & Nudge ⇦ ⇨)
 *       * Adjust Signature Space Height (↕- / ↕+)
 *   - Paper Orientation & Size: Toggle between Landscape (ផ្ដេក) & Portrait (បញ្ឈរ), A4 / A3 / Letter.
 *   - Ministry / Department Left Header Positioning: Up / Down / Left / Right (X/Y Offsets) & Nudge (⇦ ⇨ ⇧ ⇩) & Alignment (Left/Center/Right).
 *   - Strict Page-Break Isolation: Fixes page overlapping in multi-sheet print (each sheet strictly occupies its own page without bleeding onto previous/next pages).
 *   - 1:1 WYSIWYG Print Engine: Proportional column widths with table-layout: fixed, identical grid alignment, identical transforms, identical divider scaling.
 *   - "Print All Separated by Condition / Reason": Prints each request reason on its own separate official sheet with condition-specific title, Column 11 header, and summary.
 *   - Live In-Place Text Editing
 *   - Drag-to-Resize Columns & Row Density
 *   - Per-Column Shrink to Fit / Wrap Text Toggle
 *   - Text Alignment (Left, Middle/Center, Right)
 *   - Kingdom Motto & Divider Alignment (Left/Center/Right & X/Y Offset & Nudge ⇦ ⇨ ⇧ ⇩)
 *   - Logo Resizing & Up/Down Position Adjustment
 *   - Header & Title Up/Down Positioning
 * Matches General Department of Taxation Official Report Format
 */

class ReportsController {
  constructor() {
    this.loadPersistentFilters();
    this.filterDrawerOpen = false;
    this.customConfig = this.loadCustomConfig();
    this.dividerConfig = this.loadDividerConfig();
    this.tableLayout = this.loadTableLayoutConfig();
    this.excludedRecordKeys = new Set(this.loadExcludedKeys());
    this.selectedRecordKeys = new Set();
  }

  loadExcludedKeys() {
    try {
      const saved = sessionStorage.getItem('STAFF_REPORT_EXCLUDED_KEYS');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  saveExcludedKeys() {
    try {
      sessionStorage.setItem('STAFF_REPORT_EXCLUDED_KEYS', JSON.stringify([...this.excludedRecordKeys]));
    } catch (e) {
      console.warn('Error saving excluded keys:', e);
    }
  }

  getRecordKey(item, idx) {
    if (!item) return `row_${idx}`;
    if (item.id) return String(item.id);
    const sid = item.staffId || '';
    const secId = item.secondaryId || '';
    const name = item.latinName || item.khmerName || '';
    const reason = item.requestReason || '';
    return `${sid}__${secId}__${name}__${reason}`.replace(/\s+/g, '_');
  }

  loadPersistentFilters() {
    try {
      const saved = localStorage.getItem('STAFF_REPORT_PERSISTENT_FILTERS');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.selectedReason = parsed.reason || '';
        this.selectedDept = parsed.dept || '';
        this.selectedYear = parsed.year !== undefined ? parsed.year : '';
        this.dateFrom = parsed.dateFrom || '';
        this.dateTo = parsed.dateTo || '';
        return;
      }
    } catch (e) {
      console.warn('Error reading persistent filters:', e);
    }
    this.selectedReason = '';
    this.selectedDept = '';
    this.selectedYear = '';
    this.dateFrom = '';
    this.dateTo = '';
  }

  savePersistentFilters() {
    try {
      localStorage.setItem('STAFF_REPORT_PERSISTENT_FILTERS', JSON.stringify({
        reason: this.selectedReason,
        dept: this.selectedDept,
        year: this.selectedYear,
        dateFrom: this.dateFrom,
        dateTo: this.dateTo
      }));
    } catch (e) {
      console.warn('Error saving persistent filters:', e);
    }
  }

  loadCustomConfig() {
    try {
      const saved = localStorage.getItem('STAFF_REPORT_CUSTOM_CONFIG');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.pageNumberText) parsed.pageNumberText = 'Page 1 of 1';
        return parsed;
      }
    } catch (e) {
      console.warn('Error reading report config:', e);
    }
    return {
      headerLine1: 'ក្រសួងសេដ្ឋកិច្ច និងហិរញ្ញវត្ថុ',
      headerLine2: 'អគ្គនាយកដ្ឋានពន្ធដារ',
      headerLine3: 'នាយកដ្ឋានហិរញ្ញវត្ថុ និងបុគ្គលិក',
      headerLine4: 'លេខៈ.........................អពដ.ហវប',
      kingdomTitle: 'ព្រះរាជាណាចក្រកម្ពុជា',
      kingdomMotto: 'ជាតិ សាសនា ព្រះមហាក្សត្រ',
      pageNumberText: 'Page 1 of 1',
      sig1Header: 'បានឃើញ និងឯកភាព',
      sig1Date: 'ថ្ងៃ........ ខែ........ ឆ្នាំម្សាញ់ សប្តស័ក ព.ស.២៥៦៩',
      sig1Place: 'រាជធានីភ្នំពេញ ថ្ងៃទី..... ខែមករា ឆ្នាំ២០២៦',
      sig1Role: 'ប្រធាននាយកដ្ឋានហិរញ្ញវត្ថុ និងបុគ្គលិក',
      sig2Header: 'បានឃើញ និងពិនិត្យត្រឹមត្រូវ',
      sig2Date: 'ថ្ងៃអង្គារ ៣រោច ខែបុស្ស ឆ្នាំម្សាញ់ សប្តស័ក ព.ស.២៥៦៩',
      sig2Place: 'រាជធានីភ្នំពេញ ថ្ងៃទី០៦ ខែមករា ឆ្នាំ២០២៦',
      sig2Role: 'អនុប្រធាននាយកដ្ឋានហិរញ្ញវត្ថុ និងបុគ្គលិក',
      sig3Header: 'រៀបចំដោយ',
      sig3Date: 'ថ្ងៃអង្គារ ៣រោច ខែបុស្ស ឆ្នាំម្សាញ់ សប្តស័ក ព.ស.២៥៦៩',
      sig3Place: 'រាជធានីភ្នំពេញ ថ្ងៃទី០៦ ខែមករា ឆ្នាំ២០២៦',
      sig3Role: 'ប្រធានការិយាល័យបៀវត្ស'
    };
  }

  loadDividerConfig() {
    try {
      const saved = localStorage.getItem('STAFF_REPORT_DIVIDER_CONFIG');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.align) parsed.align = 'center';
        if (parsed.offsetX === undefined) parsed.offsetX = 0;
        if (parsed.offsetY === undefined) parsed.offsetY = 0;
        if (parsed.kingdomOffsetX === undefined) parsed.kingdomOffsetX = 0;
        if (parsed.kingdomOffsetY === undefined) parsed.kingdomOffsetY = 0;
        return parsed;
      }
    } catch (e) {
      console.warn('Error reading divider config:', e);
    }
    return {
      style: 'royal_filigree',
      primaryColor: '#003366',
      accentColor: '#b8860b',
      width: 140,
      align: 'center',
      offsetX: 0,
      offsetY: 0,
      kingdomOffsetX: 0,
      kingdomOffsetY: 0,
      customImage: ''
    };
  }

  loadTableLayoutConfig() {
    try {
      const saved = localStorage.getItem('STAFF_REPORT_TABLE_LAYOUT');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.colWidths) parsed.colWidths = this.getDefaultColWidths();
        if (!parsed.colAligns) parsed.colAligns = this.getDefaultColAligns();
        if (!parsed.colWraps) parsed.colWraps = this.getDefaultColWraps();
        if (!parsed.fontFamily) parsed.fontFamily = 'Khmer OS Siemreap';
        if (parsed.headerFontSize === undefined) parsed.headerFontSize = 8.5;
        if (parsed.titleFontSize === undefined) parsed.titleFontSize = 12;
        if (parsed.fontSize === undefined) parsed.fontSize = 10;
        if (parsed.fontColor === undefined) parsed.fontColor = '#000000';
        if (!parsed.borderStyle) parsed.borderStyle = 'solid';
        if (parsed.borderWidth === undefined) parsed.borderWidth = 1;
        if (!parsed.borderColor) parsed.borderColor = '#000000';
        if (!parsed.dateFormat) parsed.dateFormat = 'dd-mm-yyyy';
        if (!parsed.paperOrientation) parsed.paperOrientation = 'landscape';
        if (!parsed.paperSize) parsed.paperSize = 'A4';
        if (parsed.showPageNumber === undefined) parsed.showPageNumber = true;
        if (parsed.showRowCheckboxes === undefined) parsed.showRowCheckboxes = true;
        if (parsed.logoOffsetY === undefined) parsed.logoOffsetY = 0;
        if (parsed.logoSize === undefined) parsed.logoSize = 68;
        if (parsed.headerOffsetY === undefined) parsed.headerOffsetY = 0;
        if (parsed.titleOffsetY === undefined) parsed.titleOffsetY = 0;
        if (parsed.headerLeftOffsetX === undefined) parsed.headerLeftOffsetX = 0;
        if (parsed.headerLeftOffsetY === undefined) parsed.headerLeftOffsetY = 0;
        if (!parsed.headerLeftAlign) parsed.headerLeftAlign = 'left';
        if (parsed.sigFontSize === undefined) parsed.sigFontSize = 9.5;
        if (!parsed.sigFontFamily) parsed.sigFontFamily = 'Khmer OS Siemreap';
        if (parsed.sigOffsetX === undefined) parsed.sigOffsetX = 0;
        if (parsed.sigOffsetY === undefined) parsed.sigOffsetY = 0;
        if (parsed.sigSpaceHeight === undefined) parsed.sigSpaceHeight = 38;
        if (parsed.sigCol1OffsetX === undefined) parsed.sigCol1OffsetX = 0;
        if (parsed.sigCol2OffsetX === undefined) parsed.sigCol2OffsetX = 0;
        if (parsed.sigCol3OffsetX === undefined) parsed.sigCol3OffsetX = 0;
        if (parsed.pageNumberOffsetX === undefined) parsed.pageNumberOffsetX = 0;
        if (parsed.pageNumberOffsetY === undefined) parsed.pageNumberOffsetY = 0;
        if (!parsed.pageNumberAlign) parsed.pageNumberAlign = 'center';
        if (parsed.pageNumberFontSize === undefined) parsed.pageNumberFontSize = 8.5;
        return parsed;
      }
    } catch (e) {
      console.warn('Error reading table layout config:', e);
    }
    return {
      headerFontSize: 8.5,
      titleFontSize: 12,
      fontSize: 10,
      fontColor: '#000000',
      borderStyle: 'solid',
      borderWidth: 1,
      borderColor: '#000000',
      rowDensity: 'normal',
      textWrap: 'wrap',
      fontFamily: 'Khmer OS Siemreap',
      dateFormat: 'dd-mm-yyyy',
      paperOrientation: 'landscape',
      paperSize: 'A4',
      showPageNumber: true,
      showRowCheckboxes: true,
      logoOffsetY: 0,
      logoSize: 68,
      headerOffsetY: 0,
      titleOffsetY: 0,
      headerLeftOffsetX: 0,
      headerLeftOffsetY: 0,
      headerLeftAlign: 'left',
      sigFontSize: 9.5,
      sigFontFamily: 'Khmer OS Siemreap',
      sigOffsetX: 0,
      sigOffsetY: 0,
      sigSpaceHeight: 38,
      sigCol1OffsetX: 0,
      sigCol2OffsetX: 0,
      sigCol3OffsetX: 0,
      pageNumberOffsetX: 0,
      pageNumberOffsetY: 0,
      pageNumberAlign: 'center',
      pageNumberFontSize: 8.5,
      colWidths: this.getDefaultColWidths(),
      colAligns: this.getDefaultColAligns(),
      colWraps: this.getDefaultColWraps()
    };
  }

  getDefaultColWidths() {
    return {
      col1: 36,   // ល.រ
      col2: 85,   // អត្តលេខ កសហវ
      col3: 125,  // នាម-គោត្តនាម (អក្សរឡាតាំង)
      col4: 120,  // នាម-គោត្តនាម (ភាសាខ្មែរ)
      col5: 70,   // អត្តលេខ អពដ
      col6: 36,   // ភេទ
      col7: 85,   // ថ្ងៃខែឆ្នាំ កំណើត
      col8: 145,  // អង្គភាព
      col9: 85,   // តួនាទី
      col10: 85,  // ថ្ងៃខែឆ្នាំ បម្រើការងារ
      col11: 85,  // ថ្ងៃខែឆ្នាំ លុបឈ្មោះ/បញ្ចប់
      col12: 215  // ផ្សេងៗ
    };
  }

  getDefaultColAligns() {
    return {
      col1: 'center',
      col2: 'center',
      col3: 'left',
      col4: 'left',
      col5: 'center',
      col6: 'center',
      col7: 'center',
      col8: 'left',
      col9: 'center',
      col10: 'center',
      col11: 'center',
      col12: 'left'
    };
  }

  getDefaultColWraps() {
    return {
      col1: 'nowrap',
      col2: 'nowrap',
      col3: 'nowrap',
      col4: 'nowrap',
      col5: 'nowrap',
      col6: 'nowrap',
      col7: 'nowrap',
      col8: 'wrap',
      col9: 'nowrap',
      col10: 'nowrap',
      col11: 'nowrap',
      col12: 'wrap'
    };
  }

  saveTableLayoutConfig() {
    try {
      localStorage.setItem('STAFF_REPORT_TABLE_LAYOUT', JSON.stringify(this.tableLayout));
    } catch (e) {
      console.warn('Error saving table layout config:', e);
    }
  }

  saveDividerConfig() {
    try {
      localStorage.setItem('STAFF_REPORT_DIVIDER_CONFIG', JSON.stringify(this.dividerConfig));
    } catch (e) {
      console.warn('Error saving divider config:', e);
    }
  }

  saveCustomConfig() {
    try {
      localStorage.setItem('STAFF_REPORT_CUSTOM_CONFIG', JSON.stringify(this.customConfig));
    } catch (e) {
      console.warn('Error saving report config:', e);
    }
  }

  saveFieldEdit(key, value) {
    if (value === undefined || value === null) return;
    this.customConfig[key] = value.replace(/[\r\n]+$/, '');
    this.saveCustomConfig();
  }

  /* ---------------- Admin Permission Verification ---------------- */
  requireAdminPermission({ title, subtitle, message, submitText, onAuthorized }) {
    const modal = document.getElementById('report-admin-permission-modal');
    if (!modal) {
      if (onAuthorized) onAuthorized();
      return;
    }

    this._adminPendingAction = onAuthorized;

    const titleEl = document.getElementById('report-admin-perm-title');
    const subEl = document.getElementById('report-admin-perm-subtitle');
    const msgEl = document.getElementById('report-admin-perm-message');
    const btnTextEl = document.getElementById('report-admin-perm-submit-btn-text');
    const passInput = document.getElementById('report-admin-perm-password-input');
    const errEl = document.getElementById('report-admin-perm-error');

    if (titleEl) titleEl.textContent = title || 'ផ្ទៀងផ្ទាត់សិទ្ធិអ្នកគ្រប់គ្រង (Admin Permission)';
    if (subEl) subEl.textContent = subtitle || 'សូមបញ្ចូលពាក្យសម្ងាត់ Admin ដើម្បីអនុញ្ញាត';
    if (msgEl) msgEl.innerHTML = message || '⚠️ ការកំណត់ទៅលំនាំដើមវិញ (Reset to Default) នឹងលុបការកែប្រែទម្រង់តារាង ទំហំអក្សរ ហត្ថលេខា និង Logo ទាំងអស់។';
    if (btnTextEl) btnTextEl.textContent = submitText || 'បញ្ជាក់ & កំណត់ដើម (Confirm Reset)';
    if (passInput) {
      passInput.value = '';
      passInput.type = 'password';
    }
    if (errEl) errEl.style.display = 'none';

    modal.style.display = 'flex';
    if (passInput) {
      setTimeout(() => passInput.focus(), 80);
    }
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  closeAdminPermissionModal() {
    const modal = document.getElementById('report-admin-permission-modal');
    if (modal) modal.style.display = 'none';
    this._adminPendingAction = null;
  }

  toggleAdminPasswordVisibility() {
    const passInput = document.getElementById('report-admin-perm-password-input');
    const eyeIcon = document.getElementById('report-admin-perm-eye-icon');
    if (!passInput) return;

    if (passInput.type === 'password') {
      passInput.type = 'text';
      if (eyeIcon) eyeIcon.setAttribute('data-lucide', 'eye-off');
    } else {
      passInput.type = 'password';
      if (eyeIcon) eyeIcon.setAttribute('data-lucide', 'eye');
    }
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  submitAdminPermission() {
    const passInput = document.getElementById('report-admin-perm-password-input');
    const errEl = document.getElementById('report-admin-perm-error');
    if (!passInput) return;

    const enteredPassword = passInput.value.trim();

    // Verify against active system admin accounts
    let adminPasswords = ['Password123!', 'admin', '123456', 'admin123', 'admin@123'];
    try {
      if (typeof settingsModalController !== 'undefined' && settingsModalController.getUserAccounts) {
        const users = settingsModalController.getUserAccounts();
        const admins = users.filter(u => u.role === 'ADMIN' || u.username === 'admin');
        admins.forEach(a => {
          if (a.password) adminPasswords.push(a.password);
        });
      } else {
        const raw = localStorage.getItem('STAFF_CONTROL_ACCOUNTS_V1');
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.filter(u => u.role === 'ADMIN' || u.username === 'admin').forEach(a => {
            if (a.password) adminPasswords.push(a.password);
          });
        }
      }
    } catch (e) {}

    const isValid = adminPasswords.includes(enteredPassword);

    if (!isValid) {
      if (errEl) errEl.style.display = 'block';
      passInput.focus();
      passInput.select();
      return;
    }

    if (errEl) errEl.style.display = 'none';
    const action = this._adminPendingAction;
    this.closeAdminPermissionModal();

    if (action && typeof action === 'function') {
      action();
    }
  }

  resetToDefaultTemplate() {
    this.requireAdminPermission({
      title: '🔒 ការអនុញ្ញាតពី Admin (Reset Report Template)',
      subtitle: 'ផ្ទៀងផ្ទាត់ពាក្យសម្ងាត់ Admin មុននឹងកំណត់គំរូលំនាំដើម',
      message: '⚠️ លោកអ្នកកំពុងស្នើសុំកំណត់ <strong>ក្បាលលិខិត ហត្ថលេខា Logo បន្ទាត់ក្បាច់ និងទម្រង់តារាងទាំងអស់</strong> ទៅលំនាំដើមរបស់ប្រព័ន្ធវិញ។',
      submitText: 'បញ្ជាក់ & កំណត់លំនាំដើម',
      onAuthorized: () => {
        localStorage.removeItem('STAFF_REPORT_CUSTOM_CONFIG');
        localStorage.removeItem('STAFF_REPORT_CUSTOM_LOGO');
        localStorage.removeItem('STAFF_REPORT_DIVIDER_CONFIG');
        localStorage.removeItem('STAFF_REPORT_TABLE_LAYOUT');
        sessionStorage.removeItem('STAFF_REPORT_EXCLUDED_KEYS');
        this.excludedRecordKeys.clear();
        this.selectedRecordKeys.clear();
        this.customConfig = this.loadCustomConfig();
        this.dividerConfig = this.loadDividerConfig();
        this.tableLayout = this.loadTableLayoutConfig();
        this.renderReport();
        this.syncPersistentToolbarUI();
        this.updateMasterFilterPills();
        if (typeof auditLogger !== 'undefined' && auditLogger.log) {
          auditLogger.log('ADMIN_RESET_REPORT_LAYOUT', 'REPORT', 'Admin បានផ្ទៀងផ្ទាត់ពាក្យសម្ងាត់ និងកំណត់ទម្រង់របាយការណ៍ទៅលំនាំដើម');
        }
        if (typeof app !== 'undefined' && app.showToast) {
          app.showToast('✅ បានផ្ទៀងផ្ទាត់សិទ្ធិ Admin និងកំណត់ក្បាលលិខិត ហត្ថលេខា Logo និងទំហំតារាងទៅលំនាំដើមវិញជោគជ័យ!', 'success');
        }
      }
    });
  }

  init() {
    this.populateReportFilters();
    this.syncPersistentToolbarUI();
    this.updateMasterFilterPills();
    this.renderReport();
  }

  /* ---------------- Typography & Styling Controls ---------------- */
  getFontFamilyStack(fontName) {
    if (!fontName) fontName = 'Khmer OS Siemreap';
    if (fontName === 'Khmer OS Muol Light' || fontName === 'Khmer OS Muol' || fontName === 'Moul') {
      return `'Khmer OS Muol Light', 'Khmer OS Muol', 'Moul', 'Moulpali', 'Koulen', 'Siemreap', sans-serif`;
    }
    if (fontName === 'Khmer OS Battambang' || fontName === 'Battambang') {
      return `'Khmer OS Battambang', 'Battambang', 'Khmer OS Siemreap', 'Siemreap', 'Kantumruy Pro', sans-serif`;
    }
    if (fontName === 'Kantumruy Pro') {
      return `'Kantumruy Pro', 'Khmer OS Siemreap', 'Siemreap', 'Battambang', sans-serif`;
    }
    return `'Khmer OS Siemreap', 'Siemreap', 'Khmer OS Battambang', 'Battambang', 'Kantumruy Pro', sans-serif`;
  }

  setFontFamily(font) {
    this.tableLayout.fontFamily = font;
    this.saveTableLayoutConfig();
    this.renderReport();
    this.syncPersistentToolbarUI();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`🔤 បានប្តូរពុម្ពអក្សរទៅជា ${font}!`, 'success');
    }
  }

  setFontSize(val) {
    let size = parseFloat(val);
    if (isNaN(size)) size = 10;
    size = Math.min(20, Math.max(6, parseFloat(size.toFixed(1))));
    this.tableLayout.fontSize = size;
    this.saveTableLayoutConfig();
    this.renderReport();
    this.syncPersistentToolbarUI();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`🔤 ទំហំអក្សរតារាង: ${size}pt`, 'info');
    }
  }

  changeFontSize(delta) {
    let current = parseFloat(this.tableLayout.fontSize) || 10;
    current = Math.min(20, Math.max(6, parseFloat((current + delta).toFixed(1))));
    this.tableLayout.fontSize = current;
    this.saveTableLayoutConfig();
    this.renderReport();
    this.syncPersistentToolbarUI();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`🔤 ទំហំអក្សរតារាង: ${current}pt`, 'info');
    }
  }

  setHeaderFontSize(val) {
    let size = parseFloat(val);
    if (isNaN(size)) size = 8.5;
    size = Math.min(20, Math.max(6, parseFloat(size.toFixed(1))));
    this.tableLayout.headerFontSize = size;
    this.saveTableLayoutConfig();
    this.renderReport();
    this.syncPersistentToolbarUI();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`🏛️ ទំហំអក្សរក្បាលស្ថាប័ន: ${size}pt`, 'info');
    }
  }

  changeHeaderFontSize(delta) {
    let current = parseFloat(this.tableLayout.headerFontSize) || 8.5;
    current = Math.min(20, Math.max(6, parseFloat((current + delta).toFixed(1))));
    this.tableLayout.headerFontSize = current;
    this.saveTableLayoutConfig();
    this.renderReport();
    this.syncPersistentToolbarUI();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`🏛️ ទំហំអក្សរក្បាលស្ថាប័ន: ${current}pt`, 'info');
    }
  }

  setTitleFontSize(val) {
    let size = parseFloat(val);
    if (isNaN(size)) size = 12;
    size = Math.min(28, Math.max(8, parseFloat(size.toFixed(1))));
    this.tableLayout.titleFontSize = size;
    this.saveTableLayoutConfig();
    this.renderReport();
    this.syncPersistentToolbarUI();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`🏷️ ទំហំអក្សរចំណងជើង: ${size}pt`, 'info');
    }
  }

  changeTitleFontSize(delta) {
    let current = parseFloat(this.tableLayout.titleFontSize) || 12;
    current = Math.min(28, Math.max(8, parseFloat((current + delta).toFixed(1))));
    this.tableLayout.titleFontSize = current;
    this.saveTableLayoutConfig();
    this.renderReport();
    this.syncPersistentToolbarUI();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`🏷️ ទំហំអក្សរចំណងជើង: ${current}pt`, 'info');
    }
  }

  setSigFontSize(val) {
    let size = parseFloat(val);
    if (isNaN(size)) size = 9.5;
    size = Math.min(20, Math.max(6, parseFloat(size.toFixed(1))));
    this.tableLayout.sigFontSize = size;
    this.saveTableLayoutConfig();
    this.renderReport();
    this.syncPersistentToolbarUI();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`✍️ ទំហំអក្សរហត្ថលេខា: ${size}pt`, 'info');
    }
  }

  changeSigFontSize(delta) {
    let current = parseFloat(this.tableLayout.sigFontSize) || 9.5;
    current = Math.min(20, Math.max(6, parseFloat((current + delta).toFixed(1))));
    this.tableLayout.sigFontSize = current;
    this.saveTableLayoutConfig();
    this.renderReport();
    this.syncPersistentToolbarUI();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`✍️ ទំហំអក្សរហត្ថលេខា: ${current}pt`, 'info');
    }
  }

  setFontColor(color) {
    this.tableLayout.fontColor = color;
    this.saveTableLayoutConfig();
    this.renderReport();
    this.syncPersistentToolbarUI();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`🎨 បានប្តូរពណ៌អក្សរទៅជា ${color}!`, 'info');
    }
  }

  setBorderStyle(style) {
    this.tableLayout.borderStyle = style;
    this.saveTableLayoutConfig();
    this.renderReport();
    this.syncPersistentToolbarUI();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`📏 ទម្រង់បន្ទាត់តារាង: ${style}`, 'info');
    }
  }

  setBorderWidth(width) {
    this.tableLayout.borderWidth = parseFloat(width) || 1;
    this.saveTableLayoutConfig();
    this.renderReport();
    this.syncPersistentToolbarUI();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`📏 កម្រាស់បន្ទាត់: ${width}px`, 'info');
    }
  }

  setBorderColor(color) {
    this.tableLayout.borderColor = color;
    this.saveTableLayoutConfig();
    this.renderReport();
    this.syncPersistentToolbarUI();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`🎨 បានប្តូរពណ៌បន្ទាត់តារាងទៅជា ${color}!`, 'info');
    }
  }

  setDateFormat(fmt) {
    this.tableLayout.dateFormat = fmt;
    this.saveTableLayoutConfig();
    this.renderReport();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`📅 បានប្តូរទម្រង់កាលបរិច្ឆេទទៅជា ${fmt}!`, 'success');
    }
  }

  setRowDensity(density) {
    this.tableLayout.rowDensity = density;
    this.saveTableLayoutConfig();
    this.renderReport();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`↕️ បានកំណត់កម្ពស់ជួរ: ${density === 'compact' ? 'បង្រួម (Compact)' : density === 'spacious' ? 'ទូលាយ (Spacious)' : 'ស្តង់ដារ (Normal)'}`, 'info');
    }
  }

  /* ---------------- Row Selection, Tickbox & Delete Functions ---------------- */
  toggleRowCheckboxes() {
    this.tableLayout.showRowCheckboxes = !this.tableLayout.showRowCheckboxes;
    this.saveTableLayoutConfig();
    this.renderReport();
    this.syncPersistentToolbarUI();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(this.tableLayout.showRowCheckboxes ? '☑️ បានបើកប្រអប់ជ្រើសរើស/លុបជួរ (Row Selector Enabled)!' : '🚫 បានបិទប្រអប់ជ្រើសរើស/លុបជួរ (Row Selector Hidden)!', 'info');
    }
  }

  toggleSelectRow(key, isChecked) {
    if (isChecked) {
      this.selectedRecordKeys.add(key);
    } else {
      this.selectedRecordKeys.delete(key);
    }
    this.updateSelectionBarUI();
  }

  toggleSelectAllReason(reasonName, isChecked) {
    const grouped = this.getGroupedDataByReason();
    const items = grouped[reasonName] || [];
    items.forEach((item, idx) => {
      const key = this.getRecordKey(item, idx);
      if (isChecked) {
        this.selectedRecordKeys.add(key);
      } else {
        this.selectedRecordKeys.delete(key);
      }
    });
    this.renderReport();
  }

  excludeRecord(key) {
    this.excludedRecordKeys.add(key);
    this.selectedRecordKeys.delete(key);
    this.saveExcludedKeys();
    this.renderReport();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast('🗑️ បានលុប/លាក់ជួរចេញពីរបាយការណ៍!', 'info');
    }
  }

  deleteSelectedRows() {
    const count = this.selectedRecordKeys.size;
    if (count === 0) return;
    this.selectedRecordKeys.forEach(k => this.excludedRecordKeys.add(k));
    this.selectedRecordKeys.clear();
    this.saveExcludedKeys();
    this.renderReport();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`🗑️ បានលុប/លាក់ ${count} ជួរចេញពីរបាយការណ៍!`, 'success');
    }
  }

  restoreExcludedRows() {
    const count = this.excludedRecordKeys.size;
    this.excludedRecordKeys.clear();
    this.selectedRecordKeys.clear();
    this.saveExcludedKeys();
    this.renderReport();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`🔄 បានស្តារឡើងវិញនូវ ${count} ជួរដែលបានលុប/លាក់!`, 'success');
    }
  }

  clearSelection() {
    this.selectedRecordKeys.clear();
    this.renderReport();
  }

  updateSelectionBarUI() {
    const bar = document.getElementById('report-selection-action-bar-container');
    if (bar) {
      bar.innerHTML = this.getSelectionBarHtml();
    }
  }

  getSelectionBarHtml() {
    const selCount = this.selectedRecordKeys.size;
    const excCount = this.excludedRecordKeys.size;
    if (selCount === 0 && excCount === 0) return '';

    return `
      <div class="report-selection-action-bar no-print">
        <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
          ${selCount > 0 ? `
            <span class="badge" style="background: #ef4444; color: white; font-weight: 700; font-size: 0.78rem; padding: 3px 8px; border-radius: 6px;">
              ☑️ បានជ្រើស ${selCount} ជួរ (Selected)
            </span>
            <button type="button" class="btn btn-danger btn-sm" onclick="reportsController.deleteSelectedRows()" style="display: flex; align-items: center; gap: 0.35rem; font-weight: 700; font-size: 0.76rem; padding: 4px 10px;">
              <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>
              <span>🗑️ លុបជួរដែលបានជ្រើស (${selCount})</span>
            </button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="reportsController.clearSelection()" style="font-weight: 700; font-size: 0.76rem; padding: 4px 8px;">
              ✕ ដោះការជ្រើសរើស
            </button>
          ` : ''}
          ${excCount > 0 ? `
            <button type="button" class="btn btn-warning btn-sm" onclick="reportsController.restoreExcludedRows()" style="display: flex; align-items: center; gap: 0.35rem; font-weight: 700; font-size: 0.76rem; padding: 4px 10px; margin-left: auto;">
              <i data-lucide="rotate-ccw" style="width: 13px; height: 13px;"></i>
              <span>🔄 ស្តារឡើងវិញ (${excCount} ជួរដែលបានលាក់)</span>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  /* ---------------- Page Number Position & Alignment Controls ---------------- */
  setPageNumberOffsetX(val) {
    this.tableLayout.pageNumberOffsetX = parseInt(val, 10) || 0;
    this.saveTableLayoutConfig();
    this.renderReport();
  }

  setPageNumberOffsetY(val) {
    this.tableLayout.pageNumberOffsetY = parseInt(val, 10) || 0;
    this.saveTableLayoutConfig();
    this.renderReport();
  }

  setPageNumberAlign(align) {
    this.tableLayout.pageNumberAlign = align;
    this.saveTableLayoutConfig();
    this.renderReport();
    if (typeof app !== 'undefined' && app.showToast) {
      const alignKh = align === 'left' ? 'ខាងឆ្វេង (Left)' : align === 'right' ? 'ខាងស្តាំ (Right)' : 'កណ្តាល (Center)';
      app.showToast(`📄 បានតម្រឹមលេខទំព័រទៅ ${alignKh}!`, 'info');
    }
  }

  nudgePageNumberPosition(dx, dy) {
    this.tableLayout.pageNumberOffsetX = (this.tableLayout.pageNumberOffsetX || 0) + dx;
    this.tableLayout.pageNumberOffsetY = (this.tableLayout.pageNumberOffsetY || 0) + dy;
    this.saveTableLayoutConfig();
    this.renderReport();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`📍 ទីតាំងលេខទំព័រ: X=${this.tableLayout.pageNumberOffsetX}px, Y=${this.tableLayout.pageNumberOffsetY}px`, 'info');
    }
  }

  /* ---------------- Signatures Block Position, Font & Size Controls ---------------- */
  changeSigFontSize(delta) {
    let current = this.tableLayout.sigFontSize || 9.5;
    current = Math.min(16, Math.max(7, parseFloat((current + delta).toFixed(1))));
    this.tableLayout.sigFontSize = current;
    this.saveTableLayoutConfig();
    this.renderReport();
    this.syncPersistentToolbarUI();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`✍️ ទំហំអក្សរហត្ថលេខា: ${current}pt`, 'info');
    }
  }

  setSigFontFamily(font) {
    this.tableLayout.sigFontFamily = font;
    this.saveTableLayoutConfig();
    this.renderReport();
    this.syncPersistentToolbarUI();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`🔤 បានប្តូរពុម្ពអក្សរហត្ថលេខាទៅជា ${font}!`, 'success');
    }
  }

  setSigOffsetX(val) {
    this.tableLayout.sigOffsetX = parseInt(val, 10) || 0;
    this.saveTableLayoutConfig();
    this.renderReport();
  }

  setSigOffsetY(val) {
    this.tableLayout.sigOffsetY = parseInt(val, 10) || 0;
    this.saveTableLayoutConfig();
    this.renderReport();
  }

  nudgeSigPosition(dx, dy) {
    this.tableLayout.sigOffsetX = (this.tableLayout.sigOffsetX || 0) + dx;
    this.tableLayout.sigOffsetY = (this.tableLayout.sigOffsetY || 0) + dy;
    this.saveTableLayoutConfig();
    this.renderReport();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`📍 ទីតាំងហត្ថលេខា: X=${this.tableLayout.sigOffsetX}px, Y=${this.tableLayout.sigOffsetY}px`, 'info');
    }
  }

  changeSigSpaceHeight(delta) {
    let current = this.tableLayout.sigSpaceHeight || 38;
    current = Math.min(150, Math.max(15, current + delta));
    this.tableLayout.sigSpaceHeight = current;
    this.saveTableLayoutConfig();
    this.renderReport();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`↕️ កម្ពស់កន្លែងស៊ីញ៉េ: ${current}px`, 'info');
    }
  }

  /* ---------------- Paper Orientation & Paper Size Controls ---------------- */
  setPaperOrientation(orientation) {
    this.tableLayout.paperOrientation = orientation;
    this.saveTableLayoutConfig();
    this.renderReport();
    this.syncPersistentToolbarUI();
    if (typeof app !== 'undefined' && app.showToast) {
      const oriKh = orientation === 'portrait' ? '📄 ទំព័របញ្ឈរ (Portrait - A4)' : '🖼️ ទំព័រផ្ដេក (Landscape - A4)';
      app.showToast(`📐 បានប្តូរទិសដៅក្រដាសទៅជា ${oriKh}!`, 'success');
    }
  }

  setPaperSize(size) {
    this.tableLayout.paperSize = size;
    this.saveTableLayoutConfig();
    this.renderReport();
    this.syncPersistentToolbarUI();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`📏 បានជ្រើសរើសទំហំក្រដាស ${size}!`, 'info');
    }
  }

  /* ---------------- Single Unified Master Toolbar & Filter Drawer ---------------- */
  toggleFilterDrawer() {
    const drawer = document.getElementById('report-filters-drawer');
    const arrow = document.getElementById('filter-toggle-arrow');
    if (!drawer) return;

    this.filterDrawerOpen = drawer.style.display === 'none' || drawer.classList.contains('hidden');
    if (this.filterDrawerOpen) {
      drawer.style.display = 'block';
      drawer.classList.remove('hidden');
      if (arrow) arrow.innerHTML = '<i data-lucide="filter" style="width: 13px; height: 13px;"></i> <span>តម្រង ▴</span>';
    } else {
      drawer.style.display = 'none';
      drawer.classList.add('hidden');
      if (arrow) arrow.innerHTML = '<i data-lucide="filter" style="width: 13px; height: 13px;"></i> <span>តម្រង ▾</span>';
    }
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  closeFilterDrawer() {
    const drawer = document.getElementById('report-filters-drawer');
    const arrow = document.getElementById('filter-toggle-arrow');
    if (drawer) {
      drawer.style.display = 'none';
      drawer.classList.add('hidden');
    }
    this.filterDrawerOpen = false;
    if (arrow) arrow.innerHTML = '<i data-lucide="filter" style="width: 13px; height: 13px;"></i> <span>តម្រង ▾</span>';
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  updateMasterFilterPills() {
    const badgeReason = document.getElementById('master-filter-reason-badge');
    const badgeYear = document.getElementById('master-filter-year-badge');
    const badgeCount = document.getElementById('master-filter-count-badge');
    
    if (badgeReason) badgeReason.textContent = this.selectedReason || 'គ្រប់មូលហេតុទាំងអស់ (បំបែកតាមលក្ខខណ្ឌ)';
    if (badgeYear) badgeYear.textContent = this.selectedYear ? `ឆ្នាំ ${this.selectedYear}` : 'គ្រប់ឆ្នាំ';
    if (badgeCount) {
      const count = this.getFilteredData().length;
      badgeCount.textContent = `${count} នាក់`;
    }
  }

  populateReportFilters() {
    const settings = (typeof dataStore !== 'undefined' && dataStore.getSettings) ? dataStore.getSettings() : {};
    
    // 1. Request Reasons Dropdown
    const reasonSelect = document.getElementById('report-filter-reason');
    if (reasonSelect) {
      reasonSelect.innerHTML = '<option value="">-- មូលហេតុនៃសំណើទាំងអស់ (បោះពុម្ពបំបែកសន្លឹក) --</option>';
      const reasons = settings.requestReasons || [];
      reasons.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r;
        opt.textContent = r;
        reasonSelect.appendChild(opt);
      });
      if (this.selectedReason) {
        reasonSelect.value = this.selectedReason;
      }
    }

    // 2. Department Dropdown
    const deptSelect = document.getElementById('report-filter-dept');
    if (deptSelect) {
      deptSelect.innerHTML = '<option value="">-- គ្រប់អង្គភាព/នាយកដ្ឋាន (All Departments) --</option>';
      const depts = settings.departments || [];
      depts.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        deptSelect.appendChild(opt);
      });
      if (this.selectedDept) {
        deptSelect.value = this.selectedDept;
      }
    }

    // 3. Annual Period / Year Dropdown
    const yearSelect = document.getElementById('report-filter-year');
    if (yearSelect) {
      yearSelect.innerHTML = '<option value="">-- គ្រប់ឆ្នាំ (All Years) --</option>';
      const years = settings.annualPeriods || ['2024', '2025', '2026', '2027', '2028'];
      years.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = `ឆ្នាំ ${y}`;
        yearSelect.appendChild(opt);
      });
      if (this.selectedYear) {
        yearSelect.value = this.selectedYear;
      } else {
        yearSelect.value = '';
      }
    }

    // 4. Date From & To Inputs
    const fromInput = document.getElementById('report-filter-from');
    const toInput = document.getElementById('report-filter-to');
    if (fromInput && this.dateFrom) fromInput.value = this.dateFrom;
    if (toInput && this.dateTo) toInput.value = this.dateTo;
  }

  handleFilterChange() {
    const reasonSelect = document.getElementById('report-filter-reason');
    const deptSelect = document.getElementById('report-filter-dept');
    const yearSelect = document.getElementById('report-filter-year');
    const fromInput = document.getElementById('report-filter-from');
    const toInput = document.getElementById('report-filter-to');

    this.selectedReason = reasonSelect ? reasonSelect.value : '';
    this.selectedDept = deptSelect ? deptSelect.value : '';
    this.selectedYear = yearSelect ? yearSelect.value : '';
    this.dateFrom = fromInput ? fromInput.value : '';
    this.dateTo = toInput ? toInput.value : '';

    this.savePersistentFilters();
    this.updateMasterFilterPills();
    this.renderReport();
  }

  resetFilters() {
    this.selectedReason = '';
    this.selectedDept = '';
    this.selectedYear = '';
    this.dateFrom = '';
    this.dateTo = '';

    const reasonSelect = document.getElementById('report-filter-reason');
    const deptSelect = document.getElementById('report-filter-dept');
    const yearSelect = document.getElementById('report-filter-year');
    const fromInput = document.getElementById('report-filter-from');
    const toInput = document.getElementById('report-filter-to');

    if (reasonSelect) reasonSelect.value = '';
    if (deptSelect) deptSelect.value = '';
    if (yearSelect) yearSelect.value = '';
    if (fromInput) fromInput.value = '';
    if (toInput) toInput.value = '';

    this.savePersistentFilters();
    this.updateMasterFilterPills();
    this.renderReport();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast('🧹 បានសម្អាតតម្រងទាំងអស់!', 'info');
    }
  }

  clearAllSelectionsAndFilters() {
    this.selectedReason = '';
    this.selectedDept = '';
    this.selectedYear = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.selectedRecordKeys.clear();
    this.excludedRecordKeys.clear();
    sessionStorage.removeItem('STAFF_REPORT_EXCLUDED_KEYS');

    const reasonSelect = document.getElementById('report-filter-reason');
    const deptSelect = document.getElementById('report-filter-dept');
    const yearSelect = document.getElementById('report-filter-year');
    const fromInput = document.getElementById('report-filter-from');
    const toInput = document.getElementById('report-filter-to');

    if (reasonSelect) reasonSelect.value = '';
    if (deptSelect) deptSelect.value = '';
    if (yearSelect) yearSelect.value = '';
    if (fromInput) fromInput.value = '';
    if (toInput) toInput.value = '';

    this.savePersistentFilters();
    this.updateMasterFilterPills();
    this.renderReport();
  }

  toKhmerNumber(num) {
    if (num === null || num === undefined) return '';
    const khDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
    return String(num).replace(/[0-9]/g, (d) => khDigits[parseInt(d, 10)]);
  }

  getFilteredData() {
    const allRecords = (typeof dataStore !== 'undefined' && dataStore.getStaffData) ? dataStore.getStaffData() : [];
    
    return allRecords.filter((item, idx) => {
      // 0. Exclude dynamically deleted/hidden rows
      const key = this.getRecordKey(item, idx);
      if (this.excludedRecordKeys && this.excludedRecordKeys.has(key)) {
        return false;
      }

      // 1. Filter by Request Reason
      if (this.selectedReason) {
        const recReason = (item.requestReason || '').trim();
        if (recReason !== this.selectedReason && !recReason.includes(this.selectedReason)) {
          return false;
        }
      }

      // 2. Filter by Department
      if (this.selectedDept) {
        if ((item.department || '').trim() !== this.selectedDept) {
          return false;
        }
      }

      // 3. Filter by Year / Annual Period
      if (this.selectedYear) {
        const itemYear = String(item.annualPeriod || '');
        const reqDate = item.requestDate ? String(item.requestDate) : '';
        const endDate = item.endDate ? String(item.endDate) : '';
        if (!itemYear.includes(this.selectedYear) && !reqDate.includes(this.selectedYear) && !endDate.includes(this.selectedYear)) {
          return false;
        }
      }

      // 4. Filter by Date Range (From Date to To Date)
      if (this.dateFrom) {
        const targetDate = item.endDate || item.requestDate || item.startDate;
        if (targetDate && targetDate < this.dateFrom) {
          return false;
        }
      }
      if (this.dateTo) {
        const targetDate = item.endDate || item.requestDate || item.startDate;
        if (targetDate && targetDate > this.dateTo) {
          return false;
        }
      }

      return true;
    });
  }

  getGroupedDataByReason() {
    const allData = this.getFilteredData();
    const settings = (typeof dataStore !== 'undefined' && dataStore.getSettings) ? dataStore.getSettings() : {};
    const defaultReasons = settings.requestReasons || [
      'លុបឈ្មោះ', 'ចូលនិវត្តន៍', 'ស្នើសុំលាឈប់', 'ព្យួរការងារ', 'ចូលបម្រើការងារវិញ',
      'មរណភាព', 'ផ្ទេរទៅអង្គភាពដទៃ', 'បន្តការសិក្សា', 'ស្ថិតនៅក្រៅក្របខ័ណ្ឌដើម', 'ព្យួរការងារដោយបញ្ញត្តិ'
    ];

    const groups = {};
    allData.forEach(item => {
      let r = (item.requestReason || 'ផ្សេងៗ').trim();
      if (!groups[r]) groups[r] = [];
      groups[r].push(item);
    });

    if (this.selectedReason) {
      const filteredGroups = {};
      Object.keys(groups).forEach(r => {
        if ((r === this.selectedReason || r.includes(this.selectedReason)) && groups[r] && groups[r].length > 0) {
          filteredGroups[r] = groups[r];
        }
      });
      return filteredGroups;
    }

    const orderedGroups = {};
    defaultReasons.forEach(r => {
      if (groups[r] && groups[r].length > 0) {
        orderedGroups[r] = groups[r];
        delete groups[r];
      }
    });
    Object.keys(groups).forEach(r => {
      if (groups[r] && groups[r].length > 0) {
        orderedGroups[r] = groups[r];
      }
    });

    return orderedGroups;
  }

  formatReportDate(val) {
    if (!val) return '-';
    if (typeof StatusCalculator !== 'undefined' && StatusCalculator.normalizeDate) {
      const iso = StatusCalculator.normalizeDate(val);
      if (!iso) return '-';
      const parts = iso.split('-');
      if (parts.length === 3) {
        const d = parts[2].padStart(2, '0');
        const m = parts[1].padStart(2, '0');
        const y = parts[0];
        const fmt = this.tableLayout ? (this.tableLayout.dateFormat || 'dd-mm-yyyy') : 'dd-mm-yyyy';

        if (fmt === 'dd/mm/yyyy') {
          return `${d}/${m}/${y}`;
        }
        if (fmt === 'dd/mmm/yyyy') {
          const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const mIdx = parseInt(parts[1], 10) - 1;
          const monthName = (mIdx >= 0 && mIdx < 12) ? monthsEn[mIdx] : parts[1];
          return `${d}/${monthName}/${y}`;
        }
        return `${d}-${m}-${y}`;
      }
    }
    return val;
  }

  formatGenderShort(val) {
    if (!val) return '-';
    const str = String(val).trim().toLowerCase();
    if (str === 'm' || str === 'male' || str.includes('ប្រុស') || str === 'ប') return 'ប';
    if (str === 'f' || str === 'female' || str.includes('ស្រី') || str === 'ស') return 'ស';
    return val;
  }

  /* ---------------- Ministry / Left Header Offset & Alignment Controls ---------------- */
  setHeaderLeftOffsetX(val) {
    this.tableLayout.headerLeftOffsetX = parseInt(val, 10) || 0;
    this.saveTableLayoutConfig();
    this.renderReport();
  }

  setHeaderLeftOffsetY(val) {
    this.tableLayout.headerLeftOffsetY = parseInt(val, 10) || 0;
    this.saveTableLayoutConfig();
    this.renderReport();
  }

  setHeaderLeftAlign(align) {
    this.tableLayout.headerLeftAlign = align;
    this.saveTableLayoutConfig();
    this.renderReport();
    if (typeof app !== 'undefined' && app.showToast) {
      const alignKh = align === 'left' ? 'ខាងឆ្វេង (Left)' : align === 'right' ? 'ខាងស្តាំ (Right)' : 'កណ្តាល (Center)';
      app.showToast(`🏛️ បានតម្រឹមក្បាលស្ថាប័នទៅ ${alignKh}!`, 'info');
    }
  }

  nudgeHeaderLeftPosition(dx, dy) {
    this.tableLayout.headerLeftOffsetX = (this.tableLayout.headerLeftOffsetX || 0) + dx;
    this.tableLayout.headerLeftOffsetY = (this.tableLayout.headerLeftOffsetY || 0) + dy;
    this.saveTableLayoutConfig();
    this.renderReport();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`📍 ទីតាំងក្បាលស្ថាប័ន: X=${this.tableLayout.headerLeftOffsetX}px, Y=${this.tableLayout.headerLeftOffsetY}px`, 'info');
    }
  }

  /* ---------------- Kingdom Header Offset & Nudge Controls ---------------- */
  setKingdomOffsetX(val) {
    this.dividerConfig.kingdomOffsetX = parseInt(val, 10) || 0;
    this.saveDividerConfig();
    this.renderReport();
  }

  setKingdomOffsetY(val) {
    this.dividerConfig.kingdomOffsetY = parseInt(val, 10) || 0;
    this.saveDividerConfig();
    this.renderReport();
  }

  nudgeKingdomPosition(dx, dy) {
    this.dividerConfig.kingdomOffsetX = (this.dividerConfig.kingdomOffsetX || 0) + dx;
    this.dividerConfig.kingdomOffsetY = (this.dividerConfig.kingdomOffsetY || 0) + dy;
    this.saveDividerConfig();
    this.renderReport();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`📍 ទីតាំងពាក្យស្លោក: X=${this.dividerConfig.kingdomOffsetX}px, Y=${this.dividerConfig.kingdomOffsetY}px`, 'info');
    }
  }

  /* ---------------- Table Layout, Alignment, Page Number, Per-Column Shrink/Wrap ---------------- */
  togglePageNumber() {
    this.tableLayout.showPageNumber = !this.tableLayout.showPageNumber;
    this.saveTableLayoutConfig();
    this.renderReport();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(this.tableLayout.showPageNumber ? '📄 បានបង្ហាញលេខទំព័រ (Show Page Numbers)!' : '🚫 បានលាក់លេខទំព័រ (Page Numbers Hidden)!', 'info');
    }
  }

  setColumnWrap(colKey, wrapMode) {
    if (!this.tableLayout.colWraps) this.tableLayout.colWraps = this.getDefaultColWraps();
    this.tableLayout.colWraps[colKey] = wrapMode;
    this.saveTableLayoutConfig();
    this.renderReport();
    if (typeof app !== 'undefined' && app.showToast) {
      const colTitles = {
        col1: 'ល.រ', col2: 'អត្តលេខ កសហវ', col3: 'នាម-គោត្តនាម (ឡាតាំង)', col4: 'នាម-គោត្តនាម (ខ្មែរ)',
        col5: 'អត្តលេខ អពដ', col6: 'ភេទ', col7: 'ថ្ងៃខែឆ្នាំ កំណើត', col8: 'អង្គភាព',
        col9: 'តួនាទី', col10: 'ថ្ងៃខែឆ្នាំ បម្រើការងារ', col11: 'កាលបរិច្ឆេទសំណើ', col12: 'ផ្សេងៗ'
      };
      const colName = colTitles[colKey] || colKey;
      const modeKh = wrapMode === 'nowrap' ? 'បង្រួមក្នុង ១ជួរ (Shrink to Fit / 1-Line)' : 'បំបែកបន្ទាត់ (Wrap Text)';
      app.showToast(`↔️ ជួរ «${colName}»: បានកំណត់ ${modeKh}!`, 'info');
    }
  }

  toggleColumnWrap(colKey) {
    if (!this.tableLayout.colWraps) this.tableLayout.colWraps = this.getDefaultColWraps();
    const current = this.tableLayout.colWraps[colKey] || 'wrap';
    const next = current === 'wrap' ? 'nowrap' : 'wrap';
    this.setColumnWrap(colKey, next);
  }

  setAllColumnsWrap(wrapMode) {
    if (!this.tableLayout.colWraps) this.tableLayout.colWraps = this.getDefaultColWraps();
    for (let i = 1; i <= 12; i++) {
      this.tableLayout.colWraps[`col${i}`] = wrapMode;
    }
    this.tableLayout.textWrap = wrapMode;
    this.saveTableLayoutConfig();
    this.renderReport();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(wrapMode === 'nowrap' ? '↔️ បានកំណត់គ្រប់ជួរឈរជា Shrink to Fit (1-Line)!' : '↩️ បានកំណត់គ្រប់ជួរឈរជា Wrap Text (ច្រើនជួរ)!', 'success');
    }
  }

  togglePersistentFormattingPanel() {
    const panel = document.getElementById('report-persistent-formatting-panel');
    const btn = document.getElementById('btn-toggle-report-format');
    if (!panel) return;
    
    const isHidden = panel.style.display === 'none' || panel.classList.contains('hidden');
    if (isHidden) {
      panel.style.display = 'block';
      panel.classList.remove('hidden');
      if (btn) btn.classList.add('active');
    } else {
      panel.style.display = 'none';
      panel.classList.add('hidden');
      if (btn) btn.classList.remove('active');
    }
  }

  syncPersistentToolbarUI() {
    const layout = this.tableLayout;
    const fontSel = document.getElementById('persist-format-font-select');
    if (fontSel) fontSel.value = layout.fontFamily || 'Khmer OS Siemreap';

    const fontSizeSel = document.getElementById('persist-format-fontsize-select');
    if (fontSizeSel) fontSizeSel.value = String(layout.fontSize || 10);

    const headerFontSizeSel = document.getElementById('persist-format-header-fontsize-select');
    if (headerFontSizeSel) headerFontSizeSel.value = String(layout.headerFontSize || 8.5);

    const titleFontSizeSel = document.getElementById('persist-format-title-fontsize-select');
    if (titleFontSizeSel) titleFontSizeSel.value = String(layout.titleFontSize || 12);

    const sigFontSizeSel = document.getElementById('persist-format-sig-fontsize-select');
    if (sigFontSizeSel) sigFontSizeSel.value = String(layout.sigFontSize || 9.5);

    const fontColorPicker = document.getElementById('persist-format-fontcolor-picker');
    if (fontColorPicker) fontColorPicker.value = layout.fontColor || '#000000';

    const borderStyleSel = document.getElementById('persist-format-borderstyle-select');
    if (borderStyleSel) borderStyleSel.value = layout.borderStyle || 'solid';

    const borderWidthSel = document.getElementById('persist-format-borderwidth-select');
    if (borderWidthSel) borderWidthSel.value = String(layout.borderWidth !== undefined ? layout.borderWidth : 1);

    const borderColorPicker = document.getElementById('persist-format-bordercolor-picker');
    if (borderColorPicker) borderColorPicker.value = layout.borderColor || '#000000';

    const sigFontSel = document.getElementById('persist-format-sigfont-select');
    if (sigFontSel) sigFontSel.value = layout.sigFontFamily || 'Khmer OS Siemreap';

    const paperSel = document.getElementById('persist-format-papersize-select');
    if (paperSel) paperSel.value = layout.paperSize || 'A4';

    const btnLand = document.querySelector('.persist-btn-ori-landscape');
    const btnPort = document.querySelector('.persist-btn-ori-portrait');
    if (btnLand) btnLand.classList.toggle('active', layout.paperOrientation !== 'portrait');
    if (btnPort) btnPort.classList.toggle('active', layout.paperOrientation === 'portrait');

    const badges = document.querySelectorAll('.persist-format-badge-size');
    badges.forEach(b => b.textContent = `${layout.fontSize || 10}pt`);

    const sigBadge = document.getElementById('persist-sig-font-badge');
    if (sigBadge) sigBadge.textContent = `${layout.sigFontSize || 9.5}pt`;
  }

  /* Vertical Up/Down Offset Controls */
  setHeaderOffsetY(val) {
    this.tableLayout.headerOffsetY = parseInt(val, 10) || 0;
    this.saveTableLayoutConfig();
    this.renderReport();
  }

  setTitleOffsetY(val) {
    this.tableLayout.titleOffsetY = parseInt(val, 10) || 0;
    this.saveTableLayoutConfig();
    this.renderReport();
  }

  setLogoOffsetY(val) {
    this.tableLayout.logoOffsetY = parseInt(val, 10) || 0;
    this.saveTableLayoutConfig();
    this.renderReport();
  }

  setLogoSize(val) {
    this.tableLayout.logoSize = parseInt(val, 10) || 68;
    this.saveTableLayoutConfig();
    this.renderReport();
  }

  setDividerOffsetY(val) {
    this.dividerConfig.offsetY = parseInt(val, 10) || 0;
    this.saveDividerConfig();
    this.renderReport();
  }

  setColumnAlign(colKey, align) {
    if (!this.tableLayout.colAligns) this.tableLayout.colAligns = this.getDefaultColAligns();
    this.tableLayout.colAligns[colKey] = align;
    this.saveTableLayoutConfig();
    this.renderReport();
    if (typeof app !== 'undefined' && app.showToast) {
      const alignKh = align === 'left' ? 'ខាងឆ្វេង (Left)' : align === 'right' ? 'ខាងស្តាំ (Right)' : 'កណ្តាល (Center)';
      app.showToast(`🎯 បានតម្រឹមទិន្នន័យជួរឈរទៅ ${alignKh}!`, 'info');
    }
  }

  cycleColumnAlign(colKey) {
    if (!this.tableLayout.colAligns) this.tableLayout.colAligns = this.getDefaultColAligns();
    const current = this.tableLayout.colAligns[colKey] || 'center';
    const next = current === 'left' ? 'center' : current === 'center' ? 'right' : 'left';
    this.setColumnAlign(colKey, next);
  }

  setAllColumnsAlign(align) {
    if (!this.tableLayout.colAligns) this.tableLayout.colAligns = this.getDefaultColAligns();
    for (let i = 1; i <= 12; i++) {
      this.tableLayout.colAligns[`col${i}`] = align;
    }
    this.saveTableLayoutConfig();
    this.renderReport();
    if (typeof app !== 'undefined' && app.showToast) {
      const alignKh = align === 'left' ? 'ឆ្វេងទាំងអស់ (All Left)' : align === 'right' ? 'ស្តាំទាំងអស់ (All Right)' : 'កណ្តាលទាំងអស់ (All Center)';
      app.showToast(`🎯 បានតម្រឹមទិន្នន័យតារាងទាំងមូលទៅ ${alignKh}!`, 'success');
    }
  }

  resetColumnAligns() {
    this.tableLayout.colAligns = this.getDefaultColAligns();
    this.tableLayout.colWraps = this.getDefaultColWraps();
    this.saveTableLayoutConfig();
    this.renderReport();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast('⚖️ បានកំណត់ការតម្រឹម និងទម្រង់បន្ទាត់ទៅស្តង់ដាររដ្ឋបាលដើម!', 'info');
    }
  }

  resetTableLayout() {
    this.requireAdminPermission({
      title: '🔒 ការអនុញ្ញាតពី Admin (Reset Table Layout)',
      subtitle: 'ផ្ទៀងផ្ទាត់ពាក្យសម្ងាត់ Admin មុននឹងកំណត់ទម្រង់តារាង',
      message: '⚠️ លោកអ្នកកំពុងស្នើសុំកំណត់ <strong>ទំហំជួរឈរ ការតម្រឹម និងទម្រង់តារាងទាំងអស់</strong> ទៅលំនាំដើមវិញ។',
      submitText: 'បញ្ជាក់ & កំណត់ទម្រង់ដើម',
      onAuthorized: () => {
        this.tableLayout = {
          fontSize: 10,
          fontColor: '#000000',
          borderStyle: 'solid',
          borderWidth: 1,
          borderColor: '#000000',
          rowDensity: 'normal',
          textWrap: 'wrap',
          fontFamily: 'Khmer OS Siemreap',
          dateFormat: 'dd-mm-yyyy',
          paperOrientation: 'landscape',
          paperSize: 'A4',
          showPageNumber: true,
          showRowCheckboxes: true,
          logoOffsetY: 0,
          logoSize: 68,
          headerOffsetY: 0,
          titleOffsetY: 0,
          headerLeftOffsetX: 0,
          headerLeftOffsetY: 0,
          headerLeftAlign: 'left',
          sigFontSize: 9.5,
          sigFontFamily: 'Khmer OS Siemreap',
          sigOffsetX: 0,
          sigOffsetY: 0,
          sigSpaceHeight: 38,
          sigCol1OffsetX: 0,
          sigCol2OffsetX: 0,
          sigCol3OffsetX: 0,
          pageNumberOffsetX: 0,
          pageNumberOffsetY: 0,
          pageNumberAlign: 'center',
          pageNumberFontSize: 8.5,
          colWidths: this.getDefaultColWidths(),
          colAligns: this.getDefaultColAligns(),
          colWraps: this.getDefaultColWraps()
        };
        this.saveTableLayoutConfig();
        this.renderReport();
        this.syncPersistentToolbarUI();
        if (typeof app !== 'undefined' && app.showToast) {
          app.showToast('✅ បានផ្ទៀងផ្ទាត់សិទ្ធិ Admin និងកំណត់ទម្រង់តារាងទៅលំនាំដើមវិញជោគជ័យ!', 'success');
        }
      }
    });
  }

  startColResize(e, colKey) {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startWidth = this.tableLayout.colWidths[colKey] || 100;

    const onMouseMove = (moveEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(30, startWidth + delta);
      this.tableLayout.colWidths[colKey] = newWidth;
      
      const th = document.querySelector(`th[data-col="${colKey}"]`);
      if (th) th.style.width = `${newWidth}px`;

      const colIdx = parseInt(colKey.replace('col', ''), 10);
      const colEl = document.querySelector(`colgroup col:nth-child(${colIdx})`);
      if (colEl) colEl.style.width = `${newWidth}px`;
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      this.saveTableLayoutConfig();
      this.renderReport();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  /* ---------------- Modal & Logo Management ---------------- */
  getDefaultGdtLogo() {
    return 'img/gdt-official-seal.png';
  }

  triggerLogoUpload() {
    this.openLogoModal();
  }

  openLogoModal() {
    const modal = document.getElementById('report-logo-modal');
    if (!modal) {
      let input = document.getElementById('report-logo-file-input');
      if (input) input.click();
      return;
    }
    modal.style.display = 'flex';
    this.updateModalPreview();
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  closeLogoModal() {
    const modal = document.getElementById('report-logo-modal');
    if (modal) modal.style.display = 'none';
  }

  updateModalPreview() {
    const target = document.getElementById('report-logo-modal-preview-target');
    if (!target) return;

    const customLogo = localStorage.getItem('STAFF_REPORT_CUSTOM_LOGO') || this.getDefaultGdtLogo();
    const lSize = this.tableLayout.logoSize || 68;
    const lOffY = this.tableLayout.logoOffsetY || 0;

    target.innerHTML = `
      <img src="${customLogo}" alt="Logo Preview" style="width: ${Math.min(90, lSize)}px; height: ${Math.min(90, lSize)}px; object-fit: contain; border-radius: 8px; border: 1px solid #cbd5e1; padding: 4px; background: white; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
      <span style="font-size: 0.76rem; font-weight: 700; color: #10b981;">✓ រូបភាព Logo បច្ចុប្បន្ន (Active Official Seal)</span>
    `;
  }

  compressAndSaveLogo(dataUrl, callback) {
    const img = new Image();
    img.onload = () => {
      const maxDim = 400;
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const optimizedDataUrl = canvas.toDataURL('image/png');
      try {
        localStorage.setItem('STAFF_REPORT_CUSTOM_LOGO', optimizedDataUrl);
      } catch (err) {
        try {
          const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          localStorage.setItem('STAFF_REPORT_CUSTOM_LOGO', jpegDataUrl);
        } catch (e2) {}
      }
      if (callback) callback(optimizedDataUrl);
    };
    img.onerror = () => {
      try {
        localStorage.setItem('STAFF_REPORT_CUSTOM_LOGO', dataUrl);
      } catch (e) {}
      if (callback) callback(dataUrl);
    };
    img.src = dataUrl;
  }

  handleLogoFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target.result;
      this.compressAndSaveLogo(rawDataUrl, (savedDataUrl) => {
        this.updateModalPreview();
        this.renderReport();
        if (typeof app !== 'undefined' && app.showToast) {
          app.showToast('🖼️ បានបញ្ចូល និងប្តូររូប Logo ថ្មីដោយជោគជ័យ!', 'success');
        }
      });
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  selectPresetLogo(type) {
    if (type === 'gdt_official' || type === 'gdt_default') {
      localStorage.setItem('STAFF_REPORT_CUSTOM_LOGO', 'img/gdt-official-seal.png');
    } else if (type === 'mef_gold') {
      const goldSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="%23fff" stroke="%23b8860b" stroke-width="3"/><circle cx="50" cy="50" r="41" fill="none" stroke="%23b8860b" stroke-width="1.5" stroke-dasharray="2,2"/><path d="M50 12 L54 22 L65 24 L57 32 L59 43 L50 38 L41 43 L43 32 L35 24 L46 22 Z" fill="%23b8860b"/><path d="M32 40 L68 40 L65 72 L50 82 L35 72 Z" fill="%23b8860b" stroke="%23856404" stroke-width="1.5"/><path d="M50 44 L60 52 L56 68 L50 74 L44 68 L40 52 Z" fill="%23fff"/></svg>`;
      localStorage.setItem('STAFF_REPORT_CUSTOM_LOGO', goldSvg);
    }
    this.updateModalPreview();
    this.renderReport();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast('🏛️ បានជ្រើសរើស Logo ស្តង់ដាររដ្ឋបាល!', 'success');
    }
  }

  resetLogo() {
    this.requireAdminPermission({
      title: '🔒 ការអនុញ្ញាតពី Admin (Reset Official Logo)',
      subtitle: 'ផ្ទៀងផ្ទាត់ពាក្យសម្ងាត់ Admin មុននឹងកំណត់រូប Logo ដើម',
      message: '⚠️ លោកអ្នកកំពុងស្នើសុំកំណត់ <strong>រូបភាព Logo របាយការណ៍</strong> ទៅត្រាដើមរបស់ស្ថាប័នវិញ។',
      submitText: 'បញ្ជាក់ & ប្រើ Logo ដើម',
      onAuthorized: () => {
        localStorage.removeItem('STAFF_REPORT_CUSTOM_LOGO');
        this.tableLayout.logoOffsetY = 0;
        this.tableLayout.logoSize = 68;
        this.saveTableLayoutConfig();
        this.updateModalPreview();
        this.renderReport();
        if (typeof app !== 'undefined' && app.showToast) {
          app.showToast('✅ បានផ្ទៀងផ្ទាត់សិទ្ធិ Admin និងត្រឡប់ទៅប្រើ Logo ដើមវិញជោគជ័យ!', 'success');
        }
      }
    });
  }

  getLogoHtml() {
    const customLogo = localStorage.getItem('STAFF_REPORT_CUSTOM_LOGO') || this.getDefaultGdtLogo();
    const lSize = this.tableLayout.logoSize || 68;
    const lOffY = this.tableLayout.logoOffsetY || 0;

    return `
      <div class="gdt-emblem-seal custom-logo-wrap" onclick="reportsController.openLogoModal()" title="ចុចដើម្បីប្តូររូប Logo ឬកែសម្រួលទីតាំង (Click to change/adjust logo)" style="transform: translateY(${lOffY}px); width: ${lSize}px; height: ${lSize}px; display: flex; align-items: center; justify-content: center;">
        <img src="${customLogo}" alt="Official GDT Seal" class="custom-report-logo-img" style="width: ${lSize}px; height: ${lSize}px; object-fit: contain; cursor: pointer;">
        <div class="logo-change-badge no-print">✏️ ប្តូរ Logo</div>
      </div>
    `;
  }

  /* ---------------- Kingdom Divider Customizer ---------------- */
  openDividerModal() {
    const modal = document.getElementById('report-divider-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    this.updateDividerModalUI();
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  closeDividerModal() {
    const modal = document.getElementById('report-divider-modal');
    if (!modal) return;
    modal.style.display = 'none';
  }

  updateDividerModalUI() {
    const currentStyle = this.dividerConfig.style;
    const cards = document.querySelectorAll('.divider-preset-card');
    cards.forEach(c => {
      const s = c.getAttribute('data-style');
      c.classList.toggle('active', s === currentStyle);
    });

    const activeAlign = this.dividerConfig.align || 'center';
    const btnLeft = document.getElementById('btn-divider-align-left');
    const btnCenter = document.getElementById('btn-divider-align-center');
    const btnRight = document.getElementById('btn-divider-align-right');
    if (btnLeft) btnLeft.classList.toggle('active', activeAlign === 'left');
    if (btnCenter) btnCenter.classList.toggle('active', activeAlign === 'center');
    if (btnRight) btnRight.classList.toggle('active', activeAlign === 'right');
  }

  setDividerStyle(styleKey) {
    this.dividerConfig.style = styleKey;
    if (styleKey !== 'royal_filigree') {
      this.dividerConfig.customImage = '';
    }
    this.saveDividerConfig();
    this.updateDividerModalUI();
    this.renderReport();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast('⚜️ បានប្តូរបន្ទាត់ក្បាច់របាយការណ៍!', 'success');
    }
  }

  setDividerAlign(align) {
    this.dividerConfig.align = align;
    this.saveDividerConfig();
    this.updateDividerModalUI();
    this.renderReport();
    if (typeof app !== 'undefined' && app.showToast) {
      const alignKh = align === 'left' ? 'ខាងឆ្វេង (Left)' : align === 'right' ? 'ខាងស្តាំ (Right)' : 'កណ្តាល (Center)';
      app.showToast(`⚜️ បានតម្រឹមក្បាលលិខិត និងបន្ទាត់ក្បាច់ទៅ ${alignKh}!`, 'info');
    }
  }

  resetDivider() {
    this.requireAdminPermission({
      title: '🔒 ការអនុញ្ញាតពី Admin (Reset Kingdom Divider)',
      subtitle: 'ផ្ទៀងផ្ទាត់ពាក្យសម្ងាត់ Admin មុននឹងកំណត់បន្ទាត់ក្បាច់ដើម',
      message: '⚠️ លោកអ្នកកំពុងស្នើសុំកំណត់ <strong>ម៉ូតបន្ទាត់ក្បាច់របាយការណ៍</strong> ទៅលំនាំដើមវិញ។',
      submitText: 'បញ្ជាក់ & ប្រើម៉ូតដើម',
      onAuthorized: () => {
        this.dividerConfig = {
          style: 'royal_filigree',
          primaryColor: '#003366',
          accentColor: '#b8860b',
          width: 140,
          align: 'center',
          offsetX: 0,
          offsetY: 0,
          kingdomOffsetX: 0,
          kingdomOffsetY: 0,
          customImage: ''
        };
        this.saveDividerConfig();
        this.updateDividerModalUI();
        this.renderReport();
        if (typeof app !== 'undefined' && app.showToast) {
          app.showToast('✅ បានផ្ទៀងផ្ទាត់សិទ្ធិ Admin និងកំណត់បន្ទាត់ក្បាច់ទៅលំនាំដើមវិញជោគជ័យ!', 'success');
        }
      }
    });
  }

  getDividerHtml() {
    const cfg = this.dividerConfig;
    const w = cfg.width || 140;
    const pColor = cfg.primaryColor || '#003366';
    const aColor = cfg.accentColor || '#b8860b';

    if (cfg.style === 'none') {
      return `<div style="height: 10px; width: ${w}px;"></div>`;
    }

    if (cfg.style === 'royal_filigree' || cfg.customImage) {
      const src = cfg.customImage || 'img/divider-royal-filigree.png';
      return `<img src="${src}" alt="Kingdom Divider" style="width: ${w}px; height: auto; max-height: 20px; object-fit: contain; display: block;">`;
    }

    if (cfg.style === 'wave_ornament') {
      return `
        <svg width="${w}" height="12" viewBox="0 0 130 12" style="display: block;">
          <path d="M10 6 C 30 1, 40 11, 60 6 C 70 3, 70 9, 80 6 C 100 1, 110 11, 120 6" stroke="${pColor}" stroke-width="1.8" fill="none" />
          <polygon points="65,2 69,6 65,10 61,6" fill="${aColor}" />
        </svg>
      `;
    }

    if (cfg.style === 'double_line') {
      return `
        <svg width="${w}" height="12" viewBox="0 0 130 12" style="display: block;">
          <line x1="10" y1="4" x2="120" y2="4" stroke="${pColor}" stroke-width="1.5" />
          <line x1="25" y1="8" x2="105" y2="8" stroke="${pColor}" stroke-width="1.5" />
          <circle cx="65" cy="4" r="2.5" fill="${aColor}" />
        </svg>
      `;
    }

    if (cfg.style === 'lotus_floral') {
      return `
        <svg width="${w}" height="14" viewBox="0 0 130 14" style="display: block;">
          <path d="M15 7 L54 7 M76 7 L115 7" stroke="${pColor}" stroke-width="1.5" />
          <path d="M65 1 C62 5, 58 7, 65 12 C72 7, 68 5, 65 1 Z" fill="${aColor}" />
          <circle cx="58" cy="7" r="1.5" fill="${pColor}" />
          <circle cx="72" cy="7" r="1.5" fill="${pColor}" />
        </svg>
      `;
    }

    if (cfg.style === 'sleek_taper') {
      return `
        <svg width="${w}" height="8" viewBox="0 0 130 8" style="display: block;">
          <polygon points="10,4 65,1 120,4 65,7" fill="${pColor}" />
        </svg>
      `;
    }

    return `
      <svg width="${w}" height="12" viewBox="0 0 130 12" style="display: block;">
        <path d="M5 6 Q 65 -1 125 6 Q 65 13 5 6 Z" fill="${pColor}" />
        <circle cx="65" cy="6" r="3" fill="${aColor}" />
      </svg>
    `;
  }

  getGeneratedReportTitleForReason(reasonName) {
    const reasonTitlePart = reasonName 
      ? `ដែលបាន${reasonName}` 
      : 'ទាំងអស់';

    let dateTitlePart = '';
    if (this.dateFrom && this.dateTo) {
      dateTitlePart = ` ចាប់ពីថ្ងៃទី ${this.formatReportDate(this.dateFrom)} ដល់ថ្ងៃទី ${this.formatReportDate(this.dateTo)}`;
    } else if (this.selectedYear) {
      const khYear = this.toKhmerNumber(this.selectedYear);
      dateTitlePart = ` ចាប់ពីខែមករា ដល់ខែធ្នូ ឆ្នាំ${khYear}`;
    } else {
      dateTitlePart = ' ក្នុងប្រព័ន្ធទិន្នន័យ';
    }

    return `បញ្ជីឈ្មោះមន្ត្រីរាជការ នៃអគ្គនាយកដ្ឋានពន្ធដារ ${reasonTitlePart}${dateTitlePart}`;
  }

  getCol11ShortTextForReason(reasonName) {
    if (!reasonName) return 'បញ្ចប់/ស្នើសុំ';
    let short = reasonName;
    if (short.includes('លុបឈ្មោះ')) return 'លុបឈ្មោះ';
    if (short.includes('ចូលបម្រើការងារ')) return 'ចូលបម្រើការងារវិញ';
    if (short.includes('ផ្ទេរ')) return 'ផ្ទេរភារកិច្ច';
    if (short.includes('តម្លើងថ្នាក់')) return 'តម្លើងថ្នាក់';
    if (short.includes('ចូលនិវត្តន៍')) return 'ចូលនិវត្តន៍';
    if (short.includes('ច្បាប់')) return 'សុំច្បាប់';
    if (short.includes('មរណភាព')) return 'មរណភាព';
    if (short.includes('បន្តការសិក្សា')) return 'បន្តការសិក្សា';
    if (short.includes('ព្យួរ')) return 'ព្យួរការងារ';
    return short;
  }

  generateSingleReportSheetHtml(reasonName, dataList, sheetIndex, totalSheets) {
    const totalCount = dataList.length;
    let maleCount = 0;
    let femaleCount = 0;

    dataList.forEach(item => {
      const g = this.formatGenderShort(item.gender);
      if (g === 'ប') maleCount++;
      else if (g === 'ស') femaleCount++;
    });

    const reportTitle = this.getGeneratedReportTitleForReason(reasonName);
    const cfg = this.customConfig;
    const layout = this.tableLayout;
    const showRowCheckboxes = layout.showRowCheckboxes !== false;
    const divCfg = this.dividerConfig || { align: 'center', offsetX: 0, offsetY: 0, kingdomOffsetX: 0, kingdomOffsetY: 0 };
    const cols = layout.colWidths || this.getDefaultColWidths();
    const aligns = layout.colAligns || this.getDefaultColAligns();
    const wraps = layout.colWraps || this.getDefaultColWraps();

    const khSelectedYear = this.selectedYear ? this.toKhmerNumber(this.selectedYear) : '២០២៦';
    const adaptYearInText = (str) => {
      if (!str || !this.selectedYear) return str;
      return str.replace(/ឆ្នាំ(២០២[០-៩]|[0-9]{4})/g, `ឆ្នាំ${khSelectedYear}`);
    };

    const col11ShortText = this.getCol11ShortTextForReason(reasonName);
    const textWrapClass = layout.textWrap === 'nowrap' ? 'shrink-to-fit' : 'wrap-text';
    const rowDensityClass = `density-${layout.rowDensity || 'normal'}`;
    const activeFont = layout.fontFamily || 'Khmer OS Siemreap';
    const activeFontStack = this.getFontFamilyStack(activeFont);
    const muolFontStack = this.getFontFamilyStack('Khmer OS Muol Light');
    const sigFont = layout.sigFontFamily || activeFont;
    const sigFontStack = this.getFontFamilyStack(sigFont);
    const sigSize = layout.sigFontSize || 9.5;
    const orientationClass = `orientation-${layout.paperOrientation || 'landscape'}`;
    const pageText = `Page ${sheetIndex} of ${totalSheets || 1}`;

    // Custom Font Color & Border Styles
    const fontColor = layout.fontColor || '#000000';
    const borderStyle = layout.borderStyle || 'solid';
    const borderWidth = layout.borderWidth !== undefined ? layout.borderWidth : 1;
    const borderColor = layout.borderColor || '#000000';
    const tableBorderRule = borderStyle === 'none' ? 'border: none !important;' : `border: ${borderWidth}px ${borderStyle} ${borderColor} !important;`;
    const cellBorderRule = borderStyle === 'none' ? 'border: none !important;' : `border: ${borderWidth}px ${borderStyle} ${borderColor} !important;`;

    // Kingdom Alignment flex rules
    const alignVal = divCfg.align || 'center';
    const flexAlign = alignVal === 'left' ? 'flex-start' : alignVal === 'right' ? 'flex-end' : 'center';

    // Left Header Alignment flex rules
    const hLeftAlign = layout.headerLeftAlign || 'left';
    const hLeftFlexAlign = hLeftAlign === 'center' ? 'center' : hLeftAlign === 'right' ? 'flex-end' : 'flex-start';

    // Page Number Alignment flex rules
    const pageNumAlign = layout.pageNumberAlign || 'center';
    const pageFlexJustify = pageNumAlign === 'left' ? 'flex-start' : pageNumAlign === 'right' ? 'flex-end' : 'center';

    const renderTh = (colKey, titleHtml, alignKey) => {
      const isShrink = wraps[colKey] === 'nowrap';
      const alignIcon = aligns[alignKey] === 'left' ? '⫷' : aligns[alignKey] === 'right' ? '⫸' : '⏺';
      const wrapTitle = isShrink ? 'បច្ចុប្បន្ន: Shrink to Fit (1 ជួរ) - ចុចដើម្បីប្តូរជា Wrap' : 'បច្ចុប្បន្ន: Wrap Text (ច្រើនជួរ) - ចុចដើម្បីប្តូរជា Shrink';
      return `
        <th data-col="${colKey}" style="width: ${cols[colKey]}px; text-align: center; vertical-align: middle; ${cellBorderRule} color: ${fontColor}; font-size: ${layout.fontSize}pt !important; font-family: ${activeFontStack} !important; background-clip: padding-box !important;">
          <div class="th-content-wrap" style="font-size: ${layout.fontSize}pt !important; font-family: ${activeFontStack} !important;">
            <span class="th-title-text" style="font-size: ${layout.fontSize}pt !important; font-family: ${activeFontStack} !important;">${titleHtml}</span>
            <div class="th-actions-wrap no-print">
              <button type="button" class="btn-wrap-cycle ${isShrink ? 'is-shrink' : 'is-wrap'}" onclick="reportsController.toggleColumnWrap('${colKey}')" title="${wrapTitle}">
                ${isShrink ? '↔' : '↩'}
              </button>
              <button type="button" class="btn-align-cycle" onclick="reportsController.cycleColumnAlign('${alignKey}')" title="ចុចដើម្បីប្តូរការតម្រឹមទិន្នន័យ">${alignIcon}</button>
            </div>
          </div>
          <div class="col-resizer no-print" onmousedown="reportsController.startColResize(event, '${colKey}')" title="ទាញដើម្បីកែប្រវែងជួរឈរ"></div>
        </th>
      `;
    };

    return `
      <div class="official-report-sheet ${orientationClass}" style="font-family: ${activeFontStack} !important; color: ${fontColor};">
        <!-- Top Official Header Bar with Up/Down Offset Support -->
        <div class="report-header-grid" style="transform: translateY(${layout.headerOffsetY || 0}px);">
          <!-- Top Left: Ministry & Department Header (Editable, Positionable X/Y & Align) -->
          <div class="report-header-left" style="text-align: ${hLeftAlign}; align-items: ${hLeftFlexAlign}; font-size: ${layout.headerFontSize || 8.5}pt; font-family: ${muolFontStack} !important; transform: translate(${layout.headerLeftOffsetX || 0}px, ${layout.headerLeftOffsetY || 0}px);">
            <div class="header-line bold editable-field" contenteditable="true" style="text-align: ${hLeftAlign}; width: 100%; color: ${fontColor}; font-size: ${layout.headerFontSize || 8.5}pt; font-family: ${muolFontStack} !important; font-weight: normal !important;" onblur="reportsController.saveFieldEdit('headerLine1', this.innerText)">${cfg.headerLine1}</div>
            <div class="header-line bold highlight editable-field" contenteditable="true" style="text-align: ${hLeftAlign}; width: 100%; color: ${fontColor === '#000000' ? '#003366' : fontColor}; font-size: ${(layout.headerFontSize || 8.5) * 1.05}pt; font-family: ${muolFontStack} !important; font-weight: normal !important;" onblur="reportsController.saveFieldEdit('headerLine2', this.innerText)">${cfg.headerLine2}</div>
            <div class="header-line bold editable-field" contenteditable="true" style="text-align: ${hLeftAlign}; width: 100%; color: ${fontColor}; font-size: ${layout.headerFontSize || 8.5}pt; font-family: ${muolFontStack} !important; font-weight: normal !important;" onblur="reportsController.saveFieldEdit('headerLine3', this.innerText)">${cfg.headerLine3}</div>
            <div class="header-line dotted editable-field" contenteditable="true" style="text-align: ${hLeftAlign}; width: 100%; color: ${fontColor}; font-size: ${(layout.headerFontSize || 8.5) * 0.95}pt; font-family: ${activeFontStack} !important;" onblur="reportsController.saveFieldEdit('headerLine4', this.innerText)">${cfg.headerLine4}</div>
          </div>

          <!-- Top Center: Official Logo / Emblem Seal (Clickable to open modal) -->
          <div class="report-header-center">
            ${this.getLogoHtml()}
          </div>

          <!-- Top Right: Kingdom Motto Header (Editable with Left/Center/Right Alignment & Kingdom X/Y Offsets) -->
          <div class="report-header-right" style="text-align: ${alignVal}; align-items: ${flexAlign}; justify-content: flex-start; font-size: ${layout.headerFontSize || 8.5}pt; font-family: ${muolFontStack} !important; transform: translate(${divCfg.kingdomOffsetX || 0}px, ${divCfg.kingdomOffsetY || 0}px);">
            <div class="header-line kingdom-title editable-field" contenteditable="true" style="text-align: ${alignVal}; width: 100%; color: ${fontColor}; font-size: ${(layout.headerFontSize || 8.5) * 1.1}pt; font-family: ${muolFontStack} !important; font-weight: normal !important;" onblur="reportsController.saveFieldEdit('kingdomTitle', this.innerText)">${cfg.kingdomTitle}</div>
            <div class="header-line kingdom-motto editable-field" contenteditable="true" style="text-align: ${alignVal}; width: 100%; color: ${fontColor}; font-size: ${layout.headerFontSize || 8.5}pt; font-family: ${muolFontStack} !important; font-weight: normal !important;" onblur="reportsController.saveFieldEdit('kingdomMotto', this.innerText)">${cfg.kingdomMotto}</div>
            <div class="kingdom-divider custom-divider-wrap" onclick="reportsController.openDividerModal()" title="ចុចដើម្បីប្តូរ ឬកែប្រែម៉ូតបន្ទាត់ក្បាច់ (Click to customize divider)" style="display: flex; justify-content: ${flexAlign}; align-items: center; width: 100%; transform: translate(${divCfg.offsetX || 0}px, ${divCfg.offsetY || 0}px);">
              ${this.getDividerHtml()}
              <div class="divider-change-badge no-print">✏️ ប្តូរបន្ទាត់</div>
            </div>
          </div>
        </div>

        <!-- Main Report Title (Centered Bold, Condition-Specific, Editable) -->
        <div class="report-title-section" style="transform: translateY(${layout.titleOffsetY || 0}px);">
          <h2 class="report-main-title editable-field" contenteditable="true" title="ចុចដើម្បីកែប្រែចំណងជើង" style="font-size: ${layout.titleFontSize || 12}pt !important; color: ${fontColor}; font-family: ${muolFontStack} !important; font-weight: normal !important;">${reportTitle}</h2>
        </div>

        <!-- Official 12-Column Table (Salmon Header Color #fce4d6 with Resizable Columns, Alignment & Per-Column Shrink/Wrap) -->
        <div class="report-table-wrapper">
          <table class="official-gdt-table ${textWrapClass} ${rowDensityClass}" style="font-size: ${layout.fontSize}pt; color: ${fontColor} !important; font-family: ${activeFontStack} !important; ${tableBorderRule}">
            <colgroup>
              ${showRowCheckboxes ? '<col class="no-print col-select" style="width: 44px;">' : ''}
              <col style="width: ${cols.col1}px;">
              <col style="width: ${cols.col2}px;">
              <col style="width: ${cols.col3}px;">
              <col style="width: ${cols.col4}px;">
              <col style="width: ${cols.col5}px;">
              <col style="width: ${cols.col6}px;">
              <col style="width: ${cols.col7}px;">
              <col style="width: ${cols.col8}px;">
              <col style="width: ${cols.col9}px;">
              <col style="width: ${cols.col10}px;">
              <col style="width: ${cols.col11}px;">
              <col style="width: ${cols.col12}px;">
            </colgroup>
            <thead>
              <tr>
                ${showRowCheckboxes ? `
                  <th class="no-print col-select" style="width: 44px; text-align: center; vertical-align: middle; background: #fee2e2; ${cellBorderRule} background-clip: padding-box !important;">
                    <input type="checkbox" onchange="reportsController.toggleSelectAllReason('${reasonName}', this.checked)" title="ជ្រើសរើសទាំងអស់ (Select All)" style="cursor: pointer; width: 14px; height: 14px; accent-color: #ef4444;">
                  </th>
                ` : ''}
                ${renderTh('col1', '<span style="white-space: nowrap;">ល.រ</span>', 'col1')}
                ${renderTh('col2', '<span style="display: block; line-height: 1.25;"><span style="white-space: nowrap;">អត្តលេខ</span><br><span style="white-space: nowrap;">កសហវ</span></span>', 'col2')}
                ${renderTh('col3', '<span style="display: block; line-height: 1.25;"><span style="white-space: nowrap;">នាម-គោត្តនាម</span><br><span style="white-space: nowrap;">(អក្សរឡាតាំង)</span></span>', 'col3')}
                ${renderTh('col4', '<span style="display: block; line-height: 1.25;"><span style="white-space: nowrap;">នាម-គោត្តនាម</span><br><span style="white-space: nowrap;">(ភាសាខ្មែរ)</span></span>', 'col4')}
                ${renderTh('col5', '<span style="display: block; line-height: 1.25;"><span style="white-space: nowrap;">អត្តលេខ</span><br><span style="white-space: nowrap;">អពដ</span></span>', 'col5')}
                ${renderTh('col6', '<span style="white-space: nowrap;">ភេទ</span>', 'col6')}
                ${renderTh('col7', '<span style="display: block; line-height: 1.25;"><span style="white-space: nowrap;">ថ្ងៃខែឆ្នាំ</span><br><span style="white-space: nowrap;">កំណើត</span></span>', 'col7')}
                ${renderTh('col8', '<span style="white-space: nowrap;">អង្គភាព</span>', 'col8')}
                ${renderTh('col9', '<span style="white-space: nowrap;">តួនាទី</span>', 'col9')}
                ${renderTh('col10', '<span style="display: block; line-height: 1.25;"><span style="white-space: nowrap;">ថ្ងៃខែឆ្នាំ</span><br><span style="white-space: nowrap;">បម្រើការងារ</span></span>', 'col10')}
                ${renderTh('col11', `<span style="display: block; line-height: 1.25;"><span style="white-space: nowrap;">ថ្ងៃខែឆ្នាំ</span><br><span style="white-space: nowrap;">${col11ShortText}</span></span>`, 'col11')}
                ${renderTh('col12', '<span style="white-space: nowrap;">ផ្សេងៗ</span>', 'col12')}
              </tr>
            </thead>
            <tbody>
              ${dataList.length === 0 ? `
                <tr>
                  <td colspan="${showRowCheckboxes ? 13 : 12}" style="text-align: center; padding: 2.5rem 1rem; color: #64748b; ${cellBorderRule}">
                    មិនមានទិន្នន័យបុគ្គលិកសម្រាប់មូលហេតុ «${reasonName || 'ទូទៅ'}» ឡើយ (No records found)
                  </td>
                </tr>
              ` : dataList.map((item, idx) => {
                const rankNumber = idx + 1;
                const recordKey = this.getRecordKey(item, idx);
                const isSelected = this.selectedRecordKeys.has(recordKey);

                const remarksOrPrakas = item.prakasNo 
                  ? (item.description ? `${item.prakasNo} ${item.description}` : item.prakasNo)
                  : (item.description || item.remark || '-');

                const getTdStyle = (colKey) => {
                  const isColShrink = wraps[colKey] === 'nowrap';
                  const baseAlign = aligns[colKey] || 'left';
                  if (isColShrink) {
                    return `text-align: ${baseAlign}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: ${cols[colKey]}px; ${cellBorderRule} color: ${fontColor}; font-size: ${layout.fontSize}pt !important; font-family: ${activeFontStack} !important;`;
                  }
                  return `text-align: ${baseAlign}; white-space: normal; word-break: break-word; ${cellBorderRule} color: ${fontColor}; font-size: ${layout.fontSize}pt !important; font-family: ${activeFontStack} !important;`;
                };

                const getTdClass = (colKey) => {
                  return wraps[colKey] === 'nowrap' ? 'cell-shrink' : 'cell-wrap';
                };

                return `
                  <tr class="${isSelected ? 'row-selected' : ''}" style="${isSelected ? 'background-color: #fff1f2;' : ''}">
                    ${showRowCheckboxes ? `
                      <td class="no-print col-select" style="text-align: center; vertical-align: middle; padding: 2px 4px; ${cellBorderRule} font-size: ${layout.fontSize}pt !important; font-family: ${activeFontStack} !important;">
                        <input type="checkbox" class="report-row-chk" value="${recordKey}" ${isSelected ? 'checked' : ''} onchange="reportsController.toggleSelectRow('${recordKey}', this.checked)" title="ជ្រើសរើសជួរនេះ">
                        <button type="button" class="btn-row-del" onclick="reportsController.excludeRecord('${recordKey}')" title="លុបជួរនេះចេញពីរបាយការណ៍ (Delete/Exclude row)">✕</button>
                      </td>
                    ` : ''}
                    <!-- 1. ល.រ (Rank Number 1, 2, 3...) -->
                    <td class="font-bold ${getTdClass('col1')}" style="${getTdStyle('col1')}">${rankNumber}</td>
                    <!-- 2. អត្តលេខ កសហវ (Data: item.secondaryId - 10-digit ID) -->
                    <td class="font-bold editable-field ${getTdClass('col2')}" contenteditable="true" style="${getTdStyle('col2')}" title="${item.secondaryId || '-'}">${item.secondaryId || '-'}</td>
                    <!-- 3. នាម-គោត្តនាម (អក្សរឡាតាំង) -->
                    <td class="font-semibold uppercase editable-field ${getTdClass('col3')}" contenteditable="true" style="${getTdStyle('col3')}" title="${item.latinName || '-'}">${item.latinName || '-'}</td>
                    <!-- 4. នាម-គោត្តនាម (ភាសាខ្មែរ) -->
                    <td class="font-semibold editable-field ${getTdClass('col4')}" contenteditable="true" style="${getTdStyle('col4')}" title="${item.khmerName || '-'}">${item.khmerName || '-'}</td>
                    <!-- 5. អត្តលេខ អពដ (Data: item.staffId - 4-digit ID) -->
                    <td class="font-bold editable-field ${getTdClass('col5')}" contenteditable="true" style="${getTdStyle('col5')}" title="${item.staffId || '-'}">${item.staffId || '-'}</td>
                    <!-- 6. ភេទ -->
                    <td class="font-bold editable-field ${getTdClass('col6')}" contenteditable="true" style="${getTdStyle('col6')}">${this.formatGenderShort(item.gender)}</td>
                    <!-- 7. ថ្ងៃខែឆ្នាំ កំណើត -->
                    <td class="editable-field ${getTdClass('col7')}" contenteditable="true" style="${getTdStyle('col7')}">${this.formatReportDate(item.dob)}</td>
                    <!-- 8. អង្គភាព -->
                    <td class="editable-field ${getTdClass('col8')}" contenteditable="true" style="${getTdStyle('col8')}" title="${item.department || '-'}">${item.department || '-'}</td>
                    <!-- 9. តួនាទី -->
                    <td class="font-semibold editable-field ${getTdClass('col9')}" contenteditable="true" style="${getTdStyle('col9')}" title="${item.position || 'មន្ត្រី'}">${item.position || 'មន្ត្រី'}</td>
                    <!-- 10. ថ្ងៃខែឆ្នាំ បម្រើការងារ -->
                    <td class="editable-field ${getTdClass('col10')}" contenteditable="true" style="${getTdStyle('col10')}">${this.formatReportDate(item.serviceStartDate)}</td>
                    <!-- 11. ថ្ងៃខែឆ្នាំ លុបឈ្មោះ/បញ្ចប់/ស្នើសុំ -->
                    <td class="font-bold editable-field ${getTdClass('col11')}" contenteditable="true" style="${getTdStyle('col11')}">${this.formatReportDate(item.endDate || item.requestDate)}</td>
                    <!-- 12. ផ្សេងៗ -->
                    <td class="text-xs editable-field ${getTdClass('col12')}" contenteditable="true" style="${getTdStyle('col12')}" title="${remarksOrPrakas}">${remarksOrPrakas}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <!-- Summary Count Row (Exact Match to Condition) -->
              <tr class="report-summary-bar" style="font-size: ${layout.fontSize}pt !important; font-family: ${activeFontStack} !important;">
                ${showRowCheckboxes ? `<td class="no-print col-select" style="background: #fce4d6; ${cellBorderRule} font-size: ${layout.fontSize}pt !important; font-family: ${activeFontStack} !important;"></td>` : ''}
                <td colspan="12" style="${cellBorderRule} color: ${fontColor}; font-size: ${layout.fontSize}pt !important; font-family: ${activeFontStack} !important;">
                  <div class="summary-content" style="color: ${fontColor}; font-size: ${layout.fontSize}pt !important; font-family: ${activeFontStack} !important;">
                    <strong>ចំនួនសរុប (${reasonName || 'ទូទៅ'}) ៖</strong> <span class="badge-num" style="color: ${fontColor}; font-size: ${layout.fontSize}pt !important; font-family: ${activeFontStack} !important;">${totalCount} នាក់</span>, 
                    <strong>ប្រុស ៖</strong> <span class="badge-num" style="color: ${fontColor}; font-size: ${layout.fontSize}pt !important; font-family: ${activeFontStack} !important;">${maleCount} នាក់</span>, 
                    <strong>ស្រី ៖</strong> <span class="badge-num" style="color: ${fontColor}; font-size: ${layout.fontSize}pt !important; font-family: ${activeFontStack} !important;">${femaleCount} នាក់</span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Official 3-Signatures Block Footer (Rendered once per reason at bottom of sheet) -->
        <div class="report-signatures-grid" style="font-size: ${sigSize}pt !important; font-family: ${sigFontStack} !important; color: ${fontColor}; transform: translate(${layout.sigOffsetX || 0}px, ${layout.sigOffsetY || 0}px);">
          <!-- Signature Left: ប្រធាននាយកដ្ឋាន -->
          <div class="signature-col" style="font-size: ${sigSize}pt !important; transform: translateX(${layout.sigCol1OffsetX || 0}px);">
            <div class="sig-header-kh editable-field" contenteditable="true" style="font-size: ${sigSize * 1.05}pt !important; color: ${fontColor}; font-weight: 700;" onblur="reportsController.saveFieldEdit('sig1Header', this.innerText)">${cfg.sig1Header}</div>
            <div class="sig-date-kh editable-field" contenteditable="true" style="font-size: ${sigSize * 0.95}pt !important; color: ${fontColor};" onblur="reportsController.saveFieldEdit('sig1Date', this.innerText)">${adaptYearInText(cfg.sig1Date)}</div>
            <div class="sig-place-kh editable-field" contenteditable="true" style="font-size: ${sigSize * 0.95}pt !important; color: ${fontColor};" onblur="reportsController.saveFieldEdit('sig1Place', this.innerText)">${adaptYearInText(cfg.sig1Place)}</div>
            <div class="sig-role-title editable-field" contenteditable="true" style="font-size: ${sigSize * 1.05}pt !important; color: ${fontColor}; font-weight: 700;" onblur="reportsController.saveFieldEdit('sig1Role', this.innerText)">${cfg.sig1Role}</div>
            <div class="sig-space" style="height: ${layout.sigSpaceHeight || 38}px;"></div>
          </div>

          <!-- Signature Center: អនុប្រធាននាយកដ្ឋាន -->
          <div class="signature-col" style="font-size: ${sigSize}pt !important; transform: translateX(${layout.sigCol2OffsetX || 0}px);">
            <div class="sig-header-kh editable-field" contenteditable="true" style="font-size: ${sigSize * 1.05}pt !important; color: ${fontColor}; font-weight: 700;" onblur="reportsController.saveFieldEdit('sig2Header', this.innerText)">${cfg.sig2Header}</div>
            <div class="sig-date-kh editable-field" contenteditable="true" style="font-size: ${sigSize * 0.95}pt !important; color: ${fontColor};" onblur="reportsController.saveFieldEdit('sig2Date', this.innerText)">${adaptYearInText(cfg.sig2Date)}</div>
            <div class="sig-place-kh editable-field" contenteditable="true" style="font-size: ${sigSize * 0.95}pt !important; color: ${fontColor};" onblur="reportsController.saveFieldEdit('sig2Place', this.innerText)">${adaptYearInText(cfg.sig2Place)}</div>
            <div class="sig-role-title editable-field" contenteditable="true" style="font-size: ${sigSize * 1.05}pt !important; color: ${fontColor}; font-weight: 700;" onblur="reportsController.saveFieldEdit('sig2Role', this.innerText)">${cfg.sig2Role}</div>
            <div class="sig-space" style="height: ${layout.sigSpaceHeight || 38}px;"></div>
          </div>

          <!-- Signature Right: រៀបចំដោយ -->
          <div class="signature-col" style="font-size: ${sigSize}pt !important; transform: translateX(${layout.sigCol3OffsetX || 0}px);">
            <div class="sig-header-kh editable-field" contenteditable="true" style="font-size: ${sigSize * 1.05}pt !important; color: ${fontColor}; font-weight: 700;" onblur="reportsController.saveFieldEdit('sig3Header', this.innerText)">${cfg.sig3Header}</div>
            <div class="sig-date-kh editable-field" contenteditable="true" style="font-size: ${sigSize * 0.95}pt !important; color: ${fontColor};" onblur="reportsController.saveFieldEdit('sig3Date', this.innerText)">${adaptYearInText(cfg.sig3Date)}</div>
            <div class="sig-place-kh editable-field" contenteditable="true" style="font-size: ${sigSize * 0.95}pt !important; color: ${fontColor};" onblur="reportsController.saveFieldEdit('sig3Place', this.innerText)">${adaptYearInText(cfg.sig3Place)}</div>
            <div class="sig-role-title editable-field" contenteditable="true" style="font-size: ${sigSize * 1.05}pt !important; color: ${fontColor}; font-weight: 700;" onblur="reportsController.saveFieldEdit('sig3Role', this.innerText)">${cfg.sig3Role}</div>
            <div class="sig-space" style="height: ${layout.sigSpaceHeight || 38}px;"></div>
          </div>
        </div>

        <!-- Page numbering footer (End of Paper, In the Middle & Positionable X/Y) -->
        ${layout.showPageNumber !== false ? `
          <div class="report-page-footer" style="justify-content: ${pageFlexJustify}; font-size: ${layout.pageNumberFontSize || 8.5}pt; color: ${fontColor};">
            <div class="page-footer-content-wrap" style="transform: translate(${layout.pageNumberOffsetX || 0}px, ${layout.pageNumberOffsetY || 0}px);">
              <span class="editable-field" contenteditable="true" style="color: ${fontColor};" onblur="reportsController.saveFieldEdit('pageNumberText', this.innerText)" title="ចុចដើម្បីកែប្រែអត្ថបទលេខទំព័រ">${pageText}</span>
              <div class="page-footer-floating-tools no-print">
                <button type="button" class="btn-page-tool" onclick="reportsController.setPageNumberAlign('left')" title="តម្រឹមឆ្វេង">⬅️</button>
                <button type="button" class="btn-page-tool" onclick="reportsController.setPageNumberAlign('center')" title="តម្រឹមកណ្តាល">⏺️</button>
                <button type="button" class="btn-page-tool" onclick="reportsController.setPageNumberAlign('right')" title="តម្រឹមស្តាំ">➡️</button>
                <button type="button" class="btn-page-tool" onclick="reportsController.nudgePageNumberPosition(-5, 0)" title="រំកិលឆ្វេង">⇦</button>
                <button type="button" class="btn-page-tool" onclick="reportsController.nudgePageNumberPosition(5, 0)" title="រំកិលស្តាំ">⇨</button>
                <button type="button" class="btn-page-tool" onclick="reportsController.nudgePageNumberPosition(0, -3)" title="រំកិលឡើងលើ">⇧</button>
                <button type="button" class="btn-page-tool" onclick="reportsController.nudgePageNumberPosition(0, 3)" title="រំកិលចុះក្រោម">⇩</button>
                <button type="button" class="btn-page-tool btn-page-hide" onclick="reportsController.togglePageNumber()" title="លាក់លេខទំព័រ">✕</button>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderReport() {
    const container = document.getElementById('official-report-render-target');
    if (!container) return;

    const filteredRecords = this.getFilteredData();
    const totalRecordsCount = filteredRecords.length;
    const groupedData = this.getGroupedDataByReason();
    const reasonKeys = Object.keys(groupedData);
    const totalSheets = reasonKeys.length;

    const reportCountBadge = document.getElementById('report-records-count-badge');
    if (reportCountBadge) {
      if (totalRecordsCount === 0) {
        reportCountBadge.textContent = `0 កំណត់ត្រា (0 សន្លឹក)`;
      } else {
        reportCountBadge.textContent = `${totalRecordsCount} កំណត់ត្រា (${totalSheets} សន្លឹកតាមមូលហេតុ)`;
      }
    }

    // If NO DATA, do not render empty government report pages. Show a clean empty state box with a 1-click reverse/reset button!
    if (totalRecordsCount === 0 || totalSheets === 0) {
      const filterSummary = [];
      if (this.selectedDept) filterSummary.push(`អង្គភាព: <strong>${this.selectedDept}</strong>`);
      if (this.selectedReason) filterSummary.push(`មូលហេតុ: <strong>${this.selectedReason}</strong>`);
      if (this.selectedYear) filterSummary.push(`ឆ្នាំ: <strong>${this.selectedYear}</strong>`);
      if (this.dateFrom || this.dateTo) filterSummary.push(`កាលបរិច្ឆេទ: <strong>${this.dateFrom || '...'} ដល់ ${this.dateTo || '...'}</strong>`);

      const summaryText = filterSummary.length > 0 ? `<div style="margin: 0.75rem 0; font-size: 0.85rem; color: #dc2626; background: rgba(239, 68, 68, 0.08); padding: 6px 12px; border-radius: 8px; display: inline-block;">${filterSummary.join(' • ')}</div>` : '';

      container.innerHTML = `
        <div class="report-empty-state-box no-print" style="background: var(--bg-card); border: 2px dashed var(--border-color); border-radius: 16px; padding: 3.5rem 1.5rem; text-align: center; margin: 1.5rem auto; max-width: 620px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          <div style="width: 62px; height: 62px; border-radius: 50%; background: rgba(239, 68, 68, 0.1); color: #ef4444; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem auto; font-size: 1.6rem;">
            <i data-lucide="file-question" style="width: 32px; height: 32px;"></i>
          </div>
          <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.35rem;">
            មិនមានទិន្នន័យស្របតាមលក្ខខណ្ឌតម្រងឡើយ (No Data for Selected Filter)
          </h3>
          ${summaryText}
          <p style="font-size: 0.84rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 1.35rem; max-width: 480px; margin-left: auto; margin-right: auto;">
            ពុំមានទិន្នន័យបុគ្គលិកស្របតាមលក្ខខណ្ឌតម្រងនេះឡើយ។ លោកអ្នកអាចត្រឡប់ទៅមើលទិន្នន័យទាំងអស់វិញ ដោយចុចប៊ូតុងខាងក្រោម។
          </p>
          <div style="display: flex; justify-content: center; gap: 0.65rem; flex-wrap: wrap;">
            <button type="button" class="btn btn-primary" onclick="reportsController.resetFilters()" style="font-weight: 700; padding: 0.55rem 1.25rem; display: inline-flex; align-items: center; gap: 0.4rem; cursor: pointer;">
              <i data-lucide="rotate-ccw"></i>
              <span>ត្រឡប់ទៅទិន្នន័យដើមវិញ (Reset / Reverse Filter)</span>
            </button>
          </div>
        </div>
      `;
      if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
      }
      return;
    }

    const selectionBarHtml = `
      <div id="report-selection-action-bar-container">
        ${this.getSelectionBarHtml()}
      </div>
    `;

    // Render 1 official sheet per reason ONLY for reasons with data
    const sheetsHtml = reasonKeys.map((rName, idx) => {
      const sheetItems = groupedData[rName] || [];
      const sheetNum = idx + 1;
      const bannerHtml = (reasonKeys.length > 1) ? `
        <div class="report-sheet-divider-banner no-print">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i data-lucide="file-spreadsheet" style="width: 15px; height: 15px; color: var(--primary);"></i>
            <span>សន្លឹកទី ${sheetNum}/${totalSheets} ៖ មូលហេតុ «${rName}»</span>
          </div>
          <span style="font-size: 0.76rem; background: rgba(79, 70, 229, 0.1); color: var(--primary); padding: 2px 8px; border-radius: 6px;">
            ${sheetItems.length} នាក់
          </span>
        </div>
      ` : '';

      return `
        <div class="report-sheet-group-block">
          ${bannerHtml}
          ${this.generateSingleReportSheetHtml(rName, sheetItems, sheetNum, totalSheets)}
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div id="printable-report-wrapper" class="official-report-multi-wrapper">
        ${selectionBarHtml}
        ${sheetsHtml}
      </div>
    `;

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  printReport() {
    const allRecords = this.getFilteredData();
    if (!allRecords || allRecords.length === 0) {
      if (typeof app !== 'undefined' && app.showToast) {
        app.showToast('⚠️ មិនមានទិន្នន័យដើម្បីបោះពុម្ពឡើយ (No records to print)!', 'warning');
      } else {
        alert('មិនមានទិន្នន័យដើម្បីបោះពុម្ពឡើយ');
      }
      return;
    }

    const reportWrapper = document.getElementById('printable-report-wrapper');
    if (!reportWrapper) {
      window.print();
      return;
    }

    const layout = this.tableLayout;
    const fontSize = layout.fontSize || 10;
    const fontColor = layout.fontColor || '#000000';
    const borderStyle = layout.borderStyle || 'solid';
    const borderWidth = layout.borderWidth !== undefined ? layout.borderWidth : 1;
    const borderColor = layout.borderColor || '#000000';
    const tableBorderRule = borderStyle === 'none' ? 'border: none !important;' : `border: ${borderWidth}px ${borderStyle} ${borderColor} !important;`;
    const cellBorderRule = borderStyle === 'none' ? 'border: none !important;' : `border: ${borderWidth}px ${borderStyle} ${borderColor} !important;`;

    const isNowrap = layout.textWrap === 'nowrap';
    const density = layout.rowDensity || 'normal';
    const activeFont = layout.fontFamily || 'Khmer OS Siemreap';
    const activeFontStack = this.getFontFamilyStack(activeFont);
    const muolFontStack = this.getFontFamilyStack('Khmer OS Muol Light');
    const sigFont = layout.sigFontFamily || activeFont;
    const sigFontStack = this.getFontFamilyStack(sigFont);
    const sigSize = layout.sigFontSize || 9.5;
    const pageNumAlign = layout.pageNumberAlign || 'center';
    const pageFlexJustify = pageNumAlign === 'left' ? 'flex-start' : pageNumAlign === 'right' ? 'flex-end' : 'center';
    const paperSize = layout.paperSize || 'A4';
    const paperOrientation = layout.paperOrientation || 'landscape';
    const pageMargin = paperOrientation === 'portrait' ? '8mm 8mm 8mm 8mm' : '8mm 10mm 10mm 10mm';

    const cellPadding = density === 'compact' ? '2px 4px' : density === 'spacious' ? '6px 6px' : '3px 4px';
    const whiteSpaceRule = isNowrap ? 'white-space: nowrap !important;' : '';

    // Calculate exact percentage width per column based on user layout to guarantee 1:1 WYSIWYG
    const cols = layout.colWidths || this.getDefaultColWidths();
    const totalColsPx = Object.values(cols).reduce((sum, w) => sum + (parseInt(w, 10) || 100), 0);
    const colRules = Object.keys(cols).map(k => {
      const pct = ((cols[k] / totalColsPx) * 100).toFixed(2);
      const colNum = parseInt(k.replace('col', ''), 10);
      return `
        th[data-col="${k}"], td:nth-child(${colNum}) {
          width: ${pct}% !important;
          max-width: ${pct}% !important;
        }
      `;
    }).join('\n');

    // Clean up old print iframes if any
    const oldFrames = document.querySelectorAll('.gdt-print-isolated-frame');
    oldFrames.forEach(f => f.remove());

    const iframe = document.createElement('iframe');
    iframe.className = 'gdt-print-isolated-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.zIndex = '-9999';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="km">
      <head>
        <meta charset="UTF-8">
        <title>របាយការណ៍ផ្លូវការ - អគ្គនាយកដ្ឋានពន្ធដារ</title>
        <link rel="stylesheet" href="css/khmer-fonts.css">
        <link rel="stylesheet" href="css/style.css">
        <style>
          @page {
            size: ${paperSize} ${paperOrientation};
            margin: ${pageMargin};
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: ${fontColor} !important;
            font-family: ${activeFontStack} !important;
            font-size: ${fontSize}pt !important;
            width: 100% !important;
            height: auto !important;
          }
          .official-report-multi-wrapper {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .report-sheet-group-block {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            clear: both !important;
          }
          .report-sheet-group-block:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .official-report-sheet {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 auto !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            height: auto !important;
            font-family: ${activeFontStack} !important;
            color: ${fontColor} !important;
            position: relative !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .report-sheet-group-block:last-child .official-report-sheet,
          .official-report-sheet:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .no-print, .col-select, .report-selection-action-bar, .btn-row-del, .report-control-toolbar, .report-formatting-toolbar, .col-resizer, .btn-align-cycle, .btn-wrap-cycle, .btn-page-footer-hide, .th-actions-wrap, .report-edit-banner, .logo-change-badge, .divider-change-badge, .report-sheet-divider-banner, .page-footer-floating-tools {
            display: none !important;
          }
          .report-header-grid {
            display: grid !important;
            grid-template-columns: 1fr auto 1fr !important;
            align-items: flex-start !important;
            margin-bottom: 0.5rem !important;
            width: 100% !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .report-header-left {
            display: flex !important;
            flex-direction: column !important;
            line-height: 1.35 !important;
            color: ${fontColor} !important;
            font-size: ${layout.headerFontSize || 8.5}pt !important;
            font-family: ${muolFontStack} !important;
          }
          .report-header-left .header-line.bold,
          .report-header-left .header-line.highlight {
            font-family: ${muolFontStack} !important;
            font-weight: normal !important;
          }
          .report-header-left .header-line.dotted {
            font-family: ${activeFontStack} !important;
          }
          .report-header-center {
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            padding: 0 1rem !important;
          }
          .report-header-right {
            display: flex !important;
            flex-direction: column !important;
            line-height: 1.35 !important;
            color: ${fontColor} !important;
            font-size: ${layout.headerFontSize || 8.5}pt !important;
            font-family: ${muolFontStack} !important;
          }
          .kingdom-title,
          .kingdom-motto {
            font-family: ${muolFontStack} !important;
            font-weight: normal !important;
          }
          .kingdom-divider {
            display: flex !important;
            align-items: center !important;
            width: 100% !important;
          }
          .kingdom-divider img, .kingdom-divider svg {
            display: block !important;
          }
          .report-title-section {
            margin-bottom: 0.65rem !important;
            text-align: center !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .report-main-title {
            font-size: ${layout.titleFontSize || 12}pt !important;
            font-family: ${muolFontStack} !important;
            font-weight: normal !important;
            margin: 0 !important;
            line-height: 1.35 !important;
            color: ${fontColor} !important;
          }
          .report-table-wrapper {
            width: 100% !important;
            overflow: visible !important;
            margin-bottom: 0.75rem !important;
          }
          .official-gdt-table {
            width: 100% !important;
            border-collapse: collapse !important;
            border-spacing: 0 !important;
            margin: 0 !important;
            font-size: ${fontSize}pt !important;
            font-family: ${activeFontStack} !important;
            page-break-inside: auto !important;
            table-layout: fixed !important;
            ${tableBorderRule}
            color: ${fontColor} !important;
          }
          .official-gdt-table thead {
            display: table-header-group !important;
          }
          .official-gdt-table thead th {
            background-color: #fce4d6 !important;
            color: ${fontColor} !important;
            font-weight: 700 !important;
            ${cellBorderRule}
            background-clip: padding-box !important;
            padding: ${cellPadding} !important;
            text-align: center !important;
            vertical-align: middle !important;
            line-height: 1.25 !important;
            word-break: keep-all !important;
            box-sizing: border-box !important;
          }
          .official-gdt-table thead th span {
            word-break: keep-all !important;
          }
          .official-gdt-table tbody td {
            ${cellBorderRule}
            background-clip: padding-box !important;
            color: ${fontColor} !important;
            padding: ${cellPadding} !important;
            vertical-align: middle !important;
            box-sizing: border-box !important;
            ${whiteSpaceRule}
          }
          ${colRules}
          .cell-shrink {
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          .cell-wrap {
            white-space: normal !important;
            word-break: break-word !important;
          }
          .official-gdt-table tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .report-summary-bar td {
            background-color: #fce4d6 !important;
            ${cellBorderRule}
            color: ${fontColor} !important;
            font-weight: 700 !important;
            padding: ${cellPadding} !important;
            box-sizing: border-box !important;
          }
          .report-signatures-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr 1fr !important;
            text-align: center !important;
            margin-top: 0.85rem !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            font-size: ${sigSize}pt !important;
            color: ${fontColor} !important;
            font-family: ${sigFontStack} !important;
            transform: translate(${layout.sigOffsetX || 0}px, ${layout.sigOffsetY || 0}px) !important;
          }
          .signature-col {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            line-height: 1.4 !important;
            color: ${fontColor} !important;
          }
          .signature-col .sig-header-kh {
            font-weight: 700 !important;
          }
          .signature-col .sig-role-title {
            font-weight: 700 !important;
            margin-top: 0.25rem !important;
          }
          .signature-col .sig-space {
            height: ${layout.sigSpaceHeight || 38}px !important;
          }
          .report-page-footer {
            margin-top: 0.85rem !important;
            padding-top: 0.35rem !important;
            padding-bottom: 0 !important;
            text-align: ${pageNumAlign} !important;
            font-size: ${layout.pageNumberFontSize || 8.5}pt !important;
            color: ${fontColor} !important;
            display: ${layout.showPageNumber !== false ? 'flex' : 'none'} !important;
            align-items: center !important;
            justify-content: ${pageFlexJustify} !important;
            width: 100% !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .page-footer-content-wrap {
            display: inline-block !important;
            text-align: center !important;
            transform: translate(${layout.pageNumberOffsetX || 0}px, ${layout.pageNumberOffsetY || 0}px) !important;
          }
        </style>
      </head>
      <body>
        ${reportWrapper.outerHTML}
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        console.warn('Iframe print error, falling back to window.print():', err);
        window.print();
      }
      setTimeout(() => {
        try { iframe.remove(); } catch (e) {}
      }, 3500);
    }, 350);
  }

  /* ---------------- Excel Export ---------------- */
  exportExcel() {
    const data = this.getFilteredData();
    if (!data || data.length === 0) {
      if (typeof app !== 'undefined' && app.showToast) {
        app.showToast('⚠️ មិនមានទិន្នន័យស្របតាមលក្ខខណ្ឌតម្រងដើម្បីនាំចេញ Excel ឡើយ!', 'warning');
      } else {
        alert('មិនមានទិន្នន័យដើម្បីនាំចេញ Excel ឡើយ');
      }
      return;
    }

    this.openExcelConfirmModal();
  }

  openExcelConfirmModal() {
    const modal = document.getElementById('report-excel-confirm-modal');
    if (!modal) {
      this.executeFullExcelExport();
      return;
    }

    const data = this.getFilteredData();
    const reasonText = this.selectedReason || 'គ្រប់មូលហេតុទាំងអស់ (បំបែកតាមលក្ខខណ្ឌ)';
    const deptText = this.selectedDept || 'គ្រប់អង្គភាព (All Departments)';
    const yearText = this.selectedYear ? `ឆ្នាំ ${this.selectedYear}` : 'គ្រប់ឆ្នាំ';

    const infoReason = document.getElementById('excel-confirm-reason-val');
    const infoDept = document.getElementById('excel-confirm-dept-val');
    const infoYear = document.getElementById('excel-confirm-year-val');
    const infoCount = document.getElementById('excel-confirm-count-val');

    if (infoReason) infoReason.textContent = reasonText;
    if (infoDept) infoDept.textContent = deptText;
    if (infoYear) infoYear.textContent = yearText;
    if (infoCount) infoCount.textContent = `${data.length} នាក់ (Records)`;

    modal.style.display = 'flex';
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  closeExcelConfirmModal() {
    const modal = document.getElementById('report-excel-confirm-modal');
    if (!modal) return;
    modal.style.display = 'none';
  }

  executeFullExcelExport() {
    this.closeExcelConfirmModal();

    const data = this.getFilteredData();
    if (!data || data.length === 0) return;

    if (typeof XLSX === 'undefined') {
      alert('SheetJS (XLSX) library is not loaded.');
      return;
    }

    const cfg = this.customConfig;
    const khSelectedYear = this.selectedYear ? this.toKhmerNumber(this.selectedYear) : '២០២៦';
    const adaptYearInText = (str) => {
      if (!str || !this.selectedYear) return str;
      return str.replace(/ឆ្នាំ(២០២[០-៩]|[0-9]{4})/g, `ឆ្នាំ${khSelectedYear}`);
    };

    const groupedData = this.getGroupedDataByReason();
    const reasonKeys = Object.keys(groupedData);
    const wb = XLSX.utils.book_new();

    reasonKeys.forEach((rName, rIdx) => {
      const reasonData = groupedData[rName];
      const rTitle = this.getGeneratedReportTitleForReason(rName);
      const col11Text = `ថ្ងៃខែឆ្នាំ ${this.getCol11ShortTextForReason(rName)}`;

      let maleCount = 0;
      let femaleCount = 0;
      reasonData.forEach(item => {
        const g = this.formatGenderShort(item.gender);
        if (g === 'ប') maleCount++;
        else if (g === 'ស') femaleCount++;
      });

      const aoa = [];
      aoa.push([cfg.headerLine1, '', '', '', '', '', '', '', '', cfg.kingdomTitle, '', '']);
      aoa.push([cfg.headerLine2, '', '', '', '', '', '', '', '', cfg.kingdomMotto, '', '']);
      aoa.push([cfg.headerLine3, '', '', '', '', '', '', '', '', '', '', '']);
      aoa.push([cfg.headerLine4, '', '', '', '', '', '', '', '', '', '', '']);
      aoa.push(['']);
      aoa.push([rTitle, '', '', '', '', '', '', '', '', '', '', '']);
      aoa.push(['']);

      aoa.push([
        'ល.រ',
        'អត្តលេខ កសហវ',
        'នាម-គោត្តនាម (អក្សរឡាតាំង)',
        'នាម-គោត្តនាម (ភាសាខ្មែរ)',
        'អត្តលេខ អពដ',
        'ភេទ',
        'ថ្ងៃខែឆ្នាំ កំណើត',
        'អង្គភាព',
        'តួនាទី',
        'ថ្ងៃខែឆ្នាំ បម្រើការងារ',
        col11Text,
        'ផ្សេងៗ'
      ]);

      reasonData.forEach((item, idx) => {
        const remarksOrPrakas = item.prakasNo 
          ? (item.description ? `${item.prakasNo} ${item.description}` : item.prakasNo)
          : (item.description || item.remark || '-');

        aoa.push([
          idx + 1,
          item.secondaryId || '',
          (item.latinName || '').toUpperCase(),
          item.khmerName || '',
          item.staffId || '',
          this.formatGenderShort(item.gender),
          this.formatReportDate(item.dob),
          item.department || '',
          item.position || 'មន្ត្រី',
          this.formatReportDate(item.serviceStartDate),
          this.formatReportDate(item.endDate || item.requestDate),
          remarksOrPrakas
        ]);
      });

      const summaryRowIdx = aoa.length;
      aoa.push([
        `ចំនួនសរុប ៖ ${reasonData.length} នាក់,   ប្រុស ៖ ${maleCount} នាក់,   ស្រី ៖ ${femaleCount} នាក់`,
        '', '', '', '', '', '', '', '', '', '', ''
      ]);

      aoa.push(['']);
      aoa.push(['']);

      const sigStartIdx = aoa.length;
      aoa.push([cfg.sig1Header, '', '', '', cfg.sig2Header, '', '', '', cfg.sig3Header, '', '', '']);
      aoa.push([adaptYearInText(cfg.sig1Date), '', '', '', adaptYearInText(cfg.sig2Date), '', '', '', adaptYearInText(cfg.sig3Date), '', '', '']);
      aoa.push([adaptYearInText(cfg.sig1Place), '', '', '', adaptYearInText(cfg.sig2Place), '', '', '', adaptYearInText(cfg.sig3Place), '', '', '']);
      aoa.push([cfg.sig1Role, '', '', '', cfg.sig2Role, '', '', '', cfg.sig3Role, '', '', '']);

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 4 } },
        { s: { r: 0, c: 9 }, e: { r: 0, c: 11 } },
        { s: { r: 1, c: 9 }, e: { r: 1, c: 11 } },
        { s: { r: 5, c: 0 }, e: { r: 5, c: 11 } },
        { s: { r: summaryRowIdx, c: 0 }, e: { r: summaryRowIdx, c: 11 } },
        { s: { r: sigStartIdx, c: 0 }, e: { r: sigStartIdx, c: 3 } },
        { s: { r: sigStartIdx, c: 4 }, e: { r: sigStartIdx, c: 7 } },
        { s: { r: sigStartIdx, c: 8 }, e: { r: sigStartIdx, c: 11 } },
        { s: { r: sigStartIdx + 1, c: 0 }, e: { r: sigStartIdx + 1, c: 3 } },
        { s: { r: sigStartIdx + 1, c: 4 }, e: { r: sigStartIdx + 1, c: 7 } },
        { s: { r: sigStartIdx + 1, c: 8 }, e: { r: sigStartIdx + 1, c: 11 } },
        { s: { r: sigStartIdx + 2, c: 0 }, e: { r: sigStartIdx + 2, c: 3 } },
        { s: { r: sigStartIdx + 2, c: 4 }, e: { r: sigStartIdx + 2, c: 7 } },
        { s: { r: sigStartIdx + 2, c: 8 }, e: { r: sigStartIdx + 2, c: 11 } },
        { s: { r: sigStartIdx + 3, c: 0 }, e: { r: sigStartIdx + 3, c: 3 } },
        { s: { r: sigStartIdx + 3, c: 4 }, e: { r: sigStartIdx + 3, c: 7 } },
        { s: { r: sigStartIdx + 3, c: 8 }, e: { r: sigStartIdx + 3, c: 11 } }
      ];

      const userCols = this.tableLayout.colWidths || this.getDefaultColWidths();
      ws['!cols'] = [
        { wch: Math.round((userCols.col1 || 36) / 7.5) },
        { wch: Math.round((userCols.col2 || 85) / 7.5) },
        { wch: Math.round((userCols.col3 || 125) / 7.5) },
        { wch: Math.round((userCols.col4 || 120) / 7.5) },
        { wch: Math.round((userCols.col5 || 70) / 7.5) },
        { wch: Math.round((userCols.col6 || 36) / 7.5) },
        { wch: Math.round((userCols.col7 || 85) / 7.5) },
        { wch: Math.round((userCols.col8 || 145) / 7.5) },
        { wch: Math.round((userCols.col9 || 85) / 7.5) },
        { wch: Math.round((userCols.col10 || 85) / 7.5) },
        { wch: Math.round((userCols.col11 || 85) / 7.5) },
        { wch: Math.round((userCols.col12 || 215) / 7.5) }
      ];

      let sheetTabName = rName ? rName.replace(/[\s/\\?%*:|"<>]/g, '_').slice(0, 28) : `Sheet_${rIdx + 1}`;
      if (!sheetTabName) sheetTabName = `Reason_${rIdx + 1}`;
      XLSX.utils.book_append_sheet(wb, ws, sheetTabName);
    });

    const nowStr = new Date().toISOString().slice(0, 10);
    const filename = `Official_Report_All_Reasons_${nowStr}.xlsx`;
    XLSX.writeFile(wb, filename);

    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`📊 បានទាញយកឯកសារ Excel "${filename}" ដោយបំបែកតាមមូលហេតុនីមួយៗ (${reasonKeys.length} សន្លឹក)!`, 'success');
    }
  }
}

const reportsController = new ReportsController();

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (typeof reportsController !== 'undefined' && typeof reportsController.init === 'function') {
      reportsController.init();
    }
  }, 100);
});
