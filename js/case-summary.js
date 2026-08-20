/**
 * Staff System Control - Summary Report & Case Duration Analytics Engine
 * Provides calendar-accurate duration calculations, multi-case aggregate cards,
 * interactive 3D/2D visual analytics charts, reactive multi-dimension filters,
 * detailed summary tables, printable official sheets, and Excel exports.
 */

class CaseSummaryController {
  constructor() {
    this.filters = {
      caseReason: 'all',
      year: 'all',
      department: 'all',
      office: 'all',
      gender: 'all',
      searchQuery: '',
      startDateFrom: '',
      startDateTo: '',
      endDateFrom: '',
      endDateTo: ''
    };
    this.chartInstances = {};
    this.currentPage = 1;
    this.pageSize = 15;
    this.sortField = 'no';
    this.sortAsc = true;
  }

  init() {
    this.populateFilterDropdowns();
    this.render();
  }

  /**
   * Populate Filter Dropdowns dynamically from settings & current database records
   */
  populateFilterDropdowns() {
    const settings = dataStore.getSettings() || {};
    const allRecords = dataStore.getStaffData() || [];

    // 1. Case Reasons (Merge settings & dynamic records with counts)
    const countMap = {};
    allRecords.forEach(r => {
      if (r.requestReason && r.requestReason.trim()) {
        const k = r.requestReason.trim();
        countMap[k] = (countMap[k] || 0) + 1;
      }
    });

    const reasonsSet = new Set(settings.requestReasons || []);
    Object.keys(countMap).forEach(k => reasonsSet.add(k));
    const reasons = Array.from(reasonsSet).filter(Boolean);

    const selReason = document.getElementById('case-sum-filter-reason');
    if (selReason) {
      const cur = this.filters.caseReason;
      const totalAll = Object.values(countMap).reduce((a, b) => a + b, 0);
      selReason.innerHTML = `<option value="all">🎯 គ្រប់ករណីទាំងអស់ (${totalAll} ករណី)</option>` +
        reasons.map(r => {
          const count = countMap[r] || 0;
          return `<option value="${r}" ${r === cur ? 'selected' : ''}>📋 ${r} (${count})</option>`;
        }).join('');
    }

    // 2. Years (Annual Periods)
    const yearsSet = new Set(settings.annualPeriods || []);
    allRecords.forEach(r => {
      if (r.annualPeriod && r.annualPeriod.trim()) yearsSet.add(r.annualPeriod.trim());
      if (r.startDate) yearsSet.add(r.startDate.substring(0, 4));
      if (r.requestDate) yearsSet.add(r.requestDate.substring(0, 4));
    });
    const years = Array.from(yearsSet).filter(Boolean).sort().reverse();
    const selYear = document.getElementById('case-sum-filter-year');
    if (selYear) {
      const cur = this.filters.year;
      selYear.innerHTML = '<option value="all">📅 គ្រប់ឆ្នាំ (All Years)</option>' +
        years.map(y => `<option value="${y}" ${y === cur ? 'selected' : ''}>${y}</option>`).join('');
    }

    // 3. Departments
    const deptsSet = new Set(settings.departments || []);
    allRecords.forEach(r => { if (r.department && r.department.trim()) deptsSet.add(r.department.trim()); });
    const depts = Array.from(deptsSet).filter(Boolean);
    const selDept = document.getElementById('case-sum-filter-dept');
    if (selDept) {
      const cur = this.filters.department;
      selDept.innerHTML = '<option value="all">🏢 គ្រប់អង្គភាព (All Departments)</option>' +
        depts.map(d => `<option value="${d}" ${d === cur ? 'selected' : ''}>${d}</option>`).join('');
    }

    // 4. Offices
    const officesSet = new Set(settings.offices || []);
    allRecords.forEach(r => { if (r.office && r.office.trim()) officesSet.add(r.office.trim()); });
    const offices = Array.from(officesSet).filter(Boolean);
    const selOffice = document.getElementById('case-sum-filter-office');
    if (selOffice) {
      const cur = this.filters.office;
      selOffice.innerHTML = '<option value="all">📂 គ្រប់ការិយាល័យ (All Offices)</option>' +
        offices.map(o => `<option value="${o}" ${o === cur ? 'selected' : ''}>${o}</option>`).join('');
    }
  }

