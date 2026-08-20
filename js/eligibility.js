/**
 * Staff System Control - Request History & Re-Eligibility Check Engine
 * Provides instant staff lookup, multi-reason historical comparison matrix,
 * calendar-accurate used vs. remaining quota calculation, waiting period tracking,
 * form pre-submission gatekeeper alerts, and executive admin dashboard metrics.
 */

class EligibilityController {
  constructor() {
    this.selectedStaffId = null;
    this.selectedStaffName = null;
    this.searchQuery = '';
    this.tableFilterVerdict = 'all';
  }

  init() {
    this.renderAdminSettingsUI();
    this.setupSearchAutocomplete();
    this.renderAuditTable();
  }

  toggleRulesPanel() {
    const body = document.getElementById('eligibility-rules-panel-body');
    const textEl = document.getElementById('text-toggle-rules');
    const iconEl = document.getElementById('icon-toggle-rules');

    if (!body) return;

    const isHidden = body.style.display === 'none' || !body.style.display;

    if (isHidden) {
      body.style.display = 'block';
      if (textEl) textEl.textContent = 'លាក់ការកំណត់';
      if (iconEl) iconEl.setAttribute('data-lucide', 'chevron-up');
    } else {
      body.style.display = 'none';
      if (textEl) textEl.textContent = 'បង្ហាញការកំណត់';
      if (iconEl) iconEl.setAttribute('data-lucide', 'chevron-down');
    }

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  /**
   * Get default eligibility rules merged with user settings
   */
  getRules() {
    const settings = dataStore.getSettings() || {};
    const defaultRules = {
      'ព្យួរការងារ': { maxAllowedYears: 2, maxTimes: 1, waitingPeriodYears: 2, allowReEligibility: true },
      'សិក្សានៅក្រៅប្រទេស': { maxAllowedYears: 4, maxTimes: 1, waitingPeriodYears: 1, allowReEligibility: true },
      'ឈប់បម្រើការងារ': { maxAllowedYears: 0, maxTimes: 1, waitingPeriodYears: 0, allowReEligibility: false },
      'DEFAULT': { maxAllowedYears: 2, maxTimes: 1, waitingPeriodYears: 1, allowReEligibility: true }
    };

    return {
      ...defaultRules,
      ...(settings.eligibilityRules || {})
    };
  }

  /**
   * Save eligibility rules to settings
   */
  saveRules(newRules) {
    const settings = dataStore.getSettings() || {};
    settings.eligibilityRules = newRules;
    dataStore.saveSettings(settings);
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast('✅ បានរក្សាទុកការកំណត់ច្បាប់សិទ្ធិស្នើសុំឡើងវិញ!', 'success');
    }
    this.render();
  }

