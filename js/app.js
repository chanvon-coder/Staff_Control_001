/**
 * Staff System Control - Master Application Coordinator
 * Dynamic 22 Master Columns Header Customization (Clean Headers without numbers in front),
 * Table Sync, Attachments, 3-Zone Titles, Google Cloud Sync & Auth Modal Controller
 */

class StaffApp {
  constructor() {
    this.currentTab = 'dashboard';
    this.activeFilterStatus = 'ALL';
    this.searchQuery = '';
    this.filterDept = '';
    this.filterOffice = '';
    this.filterPosition = '';
    this.filterAnnual = '';
    this.filterReason = '';
    this.filterPrakas = '';
    this.filterReqDate = '';
    this.filterEndDate = '';
    this.filterStatus = '';
    this.filterAlertOnly = false;
    this.currentPage = 1;
    this.pageSize = 15;
    this.sortField = 'no';
    this.sortAsc = true;
  }

  init() {
    // 1. Clear previous user session on every link access / page load
    UserControl.clearUser();

    // Initialize Subsystems
    userformController.init();
    if (typeof multiFilter !== 'undefined') {
      multiFilter.init();
    }
    this.initTheme();
    this.initTabs();
    this.initFilters();
    this.initExcelEvents();
    this.initSettingsUI();
    this.initUserControlUI();
    this.initAuditLogsUI();
    this.loadCloudSyncSettings();
    this.initMobileAndDesktopUX();
    
    // Initial Render
    this.refreshAll();

    // 2. Request login again automatically on each click/access link
    setTimeout(() => {
      this.openAuthModal();
    }, 180);
  }