  /**
   * Filter, Sanitize & Compute Exact Calendar Durations for All Matching Records
   */
  getProcessedRecords() {
    const allData = dataStore.getStaffData() || [];
    const result = [];

    allData.forEach(item => {
      const rawReason = (item.requestReason || '').trim();
      // Rule 6: If no case, exclude from summary
      if (!rawReason) return;

      const startDate = item.startDate || item.requestDate;
      const endDate = item.endDate;
      
      let durationText = '';
      let diffDays = 0;
      let isValidDate = false;
      let isInvalidOrder = false;

      if (startDate && endDate) {
        const isoStart = StatusCalculator.normalizeDate(startDate);
        const isoEnd = StatusCalculator.normalizeDate(endDate);
        
        if (isoStart && isoEnd) {
          const d1 = new Date(isoStart);
          const d2 = new Date(isoEnd);
          d1.setHours(0, 0, 0, 0);
          d2.setHours(0, 0, 0, 0);

          if (d2 < d1) {
            durationText = 'កាលបរិច្ឆេទមិនត្រឹមត្រូវ';
            isInvalidOrder = true;
          } else {
            diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
            durationText = StatusCalculator.calculateExactDurationYMD(startDate, endDate);
            isValidDate = true;
          }
        }
      }

      // Check Filters
      // 1. Case Filter
      if (this.filters.caseReason !== 'all' && rawReason !== this.filters.caseReason) {
        return;
      }

      // 2. Year Filter
      if (this.filters.year !== 'all') {
        const matchYear = (item.annualPeriod === this.filters.year) ||
                          (startDate && startDate.startsWith(this.filters.year)) ||
                          (endDate && endDate.startsWith(this.filters.year));
        if (!matchYear) return;
      }

      // 3. Department Filter
      if (this.filters.department !== 'all' && item.department !== this.filters.department) {
        return;
      }

      // 4. Office Filter
      if (this.filters.office !== 'all' && item.office !== this.filters.office) {
        return;
      }

      // 5. Gender Filter
      if (this.filters.gender !== 'all') {
        const gen = StatusCalculator.normalizeGender(item.gender);
        if (gen !== this.filters.gender) return;
      }

      // 6. Search Query Filter
      if (this.filters.searchQuery) {
        const q = this.filters.searchQuery.toLowerCase().trim();
        const match = (
          (item.staffId && String(item.staffId).toLowerCase().includes(q)) ||
          (item.secondaryId && String(item.secondaryId).toLowerCase().includes(q)) ||
          (item.khmerName && item.khmerName.toLowerCase().includes(q)) ||
          (item.latinName && item.latinName.toLowerCase().includes(q)) ||
          (rawReason && rawReason.toLowerCase().includes(q)) ||
          (item.department && item.department.toLowerCase().includes(q)) ||
          (item.office && item.office.toLowerCase().includes(q)) ||
          (item.prakasNo && item.prakasNo.toLowerCase().includes(q)) ||
          (item.refDocument && item.refDocument.toLowerCase().includes(q))
        );
        if (!match) return;
      }

      // 7. Date Filters
      if (this.filters.startDateFrom && startDate && startDate < this.filters.startDateFrom) return;
      if (this.filters.startDateTo && startDate && startDate > this.filters.startDateTo) return;
      if (this.filters.endDateFrom && endDate && endDate < this.filters.endDateFrom) return;
      if (this.filters.endDateTo && endDate && endDate > this.filters.endDateTo) return;

      result.push({
        ...item,
        caseReason: rawReason,
        calcStartDate: startDate,
        calcEndDate: endDate,
        durationText: durationText,
        durationDays: diffDays,
        isValidDate: isValidDate,
        isInvalidOrder: isInvalidOrder
      });
    });

    return result;
  }

  /**
   * Helper: Format aggregate total days into calendar Years, Months, and Days
   */
  formatTotalDaysYMD(totalDays) {
    if (!totalDays || totalDays <= 0) return '0 ថ្ងៃ';
    
    let remainingDays = Math.round(totalDays);
    const years = Math.floor(remainingDays / 365.25);
    remainingDays -= Math.floor(years * 365.25);
    
    const months = Math.floor(remainingDays / 30.4375);
    remainingDays -= Math.floor(months * 30.4375);
    
    const days = Math.round(remainingDays);

    const parts = [];
    if (years > 0) parts.push(`${years} ឆ្នាំ`);
    if (months > 0) parts.push(`${months} ខែ`);
    if (days > 0 || parts.length === 0) parts.push(`${days} ថ្ងៃ`);

    return parts.join(' ');
  }

  /**
   * Compute Detailed Aggregates for All Cases & Per Case Type
   */
  computeAggregates(records) {
    const totalCases = records.length;
    const uniqueStaffSet = new Set();
    let totalDurationDays = 0;
    let validDurationCount = 0;
    let longestItem = null;
    let shortestItem = null;

    const caseMap = {};
    const yearMap = {};

    records.forEach(r => {
      const staffKey = r.staffId || r.khmerName || r.no;
      uniqueStaffSet.add(staffKey);

      if (!caseMap[r.caseReason]) {
        caseMap[r.caseReason] = {
          caseName: r.caseReason,
          records: [],
          staffSet: new Set(),
          totalDays: 0,
          validCount: 0,
          longest: null,
          shortest: null
        };
      }
      const cg = caseMap[r.caseReason];
      cg.records.push(r);
      cg.staffSet.add(staffKey);

      if (r.isValidDate && r.durationDays >= 0) {
        totalDurationDays += r.durationDays;
        validDurationCount++;
        cg.totalDays += r.durationDays;
        cg.validCount++;

        if (!longestItem || r.durationDays > longestItem.durationDays) {
          longestItem = r;
        }
        if (!shortestItem || r.durationDays < shortestItem.durationDays) {
          shortestItem = r;
        }

        if (!cg.longest || r.durationDays > cg.longest.durationDays) {
          cg.longest = r;
        }
        if (!cg.shortest || r.durationDays < cg.shortest.durationDays) {
          cg.shortest = r;
        }
      }

      const yr = r.annualPeriod || (r.calcStartDate ? r.calcStartDate.substring(0, 4) : 'ផ្សេងៗ');
      if (!yearMap[yr]) {
        yearMap[yr] = { year: yr, count: 0, totalDays: 0 };
      }
      yearMap[yr].count++;
      if (r.isValidDate) yearMap[yr].totalDays += r.durationDays;
    });

    const avgDurationDays = validDurationCount > 0 ? (totalDurationDays / validDurationCount) : 0;

    return {
      totalCases,
      totalPeople: uniqueStaffSet.size,
      totalDurationText: this.formatTotalDaysYMD(totalDurationDays),
      totalDurationDays,
      avgDurationText: this.formatTotalDaysYMD(avgDurationDays),
      avgDurationDays,
      longestItem,
      shortestItem,
      caseGroups: Object.values(caseMap).sort((a, b) => b.records.length - a.records.length),
      yearGroups: Object.values(yearMap).sort((a, b) => String(a.year).localeCompare(String(b.year)))
    };
  }

