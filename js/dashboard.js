/**
 * Staff System Control - Dashboard Analytics & Multi-Chart Engine
 * Implements Progress Bars, Chart.js Views, Date Alerts, Staff Types, and Recent Activities
 */

class DashboardController {
  constructor() {
    this.chartInstances = {};
    this.viewModes = {
      department: 'progress',
      staffType: 'progress',
      office: 'progress',
      position: 'progress',
      reason: 'progress',
      alerts: 'progress',
      statusGender: 'chart'
    };
    this.cardFilters = {
      department: 'all',
      staffType: 'all',
      office: 'all',
      position: 'all',
      reason: 'all',
      alerts: 'all',
      activity: 'all'
    };
    this.globalFilters = {
      department: 'all',
      year: 'all',
      status: 'all'
    };
  }

  /**
   * Refresh all KPI metrics, progress bars, and charts
   */
  refresh() {
    if (typeof dataStore === 'undefined') return;

    this.populateGlobalFilterDropdowns();
    const filteredData = this.getFilteredData();

    this.updateMetricCards(filteredData);
    this.renderDepartmentStats(filteredData);
    this.renderStaffTypeStats(filteredData);
    this.renderOfficeStats(filteredData);
    this.renderPositionStats(filteredData);
    this.renderReasonStats(filteredData);
    this.renderDateAlertStats(filteredData);
    this.renderRecentActivities();
    this.renderStatusGenderCharts(filteredData);
    this.syncMasterToggleButtons();

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  /**
   * Populate global dashboard filter dropdowns dynamically
   */
  populateGlobalFilterDropdowns() {
    const allData = dataStore.getStaffData() || [];
    const settings = dataStore.getSettings() || {};

    // 1. Department dropdown
    const deptSelect = document.getElementById('dash-filter-dept');
    if (deptSelect && deptSelect.options.length <= 1) {
      const depts = settings.departments || [];
      const currentVal = this.globalFilters.department;
      deptSelect.innerHTML = '<option value="all">🏢 គ្រប់អង្គភាព (All Departments)</option>' +
        depts.map(d => `<option value="${d}" ${d === currentVal ? 'selected' : ''}>${d}</option>`).join('');
    }

    // 2. Year dropdown
    const yearSelect = document.getElementById('dash-filter-year');
    if (yearSelect && yearSelect.options.length <= 1) {
      const yearsSet = new Set(settings.annualPeriods || ['2024', '2025', '2026', '2027']);
      allData.forEach(item => {
        if (item.annualPeriod) yearsSet.add(item.annualPeriod);
        if (item.startDate) yearsSet.add(item.startDate.slice(0, 4));
      });
      const sortedYears = Array.from(yearsSet).sort().reverse();
      const currentYear = this.globalFilters.year;
      yearSelect.innerHTML = '<option value="all">📅 គ្រប់ឆ្នាំ (All Years)</option>' +
        sortedYears.map(y => `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`).join('');
    }
  }

  /**
   * Filter dataset based on global toolbar filters
   */
  getFilteredData() {
    let data = dataStore.getStaffData() || [];

    const deptEl = document.getElementById('dash-filter-dept');
    const yearEl = document.getElementById('dash-filter-year');
    const statusEl = document.getElementById('dash-filter-status');

    const deptVal = (deptEl && deptEl.value) ? deptEl.value : (this.globalFilters.department || 'all');
    const yearVal = (yearEl && yearEl.value) ? yearEl.value : (this.globalFilters.year || 'all');
    const statusVal = (statusEl && statusEl.value) ? statusEl.value : (this.globalFilters.status || 'all');

    if (deptVal && deptVal !== 'all') {
      data = data.filter(item => item.department === deptVal);
    }

    if (yearVal && yearVal !== 'all') {
      data = data.filter(item => {
        const y = item.annualPeriod || (item.startDate ? item.startDate.slice(0, 4) : '');
        return String(y) === String(yearVal);
      });
    }

    if (statusVal && statusVal !== 'all') {
      data = data.filter(item => {
        const s = StatusCalculator.calculateStatus(item).key;
        return s === statusVal;
      });
    }

    return data;
  }

  handleGlobalFilterChange() {
    const deptEl = document.getElementById('dash-filter-dept');
    const yearEl = document.getElementById('dash-filter-year');
    const statusEl = document.getElementById('dash-filter-status');

    this.globalFilters.department = deptEl ? deptEl.value : 'all';
    this.globalFilters.year = yearEl ? yearEl.value : 'all';
    this.globalFilters.status = statusEl ? statusEl.value : 'all';

    this.refresh();
  }

  resetGlobalFilters() {
    this.globalFilters = { department: 'all', year: 'all', status: 'all' };

    const deptEl = document.getElementById('dash-filter-dept');
    const yearEl = document.getElementById('dash-filter-year');
    const statusEl = document.getElementById('dash-filter-status');

    if (deptEl) deptEl.value = 'all';
    if (yearEl) yearEl.value = 'all';
    if (statusEl) statusEl.value = 'all';

    this.refresh();
  }

  handleCardFilterChange(dimension, filterValue) {
    this.cardFilters[dimension] = filterValue;
    const data = this.getFilteredData();

    if (dimension === 'department') this.renderDepartmentStats(data);
    else if (dimension === 'staffType') this.renderStaffTypeStats(data);
    else if (dimension === 'office') this.renderOfficeStats(data);
    else if (dimension === 'position') this.renderPositionStats(data);
    else if (dimension === 'reason') this.renderReasonStats(data);
    else if (dimension === 'alerts') this.renderDateAlertStats(data);
    else if (dimension === 'activity') this.renderRecentActivities();
  }

  toggleViewMode(dimension) {
    const currentMode = this.viewModes[dimension] || 'progress';
    const newMode = currentMode === 'progress' ? 'chart' : 'progress';
    this.viewModes[dimension] = newMode;

    const btnText = document.getElementById(`btn-text-mode-${dimension}`);
    if (btnText) {
      btnText.textContent = newMode === 'progress' ? 'ក្រាហ្វិក (Chart)' : 'បញ្ជីរបារ (Bars)';
    }

    this.syncMasterToggleButtons();

    const data = this.getFilteredData();
    if (dimension === 'department') this.renderDepartmentStats(data);
    else if (dimension === 'staffType') this.renderStaffTypeStats(data);
    else if (dimension === 'office') this.renderOfficeStats(data);
    else if (dimension === 'position') this.renderPositionStats(data);
    else if (dimension === 'reason') this.renderReasonStats(data);
    else if (dimension === 'alerts') this.renderDateAlertStats(data);
  }

  /**
   * Global 1-Click Toggle / Switch All Dashboard Cards to Bars or Charts
   */
  setAllViewModes(targetMode) {
    const dimensions = ['department', 'staffType', 'office', 'position', 'reason', 'alerts'];
    dimensions.forEach(dim => {
      this.viewModes[dim] = targetMode;
      const btnText = document.getElementById(`btn-text-mode-${dim}`);
      if (btnText) {
        btnText.textContent = targetMode === 'progress' ? 'ក្រាហ្វិក (Chart)' : 'បញ្ជីរបារ (Bars)';
      }
    });

    this.syncMasterToggleButtons();

    const data = this.getFilteredData();
    this.renderDepartmentStats(data);
    this.renderStaffTypeStats(data);
    this.renderOfficeStats(data);
    this.renderPositionStats(data);
    this.renderReasonStats(data);
    this.renderDateAlertStats(data);

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }

    if (typeof app !== 'undefined' && app.showToast) {
      const modeKh = targetMode === 'progress' ? '📊 បញ្ជីរបារ (Progress Bars)' : '📈 ក្រាហ្វិក (Charts)';
      app.showToast(`✨ បានប្តូរផ្ទាំងស្ថិតិទាំងអស់ទៅជា៖ ${modeKh}!`, 'success');
    }
  }

