/**
 * Staff System Control - Clean Single Select Filter Engine
 * Replaced multi-select tick box panels with clean, native <select> filter dropdowns
 */

class MultiFilterEngine {
  constructor() {
    this.selected = {
      department: [],
      office: [],
      position: [],
      annualPeriod: [],
      requestReason: [],
      status: [],
      gender: [],
      prakasNo: '',
      requestDate: '',
      endDate: ''
    };

    // Column-specific header filters
    this.columnFilters = {};
  }

  init() {
    this.renderAllHubDroplists();
  }

  /**
   * Render All Clean Select Dropdowns in the Filter Hub (No Tick Boxes)
   */
  renderAllHubDroplists() {
    const settings = typeof dataStore !== 'undefined' ? dataStore.getSettings() : {};

    const statusOptions = [
      { value: 'active', label: '🟢 កំពុងដំណើរការ (Active)' },
      { value: 'pending', label: '⏳ រង់ចាំដំណើរការ (Pending)' },
      { value: 'completed', label: '✅ បានបញ្ចប់ (Completed)' },
      { value: 'expired', label: '⚠️ ផុតសុពលភាព (Expired)' },
      { value: 'closed', label: '🔒 បានបិទប្រព័ន្ធ (Closed)' },
      { value: 'missing', label: '📋 ខ្វះព័ត៌មាន (Missing)' }
    ];

    this.renderSelectComponent('department', 'filter-dept-container', settings.departments || [], 'building', '#3b82f6', 'អង្គភាព', 'Department');
    this.renderSelectComponent('office', 'filter-office-container', settings.offices || [], 'door-open', '#06b6d4', 'ការិយាល័យ', 'Office');
    this.renderSelectComponent('position', 'filter-position-container', settings.positions || [], 'briefcase', '#f59e0b', 'តួនាទី', 'Position');
    this.renderSelectComponent('annualPeriod', 'filter-annual-container', settings.annualPeriods || [], 'calendar', '#10b981', 'ប្រចាំឆ្នាំ', 'Annual Year');
    this.renderSelectComponent('requestReason', 'filter-reason-container', settings.requestReasons || [], 'file-question', '#8b5cf6', 'មូលហេតុសំណើ', 'Reason');
    this.renderSelectComponent('status', 'filter-status-container', statusOptions, 'activity', '#e11d48', 'ស្ថានភាព', 'Status');

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  /**
   * Render a Single Clean Select Filter Dropdown
   */
  renderSelectComponent(key, containerId, options, icon, color, labelKh, labelEn) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const currentVal = Array.isArray(this.selected[key]) ? (this.selected[key][0] || '') : (this.selected[key] || '');

    container.innerHTML = `
      <div class="filter-input-card" id="fms-wrap-${key}">
        <label class="filter-input-label" for="filter-select-${key}">
          <i data-lucide="${icon}" style="color: ${color};"></i>
          <span>${labelKh} (${labelEn})</span>
        </label>
        
        <select class="filter-select-control" id="filter-select-${key}" onchange="multiFilter.handleSelectChange('${key}', this.value)">
          <option value="">-- ទាំងអស់ (All ${labelKh}) --</option>
          ${options.map(opt => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const label = typeof opt === 'object' ? opt.label : opt;
            const isSel = currentVal === val;
            return `<option value="${val}" ${isSel ? 'selected' : ''}>${label}</option>`;
          }).join('')}
        </select>
      </div>
    `;
  }

  handleSelectChange(key, value) {
    if (value && value.trim()) {
      this.selected[key] = [value.trim()];
    } else {
      this.selected[key] = [];
    }

    if (typeof app !== 'undefined') {
      app.currentPage = 1;
      app.updateActiveFiltersCounter();
      app.renderStaffTable();
      app.renderDocumentTimeline();
    }
  }

  clearFilter(key) {
    this.selected[key] = [];
    const select = document.getElementById(`filter-select-${key}`);
    if (select) select.value = '';
    
    if (typeof app !== 'undefined') {
      app.currentPage = 1;
      app.updateActiveFiltersCounter();
      app.renderStaffTable();
      app.renderDocumentTimeline();
    }
  }

  /**
   * Check if a Record matches all filters
   */
  matches(record) {
    const s = this.selected;
    const statusObj = typeof StatusCalculator !== 'undefined' ? StatusCalculator.calculateStatus(record) : { key: 'active', labelKh: 'Active' };

    // 1. Department
    if (s.department && s.department.length > 0) {
      if (!s.department.includes(record.department)) return false;
    }

    // 2. Office
    if (s.office && s.office.length > 0) {
      if (!s.office.includes(record.office)) return false;
    }

    // 3. Position
    if (s.position && s.position.length > 0) {
      if (!s.position.includes(record.position)) return false;
    }

    // 4. Annual Period
    if (s.annualPeriod && s.annualPeriod.length > 0) {
      if (!s.annualPeriod.includes(String(record.annualPeriod))) return false;
    }

    // 5. Request Reason
    if (s.requestReason && s.requestReason.length > 0) {
      if (!s.requestReason.includes(record.requestReason)) return false;
    }

    // 6. Status
    if (s.status && s.status.length > 0) {
      if (!s.status.includes(statusObj.key)) return false;
    }

    // 7. Gender
    if (s.gender && s.gender.length > 0) {
      if (!s.gender.includes(record.gender)) return false;
    }

    // 8. Prakas No
    if (s.prakasNo && s.prakasNo.trim()) {
      const itemPrakas = (record.prakasNo || '').toLowerCase();
      if (!itemPrakas.includes(s.prakasNo.toLowerCase().trim())) return false;
    }

    // 9. Request Date
    if (s.requestDate && record.requestDate !== s.requestDate) return false;

    // 10. End Date
    if (s.endDate && record.endDate !== s.endDate) return false;

    return true;
  }

  /**
   * Reset All Filters
   */
  resetAll() {
    this.selected = {
      department: [],
      office: [],
      position: [],
      annualPeriod: [],
      requestReason: [],
      status: [],
      gender: [],
      prakasNo: '',
      requestDate: '',
      endDate: ''
    };
    this.columnFilters = {};
    this.renderAllHubDroplists();
  }

  /**
   * Get Total Active Filter Count
   */
  getActiveCount() {
    let count = 0;
    if (this.selected.department && this.selected.department.length > 0) count++;
    if (this.selected.office && this.selected.office.length > 0) count++;
    if (this.selected.position && this.selected.position.length > 0) count++;
    if (this.selected.annualPeriod && this.selected.annualPeriod.length > 0) count++;
    if (this.selected.requestReason && this.selected.requestReason.length > 0) count++;
    if (this.selected.status && this.selected.status.length > 0) count++;
    if (this.selected.gender && this.selected.gender.length > 0) count++;
    if (this.selected.prakasNo && this.selected.prakasNo.trim()) count++;
    if (this.selected.requestDate) count++;
    if (this.selected.endDate) count++;
    return count;
  }
}

// Global Instance
const multiFilter = new MultiFilterEngine();