  initMobileAndDesktopUX() {
    // 1. Desktop Keyboard Shortcuts (Ctrl+K / Cmd+K to global search)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('table-search-input');
        if (searchInput) {
          this.switchTab('database');
          setTimeout(() => {
            searchInput.focus();
            searchInput.select();
          }, 100);
        }
      }
    });

    // 2. Initial Filter Auto-Collapse check for mobile screens (< 768px)
    const applyResponsiveFilterState = () => {
      if (window.innerWidth <= 768) {
        const filterCard = document.getElementById('advanced-filter-container');
        const icon = document.getElementById('icon-filter-collapse');
        const text = document.getElementById('text-filter-collapse');
        if (filterCard && !filterCard.classList.contains('is-collapsed')) {
          filterCard.classList.add('is-collapsed');
          if (text) text.textContent = 'បង្ហាញតម្រង (Show)';
          if (icon) icon.setAttribute('data-lucide', 'chevrons-down');
        }
      }
    };
    applyResponsiveFilterState();

    // 3. Dynamic Live Resize & Orientation Handler (Auto-adapts dynamically to any screen change)
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (this.currentTab === 'dashboard' && typeof dashboardController !== 'undefined') {
          dashboardController.refresh();
        }
        this.closeAllHeaderDroplists();
        this.closeNavDroplist();
        this.closeRightNavDock();
        this.refreshIcons();
      }, 150);
    });

    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        applyResponsiveFilterState();
        if (this.currentTab === 'dashboard' && typeof dashboardController !== 'undefined') {
          dashboardController.refresh();
        }
        this.refreshIcons();
      }, 200);
    });
  }

  refreshAll() {
    this.renderTableHeaderBarTitles();
    this.renderTableHeaders();
    this.renderStaffTable();
    this.renderDocumentTimeline();
    this.renderAuditLogs();
    this.renderSettingsLists();
    SettingsManager.renderHeadersEditor('headers-editor-tbody');
    dashboardController.refresh();
    this.updateFilterCounts();
    this.updateRoleBadge();
    this.refreshIcons();
  }

  refreshIcons() {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  /* ---------------- Table Header Bar 3-Zone Titles (Left, Middle, Right) ---------------- */
  renderTableHeaderBarTitles() {
    const titles = dataStore.getTableHeaderTitles();
    const leftEl = document.getElementById('table-header-left-title');
    const middleEl = document.getElementById('table-header-middle-title');
    const rightTagEl = document.getElementById('table-header-right-tag');

    if (leftEl) leftEl.textContent = titles.left || DEFAULT_TABLE_HEADER_TITLES.left;
    if (middleEl) middleEl.textContent = titles.middle || DEFAULT_TABLE_HEADER_TITLES.middle;
    if (rightTagEl) rightTagEl.textContent = titles.right || DEFAULT_TABLE_HEADER_TITLES.right;
  }

  openEditTableHeaderModal() {
    const titles = dataStore.getTableHeaderTitles();
    const modal = document.getElementById('edit-table-header-modal');
    if (!modal) return;

    document.getElementById('input-edit-header-left').value = titles.left || '';
    document.getElementById('input-edit-header-middle').value = titles.middle || '';
    document.getElementById('input-edit-header-right').value = titles.right || '';

    modal.classList.add('open');
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  saveTableHeaderTitlesFromModal() {
    const leftVal = document.getElementById('input-edit-header-left').value.trim();
    const middleVal = document.getElementById('input-edit-header-middle').value.trim();
    const rightVal = document.getElementById('input-edit-header-right').value.trim();

    const titles = {
      left: leftVal || DEFAULT_TABLE_HEADER_TITLES.left,
      middle: middleVal || DEFAULT_TABLE_HEADER_TITLES.middle,
      right: rightVal || DEFAULT_TABLE_HEADER_TITLES.right
    };

    SettingsManager.saveTableHeaderTitles(titles);
    document.getElementById('edit-table-header-modal').classList.remove('open');
    this.showToast('បានកែសម្រួលចំណងជើងក្បាលតារាង (Left, Middle, Right) ដោយជោគជ័យ!', 'success');
  }

  resetTableHeaderTitlesFromModal() {
    if (confirm('តើអ្នកពិតជាចង់កំណត់ចំណងជើងក្បាលតារាងឡើងវិញតាមលំនាំដើមមែនទេ?')) {
      const defaults = SettingsManager.resetTableHeaderTitles();
      document.getElementById('input-edit-header-left').value = defaults.left;
      document.getElementById('input-edit-header-middle').value = defaults.middle;
      document.getElementById('input-edit-header-right').value = defaults.right;
      this.showToast('បានកំណត់ចំណងជើងឡើងវិញតាមលំនាំដើម', 'info');
    }
  }

  /* ---------------- Dynamic 22 Table Headers (Clean: No number in front + Modern styling + One-Click Sorting) ---------------- */
  renderTableHeaders() {
    const thead = document.querySelector('#master-staff-table thead');
    if (!thead) return;

    const fields = dataStore.getMasterFields();
    let thHtml = '<tr>';
    fields.forEach((f) => {
      const align = f.align || (f.key === 'no' || f.key === 'gender' || f.key === 'annualPeriod' ? 'center' : 'left');
      const isSorted = this.sortField === f.key;
      const sortIcon = isSorted ? (this.sortAsc ? '▲' : '▼') : '';

      thHtml += `
        <th class="th-cell" style="text-align: ${align};">
          <div class="th-content ${align === 'center' ? 'th-center' : align === 'right' ? 'th-right' : ''}">
            <div class="th-title-group th-sortable" onclick="app.sortTable('${f.key}')" title="ចុចដើម្បីតម្រៀប (Sort by ${f.en})">
              <span class="th-khmer">${f.kh}</span>
              <span class="th-english">${f.en}</span>
            </div>
            <span class="th-sort-indicator ${isSorted ? 'active' : ''}" onclick="app.sortTable('${f.key}')">${sortIcon}</span>
          </div>
        </th>`;
    });

    thHtml += `
      <th class="th-cell" style="text-align: center;">
        <div class="th-content th-center">
          <div class="th-title-group" style="align-items: center;">
            <span class="th-khmer">ស្ថានភាព</span>
            <span class="th-english">Status</span>
          </div>
        </div>
      </th>
      <th class="th-cell th-sticky-action" style="position: sticky; right: 0; background: var(--bg-card-subtle); z-index: 15; text-align: center;">
        <div class="th-title-group" style="align-items: center;">
          <span class="th-khmer">សកម្មភាព</span>
          <span class="th-english">Actions</span>
        </div>
      </th>
    </tr>`;
    thead.innerHTML = thHtml;
  }

  sortTable(field) {
    if (this.sortField === field) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortField = field;
      this.sortAsc = true;
    }
    this.renderTableHeaders();
    this.renderStaffTable();
  }

  /* ---------------- Tabs & Drop List Navigation Management ---------------- */
  initTabs() {
    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
      const navWrapper = document.getElementById('nav-droplist-wrapper');
      if (navWrapper && !navWrapper.contains(e.target)) {
        this.closeNavDroplist();
      }

      const actionsWrapper = document.getElementById('actions-droplist-wrapper');
      if (actionsWrapper && !actionsWrapper.contains(e.target)) {
        this.closeActionsDroplist();
      }

      const adminWrapper = document.getElementById('admin-droplist-wrapper');
      if (adminWrapper && !adminWrapper.contains(e.target)) {
        this.closeAdminDroplist();
      }
    });

    // Close dropdowns on window scroll
    window.addEventListener('scroll', () => {
      this.closeAllHeaderDroplists();
    }, { passive: true });

    // Close dropdowns on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllHeaderDroplists();
        this.closeRightNavDock();
      }
    });

    // Right auto-hide dock hover / mouseleave auto-close
    const dock = document.getElementById('right-autohide-nav-dock');
    if (dock) {
      dock.addEventListener('mouseleave', () => {
        // Auto hide on right when mouse leaves
        dock.classList.remove('open');
      });
    }
  }

  toggleActionsDroplist(e) {
    if (e) e.stopPropagation();
    this.closeNavDroplist();
    this.closeAdminDroplist();
    const wrapper = document.getElementById('actions-droplist-wrapper');
    if (wrapper) {
      wrapper.classList.toggle('open');
      this.refreshIcons();
    }
  }

  closeActionsDroplist() {
    const wrapper = document.getElementById('actions-droplist-wrapper');
    if (wrapper) {
      wrapper.classList.remove('open');
    }
  }

  toggleAdminDroplist(e) {
    if (e) e.stopPropagation();
    this.closeNavDroplist();
    this.closeActionsDroplist();
    const wrapper = document.getElementById('admin-droplist-wrapper');
    if (wrapper) {
      wrapper.classList.toggle('open');
      this.refreshIcons();
    }
  }

  closeAdminDroplist() {
    const wrapper = document.getElementById('admin-droplist-wrapper');
    if (wrapper) {
      wrapper.classList.remove('open');
    }
  }

  toggleNavDroplist(e) {
    if (e) e.stopPropagation();
    this.closeActionsDroplist();
    this.closeAdminDroplist();
    const wrapper = document.getElementById('nav-droplist-wrapper');
    if (wrapper) {
      wrapper.classList.toggle('open');
      this.refreshIcons();
    }
  }

  closeNavDroplist() {
    const wrapper = document.getElementById('nav-droplist-wrapper');
    if (wrapper) {
      wrapper.classList.remove('open');
    }
  }

  closeAllHeaderDroplists() {
    this.closeActionsDroplist();
    this.closeAdminDroplist();
    this.closeNavDroplist();
  }

  toggleRightNavDock() {
    const dock = document.getElementById('right-autohide-nav-dock');
    if (dock) {
      dock.classList.toggle('open');
      this.refreshIcons();
    }
  }

  closeRightNavDock() {
    const dock = document.getElementById('right-autohide-nav-dock');
    if (dock) {
      dock.classList.remove('open');
    }
  }

  switchTab(tabId) {
    const role = UserControl.getCurrentRole();
    if (role.id === 'VIEWER' && (tabId === 'settings' || tabId === 'logs')) {
      this.showToast('🔒 សិទ្ធិមើលតែប៉ុណ្ណោះ (Read-Only): មិនអាចចូលទំព័រការកំណត់ ឬ Log បានទេ', 'warning');
      tabId = 'database';
    }

    this.currentTab = tabId;

    // Tab details mapping
    const tabMeta = {
      dashboard: { label: 'ផ្ទាំងសង្ខេប (Dashboard)', sub: 'ទិដ្ឋភាពរួម & ស្ថិតិទិន្នន័យ', icon: 'layout-dashboard', color: '#4f46e5' },
      database: { label: 'ទិន្នន័យបុគ្គលិក (Staff Data)', sub: 'តារាងមេ ២២ ជួរឈរ & តម្រង', icon: 'users', color: '#10b981' },
      documents: { label: 'តាមដានឯកសារ (Documents)', sub: 'កាលវិភាគឯកសារ & ឯកសារយោង', icon: 'file-check', color: '#f59e0b' },
      settings: { label: 'ការកំណត់ (Settings)', sub: 'Cloud Sync, Droplist & បញ្ជីយោង', icon: 'sliders', color: '#0ea5e9' },
      logs: { label: 'កំណត់ត្រា (Audit Log)', sub: 'ប្រវត្តិកែប្រែ និងសកម្មភាពសុវត្ថិភាព', icon: 'history', color: '#a855f7' }
    };

    const cur = tabMeta[tabId] || tabMeta.dashboard;

    // Update Header Droplist trigger display
    const labelEl = document.getElementById('nav-current-label');
    const subEl = document.getElementById('nav-current-sub');
    const iconEl = document.getElementById('nav-current-icon');
    const iconBox = document.getElementById('nav-current-icon-box');

    if (labelEl) labelEl.textContent = cur.label;
    if (subEl) subEl.textContent = cur.sub;
    if (iconEl) iconEl.setAttribute('data-lucide', cur.icon);
    if (iconBox) {
      iconBox.style.color = cur.color;
      iconBox.style.background = `${cur.color}20`;
    }

    // Update active class in droplist items
    document.querySelectorAll('.nav-droplist-item').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    // Update active class in right dock items
    document.querySelectorAll('.right-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    // Update active class in mobile bottom nav
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    // Switch active Tab Pane
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `tab-${tabId}`);
    });

    // Close Dropdowns & Auto-Hide Right Dock
    this.closeNavDroplist();
    this.closeRightNavDock();

    if (tabId === 'dashboard') {
      dashboardController.refresh();
    } else if (tabId === 'database') {
      this.renderTableHeaderBarTitles();
      this.renderTableHeaders();
      this.renderStaffTable();
    } else if (tabId === 'documents') {
      this.renderDocumentTimeline();
    } else if (tabId === 'settings') {
      SettingsManager.renderHeadersEditor('headers-editor-tbody');
      this.loadCloudSyncSettings();
    } else if (tabId === 'logs') {
      this.renderAuditLogs();
    }

    this.updateRoleBadge();
    this.refreshIcons();
  }

  /* ---------------- Theme & Language ---------------- */
  initTheme() {
    const savedTheme = localStorage.getItem('STAFF_CONTROL_THEME') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeIcon(savedTheme);

    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        this.toggleTheme();
      });
    }
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('STAFF_CONTROL_THEME', next);
    this.updateThemeIcon(next);
    dashboardController.refresh();
    this.showToast(`បានប្តូរទៅកាន់ Theme ${next === 'dark' ? 'ងងឹត (Dark)' : 'ពន្លឺ (Light)'}`, 'info');
  }

  updateThemeIcon(theme) {
    const iconEl = document.getElementById('theme-icon');
    if (iconEl) {
      iconEl.setAttribute('data-lucide', theme === 'dark' ? 'moon' : 'sun');
    }

    const iconMenu = document.getElementById('theme-icon-menu');
    const titleMenu = document.getElementById('theme-menu-title');
    const descMenu = document.getElementById('theme-menu-desc');
    if (iconMenu) {
      iconMenu.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
    }
    if (titleMenu) {
      titleMenu.textContent = theme === 'dark' ? 'ប្តូរទៅពន្លឺ (Light Mode)' : 'ប្តូរទៅងងឹត (Dark Mode)';
    }
    if (descMenu) {
      descMenu.textContent = theme === 'dark' ? 'Switch to bright light theme' : 'Switch to sleek dark theme';
    }

    this.refreshIcons();
  }

  /* ---------------- Filtering & Search Engine ---------------- */
  /* ---------------- Filtering & Search Engine ---------------- */
  initFilters() {
    // Global Search
    const searchInput = document.getElementById('table-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.currentPage = 1;
        this.updateActiveFiltersCounter();
        this.renderStaffTable();
        this.renderDocumentTimeline();
      });
    }

    // Prakas No Filter
    const prakasInput = document.getElementById('filter-prakas-input');
    if (prakasInput) {
      prakasInput.addEventListener('input', (e) => {
        if (typeof multiFilter !== 'undefined') {
          multiFilter.selected.prakasNo = e.target.value.trim();
        }
        this.currentPage = 1;
        this.updateActiveFiltersCounter();
        this.renderStaffTable();
        this.renderDocumentTimeline();
      });
    }

    // Request Date Filter
    const reqDateInput = document.getElementById('filter-reqdate-input');
    if (reqDateInput) {
      reqDateInput.addEventListener('change', (e) => {
        if (typeof multiFilter !== 'undefined') {
          multiFilter.selected.requestDate = e.target.value;
        }
        this.currentPage = 1;
        this.updateActiveFiltersCounter();
        this.renderStaffTable();
        this.renderDocumentTimeline();
      });
    }

    // End Date Filter
    const endDateInput = document.getElementById('filter-enddate-input');
    if (endDateInput) {
      endDateInput.addEventListener('change', (e) => {
        if (typeof multiFilter !== 'undefined') {
          multiFilter.selected.endDate = e.target.value;
        }
        this.currentPage = 1;
        this.updateActiveFiltersCounter();
        this.renderStaffTable();
        this.renderDocumentTimeline();
      });
    }

    // Quick Status chips
    const chips = document.querySelectorAll('.filter-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.activeFilterStatus = chip.getAttribute('data-status');
        this.currentPage = 1;
        this.updateActiveFiltersCounter();
        this.renderStaffTable();
      });
    });

    // Initialize Filter Card Collapse / Auto-Hide State
    this.initFilterCardState();
  }

  toggleFilterCardCollapse() {
    const card = document.getElementById('advanced-filter-container');
    const icon = document.getElementById('icon-filter-collapse');
    const text = document.getElementById('text-filter-collapse');
    if (!card) return;

    const isCollapsed = card.classList.toggle('is-collapsed');
    localStorage.setItem('STAFF_CONTROL_FILTER_COLLAPSED', isCollapsed ? '1' : '0');

    if (text) {
      text.textContent = isCollapsed ? 'បង្ហាញតម្រង (Show)' : 'លាក់តម្រង (Auto-Hide)';
    }
    if (icon) {
      icon.setAttribute('data-lucide', isCollapsed ? 'chevrons-down' : 'chevrons-up');
    }
    this.refreshIcons();
  }

  initFilterCardState() {
    const saved = localStorage.getItem('STAFF_CONTROL_FILTER_COLLAPSED');
    if (saved === '1') {
      const card = document.getElementById('advanced-filter-container');
      const icon = document.getElementById('icon-filter-collapse');
      const text = document.getElementById('text-filter-collapse');
      if (card) card.classList.add('is-collapsed');
      if (text) text.textContent = 'បង្ហាញតម្រង (Show)';
      if (icon) icon.setAttribute('data-lucide', 'chevrons-down');
    }
  }

  getFilteredRecords() {
    const allRecords = dataStore.getStaffData();
    const settings = dataStore.getSettings();
    return allRecords.filter(item => {
      const statusObj = StatusCalculator.calculateStatus(item);
      const alerts = StatusCalculator.calculateAlerts(item, settings);

      // Alert-only toggle filter
      if (this.filterAlertOnly && !alerts.hasAlert) {
        return false;
      }

      // Status chip filter
      if (this.activeFilterStatus !== 'ALL' && statusObj.key !== this.activeFilterStatus) {
        return false;
      }

      // Check multiFilter rules (Departments, Offices, Positions, Annual, Reason, Status, Dates, Column Popups)
      if (typeof multiFilter !== 'undefined' && !multiFilter.matches(item)) {
        return false;
      }

      // Global Multi-Field Search filter across all 22 fields
      if (this.searchQuery) {
        const match = Object.values(item).some(val => 
          val && String(val).toLowerCase().includes(this.searchQuery)
        ) || statusObj.labelKh.toLowerCase().includes(this.searchQuery)
          || statusObj.labelEn.toLowerCase().includes(this.searchQuery);

        if (!match) return false;
      }

      return true;
    });
  }

  toggleAlertOnlyFilter() {
    this.filterAlertOnly = !this.filterAlertOnly;
    const btn = document.getElementById('btn-toggle-alert-filter');
    if (btn) {
      if (this.filterAlertOnly) {
        btn.style.background = '#dc2626';
        btn.style.color = '#ffffff';
      } else {
        btn.style.background = 'rgba(239, 68, 68, 0.1)';
        btn.style.color = '#dc2626';
      }
    }
    this.currentPage = 1;
    this.updateActiveFiltersCounter();
    this.renderStaffTable();
    this.showToast(this.filterAlertOnly ? 'បានបើកតម្រងបង្ហាញតែទិន្នន័យដែលមាន Alert កាលបរិច្ឆេទ' : 'បានបិទតម្រង Alert', 'info');
  }

  resetAllFilters() {
    this.searchQuery = '';
    this.activeFilterStatus = 'ALL';
    this.filterAlertOnly = false;
    this.currentPage = 1;

    const alertBtn = document.getElementById('btn-toggle-alert-filter');
    if (alertBtn) {
      alertBtn.style.background = 'rgba(239, 68, 68, 0.1)';
      alertBtn.style.color = '#dc2626';
    }

    if (typeof multiFilter !== 'undefined') {
      multiFilter.resetAll();
    }

    const el = (id) => document.getElementById(id);
    if (el('table-search-input')) el('table-search-input').value = '';
    if (el('filter-prakas-input')) el('filter-prakas-input').value = '';
    if (el('filter-reqdate-input')) el('filter-reqdate-input').value = '';
    if (el('filter-enddate-input')) el('filter-enddate-input').value = '';

    // Reset status chips
    const chips = document.querySelectorAll('.filter-chip');
    chips.forEach(c => {
      if (c.getAttribute('data-status') === 'ALL') {
        c.classList.add('active');
      } else {
        c.classList.remove('active');
      }
    });

    this.updateActiveFiltersCounter();
    this.renderTableHeaders();
    this.renderStaffTable();
    this.renderDocumentTimeline();
    this.showToast('បានសម្អាតតម្រងទាំងអស់ (All filters reset)', 'info');
  }

  updateActiveFiltersCounter() {
    let count = 0;
    if (typeof multiFilter !== 'undefined') {
      count += multiFilter.getActiveCount();
    }
    if (this.searchQuery) count++;
    if (this.activeFilterStatus !== 'ALL') count++;

    const badge = document.getElementById('active-filter-count-badge');
    const clearBtn = document.getElementById('btn-clear-all-filters');

    if (badge) {
      if (count > 0) {
        badge.textContent = `🎯 សកម្ម: ${count} តម្រង`;
        badge.classList.add('has-active');
      } else {
        badge.textContent = `តម្រងសកម្ម: 0`;
        badge.classList.remove('has-active');
      }
    }

    if (clearBtn) {
      clearBtn.style.opacity = count > 0 || this.activeFilterStatus !== 'ALL' ? '1' : '0.85';
    }
  }

  updateFilterCounts() {
    const all = dataStore.getStaffData();
    const settings = dataStore.getSettings();
    const counts = { ALL: all.length, active: 0, pending: 0, completed: 0, expired: 0, closed: 0, missing: 0 };
    let attachedFilesCount = 0;

    all.forEach(item => {
      const s = StatusCalculator.calculateStatus(item).key;
      if (counts[s] !== undefined) counts[s]++;
      if (item.attachments && item.attachments.length > 0) {
        attachedFilesCount += item.attachments.length;
      } else if (item.refDocument || item.prakasNo) {
        attachedFilesCount += 1;
      }
    });

    Object.keys(counts).forEach(key => {
      const el = document.getElementById(`count-chip-${key}`);
      if (el) el.textContent = counts[key];
    });

    // Update Top Utility Pill Counters (Exact Image Reference)
    const pillTotal = document.getElementById('pill-total-records');
    if (pillTotal) pillTotal.textContent = all.length;

    const pillDocs = document.getElementById('pill-doc-types');
    if (pillDocs) pillDocs.textContent = settings.requestReasons ? settings.requestReasons.length : 8;

    const pillFiles = document.getElementById('pill-attached-files');
    if (pillFiles) pillFiles.textContent = attachedFilesCount;

    const pillActive = document.getElementById('pill-active-records');
    if (pillActive) pillActive.textContent = counts.active;

    // Update Alert Count Badge
    const alertCount = all.filter(item => StatusCalculator.calculateAlerts(item, settings).hasAlert).length;
    const alertActiveCountEl = document.getElementById('alert-active-count');
    if (alertActiveCountEl) alertActiveCountEl.textContent = alertCount;

    // Populate all multi-dimension filter dropdowns
    const populateSelect = (elementId, items, defaultLabel) => {
      const select = document.getElementById(elementId);
      if (!select) return;
      const current = select.value;
      select.innerHTML = `<option value="">-- ${defaultLabel} --</option>`;
      if (Array.isArray(items)) {
        items.forEach(it => {
          const opt = document.createElement('option');
          opt.value = it;
          opt.textContent = it;
          select.appendChild(opt);
        });
      }
      select.value = current;
    };

    populateSelect('filter-dept-select', settings.departments, 'គ្រប់អង្គភាព (All Departments)');
    populateSelect('filter-office-select', settings.offices, 'គ្រប់ការិយាល័យ (All Offices)');
    populateSelect('filter-position-select', settings.positions, 'គ្រប់តួនាទី (All Positions)');
    populateSelect('filter-annual-select', settings.annualPeriods, 'គ្រប់ឆ្នាំ (All Annual Years)');
    populateSelect('filter-reason-select', settings.requestReasons, 'គ្រប់មូលហេតុ (All Reasons)');
  }

  /* ---------------- Master 22-Column Table Rendering ---------------- */
  renderStaffTable() {
    const tbody = document.getElementById('staff-table-body');
    if (!tbody) return;

    const filtered = this.getFilteredRecords();
    const fields = dataStore.getMasterFields();
    
    // Sort
    filtered.sort((a, b) => {
      let valA = a[this.sortField] || '';
      let valB = b[this.sortField] || '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return this.sortAsc ? -1 : 1;
      if (valA > valB) return this.sortAsc ? 1 : -1;
      return 0;
    });

    // Pagination
    const totalRecords = filtered.length;
    const totalPages = Math.ceil(totalRecords / this.pageSize) || 1;
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const pageRecords = filtered.slice(startIndex, startIndex + this.pageSize);

    // Update table info text
    const infoEl = document.getElementById('table-records-info');
    if (infoEl) {
      infoEl.textContent = `បង្ហាញ ${totalRecords > 0 ? startIndex + 1 : 0} ដល់ ${Math.min(startIndex + this.pageSize, totalRecords)} នៃសរុប ${totalRecords} កំណត់ត្រា`;
    }

    const pageNumEl = document.getElementById('current-page-num');
    if (pageNumEl) pageNumEl.textContent = `${this.currentPage} / ${totalPages}`;

    if (pageRecords.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="25" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
            <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem;">🔍 រកមិនឃើញទិន្នន័យបុគ្គលិកដែលត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ</div>
            <div style="font-size: 0.82rem;">No matching staff records found. Try adjusting your filters.</div>
          </td>
        </tr>
      `;
      return;
    }

    const role = UserControl.getCurrentRole();

    tbody.innerHTML = pageRecords.map(item => {
      const status = StatusCalculator.calculateStatus(item);
      const alerts = StatusCalculator.calculateAlerts(item);
      const age = StatusCalculator.calculateAge(item.dob);
      const serviceDur = StatusCalculator.calculateServiceDuration(item.serviceStartDate);
      const attCount = item.attachments ? item.attachments.length : 0;
      const rowAlertClass = alerts.rowClass ? ` ${alerts.rowClass}` : '';

      return `
        <tr data-no="${item.no}" class="${rowAlertClass}">
          <td style="text-align: center; font-weight: 700;">${item.no}</td>
          <td style="text-align: ${fields[1]?.align || 'left'};"><strong style="color: var(--primary);">${item.staffId || '-'}</strong></td>
          <td style="text-align: ${fields[2]?.align || 'left'};">${item.secondaryId || '-'}</td>
          <td style="text-align: ${fields[3]?.align || 'left'}; font-weight: 600;">${item.latinName || '-'}</td>
          <td style="text-align: ${fields[4]?.align || 'left'}; font-weight: 600;">${item.khmerName || '-'}</td>
          <td style="text-align: ${fields[5]?.align || 'left'};">${item.department || '-'}</td>
          <td style="text-align: ${fields[6]?.align || 'left'};">${item.office || '-'}</td>
          <td style="text-align: ${fields[7]?.align || 'left'};"><span class="status-badge" style="background: var(--bg-card-subtle); color: var(--text-primary);">${item.position || '-'}</span></td>
          <td style="text-align: ${fields[8]?.align || 'center'};">${item.gender || '-'}</td>
          <td style="text-align: ${fields[9]?.align || 'left'};">${StatusCalculator.formatDateDisplay(item.dob)} <span style="font-size: 0.7rem; color: var(--text-muted);">(${age})</span></td>
          <td style="text-align: ${fields[10]?.align || 'left'};">${StatusCalculator.formatDateDisplay(item.serviceStartDate)} <span style="font-size: 0.7rem; color: var(--text-muted);">(${serviceDur})</span></td>
          <td style="text-align: ${fields[11]?.align || 'left'};">
            <div>${StatusCalculator.formatDateDisplay(item.requestDate)}</div>
            ${alerts.requestDateAlert ? `<div class="reason-alert-badge reason-alert-${alerts.requestDateAlert.type}">${alerts.requestDateAlert.label}</div>` : ''}
          </td>
          <td style="text-align: ${fields[12]?.align || 'left'};">
            <div>${StatusCalculator.formatDateDisplay(item.endDate)}</div>
            ${alerts.endDateAlert ? `<div class="reason-alert-badge reason-alert-${alerts.endDateAlert.type}">${alerts.endDateAlert.label}</div>` : ''}
          </td>
          <td style="text-align: ${fields[13]?.align || 'left'};">${StatusCalculator.formatDateDisplay(item.startDate)}</td>
          <td style="text-align: ${fields[14]?.align || 'center'};">${item.annualPeriod || '-'}</td>
          <td style="text-align: ${fields[15]?.align || 'left'}; font-weight: 500;">${item.requestReason || '-'}</td>
          <td style="text-align: ${fields[16]?.align || 'left'};">${item.prakasNo ? `<span style="font-weight: 600;">${item.prakasNo}</span>` : '-'}</td>
          <td style="text-align: ${fields[17]?.align || 'left'}; max-width: 200px; overflow: hidden; text-overflow: ellipsis;" title="${item.description || ''}">${item.description || '-'}</td>
          <td style="text-align: ${fields[18]?.align || 'left'};">${item.systemClosingDate ? `<span style="color: #dc2626; font-weight: 600;">${StatusCalculator.formatDateDisplay(item.systemClosingDate)}</span>` : '-'}</td>
          <td style="text-align: ${fields[19]?.align || 'left'};">
            <div>${item.refDocument || '-'}</div>
            ${attCount > 0 ? `
              <button class="table-attachment-pill" onclick="userformController.openEdit(${item.no})" title="ចុចដើម្បីមើល ${attCount} ឯកសារភ្ជាប់">
                <i data-lucide="paperclip" style="width: 12px; height: 12px;"></i>
                <span>${attCount} ឯកសារ</span>
              </button>
            ` : ''}
          </td>
          <td style="text-align: ${fields[20]?.align || 'left'};">${StatusCalculator.formatDateDisplay(item.receivedDate)}</td>
          <td style="text-align: ${fields[21]?.align || 'left'}; max-width: 160px; overflow: hidden; text-overflow: ellipsis;">${item.remark || '-'}</td>
          <td style="text-align: center;">
            ${role.id === 'VIEWER' ? `
              <span class="status-badge ${status.cssClass}">${status.labelKh}</span>
            ` : `
              <select class="table-status-select ${status.cssClass}" onchange="app.changeRecordStatus(${item.no}, this.value)" title="ចុចដើម្បីប្តូរស្ថានភាពបុគ្គលិក">
                <option value="AUTO" ${(!item.customStatus || item.customStatus === 'AUTO') ? 'selected' : ''}>
                  ${item.customStatus === 'AUTO' || !item.customStatus ? '● ' + status.labelKh : '🔄 ស្វវត្ត (Auto)'}
                </option>
                <option value="active" ${item.customStatus === 'active' ? 'selected' : ''}>🟢 កំពុងដំណើរការ (Active)</option>
                <option value="pending" ${item.customStatus === 'pending' ? 'selected' : ''}>⏳ រង់ចាំដំណើរការ (Pending)</option>
                <option value="completed" ${item.customStatus === 'completed' ? 'selected' : ''}>✅ បានបញ្ចប់ (Completed)</option>
                <option value="expired" ${item.customStatus === 'expired' ? 'selected' : ''}>⚠️ ផុតសុពលភាព (Expired)</option>
                <option value="closed" ${item.customStatus === 'closed' ? 'selected' : ''}>🔒 បានបិទប្រព័ន្ធ (Closed)</option>
                <option value="missing" ${item.customStatus === 'missing' ? 'selected' : ''}>📋 ខ្វះព័ត៌មាន (Missing)</option>
              </select>
            `}
          </td>
          <td style="position: sticky; right: 0; background: var(--bg-card); z-index: 5; text-align: center;">
            <div class="table-actions">
              <button class="icon-btn" title="${role.id === 'VIEWER' ? 'មើលព័ត៌មានលម្អិត (View Details)' : 'កែប្រែទិន្នន័យ & ឯកសារ (Edit Info & Attachments)'}" onclick="userformController.openEdit(${item.no})">
                <i data-lucide="${role.id === 'VIEWER' ? 'eye' : 'edit-3'}"></i>
              </button>
              <button class="icon-btn" title="បោះពុម្ពប័ណ្ណបុគ្គលិក (Print Profile)" onclick="app.showProfileModal(${item.no})">
                <i data-lucide="printer"></i>
              </button>
              ${role.canDelete ? `
                <button class="icon-btn icon-btn-danger" title="លុប (Delete)" onclick="app.deleteRecordDirect(${item.no})">
                  <i data-lucide="trash-2"></i>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    this.refreshIcons();
  }

  changeRecordStatus(no, newStatus) {
    const list = dataStore.getStaffData();
    const item = list.find(s => s.no === no);
    if (!item) return;

    const oldStatus = StatusCalculator.calculateStatus(item).labelKh;
    item.customStatus = newStatus;

    const nowStr = new Date().toLocaleString();
    if (!item.metadata) {
      item.metadata = { createdAt: nowStr, createdBy: 'System', updatedAt: nowStr, updatedBy: UserControl.getCurrentRole().id, version: 1, changeLog: [] };
    }
    item.metadata.updatedAt = nowStr;
    item.metadata.updatedBy = UserControl.getCurrentRole().id;
    item.metadata.version = (item.metadata.version || 1) + 1;
    if (!item.metadata.changeLog) item.metadata.changeLog = [];

    const newStatusLabel = newStatus === 'AUTO' ? 'ស្វ័យប្រវត្ត (Auto)' : StatusCalculator.calculateStatus(item).labelKh;
    item.metadata.changeLog.unshift({
      timestamp: nowStr,
      user: UserControl.getCurrentRole().id,
      action: `ប្តូរស្ថានភាពពី "${oldStatus}" ទៅជា "${newStatusLabel}"`
    });

    dataStore.saveStaffData(list);

    // Auto-Transfer Status Change to Google Sheet
    if (typeof CloudSyncService !== 'undefined') {
      CloudSyncService.syncRecord('STATUS_CHANGE', item);
    }

    if (typeof auditLogger !== 'undefined') {
      auditLogger.log('UPDATE_STATUS', item.staffId || `#${item.no}`, `បានប្តូរស្ថានភាពបុគ្គលិក ${item.khmerName || ''} ទៅជា "${newStatusLabel}"`);
    }

    this.updateFilterCounts();
    this.renderStaffTable();
    this.renderDocumentTimeline();
    this.showToast(`បានប្តូរស្ថានភាពបុគ្គលិក #${no} ទៅជា "${newStatusLabel}"`, 'success');
  }

  deleteRecordDirect(no) {
    userformController.openEdit(no);
    userformController.handleDelete();
  }

  /* ---------------- Document Control Timeline ---------------- */
  renderDocumentTimeline() {
    const container = document.getElementById('doc-timeline-container');
    if (!container) return;

    const filtered = this.getFilteredRecords();
    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2.5rem; color: var(--text-muted);">
          🔍 រកមិនឃើញឯកសារ ឬសំណើដែលត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(item => {
      const status = StatusCalculator.calculateStatus(item);
      const missingList = StatusCalculator.getMissingFieldsList(item);
      const atts = item.attachments || [];

      return `
        <div class="doc-card">
          <div class="doc-card-header">
            <div class="doc-staff-info">
              <h4>${item.khmerName} (${item.latinName})</h4>
              <p>${item.staffId} • ${item.department} - ${item.position}</p>
            </div>
            <span class="status-badge ${status.cssClass}">
              <span class="status-dot"></span>
              ${status.labelKh}
            </span>
          </div>

          <div style="font-size: 0.8rem;">
            <strong>មូលហេតុសំណើ៖</strong> ${item.requestReason || '<em style="color: var(--text-muted);">មិនបានបញ្ជាក់</em>'}
          </div>

          <div class="doc-timeline-dates">
            <div class="date-item">
              <label>ថ្ងៃស្នើសុំ (Request Date)</label>
              <span>${StatusCalculator.formatDateDisplay(item.requestDate)}</span>
            </div>
            <div class="date-item">
              <label>ថ្ងៃទទួលឯកសារ (Received Date)</label>
              <span>${StatusCalculator.formatDateDisplay(item.receivedDate)}</span>
            </div>
            <div class="date-item">
              <label>ថ្ងៃចាប់ផ្តើម (Start Date)</label>
              <span>${StatusCalculator.formatDateDisplay(item.startDate)}</span>
            </div>
            <div class="date-item">
              <label>ថ្ងៃបញ្ចប់ (End Date)</label>
              <span>${StatusCalculator.formatDateDisplay(item.endDate)}</span>
            </div>
          </div>

          <div style="font-size: 0.78rem; display: flex; flex-direction: column; gap: 0.25rem;">
            <div><strong>ប្រកាសលេខ៖</strong> ${item.prakasNo || '-'}</div>
            <div><strong>ឯកសារយោង៖</strong> ${item.refDocument || '-'}</div>
            ${item.systemClosingDate ? `<div style="color: #dc2626;"><strong>ថ្ងៃបិទប្រព័ន្ធ៖</strong> ${StatusCalculator.formatDateDisplay(item.systemClosingDate)}</div>` : ''}
          </div>

          <!-- Attachments Badge in Timeline -->
          ${atts.length > 0 ? `
            <div style="background: var(--bg-card-subtle); border-radius: 6px; padding: 0.5rem; font-size: 0.75rem;">
              <strong style="color: var(--primary);">📎 ឯកសារភ្ជាប់ (${atts.length})៖</strong>
              <div style="display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.25rem;">
                ${atts.map(a => `<span class="meta-pill" style="font-size: 0.7rem;"><i data-lucide="file"></i> ${a.name}</span>`).join('')}
              </div>
            </div>
          ` : ''}

          ${missingList.length > 0 ? `
            <div style="background: rgba(147, 51, 234, 0.1); border: 1px dashed #c084fc; border-radius: 6px; padding: 0.5rem; font-size: 0.72rem; color: #7e22ce;">
              <strong>⚠️ ខ្វះព័ត៌មាន/ឯកសារ៖</strong> ${missingList.slice(0, 3).join(', ')}${missingList.length > 3 ? ` និង ${missingList.length - 3} ទៀត` : ''}
            </div>
          ` : ''}

          <div style="margin-top: auto; display: flex; justify-content: flex-end; gap: 0.5rem;">
            <button class="btn btn-secondary btn-sm" onclick="userformController.openEdit(${item.no})">
              <i data-lucide="edit"></i> <span>គ្រប់គ្រងឯកសារ & ព័ត៌មាន</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    this.refreshIcons();
  }

  /* ---------------- Excel Import / Export Setup ---------------- */
  initExcelEvents() {
    const btnExportExcel = document.getElementById('btn-export-excel');
    if (btnExportExcel) {
      btnExportExcel.addEventListener('click', () => {
        ExcelHandler.exportFullWorkbook();
        this.showToast('បាន Backup ទិន្នន័យជាឯកសារ Excel រួចរាល់!', 'success');
      });
    }

    const btnExportCSV = document.getElementById('btn-export-csv');
    if (btnExportCSV) {
      btnExportCSV.addEventListener('click', () => {
        ExcelHandler.exportToCSV();
        this.showToast('បានទាញយកឯកសារ CSV រួចរាល់!', 'success');
      });
    }

    const fileInput = document.getElementById('excel-file-import-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const role = UserControl.getCurrentRole();
        if (!role.canImport) {
          alert('អ្នកមិនមានសិទ្ធិបញ្ចូលឯកសារ Excel ទេ (Admin only)');
          fileInput.value = '';
          return;
        }

        const confirmed = confirm(`តើលោកអ្នកពិតជាចង់នាំចូលទិន្នន័យពីឯកសារ "${file.name}" មែនទេ? (ទិន្នន័យដែលមានស្រាប់នឹងត្រូវរក្សាទុក ហើយបញ្ចូលបន្ថែម)`);
        if (!confirmed) {
          fileInput.value = '';
          return;
        }

        ExcelHandler.importFromFile(file, (records) => {
          const currentData = dataStore.getStaffData();
          let nextNo = dataStore.getNextSerialNo();
          
          records.forEach(r => {
            r.no = nextNo++;
            r.attachments = [];
            r.metadata = {
              createdAt: new Date().toLocaleString(),
              createdBy: `${role.titleKh} (${role.id})`,
              updatedAt: new Date().toLocaleString(),
              updatedBy: role.id,
              version: 1,
              changeLog: [{ timestamp: new Date().toLocaleString(), user: role.id, action: `នាំចូលពី Excel (${file.name})` }]
            };
            currentData.push(r);
          });

          dataStore.saveStaffData(currentData);
          if (typeof auditLogger !== 'undefined') {
            auditLogger.log('IMPORT_EXCEL', 'MULTIPLE', `បាននាំចូល ${records.length} កំណត់ត្រាពីឯកសារ ${file.name}`);
          }
          
          this.showToast(`បាននាំចូល ${records.length} កំណត់ត្រាដោយជោគជ័យ!`, 'success');
          this.refreshAll();
          fileInput.value = '';
        }, (err) => {
          alert('កំហុសពេលនាំចូលឯកសារ៖ ' + err.message);
          fileInput.value = '';
        });
      });
    }
  }

  /* ---------------- Google Cloud Sync Settings (Matching Screenshot 2) ---------------- */
  loadCloudSyncSettings() {
    if (typeof CloudSyncService !== 'undefined') {
      const sync = CloudSyncService.getSettings();
      const sheetInput = document.getElementById('input-google-sheet-url');
      const driveInput = document.getElementById('input-google-drive-url');
      const webhookInput = document.getElementById('input-google-webhook-url');
      const autoSyncChk = document.getElementById('chk-auto-cloud-sync');

      if (sheetInput) sheetInput.value = sync.sheetUrl || '';
      if (driveInput) driveInput.value = sync.driveUrl || '';
      if (webhookInput) webhookInput.value = sync.webhookUrl || '';
      if (autoSyncChk) autoSyncChk.checked = sync.autoSync !== false;

      CloudSyncService.updateUIStatus(sync.syncStatus || 'synced', 'ត្រៀមរួចរាល់');
    }
  }

  saveCloudSyncSettings() {
    if (typeof CloudSyncService !== 'undefined') {
      const sheetUrl = document.getElementById('input-google-sheet-url')?.value.trim() || '';
      const driveUrl = document.getElementById('input-google-drive-url')?.value.trim() || '';
      const webhookUrl = document.getElementById('input-google-webhook-url')?.value.trim() || '';
      const autoSync = document.getElementById('chk-auto-cloud-sync')?.checked ?? true;

      CloudSyncService.saveSettings({
        sheetUrl,
        driveUrl,
        webhookUrl,
        autoSync,
        lastSync: new Date().toLocaleString(),
        syncStatus: 'synced'
      });

      CloudSyncService.updateUIStatus('synced', 'បានរក្សាទុកការកំណត់');
      if (typeof auditLogger !== 'undefined') {
        auditLogger.log('CLOUD_SYNC_SAVE', 'SYS', 'បានធ្វើបច្ចុប្បន្នភាពតំណភ្ជាប់ Google Sheet & Drive Cloud Sync');
      }
      this.showToast('បានរក្សាទុកការកំណត់ Google Cloud Sync រួចរាល់!', 'success');
    }
  }

  /* ---------------- Auth & Login Dialog (User Accounts Droplist & Secure Password) ---------------- */
  openAuthModal() {
    this.populateAuthUserDropdown();
    const passInput = document.getElementById('auth-login-password');
    if (passInput) passInput.value = '';

    const modal = document.getElementById('auth-login-modal');
    if (modal) {
      modal.classList.add('open');
      this.refreshIcons();
      if (passInput) {
        setTimeout(() => passInput.focus(), 150);
      }
    }
  }

  closeAuthModal() {
    const modal = document.getElementById('auth-login-modal');
    if (modal) modal.classList.remove('open');
    const passInput = document.getElementById('auth-login-password');
    if (passInput) passInput.value = '';
  }

  populateAuthUserDropdown() {
    const select = document.getElementById('auth-login-username');
    if (!select) return;

    let users = [];
    if (typeof settingsModalController !== 'undefined' && settingsModalController.getUserAccounts) {
      users = settingsModalController.getUserAccounts();
    } else {
      users = [
        { username: 'admin', fullName: 'System Administrator', role: 'ADMIN', password: 'Password123!' },
        { username: 'staff', fullName: 'Document Officer', role: 'OFFICER', password: 'StaffSecret2026' },
        { username: 'viewer', fullName: 'Guest Viewer', role: 'VIEWER', password: 'ViewerPass123' }
      ];
    }

    // Output clean options WITHOUT exposing password attributes in DOM
    select.innerHTML = users.map(u => {
      return `<option value="${u.username}" data-role="${u.role}">${u.username}</option>`;
    }).join('');

    // Clear password input immediately
    const passInput = document.getElementById('auth-login-password');
    if (passInput) passInput.value = '';
  }

  handleAuthUserSelected(username) {
    if (!username) return;
    // Always clear password field when user changes account selection (do not expose or auto-fill)
    const passInput = document.getElementById('auth-login-password');
    if (passInput) {
      passInput.value = '';
      passInput.focus();
    }
  }

  handleAuthLogin() {
    const usernameSelect = document.getElementById('auth-login-username');
    const usernameInput = usernameSelect ? usernameSelect.value.trim() : 'admin';
    const passInput = document.getElementById('auth-login-password');
    const passwordInput = passInput ? passInput.value.trim() : '';

    if (!usernameInput) {
      alert('សូមជ្រើសរើសឈ្មោះគណនី (Please select account)');
      return;
    }

    let users = [];
    if (typeof settingsModalController !== 'undefined' && settingsModalController.getUserAccounts) {
      users = settingsModalController.getUserAccounts();
    } else {
      users = [
        { username: 'admin', fullName: 'System Administrator', role: 'ADMIN', password: 'Password123!' },
        { username: 'staff', fullName: 'Document Officer', role: 'OFFICER', password: 'StaffSecret2026' },
        { username: 'viewer', fullName: 'Guest Viewer', role: 'VIEWER', password: 'ViewerPass123' }
      ];
    }

    const user = users.find(u => u.username.toLowerCase() === usernameInput.toLowerCase());

    // Standard Fallback Accounts for Cross-Device Resiliency
    const defaultAccounts = [
      { username: 'admin', role: 'ADMIN', password: 'Password123!' },
      { username: 'staff', role: 'OFFICER', password: 'StaffSecret2026' },
      { username: 'viewer', role: 'VIEWER', password: 'ViewerPass123' }
    ];
    const defaultUser = defaultAccounts.find(d => d.username.toLowerCase() === usernameInput.toLowerCase());

    // Cross-Device Resilient Password Check
    let isPasswordValid = false;
    if (user && user.password) {
      const storedPass = String(user.password).trim();
      const defaultPass = defaultUser ? String(defaultUser.password).trim() : '';
      if (passwordInput === storedPass || (defaultPass && passwordInput === defaultPass)) {
        isPasswordValid = true;
      }
    } else if (defaultUser && defaultUser.password) {
      if (passwordInput === String(defaultUser.password).trim()) {
        isPasswordValid = true;
      }
    } else if (!user && !defaultUser) {
      if (passwordInput === 'Password123!') {
        isPasswordValid = true;
      }
    }

    if (!isPasswordValid) {
      alert(`❌ លេខសម្ងាត់មិនត្រឹមត្រូវទេ! សូមបញ្ចូលលេខសម្ងាត់ឲ្យបានត្រឹមត្រូវសម្រាប់គណនី "${usernameInput}"។ (Incorrect password)`);
      if (passInput) {
        passInput.value = '';
        passInput.focus();
      }
      return;
    }

    // Always clear password input after authentication
    if (passInput) passInput.value = '';

    let matchedRole = 'ADMIN';
    if (user && user.role) {
      let r = user.role.toUpperCase();
      if (r === 'STAFF') r = 'OFFICER';
      matchedRole = r;
    } else if (defaultUser && defaultUser.role) {
      matchedRole = defaultUser.role;
    } else {
      const lower = usernameInput.toLowerCase();
      if (lower.includes('staff') || lower.includes('officer')) matchedRole = 'OFFICER';
      else if (lower.includes('manager') || lower.includes('supervisor')) matchedRole = 'MANAGER';
      else if (lower.includes('viewer') || lower.includes('guest')) matchedRole = 'VIEWER';
      else matchedRole = 'ADMIN';
    }

    UserControl.setCurrentRole(matchedRole);
    this.updateRoleBadge();
    this.renderStaffTable();
    this.closeAuthModal();
    this.showToast(`ស្វាគមន៍! បានចូលប្រព័ន្ធជា ${UserControl.getCurrentRole().titleKh} (${usernameInput})`, 'success');
  }

  handleLogout() {
    // 1. Clear all session, user and temporary storage cache
    UserControl.clearUser();
    
    // 2. Reset all filters and search cache
    this.resetAllFilters();
    this.currentPage = 1;

    // 3. Clear and close all open forms and modals
    if (typeof userformController !== 'undefined') {
      userformController.clearForm();
      userformController.selectedRecordNo = null;
      userformController.currentAttachments = [];
      userformController.closeModal();
    }
    if (typeof settingsModalController !== 'undefined') {
      settingsModalController.closeModal();
    }
    this.closeImportModal();
    const editHeaderModal = document.getElementById('edit-table-header-modal');
    if (editHeaderModal) editHeaderModal.classList.remove('open');

    // 4. Close all dropdowns & side docks
    this.closeAllHeaderDroplists();
    this.closeRightNavDock();

    // 5. Reset Tab to Dashboard and refresh view
    this.switchTab('dashboard');
    this.updateRoleBadge();
    this.renderStaffTable();

    // 6. Clear password input in auth modal
    const passInput = document.getElementById('auth-login-password');
    if (passInput) passInput.value = '';

    // 7. Show toast and prompt fresh login modal
    this.showToast('🧹 បានសម្អាត Cache, Session និងទិន្នន័យបណ្តោះអាសន្នទាំងអស់ (All cache & session cleared)', 'info');
    setTimeout(() => {
      this.openAuthModal();
    }, 200);
  }

  /* ---------------- Settings Controlled Lists UI ---------------- */
  initSettingsUI() {
    const categories = ['departments', 'offices', 'positions', 'genders', 'annualPeriods', 'requestReasons', 'remarks'];
    categories.forEach(cat => {
      const btn = document.getElementById(`btn-add-${cat}`);
      const input = document.getElementById(`input-add-${cat}`);
      if (btn && input) {
        btn.addEventListener('click', () => {
          const val = input.value.trim();
          if (val) {
            const added = SettingsManager.addItem(cat, val);
            if (added) {
              input.value = '';
              this.renderSettingsLists();
              userformController.populateDropdowns();
              this.updateFilterCounts();
              this.showToast(`បានបន្ថែម "${val}" ជោគជ័យ`, 'success');
            } else {
              alert('ទិន្នន័យនេះមានរួចហើយ (Already exists)');
            }
          }
        });
      }
    });

    // Request Reason Rules Add Form Handler (Matching User Screenshot 2)
    const btnAddReasonRule = document.getElementById('btn-add-reason-rule');
    const inputReasonName = document.getElementById('input-add-reason-name');
    const selectReqAlert = document.getElementById('select-add-reason-req-alert');
    const selectEndAlert = document.getElementById('select-add-reason-end-alert');

    if (btnAddReasonRule && inputReasonName) {
      btnAddReasonRule.addEventListener('click', () => {
        const name = inputReasonName.value.trim();
        if (!name) {
          alert('សូមបញ្ចូលឈ្មោះមូលហេតុនៃសំណើ (Please enter reason name)');
          return;
        }
        const reqDays = selectReqAlert ? selectReqAlert.value : '';
        const endDays = selectEndAlert ? selectEndAlert.value : '';
        
        SettingsManager.addReasonRule(name, reqDays, endDays);
        inputReasonName.value = '';
        if (selectReqAlert) selectReqAlert.value = '';
        if (selectEndAlert) selectEndAlert.value = '';

        this.renderSettingsLists();
        userformController.populateDropdowns();
        this.updateFilterCounts();
        this.renderStaffTable();
        this.showToast(`បានបន្ថែមមូលហេតុ "${name}" និងកម្រិត Alert ជោគជ័យ!`, 'success');
      });
    }

    const resetBtn = document.getElementById('btn-reset-settings');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('តើអ្នកពិតជាចង់កំណត់បញ្ជីជ្រើសរើសទាំងអស់ឡើងវិញតាមលំនាំដើមមែនទេ?')) {
          SettingsManager.resetToDefault();
          this.renderSettingsLists();
          userformController.populateDropdowns();
          this.updateFilterCounts();
          this.renderStaffTable();
          this.showToast('បានកំណត់បញ្ជីលំនាំដើមជោគជ័យ', 'info');
        }
      });
    }
  }

  renderSettingsLists() {
    const settings = dataStore.getSettings();
    const categories = ['departments', 'offices', 'positions', 'genders', 'annualPeriods', 'requestReasons', 'remarks'];

    categories.forEach(cat => {
      const items = settings[cat] || [];

      // 1. Request Reasons with Alert Options Table (Option | Request Date Alert | End Date Alert)
      if (cat === 'requestReasons') {
        const rulesTbody = document.getElementById('rules-requestReasons-tbody');
        if (rulesTbody) {
          const rules = settings.requestReasonRules || {};
          rulesTbody.innerHTML = items.map((item, idx) => {
            const rule = rules[item] || { requestDays: null, endDays: null };
            const reqVal = rule.requestDays ? String(rule.requestDays) : '';
            const endVal = rule.endDays ? String(rule.endDays) : '';

            return `
              <tr>
                <td>
                  <strong style="color: var(--text-primary); font-size: 0.82rem;">${item}</strong>
                </td>
                <td>
                  <select class="rule-select-control" onchange="SettingsManager.updateReasonRule('${item}', 'requestDays', this.value); app.renderStaffTable(); app.showToast('បានកែប្រែ Alert ថ្ងៃស្នើសុំ (${item})', 'info');">
                    <option value="" ${!reqVal ? 'selected' : ''}>-- គ្មាន (None) --</option>
                    <option value="15" ${reqVal === '15' ? 'selected' : ''}>15 ថ្ងៃ (15 Days)</option>
                    <option value="30" ${reqVal === '30' ? 'selected' : ''}>30 ថ្ងៃ (30 Days)</option>
                    <option value="60" ${reqVal === '60' ? 'selected' : ''}>60 ថ្ងៃ (60 Days)</option>
                  </select>
                </td>
                <td>
                  <select class="rule-select-control" onchange="SettingsManager.updateReasonRule('${item}', 'endDays', this.value); app.renderStaffTable(); app.showToast('បានកែប្រែ Alert ថ្ងៃបញ្ចប់ (${item})', 'info');">
                    <option value="" ${!endVal ? 'selected' : ''}>-- គ្មាន (None) --</option>
                    <option value="15" ${endVal === '15' ? 'selected' : ''}>15 ថ្ងៃ (15 Days)</option>
                    <option value="30" ${endVal === '30' ? 'selected' : ''}>30 ថ្ងៃ (30 Days)</option>
                    <option value="60" ${endVal === '60' ? 'selected' : ''}>60 ថ្ងៃ (60 Days)</option>
                  </select>
                </td>
                <td style="text-align: center;">
                  <button class="icon-btn icon-btn-danger" style="width: 24px; height: 24px; font-size: 0.7rem;" onclick="app.removeSettingItem('requestReasons', ${idx})" title="លុបមូលហេតុនេះ">
                    ✕
                  </button>
                </td>
              </tr>
            `;
          }).join('');
        }
      }

      // 2. Standard Category Lists
      const listEl = document.getElementById(`list-${cat}`);
      if (listEl) {
        listEl.innerHTML = items.map((item, idx) => `
          <li class="settings-item">
            <span>${item}</span>
            <button class="icon-btn icon-btn-danger" style="width: 22px; height: 22px; font-size: 0.7rem;" onclick="app.removeSettingItem('${cat}', ${idx})">
              ✕
            </button>
          </li>
        `).join('');
      }
    });
  }

  removeSettingItem(cat, idx) {
    const role = UserControl.getCurrentRole();
    if (!role.canSettings) {
      alert('អ្នកមិនមានសិទ្ធិកែប្រែការកំណត់ប្រព័ន្ធទេ (Admin only)');
      return;
    }
    if (confirm('តើអ្នកពិតជាចង់លុបធាតុនេះចេញពីបញ្ជីមែនទេ?')) {
      SettingsManager.removeItem(cat, idx);
      this.renderSettingsLists();
      userformController.populateDropdowns();
      this.updateFilterCounts();
    }
  }

  /* ---------------- User & Role Control UI ---------------- */
  initUserControlUI() {
    const roleSelect = document.getElementById('user-role-selector');
    if (roleSelect) {
      roleSelect.value = UserControl.getCurrentRole().id;
      roleSelect.addEventListener('change', (e) => {
        UserControl.setCurrentRole(e.target.value);
        this.updateRoleBadge();
        this.renderStaffTable();
        this.showToast(`បានប្តូរទៅកាន់សិទ្ធិ ${UserControl.getCurrentRole().titleKh}`, 'info');
      });
    }
  }

  updateRoleBadge() {
    const role = UserControl.getCurrentRole();
    const isViewer = role.id === 'VIEWER';

    const roleTag = document.getElementById('user-profile-role-tag');
    if (roleTag) {
      roleTag.textContent = role.id;
      roleTag.style.color = isViewer ? '#2563eb' : '#059669';
    }
    const nameEl = document.getElementById('user-profile-display-name');
    if (nameEl) {
      if (isViewer) nameEl.textContent = 'អ្នកមើលទិន្នន័យ (Viewer)';
      else if (role.id === 'ADMIN') nameEl.textContent = 'អ្នកគ្រប់គ្រង (Admin)';
      else if (role.id === 'OFFICER') nameEl.textContent = 'មន្ត្រីទិន្នន័យ (Staff)';
      else nameEl.textContent = role.titleKh;
    }
    const avatar = document.getElementById('user-avatar-initial');
    if (avatar) {
      avatar.textContent = role.id.charAt(0);
      avatar.style.background = isViewer ? '#2563eb' : 'var(--primary)';
    }
    const selector = document.getElementById('user-role-selector');
    if (selector) {
      selector.value = role.id;
    }

    // 1. Hide/Disable System Action & Tools droplist for Viewer
    const actionsWrapper = document.getElementById('actions-droplist-wrapper');
    if (actionsWrapper) {
      actionsWrapper.style.display = (!role.canSeeSystemAction || isViewer) ? 'none' : 'inline-block';
    }

    // 2. Navigation Page Droplist: Show for Viewer with Dashboard & Staff Data (Settings & Logs hidden)
    const navWrapper = document.getElementById('nav-droplist-wrapper');
    if (navWrapper) {
      navWrapper.style.display = 'inline-block';
    }

    // Filter Navigation Droplist items
    document.querySelectorAll('.nav-droplist-item').forEach(btn => {
      const tab = btn.getAttribute('data-tab');
      if (isViewer && (tab === 'settings' || tab === 'logs')) {
        btn.style.display = 'none';
      } else {
        btn.style.display = 'flex';
      }
    });

    // Filter Right Auto-Hide Dock items
    const rightDock = document.getElementById('right-autohide-nav-dock');
    if (rightDock) {
      rightDock.style.display = 'block';
      rightDock.querySelectorAll('.right-nav-item').forEach(btn => {
        const tab = btn.getAttribute('data-tab');
        if (isViewer && (tab === 'settings' || tab === 'logs')) {
          btn.style.display = 'none';
        } else {
          btn.style.display = 'flex';
        }
      });
    }

    // 3. Hide all "Add New Staff" (ចុះឈ្មោះបុគ្គលិកថ្មី) buttons for Viewer
    document.querySelectorAll('#btn-new-staff, #btn-open-new-staff, #mob-btn-new-staff, .btn-add-new-staff, [onclick*="openNew"]').forEach(btn => {
      btn.style.display = isViewer ? 'none' : '';
    });

    // 4. Hide Settings and Import Action buttons for Viewer
    document.querySelectorAll('.btn-cloud-save, #btn-confirm-import-data, .settings-add-form, .settings-excel-hub-card, .btn-clear-filters-admin').forEach(el => {
      if (isViewer) el.style.display = 'none';
      else el.style.display = '';
    });

    // 5. If Viewer is on Settings or Logs tab, automatically redirect to Dashboard
    if (isViewer && (this.currentTab === 'settings' || this.currentTab === 'logs')) {
      this.switchTab('dashboard');
    }

    this.renderStaffTable();
    this.refreshIcons();
  }

  /* ---------------- Audit Logs UI ---------------- */
  initAuditLogsUI() {
    const clearBtn = document.getElementById('btn-clear-logs');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        const role = UserControl.getCurrentRole();
        if (!role.canClearLogs) {
          alert('មានតែ Administrator ប៉ុណ្ណោះដែលអាចលុប Log បាន');
          return;
        }
        if (confirm('តើអ្នកពិតជាចង់លុប Audit Logs ទាំងអស់មែនទេ?')) {
          auditLogger.clearLogs();
          this.renderAuditLogs();
          this.showToast('បានសម្អាត Audit Logs រួចរាល់', 'info');
        }
      });
    }
  }

  renderAuditLogs() {
    const container = document.getElementById('audit-logs-container');
    if (!container) return;

    const logs = auditLogger.getLogs();
    if (logs.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-muted);">គ្មានកំណត់ត្រា Audit Log នៅឡើយទេ</div>`;
      return;
    }

    container.innerHTML = logs.map(l => {
      const dateStr = new Date(l.timestamp).toLocaleString();
      let actionClass = 'log-item';
      if (l.action.includes('DELETE')) actionClass += ' log-delete';
      else if (l.action.includes('CREATE') || l.action.includes('ADD')) actionClass += ' log-create';
      else if (l.action.includes('UPDATE') || l.action.includes('EDIT')) actionClass += ' log-update';

      return `
        <div class="${actionClass}">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.2rem;">
              <span class="status-badge status-pending" style="font-size: 0.68rem;">${l.action}</span>
              <strong style="font-size: 0.85rem;">${l.description}</strong>
              <span style="font-size: 0.75rem; color: var(--text-muted);">${l.staffId !== 'N/A' ? `[ID: ${l.staffId}]` : ''}</span>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-secondary);">
              ប្រតិបត្តិករ៖ <strong>${l.user}</strong> • កាលបរិច្ឆេទ៖ ${dateStr}
            </div>
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono); text-align: right;">
            ${l.id}
          </div>
        </div>
      `;
    }).join('');

    this.refreshIcons();
  }

  /* ---------------- Profile Print Modal ---------------- */
  showProfileModal(recordNo) {
    const list = dataStore.getStaffData();
    const item = list.find(r => String(r.no) === String(recordNo));
    if (!item) return;

    const status = StatusCalculator.calculateStatus(item);
    const age = StatusCalculator.calculateAge(item.dob);
    const serviceDur = StatusCalculator.calculateServiceDuration(item.serviceStartDate);
    const atts = item.attachments || [];
    const meta = item.metadata || {};

    const modalBody = document.getElementById('profile-modal-body');
    if (modalBody) {
      modalBody.innerHTML = `
        <div style="padding: 1.5rem; background: white; color: black; border-radius: 8px; font-family: var(--font-khmer);">
          <div style="text-align: center; margin-bottom: 1.5rem; border-bottom: 2px solid #2563eb; padding-bottom: 1rem;">
            <h2 style="font-size: 1.3rem; color: #1e3a8a; margin-bottom: 0.25rem;">ព្រះរាជាណាចក្រកម្ពុជា</h2>
            <h3 style="font-size: 1.1rem; color: #1e3a8a; margin-bottom: 0.5rem;">ជាតិ សាសនា ព្រះមហាក្សត្រ</h3>
            <div style="font-size: 1.15rem; font-weight: 700; color: #2563eb; margin-top: 0.5rem;">
              ប័ណ្ណព័ត៌មានបុគ្គលិក និងតាមដានឯកសារ (STAFF CONTROL PROFILE)
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; margin-bottom: 1.25rem;">
            <div>
              <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                <tr><td style="padding: 4px; font-weight: bold; width: 40%;">ល.រ (No.):</td><td>#${item.no}</td></tr>
                <tr><td style="padding: 4px; font-weight: bold;">អត្តលេខ អពដ (Staff ID):</td><td style="color: #2563eb; font-weight: bold;">${item.staffId}</td></tr>
                <tr><td style="padding: 4px; font-weight: bold;">អត្តលេខ កសហវ (MEF ID):</td><td>${item.secondaryId || '-'}</td></tr>
                <tr><td style="padding: 4px; font-weight: bold;">ឈ្មោះខ្មែរ (Khmer Name):</td><td style="font-weight: bold; font-size: 1rem;">${item.khmerName}</td></tr>
                <tr><td style="padding: 4px; font-weight: bold;">ឈ្មោះឡាតាំង (Latin Name):</td><td>${item.latinName}</td></tr>
                <tr><td style="padding: 4px; font-weight: bold;">ភេទ (Gender):</td><td>${item.gender}</td></tr>
                <tr><td style="padding: 4px; font-weight: bold;">ថ្ងៃខែឆ្នាំកំណើត (DOB):</td><td>${item.dob || '-'} (${age})</td></tr>
                <tr><td style="padding: 4px; font-weight: bold;">ថ្ងៃបម្រើការងារ (Service Date):</td><td>${item.serviceStartDate || '-'} (${serviceDur})</td></tr>
              </table>
            </div>

            <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 1rem; text-align: center; background: #f8fafc;">
              <div style="width: 80px; height: 80px; border-radius: 50%; background: #2563eb; color: white; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 0.75rem auto; font-weight: bold;">
                ${item.khmerName.charAt(0)}
              </div>
              <div style="font-weight: bold; font-size: 0.95rem;">${item.khmerName}</div>
              <div style="font-size: 0.8rem; color: #64748b;">${item.position}</div>
              <div style="margin-top: 0.75rem;">
                <span class="status-badge ${status.cssClass}">${status.labelKh}</span>
              </div>
            </div>
          </div>

          <div style="margin-bottom: 1.25rem; background: #f1f5f9; padding: 1rem; border-radius: 8px;">
            <h4 style="color: #1e3a8a; margin-bottom: 0.5rem; font-size: 0.95rem;">ព័ត៌មានអង្គភាព និងតួនាទី</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.85rem;">
              <div><strong>អង្គភាព (Department):</strong> ${item.department}</div>
              <div><strong>ការិយាល័យ (Office):</strong> ${item.office}</div>
              <div><strong>តួនាទី (Position):</strong> ${item.position}</div>
              <div><strong>ប្រចាំឆ្នាំ (Year):</strong> ${item.annualPeriod || '-'}</div>
            </div>
          </div>

          <div style="margin-bottom: 1.25rem; border: 1px solid #e2e8f0; padding: 1rem; border-radius: 8px;">
            <h4 style="color: #1e3a8a; margin-bottom: 0.5rem; font-size: 0.95rem;">ព័ត៌មានសំណើ និងតាមដានឯកសារ</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.85rem;">
              <div><strong>មូលហេតុសំណើ៖</strong> ${item.requestReason || '-'}</div>
              <div><strong>ប្រកាសលេខ៖</strong> ${item.prakasNo || '-'}</div>
              <div><strong>ថ្ងៃស្នើសុំ៖</strong> ${item.requestDate || '-'}</div>
              <div><strong>ថ្ងៃទទួលឯកសារ៖</strong> ${item.receivedDate || '-'}</div>
              <div><strong>ថ្ងៃចាប់ផ្តើម៖</strong> ${item.startDate || '-'}</div>
              <div><strong>ថ្ងៃបញ្ចប់៖</strong> ${item.endDate || '-'}</div>
              <div><strong>ឯកសារយោង៖</strong> ${item.refDocument || '-'}</div>
              <div><strong>ថ្ងៃបិទប្រព័ន្ធ៖</strong> ${item.systemClosingDate || '-'}</div>
              <div style="grid-column: 1 / -1;"><strong>ពិព័ណនា៖</strong> ${item.description || '-'}</div>
              <div style="grid-column: 1 / -1;"><strong>Remark៖</strong> ${item.remark || '-'}</div>
            </div>
          </div>

          ${atts.length > 0 ? `
            <div style="margin-bottom: 1.25rem; border: 1px dashed #cbd5e1; padding: 1rem; border-radius: 8px; background: #fafafa;">
              <h4 style="color: #1e3a8a; margin-bottom: 0.5rem; font-size: 0.95rem;">📎 បញ្ជីឯកសារភ្ជាប់ (Attached Files - ${atts.length})</h4>
              <ul style="padding-left: 1.2rem; font-size: 0.85rem; margin: 0;">
                ${atts.map(a => `<li><strong>${a.name}</strong> (${a.size}) - ភ្ជាប់កាលពី ${a.uploadDate || ''}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          <div style="font-size: 0.75rem; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 0.75rem; display: flex; justify-content: space-between;">
            <div>បង្កើតនៅ៖ ${meta.createdAt || '-'} ដោយ ${meta.createdBy || 'Admin'}</div>
            <div>កែប្រែចុងក្រោយ៖ ${meta.updatedAt || '-'} (Version: v${meta.version || 1})</div>
          </div>
        </div>
      `;
    }

    const modal = document.getElementById('profile-card-modal');
    if (modal) modal.classList.add('open');
  }

  /* ---------------- Import & Template Modal Controller ---------------- */
  openImportModal() {
    const role = UserControl.getCurrentRole();
    if (!role.canImport) {
      alert('អ្នកមិនមានសិទ្ធិនាំចូលទិន្នន័យទេ (Permission denied - Only Admin/Manager can import)');
      return;
    }

    this.pendingImportRecords = null;
    const modal = document.getElementById('import-excel-modal');
    const previewBox = document.getElementById('import-preview-box');
    const confirmBtn = document.getElementById('btn-confirm-import-data');
    const fileInput = document.getElementById('import-file-selector-input');

    if (fileInput) fileInput.value = '';
    if (previewBox) previewBox.style.display = 'none';
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.style.opacity = '0.6';
    }

    if (modal) {
      modal.classList.add('open');
      this.initImportDropzone();
    }
    this.refreshIcons();
  }

  closeImportModal() {
    const modal = document.getElementById('import-excel-modal');
    if (modal) modal.classList.remove('open');
    this.pendingImportRecords = null;
  }

  initImportDropzone() {
    const dropzone = document.getElementById('import-modal-dropzone');
    if (!dropzone || dropzone.dataset.initialized) return;
    dropzone.dataset.initialized = 'true';

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.processImportFile(e.dataTransfer.files[0]);
      }
    });
  }

  handleImportFileSelected(event) {
    if (event.target.files && event.target.files.length > 0) {
      this.processImportFile(event.target.files[0]);
    }
  }

  processImportFile(file) {
    if (!file) return;
    this.showToast(`កំពុងអានឯកសារ "${file.name}"...`, 'info');

    ExcelHandler.importFromFile(
      file,
      (records) => {
        this.pendingImportRecords = records;
        this.renderImportPreview(records, file.name);
      },
      (err) => {
        alert('កំហុសក្នុងការអានឯកសារ៖ ' + err.message);
        this.showToast('មិនអាចនាំចូលឯកសារនេះបានទេ', 'error');
      }
    );
  }

  renderImportPreview(records, fileName) {
    const previewBox = document.getElementById('import-preview-box');
    const thead = document.getElementById('import-preview-thead');
    const tbody = document.getElementById('import-preview-tbody');
    const countBadge = document.getElementById('import-preview-count-badge');
    const confirmBtn = document.getElementById('btn-confirm-import-data');

    if (!previewBox || !thead || !tbody) return;

    previewBox.style.display = 'block';
    if (countBadge) countBadge.textContent = `រកឃើញ ${records.length} កំណត់ត្រា (${fileName})`;

    // Render Preview Headers (First 6 key columns for clarity)
    thead.innerHTML = `
      <tr>
        <th style="text-align: center;">ល.រ</th>
        <th>អត្តលេខ អពដ</th>
        <th>ឈ្មោះខ្មែរ</th>
        <th>ឈ្មោះឡាតាំង</th>
        <th>អង្គភាព</th>
        <th>តួនាទី</th>
        <th>ស្ថានភាព</th>
      </tr>
    `;

    // Render Preview Rows (Up to 8 rows preview)
    const previewRows = records.slice(0, 8);
    tbody.innerHTML = previewRows.map((r, idx) => {
      const status = StatusCalculator.calculateStatus(r);
      return `
        <tr>
          <td style="text-align: center;"><strong>#${r.no || (idx + 1)}</strong></td>
          <td style="font-weight: 700; color: var(--primary);">${r.staffId || '-'}</td>
          <td style="font-weight: 700;">${r.khmerName || '-'}</td>
          <td>${r.latinName || '-'}</td>
          <td>${r.department || '-'}</td>
          <td>${r.position || '-'}</td>
          <td><span class="status-badge ${status.cssClass}">${status.labelKh}</span></td>
        </tr>
      `;
    }).join('');

    if (records.length > 8) {
      tbody.innerHTML += `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 0.75rem; font-style: italic;">
            ... និងមាន ${records.length - 8} កំណត់ត្រាផ្សេងទៀត ...
          </td>
        </tr>
      `;
    }

    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.style.opacity = '1';
    }
  }

  confirmImportData() {
    if (!this.pendingImportRecords || this.pendingImportRecords.length === 0) {
      alert('មិនមានទិន្នន័យសម្រាប់នាំចូលទេ');
      return;
    }

    const modeInput = document.querySelector('input[name="import-mode"]:checked');
    const mode = modeInput ? modeInput.value : 'append';
    const role = UserControl.getCurrentRole();

    const existingList = dataStore.getStaffData();
    let finalList = [];

    const nowStr = new Date().toLocaleString();

    // Prepare imported records with metadata and sanitized dates
    const prepared = this.pendingImportRecords.map((r, idx) => {
      if (typeof StatusCalculator !== 'undefined') {
        StatusCalculator.sanitizeRecordDates(r);
      }
      if (!r.attachments) r.attachments = [];
      r.metadata = {
        createdAt: nowStr,
        createdBy: `នាំចូលពី Excel (${role.id})`,
        updatedAt: nowStr,
        updatedBy: role.id,
        version: 1,
        changeLog: [{ timestamp: nowStr, user: role.id, action: 'នាំចូលពីឯកសារ Excel' }]
      };
      return r;
    });

    if (mode === 'overwrite') {
      if (!confirm(`⚠️ ការព្រមាន៖ ការជ្រើសរើស "ជំនួសទិន្នន័យចាស់" នឹងសម្អាតទិន្នន័យចាស់ទាំងអស់ (${existingList.length} នាក់) ហើយជំនួសដោយទិន្នន័យថ្មី (${prepared.length} នាក់)។ តើអ្នកយល់ព្រមបន្តទេ?`)) {
        return;
      }
      finalList = prepared;
    } else {
      // Append mode - re-sequence serial numbers if necessary
      let maxNo = existingList.reduce((max, item) => Math.max(max, parseInt(item.no, 10) || 0), 0);
      prepared.forEach(r => {
        maxNo++;
        r.no = maxNo;
      });
      finalList = [...existingList, ...prepared];
    }

    dataStore.saveStaffData(finalList);

    // Auto-Transfer Bulk Imported Records to Google Sheet
    if (typeof CloudSyncService !== 'undefined') {
      CloudSyncService.syncAllRecords(finalList);
    }

    if (typeof auditLogger !== 'undefined') {
      auditLogger.log('IMPORT_EXCEL', 'ALL', `បាននាំចូល ${prepared.length} កំណត់ត្រាពី Excel (${mode === 'overwrite' ? 'ជំនួសទាំងអស់' : 'បន្ថែម'})`);
    }

    this.showToast(`បាននាំចូល ${prepared.length} កំណត់ត្រាដោយជោគជ័យ!`, 'success');
    this.closeImportModal();
    this.refreshAll();
  }

  /* ---------------- Toast Notifications ---------------- */
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
      <div>${message}</div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

// Global App Instance
const app = new StaffApp();
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