  /**
   * Main Render Pipeline
   */
  render() {
    const records = this.getProcessedRecords();
    const agg = this.computeAggregates(records);

    this.renderCaseCards(agg.caseGroups);
    this.renderCharts(agg);
    this.renderTable(records);
    this.updateActiveFilterBadges();

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  /**
   * Render Summary តាមប្រភេទករណី (Case Aggregate Stat Cards)
   */
  renderCaseCards(caseGroups) {
    const container = document.getElementById('case-summary-cards-grid');
    if (!container) return;

    if (caseGroups.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2.5rem; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
          <div style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.25rem;">🔍 គ្មានទិន្នន័យសម្រាប់ករណីដែលបានជ្រើសរើសទេ</div>
          <div style="font-size: 0.82rem;">No matching case records found. Try adjusting your filters.</div>
        </div>
      `;
      return;
    }

    const palette = [
      { border: '#4f46e5', bg: 'rgba(79, 70, 229, 0.08)', text: '#4f46e5', icon: 'clock' },
      { border: '#059669', bg: 'rgba(5, 150, 105, 0.08)', text: '#059669', icon: 'graduation-cap' },
      { border: '#ea580c', bg: 'rgba(234, 88, 12, 0.08)', text: '#ea580c', icon: 'log-out' },
      { border: '#db2777', bg: 'rgba(219, 39, 119, 0.08)', text: '#db2777', icon: 'file-text' },
      { border: '#0284c7', bg: 'rgba(2, 132, 199, 0.08)', text: '#0284c7', icon: 'briefcase' },
      { border: '#7c3aed', bg: 'rgba(124, 58, 237, 0.08)', text: '#7c3aed', icon: 'calendar-clock' }
    ];

    container.innerHTML = caseGroups.map((cg, idx) => {
      const style = palette[idx % palette.length];
      const avgDays = cg.validCount > 0 ? (cg.totalDays / cg.validCount) : 0;
      const avgText = this.formatTotalDaysYMD(avgDays);
      const totalText = this.formatTotalDaysYMD(cg.totalDays);
      const isSelected = this.filters.caseReason === cg.caseName;

      return `
        <div class="case-stat-card ${isSelected ? 'is-selected' : ''}" onclick="caseSummaryController.setCaseReasonFilter('${cg.caseName.replace(/'/g, "\\'")}')" style="--card-theme-color: ${style.border};" title="ចុចដើម្បីច្រោះតារាងមើលតែករណី៖ ${cg.caseName}">
          <div class="case-card-header">
            <div class="case-card-title-group">
              <span class="case-card-icon-box" style="background: ${style.bg}; color: ${style.text};">
                <i data-lucide="${style.icon}"></i>
              </span>
              <h3 class="case-card-title">${cg.caseName}</h3>
            </div>
            <span class="case-count-badge" style="background: ${style.bg}; color: ${style.text};">
              ${cg.records.length} សំណើ (${cg.staffSet.size} នាក់)
            </span>
          </div>

          <div class="case-card-metrics-grid">
            <div class="case-metric-item">
              <span class="case-metric-label">⏱️ រយៈពេលសរុប:</span>
              <strong class="case-metric-val" style="color: ${style.text};">${totalText}</strong>
            </div>
            <div class="case-metric-item">
              <span class="case-metric-label">📊 រយៈពេលមធ្យម:</span>
              <strong class="case-metric-val">${avgText}</strong>
            </div>
            <div class="case-metric-item">
              <span class="case-metric-label">🏆 វែងបំផុត:</span>
              <span class="case-metric-val-sm">
                <strong>${cg.longest ? cg.longest.durationText : '-'}</strong>
                ${cg.longest ? `<small>(${cg.longest.khmerName || cg.longest.latinName || ''})</small>` : ''}
              </span>
            </div>
            <div class="case-metric-item">
              <span class="case-metric-label">⚡ ខ្លីបំផុត:</span>
              <span class="case-metric-val-sm">
                <strong>${cg.shortest ? cg.shortest.durationText : '-'}</strong>
                ${cg.shortest ? `<small>(${cg.shortest.khmerName || cg.shortest.latinName || ''})</small>` : ''}
              </span>
            </div>
          </div>

          <div class="case-card-footer">
            <span>ចុចដើម្បីមើលកំណត់ត្រាទាំងអស់ ➔</span>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Render 3D Extruded Pie Chart with Direct Slice Labels & Interactive Side Legend
   */
  renderCharts(agg) {
    const caseGroups = agg.caseGroups;
    const colors = [
      '#4f46e5', // Indigo
      '#059669', // Emerald
      '#ea580c', // Orange
      '#db2777', // Pink
      '#0284c7', // Sky Blue
      '#7c3aed', // Purple
      '#ca8a04', // Amber
      '#dc2626', // Red
      '#14b8a6', // Teal
      '#6366f1'  // Violet
    ];

    const totalCountBadge = document.getElementById('case-sum-3d-total-count');
    if (totalCountBadge) {
      totalCountBadge.textContent = agg.totalCases;
    }

    // Render Side Legend with counts, durations and percentages
    const legendList = document.getElementById('case-sum-3d-legend-list');
    if (legendList) {
      if (caseGroups.length === 0) {
        legendList.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--text-muted); font-size: 0.85rem;">គ្មានទិន្នន័យករណី</div>';
      } else {
        legendList.innerHTML = caseGroups.map((cg, idx) => {
          const color = colors[idx % colors.length];
          const pct = Math.round((cg.records.length / (agg.totalCases || 1)) * 100);
          const totalDuration = this.formatTotalDaysYMD(cg.totalDays);
          const isSelected = this.filters.caseReason === cg.caseName;

          return `
            <div class="reason-3d-legend-item ${isSelected ? 'active-legend' : ''}" onclick="caseSummaryController.setCaseReasonFilter('${cg.caseName.replace(/'/g, "\\'")}')" title="ចុចដើម្បីច្រោះតារាងមើលតែករណី៖ ${cg.caseName}">
              <div style="display: flex; align-items: center; gap: 0.45rem; flex: 1; min-width: 0;">
                <span class="legend-color-dot" style="width: 11px; height: 11px; border-radius: 50%; background: ${color}; flex-shrink: 0; box-shadow: 0 0 6px ${color}88;"></span>
                <span class="legend-label-text" style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${cg.caseName}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 0.35rem; flex-shrink: 0;">
                <span class="legend-count-pill" style="background: rgba(0,0,0,0.05); padding: 1px 7px; border-radius: 4px; font-size: 0.74rem; font-weight: 700; color: var(--text-primary);" title="រយៈពេលសរុប៖ ${totalDuration}">${cg.records.length} សំណើ</span>
                <span class="legend-pct-text" style="font-size: 0.76rem; font-weight: 800; color: ${color}; min-width: 35px; text-align: right;">${pct}%</span>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Helper to shade colors for 3D depth walls
    const shadeHex = (hex, percent) => {
      let f = parseInt(hex.slice(1), 16),
          t = percent < 0 ? 0 : 255,
          p = percent < 0 ? percent * -1 : percent,
          R = f >> 16,
          G = (f >> 8) & 0x00ff,
          B = f & 0x0000ff;
      return "#" + (
        0x1000000 +
        (Math.round((t - R) * p) + R) * 0x10000 +
        (Math.round((t - G) * p) + G) * 0x100 +
        (Math.round((t - B) * p) + B)
      ).toString(16).slice(1);
    };

    // Custom 3D Extrusion & Data Labels Plugin for Chart.js
    const plugin3D = {
      id: 'caseSum3DPlugin',
      beforeDatasetsDraw(chart) {
        const ctx = chart.ctx;
        const meta = chart.getDatasetMeta(0);
        if (!meta || !meta.data || meta.data.length === 0) return;

        ctx.save();
        const depth = 16;

        for (let d = depth; d >= 1; d--) {
          meta.data.forEach((element, i) => {
            if (element.hidden) return;
            const { startAngle, endAngle, outerRadius, innerRadius, x, y } = element;
            const baseColor = chart.data.datasets[0].backgroundColor[i] || '#4f46e5';
            
            ctx.fillStyle = shadeHex(baseColor, -0.42);
            ctx.beginPath();
            ctx.arc(x, y + d, outerRadius, startAngle, endAngle);
            if (innerRadius > 0) {
              ctx.arc(x, y + d, innerRadius, endAngle, startAngle, true);
            } else {
              ctx.lineTo(x, y + d);
            }
            ctx.closePath();
            ctx.fill();
          });
        }
        ctx.restore();
      },
      afterDatasetsDraw(chart) {
        const ctx = chart.ctx;
        const meta = chart.getDatasetMeta(0);
        if (!meta || !meta.data) return;

        ctx.save();
        // Top bevel lighting & slice dividers
        meta.data.forEach((element, i) => {
          if (element.hidden) return;
          const { startAngle, endAngle, outerRadius, innerRadius, x, y } = element;
          
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, outerRadius, startAngle, endAngle);
          if (innerRadius > 0) {
            ctx.arc(x, y, innerRadius, endAngle, startAngle, true);
          } else {
            ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();

          // DIRECT SLICE DATA LABELS (Count & Percentage)
          const circumference = element.circumference !== undefined ? element.circumference : (endAngle - startAngle);
          if (circumference > 0.25) {
            const midAngle = startAngle + circumference / 2;
            const r = innerRadius + (outerRadius - innerRadius) * 0.55;
            const labelX = x + Math.cos(midAngle) * r;
            const labelY = y + Math.sin(midAngle) * r;

            const val = chart.data.datasets[0].data[i];
            const pct = Math.round((val / (agg.totalCases || 1)) * 100);

            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
            ctx.shadowBlur = 5;
            ctx.font = 'bold 12px "Kantumruy Pro", "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${val} (${pct}%)`, labelX, labelY);
            ctx.shadowBlur = 0;
          }
        });
        ctx.restore();
      }
    };

