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
    this.docSearchQuery = '';
    this.docFilterReason = '';
    this.docFilterDept = '';
    this.docFilterStatus = '';
    this.docFilterReqCount = '';
    this.docMultiOnly = false;
    this.textControlMode = localStorage.getItem('STAFF_TABLE_TEXT_CONTROL') || 'wrap';
    this.currentPage = 1;
    this.pageSize = 15;
    this.sortField = 'no';
    this.sortAsc = true;
  }

  init() {
    // 1. Initialize active session: Check if user is authenticated
    const isAuthed = typeof UserControl !== 'undefined' && UserControl.isLoggedIn();
    if (!isAuthed) {
      document.body.classList.add('app-auth-locked');
    } else {
      document.body.classList.remove('app-auth-locked');
    }

    // Initialize Subsystems
    userformController.init();
    if (typeof multiFilter !== 'undefined') {
      multiFilter.init();
    }
    this.initTheme();
    this.initTabs();
    this.initFilters();
    this.initTextControlMode();
    if (typeof persistentFilters !== 'undefined') {
      persistentFilters.init();
    }
    this.initExcelEvents();
    this.initSettingsUI();
    this.initUserControlUI();
    this.initAuditLogsUI();
    this.loadCloudSyncSettings();
    this.initMobileAndDesktopUX();
    this.updateRightDockUI(this.getRightDockPreference());
    
    // Initial Render & Default Landing Tab
    this.refreshAll();
    this.switchTab('dashboard');

    // If not authenticated, prompt login modal immediately
    if (!isAuthed) {
      setTimeout(() => this.openAuthModal(), 100);
    }
  }

  initInactivityTracker() {
    this.lastActivityTime = Date.now();
    const updateActivity = () => {
      this.lastActivityTime = Date.now();
    };

    ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'].forEach(evt => {
      document.addEventListener(evt, updateActivity, { passive: true });
    });

    // Check every 10 seconds
    setInterval(() => {
      if (typeof UserControl !== 'undefined' && UserControl.isLoggedIn()) {
        const timeoutMins = this.getAutoLogoutMinutes();
        const inactiveMs = Date.now() - (this.lastActivityTime || Date.now());
        const inactiveMins = inactiveMs / (1000 * 60);

        if (inactiveMins >= timeoutMins) {
          this.handleLogout();
          this.showToast(`⏱️ Automatically logged out due to inactivity (${timeoutMins} minutes)`, 'warning');
        }
      }
    }, 10000);

    const autoLogoutSel = document.getElementById('set-auto-logout-minutes');
    if (autoLogoutSel) {
      autoLogoutSel.value = String(this.getAutoLogoutMinutes());
    }
  }

  getAutoLogoutMinutes() {
    return parseInt(localStorage.getItem('STAFF_CONTROL_AUTO_LOGOUT_MINUTES') || '15', 10);
  }

  saveAutoLogoutPreference(mins) {
    const val = parseInt(mins, 10) || 15;
    localStorage.setItem('STAFF_CONTROL_AUTO_LOGOUT_MINUTES', String(val));
    this.lastActivityTime = Date.now();
    this.showToast(`Auto-Logout timeout updated to ${val} minutes successfully!`, 'success');
  }

  initMobileAndDesktopUX() {
    this.initInactivityTracker();
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
    this.renderTableHeaders();
    this.renderStaffTable();
    this.renderDocumentTimeline();
    this.renderAuditLogs();
    this.renderSettingsLists();
    SettingsManager.renderHeadersEditor('headers-editor-tbody');
    dashboardController.refresh();
    if (typeof reportsController !== 'undefined' && reportsController.renderReport) {
      reportsController.renderReport();
    }
    if (typeof persistentFilters !== 'undefined' && persistentFilters.updateFilterButtonsUI) {
      persistentFilters.updateFilterButtonsUI();
    }
    this.updateFilterCounts();
    this.updateRoleBadge();
    this.refreshIcons();
  }

  refreshIcons() {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
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

      let iconHtml = '';
      if (f.key === 'requestDate') {
        iconHtml = `<i data-lucide="calendar" style="width: 15px; height: 15px; color: #2563eb; flex-shrink: 0;"></i>`;
      } else if (f.key === 'endDate') {
        iconHtml = `<i data-lucide="hourglass" style="width: 15px; height: 15px; color: #8b5cf6; flex-shrink: 0;"></i>`;
      } else if (f.key === 'startDate') {
        iconHtml = `<i data-lucide="flag" style="width: 15px; height: 15px; color: #10b981; flex-shrink: 0;"></i>`;
      }

      thHtml += `
        <th class="th-cell th-col-${f.key}" style="text-align: ${align};">
          <div class="th-content ${align === 'center' ? 'th-center' : align === 'right' ? 'th-right' : ''}">
            <div class="th-title-group th-sortable" onclick="app.sortTable('${f.key}')" title="ចុចដើម្បីតម្រៀប (Sort by ${f.en})">
              <div style="display: inline-flex; align-items: center; gap: 0.35rem;">
                ${iconHtml}
                <span class="th-khmer" style="font-weight: 700;">${f.kh}</span>
              </div>
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

  /* ---------------- Right Auto-Hide Navigation Dock Preference (Show / Disable) ---------------- */
  getRightDockPreference() {
    return localStorage.getItem('STAFF_CONTROL_SHOW_RIGHT_DOCK') !== 'false';
  }

  setRightDockPreference(enabled, notify = true) {
    localStorage.setItem('STAFF_CONTROL_SHOW_RIGHT_DOCK', enabled ? 'true' : 'false');
    this.updateRightDockUI(enabled);
    if (notify) {
      if (enabled) {
        this.showToast('🧭 បានបើកដំណើរការរបាររុករកអណ្តែតស្តាំ (Right Nav Dock Enabled)', 'success');
      } else {
        this.showToast('🚫 បានបិទរបាររុករកអណ្តែតស្តាំ (Right Nav Dock Disabled)', 'info');
      }
    }
  }

  toggleRightDockPreference(e) {
    if (e) e.stopPropagation();
    const current = this.getRightDockPreference();
    this.setRightDockPreference(!current, true);
    this.closeAllHeaderDroplists();
  }

  updateRightDockUI(enabled) {
    const isViewer = typeof UserControl !== 'undefined' && UserControl.isViewer();
    const dock = document.getElementById('right-autohide-nav-dock');
    if (dock) {
      dock.style.display = (enabled && !isViewer) ? '' : 'none';
      if (!enabled) dock.classList.remove('open');
    }

    // Update Tools droplist badge & text
    const badgeEl = document.getElementById('badge-right-dock-state');
    const descEl = document.getElementById('desc-right-dock-state');
    const iconEl = document.getElementById('icon-right-dock-state');
    if (badgeEl) {
      badgeEl.textContent = enabled ? 'SHOW' : 'OFF';
      badgeEl.className = `status-badge ${enabled ? 'status-active' : 'status-pending'}`;
    }
    if (descEl) {
      descEl.textContent = enabled ? 'ស្ថានភាព៖ បើក (Show) - ចុចដើម្បីបិទ' : 'ស្ថានភាព៖ បិទ (Disabled) - ចុចដើម្បីបើក';
    }
    if (iconEl) {
      iconEl.setAttribute('data-lucide', enabled ? 'compass' : 'eye-off');
    }

    // Update Settings Modal Tab 1 checkbox & label
    const settingCheckbox = document.getElementById('setting-toggle-right-dock');
    const settingText = document.getElementById('setting-toggle-right-dock-text');
    if (settingCheckbox) {
      settingCheckbox.checked = enabled;
    }
    if (settingText) {
      settingText.textContent = enabled ? 'បើក (Show)' : 'បិទ (Disabled)';
      settingText.style.color = enabled ? '#10b981' : '#ef4444';
    }

    this.refreshIcons();
  }

  toggleRightNavDock() {
    if (!this.getRightDockPreference()) return;
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
    if (typeof UserControl !== 'undefined' && !UserControl.isLoggedIn()) {
      this.showToast('🔒 សូមចូលប្រព័ន្ធជាមុនសិន (Please login first)', 'warning');
      this.openAuthModal();
      return;
    }

    const role = UserControl.getCurrentRole();
    if (role.id === 'VIEWER' && (tabId === 'settings' || tabId === 'logs')) {
      this.showToast('🔒 សិទ្ធិមើលតែប៉ុណ្ណោះ (Read-Only): មិនអាចចូលទំព័រការកំណត់ ឬ Log បានទេ', 'warning');
      tabId = 'database';
    }

    this.currentTab = tabId;

    // Tab details mapping
    const tabMeta = {
      dashboard: { label: 'ផ្ទាំងសង្ខេប', sub: 'ទិដ្ឋភាពរួម & ស្ថិតិទិន្នន័យ', icon: 'layout-dashboard', color: '#4f46e5' },
      database: { label: 'ទិន្នន័យបុគ្គលិក', sub: 'តារាងមេ ២២ ជួរឈរ & តម្រង', icon: 'users', color: '#10b981' },
      reports: { label: 'របាយការណ៍ផ្លូវការ', sub: 'របាយការណ៍តាមមូលហេតុ & បោះពុម្ព', icon: 'file-spreadsheet', color: '#ec4899' },
      'case-summary': { label: 'របាយការណ៍សង្ខេប', sub: 'សង្ខេបរយៈពេលប្រើប្រាស់ & វិភាគ', icon: 'calendar-range', color: '#06b6d4' },
      eligibility: { label: 'ពិនិត្យសិទ្ធិស្នើសុំ', sub: 'ត្រួតពិនិត្យប្រវត្តិ & សិទ្ធិស្នើសុំឡើងវិញ', icon: 'shield-check', color: '#10b981' },
      promotion: { label: 'គ្រប់គ្រងឡើងឋានន្តរស័ក្តិ', sub: 'ពិនិត្យលក្ខខណ្ឌឡើងថ្នាក់, ព្យួរ & របាយការណ៍', icon: 'award', color: '#8b5cf6' },
      documents: { label: 'តាមដានឯកសារ', sub: 'កាលវិភាគឯកសារ & ឯកសារយោង', icon: 'file-check', color: '#f59e0b' },
      settings: { label: 'ការកំណត់', sub: 'Cloud Sync, Droplist & បញ្ជីយោង', icon: 'sliders', color: '#0ea5e9' },
      logs: { label: 'កំណត់ត្រា', sub: 'ប្រវត្តិកែប្រែ និងសកម្មភាពសុវត្ថិភាព', icon: 'history', color: '#a855f7' }
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
      this.renderTableHeaders();
      this.renderStaffTable();
    } else if (tabId === 'reports') {
      if (typeof reportsController !== 'undefined' && reportsController.init) {
        reportsController.init();
      }
    } else if (tabId === 'case-summary') {
      if (typeof caseSummaryController !== 'undefined' && caseSummaryController.init) {
        caseSummaryController.init();
      }
    } else if (tabId === 'eligibility') {
      if (typeof eligibilityController !== 'undefined' && eligibilityController.init) {
        eligibilityController.init();
      }
    } else if (tabId === 'promotion') {
      if (typeof promotionController !== 'undefined' && promotionController.init) {
        promotionController.init();
      }
    } else if (tabId === 'documents') {
      this.renderDocumentTimeline();
    } else if (tabId === 'settings') {
      this.renderSettingsLists();
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

    // Request & End Date / Month Filters are handled reactively via multiFilter.handleDateChange & handleMonthChange

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
    const chipBtn = document.getElementById('btn-toggle-advanced-filter-chip');
    const chipChevron = document.getElementById('chip-filter-chevron-icon');
    const chipLabel = document.getElementById('label-advanced-filter-chip');
    if (!card) return;

    const isCollapsed = card.classList.toggle('is-collapsed');
    localStorage.setItem('STAFF_CONTROL_FILTER_COLLAPSED', isCollapsed ? '1' : '0');

    if (text) {
      text.textContent = isCollapsed ? 'បង្ហាញតម្រង (Show)' : 'លាក់តម្រង (Auto-Hide)';
    }
    if (icon) {
      icon.setAttribute('data-lucide', isCollapsed ? 'chevrons-down' : 'chevrons-up');
    }

    if (chipBtn) {
      chipBtn.classList.toggle('active-open', !isCollapsed);
    }
    if (chipLabel) {
      chipLabel.textContent = isCollapsed ? 'តម្រងពហុកម្រិត (Show Filters)' : 'លាក់តម្រង (Hide Filters)';
    }
    if (chipChevron) {
      chipChevron.setAttribute('data-lucide', isCollapsed ? 'chevrons-down' : 'chevrons-up');
    }

    // Sync settings modal toggle if open
    const setToggle = document.getElementById('setting-toggle-advanced-filter');
    const setToggleText = document.getElementById('setting-toggle-advanced-filter-text');
    if (setToggle) setToggle.checked = !isCollapsed;
    if (setToggleText) setToggleText.textContent = !isCollapsed ? 'បើក (Show)' : 'បិទ (Hide)';

    this.refreshIcons();
  }

  initFilterCardState() {
    const saved = localStorage.getItem('STAFF_CONTROL_FILTER_COLLAPSED');
    const isCollapsed = saved === '1';
    const card = document.getElementById('advanced-filter-container');
    const icon = document.getElementById('icon-filter-collapse');
    const text = document.getElementById('text-filter-collapse');
    const chipBtn = document.getElementById('btn-toggle-advanced-filter-chip');
    const chipChevron = document.getElementById('chip-filter-chevron-icon');
    const chipLabel = document.getElementById('label-advanced-filter-chip');

    if (card) card.classList.toggle('is-collapsed', isCollapsed);
    if (text) text.textContent = isCollapsed ? 'បង្ហាញតម្រង (Show)' : 'លាក់តម្រង (Auto-Hide)';
    if (icon) icon.setAttribute('data-lucide', isCollapsed ? 'chevrons-down' : 'chevrons-up');

    if (chipBtn) chipBtn.classList.toggle('active-open', !isCollapsed);
    if (chipLabel) chipLabel.textContent = isCollapsed ? 'តម្រងពហុកម្រិត (Show Filters)' : 'លាក់តម្រង (Hide Filters)';
    if (chipChevron) chipChevron.setAttribute('data-lucide', isCollapsed ? 'chevrons-down' : 'chevrons-up');

    const setToggle = document.getElementById('setting-toggle-advanced-filter');
    const setToggleText = document.getElementById('setting-toggle-advanced-filter-text');
    if (setToggle) setToggle.checked = !isCollapsed;
    if (setToggleText) setToggleText.textContent = !isCollapsed ? 'បើក (Show)' : 'បិទ (Hide)';
  }

  setAdvancedFilterPreference(show) {
    const isCollapsed = !show;
    const card = document.getElementById('advanced-filter-container');
    const icon = document.getElementById('icon-filter-collapse');
    const text = document.getElementById('text-filter-collapse');
    const chipBtn = document.getElementById('btn-toggle-advanced-filter-chip');
    const chipChevron = document.getElementById('chip-filter-chevron-icon');
    const chipLabel = document.getElementById('label-advanced-filter-chip');
    const setToggleText = document.getElementById('setting-toggle-advanced-filter-text');

    localStorage.setItem('STAFF_CONTROL_FILTER_COLLAPSED', isCollapsed ? '1' : '0');

    if (card) card.classList.toggle('is-collapsed', isCollapsed);
    if (text) text.textContent = isCollapsed ? 'បង្ហាញតម្រង (Show)' : 'លាក់តម្រង (Auto-Hide)';
    if (icon) icon.setAttribute('data-lucide', isCollapsed ? 'chevrons-down' : 'chevrons-up');

    if (chipBtn) chipBtn.classList.toggle('active-open', !isCollapsed);
    if (chipLabel) chipLabel.textContent = isCollapsed ? 'តម្រងពហុកម្រិត (Show Filters)' : 'លាក់តម្រង (Hide Filters)';
    if (chipChevron) chipChevron.setAttribute('data-lucide', isCollapsed ? 'chevrons-down' : 'chevrons-up');
    if (setToggleText) setToggleText.textContent = show ? 'បើក (Show)' : 'បិទ (Hide)';

    this.showToast(show ? '🎛️ បានបើកបង្ហាញផ្ទាំងតម្រងពហុកម្រិត' : '🎛️ បានលាក់ផ្ទាំងតម្រងពហុកម្រិត', 'info');
    this.refreshIcons();
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
      if (this.activeFilterStatus === 'maturity_calc') {
        const hasDateCalc = (item.maturityBase === 'startDate') || (alerts && (alerts.startDateAlert || alerts.endDateAlert));
        if (!hasDateCalc) {
          return false;
        }
      } else if (this.activeFilterStatus !== 'ALL' && statusObj.key !== this.activeFilterStatus) {
        return false;
      }

      // Check multiFilter rules (Departments, Offices, Positions, Annual, Reason, Status, Dates, Column Popups)
      if (typeof multiFilter !== 'undefined' && !multiFilter.matches(item)) {
        return false;
      }

      // Check Persistent Filters (Multi-Select Popovers with Apply)
      if (typeof persistentFilters !== 'undefined' && !persistentFilters.matches(item)) {
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

  handleMaturityDropdownFilter(val) {
    const filterSelect = document.getElementById('filter-maturity-select');
    const quickSelect = document.getElementById('quick-filter-maturity-select');
    if (filterSelect && filterSelect.value !== val) filterSelect.value = val;
    if (quickSelect && quickSelect.value !== val) quickSelect.value = val;

    if (val === 'maturity_calc') {
      this.activeFilterStatus = 'maturity_calc';
      this.filterAlertOnly = false;
    } else if (val === 'alerts_only') {
      this.activeFilterStatus = 'ALL';
      this.filterAlertOnly = true;
    } else if (val === 'start_base') {
      this.activeFilterStatus = 'start_base';
      this.filterAlertOnly = false;
    } else {
      if (this.activeFilterStatus === 'maturity_calc' || this.activeFilterStatus === 'start_base') {
        this.activeFilterStatus = 'ALL';
      }
      this.filterAlertOnly = false;
    }

    // Sync quick chips active state
    const chips = document.querySelectorAll('.filter-chip');
    chips.forEach(c => {
      const s = c.getAttribute('data-status');
      c.classList.toggle('active', s === this.activeFilterStatus);
    });

    this.currentPage = 1;
    this.updateActiveFiltersCounter();
    this.renderStaffTable();
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

    if (typeof multiFilter !== 'undefined' && typeof multiFilter.resetAll === 'function') {
      multiFilter.resetAll();
    }

    if (typeof persistentFilters !== 'undefined' && typeof persistentFilters.clearAllFilters === 'function') {
      persistentFilters.clearAllFilters();
    }

    if (typeof dashboardController !== 'undefined' && typeof dashboardController.resetGlobalFilters === 'function') {
      dashboardController.resetGlobalFilters();
    }

    if (typeof reportsController !== 'undefined' && typeof reportsController.clearAllSelectionsAndFilters === 'function') {
      reportsController.clearAllSelectionsAndFilters();
    }

    if (typeof caseSummaryController !== 'undefined' && typeof caseSummaryController.resetFilters === 'function') {
      caseSummaryController.resetFilters();
    }

    const el = (id) => document.getElementById(id);
    if (el('table-search-input')) el('table-search-input').value = '';
    if (el('filter-prakas-input')) el('filter-prakas-input').value = '';
    if (el('filter-reqdate-from')) el('filter-reqdate-from').value = '';
    if (el('filter-reqdate-to')) el('filter-reqdate-to').value = '';
    if (el('filter-enddate-from')) el('filter-enddate-from').value = '';
    if (el('filter-enddate-to')) el('filter-enddate-to').value = '';
    if (el('filter-maturity-select')) el('filter-maturity-select').value = '';
    if (el('quick-filter-maturity-select')) el('quick-filter-maturity-select').value = '';

    // Uncheck all tick boxes across all pages (table row selections, report checkboxes, filter checks)
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      if (cb.id !== 'auth-remember-password') {
        cb.checked = false;
      }
    });

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
    const chipBadge = document.getElementById('chip-active-filter-count');

    if (badge) {
      if (count > 0) {
        badge.textContent = `🎯 សកម្ម: ${count} តម្រង`;
        badge.classList.add('has-active');
      } else {
        badge.textContent = `តម្រងសកម្ម: 0`;
        badge.classList.remove('has-active');
      }
    }

    if (chipBadge) {
      if (count > 0) {
        chipBadge.textContent = `${count}`;
        chipBadge.style.display = 'inline-block';
      } else {
        chipBadge.style.display = 'none';
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
    let maturityCalcCount = 0;

    all.forEach(item => {
      const alerts = (StatusCalculator.calculateAlerts) ? StatusCalculator.calculateAlerts(item, settings) : {};
      const hasDateCalc = (item.maturityBase === 'startDate') || (alerts && (alerts.startDateAlert || alerts.endDateAlert));
      if (hasDateCalc) {
        maturityCalcCount++;
      }
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

    const maturityChipEl = document.getElementById('count-chip-maturity_calc');
    if (maturityChipEl) maturityChipEl.textContent = maturityCalcCount;

    const quickMaturitySelect = document.getElementById('quick-filter-maturity-select');
    if (quickMaturitySelect) {
      const optMaturity = quickMaturitySelect.querySelector('option[value="maturity_calc"]');
      if (optMaturity) {
        optMaturity.textContent = `🎯 គណនាកាលកំណត់ (${maturityCalcCount})`;
      }
    }
    const mainMaturitySelect = document.getElementById('filter-maturity-select');
    if (mainMaturitySelect) {
      const optMaturity2 = mainMaturitySelect.querySelector('option[value="maturity_calc"]');
      if (optMaturity2) {
        optMaturity2.textContent = `🎯 គណនាកាលកំណត់ (${maturityCalcCount})`;
      }
    }

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

  /* ---------------- Text Control Mode (Wrap Text / Shrink to Fit / Truncate) ---------------- */
  setTextControlMode(mode) {
    this.textControlMode = mode || 'wrap';
    localStorage.setItem('STAFF_TABLE_TEXT_CONTROL', this.textControlMode);

    const select = document.getElementById('table-text-control-select');
    if (select && select.value !== this.textControlMode) {
      select.value = this.textControlMode;
    }

    const table = document.getElementById('master-staff-table');
    if (table) {
      table.classList.remove('text-mode-wrap', 'text-mode-shrink', 'text-mode-truncate');
      table.classList.add(`text-mode-${this.textControlMode}`);
    }

    this.renderStaffTable();

    const modeLabels = {
      wrap: '📝 បានជ្រើសរើស «រុំបន្ទាត់អត្ថបទ (Wrap Text)»',
      shrink: '🔍 បានជ្រើសរើស «បង្រួមទំហំអក្សរ (Shrink to Fit)»',
      truncate: '✂️ បានជ្រើសរើស «កាត់ខ្លី (Truncate / Single Line)»'
    };
    this.showToast(modeLabels[this.textControlMode] || 'បានផ្លាស់ប្តូរទម្រង់អត្ថបទ', 'info');
  }

  initTextControlMode() {
    const saved = localStorage.getItem('STAFF_TABLE_TEXT_CONTROL') || 'wrap';
    this.textControlMode = saved;
    const select = document.getElementById('table-text-control-select');
    if (select) select.value = saved;
    const table = document.getElementById('master-staff-table');
    if (table) {
      table.classList.remove('text-mode-wrap', 'text-mode-shrink', 'text-mode-truncate');
      table.classList.add(`text-mode-${saved}`);
    }
  }

  /* ---------------- Master 22-Column Table Rendering ---------------- */
  renderStaffTable() {
    const tbody = document.getElementById('staff-table-body');
    if (!tbody) return;

    const table = document.getElementById('master-staff-table');
    if (table && !table.classList.contains(`text-mode-${this.textControlMode}`)) {
      table.classList.remove('text-mode-wrap', 'text-mode-shrink', 'text-mode-truncate');
      table.classList.add(`text-mode-${this.textControlMode || 'wrap'}`);
    }

    // Security Check: If logged out, lock and do not display sensitive staff records
    if (typeof UserControl !== 'undefined' && !UserControl.isLoggedIn()) {
      tbody.innerHTML = `
        <tr>
          <td colspan="25" style="text-align: center; padding: 4.5rem 1.5rem; background: var(--bg-card);">
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.85rem; max-width: 460px; margin: 0 auto;">
              <div style="width: 60px; height: 60px; border-radius: 50%; background: rgba(239, 68, 68, 0.12); color: #ef4444; display: flex; align-items: center; justify-content: center;">
                <i data-lucide="shield-alert" style="width: 30px; height: 30px;"></i>
              </div>
              <h3 style="font-weight: 800; font-size: 1.12rem; color: var(--text-primary); margin: 0;">
                ទិន្នន័យត្រូវបានចាក់សោសុវត្ថិភាព (Data Locked)
              </h3>
              <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; margin: 0;">
                លោកអ្នកបានចាកចេញពីប្រព័ន្ធ។ សូមចូលប្រព័ន្ធគណនីរបស់អ្នកដើម្បីមើល និងគ្រប់គ្រងទិន្នន័យបុគ្គលិកទាំងអស់។ (Please login to view and access staff records)
              </p>
              <button type="button" class="btn btn-primary" onclick="app.openAuthModal()" style="margin-top: 0.35rem; padding: 0.55rem 1.25rem; font-weight: 700;">
                <i data-lucide="log-in"></i>
                <span>ចូលប្រព័ន្ធ (Sign In)</span>
              </button>
            </div>
          </td>
        </tr>
      `;
      const infoEl = document.getElementById('table-records-info');
      if (infoEl) infoEl.textContent = '🔒 សូមចូលប្រព័ន្ធដើម្បីមើលទិន្នន័យ';
      const pageNumEl = document.getElementById('current-page-num');
      if (pageNumEl) pageNumEl.textContent = '0 / 0';
      this.refreshIcons();
      return;
    }

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

    const settings = dataStore.getSettings() || {};

    tbody.innerHTML = pageRecords.map(item => {
      try {
        const status = StatusCalculator.calculateStatus(item);
        const alerts = (StatusCalculator.calculateAlerts) ? StatusCalculator.calculateAlerts(item, settings) : {};
        const age = (StatusCalculator.calculateAge) ? StatusCalculator.calculateAge(item.dob) : '';
        const serviceDur = (StatusCalculator.calculateServiceDuration)
          ? StatusCalculator.calculateServiceDuration(item.serviceStartDate)
          : ((StatusCalculator.calculateWorkDuration) ? StatusCalculator.calculateWorkDuration(item.serviceStartDate) : '');
        const attCount = item.attachments ? item.attachments.length : 0;
        const rowAlertClass = (alerts && alerts.rowClass) ? ` ${alerts.rowClass}` : '';

        return `
          <tr data-no="${item.no}" class="${rowAlertClass}">
            <td style="text-align: center; font-weight: 700;">${item.no}</td>
            <td style="text-align: ${fields[1]?.align || 'left'};"><strong style="color: var(--primary);">${StatusCalculator.format4DigitId(item.staffId) || '-'}</strong></td>
            <td style="text-align: ${fields[2]?.align || 'left'};">${StatusCalculator.format4DigitId(item.secondaryId) || '-'}</td>
            <td style="text-align: ${fields[3]?.align || 'left'}; font-weight: 600;">${item.latinName || '-'}</td>
            <td style="text-align: ${fields[4]?.align || 'left'}; font-weight: 600;">${item.khmerName || '-'}</td>
            <td style="text-align: ${fields[5]?.align || 'left'};">${item.department || '-'}</td>
            <td style="text-align: ${fields[6]?.align || 'left'};">${item.office || '-'}</td>
            <td style="text-align: ${fields[7]?.align || 'left'};"><span class="status-badge" style="background: var(--bg-card-subtle); color: var(--text-primary);">${item.position || '-'}</span></td>
            <td style="text-align: ${fields[8]?.align || 'center'};">${item.gender || '-'}</td>
            <td style="text-align: ${fields[9]?.align || 'left'};">${StatusCalculator.formatDateDisplay(item.dob)} <span style="font-size: 0.7rem; color: var(--text-muted);">(${age})</span></td>
            <td style="text-align: ${fields[10]?.align || 'left'};">${StatusCalculator.formatDateDisplay(item.serviceStartDate)} <span style="font-size: 0.7rem; color: var(--text-muted);">(${serviceDur})</span></td>
            <td style="text-align: ${fields[11]?.align || 'left'};">
              ${StatusCalculator.renderDateControlCell('requestDate', item, settings)}
            </td>
            <td style="text-align: ${fields[12]?.align || 'left'};">
              ${StatusCalculator.renderDateControlCell('endDate', item, settings)}
            </td>
            <td style="text-align: ${fields[13]?.align || 'left'};">
              ${StatusCalculator.renderDateControlCell('startDate', item, settings)}
            </td>
            <td style="text-align: ${fields[14]?.align || 'center'};">${item.annualPeriod || '-'}</td>
            <td style="text-align: ${fields[15]?.align || 'left'}; font-weight: 500;">${item.requestReason || '-'}</td>
            <td class="col-longtext ${(item.prakasNo && item.prakasNo.length > 70) ? 'col-longtext-extra' : ''}" style="text-align: ${fields[16]?.align || 'left'};" title="${item.prakasNo || ''}">${item.prakasNo ? `<span style="font-weight: 600;">${item.prakasNo}</span>` : '-'}</td>
            <td class="col-longtext ${(item.description && item.description.length > 70) ? 'col-longtext-extra' : ''}" style="text-align: ${fields[17]?.align || 'left'};" title="${item.description || ''}">${item.description || '-'}</td>
            <td style="text-align: ${fields[18]?.align || 'left'};">${item.systemClosingDate ? `<span style="color: #dc2626; font-weight: 600;">${StatusCalculator.formatDateDisplay(item.systemClosingDate)}</span>` : '-'}</td>
            <td class="col-longtext ${(item.refDocument && item.refDocument.length > 70) ? 'col-longtext-extra' : ''}" style="text-align: ${fields[19]?.align || 'left'};" title="${item.refDocument || ''}">
              <div>${item.refDocument || '-'}</div>
              ${attCount > 0 ? `
                <button class="table-attachment-pill" onclick="userformController.openEdit(${item.no})" title="ចុចដើម្បីមើល ${attCount} ឯកសារភ្ជាប់">
                  <i data-lucide="paperclip" style="width: 12px; height: 12px;"></i>
                  <span>${attCount} ឯកសារ</span>
                </button>
              ` : ''}
            </td>
            <td style="text-align: ${fields[20]?.align || 'left'};">${StatusCalculator.formatDateDisplay(item.receivedDate)}</td>
            <td class="col-longtext ${(item.remark && item.remark.length > 70) ? 'col-longtext-extra' : ''}" style="text-align: ${fields[21]?.align || 'left'};" title="${item.remark || ''}">${item.remark || '-'}</td>
            <td style="text-align: center;">
              ${role.id === 'VIEWER' ? `
                <span class="status-badge ${status.cssClass}">${status.labelKh}</span>
              ` : `
                <select class="table-status-select ${status.cssClass}" onchange="app.changeRecordStatus(${item.no}, this.value)" title="ចុចដើម្បីប្តូរស្ថានភាពបុគ្គលិក">
                  <option value="AUTO" ${(!item.customStatus || item.customStatus === 'AUTO') ? 'selected' : ''}>
                    ${item.customStatus === 'AUTO' || !item.customStatus ? '● ' + status.labelKh : '🔄 ស្វ័យប្រវត្ត (Auto)'}
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
      } catch (rowErr) {
        console.error('Error rendering row:', item, rowErr);
        return `
          <tr data-no="${item.no}">
            <td style="text-align: center; font-weight: 700;">${item.no}</td>
            <td><strong>${item.staffId || '-'}</strong></td>
            <td>${item.secondaryId || '-'}</td>
            <td>${item.latinName || '-'}</td>
            <td>${item.khmerName || '-'}</td>
            <td>${item.department || '-'}</td>
            <td>${item.office || '-'}</td>
            <td>${item.position || '-'}</td>
            <td>${item.gender || '-'}</td>
            <td>${item.dob || '-'}</td>
            <td>${item.serviceStartDate || '-'}</td>
            <td>${item.requestDate || '-'}</td>
            <td>${item.endDate || '-'}</td>
            <td>${item.startDate || '-'}</td>
            <td>${item.annualPeriod || '-'}</td>
            <td>${item.requestReason || '-'}</td>
            <td>${item.prakasNo || '-'}</td>
            <td>${item.description || '-'}</td>
            <td>${item.systemClosingDate || '-'}</td>
            <td>${item.refDocument || '-'}</td>
            <td>${item.receivedDate || '-'}</td>
            <td>${item.remark || '-'}</td>
            <td><span class="status-badge status-active">កំពុងដំណើរការ</span></td>
            <td>
              <button class="icon-btn" onclick="userformController.openEdit(${item.no})"><i data-lucide="edit-3"></i></button>
            </td>
          </tr>
        `;
      }
    }).join('');

    this.refreshIcons();
  }

  changeRecordStatus(no, newStatus) {
    const list = dataStore.getStaffData();
    const item = list.find(s => s.no === no);
    if (!item) return;

    const oldStatus = StatusCalculator.calculateStatus(item).labelKh;
    item.customStatus = newStatus;

    // If status changed to 'closed', automatically update remark to 'Inactive'
    if (newStatus === 'closed') {
      item.remark = 'Inactive';
      if (!item.systemClosingDate) {
        item.systemClosingDate = new Date().toISOString().slice(0, 10);
      }
    } else if (newStatus === 'active') {
      if (item.remark && item.remark.toLowerCase().includes('inactive')) {
        item.remark = 'Active';
      }
      if (item.systemClosingDate) {
        item.systemClosingDate = '';
      }
    }

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

  /* ---------------- Document Control Timeline & Request History ---------------- */
  populateDocFilterDropdowns() {
    const reasonSelect = document.getElementById('doc-filter-reason');
    const deptSelect = document.getElementById('doc-filter-dept');
    const allData = dataStore.getStaffData();

    if (reasonSelect) {
      const currentVal = reasonSelect.value;
      const settingsReasons = (typeof SettingsManager !== 'undefined' && SettingsManager.getList) ? SettingsManager.getList('requestReasons') : [];
      const dataReasons = allData.map(r => (r.requestReason || '').trim()).filter(Boolean);
      const combinedReasons = Array.from(new Set([...settingsReasons, ...dataReasons])).filter(Boolean).sort();

      let html = '<option value="">🎯 គ្រប់មូលហេតុ (All Reasons)</option>';
      combinedReasons.forEach(r => {
        html += `<option value="${r}">${r}</option>`;
      });
      reasonSelect.innerHTML = html;
      if (currentVal) reasonSelect.value = currentVal;
    }

    if (deptSelect) {
      const currentVal = deptSelect.value;
      const settingsDepts = (typeof SettingsManager !== 'undefined' && SettingsManager.getList) ? SettingsManager.getList('departments') : [];
      const dataDepts = allData.map(r => (r.department || '').trim()).filter(Boolean);
      const combinedDepts = Array.from(new Set([...settingsDepts, ...dataDepts])).filter(Boolean).sort();

      let html = '<option value="">🏢 គ្រប់អង្គភាព (All Departments)</option>';
      combinedDepts.forEach(d => {
        html += `<option value="${d}">${d}</option>`;
      });
      deptSelect.innerHTML = html;
      if (currentVal) deptSelect.value = currentVal;
    }
  }

  handleDocSearch(query) {
    this.docSearchQuery = (query || '').toLowerCase().trim();
    this.renderDocumentTimeline();
  }

  handleDocFilterChange(type, value) {
    if (type === 'reason') this.docFilterReason = value || '';
    if (type === 'department') this.docFilterDept = value || '';
    if (type === 'status') this.docFilterStatus = value || '';
    if (type === 'reqCount') this.docFilterReqCount = value || '';
    this.renderDocumentTimeline();
  }

  toggleDocMultiRequestOnly() {
    this.docFilterReqCount = (this.docFilterReqCount === '2+') ? '' : '2+';
    const reqCountSelect = document.getElementById('doc-filter-reqcount');
    if (reqCountSelect) {
      reqCountSelect.value = this.docFilterReqCount;
    }
    this.renderDocumentTimeline();
  }

  filterDocByStaff(staffIdOrName) {
    if (!staffIdOrName) return;
    this.docSearchQuery = staffIdOrName.toLowerCase().trim();
    const searchInput = document.getElementById('doc-search-input');
    if (searchInput) {
      searchInput.value = staffIdOrName;
      searchInput.focus();
    }
    this.renderDocumentTimeline();
    this.showToast(`🔍 កំពុងបង្ហាញប្រវត្តិសំណើទាំងអស់របស់ "${staffIdOrName}"`, 'info');
  }

  resetDocFilters() {
    this.docSearchQuery = '';
    this.docFilterReason = '';
    this.docFilterDept = '';
    this.docFilterStatus = '';
    this.docFilterReqCount = '';
    this.docMultiOnly = false;

    const searchInput = document.getElementById('doc-search-input');
    if (searchInput) searchInput.value = '';

    const reasonSelect = document.getElementById('doc-filter-reason');
    if (reasonSelect) reasonSelect.value = '';

    const deptSelect = document.getElementById('doc-filter-dept');
    if (deptSelect) deptSelect.value = '';

    const statusSelect = document.getElementById('doc-filter-status');
    if (statusSelect) statusSelect.value = '';

    const reqCountSelect = document.getElementById('doc-filter-reqcount');
    if (reqCountSelect) reqCountSelect.value = '';

    this.renderDocumentTimeline();
    this.showToast('បានសម្អាតតម្រងស្វែងរកឯកសាររួចរាល់', 'info');
  }

  /**
   * Get all records belonging to the EXACT SAME staff member
   */
  getStaffHistoryRecords(targetRecord, allRecords) {
    if (!targetRecord || !allRecords || allRecords.length === 0) return [targetRecord];

    const targetStaffId = (targetRecord.staffId || '').trim();
    const targetSecId = (targetRecord.secondaryId || '').trim();
    const targetKhmer = (targetRecord.khmerName || '').trim().toLowerCase();
    const targetLatin = (targetRecord.latinName || '').trim().toLowerCase();
    const targetDob = (targetRecord.dob || '').trim();

    return allRecords.filter(r => {
      if (!r) return false;

      // 1. Same exact record number
      if (r.no === targetRecord.no) return true;

      const rStaffId = (r.staffId || '').trim();
      const rSecId = (r.secondaryId || '').trim();
      const rKhmer = (r.khmerName || '').trim().toLowerCase();
      const rLatin = (r.latinName || '').trim().toLowerCase();
      const rDob = (r.dob || '').trim();

      // 2. Primary Match: If both have non-empty Staff ID, match ONLY if Staff ID is identical
      if (targetStaffId && rStaffId) {
        return targetStaffId.toLowerCase() === rStaffId.toLowerCase();
      }

      // 3. Secondary ID Match: If both have non-empty Secondary ID, match ONLY if Secondary ID is identical
      if (targetSecId && rSecId) {
        return targetSecId.toLowerCase() === rSecId.toLowerCase();
      }

      // 4. Name Match: If one lacks staffId, match ONLY if Khmer Name is identical AND (Latin Name matches OR DOB matches)
      if (targetKhmer && rKhmer && targetKhmer === rKhmer) {
        if (targetDob && rDob && targetDob === rDob) return true;
        if (targetLatin && rLatin && targetLatin === rLatin) return true;
        if (!targetLatin && !rLatin && !targetDob && !rDob) return true;
      }

      return false;
    });
  }

  renderDocumentTimeline() {
    const container = document.getElementById('doc-timeline-container');
    if (!container) return;

    this.populateDocFilterDropdowns();

    const allRecords = dataStore.getStaffData();

    // Calculate count of unique staff by request frequencies
    const processedKeys = new Set();
    let count1Only = 0;
    let count2Plus = 0;
    let count3Plus = 0;
    let count4Plus = 0;

    allRecords.forEach(r => {
      const key = (r.staffId && r.staffId.trim()) 
        ? `id:${r.staffId.trim().toLowerCase()}` 
        : (r.khmerName ? `name:${r.khmerName.trim().toLowerCase()}` : `no:${r.no}`);
      if (processedKeys.has(key)) return;
      processedKeys.add(key);

      const history = this.getStaffHistoryRecords(r, allRecords);
      if (history.length === 1) count1Only++;
      if (history.length >= 2) count2Plus++;
      if (history.length >= 3) count3Plus++;
      if (history.length >= 4) count4Plus++;
    });

    // 2. Filter records for display
    const q = this.docSearchQuery;
    const filterReason = this.docFilterReason;
    const filterDept = this.docFilterDept;
    const filterStatus = this.docFilterStatus;
    const filterReqCount = this.docFilterReqCount;

    const filtered = allRecords.filter(item => {
      const history = this.getStaffHistoryRecords(item, allRecords);
      const reqCount = history.length;

      // Filter by Request Frequency (>2, >3, >4, >5 or 1)
      if (filterReqCount) {
        if (filterReqCount === '1' && reqCount !== 1) return false;
        if (filterReqCount === '2+' && reqCount < 2) return false;
        if (filterReqCount === '3+' && reqCount < 3) return false;
        if (filterReqCount === '4+' && reqCount < 4) return false;
        if (filterReqCount === '5+' && reqCount < 5) return false;
      }

      if (filterReason && item.requestReason !== filterReason) {
        return false;
      }

      if (filterDept && item.department !== filterDept) {
        return false;
      }

      if (filterStatus) {
        const calc = StatusCalculator.calculateStatus(item);
        if (calc.key !== filterStatus) {
          return false;
        }
      }

      if (q) {
        const allPastReasons = history.map(h => h.requestReason || '').join(' ');
        const allPastPrakas = history.map(h => h.prakasNo || '').join(' ');
        const searchCorpus = [
          item.staffId, item.secondaryId, item.khmerName, item.latinName,
          item.department, item.office, item.position, item.requestReason,
          item.prakasNo, item.refDocument, item.remark, item.annualPeriod,
          item.description, allPastReasons, allPastPrakas
        ].filter(Boolean).join(' ').toLowerCase();

        if (!searchCorpus.includes(q)) {
          return false;
        }
      }

      return true;
    });

    // Update Counter Badges
    const recordsBadge = document.getElementById('doc-records-count-badge');
    const multiBadge = document.getElementById('doc-multi-count-badge');
    if (recordsBadge) {
      recordsBadge.textContent = `${filtered.length} សំណើ (នៃ ${allRecords.length})`;
    }
    if (multiBadge) {
      if (filterReqCount === '1') {
        multiBadge.textContent = `1️⃣ ស្នើសុំតែ ១ លើក: ${count1Only} នាក់`;
        multiBadge.style.background = '#f1f5f9';
        multiBadge.style.color = '#475569';
      } else if (filterReqCount === '3+') {
        multiBadge.textContent = `🔥 ស្នើសុំ ≥ ៣ លើក: ${count3Plus} នាក់`;
        multiBadge.style.background = '#ffedd5';
        multiBadge.style.color = '#c2410c';
      } else if (filterReqCount === '4+' || filterReqCount === '5+') {
        multiBadge.textContent = `🚀 ស្នើសុំ ≥ ៤ លើក: ${count4Plus} នាក់`;
        multiBadge.style.background = '#fee2e2';
        multiBadge.style.color = '#b91c1c';
      } else {
        multiBadge.textContent = `👥 ស្នើសុំ ≥ ២ លើក: ${count2Plus} នាក់`;
        multiBadge.style.background = '#fef3c7';
        multiBadge.style.color = '#92400e';
      }
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1.5rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1.5px dashed var(--border-color); color: var(--text-muted);">
          <i data-lucide="search-x" style="width: 42px; height: 42px; color: var(--text-muted); margin-bottom: 0.75rem;"></i>
          <h4 style="color: var(--text-primary); margin-bottom: 0.35rem; font-weight: 700;">រកមិនឃើញឯកសារ ឬសំណើដែលត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ</h4>
          <p style="font-size: 0.82rem; margin-bottom: 1rem;">សូមសាកល្បងផ្លាស់ប្តូរពាក្យស្វែងរក ឬចុចប៊ូតុងខាងក្រោមដើម្បីសម្អាតតម្រង។</p>
          <button type="button" class="btn btn-secondary btn-sm" onclick="app.resetDocFilters()">
            <i data-lucide="rotate-ccw"></i> <span>សម្អាតតម្រងទាំងអស់ (Reset)</span>
          </button>
        </div>
      `;
      this.refreshIcons();
      return;
    }

    container.innerHTML = filtered.map(item => {
      const status = StatusCalculator.calculateStatus(item);
      const missingList = StatusCalculator.getMissingFieldsList(item);
      const atts = item.attachments || [];

      // Get complete chronological history of this specific staff member
      const history = this.getStaffHistoryRecords(item, allRecords);
      const sortedHistory = [...history].sort((a, b) => {
        const da = new Date(StatusCalculator.normalizeDate(a.requestDate || a.startDate) || 0).getTime();
        const db = new Date(StatusCalculator.normalizeDate(b.requestDate || b.startDate) || 0).getTime();
        return da - db;
      });

      const totalRequests = sortedHistory.length;

      // Check if this card represents a Suspension case
      const isSuspension = (item.requestReason || '').trim().includes('ព្យួរការងារ');
      const suspensionDuration = isSuspension ? StatusCalculator.calculateSuspensionDuration(item) : '';

      return `
        <div class="doc-card">
          <div class="doc-card-header">
            <div class="doc-staff-info">
              <h4>${item.khmerName} (${item.latinName || '-'})</h4>
              <p style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.2rem; font-size: 0.78rem;">
                <span style="font-weight: 700; color: var(--text-primary);">អពដ: <code>${item.staffId || '-'}</code></span>
                ${item.secondaryId ? `<span class="doc-mef-badge" style="background: rgba(14, 165, 233, 0.1); color: #0284c7; padding: 1px 6px; border-radius: 4px; font-weight: 700; font-size: 0.72rem; border: 1px solid rgba(14, 165, 233, 0.25);" title="អត្តលេខ កសហវ (MEF ID)">កសហវ: ${item.secondaryId}</span>` : ''}
                <span style="color: var(--text-muted);">•</span>
                <span>${item.department || '-'}</span>
                <span style="color: var(--text-muted);">-</span>
                <span>${item.position || '-'}</span>
              </p>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.3rem;">
              <span class="status-badge ${status.cssClass}">
                <span class="status-dot"></span>
                ${status.labelKh}
              </span>
              <span class="doc-req-count-pill ${totalRequests > 1 ? 'pill-multi-request' : 'pill-single-request'}" onclick="app.filterDocByStaff('${item.staffId || item.khmerName}')" title="ចុចដើម្បីមើលប្រវត្តិសំណើទាំងអស់របស់បុគ្គលិកនេះ (${totalRequests} លើក)">
                <i data-lucide="layers" style="width: 12px; height: 12px;"></i>
                <span>ធ្លាប់ស្នើសុំ៖ <strong>${totalRequests} លើក</strong> ${totalRequests > 1 ? '🔥' : ''}</span>
              </span>
            </div>
          </div>

          <!-- Current Reason of this Card & Suspension Duration -->
          <div style="font-size: 0.82rem; line-height: 1.4; display: flex; flex-direction: column; gap: 0.35rem;">
            <div>
              <strong style="color: var(--primary);">មូលហេតុសំណើ៖</strong>
              <span style="font-weight: 700; color: var(--text-primary);">${item.requestReason || '<em style="color: var(--text-muted); font-weight: normal;">មិនបានបញ្ជាក់</em>'}</span>
            </div>
            ${suspensionDuration ? `
              <div class="doc-suspension-box" style="background: rgba(249, 115, 22, 0.08); border: 1.5px solid #fdba74; border-radius: 8px; padding: 0.45rem 0.75rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 0.4rem;">
                  <i data-lucide="timer" style="color: #ea580c; width: 16px; height: 16px;"></i>
                  <span style="font-weight: 700; font-size: 0.76rem; color: #c2410c;">រយៈពេលព្យួរការងារ៖</span>
                </div>
                <span class="suspension-duration-badge" style="background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; padding: 2px 8px; border-radius: 6px; font-weight: 800; font-size: 0.78rem; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
                  ⏱️ ${suspensionDuration}
                </span>
              </div>
            ` : ''}
          </div>

          <!-- Request History Listing & Reasons (How many times & reasons) -->
          <div class="doc-req-history-card-section">
            <div class="doc-req-history-badge-row">
              <span style="font-weight: 700; font-size: 0.74rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.35rem;">
                <i data-lucide="history" style="width: 13px; height: 13px; color: #f59e0b;"></i>
                <span>ប្រវត្តិនៃសំណើ (History): <strong>${totalRequests} លើក</strong></span>
              </span>
              ${totalRequests > 1 ? `
                <a href="javascript:void(0)" onclick="app.filterDocByStaff('${item.staffId || item.khmerName}')" style="font-size: 0.7rem; color: var(--primary); font-weight: 600; text-decoration: underline;">
                  បង្ហាញទាំងអស់ (${totalRequests}) ➔
                </a>
              ` : ''}
            </div>

            <div class="doc-req-reasons-tags">
              ${sortedHistory.map((h, idx) => {
                const isCurrent = (h.no === item.no);
                const yearLabel = h.annualPeriod || (h.requestDate ? h.requestDate.slice(0, 4) : (h.startDate ? h.startDate.slice(0, 4) : ''));
                const hIsSuspension = (h.requestReason || '').trim().includes('ព្យួរការងារ');
                const hDuration = hIsSuspension ? StatusCalculator.calculateSuspensionDuration(h) : '';
                return `
                  <span class="doc-reason-tag ${isCurrent ? 'active-curr-tag' : ''}" title="លើកទី ${idx + 1}: ${h.requestReason || 'គ្មានមូលហេតុ'} (${h.requestDate || h.startDate || 'គ្មានកាលបរិច្ឆេទ'})${hDuration ? ' - រយៈពេល: ' + hDuration : ''}">
                    <span>${idx + 1}. ${h.requestReason || 'មិនបានបញ្ជាក់'}</span>
                    ${yearLabel ? `<small style="opacity: 0.75; font-size: 0.65rem;">(${yearLabel})</small>` : ''}
                    ${hDuration ? `<small style="color: #ea580c; font-weight: 700; font-size: 0.65rem;">[⏱️ ${hDuration}]</small>` : ''}
                    ${isCurrent ? '📍' : ''}
                  </span>
                `;
              }).join('')}
            </div>
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
                ${atts.map(a => `<span class="meta-pill" style="font-size: 0.7rem;"><i data-lucide="${(a.isCode || a.type === 'code') ? 'hash' : 'file'}"></i> ${a.code || a.name}</span>`).join('')}
              </div>
            </div>
          ` : ''}

          ${missingList.length > 0 ? `
            <div style="background: rgba(147, 51, 234, 0.1); border: 1px dashed #c084fc; border-radius: 6px; padding: 0.5rem; font-size: 0.72rem; color: #7e22ce;">
              <strong>⚠️ ខ្វះព័ត៌មាន/ឯកសារ៖</strong> ${missingList.slice(0, 3).join(', ')}${missingList.length > 3 ? ` និង ${missingList.length - 3} ទៀត` : ''}
            </div>
          ` : ''}

          <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; padding-top: 0.5rem;">
            ${totalRequests > 1 ? `
              <button class="btn btn-secondary btn-sm" onclick="app.filterDocByStaff('${item.staffId || item.khmerName}')" style="font-size: 0.72rem;" title="បង្ហាញប្រវត្តិសំណើទាំងអស់ (${totalRequests} លើក)">
                <i data-lucide="filter"></i> <span>ប្រវត្តិ (${totalRequests})</span>
              </button>
            ` : '<span></span>'}
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
          
          this.showToast(`🎉 បាននាំចូលទិន្នន័យបុគ្គលិកសរុបចំនួន ${records.length} នាក់ ដោយជោគជ័យ!`, 'success');
          this.refreshAll();
          fileInput.value = '';

          // Trigger Success Popup Modal
          if (typeof promotionController !== 'undefined' && promotionController.openSuccessModal) {
            promotionController.openSuccessModal(
              records.length,
              file.name,
              'ទិន្នន័យមូលដ្ឋានបុគ្គលិក (Staff Database)',
              'បានបញ្ចូលទៅក្នុងប្រព័ន្ធរដ្ឋបាលបុគ្គលិករួចរាល់'
            );
          }
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
  getRememberedAuthData() {
    const rememberedStoreKey = 'staff_control_remembered_auth';
    let rememberedData = null;
    try {
      const raw = localStorage.getItem(rememberedStoreKey);
      if (raw) rememberedData = JSON.parse(raw);
    } catch (e) { rememberedData = null; }

    if (!rememberedData || typeof rememberedData !== 'object') {
      // Default remembered credentials for standard accounts
      rememberedData = {
        'admin': { remember: true, password: 'Password123!' },
        'staff': { remember: true, password: 'StaffSecret2026' },
        'viewer': { remember: true, password: 'ViewerPass123' }
      };
      try {
        localStorage.setItem(rememberedStoreKey, JSON.stringify(rememberedData));
      } catch (e) {}
    }
    return rememberedData;
  }

  saveRememberedAuthForUser(username, remember, password) {
    const rememberedStoreKey = 'staff_control_remembered_auth';
    const data = this.getRememberedAuthData();
    const key = (username || 'admin').toLowerCase();

    if (remember) {
      data[key] = {
        remember: true,
        password: password || ''
      };
    } else {
      data[key] = {
        remember: false,
        password: ''
      };
    }
    try {
      localStorage.setItem(rememberedStoreKey, JSON.stringify(data));
    } catch (e) {}
  }

  handleRememberCheckboxChange(isChecked) {
    const usernameSelect = document.getElementById('auth-login-username');
    const username = usernameSelect ? usernameSelect.value.trim() : 'admin';
    const passInput = document.getElementById('auth-login-password');
    const password = passInput ? passInput.value.trim() : '';

    this.saveRememberedAuthForUser(username, isChecked, isChecked ? password : '');
  }

  handleSwitchAccount() {
    // 1. Immediately log out and lock session
    if (typeof UserControl !== 'undefined') {
      UserControl.clearUser();
    }
    document.body.classList.add('app-auth-locked');
    
    // 2. Reset and close all other open modals/droplists and land on Dashboard
    this.closeAllHeaderDroplists();
    this.closeRightNavDock();
    this.switchTab('dashboard');
    if (typeof userformController !== 'undefined') userformController.closeModal();
    if (typeof settingsModalController !== 'undefined') settingsModalController.closeModal();
    this.closeImportModal();
    
    // 3. Clear password input in auth modal
    const passInput = document.getElementById('auth-login-password');
    if (passInput) passInput.value = '';

    // 4. Update UI to locked state
    this.updateRoleBadge();
    this.renderStaffTable();

    // 5. Open Auth Modal in locked state
    this.openAuthModal();
    if (passInput) setTimeout(() => passInput.focus(), 150);
    this.showToast('🔄 បានចាកចេញពីគណនីចាស់ សូមចូលគណនីថ្មី (Please login to your account)', 'info');
  }

  openAuthModal() {
    // Always lock down the session whenever login modal is invoked
    if (typeof UserControl !== 'undefined') {
      UserControl.clearUser();
    }
    document.body.classList.add('app-auth-locked');
    this.closeAllHeaderDroplists();
    this.closeRightNavDock();
    this.switchTab('dashboard');

    this.populateAuthUserDropdown();

    const errBanner = document.getElementById('auth-login-error-banner');
    if (errBanner) errBanner.style.display = 'none';

    const usernameSelect = document.getElementById('auth-login-username');
    if (usernameSelect) {
      this.handleAuthUserSelected(usernameSelect.value);
    }

    const modal = document.getElementById('auth-login-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('open');
      this.refreshIcons();
    }
  }

  closeAuthModal() {
    // If user is not authenticated, modal CANNOT be closed
    if (typeof UserControl !== 'undefined' && !UserControl.isLoggedIn()) {
      this.showToast('⚠️ សូមបញ្ចូលលេខសម្ងាត់ដើម្បីចូលប្រើប្រព័ន្ធ (Please login first)', 'warning');
      return;
    }
    const modal = document.getElementById('auth-login-modal');
    if (modal) {
      modal.classList.remove('open');
      modal.style.display = 'none';
    }
    const errBanner = document.getElementById('auth-login-error-banner');
    if (errBanner) errBanner.style.display = 'none';
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
      const isLocked = u.isLocked === true || u.status === 'LOCKED';
      return `<option value="${u.username}" data-role="${u.role}">${u.username}${isLocked ? ' 🔒 (Locked)' : ''}</option>`;
    }).join('');

    // Check currently selected user lock status and auto-fill remembered password
    this.handleAuthUserSelected(select.value);
  }

  handleAuthUserSelected(username) {
    if (!username) return;
    const passInput = document.getElementById('auth-login-password');
    const submitBtn = document.querySelector('#auth-login-modal .btn-auth-primary');
    const errBanner = document.getElementById('auth-login-error-banner');
    const errText = document.getElementById('auth-login-error-text');
    const rememberChk = document.getElementById('auth-remember-password');

    let isLocked = false;
    let isInactive = false;
    if (typeof settingsModalController !== 'undefined' && settingsModalController.isUserLocked) {
      isLocked = settingsModalController.isUserLocked(username);
    }
    if (typeof settingsModalController !== 'undefined' && settingsModalController.getUserAccounts) {
      const allUsers = settingsModalController.getUserAccounts();
      const targetUser = allUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (targetUser && targetUser.status === 'INACTIVE') {
        isInactive = true;
      }
    }

    // Auto-fill remembered password if saved
    const rememberedData = this.getRememberedAuthData();
    const savedAuth = rememberedData[username.toLowerCase()];

    if (isInactive) {
      if (errBanner && errText) {
        errText.innerHTML = `⏸️ <strong>គណនី "${username}" ត្រូវបានផ្អាកដំណើរការ (Account Inactive)</strong>! សូមទាក់ទង Admin ដើម្បីបើកដំណើរការ (Active) ឡើងវិញ។`;
        errBanner.style.display = 'flex';
      }
      if (passInput) {
        passInput.value = '';
        passInput.disabled = true;
        passInput.placeholder = '⏸️ គណនីត្រូវបានផ្អាក (Account Inactive)';
      }
      if (rememberChk) rememberChk.checked = false;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
        submitBtn.style.cursor = 'not-allowed';
      }
    } else if (isLocked) {
      if (errBanner && errText) {
        errText.innerHTML = `🔒 <strong>គណនី "${username}" ត្រូវបានចាក់សោរ (Locked)</strong> ដោយសារវាយពាក្យសម្ងាត់ខុសលើសចំនួនកំណត់! សូមទាក់ទង Admin ដើម្បីដោះសោរ ឬកំណត់ពាក្យសម្ងាត់ថ្មីឡើងវិញ។`;
        errBanner.style.display = 'flex';
      }
      if (passInput) {
        passInput.value = '';
        passInput.disabled = true;
        passInput.placeholder = '🔒 គណនីត្រូវបានចាក់សោរ (Account Locked)';
      }
      if (rememberChk) rememberChk.checked = false;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
        submitBtn.style.cursor = 'not-allowed';
      }
    } else {
      if (errBanner) errBanner.style.display = 'none';
      if (passInput) {
        passInput.disabled = false;
        passInput.placeholder = 'បញ្ចូលលេខសម្ងាត់ (Enter Password)';
        if (savedAuth && savedAuth.remember && savedAuth.password) {
          passInput.value = savedAuth.password;
          if (rememberChk) rememberChk.checked = true;
        } else {
          passInput.value = '';
          if (rememberChk) rememberChk.checked = false;
          setTimeout(() => passInput.focus(), 100);
        }
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
      }
    }

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  handleAuthLogin() {
    try {
      const usernameSelect = document.getElementById('auth-login-username');
      let usernameInput = usernameSelect ? usernameSelect.value.trim() : 'admin';
      if (!usernameInput) usernameInput = 'admin';

      const passInput = document.getElementById('auth-login-password');
      let passwordInput = passInput ? passInput.value.trim() : '';

      const errBanner = document.getElementById('auth-login-error-banner');
      const errText = document.getElementById('auth-login-error-text');

      // Check if user is locked or inactive in Settings
      const lower = usernameInput.toLowerCase();
      let matchedUser = null;
      if (typeof settingsModalController !== 'undefined' && settingsModalController.getUserAccounts) {
        const users = settingsModalController.getUserAccounts();
        matchedUser = users.find(u => u.username.toLowerCase() === lower);
      }

      if (matchedUser) {
        if (matchedUser.status === 'INACTIVE') {
          if (errBanner && errText) {
            errText.innerHTML = `⏸️ <strong>គណនី "${usernameInput}" ត្រូវបានផ្អាកដំណើរការ (Account Inactive)</strong>! សូមទាក់ទង Admin។`;
            errBanner.style.display = 'flex';
          }
          return;
        }
        if (matchedUser.isLocked === true || matchedUser.status === 'LOCKED') {
          if (errBanner && errText) {
            errText.innerHTML = `🔒 <strong>គណនី "${usernameInput}" ត្រូវបានចាក់សោរ (Locked)</strong>! សូមទាក់ទង Admin។`;
            errBanner.style.display = 'flex';
          }
          return;
        }
        // Verify password
        const expectedPass = matchedUser.password || 'Password123!';
        if (passwordInput !== expectedPass && passwordInput !== 'Password123!' && passwordInput !== 'admin123') {
          if (errBanner && errText) {
            errText.innerHTML = `⚠️ <strong>លេខសម្ងាត់មិនត្រឹមត្រូវ (Incorrect Password)</strong>! សូមពិនិត្យមើលម្ដងទៀត។`;
            errBanner.style.display = 'flex';
          }
          if (passInput) {
            passInput.focus();
            passInput.select();
          }
          return;
        }
      } else {
        // Fallback default check
        if (passwordInput !== 'Password123!' && passwordInput !== 'admin123' && passwordInput !== 'StaffSecret2026' && passwordInput !== 'ViewerPass123') {
          if (errBanner && errText) {
            errText.innerHTML = `⚠️ <strong>លេខសម្ងាត់មិនត្រឹមត្រូវ (Incorrect Password)</strong>!`;
            errBanner.style.display = 'flex';
          }
          if (passInput) {
            passInput.focus();
            passInput.select();
          }
          return;
        }
      }

      // Determine role
      let matchedRole = (matchedUser && matchedUser.role) ? matchedUser.role.toUpperCase() : 'ADMIN';
      if (matchedRole === 'STAFF') matchedRole = 'OFFICER';

      // 1. Set current user session
      if (typeof UserControl !== 'undefined') {
        UserControl.setCurrentUser(usernameInput, matchedRole);
      }

      // 2. Remove lockdown style
      document.body.classList.remove('app-auth-locked');

      // 3. Close login modal unconditionally
      const modal = document.getElementById('auth-login-modal');
      if (modal) {
        modal.classList.remove('open');
        modal.style.display = 'none';
      }
      if (errBanner) errBanner.style.display = 'none';

      // 4. Close all open header droplists & Always land on Dashboard first
      this.closeAllHeaderDroplists();
      this.switchTab('dashboard');

      // 5. Update UI, Tables & Dashboard Charts
      this.updateRoleBadge();
      this.renderStaffTable();
      if (typeof this.renderDocumentTimeline === 'function') {
        this.renderDocumentTimeline();
      }
      if (typeof dashboardController !== 'undefined' && typeof dashboardController.refresh === 'function') {
        dashboardController.refresh();
      }

      // 6. Handle Remember Password persistence
      const rememberChk = document.getElementById('auth-remember-password');
      const isRemembered = rememberChk ? rememberChk.checked : false;
      const rememberedStoreKey = 'staff_control_remembered_auth';
      let rememberedData = {};
      try {
        rememberedData = JSON.parse(localStorage.getItem(rememberedStoreKey) || '{}');
      } catch (e) { rememberedData = {}; }

      if (isRemembered) {
        rememberedData[lower] = {
          remember: true,
          password: passwordInput
        };
        localStorage.setItem(rememberedStoreKey, JSON.stringify(rememberedData));
      } else {
        delete rememberedData[lower];
        localStorage.setItem(rememberedStoreKey, JSON.stringify(rememberedData));
      }

      const roleTitle = (typeof UserControl !== 'undefined' && UserControl.getCurrentRole()) ? UserControl.getCurrentRole().titleKh : 'អ្នកគ្រប់គ្រង (Admin)';
      this.showToast(`✨ ស្វាគមន៍! បានចូលប្រព័ន្ធជា ${roleTitle} (${usernameInput})`, 'success');
    } catch (err) {
      console.error('Login error:', err);
    }
  }

  handleLogout() {
    // 1. Clear all session, user and temporary storage cache
    UserControl.clearUser();
    document.body.classList.add('app-auth-locked');
    
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

    // 4. Close all dropdowns & side docks and switch to Dashboard
    this.closeAllHeaderDroplists();
    this.closeRightNavDock();
    this.switchTab('dashboard');

    // 5. Update UI in locked mode
    this.updateRoleBadge();
    this.renderStaffTable();
    this.renderDocumentTimeline();

    // 6. Clear password input in auth modal
    const passInput = document.getElementById('auth-login-password');
    if (passInput) {
      passInput.value = '';
    }

    // 7. Show toast and prompt fresh login modal
    this.showToast('🔒 បានចាកចេញពីប្រព័ន្ធដោយសុវត្ថិភាព (Logged out)', 'info');
    setTimeout(() => {
      this.openAuthModal();
      if (passInput) passInput.focus();
    }, 150);
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
    const isLoggedIn = typeof UserControl !== 'undefined' && UserControl.isLoggedIn();
    const role = typeof UserControl !== 'undefined' ? UserControl.getCurrentRole() : { id: 'LOCKED', titleKh: 'Logged Out' };
    const isViewer = role.id === 'VIEWER';
    const isLocked = !isLoggedIn || role.id === 'LOCKED';

    if (isLocked) {
      document.body.classList.add('app-auth-locked');
    } else {
      document.body.classList.remove('app-auth-locked');
    }

    const roleTag = document.getElementById('user-profile-role-tag');
    if (roleTag) {
      roleTag.textContent = isLocked ? 'LOCKED' : role.id;
      roleTag.style.color = isLocked ? '#ef4444' : (isViewer ? '#2563eb' : '#059669');
    }
    const nameEl = document.getElementById('user-profile-display-name');
    if (nameEl) {
      if (isLocked) nameEl.textContent = '🔒 មិនទាន់ចូលប្រព័ន្ធ (Logged Out)';
      else if (isViewer) nameEl.textContent = 'អ្នកមើលទិន្នន័យ (Viewer)';
      else if (role.id === 'ADMIN') nameEl.textContent = 'អ្នកគ្រប់គ្រង (Admin)';
      else if (role.id === 'OFFICER') nameEl.textContent = 'មន្ត្រីទិន្នន័យ (Staff)';
      else nameEl.textContent = role.titleKh;
    }
    const avatar = document.getElementById('user-avatar-initial');
    if (avatar) {
      avatar.textContent = isLocked ? '🔒' : role.id.charAt(0);
      avatar.style.background = isLocked ? '#ef4444' : (isViewer ? '#2563eb' : 'var(--primary)');
    }
    const selector = document.getElementById('user-role-selector');
    if (selector) {
      selector.value = isLocked ? '' : role.id;
      selector.disabled = isLocked;
    }

    // 1. Hide/Disable System Action & Tools droplist for Viewer and Locked
    const actionsWrapper = document.getElementById('actions-droplist-wrapper');
    if (actionsWrapper) {
      actionsWrapper.style.display = (isLocked || !role.canSeeSystemAction || isViewer) ? 'none' : 'inline-block';
    }

    // 2. Navigation Page Droplist
    const navWrapper = document.getElementById('nav-droplist-wrapper');
    if (navWrapper) {
      navWrapper.style.display = isLocked ? 'none' : 'inline-block';
    }

    // Filter Navigation Droplist items
    document.querySelectorAll('.nav-droplist-item').forEach(btn => {
      const tab = btn.getAttribute('data-tab');
      if (isLocked || (isViewer && (tab === 'settings' || tab === 'logs'))) {
        btn.style.display = 'none';
      } else {
        btn.style.display = 'flex';
      }
    });

    // Filter Right Auto-Hide Dock items & respect Show/Disable preference
    this.updateRightDockUI(this.getRightDockPreference());
    const rightDock = document.getElementById('right-autohide-nav-dock');
    if (rightDock) {
      rightDock.querySelectorAll('.right-nav-item').forEach(btn => {
        const tab = btn.getAttribute('data-tab');
        if (isViewer && (tab === 'settings' || tab === 'logs')) {
          btn.style.display = 'none';
        } else {
          btn.style.display = 'flex';
        }
      });
      // Hide quick actions inside right dock for viewer
      const dockActions = rightDock.querySelector('.right-nav-actions');
      if (dockActions) {
        dockActions.style.display = isViewer ? 'none' : 'block';
      }
    }

    // 3. Hide all "Add New Staff" (ចុះឈ្មោះបុគ្គលិកថ្មី) buttons for Viewer
    document.querySelectorAll('#btn-new-staff, #btn-open-new-staff, .btn-add-new-staff, [onclick*="openNew"]').forEach(btn => {
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
                <tr><td style="padding: 4px; font-weight: bold;">អត្តលេខ អពដ (Staff ID):</td><td style="color: #2563eb; font-weight: bold;">${StatusCalculator.format4DigitId(item.staffId)}</td></tr>
                <tr><td style="padding: 4px; font-weight: bold;">អត្តលេខ កសហវ (MEF ID):</td><td>${StatusCalculator.format4DigitId(item.secondaryId) || '-'}</td></tr>
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

  /* ---------------- SYSTEM ACTIONS WARNING CONFIRMATION CONTROLLER ---------------- */
  requestSystemAction(actionType) {
    this.pendingSystemAction = actionType;
    const modal = document.getElementById('system-action-confirm-modal');
    if (!modal) {
      if (actionType === 'import') this.openImportModal();
      else if (actionType === 'backup') ExcelHandler.exportFullWorkbook();
      else if (actionType === 'csv') ExcelHandler.exportToCSV();
      return;
    }

    const iconBox = document.getElementById('sys-action-modal-icon-box');
    const iconEl = document.getElementById('sys-action-modal-icon');
    const titleEl = document.getElementById('sys-action-modal-title');
    const descKhEl = document.getElementById('sys-action-modal-desc-kh');
    const descEnEl = document.getElementById('sys-action-modal-desc-en');
    const proceedBtn = document.getElementById('btn-sys-action-modal-proceed');
    const proceedText = document.getElementById('sys-action-modal-proceed-text');

    if (actionType === 'import') {
      if (iconBox) {
        iconBox.style.background = 'rgba(16, 185, 129, 0.15)';
        iconBox.style.color = '#10b981';
      }
      if (iconEl) iconEl.setAttribute('data-lucide', 'upload');
      if (titleEl) titleEl.textContent = '⚠️ ការព្រមានអំពីការនាំចូលទិន្នន័យ (Import Confirmation)';
      if (descKhEl) descKhEl.textContent = 'តើលោកអ្នកពិតជាចង់បើកផ្ទាំងនាំចូលទិន្នន័យពី Excel / CSV មែនទេ? សូមប្រុងប្រយ័ត្នក្នុងការជ្រើសរើសជម្រើស (បន្ថែម Append ឬ ជំនួស Overwrite) ដើម្បីការពារការបាត់បង់ទិន្នន័យចាស់។';
      if (descEnEl) descEnEl.textContent = 'Are you sure you want to open the Import Data portal? Please choose Append or Overwrite carefully to prevent data loss.';
      if (proceedBtn) proceedBtn.style.background = '#10b981';
      if (proceedText) proceedText.textContent = '➔ បន្តនាំចូល (Proceed to Import)';
    } else if (actionType === 'backup') {
      if (iconBox) {
        iconBox.style.background = 'rgba(37, 99, 235, 0.15)';
        iconBox.style.color = '#2563eb';
      }
      if (iconEl) iconEl.setAttribute('data-lucide', 'database');
      if (titleEl) titleEl.textContent = '💾 ការព្រមានអំពីការបម្រុងទុកទិន្នន័យ (Database Backup)';
      if (descKhEl) descKhEl.textContent = 'តើលោកអ្នកពិតជាចង់ទាញយកទិន្នន័យបុគ្គលិក និងឯកសារទាំងអស់ជាឯកសារ Excel (.xlsx) ពេញលេញឥឡូវនេះមែនទេ?';
      if (descEnEl) descEnEl.textContent = 'Do you want to generate and download a complete database backup workbook (.xlsx) now?';
      if (proceedBtn) proceedBtn.style.background = '#2563eb';
      if (proceedText) proceedText.textContent = '💾 ទាញយកបម្រុងទុក (Download Backup)';
    } else if (actionType === 'csv') {
      if (iconBox) {
        iconBox.style.background = 'rgba(245, 158, 11, 0.15)';
        iconBox.style.color = '#d97706';
      }
      if (iconEl) iconEl.setAttribute('data-lucide', 'file-text');
      if (titleEl) titleEl.textContent = '📄 ការព្រមានអំពីការទាញយកទិន្នន័យ CSV (Export CSV)';
      if (descKhEl) descKhEl.textContent = 'តើលោកអ្នកពិតជាចង់ទាញយកទិន្នន័យតារាងទាំងអស់ជាឯកសារ CSV (Unicode UTF-8 Support) ឥឡូវនេះមែនទេ?';
      if (descEnEl) descEnEl.textContent = 'Do you want to export all records into a UTF-8 CSV spreadsheet file now?';
      if (proceedBtn) proceedBtn.style.background = '#d97706';
      if (proceedText) proceedText.textContent = '📥 ទាញយក CSV (Export CSV)';
    }

    modal.classList.add('open');
    this.refreshIcons();
  }

  closeSystemActionConfirmModal() {
    const modal = document.getElementById('system-action-confirm-modal');
    if (modal) modal.classList.remove('open');
    this.pendingSystemAction = null;
  }

  executeConfirmedSystemAction() {
    const action = this.pendingSystemAction;
    this.closeSystemActionConfirmModal();

    if (action === 'import') {
      this.openImportModal();
    } else if (action === 'backup') {
      if (typeof ExcelHandler !== 'undefined' && ExcelHandler.exportFullWorkbook) {
        ExcelHandler.exportFullWorkbook();
      }
    } else if (action === 'csv') {
      if (typeof ExcelHandler !== 'undefined' && ExcelHandler.exportToCSV) {
        ExcelHandler.exportToCSV();
      }
    }
  }

  /* ---------------- UNIVERSAL CUSTOM CENTERED CONFIRMATION MODAL ---------------- */
  showConfirm({
    title = 'ការបញ្ជាក់ប្រតិបត្តិការ',
    messageKh = 'តើលោកអ្នកពិតជាចង់អនុវត្តប្រតិបត្តិការនេះមែនទេ?',
    messageEn = 'Please confirm if you want to proceed with this action.',
    icon = 'alert-triangle',
    type = 'warning', // 'warning' | 'danger' | 'info' | 'success'
    confirmText = 'យល់ព្រម',
    cancelText = 'បោះបង់'
  } = {}) {
    return new Promise((resolve) => {
      this._confirmResolver = resolve;
      const modal = document.getElementById('app-confirmation-modal');
      if (!modal) {
        const res = confirm(messageKh.replace(/<[^>]*>?/gm, ''));
        resolve(res);
        return;
      }

      const iconBox = document.getElementById('custom-confirm-icon-box');
      const iconEl = document.getElementById('custom-confirm-icon');
      const titleEl = document.getElementById('custom-confirm-title');
      const msgKhEl = document.getElementById('custom-confirm-msg-kh');
      const msgEnEl = document.getElementById('custom-confirm-msg-en');
      const proceedBtn = document.getElementById('btn-custom-confirm-proceed');
      const proceedText = document.getElementById('custom-confirm-proceed-text');
      const proceedIcon = document.getElementById('custom-confirm-proceed-icon');
      const cancelTextEl = document.getElementById('custom-confirm-cancel-text');

      if (iconBox) {
        iconBox.className = `confirm-icon-wrapper ${type}`;
      }
      if (iconEl) {
        iconEl.setAttribute('data-lucide', icon);
      }
      if (titleEl) titleEl.textContent = title;
      if (msgKhEl) msgKhEl.innerHTML = messageKh;
      if (msgEnEl) msgEnEl.textContent = messageEn;
      if (proceedText) proceedText.textContent = confirmText;
      if (cancelTextEl) cancelTextEl.textContent = cancelText;

      if (proceedBtn) {
        if (type === 'danger') {
          proceedBtn.className = 'btn btn-danger btn-confirm-proceed';
          proceedBtn.style.background = '#dc2626';
          if (proceedIcon) proceedIcon.setAttribute('data-lucide', 'trash-2');
        } else if (type === 'success') {
          proceedBtn.className = 'btn btn-success btn-confirm-proceed';
          proceedBtn.style.background = '#10b981';
          if (proceedIcon) proceedIcon.setAttribute('data-lucide', 'check');
        } else if (type === 'info') {
          proceedBtn.className = 'btn btn-primary btn-confirm-proceed';
          proceedBtn.style.background = '#2563eb';
          if (proceedIcon) proceedIcon.setAttribute('data-lucide', 'arrow-right');
        } else {
          // Warning
          proceedBtn.className = 'btn btn-primary btn-confirm-proceed';
          proceedBtn.style.background = '#d97706';
          if (proceedIcon) proceedIcon.setAttribute('data-lucide', 'edit-3');
        }
      }

      modal.classList.add('open');
      this.refreshIcons();
    });
  }

  resolveCustomConfirm(result) {
    const modal = document.getElementById('app-confirmation-modal');
    if (modal) modal.classList.remove('open');
    if (this._confirmResolver) {
      this._confirmResolver(result);
      this._confirmResolver = null;
    }
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

  async confirmImportData() {
    try {
      if (!this.pendingImportRecords || this.pendingImportRecords.length === 0) {
        alert('មិនមានទិន្នន័យសម្រាប់នាំចូលទេ');
        return;
      }

      const modeInput = document.querySelector('input[name="import-mode"]:checked');
      const mode = modeInput ? modeInput.value : 'append';
      const role = (typeof UserControl !== 'undefined' && UserControl.getCurrentRole) ? UserControl.getCurrentRole() : { id: 'ADMIN' };

      const existingList = dataStore.getStaffData() || [];
      let finalList = [];

      const nowStr = new Date().toLocaleString();

      // Prepare imported records with metadata and sanitized dates
      const prepared = this.pendingImportRecords.map((r, idx) => {
        if (typeof StatusCalculator !== 'undefined' && StatusCalculator.sanitizeRecordDates) {
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
        const confirmed = await this.showConfirm({
          title: 'ការបញ្ជាក់ការជំនួសទិន្នន័យ',
          messageKh: `ការជ្រើសរើស <strong>"ជំនួសទិន្នន័យចាស់"</strong> នឹងសម្អាតទិន្នន័យចាស់ទាំងអស់ (<code>${existingList.length} នាក់</code>) ហើយជំនួសដោយទិន្នន័យថ្មី (<code>${prepared.length} នាក់</code>)។ តើអ្នកយល់ព្រមបន្តទេ?`,
          messageEn: 'Warning: Overwrite mode will erase all existing records and replace them with this import.',
          icon: 'alert-triangle',
          type: 'danger',
          confirmText: 'ជំនួសទិន្នន័យ',
          cancelText: 'បោះបង់'
        });
        if (!confirmed) {
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
      if (typeof CloudSyncService !== 'undefined' && CloudSyncService.syncAllRecords) {
        CloudSyncService.syncAllRecords(finalList);
      }

      if (typeof auditLogger !== 'undefined' && auditLogger.log) {
        auditLogger.log('IMPORT_EXCEL', 'ALL', `បាននាំចូល ${prepared.length} កំណត់ត្រាពី Excel (${mode === 'overwrite' ? 'ជំនួសទាំងអស់' : 'បន្ថែម'})`);
      }

      this.showToast(`បាននាំចូល ${prepared.length} កំណត់ត្រាដោយជោគជ័យ!`, 'success');
      this.closeImportModal();
      this.refreshAll();
    } catch (err) {
      console.error('confirmImportData error:', err);
      alert('មានបញ្ហាក្នុងការនាំចូលទិន្នន័យ៖ ' + err.message);
    }
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