  /**
   * Core Engine: Evaluate Eligibility for a Specific Staff Member and Target Reason
   * @param {string} staffKey - Staff ID, Secondary ID, or Khmer/Latin Name
   * @param {string} targetReason - e.g. "ព្យួរការងារ"
   * @returns {Object} Verdict Object
   */
  checkEligibility(staffKey, targetReason = 'ព្យួរការងារ') {
    if (!staffKey) {
      return {
        hasHistory: false,
        verdict: 'NONE',
        verdictLabel: '⚪ មិនទាន់ជ្រើសរើសបុគ្គលិក',
        badgeClass: 'badge-secondary',
        message: 'សូមបញ្ចូលឈ្មោះ ឬអត្តលេខបុគ្គលិកដើម្បីពិនិត្យប្រវត្តិ។'
      };
    }

    const allData = dataStore.getStaffData() || [];
    const q = String(staffKey).trim().toLowerCase();

    // 1. Find all matching staff records
    const staffRecords = allData.filter(r => {
      const sId = r.staffId ? String(r.staffId).trim().toLowerCase() : '';
      const secId = r.secondaryId ? String(r.secondaryId).trim().toLowerCase() : '';
      const khName = r.khmerName ? String(r.khmerName).trim().toLowerCase() : '';
      const latName = r.latinName ? String(r.latinName).trim().toLowerCase() : '';
      return sId === q || secId === q || khName === q || latName === q ||
             (r.no && String(r.no) === q);
    });

    if (staffRecords.length === 0) {
      return {
        hasHistory: false,
        verdict: 'ELIGIBLE_NEW',
        verdictLabel: '🟢 អាចស្នើសុំបាន (បុគ្គលិកថ្មី)',
        badgeClass: 'status-completed',
        color: '#059669',
        bgColor: 'rgba(5, 150, 105, 0.1)',
        message: 'បុគ្គលិកនេះមិនទាន់មានប្រវត្តិនៅក្នុងប្រព័ន្ធឡើយ (អាចស្នើសុំបាន)។',
        usedDays: 0,
        usedText: '0 ថ្ងៃ',
        remainingText: 'ពេញកូតា',
        timesRequested: 0,
        staffInfo: null
      };
    }

    const staffInfo = staffRecords[0]; // Representative info
    const rules = this.getRules();
    const rule = rules[targetReason] || rules['DEFAULT'] || { maxAllowedYears: 2, maxTimes: 1, waitingPeriodYears: 1, allowReEligibility: true };

    const maxAllowedDays = (rule.maxAllowedYears || 2) * 365.25;
    const maxTimes = rule.maxTimes || 1;
    const waitingPeriodDays = (rule.waitingPeriodYears || 1) * 365.25;

    // Filter past records matching the specific requestReason
    const reasonRecords = staffRecords.filter(r => {
      const reason = (r.requestReason || '').trim();
      return reason === targetReason;
    });

    const timesRequested = reasonRecords.length;

    // Calculate total valid duration used for this reason
    let totalUsedDays = 0;
    let lastEndDateStr = null;
    let lastEndDateObj = null;

    reasonRecords.forEach(r => {
      const startDate = r.startDate || r.requestDate;
      const endDate = r.endDate;
      if (startDate && endDate) {
        const isoStart = StatusCalculator.normalizeDate(startDate);
        const isoEnd = StatusCalculator.normalizeDate(endDate);
        if (isoStart && isoEnd) {
          const d1 = new Date(isoStart);
          const d2 = new Date(isoEnd);
          if (d2 >= d1) {
            const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
            totalUsedDays += diff;
            if (!lastEndDateObj || d2 > lastEndDateObj) {
              lastEndDateObj = d2;
              lastEndDateStr = endDate;
            }
          }
        }
      }
    });

    const usedText = this.formatTotalDaysYMD(totalUsedDays);
    const maxAllowedText = `${rule.maxAllowedYears} ឆ្នាំ`;

    // 🔴 Case 1: Never requested before
    if (timesRequested === 0) {
      return {
        hasHistory: true,
        verdict: 'ELIGIBLE_NEW',
        verdictLabel: '🟢 អាចស្នើសុំបាន',
        badgeClass: 'status-completed',
        color: '#059669',
        bgColor: 'rgba(5, 150, 105, 0.1)',
        message: `បុគ្គលិកនេះមិនមានប្រវត្តិធ្លាប់ស្នើសុំករណី "${targetReason}" ពីមុនទេ។`,
        usedDays: 0,
        usedText: '0 ថ្ងៃ',
        maxAllowedYears: rule.maxAllowedYears,
        remainingText: `${rule.maxAllowedYears} ឆ្នាំ`,
        timesRequested: 0,
        maxTimes: maxTimes,
        staffInfo,
        reasonRecords
      };
    }

    const remainingDays = Math.max(0, maxAllowedDays - totalUsedDays);
    const remainingText = this.formatTotalDaysYMD(remainingDays);

    // Check Waiting Period if quota exhausted or max times reached
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let isInWaitingPeriod = false;
    let reEligibleDateObj = null;
    let remainingWaitDays = 0;
    let reEligibleDateStr = '';

    if (lastEndDateObj && rule.waitingPeriodYears > 0) {
      reEligibleDateObj = new Date(lastEndDateObj.getTime() + (waitingPeriodDays * 24 * 60 * 60 * 1000));
      if (today < reEligibleDateObj) {
        isInWaitingPeriod = true;
        remainingWaitDays = Math.round((reEligibleDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        reEligibleDateStr = StatusCalculator.formatDateDisplay(reEligibleDateObj.toISOString().slice(0, 10));
      }
    }

    // 🟡 Case 2: In Waiting / Cool-Off Period
    if (isInWaitingPeriod) {
      const waitTimeText = this.formatTotalDaysYMD(remainingWaitDays);
      return {
        hasHistory: true,
        verdict: 'WAITING_PERIOD',
        verdictLabel: '⏱️ ត្រូវរង់ចាំរយៈពេលកំណត់',
        badgeClass: 'status-pending',
        color: '#d97706',
        bgColor: 'rgba(245, 158, 11, 0.12)',
        message: `បុគ្គលិកនេះបានបញ្ចប់ករណីនៅថ្ងៃ ${StatusCalculator.formatDateDisplay(lastEndDateStr)}។ ត្រូវរង់ចាំ ${rule.waitingPeriodYears} ឆ្នាំ (នៅសល់ ${waitTimeText}) មុនអាចស្នើសុំឡើងវិញនៅថ្ងៃ ${reEligibleDateStr}។`,
        usedDays: totalUsedDays,
        usedText: usedText,
        maxAllowedYears: rule.maxAllowedYears,
        remainingText: remainingText,
        timesRequested: timesRequested,
        maxTimes: maxTimes,
        lastEndDate: StatusCalculator.formatDateDisplay(lastEndDateStr),
        reEligibleDate: reEligibleDateStr,
        remainingWaitDays,
        remainingWaitText: waitTimeText,
        staffInfo,
        reasonRecords
      };
    }

    // 🟡 Case 3: Has requested before, but still has remaining quota & times
    if (totalUsedDays < maxAllowedDays && timesRequested < maxTimes) {
      return {
        hasHistory: true,
        verdict: 'ELIGIBLE_PARTIAL',
        verdictLabel: '🟡 ត្រូវពិនិត្យ (នៅសល់កូតា)',
        badgeClass: 'status-active',
        color: '#0284c7',
        bgColor: 'rgba(2, 132, 199, 0.12)',
        message: `បុគ្គលិកនេះធ្លាប់ស្នើសុំ "${targetReason}" ចំនួន ${timesRequested} ដង (បានប្រើ៖ ${usedText})។ រយៈពេលនៅសល់៖ ${remainingText} (ពីកំណត់ ${maxAllowedText})។`,
        usedDays: totalUsedDays,
        usedText: usedText,
        maxAllowedYears: rule.maxAllowedYears,
        remainingText: remainingText,
        timesRequested: timesRequested,
        maxTimes: maxTimes,
        staffInfo,
        reasonRecords
      };
    }

    // 🔴 Case 4: Quota Exhausted / Max Times Reached
    return {
      hasHistory: true,
      verdict: 'INELIGIBLE_EXHAUSTED',
      verdictLabel: '🔴 មិនអាចស្នើសុំបាន (អស់កំណត់)',
      badgeClass: 'status-expired',
      color: '#dc2626',
      bgColor: 'rgba(220, 38, 38, 0.12)',
      message: `បុគ្គលិកនេះបានប្រើប្រាស់រយៈពេលដល់កំណត់រហូតដល់ ${usedText} (កំណត់ត្រឹម ${maxAllowedText}) ឬស្នើគ្រប់ចំនួន ${timesRequested}/${maxTimes} ដងរួចហើយ។ មិនអាចស្នើសុំបន្ថែមបានទេ។`,
      usedDays: totalUsedDays,
      usedText: usedText,
      maxAllowedYears: rule.maxAllowedYears,
      remainingText: '0 ថ្ងៃ',
      timesRequested: timesRequested,
      maxTimes: maxTimes,
      staffInfo,
      reasonRecords
    };
  }

  /**
   * Perform Search and Render Search Results + Matrix
   */
  handleSearch(query) {
    this.searchQuery = query;
    const container = document.getElementById('eligibility-result-stage');
    if (!container) return;

    if (!query || query.trim() === '') {
      container.innerHTML = `
        <div style="text-align: center; padding: 3.5rem 1.5rem; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🛡️</div>
          <div style="font-size: 1.1rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.35rem;">បញ្ចូល ឈ្មោះ ឬ អត្តលេខ ដើម្បីត្រួតពិនិត្យសិទ្ធិ</div>
          <div style="font-size: 0.85rem; max-width: 500px; margin: 0 auto;">ប្រព័ន្ធនឹងបង្ហាញប្រវត្តិស្នើសុំ ចំនួនដង រយៈពេលប្រើប្រាស់ រយៈពេលនៅសល់ និងការវាយតម្លៃសិទ្ធិភ្លាមៗ។</div>
        </div>
      `;
      return;
    }

    const allData = dataStore.getStaffData() || [];
    const q = query.trim().toLowerCase();

    // Match by staffId, secondaryId, khmerName, latinName
    const matchingStaffMap = new Map();
    allData.forEach(r => {
      const sId = r.staffId ? String(r.staffId).trim() : '';
      const secId = r.secondaryId ? String(r.secondaryId).trim() : '';
      const kh = r.khmerName ? String(r.khmerName).trim() : '';
      const lat = r.latinName ? String(r.latinName).trim() : '';

      if (sId.toLowerCase().includes(q) || secId.toLowerCase().includes(q) ||
          kh.toLowerCase().includes(q) || lat.toLowerCase().includes(q)) {
        const key = sId || kh || r.no;
        if (!matchingStaffMap.has(key)) {
          matchingStaffMap.set(key, r);
        }
      }
    });

    const matchingStaff = Array.from(matchingStaffMap.values());

    if (matchingStaff.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem 1.5rem; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
          <div style="font-size: 1.05rem; font-weight: 800; color: var(--text-primary);">រកមិនឃើញបុគ្គលិកឈ្មោះ ឬអត្តលេខ "${query}" ទេ</div>
          <div style="font-size: 0.82rem; margin-top: 0.25rem;">សូមពិនិត្យអក្ខរាវិរុទ្ធ ឬបញ្ចូលអត្តលេខឱ្យបានត្រឹមត្រូវ។</div>
        </div>
      `;
      return;
    }

    // If multiple staff found, render selection cards
    if (matchingStaff.length > 1 && !this.selectedStaffId) {
      container.innerHTML = `
        <div style="margin-bottom: 1rem; font-size: 0.9rem; font-weight: 700; color: var(--text-secondary);">
          រកឃើញបុគ្គលិកចំនួន ${matchingStaff.length} នាក់៖ (សូមចុចជ្រើសរើសដើម្បីពិនិត្យលម្អិត)
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0.85rem;">
          ${matchingStaff.map(s => `
            <div class="case-stat-card" onclick="eligibilityController.selectStaff('${s.staffId || s.khmerName}')" style="cursor: pointer; --card-theme-color: var(--primary);">
              <div style="font-weight: 800; font-size: 1rem; color: var(--text-primary);">${s.khmerName || s.latinName}</div>
              <div style="font-size: 0.78rem; color: var(--primary); font-weight: 700;">អត្តលេខ៖ ${StatusCalculator.format4DigitId(s.staffId) || '-'}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.35rem;">🏢 ${s.department || '-'} | 📂 ${s.office || '-'}</div>
            </div>
          `).join('')}
        </div>
      `;
      return;
    }

    const selectedStaff = matchingStaff[0];
    this.renderStaffEligibilityReport(selectedStaff.staffId || selectedStaff.khmerName, container);
  }

  selectStaff(staffKey) {
    this.selectedStaffId = staffKey;
    const container = document.getElementById('eligibility-result-stage');
    if (container) {
      this.renderStaffEligibilityReport(staffKey, container);
    }
  }

  /**
   * Render Comprehensive Staff Eligibility Report & Reason Matrix
   */
  renderStaffEligibilityReport(staffKey, container) {
    const allData = dataStore.getStaffData() || [];
    const q = String(staffKey).trim().toLowerCase();

    const staffRecords = allData.filter(r => {
      const sId = r.staffId ? String(r.staffId).trim().toLowerCase() : '';
      const secId = r.secondaryId ? String(r.secondaryId).trim().toLowerCase() : '';
      const kh = r.khmerName ? String(r.khmerName).trim().toLowerCase() : '';
      const lat = r.latinName ? String(r.latinName).trim().toLowerCase() : '';
      return sId === q || secId === q || kh === q || lat === q || (r.no && String(r.no) === q);
    });

    if (staffRecords.length === 0) return;
    const info = staffRecords[0];

    const settings = dataStore.getSettings() || {};
    const reasonsSet = new Set(settings.requestReasons || []);
    staffRecords.forEach(r => { if (r.requestReason) reasonsSet.add(r.requestReason.trim()); });
    const reasonsList = Array.from(reasonsSet).filter(Boolean);

    // Primary Evaluation for default "ព្យួរការងារ" or first reason
    const primaryReason = reasonsList.includes('ព្យួរការងារ') ? 'ព្យួរការងារ' : (reasonsList[0] || 'ព្យួរការងារ');
    const primaryVerdict = this.checkEligibility(staffKey, primaryReason);

    // Matrix calculation for ALL reasons
    const matrix = reasonsList.map(reason => {
      const verdict = this.checkEligibility(staffKey, reason);
      return {
        reason,
        ...verdict
      };
    });

    container.innerHTML = `
      <!-- Staff Profile Header Banner -->
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.25rem; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="width: 54px; height: 54px; border-radius: 50%; background: linear-gradient(135deg, #4f46e5, #06b6d4); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 800; flex-shrink: 0; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
              ${(info.khmerName || info.latinName || 'S').charAt(0)}
            </div>
            <div>
              <h2 style="margin: 0; font-size: 1.25rem; font-weight: 900; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
                <span>${info.khmerName || '-'}</span>
                <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted);">(${info.latinName || ''})</span>
              </h2>
              <div style="font-size: 0.82rem; font-weight: 700; color: var(--primary); margin-top: 2px;">
                🆔 អត្តលេខ៖ <strong>${StatusCalculator.format4DigitId(info.staffId) || '-'}</strong> ${info.secondaryId ? `| MEF: <strong>${StatusCalculator.format4DigitId(info.secondaryId)}</strong>` : ''}
              </div>
              <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 4px;">
                🏢 ${info.department || '-'} • 📂 ${info.office || '-'} • 💼 ${info.position || '-'}
              </div>
            </div>
          </div>

          <div style="text-align: right;">
            <span class="status-badge" style="font-size: 0.85rem; padding: 6px 14px; background: ${primaryVerdict.bgColor}; color: ${primaryVerdict.color}; border: 1px solid ${primaryVerdict.color}44;">
              ${primaryVerdict.verdictLabel}
            </span>
            <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 6px;">
              សរុបប្រវត្តិ៖ <strong>${staffRecords.length} កំណត់ត្រា</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- PRIMARY VERDICT ALERT BANNER -->
      <div style="background: ${primaryVerdict.bgColor}; border-left: 5px solid ${primaryVerdict.color}; border-radius: var(--radius-md); padding: 1.1rem 1.25rem; margin-bottom: 1.25rem;">
        <div style="font-size: 1.05rem; font-weight: 900; color: ${primaryVerdict.color}; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.45rem;">
          <i data-lucide="shield-alert"></i>
          <span>លទ្ធផលវាយតម្លៃ៖ ${primaryVerdict.verdictLabel} (${primaryReason})</span>
        </div>
        <div style="font-size: 0.88rem; font-weight: 600; color: var(--text-primary); line-height: 1.5;">
          ${primaryVerdict.message}
        </div>
      </div>

      <!-- REASON REQUEST MATRIX COMPARISON -->
      <div class="master-table-card" style="margin-bottom: 1.5rem;">
        <div class="chart-header" style="padding: 0.85rem 1.25rem; border-bottom: 1px solid var(--border-color);">
          <h3 style="margin: 0; font-size: 0.95rem; font-weight: 800; display: flex; align-items: center; gap: 0.45rem;">
            <i data-lucide="list-checks" style="color: var(--primary);"></i>
            <span>តារាងប្រៀបធៀបសិទ្ធិស្នើសុំតាមប្រភេទករណីនីមួយៗ (Reason Request Matrix)</span>
          </h3>
        </div>
        <div class="table-container" style="overflow-x: auto;">
          <table class="staff-table">
            <thead>
              <tr>
                <th>ប្រភេទសំណើ (Reason Request)</th>
                <th style="text-align: center;">ធ្លាប់ស្នើសុំ</th>
                <th>រយៈពេលបានប្រើប្រាស់</th>
                <th>រយៈពេលកំណត់</th>
                <th>រយៈពេលនៅសល់</th>
                <th style="text-align: center;">ស្ថានភាពសិទ្ធិ</th>
              </tr>
            </thead>
            <tbody>
              ${matrix.map(m => `
                <tr style="${m.reason === primaryReason ? 'background: rgba(79, 70, 229, 0.04);' : ''}">
                  <td style="font-weight: 800; color: var(--text-primary);">
                    ${m.reason === primaryReason ? '🎯 ' : '📋 '}${m.reason}
                  </td>
                  <td style="text-align: center; font-weight: 700;">${m.timesRequested} ដង</td>
                  <td style="font-weight: 700; color: var(--text-primary);">${m.usedText}</td>
                  <td>${m.maxAllowedYears} ឆ្នាំ</td>
                  <td style="font-weight: 700; color: #059669;">${m.remainingText}</td>
                  <td style="text-align: center;">
                    <span class="status-badge" style="background: ${m.bgColor}; color: ${m.color}; font-weight: 800;">
                      ${m.verdictLabel}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- DETAILED HISTORICAL RECORDS TABLE FOR THIS STAFF -->
      <div class="master-table-card">
        <div class="chart-header" style="padding: 0.85rem 1.25rem; border-bottom: 1px solid var(--border-color);">
          <h3 style="margin: 0; font-size: 0.95rem; font-weight: 800; display: flex; align-items: center; gap: 0.45rem;">
            <i data-lucide="history" style="color: #06b6d4;"></i>
            <span>ប្រវត្តិស្នើសុំកន្លងមកទាំងអស់របស់បុគ្គលិក (${staffRecords.length} ករណី)</span>
          </h3>
        </div>
        <div class="table-container" style="overflow-x: auto;">
          <table class="staff-table">
            <thead>
              <tr>
                <th style="width: 50px; text-align: center;">ល.រ</th>
                <th>មូលហេតុស្នើសុំ</th>
                <th>ថ្ងៃចាប់ផ្តើម</th>
                <th>ថ្ងៃចុងក្រោយ</th>
                <th>រយៈពេលប្រើប្រាស់</th>
                <th>ប្រកាសលេខ / ឯកសារយោង</th>
                <th style="text-align: center;">ស្ថានភាព</th>
              </tr>
            </thead>
            <tbody>
              ${staffRecords.map((r, idx) => {
                const durText = StatusCalculator.calculateExactDurationYMD(r.startDate || r.requestDate, r.endDate);
                const status = StatusCalculator.calculateStatus(r);
                return `
                  <tr>
                    <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
                    <td><strong style="color: var(--primary);">${r.requestReason || '-'}</strong></td>
                    <td>${StatusCalculator.formatDateDisplay(r.startDate || r.requestDate)}</td>
                    <td>${StatusCalculator.formatDateDisplay(r.endDate)}</td>
                    <td>
                      <span class="case-duration-pill" style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 0.76rem; background: rgba(6, 182, 212, 0.12); color: #0891b2;">
                        ⏱️ ${durText || '-'}
                      </span>
                    </td>
                    <td>
                      <div style="font-size: 0.8rem; font-weight: 700;">${r.prakasNo || '-'}</div>
                      <div style="font-size: 0.72rem; color: var(--text-muted);">${r.refDocument || ''}</div>
                    </td>
                    <td style="text-align: center;">
                      <span class="status-badge ${status.cssClass}">${status.labelKh}</span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
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
   * Render Top Dashboard Summary Statistics
   */
  renderDashboardSummary() {
    const allData = dataStore.getStaffData() || [];
    
    // Group all data by staff member
    const staffMap = new Map();
    allData.forEach(r => {
      const key = r.staffId || r.khmerName || r.no;
      if (!staffMap.has(key)) {
        staffMap.set(key, []);
      }
      staffMap.get(key).push(r);
    });

    let totalStaffWithHistory = 0;
    let totalIneligibleExhausted = 0;
    let totalEligiblePartial = 0;
    let totalEligibleNew = 0;

    staffMap.forEach((records, key) => {
      if (records.length > 0) {
        totalStaffWithHistory++;
        const primaryReason = records[0].requestReason || 'ព្យួរការងារ';
        const verdict = this.checkEligibility(key, primaryReason);

        if (verdict.verdict === 'INELIGIBLE_EXHAUSTED') {
          totalIneligibleExhausted++;
        } else if (verdict.verdict === 'ELIGIBLE_PARTIAL' || verdict.verdict === 'WAITING_PERIOD') {
          totalEligiblePartial++;
        } else {
          totalEligibleNew++;
        }
      }
    });

    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setEl('eligibility-kpi-total-history', totalStaffWithHistory);
    setEl('eligibility-kpi-exhausted', totalIneligibleExhausted);
    setEl('eligibility-kpi-partial', totalEligiblePartial);
    setEl('eligibility-kpi-eligible', totalEligibleNew);
  }

  /**
   * Render Admin Settings Panel for Customizing Eligibility Rules
   */
  renderAdminSettingsUI() {
    const container = document.getElementById('eligibility-admin-settings-table-body');
    if (!container) return;

    const rules = this.getRules();
    const settings = dataStore.getSettings() || {};
    const reasons = settings.requestReasons || ['ព្យួរការងារ', 'សិក្សានៅក្រៅប្រទេស', 'ឈប់បម្រើការងារ'];

    container.innerHTML = reasons.map(reason => {
      const r = rules[reason] || rules['DEFAULT'] || { maxAllowedYears: 2, maxTimes: 1, waitingPeriodYears: 1, allowReEligibility: true };
      return `
        <tr>
          <td style="font-weight: 800; color: var(--text-primary);">📋 ${reason}</td>
          <td>
            <input type="number" class="form-control form-control-sm" min="0" max="30" value="${r.maxAllowedYears}" onchange="eligibilityController.updateRuleValue('${reason.replace(/'/g, "\\'")}', 'maxAllowedYears', this.value)" style="width: 90px; text-align: center; font-weight: 800;">
          </td>
          <td>
            <input type="number" class="form-control form-control-sm" min="1" max="10" value="${r.maxTimes}" onchange="eligibilityController.updateRuleValue('${reason.replace(/'/g, "\\'")}', 'maxTimes', this.value)" style="width: 90px; text-align: center; font-weight: 800;">
          </td>
          <td>
            <input type="number" class="form-control form-control-sm" min="0" max="10" value="${r.waitingPeriodYears}" onchange="eligibilityController.updateRuleValue('${reason.replace(/'/g, "\\'")}', 'waitingPeriodYears', this.value)" style="width: 90px; text-align: center; font-weight: 800;">
          </td>
          <td style="text-align: center;">
            <span class="badge" style="background: rgba(5, 150, 105, 0.12); color: #059669; font-weight: 700;">សកម្ម (Active)</span>
          </td>
        </tr>
      `;
    }).join('');
  }

  updateRuleValue(reason, field, val) {
    const rules = this.getRules();
    if (!rules[reason]) {
      rules[reason] = { maxAllowedYears: 2, maxTimes: 1, waitingPeriodYears: 1, allowReEligibility: true };
    }
    rules[reason][field] = parseFloat(val) || 0;
    this.saveRules(rules);
  }

  /**
   * Render Filterable Audit Table of Staff Members
   */
  renderAuditTable() {
    const tbody = document.getElementById('eligibility-audit-table-body');
    if (!tbody) return;

    const allData = dataStore.getStaffData() || [];
    const staffMap = new Map();
    allData.forEach(r => {
      const key = r.staffId || r.khmerName || r.no;
      if (!staffMap.has(key)) staffMap.set(key, []);
      staffMap.get(key).push(r);
    });

    const rows = [];
    let count = 1;

    staffMap.forEach((records, key) => {
      const info = records[0];
      const primaryReason = info.requestReason || 'ព្យួរការងារ';
      const verdict = this.checkEligibility(key, primaryReason);

      if (this.tableFilterVerdict !== 'all' && verdict.verdict !== this.tableFilterVerdict) {
        return;
      }

      rows.push(`
        <tr onclick="eligibilityController.selectStaff('${key.replace(/'/g, "\\'")}')" style="cursor: pointer;">
          <td style="text-align: center; font-weight: 700;">${count++}</td>
          <td>
            <div style="font-weight: 800; color: var(--text-primary);">${info.khmerName || '-'}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${info.latinName || ''}</div>
          </td>
          <td><strong style="color: var(--primary);">${StatusCalculator.format4DigitId(info.staffId) || '-'}</strong></td>
          <td>${primaryReason}</td>
          <td style="font-weight: 700;">${records.length} ដង</td>
          <td style="font-weight: 700; color: var(--text-primary);">${verdict.usedText}</td>
          <td style="font-weight: 700; color: #059669;">${verdict.remainingText}</td>
          <td style="text-align: center;">
            <span class="status-badge" style="background: ${verdict.bgColor}; color: ${verdict.color}; font-weight: 800;">
              ${verdict.verdictLabel}
            </span>
          </td>
        </tr>
      `);
    });

    if (rows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
            គ្មានទិន្នន័យបុគ្គលិកត្រូវនឹងលក្ខខណ្ឌតម្រងឡើយ។
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = rows.join('');
  }

  filterAuditTable(verdict) {
    this.tableFilterVerdict = verdict;
    this.renderAuditTable();
  }

  setupSearchAutocomplete() {
    // Autocomplete hookup for real-time search
  }
}

const eligibilityController = new EligibilityController();