  toggleAllViewModes() {
    const dimensions = ['department', 'staffType', 'office', 'position', 'reason', 'alerts'];
    let chartCount = 0;
    dimensions.forEach(dim => {
      if (this.viewModes[dim] === 'chart') chartCount++;
    });
    const targetMode = chartCount >= 3 ? 'progress' : 'chart';
    this.setAllViewModes(targetMode);
  }

  syncMasterToggleButtons() {
    const dimensions = ['department', 'staffType', 'office', 'position', 'reason', 'alerts'];
    let chartCount = 0;
    let progressCount = 0;
    dimensions.forEach(dim => {
      if (this.viewModes[dim] === 'chart') chartCount++;
      else progressCount++;
    });

    const btnBars = document.getElementById('btn-dash-all-bars');
    const btnCharts = document.getElementById('btn-dash-all-charts');
    const toggleText = document.getElementById('btn-dash-toggle-all-text');

    if (btnBars) btnBars.classList.toggle('active', chartCount === 0);
    if (btnCharts) btnCharts.classList.toggle('active', progressCount === 0);

    if (toggleText) {
      toggleText.textContent = chartCount >= 3 ? 'ប្តូរទៅរបារទាំងអស់ (To Bars)' : 'ប្តូរទៅក្រាហ្វទាំងអស់ (To Charts)';
    }
  }

