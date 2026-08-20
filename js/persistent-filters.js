/**
 * Staff System Control - Persistent Filters Manager
 * Supports Popover Dropdown Multi-Select with Apply Button & LocalStorage Persistence
 * Matches modern Stripe/Linear filter popover style
 */

class PersistentFilterManager {
  constructor() {
    this.storageKey = 'STAFF_PERSISTENT_FILTERS';
    this.filters = this.loadFilters();
    this.activePopover = null;
  }

  loadFilters() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Error reading persistent filters:', e);
    }
    return {
      status: [],          // e.g. ['active', 'pending']
      maturityCalc: [],    // e.g. ['maturity_calc', 'start_base', 'alerts_only']
      department: [],
      office: [],
      position: [],
      annualPeriod: [],
      requestReason: [],
      dateFrom: '',
      dateTo: ''
    };
  }

  saveFilters() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.filters));
    } catch (e) {
      console.warn('Error saving persistent filters:', e);
    }
    this.updateFilterButtonsUI();
    if (typeof app !== 'undefined') {
      app.currentPage = 1;
      app.updateActiveFiltersCounter();
      app.renderStaffTable();
      app.renderDocumentTimeline();
    }
  }

  init() {
    this.renderPersistentFilterBar();
    this.attachOutsideClickHandler();
    this.updateFilterButtonsUI();
  }

  renderPersistentFilterBar() {
    const container = document.getElementById('persistent-filter-bar-container');
    if (!container) return;

    container.innerHTML = `
      <div class="persistent-filters-row">
        <div class="persistent-filters-left">
          <!-- 1. Status Filter Popover Trigger -->
          <div class="p-filter-wrapper" id="pf-wrap-status">
            <button type="button" class="p-filter-btn" id="pf-btn-status" onclick="persistentFilters.togglePopover('status')">
              <i data-lucide="tag" class="p-filter-icon" style="color: #4f46e5;"></i>
              <span class="p-filter-label" id="pf-label-status">ស្ថានភាព (Status)</span>
              <i data-lucide="chevron-down" class="p-filter-chevron"></i>
            </button>
            <div class="p-filter-popover" id="pf-popover-status" style="display: none;">
              <!-- Popover content rendered on demand -->
            </div>
          </div>

          <!-- 2. Maturity & Date Calc Popover Trigger -->
          <div class="p-filter-wrapper" id="pf-wrap-maturity">
            <button type="button" class="p-filter-btn" id="pf-btn-maturity" onclick="persistentFilters.togglePopover('maturity')">
              <i data-lucide="target" class="p-filter-icon" style="color: #0ea5e9;"></i>
              <span class="p-filter-label" id="pf-label-maturity">គណនាកាលកំណត់</span>
              <i data-lucide="chevron-down" class="p-filter-chevron"></i>
            </button>
            <div class="p-filter-popover" id="pf-popover-maturity" style="display: none;">
              <!-- Popover content rendered on demand -->
            </div>
          </div>

          <!-- 3. Department Filter Popover Trigger -->
          <div class="p-filter-wrapper" id="pf-wrap-department">
            <button type="button" class="p-filter-btn" id="pf-btn-department" onclick="persistentFilters.togglePopover('department')">
              <i data-lucide="building" class="p-filter-icon" style="color: #10b981;"></i>
              <span class="p-filter-label" id="pf-label-department">អង្គភាព (Department)</span>
              <i data-lucide="chevron-down" class="p-filter-chevron"></i>
            </button>
            <div class="p-filter-popover" id="pf-popover-department" style="display: none;">
              <!-- Popover content rendered on demand -->
            </div>
          </div>

          <!-- 4. Position Filter Popover Trigger -->
          <div class="p-filter-wrapper" id="pf-wrap-position">
            <button type="button" class="p-filter-btn" id="pf-btn-position" onclick="persistentFilters.togglePopover('position')">
              <i data-lucide="briefcase" class="p-filter-icon" style="color: #f59e0b;"></i>
              <span class="p-filter-label" id="pf-label-position">តួនាទី (Position)</span>
              <i data-lucide="chevron-down" class="p-filter-chevron"></i>
            </button>
            <div class="p-filter-popover" id="pf-popover-position" style="display: none;">
              <!-- Popover content rendered on demand -->
            </div>
          </div>

          <!-- 5. Request Reason Filter Popover Trigger -->
          <div class="p-filter-wrapper" id="pf-wrap-reason">
            <button type="button" class="p-filter-btn" id="pf-btn-reason" onclick="persistentFilters.togglePopover('reason')">
              <i data-lucide="file-question" class="p-filter-icon" style="color: #8b5cf6;"></i>
              <span class="p-filter-label" id="pf-label-reason">មូលហេតុនៃសំណើ (Reason)</span>
              <i data-lucide="chevron-down" class="p-filter-chevron"></i>
            </button>
            <div class="p-filter-popover" id="pf-popover-reason" style="display: none;">
              <!-- Popover content rendered on demand -->
            </div>
          </div>

          <!-- Clear All Persistent Filters Button -->
          <button type="button" class="btn-clear-persistent" id="pf-btn-clear-all" onclick="persistentFilters.clearAllFilters()" style="display: none;" title="សម្អាតតម្រងសកម្មទាំងអស់">
            <i data-lucide="x" style="width: 13px; height: 13px;"></i>
            <span>សម្អាត (Clear)</span>
          </button>
        </div>

        <div class="persistent-filters-right">
          <!-- Advanced Multi-Dimension Toggle -->
          <button type="button" class="btn-toggle-advanced-filter" id="btn-toggle-advanced-filter-chip" onclick="app.toggleFilterCardCollapse()" title="ចុចដើម្បីបង្ហាញ ឬលាក់ផ្ទាំងតម្រងពហុកម្រិត">
            <i data-lucide="sliders-horizontal" style="width: 14px; height: 14px; color: var(--primary);"></i>
            <span id="label-advanced-filter-chip">តម្រងពហុកម្រិត</span>
            <span class="active-filter-mini-badge" id="chip-active-filter-count" style="display: none;">0</span>
            <i data-lucide="chevrons-down" id="chip-filter-chevron-icon" style="width: 13px; height: 13px; margin-left: 2px;"></i>
          </button>
        </div>
      </div>
    `;

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  togglePopover(type) {
    if (this.activePopover === type) {
      this.closeAllPopovers();
      return;
    }

    this.closeAllPopovers();
    this.activePopover = type;

    const popoverEl = document.getElementById(`pf-popover-${type}`);
    const btnEl = document.getElementById(`pf-btn-${type}`);
    if (!popoverEl || !btnEl) return;

    this.renderPopoverContent(type, popoverEl);
    popoverEl.style.display = 'block';
    btnEl.classList.add('popover-open');

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  closeAllPopovers() {
    document.querySelectorAll('.p-filter-popover').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.p-filter-btn').forEach(el => el.classList.remove('popover-open'));
    this.activePopover = null;
  }

  attachOutsideClickHandler() {
    document.addEventListener('click', (e) => {
      if (!this.activePopover) return;
      const targetWrapper = document.getElementById(`pf-wrap-${this.activePopover}`);
      if (targetWrapper && !targetWrapper.contains(e.target)) {
        this.closeAllPopovers();
      }
    });
  }

  renderPopoverContent(type, container) {
    const settings = (typeof dataStore !== 'undefined' && dataStore.getSettings) ? dataStore.getSettings() : {};
    const all = (typeof dataStore !== 'undefined' && dataStore.getStaffData) ? dataStore.getStaffData() : [];

    if (type === 'status') {
      const statusOptions = [
        { key: 'active', labelKh: '🟢 កំពុងដំណើរការ', labelEn: 'Active' },
        { key: 'pending', labelKh: '⏳ រង់ចាំ', labelEn: 'Pending' },
        { key: 'completed', labelKh: '✅ បានបញ្ចប់', labelEn: 'Completed' },
        { key: 'expired', labelKh: '⚠️ ផុតកំណត់', labelEn: 'Expired' },
        { key: 'closed', labelKh: '🔒 បិទប្រព័ន្ធ', labelEn: 'Closed' },
        { key: 'missing', labelKh: '📋 ខ្វះព័ត៌មាន', labelEn: 'Missing' }
      ];

      // Compute live counts
      const counts = {};
      all.forEach(item => {
        const s = StatusCalculator.calculateStatus(item).key;
        counts[s] = (counts[s] || 0) + 1;
      });

      const selectedStatuses = this.filters.status || [];

      container.innerHTML = `
        <div class="pf-popover-card">
          <div class="pf-popover-header">
            <span class="pf-popover-title">Filter by Status</span>
            <span class="pf-popover-sub">ជ្រើសរើសស្ថានភាព</span>
          </div>

          <div class="pf-checkbox-list">
            ${statusOptions.map(opt => {
              const isChecked = selectedStatuses.includes(opt.key);
              const count = counts[opt.key] || 0;
              return `
                <label class="pf-checkbox-item ${isChecked ? 'is-checked' : ''}">
                  <input type="checkbox" name="pf_status_item" value="${opt.key}" ${isChecked ? 'checked' : ''} onchange="persistentFilters.handleTempCheckbox(this)">
                  <span class="pf-custom-check"></span>
                  <span class="pf-item-label">${opt.labelKh} (${opt.labelEn})</span>
                  <span class="pf-item-count">${count}</span>
                </label>
              `;
            }).join('')}
          </div>

          <div class="pf-popover-actions">
            <button type="button" class="btn btn-secondary btn-sm" onclick="persistentFilters.clearPopoverSelection('status')">Reset</button>
            <button type="button" class="btn btn-primary btn-sm pf-btn-apply" onclick="persistentFilters.applyPopover('status')">Apply</button>
          </div>
        </div>
      `;
    } else if (type === 'maturity') {
      const maturityOptions = [
        { key: 'maturity_calc', label: '🎯 គណនាកាលកំណត់ (Start & End)' },
        { key: 'start_base', label: '🔘 តាមថ្ងៃចាប់ផ្តើម (Start Date Base)' },
        { key: 'alerts_only', label: '🔔 មាន Alert កាលបរិច្ឆេទ (Active Alerts)' }
      ];

      const selectedMaturity = this.filters.maturityCalc || [];

      container.innerHTML = `
        <div class="pf-popover-card">
          <div class="pf-popover-header">
            <span class="pf-popover-title">Filter by Date Calculation</span>
            <span class="pf-popover-sub">គណនាកាលកំណត់ & Alerts</span>
          </div>

          <div class="pf-checkbox-list">
            ${maturityOptions.map(opt => {
              const isChecked = selectedMaturity.includes(opt.key);
              return `
                <label class="pf-checkbox-item ${isChecked ? 'is-checked' : ''}">
                  <input type="checkbox" name="pf_maturity_item" value="${opt.key}" ${isChecked ? 'checked' : ''} onchange="persistentFilters.handleTempCheckbox(this)">
                  <span class="pf-custom-check"></span>
                  <span class="pf-item-label">${opt.label}</span>
                </label>
              `;
            }).join('')}
          </div>

          <div class="pf-popover-actions">
            <button type="button" class="btn btn-secondary btn-sm" onclick="persistentFilters.clearPopoverSelection('maturity')">Reset</button>
            <button type="button" class="btn btn-primary btn-sm pf-btn-apply" onclick="persistentFilters.applyPopover('maturity')">Apply</button>
          </div>
        </div>
      `;
    } else if (type === 'department') {
      const depts = settings.departments || [];
      const selectedDepts = this.filters.department || [];

      container.innerHTML = `
        <div class="pf-popover-card">
          <div class="pf-popover-header">
            <span class="pf-popover-title">Filter by Department</span>
            <span class="pf-popover-sub">អង្គភាព/នាយកដ្ឋាន</span>
          </div>

          <div class="pf-checkbox-list scrollable">
            ${depts.map(d => {
              const isChecked = selectedDepts.includes(d);
              return `
                <label class="pf-checkbox-item ${isChecked ? 'is-checked' : ''}">
                  <input type="checkbox" name="pf_dept_item" value="${d}" ${isChecked ? 'checked' : ''} onchange="persistentFilters.handleTempCheckbox(this)">
                  <span class="pf-custom-check"></span>
                  <span class="pf-item-label">${d}</span>
                </label>
              `;
            }).join('')}
          </div>

          <div class="pf-popover-actions">
            <button type="button" class="btn btn-secondary btn-sm" onclick="persistentFilters.clearPopoverSelection('department')">Reset</button>
            <button type="button" class="btn btn-primary btn-sm pf-btn-apply" onclick="persistentFilters.applyPopover('department')">Apply</button>
          </div>
        </div>
      `;
    } else if (type === 'position') {
      const positions = settings.positions || [];
      const selectedPos = this.filters.position || [];

      container.innerHTML = `
        <div class="pf-popover-card">
          <div class="pf-popover-header">
            <span class="pf-popover-title">Filter by Position</span>
            <span class="pf-popover-sub">តួនាទី</span>
          </div>

          <div class="pf-checkbox-list scrollable">
            ${positions.map(p => {
              const isChecked = selectedPos.includes(p);
              return `
                <label class="pf-checkbox-item ${isChecked ? 'is-checked' : ''}">
                  <input type="checkbox" name="pf_pos_item" value="${p}" ${isChecked ? 'checked' : ''} onchange="persistentFilters.handleTempCheckbox(this)">
                  <span class="pf-custom-check"></span>
                  <span class="pf-item-label">${p}</span>
                </label>
              `;
            }).join('')}
          </div>

          <div class="pf-popover-actions">
            <button type="button" class="btn btn-secondary btn-sm" onclick="persistentFilters.clearPopoverSelection('position')">Reset</button>
            <button type="button" class="btn btn-primary btn-sm pf-btn-apply" onclick="persistentFilters.applyPopover('position')">Apply</button>
          </div>
        </div>
      `;
    } else if (type === 'reason') {
      const reasons = settings.requestReasons || [];
      const selectedReasons = this.filters.requestReason || [];

      container.innerHTML = `
        <div class="pf-popover-card">
          <div class="pf-popover-header">
            <span class="pf-popover-title">Filter by Request Reason</span>
            <span class="pf-popover-sub">មូលហេតុនៃសំណើ</span>
          </div>

          <div class="pf-checkbox-list scrollable">
            ${reasons.map(r => {
              const isChecked = selectedReasons.includes(r);
              return `
                <label class="pf-checkbox-item ${isChecked ? 'is-checked' : ''}">
                  <input type="checkbox" name="pf_reason_item" value="${r}" ${isChecked ? 'checked' : ''} onchange="persistentFilters.handleTempCheckbox(this)">
                  <span class="pf-custom-check"></span>
                  <span class="pf-item-label">${r}</span>
                </label>
              `;
            }).join('')}
          </div>

          <div class="pf-popover-actions">
            <button type="button" class="btn btn-secondary btn-sm" onclick="persistentFilters.clearPopoverSelection('reason')">Reset</button>
            <button type="button" class="btn btn-primary btn-sm pf-btn-apply" onclick="persistentFilters.applyPopover('reason')">Apply</button>
          </div>
        </div>
      `;
    }
  }

  handleTempCheckbox(input) {
    const parent = input.closest('.pf-checkbox-item');
    if (parent) {
      parent.classList.toggle('is-checked', input.checked);
    }
  }

  applyPopover(type) {
    if (type === 'status') {
      const checked = Array.from(document.querySelectorAll('input[name="pf_status_item"]:checked')).map(i => i.value);
      this.filters.status = checked;
    } else if (type === 'maturity') {
      const checked = Array.from(document.querySelectorAll('input[name="pf_maturity_item"]:checked')).map(i => i.value);
      this.filters.maturityCalc = checked;
    } else if (type === 'department') {
      const checked = Array.from(document.querySelectorAll('input[name="pf_dept_item"]:checked')).map(i => i.value);
      this.filters.department = checked;
    } else if (type === 'position') {
      const checked = Array.from(document.querySelectorAll('input[name="pf_pos_item"]:checked')).map(i => i.value);
      this.filters.position = checked;
    } else if (type === 'reason') {
      const checked = Array.from(document.querySelectorAll('input[name="pf_reason_item"]:checked')).map(i => i.value);
      this.filters.requestReason = checked;
    }

    this.closeAllPopovers();
    this.saveFilters();
  }

  clearPopoverSelection(type) {
    if (type === 'status') {
      this.filters.status = [];
    } else if (type === 'maturity') {
      this.filters.maturityCalc = [];
    } else if (type === 'department') {
      this.filters.department = [];
    } else if (type === 'position') {
      this.filters.position = [];
    } else if (type === 'reason') {
      this.filters.requestReason = [];
    }

    this.closeAllPopovers();
    this.saveFilters();
  }

  clearAllFilters() {
    this.filters = {
      status: [],
      maturityCalc: [],
      department: [],
      office: [],
      position: [],
      annualPeriod: [],
      requestReason: [],
      dateFrom: '',
      dateTo: ''
    };
    this.closeAllPopovers();
    this.saveFilters();
  }

  updateFilterButtonsUI() {
    // 1. Status Button UI
    const statusBtn = document.getElementById('pf-btn-status');
    const statusLabel = document.getElementById('pf-label-status');
    if (statusBtn && statusLabel) {
      const count = (this.filters.status || []).length;
      if (count > 0) {
        statusBtn.classList.add('is-active-filter');
        const statusMap = {
          active: 'Active',
          pending: 'Pending',
          completed: 'Completed',
          expired: 'Expired',
          closed: 'Closed',
          missing: 'Missing'
        };
        const names = this.filters.status.map(k => statusMap[k] || k).join(', ');
        statusLabel.textContent = `Status • ${names} (${count})`;
      } else {
        statusBtn.classList.remove('is-active-filter');
        statusLabel.textContent = 'ស្ថានភាព (Status)';
      }
    }

    // 2. Maturity Button UI
    const matBtn = document.getElementById('pf-btn-maturity');
    const matLabel = document.getElementById('pf-label-maturity');
    if (matBtn && matLabel) {
      const count = (this.filters.maturityCalc || []).length;
      if (count > 0) {
        matBtn.classList.add('is-active-filter');
        matLabel.textContent = `គណនាកាលកំណត់ (${count})`;
      } else {
        matBtn.classList.remove('is-active-filter');
        matLabel.textContent = 'គណនាកាលកំណត់';
      }
    }

    // 3. Department Button UI
    const deptBtn = document.getElementById('pf-btn-department');
    const deptLabel = document.getElementById('pf-label-department');
    if (deptBtn && deptLabel) {
      const count = (this.filters.department || []).length;
      if (count > 0) {
        deptBtn.classList.add('is-active-filter');
        deptLabel.textContent = `អង្គភាព (${count})`;
      } else {
        deptBtn.classList.remove('is-active-filter');
        deptLabel.textContent = 'អង្គភាព (Department)';
      }
    }

    // 4. Position Button UI
    const posBtn = document.getElementById('pf-btn-position');
    const posLabel = document.getElementById('pf-label-position');
    if (posBtn && posLabel) {
      const count = (this.filters.position || []).length;
      if (count > 0) {
        posBtn.classList.add('is-active-filter');
        posLabel.textContent = `តួនាទី (${count})`;
      } else {
        posBtn.classList.remove('is-active-filter');
        posLabel.textContent = 'តួនាទី (Position)';
      }
    }

    // 5. Reason Button UI
    const reasonBtn = document.getElementById('pf-btn-reason');
    const reasonLabel = document.getElementById('pf-label-reason');
    if (reasonBtn && reasonLabel) {
      const count = (this.filters.requestReason || []).length;
      if (count > 0) {
        reasonBtn.classList.add('is-active-filter');
        reasonLabel.textContent = `មូលហេតុ (${count})`;
      } else {
        reasonBtn.classList.remove('is-active-filter');
        reasonLabel.textContent = 'មូលហេតុនៃសំណើ';
      }
    }

    // Show/Hide Clear All button
    const hasAnyActive = (this.filters.status && this.filters.status.length > 0) ||
      (this.filters.maturityCalc && this.filters.maturityCalc.length > 0) ||
      (this.filters.department && this.filters.department.length > 0) ||
      (this.filters.position && this.filters.position.length > 0) ||
      (this.filters.requestReason && this.filters.requestReason.length > 0);

    const clearBtn = document.getElementById('pf-btn-clear-all');
    if (clearBtn) {
      clearBtn.style.display = hasAnyActive ? 'inline-flex' : 'none';
    }

    // Update mini badge
    const badge = document.getElementById('chip-active-filter-count');
    let totalFilters = 0;
    ['status', 'maturityCalc', 'department', 'position', 'requestReason'].forEach(k => {
      if (this.filters[k] && this.filters[k].length > 0) totalFilters += this.filters[k].length;
    });
    if (badge) {
      badge.textContent = totalFilters;
      badge.style.display = totalFilters > 0 ? 'inline-block' : 'none';
    }
  }

  matches(item) {
    const settings = (typeof dataStore !== 'undefined' && dataStore.getSettings) ? dataStore.getSettings() : {};
    const statusObj = StatusCalculator.calculateStatus(item);
    const alerts = StatusCalculator.calculateAlerts(item, settings);

    // 1. Status Filter
    if (this.filters.status && this.filters.status.length > 0) {
      if (!this.filters.status.includes(statusObj.key)) {
        return false;
      }
    }

    // 2. Maturity & Date Calc Filter
    if (this.filters.maturityCalc && this.filters.maturityCalc.length > 0) {
      let matchedMat = false;
      if (this.filters.maturityCalc.includes('maturity_calc')) {
        const hasDateCalc = (item.maturityBase === 'startDate') || (alerts && (alerts.startDateAlert || alerts.endDateAlert));
        if (hasDateCalc) matchedMat = true;
      }
      if (this.filters.maturityCalc.includes('start_base')) {
        if (item.maturityBase === 'startDate') matchedMat = true;
      }
      if (this.filters.maturityCalc.includes('alerts_only')) {
        if (alerts && alerts.hasAlert) matchedMat = true;
      }
      if (!matchedMat) return false;
    }

    // 3. Department Filter
    if (this.filters.department && this.filters.department.length > 0) {
      const dept = (item.department || '').trim();
      if (!this.filters.department.includes(dept)) {
        return false;
      }
    }

    // 4. Position Filter
    if (this.filters.position && this.filters.position.length > 0) {
      const pos = (item.position || '').trim();
      if (!this.filters.position.includes(pos)) {
        return false;
      }
    }

    // 5. Request Reason Filter
    if (this.filters.requestReason && this.filters.requestReason.length > 0) {
      const reason = (item.requestReason || '').trim();
      const match = this.filters.requestReason.some(r => reason === r || reason.includes(r));
      if (!match) return false;
    }

    return true;
  }
}

const persistentFilters = new PersistentFilterManager();