    const labels = caseGroups.map(cg => cg.caseName);
    const dataValues = caseGroups.map(cg => cg.records.length);
    const bgColors = caseGroups.map((_, i) => colors[i % colors.length]);

    this.createOrUpdateChart('chart-case-people-3d', {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: dataValues,
          backgroundColor: bgColors,
          borderWidth: 0,
          hoverOffset: 12,
          hoverBorderWidth: 2,
          hoverBorderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        layout: {
          padding: { top: 10, bottom: 25, left: 10, right: 10 }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            titleFont: { family: 'Hanuman, Inter, sans-serif', size: 12, weight: 'bold' },
            bodyFont: { family: 'Hanuman, Inter, sans-serif', size: 12 },
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => {
                const cg = caseGroups[ctx.dataIndex];
                const totalDur = cg ? this.formatTotalDaysYMD(cg.totalDays) : '';
                const pct = Math.round((ctx.raw / (agg.totalCases || 1)) * 100);
                return ` ${ctx.label}: ${ctx.raw} សំណើ (${pct}%) | រយៈពេល: ${totalDur}`;
              }
            }
          }
        },
        onClick: (evt, els) => {
          if (els && els.length > 0) {
            const idx = els[0].index;
            const clicked = caseGroups[idx];
            if (clicked) this.setCaseReasonFilter(clicked.caseName);
          }
        }
      },
      plugins: [plugin3D]
    });
  }

  createOrUpdateChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (this.chartInstances[canvasId]) {
      this.chartInstances[canvasId].destroy();
    }

    const ctx = canvas.getContext('2d');
    this.chartInstances[canvasId] = new Chart(ctx, config);
  }

  /**
   * Render Main Summary Table
   */
  renderTable(records) {
    const tbody = document.getElementById('case-summary-table-body');
    if (!tbody) return;

    // Sorting
    records.sort((a, b) => {
      let valA = a[this.sortField] || '';
      let valB = b[this.sortField] || '';
      if (this.sortField === 'duration') {
        valA = a.durationDays || 0;
        valB = b.durationDays || 0;
      } else {
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
      }
      if (valA < valB) return this.sortAsc ? -1 : 1;
      if (valA > valB) return this.sortAsc ? 1 : -1;
      return 0;
    });

    const totalRecords = records.length;
    const totalPages = Math.ceil(totalRecords / this.pageSize) || 1;
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const pageRecords = records.slice(startIndex, startIndex + this.pageSize);

    // Update table info text
    const infoEl = document.getElementById('case-summary-table-info');
    if (infoEl) {
      infoEl.textContent = `បង្ហាញ ${totalRecords > 0 ? startIndex + 1 : 0} ដល់ ${Math.min(startIndex + this.pageSize, totalRecords)} នៃសរុប ${totalRecords} ករណី`;
    }

    const pageNumEl = document.getElementById('case-summary-page-num');
    if (pageNumEl) pageNumEl.textContent = `${this.currentPage} / ${totalPages}`;

    if (pageRecords.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 3rem; color: var(--text-muted);">
            <div style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.25rem;">🔍 គ្មានទិន្នន័យករណីដែលត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ</div>
            <div style="font-size: 0.82rem;">No matching case records found.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = pageRecords.map((item, idx) => {
      const rowNum = startIndex + idx + 1;
      const status = StatusCalculator.calculateStatus(item);

      let durationBadge = '';
      if (item.isInvalidOrder) {
        durationBadge = `<span class="badge" style="background: #fee2e2; color: #dc2626; font-weight: 700;">❌ កាលបរិច្ឆេទមិនត្រឹមត្រូវ</span>`;
      } else if (item.durationText) {
        durationBadge = `
          <span class="case-duration-pill" style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 3px 9px; border-radius: 6px; font-weight: 800; font-size: 0.78rem; background: rgba(6, 182, 212, 0.12); color: #0891b2; border: 1px solid rgba(6, 182, 212, 0.25);">
            <i data-lucide="clock" style="width: 12px; height: 12px;"></i>
            <span>${item.durationText}</span>
          </span>
        `;
      } else {
        durationBadge = `<span style="color: var(--text-muted);">-</span>`;
      }

      return `
        <tr data-no="${item.no}">
          <td style="text-align: center; font-weight: 700;">${rowNum}</td>
          <td>
            <div style="font-weight: 700; color: var(--text-primary);">${item.khmerName || '-'}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600;">${item.latinName || ''}</div>
          </td>
          <td>
            <div><strong style="color: var(--primary);">${StatusCalculator.format4DigitId(item.staffId) || '-'}</strong></div>
            ${item.secondaryId ? `<div style="font-size: 0.7rem; color: #0284c7; font-weight: 700;">MEF: ${StatusCalculator.format4DigitId(item.secondaryId)}</div>` : ''}
          </td>
          <td>
            <span class="status-badge" style="background: rgba(79, 70, 229, 0.08); color: var(--primary); font-weight: 700;">
              ${item.caseReason}
            </span>
          </td>
          <td>${StatusCalculator.formatDateDisplay(item.calcStartDate)}</td>
          <td>${StatusCalculator.formatDateDisplay(item.calcEndDate)}</td>
          <td>${durationBadge}</td>
          <td>
            <div style="font-weight: 600; font-size: 0.8rem;">${item.department || '-'}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${item.office || ''}</div>
          </td>
          <td style="text-align: center;">
            <span class="status-badge ${status.cssClass}">${status.labelKh}</span>
          </td>
          <td style="text-align: center;">
            <div class="table-actions">
              <button class="icon-btn" title="មើល / កែប្រែ (Edit Info)" onclick="userformController.openEdit(${item.no})">
                <i data-lucide="edit-3"></i>
              </button>
              <button class="icon-btn" title="បោះពុម្ពប័ណ្ណបុគ្គលិក (Print Profile)" onclick="app.showProfileModal(${item.no})">
                <i data-lucide="printer"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Filter Event Handlers
   */
  handleFilterChange(field, val) {
    this.filters[field] = val;
    this.currentPage = 1;
    this.render();
  }

  setCaseReasonFilter(reason) {
    this.filters.caseReason = reason;
    const sel = document.getElementById('case-sum-filter-reason');
    if (sel) sel.value = reason;
    this.currentPage = 1;
    this.populateFilterDropdowns();
    this.render();
  }

  handleSearch(val) {
    this.filters.searchQuery = val;
    this.currentPage = 1;
    this.render();
  }

  resetFilters() {
    this.filters = {
      caseReason: 'all',
      year: 'all',
      department: 'all',
      office: 'all',
      gender: 'all',
      searchQuery: '',
      startDateFrom: '',
      startDateTo: '',
      endDateFrom: '',
      endDateTo: ''
    };
    this.currentPage = 1;

    const el = (id) => document.getElementById(id);
    if (el('case-sum-search-input')) el('case-sum-search-input').value = '';
    if (el('case-sum-filter-reason')) el('case-sum-filter-reason').value = 'all';
    if (el('case-sum-filter-year')) el('case-sum-filter-year').value = 'all';
    if (el('case-sum-filter-dept')) el('case-sum-filter-dept').value = 'all';
    if (el('case-sum-filter-office')) el('case-sum-filter-office').value = 'all';
    if (el('case-sum-filter-gender')) el('case-sum-filter-gender').value = 'all';
    if (el('case-sum-start-from')) el('case-sum-start-from').value = '';
    if (el('case-sum-start-to')) el('case-sum-start-to').value = '';
    if (el('case-sum-end-from')) el('case-sum-end-from').value = '';
    if (el('case-sum-end-to')) el('case-sum-end-to').value = '';

    this.populateFilterDropdowns();
    this.render();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast('🔄 បានសម្អាតតម្រងសង្ខេបករណីទាំងអស់!', 'info');
    }
  }

  updateActiveFilterBadges() {
    let count = 0;
    if (this.filters.caseReason !== 'all') count++;
    if (this.filters.year !== 'all') count++;
    if (this.filters.department !== 'all') count++;
    if (this.filters.office !== 'all') count++;
    if (this.filters.gender !== 'all') count++;
    if (this.filters.searchQuery) count++;
    if (this.filters.startDateFrom || this.filters.startDateTo) count++;
    if (this.filters.endDateFrom || this.filters.endDateTo) count++;

    const badge = document.getElementById('case-sum-active-filter-badge');
    if (badge) {
      badge.textContent = `🎯 តម្រងសកម្ម: ${count}`;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  }

  sortBy(field) {
    if (this.sortField === field) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortField = field;
      this.sortAsc = true;
    }
    this.render();
  }

  /**
   * Export Case Duration Summary as an Excel Workbook (.xlsx)
   */
  /**
   * Show Excel Export Confirmation Modal with Warning Info
   */
  exportExcel() {
    if (typeof XLSX === 'undefined') {
      if (typeof app !== 'undefined') app.showToast('❌ SheetJS (XLSX) Library មិនទាន់ដំណើរការ', 'error');
      return;
    }

    const records = this.getProcessedRecords();
    if (!records || records.length === 0) {
      if (typeof app !== 'undefined' && app.showToast) {
        app.showToast('⚠️ គ្មានទិន្នន័យសម្រាប់ Export តាមតម្រងដែលបានជ្រើសរើសឡើយ!', 'warning');
      }
      return;
    }

    const modal = document.getElementById('case-summary-excel-modal');
    if (!modal) {
      this.executeExportExcel();
      return;
    }

    const reasonEl = document.getElementById('case-sum-excel-confirm-reason');
    const deptEl = document.getElementById('case-sum-excel-confirm-dept');
    const yearEl = document.getElementById('case-sum-excel-confirm-year');
    const countEl = document.getElementById('case-sum-excel-confirm-count');

    const reasonText = this.filters.caseReason !== 'all' ? this.filters.caseReason : 'គ្រប់ករណីទាំងអស់';
    const deptText = this.filters.department !== 'all' ? this.filters.department : 'គ្រប់អង្គភាពទាំងអស់';
    const yearText = this.filters.year !== 'all' ? this.filters.year : 'គ្រប់ឆ្នាំ';

    if (reasonEl) reasonEl.textContent = reasonText;
    if (deptEl) deptEl.textContent = deptText;
    if (yearEl) yearEl.textContent = yearText;
    if (countEl) countEl.textContent = `${records.length} ករណី`;

    modal.style.display = 'flex';
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  closeExcelConfirmModal() {
    const modal = document.getElementById('case-summary-excel-modal');
    if (modal) modal.style.display = 'none';
  }

  /**
   * Execute actual Excel Workbook download
   */
  executeExportExcel() {
    this.closeExcelConfirmModal();

    const records = this.getProcessedRecords();
    const agg = this.computeAggregates(records);

    const wb = XLSX.utils.book_new();

    // 1. Detailed Records Sheet
    const headers = [
      'ល.រ (No.)',
      'ឈ្មោះខ្មែរ (Khmer Name)',
      'ឈ្មោះឡាតាំង (Latin Name)',
      'អត្តលេខ អពដ (GDT ID)',
      'អត្តលេខ កសហវ (MEF ID)',
      'ករណី (Case Reason)',
      'ថ្ងៃចាប់ផ្តើម (Start Date)',
      'ថ្ងៃចុងក្រោយ (End Date)',
      'រយៈពេលប្រើប្រាស់ (Duration)',
      'ចំនួនថ្ងៃសរុប (Days)',
      'អង្គភាព (Department)',
      'ការិយាល័យ (Office)',
      'តួនាទី (Position)',
      'ភេទ (Gender)',
      'ប្រចាំឆ្នាំ (Year)',
      'ប្រកាសលេខ (Prakas No.)',
      'ឯកសារយោង (Ref Document)'
    ];

    const rows = records.map((r, i) => [
      i + 1,
      r.khmerName || '',
      r.latinName || '',
      r.staffId || '',
      r.secondaryId || '',
      r.caseReason || '',
      r.calcStartDate || '',
      r.calcEndDate || '',
      r.durationText || '',
      r.durationDays || 0,
      r.department || '',
      r.office || '',
      r.position || '',
      r.gender || '',
      r.annualPeriod || '',
      r.prakasNo || '',
      r.refDocument || ''
    ]);

    const wsData = [
      ['របាយការណ៍សង្ខេបរយៈពេលដែលបុគ្គលិកប្រើប្រាស់តាមករណី (Case Duration Summary Report)'],
      [`កាលបរិច្ឆេទបង្កើត៖ ${new Date().toLocaleDateString('km-KH')} | សរុបករណី៖ ${agg.totalCases} | បុគ្គលិកសរុប៖ ${agg.totalPeople} នាក់ | រយៈពេលសរុប៖ ${agg.totalDurationText}`],
      [],
      headers,
      ...rows
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Case Duration Summary');

    // 2. Case Aggregates Summary Sheet
    const caseHeaders = ['ល.រ', 'ប្រភេទករណី (Case Type)', 'ចំនួនសំណើ (Cases)', 'ចំនួនមនុស្ស (People)', 'រយៈពេលសរុប (Total Duration)', 'រយៈពេលមធ្យម (Avg Duration)', 'វែងបំផុត (Longest)', 'ខ្លីបំផុត (Shortest)'];
    const caseRows = agg.caseGroups.map((cg, i) => [
      i + 1,
      cg.caseName,
      cg.records.length,
      cg.staffSet.size,
      this.formatTotalDaysYMD(cg.totalDays),
      this.formatTotalDaysYMD(cg.validCount > 0 ? cg.totalDays / cg.validCount : 0),
      cg.longest ? `${cg.longest.durationText} (${cg.longest.khmerName || ''})` : '-',
      cg.shortest ? `${cg.shortest.durationText} (${cg.shortest.khmerName || ''})` : '-'
    ]);

    const wsSummaryData = [
      ['ស្ថិតិសង្ខេបតាមប្រភេទករណីនីមួយៗ (Case Aggregates Summary)'],
      [],
      caseHeaders,
      ...caseRows
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(wsSummaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Case Type Aggregates');

    const fileName = `Case_Duration_Summary_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);

    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`📊 បានទាញយករបាយការណ៍សង្ខេប ${fileName} ដោយជោគជ័យ!`, 'success');
    }
  }

  /**
   * Print Official Case Duration Summary Sheet
   */
  printReport() {
    const records = this.getProcessedRecords();
    if (!records || records.length === 0) {
      if (typeof app !== 'undefined' && app.showToast) {
        app.showToast('⚠️ គ្មានទិន្នន័យសម្រាប់បោះពុម្ពតាមតម្រងដែលបានជ្រើសរើសឡើយ!', 'warning');
      }
      return;
    }

    const agg = this.computeAggregates(records);
    const target = document.getElementById('official-report-render-target');
    if (!target) {
      window.print();
      return;
    }

    // Filter description
    const filterParts = [];
    if (this.filters.caseReason !== 'all') filterParts.push(`ករណី៖ ${this.filters.caseReason}`);
    if (this.filters.year !== 'all') filterParts.push(`ឆ្នាំ៖ ${this.filters.year}`);
    if (this.filters.department !== 'all') filterParts.push(`អង្គភាព៖ ${this.filters.department}`);
    if (this.filters.office !== 'all') filterParts.push(`ការិយាល័យ៖ ${this.filters.office}`);
    if (this.filters.gender !== 'all') filterParts.push(`ភេទ៖ ${this.filters.gender}`);
    if (this.filters.searchQuery) filterParts.push(`ពាក្យស្វែងរក៖ "${this.filters.searchQuery}"`);

    const filterText = filterParts.length > 0 ? filterParts.join(' • ') : 'គ្រប់ករណី និងគ្រប់អង្គភាពទាំងអស់';

    target.innerHTML = `
      <div class="printable-official-sheet" style="padding: 10px; font-family: 'Khmer OS Siemreap', sans-serif;">
        <!-- KINGDOM & MINISTRY HEADER -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.25rem;">
          <tr>
            <td style="width: 45%; vertical-align: top; font-family: 'Khmer OS Moul Light', Moul, serif; font-size: 10pt; line-height: 1.7;">
              <div>ក្រសួងសេដ្ឋកិច្ចនិងហិរញ្ញវត្ថុ</div>
              <div style="color: #1e3a8a;">អគ្គនាយកដ្ឋានពន្ធដារ</div>
            </td>
            <td style="width: 55%; text-align: center; vertical-align: top; font-family: 'Khmer OS Moul Light', Moul, serif; font-size: 10pt; line-height: 1.7;">
              <div>ព្រះរាជាណាចក្រកម្ពុជា</div>
              <div>ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
              <div style="font-size: 8pt; font-weight: normal; margin-top: 2px;">───── 🎯 ─────</div>
            </td>
          </tr>
        </table>

        <!-- REPORT TITLE -->
        <div style="text-align: center; margin-bottom: 1.2rem;">
          <h2 style="font-family: 'Khmer OS Moul Light', Moul, serif; font-size: 13pt; margin: 0 0 0.4rem 0; color: #000;">
            របាយការណ៍សង្ខេបរយៈពេលដែលបុគ្គលិកបានប្រើប្រាស់តាមករណី
          </h2>
          <div style="font-size: 8.5pt; color: #334155; margin-bottom: 0.25rem;">
            (តម្រងសកម្ម៖ <strong>${filterText}</strong>)
          </div>
          <div style="font-size: 9pt; font-weight: bold; color: #0f172a;">
            សរុបសំណើ៖ <strong>${agg.totalCases} ករណី</strong> | បុគ្គលិកសរុប៖ <strong>${agg.totalPeople} នាក់</strong> | រយៈពេលសរុប៖ <strong>${agg.totalDurationText}</strong>
          </div>
        </div>

        <!-- SECTION 1: AGGREGATES TABLE -->
        <div style="font-family: 'Khmer OS Moul Light', Moul, serif; font-size: 9pt; margin-bottom: 0.4rem; color: #1e293b;">
          ១. ស្ថិតិសង្ខេបតាមប្រភេទករណីនីមួយៗ ៖
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.25rem; font-size: 8.5pt; border: 1px solid #000;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="border: 1px solid #000; padding: 5px; text-align: center; font-family: 'Khmer OS Moul Light'; width: 45px;">ល.រ</th>
              <th style="border: 1px solid #000; padding: 5px; text-align: left; font-family: 'Khmer OS Moul Light';">ប្រភេទករណី / មូលហេតុ</th>
              <th style="border: 1px solid #000; padding: 5px; text-align: center; font-family: 'Khmer OS Moul Light'; width: 90px;">ចំនួនសំណើ</th>
              <th style="border: 1px solid #000; padding: 5px; text-align: center; font-family: 'Khmer OS Moul Light'; width: 100px;">ចំនួនមនុស្ស</th>
              <th style="border: 1px solid #000; padding: 5px; text-align: left; font-family: 'Khmer OS Moul Light';">រយៈពេលសរុប</th>
              <th style="border: 1px solid #000; padding: 5px; text-align: left; font-family: 'Khmer OS Moul Light';">រយៈពេលមធ្យម</th>
            </tr>
          </thead>
          <tbody>
            ${agg.caseGroups.map((cg, i) => `
              <tr>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
                <td style="border: 1px solid #000; padding: 4px; font-weight: bold;">${cg.caseName}</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${cg.records.length} ករណី</td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center;">${cg.staffSet.size} នាក់</td>
                <td style="border: 1px solid #000; padding: 4px;">${this.formatTotalDaysYMD(cg.totalDays)}</td>
                <td style="border: 1px solid #000; padding: 4px;">${this.formatTotalDaysYMD(cg.validCount > 0 ? cg.totalDays / cg.validCount : 0)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- SECTION 2: DETAILED RECORDS TABLE -->
        <div style="font-family: 'Khmer OS Moul Light', Moul, serif; font-size: 9pt; margin-bottom: 0.4rem; color: #1e293b;">
          ២. បញ្ជីកំណត់ត្រាលម្អិតទាំងអស់ (ចំនួន ${records.length} ករណី) ៖
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; font-size: 8pt; border: 1px solid #000;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 35px;">ល.រ</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: left;">ឈ្មោះបុគ្គលិក</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 75px;">អត្តលេខ</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: left;">ករណី / មូលហេតុ</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 85px;">ថ្ងៃចាប់ផ្តើម</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 85px;">ថ្ងៃចុងក្រោយ</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: left; width: 120px;">⏱️ រយៈពេលប្រើប្រាស់</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: left;">អង្គភាព / ការិយាល័យ</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: left;">ប្រកាសលេខ</th>
            </tr>
          </thead>
          <tbody>
            ${records.map((r, i) => `
              <tr>
                <td style="border: 1px solid #000; padding: 3px; text-align: center;">${i + 1}</td>
                <td style="border: 1px solid #000; padding: 3px;"><strong>${r.khmerName || '-'}</strong></td>
                <td style="border: 1px solid #000; padding: 3px; text-align: center;">${r.staffId || '-'}</td>
                <td style="border: 1px solid #000; padding: 3px;">${r.caseReason || '-'}</td>
                <td style="border: 1px solid #000; padding: 3px; text-align: center;">${r.calcStartDate || '-'}</td>
                <td style="border: 1px solid #000; padding: 3px; text-align: center;">${r.calcEndDate || '-'}</td>
                <td style="border: 1px solid #000; padding: 3px; font-weight: bold;">${r.durationText || '-'}</td>
                <td style="border: 1px solid #000; padding: 3px;">${r.department || '-'} / ${r.office || '-'}</td>
                <td style="border: 1px solid #000; padding: 3px;">${r.prakasNo || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- SIGNATURE FOOTER -->
        <div style="display: flex; justify-content: space-between; margin-top: 1.5rem; page-break-inside: avoid; font-size: 8.5pt;">
          <div style="text-align: center; width: 220px;">
            <div style="font-family: 'Khmer OS Moul Light'; margin-bottom: 0.2rem;">បានឃើញ និងឯកភាព</div>
            <div style="margin-top: 3.5rem; font-weight: bold;">...................................................</div>
          </div>
          <div style="text-align: center; width: 250px;">
            <div>រាជធានីភ្នំពេញ, ថ្ងៃទី........ ខែ........... ឆ្នាំ២០...</div>
            <div style="font-family: 'Khmer OS Moul Light'; margin-top: 0.2rem; margin-bottom: 0.2rem;">អ្នករៀបចំរបាយការណ៍</div>
            <div style="margin-top: 3.5rem; font-weight: bold;">...................................................</div>
          </div>
        </div>
      </div>
    `;

    document.body.classList.add('is-printing-official-summary');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('is-printing-official-summary');
    }, 1000);
  }
}

const caseSummaryController = new CaseSummaryController();