  /**
   * 1-Click Interactive Drill-down Filter to Master Database
   */
  handleFilterClick(dimension, value) {
    if (typeof app === 'undefined') return;

    app.switchTab('database');

    setTimeout(() => {
      if (typeof multiFilter !== 'undefined') {
        if (dimension === 'department') {
          multiFilter.clearAllFilters();
          multiFilter.setCheckboxValue('department', value, true);
        } else if (dimension === 'office') {
          multiFilter.clearAllFilters();
          multiFilter.setCheckboxValue('office', value, true);
        } else if (dimension === 'position') {
          multiFilter.clearAllFilters();
          multiFilter.setCheckboxValue('position', value, true);
        } else if (dimension === 'reason') {
          multiFilter.clearAllFilters();
          multiFilter.setCheckboxValue('requestReason', value, true);
        } else if (dimension === 'staffType') {
          const searchInput = document.getElementById('search-input');
          if (searchInput) {
            searchInput.value = value.split(' ')[0];
            app.handleSearch(searchInput.value);
          }
        } else if (dimension === 'alerts') {
          if (typeof app.toggleAlertOnlyFilter === 'function') {
            app.toggleAlertOnlyFilter();
          }
        }
      }
      app.showToast(`🎯 បានច្រោះទិន្នន័យតាម៖ ${value}`, 'info');
    }, 100);
  }

  filterMasterByStatus(statusKey) {
    if (typeof app === 'undefined') return;
    app.switchTab('database');

    setTimeout(() => {
      if (statusKey === 'all') {
        app.handleStatusChipFilter('all');
      } else {
        app.handleStatusChipFilter(statusKey);
      }
    }, 100);
  }

  updateMetricCards(data) {
    const allData = dataStore.getStaffData() || [];
    let total = allData.length;
    let active = 0, pending = 0, completed = 0, expired = 0, closed = 0, missing = 0;

    allData.forEach(item => {
      const status = StatusCalculator.calculateStatus(item).key;
      if (status === 'active') active++;
      else if (status === 'pending') pending++;
      else if (status === 'completed') completed++;
      else if (status === 'expired') expired++;
      else if (status === 'closed') closed++;
      else if (status === 'missing') missing++;
    });

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setVal('metric-total-staff', total);
    setVal('metric-active-staff', active);
    setVal('metric-pending-records', pending);
    setVal('metric-completed-records', completed);
    setVal('metric-expired-records', expired);
    setVal('metric-closed-records', closed);
    setVal('metric-missing-records', missing);
  }

  /* ---------------- 1. DEPARTMENT STATISTICS (MATCHING PICTURE 2) ---------------- */
  renderDepartmentStats(data) {
    const container = document.getElementById('dept-stats-container');
    const wrap = document.getElementById('dept-chart-canvas-wrap');
    if (!container) return;

    const isProgress = this.viewModes.department === 'progress';
    container.style.display = isProgress ? 'flex' : 'none';
    if (wrap) wrap.style.display = isProgress ? 'none' : 'block';

    const counts = {};
    data.forEach(item => {
      const d = item.department || 'មិនបានបញ្ជាក់ (Unassigned)';
      counts[d] = (counts[d] || 0) + 1;
    });

    let entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const filter = this.cardFilters.department;
    if (filter === 'top5') entries = entries.slice(0, 5);
    else if (filter === 'top10') entries = entries.slice(0, 10);

    const total = data.length || 1;
    const colors = ['#2563eb', '#059669', '#ea580c', '#9333ea', '#3b82f6', '#d97706', '#06b6d4', '#ec4899'];

    if (entries.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--text-muted); font-size: 0.85rem;">គ្មានទិន្នន័យអង្គភាព</div>';
    } else {
      container.innerHTML = entries.map(([dept, count], idx) => {
        const pct = Math.round((count / total) * 100);
        const color = colors[idx % colors.length];
        return `
          <div class="stat-progress-item" onclick="dashboardController.handleFilterClick('department', '${dept.replace(/'/g, "\\'")}')" title="ចុចដើម្បីច្រោះទិន្នន័យ៖ ${dept}">
            <div class="stat-progress-header">
              <div class="stat-progress-label">${dept}</div>
              <div class="stat-progress-meta">${count} នាក់ (${pct}%)</div>
            </div>
            <div class="stat-progress-track">
              <div class="stat-progress-fill" style="width: ${pct}%; background: ${color};"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    if (!isProgress) {
      this.createOrUpdateChart('chart-department', {
        type: 'bar',
        data: {
          labels: entries.map(e => e[0]),
          datasets: [{
            label: 'ចំនួនបុគ្គលិក (Staff Count)',
            data: entries.map(e => e[1]),
            backgroundColor: entries.map((_, idx) => colors[idx % colors.length]),
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } },
            x: { ticks: { maxRotation: 45, minRotation: 0 } }
          }
        }
      });
    }
  }

  /* ---------------- 2. STAFF TYPE STATISTICS (MATCHING PICTURE 2) ---------------- */
  renderStaffTypeStats(data) {
    const container = document.getElementById('staff-type-stats-container');
    const wrap = document.getElementById('staff-type-chart-canvas-wrap');
    if (!container) return;

    const isProgress = this.viewModes.staffType === 'progress';
    container.style.display = isProgress ? 'flex' : 'none';
    if (wrap) wrap.style.display = isProgress ? 'none' : 'block';

    let civilServant = 0;
    let contractStaff = 0;
    let internStaff = 0;
    let floatingStaff = 0;

    let targetData = data;
    if (this.cardFilters.staffType === 'active_only') {
      targetData = data.filter(item => StatusCalculator.calculateStatus(item).key === 'active');
    }

    targetData.forEach(item => {
      const type = item.staffType || '';
      const pos = item.position || '';
      const rem = item.remark || '';

      if (type.includes('កិច្ចសន្យា') || pos.includes('កិច្ចសន្យា') || rem.includes('កិច្ចសន្យា') || type.includes('Contract')) {
        contractStaff++;
      } else if (type.includes('កម្មសិក្សា') || pos.includes('កម្មសិក្សា') || type.includes('Intern')) {
        internStaff++;
      } else if (type.includes('អណ្តែត') || pos.includes('អណ្តែត') || type.includes('Floating')) {
        floatingStaff++;
      } else {
        civilServant++;
      }
    });

    const entries = [
      { label: 'មន្ត្រីក្របខណ្ឌ (Civil Servant)', count: civilServant, color: '#1d4ed8' },
      { label: 'មន្ត្រីជាប់កិច្ចសន្យា (Contract Staff)', count: contractStaff, color: '#0d9488' },
      { label: 'មន្ត្រីកម្មសិក្សា (Intern / Probationary)', count: internStaff, color: '#f59e0b' },
      { label: 'មន្ត្រីអណ្តែត (Floating Officer)', count: floatingStaff, color: '#8b5cf6' }
    ].filter(e => e.count > 0 || e.label.includes('Civil') || e.label.includes('Contract'));

    const total = (civilServant + contractStaff + internStaff + floatingStaff) || 1;

    container.innerHTML = entries.map(item => {
      const pct = Math.round((item.count / total) * 100);
      return `
        <div class="stat-progress-item" onclick="dashboardController.handleFilterClick('staffType', '${item.label.replace(/'/g, "\\'")}')" title="ចុចដើម្បីច្រោះទិន្នន័យ៖ ${item.label}">
          <div class="stat-progress-header">
            <div class="stat-progress-label">${item.label}</div>
            <div class="stat-progress-meta">${item.count} នាក់ (${pct}%)</div>
          </div>
          <div class="stat-progress-track">
            <div class="stat-progress-fill" style="width: ${pct}%; background: ${item.color};"></div>
          </div>
        </div>
      `;
    }).join('');

    if (!isProgress) {
      this.createOrUpdateChart('chart-staff-type', {
        type: 'doughnut',
        data: {
          labels: entries.map(e => e.label),
          datasets: [{
            data: entries.map(e => e.count),
            backgroundColor: entries.map(e => e.color),
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } }
        }
      });
    }
  }

  /* ---------------- 3. OFFICE STATISTICS ---------------- */
  renderOfficeStats(data) {
    const container = document.getElementById('office-stats-container');
    const wrap = document.getElementById('office-chart-canvas-wrap');
    if (!container) return;

    const isProgress = this.viewModes.office === 'progress';
    container.style.display = isProgress ? 'flex' : 'none';
    if (wrap) wrap.style.display = isProgress ? 'none' : 'block';

    const counts = {};
    data.forEach(item => {
      const o = item.office || 'មិនបានបញ្ជាក់ (Unassigned)';
      counts[o] = (counts[o] || 0) + 1;
    });

    let entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const filter = this.cardFilters.office;
    if (filter === 'top5') entries = entries.slice(0, 5);
    else if (filter === 'top10') entries = entries.slice(0, 10);

    const total = data.length || 1;
    const colors = ['#0284c7', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#6366f1'];

    if (entries.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--text-muted); font-size: 0.85rem;">គ្មានទិន្នន័យការិយាល័យ</div>';
    } else {
      container.innerHTML = entries.map(([office, count], idx) => {
        const pct = Math.round((count / total) * 100);
        const color = colors[idx % colors.length];
        return `
          <div class="stat-progress-item" onclick="dashboardController.handleFilterClick('office', '${office.replace(/'/g, "\\'")}')" title="ចុចដើម្បីច្រោះទិន្នន័យ៖ ${office}">
            <div class="stat-progress-header">
              <div class="stat-progress-label">${office}</div>
              <div class="stat-progress-meta">${count} នាក់ (${pct}%)</div>
            </div>
            <div class="stat-progress-track">
              <div class="stat-progress-fill" style="width: ${pct}%; background: ${color};"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    if (!isProgress) {
      this.createOrUpdateChart('chart-office', {
        type: 'bar',
        data: {
          labels: entries.map(e => e[0]),
          datasets: [{
            label: 'ចំនួនបុគ្គលិក',
            data: entries.map(e => e[1]),
            backgroundColor: entries.map((_, idx) => colors[idx % colors.length]),
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } },
            x: { ticks: { maxRotation: 45, minRotation: 0 } }
          }
        }
      });
    }
  }

  /* ---------------- 4. POSITION STATISTICS ---------------- */
  renderPositionStats(data) {
    const container = document.getElementById('position-stats-container');
    const wrap = document.getElementById('position-chart-canvas-wrap');
    if (!container) return;

    const isProgress = this.viewModes.position === 'progress';
    container.style.display = isProgress ? 'flex' : 'none';
    if (wrap) wrap.style.display = isProgress ? 'none' : 'block';

    const counts = {};
    data.forEach(item => {
      const p = item.position || 'មិនបានបញ្ជាក់ (Unassigned)';
      counts[p] = (counts[p] || 0) + 1;
    });

    let entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const filter = this.cardFilters.position;
    if (filter === 'top5') entries = entries.slice(0, 5);
    else if (filter === 'top10') entries = entries.slice(0, 10);

    const total = data.length || 1;
    const colors = ['#3b82f6', '#14b8a6', '#f59e0b', '#a855f7', '#06b6d4', '#e11d48'];

    if (entries.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--text-muted); font-size: 0.85rem;">គ្មានទិន្នន័យមុខតំណែង</div>';
    } else {
      container.innerHTML = entries.map(([pos, count], idx) => {
        const pct = Math.round((count / total) * 100);
        const color = colors[idx % colors.length];
        return `
          <div class="stat-progress-item" onclick="dashboardController.handleFilterClick('position', '${pos.replace(/'/g, "\\'")}')" title="ចុចដើម្បីច្រោះទិន្នន័យ៖ ${pos}">
            <div class="stat-progress-header">
              <div class="stat-progress-label">${pos}</div>
              <div class="stat-progress-meta">${count} នាក់ (${pct}%)</div>
            </div>
            <div class="stat-progress-track">
              <div class="stat-progress-fill" style="width: ${pct}%; background: ${color};"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    if (!isProgress) {
      this.createOrUpdateChart('chart-position', {
        type: 'bar',
        data: {
          labels: entries.map(e => e[0]),
          datasets: [{
            label: 'ចំនួនបុគ្គលិក',
            data: entries.map(e => e[1]),
            backgroundColor: entries.map((_, idx) => colors[idx % colors.length]),
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } },
            x: { ticks: { maxRotation: 45, minRotation: 0 } }
          }
        }
      });
    }
  }

  /* ---------------- 5. REQUEST REASONS STATISTICS ---------------- */
  renderReasonStats(data) {
    const container = document.getElementById('reason-stats-container');
    const wrap = document.getElementById('reason-chart-canvas-wrap');
    if (!container) return;

    const isProgress = this.viewModes.reason === 'progress';
    container.style.display = isProgress ? 'flex' : 'none';
    if (wrap) wrap.style.display = isProgress ? 'none' : 'block';

    const counts = {};
    data.forEach(item => {
      const r = item.requestReason || 'មិនបានបញ្ជាក់ (Unassigned)';
      counts[r] = (counts[r] || 0) + 1;
    });

    let entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const filter = this.cardFilters.reason;
    if (filter === 'top5') entries = entries.slice(0, 5);
    else if (filter === 'top10') entries = entries.slice(0, 10);

    const total = data.length || 1;
    const colors = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#0891b2', '#7c3aed'];

    if (entries.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--text-muted); font-size: 0.85rem;">គ្មានទិន្នន័យមូលហេតុសំណើ</div>';
    } else {
      container.innerHTML = entries.map(([reason, count], idx) => {
        const pct = Math.round((count / total) * 100);
        const color = colors[idx % colors.length];
        return `
          <div class="stat-progress-item" onclick="dashboardController.handleFilterClick('reason', '${reason.replace(/'/g, "\\'")}')" title="ចុចដើម្បីច្រោះទិន្នន័យ៖ ${reason}">
            <div class="stat-progress-header">
              <div class="stat-progress-label">${reason}</div>
              <div class="stat-progress-meta">${count} នាក់ (${pct}%)</div>
            </div>
            <div class="stat-progress-track">
              <div class="stat-progress-fill" style="width: ${pct}%; background: ${color};"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    if (!isProgress) {
      this.createOrUpdateChart('chart-reason', {
        type: 'bar',
        data: {
          labels: entries.map(e => e[0]),
          datasets: [{
            label: 'ចំនួនសំណើ',
            data: entries.map(e => e[1]),
            backgroundColor: entries.map((_, idx) => colors[idx % colors.length]),
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } },
            x: { ticks: { maxRotation: 45, minRotation: 0 } }
          }
        }
      });
    }
  }

  /* ---------------- 6. DATE ALERT OPTIONS STATISTICS ---------------- */
  renderDateAlertStats(data) {
    const container = document.getElementById('alert-stats-container');
    const wrap = document.getElementById('alert-chart-canvas-wrap');
    if (!container) return;

    const isProgress = this.viewModes.alerts === 'progress';
    container.style.display = isProgress ? 'flex' : 'none';
    if (wrap) wrap.style.display = isProgress ? 'none' : 'block';

    let urgent = 0;   // <= 15 days
    let warning = 0;  // <= 30 days
    let caution = 0;  // <= 60 days
    let expired = 0;  // < 0 days
    let normal = 0;   // No alert

    data.forEach(item => {
      const alertInfo = StatusCalculator.calculateAlerts(item);
      if (alertInfo.alertLevel === 'urgent') urgent++;
      else if (alertInfo.alertLevel === 'warning') warning++;
      else if (alertInfo.alertLevel === 'caution') caution++;
      else if (alertInfo.alertLevel === 'expired') expired++;
      else normal++;
    });

    let alertEntries = [
      { label: '⚠️ បន្ទាន់ (Urgent Alert ≤ 15 ថ្ងៃ)', count: urgent, color: '#dc2626' },
      { label: '⏳ ព្រមាន (Warning Alert ≤ 30 ថ្ងៃ)', count: warning, color: '#d97706' },
      { label: 'ℹ️ ត្រៀម (Caution Alert ≤ 60 ថ្ងៃ)', count: caution, color: '#2563eb' },
      { label: '⛔ ផុតកំណត់ (Expired / Past Due)', count: expired, color: '#ef4444' },
      { label: '✅ ធម្មតា (Normal / No Alert)', count: normal, color: '#10b981' }
    ];

    const filter = this.cardFilters.alerts;
    if (filter === 'urgent_only') alertEntries = alertEntries.filter(a => a.label.includes('បន្ទាន់'));
    else if (filter === 'warning_only') alertEntries = alertEntries.filter(a => a.label.includes('ព្រមាន'));
    else if (filter === 'expired_only') alertEntries = alertEntries.filter(a => a.label.includes('ផុតកំណត់'));

    const total = (urgent + warning + caution + expired + normal) || 1;

    container.innerHTML = alertEntries.map(item => {
      const pct = Math.round((item.count / total) * 100);
      return `
        <div class="stat-progress-item" onclick="dashboardController.handleFilterClick('alerts', '${item.label.replace(/'/g, "\\'")}')" title="ចុចដើម្បីច្រោះទិន្នន័យ៖ ${item.label}">
          <div class="stat-progress-header">
            <div class="stat-progress-label">${item.label}</div>
            <div class="stat-progress-meta">${item.count} សំណើ (${pct}%)</div>
          </div>
          <div class="stat-progress-track">
            <div class="stat-progress-fill" style="width: ${pct}%; background: ${item.color};"></div>
          </div>
        </div>
      `;
    }).join('');

    if (!isProgress) {
      this.createOrUpdateChart('chart-alerts', {
        type: 'doughnut',
        data: {
          labels: alertEntries.map(e => e.label),
          datasets: [{
            data: alertEntries.map(e => e.count),
            backgroundColor: alertEntries.map(e => e.color),
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } }
        }
      });
    }
  }

  /* ---------------- 7. RECENT ACTIVITIES WIDGET (MATCHING PICTURE 1) ---------------- */
  renderRecentActivities() {
    const container = document.getElementById('recent-activities-list');
    if (!container) return;

    let logs = [];
    if (typeof auditLogger !== 'undefined' && auditLogger.getLogs) {
      logs = auditLogger.getLogs();
    }

    const filter = this.cardFilters.activity || 'all';
    if (filter !== 'all') {
      logs = logs.filter(l => (l.action || '').toUpperCase() === filter.toUpperCase());
    }

    if (logs.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--text-muted); font-size: 0.85rem;">គ្មានកំណត់ត្រាសកម្មភាពឡើយ</div>';
      return;
    }

    container.innerHTML = logs.slice(0, 15).map(log => {
      const act = (log.action || 'UPDATE').toUpperCase();
      let actClass = 'act-update';
      if (act === 'CREATE' || act.includes('CREATE')) actClass = 'act-create';
      else if (act === 'LOCK' || act.includes('LOCK')) actClass = 'act-lock';
      else if (act === 'DELETE' || act.includes('DELETE')) actClass = 'act-delete';
      else if (act === 'AUTH' || act.includes('LOGIN')) actClass = 'act-auth';
      else if (act === 'BACKUP' || act === 'RESTORE' || act === 'IMPORT') actClass = 'act-system';

      // Format timestamp e.g. "01-15 08:30"
      let formattedTime = log.timestamp || '';
      try {
        const d = new Date(log.timestamp);
        if (!isNaN(d.getTime())) {
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const hh = String(d.getHours()).padStart(2, '0');
          const min = String(d.getMinutes()).padStart(2, '0');
          formattedTime = `${mm}-${dd} ${hh}:${min}`;
        }
      } catch (e) {
        // Keep raw
      }

      const targetId = log.staffId && log.staffId !== 'N/A' && log.staffId !== 'ALL' ? log.staffId : 'GDCE-System';
      const targetName = log.staffName ? ` (${log.staffName})` : '';

      return `
        <div class="recent-activity-item ${actClass}">
          <div class="activity-header-row">
            <div class="activity-title-group">
              <span class="activity-action-tag">${act}</span>
              <span style="color: var(--text-muted); font-size: 0.75rem;">•</span>
              <strong class="activity-target-name">${targetId}${targetName}</strong>
            </div>
            <div class="activity-time-stamp">${formattedTime}</div>
          </div>
          <div class="activity-description-sub">${log.description || log.details || '-'}</div>
        </div>
      `;
    }).join('');
  }

  /* ---------------- 8. STATUS & GENDER & YEAR CHARTS ---------------- */
  handleStatusGenderToggle(mode) {
    const wrapStatus = document.getElementById('wrap-chart-status');
    const wrapGender = document.getElementById('wrap-chart-gender');
    const wrapYear = document.getElementById('wrap-chart-year');
    const grid = document.getElementById('status-gender-canvas-grid');

    if (mode === 'dual') {
      if (grid) grid.style.gridTemplateColumns = '1fr 1fr';
      if (wrapStatus) wrapStatus.style.display = 'block';
      if (wrapGender) wrapGender.style.display = 'block';
      if (wrapYear) wrapYear.style.display = 'none';
    } else if (mode === 'status') {
      if (grid) grid.style.gridTemplateColumns = '1fr';
      if (wrapStatus) wrapStatus.style.display = 'block';
      if (wrapGender) wrapGender.style.display = 'none';
      if (wrapYear) wrapYear.style.display = 'none';
    } else if (mode === 'gender') {
      if (grid) grid.style.gridTemplateColumns = '1fr';
      if (wrapStatus) wrapStatus.style.display = 'none';
      if (wrapGender) wrapGender.style.display = 'block';
      if (wrapYear) wrapYear.style.display = 'none';
    } else if (mode === 'year') {
      if (grid) grid.style.gridTemplateColumns = '1fr';
      if (wrapStatus) wrapStatus.style.display = 'none';
      if (wrapGender) wrapGender.style.display = 'none';
      if (wrapYear) wrapYear.style.display = 'block';
    }
  }

  renderStatusGenderCharts(data) {
    if (typeof Chart === 'undefined') return;

    // Status Doughnut
    let active = 0, pending = 0, completed = 0, expired = 0, closed = 0, missing = 0;
    data.forEach(item => {
      const s = StatusCalculator.calculateStatus(item).key;
      if (s === 'active') active++;
      else if (s === 'pending') pending++;
      else if (s === 'completed') completed++;
      else if (s === 'expired') expired++;
      else if (s === 'closed') closed++;
      else if (s === 'missing') missing++;
    });

    this.createOrUpdateChart('chart-status', {
      type: 'doughnut',
      data: {
        labels: ['សកម្ម', 'រង់ចាំ', 'បានបញ្ចប់', 'ផុតកំណត់', 'បិទប្រព័ន្ធ', 'ខ្វះព័ត៌មាន'],
        datasets: [{
          data: [active, pending, completed, expired, closed, missing],
          backgroundColor: ['#059669', '#d97706', '#2563eb', '#dc2626', '#4b5563', '#9333ea'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
      }
    });

    // Gender Doughnut
    let male = 0, female = 0, otherG = 0;
    data.forEach(item => {
      if (item.gender === 'ប្រុស' || item.gender === 'Male') male++;
      else if (item.gender === 'ស្រី' || item.gender === 'Female') female++;
      else otherG++;
    });

    this.createOrUpdateChart('chart-gender', {
      type: 'doughnut',
      data: {
        labels: ['ប្រុស (Male)', 'ស្រី (Female)', 'ផ្សេងៗ'],
        datasets: [{
          data: [male, female, otherG],
          backgroundColor: ['#2563eb', '#ec4899', '#94a3b8'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
      }
    });

    // Year Trend Line Chart
    const yearCounts = {};
    data.forEach(item => {
      const y = item.annualPeriod || (item.startDate ? item.startDate.slice(0, 4) : 'N/A');
      yearCounts[y] = (yearCounts[y] || 0) + 1;
    });

    const sortedYears = Object.keys(yearCounts).sort();
    const yearValues = sortedYears.map(y => yearCounts[y]);

    this.createOrUpdateChart('chart-year', {
      type: 'line',
      data: {
        labels: sortedYears,
        datasets: [{
          label: 'កំណត់ត្រាតាមឆ្នាំ (Records per Year)',
          data: yearValues,
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          fill: true,
          tension: 0.35,
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });
  }

  createOrUpdateChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (this.chartInstances[canvasId]) {
      this.chartInstances[canvasId].destroy();
    }

    // Ensure layout padding for data labels
    if (!config.options) config.options = {};
    if (!config.options.layout) config.options.layout = {};
    if (!config.options.layout.padding) {
      config.options.layout.padding = { top: 22, bottom: 8, left: 8, right: 8 };
    } else if (typeof config.options.layout.padding === 'object' && !config.options.layout.padding.top) {
      config.options.layout.padding.top = 22;
    }

    // If Bar chart, extend y-axis max slightly so label is not clipped at highest bar
    if (config.type === 'bar' && config.options.scales && config.options.scales.y) {
      config.options.scales.y.grace = '8%';
    }

    // Amount Data Labels Plugin for All Chart Types (Bar, Doughnut, Pie, Line, Polar)
    const amountDataLabelsPlugin = {
      id: 'amountDataLabels',
      afterDatasetsDraw(chart) {
        const { ctx } = chart;
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark' || document.body.getAttribute('data-theme') === 'dark';

        ctx.save();

        chart.data.datasets.forEach((dataset, datasetIndex) => {
          const meta = chart.getDatasetMeta(datasetIndex);
          if (!meta || meta.hidden) return;

          meta.data.forEach((element, index) => {
            const val = dataset.data ? dataset.data[index] : null;
            if (val === null || val === undefined) return;
            const numVal = Number(val);
            if (isNaN(numVal) || numVal <= 0) return;

            ctx.font = 'bold 12px "Inter", "Kantumruy Pro", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // 1. Vertical & Horizontal Bar Charts
            if (chart.config.type === 'bar') {
              const isHorizontal = chart.config.options && chart.config.options.indexAxis === 'y';
              if (isHorizontal) {
                const xPos = element.x + 14;
                const yPos = element.y;
                ctx.fillStyle = isDark ? '#f1f5f9' : '#1e293b';
                ctx.fillText(numVal.toLocaleString(), xPos, yPos);
              } else {
                const xPos = element.x;
                const barHeight = Math.abs(element.base - element.y);
                let yPos = element.y - 12;
                let textColor = isDark ? '#f8fafc' : '#0f172a';

                if (barHeight > 34) {
                  yPos = element.y + 13;
                  textColor = '#ffffff';
                  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
                  ctx.shadowBlur = 3;
                } else {
                  ctx.shadowColor = 'transparent';
                  ctx.shadowBlur = 0;
                }

                ctx.fillStyle = textColor;
                ctx.fillText(numVal.toLocaleString(), xPos, yPos);
                ctx.shadowBlur = 0;
              }
            }
            // 2. Doughnut & Pie Charts
            else if (chart.config.type === 'doughnut' || chart.config.type === 'pie') {
              const circumference = element.circumference !== undefined ? element.circumference : (element.endAngle - element.startAngle);
              if (circumference > 0.25) {
                if (typeof element.tooltipPosition === 'function') {
                  const pos = element.tooltipPosition();
                  if (pos && !isNaN(pos.x) && !isNaN(pos.y)) {
                    ctx.fillStyle = '#ffffff';
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
                    ctx.shadowBlur = 4;
                    ctx.font = 'bold 12px "Inter", "Kantumruy Pro", sans-serif';
                    ctx.fillText(numVal.toLocaleString(), pos.x, pos.y);
                    ctx.shadowBlur = 0;
                  }
                }
              }
            }
            // 3. Line Charts
            else if (chart.config.type === 'line') {
              const xPos = element.x;
              const yPos = element.y - 14;
              ctx.fillStyle = isDark ? '#38bdf8' : '#4f46e5';
              ctx.font = 'bold 11px "Inter", "Kantumruy Pro", sans-serif';
              ctx.fillText(numVal.toLocaleString(), xPos, yPos);
            }
            // 4. Polar Area
            else if (chart.config.type === 'polarArea') {
              if (typeof element.tooltipPosition === 'function') {
                const pos = element.tooltipPosition();
                if (pos && !isNaN(pos.x) && !isNaN(pos.y)) {
                  ctx.fillStyle = '#ffffff';
                  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
                  ctx.shadowBlur = 4;
                  ctx.font = 'bold 12px "Inter", "Kantumruy Pro", sans-serif';
                  ctx.fillText(numVal.toLocaleString(), pos.x, pos.y);
                  ctx.shadowBlur = 0;
                }
              }
            }
          });
        });

        ctx.restore();
      }
    };

    if (!config.plugins) config.plugins = [];
    config.plugins.push(amountDataLabelsPlugin);

    const ctx = canvas.getContext('2d');
    this.chartInstances[canvasId] = new Chart(ctx, config);
  }
}

const dashboardController = new DashboardController();

