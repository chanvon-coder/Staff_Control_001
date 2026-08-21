/**
 * Staff System Control - Staff Promotion Control & Eligibility Analysis System
 * Implements 27 Master Columns, Batch Excel Import with Warning/Duplicate Modals,
 * Staff Data Integration, Dynamic Duration/Suspension Deductions, Next Eligible Date Auto-Calculation,
 * Interactive KPI Dashboard, Filtering/Sorting, Report Views, Excel Export, and Printing.
 */

class PromotionController {
  constructor() {
    this.calcDate = this.getTodayDDMMMYYYY();
    this.selectedBatchId = 'all';
    this.filters = {
      searchQuery: '',
      year: 'all',
      month: 'all',
      department: 'all',
      office: 'all',
      position: 'all',
      promotionRank: 'all',
      status: 'all',
      staffDataMatch: 'all',
      hasSuspension: 'all'
    };
    this.sortField = 'no';
    this.sortAsc = true;
    this.currentPage = 1;
    this.pageSize = 15;
    this.activeReportTab = 'all'; // 'all', 'eligible', 'ineligible'

    // Import Flow State
    this.pendingFile = null;
    this.parsedRawRows = [];
    this.duplicateMatches = [];
  }

  init() {
    this.loadCalcDateFromUI();
    this.populateFilterDropdowns();
    this.render();
  }

  /**
   * Helper: Format Date object or ISO string to DD-MM-YYYY (e.g. 20-08-2026)
   */
  formatDDMMMYYYY(dateInput) {
    if (!dateInput) return '-';
    if (StatusCalculator && StatusCalculator.formatDateDisplay) {
      const formatted = StatusCalculator.formatDateDisplay(dateInput);
      if (formatted && formatted !== '-') return formatted;
    }
    let d = null;
    if (dateInput instanceof Date) {
      d = dateInput;
    } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
      const iso = StatusCalculator ? StatusCalculator.normalizeDate(dateInput) : dateInput;
      if (iso) d = new Date(iso);
    }

    if (!d || isNaN(d.getTime())) return String(dateInput);

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
  }

  /**
   * Helper: Get Today in DD-MMM-YYYY
   */
  getTodayDDMMMYYYY() {
    return this.formatDDMMMYYYY(new Date());
  }

  /**
   * Helper: Parse DD-MMM-YYYY or YYYY-MM-DD back to Date object
   */
  parseDateObject(dateStr) {
    if (!dateStr) return null;

    if (StatusCalculator) {
      const iso = StatusCalculator.normalizeDate(dateStr);
      if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
        const parts = iso.split('-');
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        if (!isNaN(d.getTime())) return d;
      }
    }

    const str = String(dateStr).trim();
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) return parsed;

    return null;
  }

  /**
   * Get Settings for Promotion Rules
   */
  getPromotionSettings() {
    const settings = dataStore.getSettings() || {};
    const defaultSettings = {
      requiredYears: 2,
      requiredMonths: 0,
      enableSuspensionDeduction: true,
      nearEligibleMonthsThreshold: 6
    };
    return {
      ...defaultSettings,
      ...(settings.promotionRules || {})
    };
  }

  /**
   * Calculate Next Salary Increment Date (+2 Years preserving exact Day & Month in DD-MM-YYYY)
   * Rule: Day and Month stay identical, Year = Year + 2.
   * Example: 14-03-2025 -> 14-03-2027
   */
  calculateExactNext2YearsDate(dateInput) {
    if (!dateInput) return null;
    let d = null;
    if (dateInput instanceof Date) {
      d = dateInput;
    } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
      const iso = StatusCalculator ? StatusCalculator.normalizeDate(dateInput) : dateInput;
      if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
        const parts = iso.split('-');
        d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else if (iso) {
        d = new Date(iso);
      }
    }

    if (!d || isNaN(d.getTime())) return null;

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const nextYear = d.getFullYear() + 2;

    return `${day}-${month}-${nextYear}`;
  }

  /**
   * Calculate Next Eligible Date preserving exact Day & Month from ថ្ងៃគិតគូរ (calcDate)
   * Rule: Day & Month stay 100% identical to ថ្ងៃគិតគូរ, Year = Target Calculated Year.
   * Example: 13-04-2028 -> 13-04-2029 (Never 12-04-2029)
   */
  calculateExactNextEligibleDate(calcDateStr, additionalYears = 0) {
    if (!calcDateStr) return '-';
    let d = null;
    if (typeof calcDateStr === 'string' || typeof calcDateStr === 'number') {
      const iso = StatusCalculator ? StatusCalculator.normalizeDate(calcDateStr) : calcDateStr;
      if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
        const parts = iso.split('-');
        d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else if (iso) {
        d = new Date(iso);
      }
    } else if (calcDateStr instanceof Date) {
      d = calcDateStr;
    }

    if (!d || isNaN(d.getTime())) return String(calcDateStr);

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const targetYear = d.getFullYear() + (additionalYears || 0);

    return `${day}-${month}-${targetYear}`;
  }

  /**
   * Complete 2-Stage New Promotion Date & Next Eligible Date Engine
   * Implements exact rules specified by User:
   * Stage 1: Base Promotion Date + 2-Year Promotion Cycle (preserving exact Day & Month)
   * Stage 2: Adjust Base Date by Used Suspension, then start new 2-Year Cycle, and add Remaining Extension Period to derive New Promotion Maturity Date.
   * Stage 3: Derive Final Next Eligible Date (preserving Day & Month).
   */
  calculateNewPromotionDates(basePromoDateStr, suspensionInfo, rules) {
    if (!basePromoDateStr || basePromoDateStr === '-') {
      return {
        adjustedPromoDateStr: '-',
        newMaturedPromotionDateStr: '-',
        nextEligibleDateStr: '-'
      };
    }

    const promoCycleYears = (rules && rules.requiredYears) ? rules.requiredYears : 2;

    // Extract suspension details if present
    const hasSuspension = suspensionInfo && suspensionInfo.hasSuspension;
    const usedSuspensionDays = (suspensionInfo && suspensionInfo.suspensionDays) ? suspensionInfo.suspensionDays : 0;
    const remainingSuspensionDays = (suspensionInfo && suspensionInfo.remainingSuspensionDays) ? suspensionInfo.remainingSuspensionDays : 0;

    // Convert days to integer years (preserving calendar date exactness)
    const usedYears = Math.round(usedSuspensionDays / 365.25);
    const remainingExtensionYears = Math.round(remainingSuspensionDays / 365.25);

    if (hasSuspension && (usedYears > 0 || remainingExtensionYears > 0)) {
      // ---------------- CATEGORY B: SUSPENSION / EXTENSION / EARLY RETURN ----------------
      // 1. Stage 1 — Adjusted Base Promotion Date (13-04-2024 + 1 ឆ្នាំ = 13-04-2025)
      const adjustedPromoDateStr = this.calculateExactNextEligibleDate(basePromoDateStr, usedYears);

      // 2. Stage 2 — Start new 2-Year Promotion Cycle from Adjusted Base Date (13-04-2025 + 2 ឆ្នាំ = 13-04-2027)
      const next2YearCycleDateStr = this.calculateExactNextEligibleDate(adjustedPromoDateStr, promoCycleYears);

      // 3. Stage 3 — Add Remaining Extension Period to derive Final Next Eligible Date (13-04-2027 + 1 ឆ្នាំ = 13-04-2028)
      const nextEligibleDateStr = this.calculateExactNextEligibleDate(next2YearCycleDateStr, remainingExtensionYears);

      return {
        adjustedPromoDateStr,
        newMaturedPromotionDateStr: next2YearCycleDateStr,
        nextEligibleDateStr
      };
    } else {
      // ---------------- CATEGORY A: STANDARD NORMAL PROMOTION (NO SUSPENSION) ----------------
      // 1. 2-Year Full Maturity Date (13-04-2024 + 2 ឆ្នាំ = 13-04-2026)
      const maturedDateStr = this.calculateExactNextEligibleDate(basePromoDateStr, promoCycleYears);

      // 2. Next Eligible Request Date at following year (13-04-2026 + 1 ឆ្នាំ = 13-04-2027)
      const nextEligibleDateStr = this.calculateExactNextEligibleDate(maturedDateStr, 1);

      return {
        adjustedPromoDateStr: basePromoDateStr,
        newMaturedPromotionDateStr: maturedDateStr,
        nextEligibleDateStr
      };
    }
  }

  /**
   * Helper: Check if promotion is out-of-turn / extraordinary ("ឡើងក្រៅវេន")
   */
  isOutOfTurnRecord(record) {
    if (!record) return false;
    const typeStr = (record.promotionType || '').toUpperCase();
    const reasonStr = record.requestReason || '';
    const remarkStr = record.remark || '';
    const descStr = record.description || '';

    return (
      typeStr === 'OUT_OF_TURN' ||
      typeStr.includes('ក្រៅវេន') ||
      reasonStr.includes('ក្រៅវេន') ||
      remarkStr.includes('ក្រៅវេន') ||
      descStr.includes('ក្រៅវេន') ||
      reasonStr.includes('ពិសេស')
    );
  }

  /**
   * Priority 1 (10-Digit ID) -> Priority 2 (Name) Staff & Request History Lookup Engine
   */
  findStaffAndRequestHistory(record) {
    const allStaff = dataStore.getStaffData() || [];
    const staffIdQ = record.staffId ? String(record.staffId).trim().toLowerCase() : '';
    const nameQ = record.fullName ? String(record.fullName).trim().toLowerCase() : '';

    let matchedStaff = null;
    let historyRecords = [];

    // Priority 1: Match by 10-Digit Staff ID or Secondary ID
    if (staffIdQ && staffIdQ.length >= 3) {
      matchedStaff = allStaff.find(s => 
        (s.staffId && String(s.staffId).trim().toLowerCase() === staffIdQ) ||
        (s.secondaryId && String(s.secondaryId).trim().toLowerCase() === staffIdQ)
      );
      if (matchedStaff) {
        historyRecords = allStaff.filter(s =>
          (s.staffId && String(s.staffId).trim().toLowerCase() === staffIdQ) ||
          (s.secondaryId && String(s.secondaryId).trim().toLowerCase() === staffIdQ)
        );
      }
    }

    // Priority 2: Match by Khmer Name or Latin Name
    if (!matchedStaff && nameQ) {
      matchedStaff = allStaff.find(s =>
        (s.khmerName && String(s.khmerName).trim().toLowerCase() === nameQ) ||
        (s.latinName && String(s.latinName).trim().toLowerCase() === nameQ)
      );
      if (matchedStaff) {
        historyRecords = allStaff.filter(s =>
          (s.khmerName && String(s.khmerName).trim().toLowerCase() === nameQ) ||
          (s.latinName && String(s.latinName).trim().toLowerCase() === nameQ)
        );
      }
    }

    return { matchedStaff, historyRecords };
  }

  /**
   * Calculate Suspension / Work Leave & Re-instatement Pairs (Steps 1 to 5)
   */
  calculateSuspensionReinstatement(historyRecords, rules, basePromoDateStr) {
    if (!historyRecords || historyRecords.length === 0) {
      return { suspensionDays: 0, suspensionDurationText: '0 ថ្ងៃ', remainingSuspensionDays: 0, remainingSuspensionDurationText: '0 ថ្ងៃ', hasSuspension: false, historyPairs: [] };
    }

    let totalSuspensionDays = 0;
    let totalRemainingDays = 0;
    const historyPairs = [];

    const basePromoDateObj = basePromoDateStr ? this.parseDateObject(basePromoDateStr) : null;

    const suspensionRecs = historyRecords.filter(r => {
      const corpus = `${r.requestReason || ''} ${r.description || ''} ${r.remark || ''}`.toLowerCase();
      return corpus.includes('ព្យួរ') || corpus.includes('ឈប់បម្រើ') || corpus.includes('ព្យួរការងារ');
    });

    const reinstatementRecs = historyRecords.filter(r => {
      const corpus = `${r.requestReason || ''} ${r.description || ''} ${r.remark || ''}`.toLowerCase();
      return corpus.includes('ចូលបម្រើ') || corpus.includes('ធ្វើការវិញ') || corpus.includes('ចូលធ្វើការ');
    });

    if (suspensionRecs.length > 0) {
      suspensionRecs.forEach(susp => {
        if (StatusCalculator && StatusCalculator.calculateSuspensionCaseDetails) {
          const caseDetails = StatusCalculator.calculateSuspensionCaseDetails(susp, reinstatementRecs);
          if (caseDetails) {
            // Rule: Check if this suspension period/early-return CROSSES the Base Promotion Date
            let crossesBaseDate = true;
            if (basePromoDateObj) {
              const suspStartObj = this.parseDateObject(caseDetails.startDateStr);
              // Effective end date is early return date if present and not '-', or original end date
              const effectiveEndStr = (caseDetails.earlyReturnDateStr && caseDetails.earlyReturnDateStr !== '-') 
                ? caseDetails.earlyReturnDateStr 
                : caseDetails.originalEndDateStr;
              const suspEndObj = this.parseDateObject(effectiveEndStr);

              if (suspStartObj && suspEndObj) {
                // Rule: If suspension / early-return ended ON OR BEFORE Base Promotion Date, it does NOT delay promotion (Count as Normal Promotion "រាប់ធម្មតា")
                if (suspEndObj <= basePromoDateObj) {
                  crossesBaseDate = false;
                }
              }
            }

            if (crossesBaseDate) {
              totalSuspensionDays += caseDetails.usedDays;
              totalRemainingDays += caseDetails.remainingDays;
              historyPairs.push(caseDetails);
            }
          }
        }
      });
    }

    const hasSuspension = totalSuspensionDays > 0 || totalRemainingDays > 0;
    const suspensionDurationText = totalSuspensionDays > 0
      ? (this.formatTotalDaysYMD ? this.formatTotalDaysYMD(totalSuspensionDays) : `${totalSuspensionDays} ថ្ងៃ`)
      : '0 ថ្ងៃ';

    const remainingSuspensionDurationText = totalRemainingDays > 0
      ? (this.formatTotalDaysYMD ? this.formatTotalDaysYMD(totalRemainingDays) : `${totalRemainingDays} ថ្ងៃ`)
      : '0 ថ្ងៃ';

    return {
      suspensionDays: totalSuspensionDays,
      suspensionDurationText,
      remainingSuspensionDays: totalRemainingDays,
      remainingSuspensionDurationText,
      hasSuspension,
      historyPairs
    };
  }

  /**
   * Core Calculation Engine: Compute promotion duration, suspension deductions, remaining quota, next eligible date, and status.
   */
  evaluateRecord(record, calculationDateStr) {
    const rules = this.getPromotionSettings();
    const isOutOfTurn = this.isOutOfTurnRecord(record);
    const basePromoDate = record.promotionDate || record.serviceStartDate;

    // 1. Staff Matching via Priority 1 (10-Digit ID) -> Priority 2 (Name)
    const { matchedStaff, historyRecords } = this.findStaffAndRequestHistory(record);
    const hasStaffData = !!matchedStaff;
    const staffDepartment = matchedStaff ? (matchedStaff.department || record.department || '-') : (record.department || '-');
    const staffOffice = matchedStaff ? (matchedStaff.office || record.office || '-') : (record.office || '-');

    // 2. Next Salary Increment Date (+2 Years for Regular Rotation ONLY)
    let individualNext2YearsDateStr = null;
    let effectiveCalcDateStr = calculationDateStr;

    if (!isOutOfTurn) {
      individualNext2YearsDateStr = this.calculateExactNext2YearsDate(basePromoDate);
      if (individualNext2YearsDateStr) {
        effectiveCalcDateStr = individualNext2YearsDateStr;
      }
    }

    const calcDateObj = this.parseDateObject(effectiveCalcDateStr) || this.parseDateObject(calculationDateStr) || new Date();
    const promoDateObj = this.parseDateObject(basePromoDate);

    const requiredDays = ((rules.requiredYears || 2) * 365.25) + ((rules.requiredMonths || 0) * 30.4375);

    // 3. Calculate Duration Used (រយៈពេលបានប្រើ)
    let actualDays = 0;
    let actualDurationText = '0 ថ្ងៃ';
    let actualYears = 0;
    let actualMonths = 0;

    if (promoDateObj && calcDateObj && calcDateObj >= promoDateObj) {
      actualDays = Math.round((calcDateObj.getTime() - promoDateObj.getTime()) / (1000 * 60 * 60 * 24));
      actualDurationText = StatusCalculator ? StatusCalculator.calculateExactDurationYMD(promoDateObj, calcDateObj) : `${actualDays} ថ្ងៃ`;
      actualYears = Math.floor(actualDays / 365.25);
      actualMonths = Math.floor((actualDays % 365.25) / 30.4375);
    }

    // 4. Calculate Suspension / Leave & Re-instatement Pair Deductions
    const { suspensionDays, suspensionDurationText, remainingSuspensionDays, remainingSuspensionDurationText, hasSuspension } = this.calculateSuspensionReinstatement(historyRecords, rules, basePromoDate);

    // 5. Effective Duration & Remaining Balance Carryover
    const promoMatured2YearsDateStr = this.calculateExactNext2YearsDate(basePromoDate);
    const promoMatured2YearsObj = this.parseDateObject(promoMatured2YearsDateStr);
    const isCalendarMatured = (!hasSuspension && promoMatured2YearsObj && calcDateObj >= promoMatured2YearsObj);

    const effectiveDays = Math.max(0, actualDays - suspensionDays);
    const isFullTermMatured = isCalendarMatured || (effectiveDays >= requiredDays) || (requiredDays - effectiveDays <= 3);
    const remainingDays = isFullTermMatured ? 0 : Math.max(0, requiredDays - effectiveDays);
    const remainingDurationText = (remainingSuspensionDays > 0 && remainingSuspensionDurationText && remainingSuspensionDurationText !== '0 ថ្ងៃ')
      ? remainingSuspensionDurationText
      : (StatusCalculator && remainingDays > 0 ? this.formatTotalDaysYMD(remainingDays) : '0 ថ្ងៃ');

    // 6. Calculate 2-Stage New Promotion Maturity Date & Next Eligible Date
    const { adjustedPromoDateStr, newMaturedPromotionDateStr, nextEligibleDateStr: calcNextEligibleDateStr } = this.calculateNewPromotionDates(basePromoDate, {
      hasSuspension,
      suspensionDays,
      remainingSuspensionDays
    }, rules);

    let nextEligibleDateStr = isOutOfTurn ? '-' : (calcNextEligibleDateStr || '-');

    // 7. Status & Reason Verdict
    let statusKey = 'INELIGIBLE';
    let statusLabel = '🔴 មិនទាន់អាចស្នើសុំបាន';
    let statusCssClass = 'status-expired';
    let reason = '';

    const nearThresholdDays = (rules.nearEligibleMonthsThreshold || 6) * 30.4375;

    if (isOutOfTurn) {
      statusKey = 'OUT_OF_TURN';
      statusLabel = '⚡ ឡើងក្រៅវេន';
      statusCssClass = 'status-pending';
      reason = 'ការស្នើសុំឡើងថ្នាក់ក្រៅវេន (មិនគណនាថ្ងៃឡើងបន្ទាប់តាមវេនឡើយ)';
      nextEligibleDateStr = '-';
    } else if (isFullTermMatured) {
      statusKey = 'ELIGIBLE';
      statusLabel = '🟢 អាចស្នើសុំបាន';
      statusCssClass = 'status-completed';
      reason = `ចំនួនសរុបបានប្រើប្រាស់៖ ${actualDurationText}` + (hasSuspension ? ` | ដករយៈពេលព្យួរ៖ ${suspensionDurationText}` : '') + ` | ចំនួននៅសល់៖ 0 ថ្ងៃ`;
    } else if (remainingDays <= nearThresholdDays) {
      statusKey = 'NEAR_ELIGIBLE';
      statusLabel = '🟡 ជិតដល់កំណត់';
      statusCssClass = 'status-active';
      reason = `ចំនួនសរុបបានប្រើ៖ ${actualDurationText} | ចំនួននៅសល់៖ ${remainingDurationText} នឹងអាចស្នើសុំបាននៅថ្ងៃ ${nextEligibleDateStr}`;
    } else {
      statusKey = 'INELIGIBLE';
      statusLabel = '🔴 មិនទាន់អាចស្នើសុំបាន';
      statusCssClass = 'status-expired';
      reason = `មិនទាន់គ្រប់កំណត់ ${rules.requiredYears} ឆ្នាំ` + (hasSuspension ? ` (ដករយៈពេលព្យួរ ${suspensionDurationText})` : '') + ` | នៅសល់៖ ${remainingDurationText}`;
    }

    // Determine historical Reason of Request (e.g. ចូលនិវត្តន៍, ព្យួរការងារ, មរណភាព...)
    let historyReasonText = '-';
    if (record.requestReason && record.requestReason !== 'undefined' && record.requestReason.trim()) {
      historyReasonText = record.requestReason.trim();
    } else if (record.remark && record.remark !== 'undefined' && record.remark.trim()) {
      historyReasonText = record.remark.trim();
    } else if (historyRecords && historyRecords.length > 0) {
      const reasons = historyRecords
        .map(h => h.requestReason || h.remark)
        .filter(r => r && r !== 'undefined' && r.trim());
      if (reasons.length > 0) {
        historyReasonText = Array.from(new Set(reasons)).join(', ');
      }
    } else if (matchedStaff && (matchedStaff.requestReason || matchedStaff.remark)) {
      const rText = matchedStaff.requestReason || matchedStaff.remark;
      if (rText && rText !== 'undefined' && rText.trim()) {
        historyReasonText = rText.trim();
      }
    }

    return {
      ...record,
      department: staffDepartment,
      office: staffOffice,
      hasStaffData,
      isOutOfTurn,
      calcDate: isOutOfTurn ? '-' : effectiveCalcDateStr,
      actualDays,
      actualDurationText,
      actualYears,
      actualMonths,
      requiredYears: rules.requiredYears,
      suspensionDays,
      suspensionDurationText,
      hasSuspension,
      effectiveDays,
      remainingDays,
      remainingDurationText,
      adjustedPromoDateStr: isOutOfTurn ? '-' : adjustedPromoDateStr,
      newMaturedPromotionDateStr: isOutOfTurn ? '-' : newMaturedPromotionDateStr,
      nextEligibleDateStr,
      statusKey,
      statusLabel,
      statusCssClass,
      reason,
      historyReasonText: historyReasonText || '-'
    };
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
   * Retrieve all promotion records merged with evaluation metrics
   */
  getProcessedRecords() {
    try {
      const rawRecords = dataStore.getPromotionRecords() || [];
      const calcDateStr = this.calcDate || this.getTodayDDMMMYYYY();

      let evaluated = rawRecords.map(r => {
        try {
          return this.evaluateRecord(r, calcDateStr);
        } catch (err) {
          console.error('Error evaluating record:', r, err);
          return {
            ...r,
            department: r.department || '-',
            office: r.office || '-',
            hasStaffData: false,
            statusKey: 'INELIGIBLE',
            statusLabel: '🔴 មិនទាន់អាចស្នើសុំបាន',
            statusCssClass: 'status-expired',
            historyReasonText: r.requestReason || r.remark || '-'
          };
        }
      });

    // Apply Batch Filter
    if (this.selectedBatchId && this.selectedBatchId !== 'all') {
      evaluated = evaluated.filter(r => r.batchId === this.selectedBatchId);
    }

    // Apply Global Filters
    if (this.filters.searchQuery) {
      const q = this.filters.searchQuery.trim().toLowerCase();
      evaluated = evaluated.filter(r => 
        (r.staffId && String(r.staffId).toLowerCase().includes(q)) ||
        (r.fullName && String(r.fullName).toLowerCase().includes(q)) ||
        (r.prakasNo && String(r.prakasNo).toLowerCase().includes(q)) ||
        (r.currentRank && String(r.currentRank).toLowerCase().includes(q)) ||
        (r.department && String(r.department).toLowerCase().includes(q)) ||
        (r.office && String(r.office).toLowerCase().includes(q))
      );
    }

    if (this.filters.year && this.filters.year !== 'all') {
      evaluated = evaluated.filter(r => {
        const yr = r.importYear || (r.promotionDate ? String(r.promotionDate).slice(-4) : '') || (r.serviceStartDate ? String(r.serviceStartDate).slice(-4) : '');
        return yr && String(yr) === String(this.filters.year);
      });
    }

    if (this.filters.month && this.filters.month !== 'all') {
      evaluated = evaluated.filter(r => {
        const mo = r.importMonth || '';
        return mo && String(mo) === String(this.filters.month);
      });
    }

    if (this.filters.department && this.filters.department !== 'all') {
      evaluated = evaluated.filter(r => String(r.department || '').toLowerCase() === String(this.filters.department).toLowerCase());
    }

    if (this.filters.office && this.filters.office !== 'all') {
      evaluated = evaluated.filter(r => String(r.office || '').toLowerCase() === String(this.filters.office).toLowerCase());
    }

    if (this.filters.position && this.filters.position !== 'all') {
      evaluated = evaluated.filter(r => String(r.position || '').toLowerCase() === String(this.filters.position).toLowerCase());
    }

    if (this.filters.promotionRank && this.filters.promotionRank !== 'all') {
      evaluated = evaluated.filter(r => String(r.requestedRank || r.currentRank || '').toLowerCase() === String(this.filters.promotionRank).toLowerCase());
    }

    if (this.filters.status && this.filters.status !== 'all') {
      evaluated = evaluated.filter(r => r.statusKey === this.filters.status);
    }

    if (this.filters.staffDataMatch && this.filters.staffDataMatch !== 'all') {
      evaluated = evaluated.filter(r => this.filters.staffDataMatch === 'matched' ? r.hasStaffData : !r.hasStaffData);
    }

    if (this.filters.hasSuspension && this.filters.hasSuspension !== 'all') {
      evaluated = evaluated.filter(r => this.filters.hasSuspension === 'yes' ? r.hasSuspension : !r.hasSuspension);
    }

    // Apply Sorting
    evaluated.sort((a, b) => {
      let valA = a[this.sortField];
      let valB = b[this.sortField];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        return this.sortAsc ? valA - valB : valB - valA;
      }

      return this.sortAsc 
        ? String(valA).localeCompare(String(valB), 'km')
        : String(valB).localeCompare(String(valA), 'km');
    });

    // Auto-assign sequential ល.រ (Row Number) 1, 2, 3, 4...
    evaluated = evaluated.map((item, index) => ({
      ...item,
      no: index + 1
    }));

    return evaluated;
    } catch (e) {
      console.error('Error in getProcessedRecords:', e);
      return [];
    }
  }

  /**
   * Main Render Pipeline
   */
  render() {
    const records = this.getProcessedRecords();

    this.renderKPIs();
    this.renderTable(records);
    this.renderImportHistoryTable();

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  /**
   * Render Top 7 KPI Summary Cards
   */
  renderKPIs() {
    const allRecords = this.getProcessedRecords();

    const totalApplicants = allRecords.length;
    const eligibleCount = allRecords.filter(r => r.statusKey === 'ELIGIBLE').length;
    const ineligibleCount = allRecords.filter(r => r.statusKey === 'INELIGIBLE').length;
    const matchedCount = allRecords.filter(r => r.hasStaffData).length;
    const unmatchedCount = allRecords.filter(r => !r.hasStaffData).length;
    const suspensionCount = allRecords.filter(r => r.hasSuspension).length;
    const nearEligibleCount = allRecords.filter(r => r.statusKey === 'NEAR_ELIGIBLE').length;

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setVal('promo-kpi-total', totalApplicants);
    setVal('promo-kpi-eligible', eligibleCount);
    setVal('promo-kpi-ineligible', ineligibleCount);
    setVal('promo-kpi-matched', matchedCount);
    setVal('promo-kpi-unmatched', unmatchedCount);
    setVal('promo-kpi-suspension', suspensionCount);
    setVal('promo-kpi-near', nearEligibleCount);
  }

  /**
   * Render Master 27-Column Promotion Table with Pagination
   */
  renderTable(records) {
    const tbody = document.getElementById('promotion-table-body');
    const pageInfo = document.getElementById('promotion-page-info');
    const recordsCountBadge = document.getElementById('promotion-records-count-badge');

    if (recordsCountBadge) {
      recordsCountBadge.textContent = `${records.length} សំណើស្មើសុំ`;
    }

    if (!tbody) return;

    if (records.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="27" style="text-align: center; padding: 3rem 1.5rem; color: var(--text-muted);">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎖️</div>
            <div style="font-size: 1rem; font-weight: 800; color: var(--text-primary);">គ្មានទិន្នន័យស្នើសុំឡើងឋានន្តរស័ក្តិត្រូវនឹងតម្រងឡើយ</div>
            <div style="font-size: 0.8rem; margin-top: 0.25rem;">សូមទាញចូលទិន្នន័យពី Excel ដោយចុចប៊ូតុង "📥 Import Excel" ខាងលើ។</div>
          </td>
        </tr>
      `;
      if (pageInfo) pageInfo.textContent = 'ទំព័រ ០ នៃ ០';
      return;
    }

    // Pagination Calculation
    const totalPages = Math.ceil(records.length / this.pageSize);
    this.currentPage = Math.max(1, Math.min(this.currentPage, totalPages));
    const startIdx = (this.currentPage - 1) * this.pageSize;
    const pageRecords = records.slice(startIdx, startIdx + this.pageSize);

    if (pageInfo) {
      pageInfo.textContent = `ទំព័រ ${this.currentPage} នៃ ${totalPages} | បុគ្គលិកសរុប៖ ${records.length} នាក់ (បង្ហាញ ${startIdx + 1}-${startIdx + pageRecords.length} នៃ ${records.length})`;
    }

    tbody.innerHTML = pageRecords.map((r, idx) => `
      <tr>
        <td style="text-align: center; font-weight: 700;">${startIdx + idx + 1}</td>
        <td>
          <a href="javascript:void(0)" onclick="app.showRequestHistoryModal('${(r.staffId || r.fullName || '').replace(/'/g, "\\'")}')" style="color: #2563eb; font-weight: 800; text-decoration: underline; cursor: pointer;" title="ចុចដើម្បីមើលប្រវត្តិស្នើសុំរបស់បុគ្គលិកនេះ (View Request History)">
            ${StatusCalculator ? StatusCalculator.format4DigitId(r.staffId) : (r.staffId || '-')}
          </a>
        </td>
        <td style="font-weight: 800; color: var(--text-primary);">${r.fullName || '-'}</td>
        <td style="text-align: center;">${r.gender || '-'}</td>
        <td>${r.position || '-'}</td>
        <td>${StatusCalculator ? StatusCalculator.formatDateDisplay(r.dob) : (r.dob || '-')}</td>
        <td>${StatusCalculator ? StatusCalculator.formatDateDisplay(r.serviceStartDate) : (r.serviceStartDate || '-')}</td>
        <td><strong style="color: #0891b2;">${StatusCalculator ? StatusCalculator.formatDateDisplay(r.promotionDate) : (r.promotionDate || '-')}</strong></td>
        <td style="font-weight: 700;">${r.currentRank || '-'}</td>
        <td style="color: #4f46e5; font-weight: 800;">${r.requestedRank || '-'}</td>
        <td style="color: #dc2626; font-weight: 800;">${r.promotedRank || '-'}</td>
        <td>${r.prakasNo || '-'}</td>
        <td>${r.degree || '-'}</td>
        <td style="font-size: 0.76rem; color: var(--text-muted);">${r.otherRemark || '-'}</td>
        
        <!-- System Calculated Fields -->
        <td style="text-align: center; font-weight: 800; color: #2563eb; background: rgba(37, 99, 235, 0.05);">${StatusCalculator ? StatusCalculator.formatDateDisplay(r.calcDate) : (r.calcDate || '-')}</td>
        <td style="text-align: center; font-weight: 800; color: var(--text-primary);">${r.actualDurationText}</td>
        <td style="text-align: center; font-weight: 800; color: ${r.hasSuspension ? '#dc2626' : 'var(--text-muted)'}; background: ${r.hasSuspension ? 'rgba(220, 38, 38, 0.08)' : 'transparent'};">
          ${r.hasSuspension ? `⚠️ ${r.suspensionDurationText}` : 'គ្មាន'}
        </td>
        <td style="text-align: center; font-weight: 800; color: ${r.remainingDays > 0 ? '#d97706' : '#059669'};">${r.remainingDurationText}</td>
        <td style="font-weight: 800; color: #7c3aed; text-align: center;">${StatusCalculator ? StatusCalculator.formatDateDisplay(r.newMaturedPromotionDateStr) : (r.newMaturedPromotionDateStr || '-')}</td>
        <td style="font-weight: 800; color: #0284c7; text-align: center;">${StatusCalculator ? StatusCalculator.formatDateDisplay(r.nextEligibleDateStr) : (r.nextEligibleDateStr || '-')}</td>
        <td style="text-align: center;">
          <span class="status-badge ${r.statusCssClass}">
            ${r.statusLabel}
          </span>
        </td>
        <td style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); text-align: center;">
          ${r.historyReasonText || '-'}
        </td>
      </tr>
    `).join('');
  }

  /**
   * Render Import History Log Table
   */
  renderImportHistoryTable() {
    const tbody = document.getElementById('promotion-import-history-tbody');
    if (!tbody) return;

    const batches = dataStore.getPromotionBatches() || [];
    if (batches.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">
            គ្មានកំណត់ត្រានាំចូល (Import History) នៅឡើយទេ។
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = batches.map(b => `
      <tr>
        <td style="font-weight: 700;">${b.importDate || '-'}</td>
        <td style="font-weight: 800; color: var(--primary);">${b.month || '-'}</td>
        <td style="font-weight: 800;">${b.year || '-'}</td>
        <td style="font-weight: 700;">📄 ${b.fileName || '-'}</td>
        <td style="text-align: center;"><span class="badge" style="background: rgba(16, 185, 129, 0.12); color: #10b981; font-weight: 800;">${b.totalRows} ជួរ</span></td>
        <td>${b.importedBy || 'Admin'}</td>
        <td style="font-size: 0.8rem; color: var(--text-muted);">${b.remark || '-'}</td>
        <td style="text-align: center;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="promotionController.deleteBatch('${b.id}')" style="color: #dc2626; border-color: rgba(220, 38, 38, 0.3);" title="លុប Batch នេះ">
            <i data-lucide="trash-2"></i>
          </button>
        </td>
      </tr>
    `).join('');
  }

  /**
   * Change Calculation Reference Date
   */
  handleCalcDateChange(newDateStr) {
    if (!newDateStr) return;
    this.calcDate = this.formatDDMMMYYYY(newDateStr);
    this.render();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`📅 បានប្តូរថ្ងៃខែឆ្នាំគិតគូរទៅជា ${this.calcDate}!`, 'info');
    }
  }

  loadCalcDateFromUI() {
    const input = document.getElementById('promotion-calc-date-input');
    if (input && input.value) {
      this.calcDate = this.formatDDMMMYYYY(input.value);
    }
  }

  /**
   * Filter Handlers
   */
  handleSearch(val) {
    this.filters.searchQuery = val;
    this.currentPage = 1;
    this.render();
  }

  handleFilterChange(field, val) {
    this.filters[field] = val;
    this.currentPage = 1;
    this.render();
  }

  filterByKPI(kpiKey) {
    this.filters = {
      searchQuery: '',
      year: 'all',
      month: 'all',
      department: 'all',
      office: 'all',
      position: 'all',
      promotionRank: 'all',
      status: 'all',
      staffDataMatch: 'all',
      hasSuspension: 'all'
    };

    if (kpiKey === 'ELIGIBLE') this.filters.status = 'ELIGIBLE';
    if (kpiKey === 'INELIGIBLE') this.filters.status = 'INELIGIBLE';
    if (kpiKey === 'NEAR_ELIGIBLE') this.filters.status = 'NEAR_ELIGIBLE';
    if (kpiKey === 'MATCHED') this.filters.staffDataMatch = 'matched';
    if (kpiKey === 'UNMATCHED') this.filters.staffDataMatch = 'unmatched';
    if (kpiKey === 'SUSPENSION') this.filters.hasSuspension = 'yes';

    this.currentPage = 1;
    this.render();
  }

  resetFilters() {
    this.filters = {
      searchQuery: '',
      year: 'all',
      month: 'all',
      department: 'all',
      office: 'all',
      position: 'all',
      promotionRank: 'all',
      status: 'all',
      staffDataMatch: 'all',
      hasSuspension: 'all'
    };
    this.selectedBatchId = 'all';
    this.currentPage = 1;
    this.render();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast('🔄 បានសម្អាតតម្រងទាំងអស់!', 'info');
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

  populateFilterDropdowns() {
    const rawRecords = dataStore.getPromotionRecords() || [];
    
    const yearsSet = new Set();
    const monthsSet = new Set();
    const deptsSet = new Set();
    const positionsSet = new Set();
    const ranksSet = new Set();

    rawRecords.forEach(r => {
      const yr = r.importYear || (r.promotionDate ? String(r.promotionDate).slice(-4) : '') || (r.serviceStartDate ? String(r.serviceStartDate).slice(-4) : '');
      if (yr) yearsSet.add(String(yr));
      if (r.importMonth) monthsSet.add(String(r.importMonth));
      if (r.department) deptsSet.add(String(r.department));
      if (r.position) positionsSet.add(String(r.position));
      if (r.requestedRank || r.currentRank) ranksSet.add(String(r.requestedRank || r.currentRank));
    });

    const populate = (id, set, label) => {
      const el = document.getElementById(id);
      if (!el) return;
      const cur = el.value || 'all';
      el.innerHTML = `<option value="all">🎯 ${label}</option>`;
      Array.from(set).sort().forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        el.appendChild(opt);
      });
      if (cur && (cur === 'all' || Array.from(set).includes(cur))) {
        el.value = cur;
      } else {
        el.value = 'all';
      }
    };

    populate('promo-filter-year', yearsSet, 'គ្រប់ឆ្នាំ (All Years)');
    populate('promo-filter-month', monthsSet, 'គ្រប់ខែ (All Months)');
    populate('promo-filter-dept', deptsSet, 'គ្រប់អង្គភាព (All Depts)');
    populate('promo-filter-position', positionsSet, 'គ្រប់តួនាទី (All Positions)');
    populate('promo-filter-rank', ranksSet, 'គ្រប់ឋានន្តរស័ក្តិ (All Ranks)');
  }

  /**
   * STEP 1 — Open Import Warning Modal
   */
  startImportFlow() {
    const warningModal = document.getElementById('promotion-import-warning-modal');
    if (warningModal) {
      warningModal.style.display = 'flex';
    }
  }

  closeImportWarningModal() {
    const warningModal = document.getElementById('promotion-import-warning-modal');
    if (warningModal) warningModal.style.display = 'none';
  }

  confirmImportWarning() {
    this.closeImportWarningModal();
    const fileInput = document.getElementById('promotion-excel-file-input');
    if (fileInput) {
      fileInput.click();
    }
  }

  /**
   * STEP 2 — Handle Selected Excel File
   */
  handleFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    this.pendingFile = file;
    
    if (typeof XLSX === 'undefined') {
      if (typeof app !== 'undefined') app.showToast('❌ SheetJS (XLSX) Library មិនទាន់ដំណើរការ', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (jsonRows.length === 0) {
          if (typeof app !== 'undefined') app.showToast('⚠️ ឯកសារ Excel គ្មានទិន្នន័យឡើយ!', 'warning');
          return;
        }

        this.parsedRawRows = jsonRows;
        this.openImportMetaModal(file.name, jsonRows.length);
      } catch (err) {
        console.error('Error reading Excel file:', err);
        if (typeof app !== 'undefined') app.showToast('❌ មានបញ្ហាក្នុងការអានឯកសារ Excel!', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  }

  /**
   * Handle Drag & Drop File Upload
   */
  handleFileDropped(event) {
    const files = event.dataTransfer ? event.dataTransfer.files : null;
    if (files && files.length > 0) {
      const fileInput = document.getElementById('promotion-excel-file-input');
      if (fileInput) {
        try {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(files[0]);
          fileInput.files = dataTransfer.files;
        } catch (e) {}
      }
      this.handleFileSelected({ target: { files: files } });
    }
  }

  /**
   * Promotion Remark Options Manager (Droplist & Write-in)
   */
  getPromotionRemarkOptions() {
    try {
      const saved = JSON.parse(localStorage.getItem('STAFF_PROMOTION_REMARK_OPTIONS'));
      if (Array.isArray(saved) && saved.length > 0) return saved;
    } catch (e) {}

    return [
      'ស្នើសុំឡើងឋានន្តរស័ក្តិប្រចាំខែសីហា ឆ្នាំ២០២៦',
      'តាមកម្រិតសញ្ញាបត្រ',
      'តាមអតីតភាពការងារ',
      'តាមលក្ខខណ្ឌពិសេស',
      'តាមការប្រឡងប្រជែង',
      'ស្នើសុំឡើងថ្នាក់តាមការវាយតម្លៃ'
    ];
  }

  savePromotionRemarkOptions(options) {
    localStorage.setItem('STAFF_PROMOTION_REMARK_OPTIONS', JSON.stringify(options));
  }

  populateRemarkDroplist() {
    const select = document.getElementById('promo-meta-remark-select');
    if (!select) return;

    const options = this.getPromotionRemarkOptions();
    select.innerHTML = options.map(opt => `<option value="${opt}">${opt}</option>`).join('') + `
      <option value="__CUSTOM__">✍️ បញ្ចូលកំណត់សម្គាល់ផ្ទាល់ខ្លួន... (Custom Write-in)</option>
    `;

    const textInput = document.getElementById('promo-meta-remark-text');
    if (textInput && options.length > 0) {
      textInput.value = options[0];
    }
  }

  handleRemarkSelectChange(val) {
    const customWrap = document.getElementById('promo-meta-remark-custom-wrap');
    const textInput = document.getElementById('promo-meta-remark-text');

    if (val === '__CUSTOM__') {
      if (textInput) {
        textInput.value = '';
        textInput.focus();
      }
    } else {
      if (textInput) textInput.value = val;
    }
  }

  openManageRemarksModal() {
    const modal = document.getElementById('promotion-remarks-manage-modal');
    if (!modal) return;
    this.renderManageRemarksList();
    modal.style.display = 'flex';
  }

  closeManageRemarksModal() {
    const modal = document.getElementById('promotion-remarks-manage-modal');
    if (modal) modal.style.display = 'none';
  }

  renderManageRemarksList() {
    const tbody = document.getElementById('promo-remarks-manage-tbody');
    if (!tbody) return;

    const options = this.getPromotionRemarkOptions();
    tbody.innerHTML = options.map((opt, idx) => `
      <tr>
        <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
        <td>
          <input type="text" class="form-control form-control-sm" value="${opt}" id="remark-edit-input-${idx}" style="font-weight: 600;">
        </td>
        <td style="text-align: center; white-space: nowrap;">
          <button type="button" class="btn btn-sm btn-secondary" onclick="promotionController.saveEditRemarkOption(${idx})" style="color: #059669; font-weight: 700; padding: 3px 8px; margin-right: 4px;" title="រក្សាទុកការកែប្រែ">
            💾 រក្សាទុក
          </button>
          <button type="button" class="btn btn-sm btn-secondary" onclick="promotionController.deleteRemarkOption(${idx})" style="color: #dc2626; font-weight: 700; padding: 3px 8px;" title="លុបជម្រើសនេះ">
            🗑️ លុប
          </button>
        </td>
      </tr>
    `).join('');
  }

  addNewRemarkOption() {
    const input = document.getElementById('promo-add-new-remark-input');
    if (!input || !input.value.trim()) {
      if (typeof app !== 'undefined') app.showToast('⚠️ សូមបញ្ចូលអត្ថបទកំណត់សម្គាល់មុននឹងបន្ថែម!', 'warning');
      return;
    }

    const val = input.value.trim();
    const options = this.getPromotionRemarkOptions();
    if (!options.includes(val)) {
      options.push(val);
      this.savePromotionRemarkOptions(options);
      this.populateRemarkDroplist();
      this.renderManageRemarksList();
      input.value = '';
      if (typeof app !== 'undefined' && app.showToast) {
        app.showToast('✅ បានបន្ថែមជម្រើសកំណត់សម្គាល់ថ្មីរួចរាល់!', 'success');
      }
    }
  }

  saveEditRemarkOption(idx) {
    const input = document.getElementById(`remark-edit-input-${idx}`);
    if (!input || !input.value.trim()) return;

    const options = this.getPromotionRemarkOptions();
    options[idx] = input.value.trim();
    this.savePromotionRemarkOptions(options);
    this.populateRemarkDroplist();
    this.renderManageRemarksList();

    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast('💾 បានកែប្រែជម្រើសកំណត់សម្គាល់រួចរាល់!', 'success');
    }
  }

  deleteRemarkOption(idx) {
    const options = this.getPromotionRemarkOptions();
    if (options.length <= 1) {
      if (typeof app !== 'undefined') app.showToast('⚠️ មិនអាចលុបជម្រើសទាំងអស់បានឡើយ!', 'warning');
      return;
    }
    options.splice(idx, 1);
    this.savePromotionRemarkOptions(options);
    this.populateRemarkDroplist();
    this.renderManageRemarksList();

    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast('🗑️ បានលុបជម្រើសកំណត់សម្គាល់រួចរាល់!', 'info');
    }
  }

  /**
   * STEP 3 — Open Import Information Modal (Month, Year, Remark)
   */
  openImportMetaModal(fileName, totalRows) {
    const modal = document.getElementById('promotion-import-meta-modal');
    if (!modal) return;

    const fileNameEl = document.getElementById('promo-meta-filename');
    const countEl = document.getElementById('promo-meta-count');

    if (fileNameEl) fileNameEl.textContent = fileName;
    if (countEl) countEl.textContent = `${totalRows} ជួរ`;

    this.populateRemarkDroplist();

    modal.style.display = 'flex';
  }

  closeImportMetaModal() {
    const modal = document.getElementById('promotion-import-meta-modal');
    if (modal) modal.style.display = 'none';
  }

  /**
   * STEP 4 — Process Import Data and Check Duplicates
   */
  submitImportMeta() {
    const selectEl = document.getElementById('promo-meta-remark-select');
    const textEl = document.getElementById('promo-meta-remark-text');
    let remarkVal = textEl?.value?.trim() || selectEl?.value;
    if (!remarkVal || remarkVal === '__CUSTOM__') {
      remarkVal = 'ស្នើសុំឡើងឋានន្តរស័ក្តិ';
    }

    this.closeImportMetaModal();

    // Map Excel Headers to 15 Master Fields
    const mappedRows = this.parsedRawRows.map((r, idx) => {
      const getVal = (possibleKeys) => {
        const rowKeys = Object.keys(r);
        for (let keyName of possibleKeys) {
          const matchKey = rowKeys.find(rk => rk.trim().toLowerCase() === keyName.trim().toLowerCase());
          if (matchKey && r[matchKey] !== undefined && r[matchKey] !== null && String(r[matchKey]).trim() !== '') {
            let res = String(r[matchKey]).trim();
            if (res.endsWith('.0')) res = res.slice(0, -2);
            return res;
          }
        }
        return '';
      };

      return {
        no: idx + 1,
        staffId: getVal(['អត្តលេខ', 'Staff ID', 'ID', 'អត្តលេខ អពដ']),
        fullName: getVal(['គោត្តនាម និងនាម', 'ឈ្មោះ', 'Full Name', 'Name', 'គោត្តនាម និង នាម']),
        gender: getVal(['ភេទ', 'Gender']),
        position: getVal(['តួនាទី', 'Position', 'មុខតំណែង']),
        dob: getVal(['ថ្ងៃខែឆ្នាំកំណើត', 'DOB', 'Date of Birth']),
        serviceStartDate: getVal(['ថ្ងៃខែឆ្នាំចូលបម្រើការងារ', 'Service Start Date', 'ថ្ងៃចូលធ្វើការ']),
        promotionDate: getVal(['ថ្ងៃខែឆ្នាំឡើងឋានន្តរស័ក្តិ', 'Promotion Date', 'ថ្ងៃឡើងថ្នាក់']),
        currentRank: getVal(['ឋានន្តរស័ក្តិ និងថ្នាក់បច្ចុប្បន្ន', 'Current Rank', 'ឋានន្តរស័ក្តិបច្ចុប្បន្ន']),
        requestedRank: getVal(['ការស្នើសុំ', 'Requested Rank', 'ស្នើសុំ']),
        promotedRank: getVal(['បានដំឡើង', 'Promoted Rank']),
        prakasNo: getVal(['ប្រកាសដំឡើង', 'Prakas No.', 'ប្រកាសលេខ']),
        finalRank: getVal(['ឋានន្តរស័ក្តិថ្នាក់ចុងក្រោយ', 'Final Rank']),
        degree: getVal(['កម្រិតសញ្ញាបត្រ', 'Degree', 'សញ្ញាបត្រ']),
        otherRemark: getVal(['ផ្សេងៗ', 'Remark', 'Description']),
        importYear: yearVal,
        importMonth: monthVal,
        batchRemark: remarkVal
      };
    });

    // Check Import Mode selection from radio buttons in Import Modal
    const importMode = document.querySelector('input[name="promoImportMode"]:checked')?.value || 'append';

    let existingRecords = dataStore.getPromotionRecords() || [];
    const isOnlySampleData = existingRecords.length > 0 && existingRecords.every(r => r.isSample);

    if (isOnlySampleData || importMode === 'overwrite') {
      this.finalizeImport(mappedRows, 'OVERWRITE_ALL');
      return;
    }

    // Check for Duplicate Entries with existing non-sample records
    const nonSampleRecords = existingRecords.filter(r => !r.isSample);
    const duplicates = [];

    mappedRows.forEach(row => {
      const sId = row.staffId ? String(row.staffId).trim().toLowerCase() : '';
      const name = row.fullName ? String(row.fullName).trim().toLowerCase() : '';

      const match = nonSampleRecords.find(e => 
        (sId && String(e.staffId).trim().toLowerCase() === sId) ||
        (name && String(e.fullName).trim().toLowerCase() === name)
      );

      if (match) {
        duplicates.push({ newRow: row, existingRow: match });
      }
    });

    if (duplicates.length > 0) {
      this.duplicateMatches = duplicates;
      this.pendingMappedRows = mappedRows;
      this.openDuplicateModal(duplicates.length);
    } else {
      this.finalizeImport(mappedRows, 'IMPORT_ALL');
    }
  }

  /**
   * STEP 5 — Handle Duplicate Warning Options
   */
  openDuplicateModal(dupCount) {
    const modal = document.getElementById('promotion-duplicate-modal');
    if (!modal) return;

    const countEl = document.getElementById('promo-dup-count');
    if (countEl) countEl.textContent = `${dupCount} នាក់`;

    modal.style.display = 'flex';
  }

  closeDuplicateModal() {
    const modal = document.getElementById('promotion-duplicate-modal');
    if (modal) modal.style.display = 'none';
  }

  resolveDuplicates(actionOption) {
    this.closeDuplicateModal();
    if (!this.pendingMappedRows) return;

    if (actionOption === 'CANCEL') {
      if (typeof app !== 'undefined') app.showToast('ℹ️ បានបោះបង់ការនាំចូលទិន្នន័យ', 'info');
      return;
    }

    let finalRowsToImport = [];

    if (actionOption === 'SKIP') {
      const dupSet = new Set(this.duplicateMatches.map(d => d.newRow.staffId || d.newRow.fullName));
      finalRowsToImport = this.pendingMappedRows.filter(r => !dupSet.has(r.staffId || r.fullName));
    } else {
      finalRowsToImport = this.pendingMappedRows;
    }

    this.finalizeImport(finalRowsToImport, actionOption);
  }

  /**
   * Finalize Import Batch and Save Records
   */
  finalizeImport(rowsToImport, actionOption) {
    if (!rowsToImport || rowsToImport.length === 0) {
      if (typeof app !== 'undefined') app.showToast('⚠️ គ្មានទិន្នន័យថ្មីត្រូវនាំចូលឡើយ!', 'warning');
      return;
    }

    const monthVal = document.getElementById('promo-meta-month')?.value || 'សីហា';
    const yearVal = document.getElementById('promo-meta-year')?.value || '2026';
    
    const selectEl = document.getElementById('promo-meta-remark-select');
    const textEl = document.getElementById('promo-meta-remark-text');
    let remarkVal = textEl?.value?.trim() || selectEl?.value;
    if (!remarkVal || remarkVal === '__CUSTOM__') {
      remarkVal = `ស្នើសុំឡើងឋានន្តរស័ក្តិប្រចាំខែ${monthVal} ឆ្នាំ${yearVal}`;
    }

    const batchId = 'BATCH_' + Date.now();
    const batchObj = {
      id: batchId,
      importDate: new Date().toLocaleDateString('km-KH') + ' ' + new Date().toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit' }),
      month: monthVal,
      year: yearVal,
      fileName: this.pendingFile ? this.pendingFile.name : 'Import_File.xlsx',
      totalRows: rowsToImport.length,
      importedBy: 'Admin',
      remark: remarkVal
    };

    const taggedRows = rowsToImport.map(r => ({
      ...r,
      batchId: batchId
    }));

    let existingRecords = dataStore.getPromotionRecords() || [];
    // Clear sample records when real user data is imported
    existingRecords = existingRecords.filter(r => !r.isSample);

    let updatedRecords = [];

    if (actionOption === 'OVERWRITE_ALL') {
      updatedRecords = taggedRows;
    } else if (actionOption === 'UPDATE_EXISTING') {
      updatedRecords = [...existingRecords];
      taggedRows.forEach(newR => {
        const sId = newR.staffId ? String(newR.staffId).trim().toLowerCase() : '';
        const name = newR.fullName ? String(newR.fullName).trim().toLowerCase() : '';
        const idx = updatedRecords.findIndex(e => (sId && String(e.staffId).trim().toLowerCase() === sId) || (name && String(e.fullName).trim().toLowerCase() === name));
        if (idx !== -1) {
          updatedRecords[idx] = newR;
        } else {
          updatedRecords.push(newR);
        }
      });
    } else {
      updatedRecords = [...existingRecords, ...taggedRows];
    }

    dataStore.savePromotionRecords(updatedRecords);

    const batches = dataStore.getPromotionBatches() || [];
    batches.unshift(batchObj);
    dataStore.savePromotionBatches(batches);

    // Reset filters to show all imported records immediately
    this.selectedBatchId = 'all';
    this.filters = {
      searchQuery: '',
      year: 'all',
      month: 'all',
      department: 'all',
      office: 'all',
      position: 'all',
      promotionRank: 'all',
      status: 'all',
      staffDataMatch: 'all',
      hasSuspension: 'all'
    };
    this.currentPage = 1;
    this.populateFilterDropdowns();
    this.render();

    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`🎉 បាននាំចូលទិន្នន័យបុគ្គលិកសរុបចំនួន ${rowsToImport.length} នាក់ ដោយជោគជ័យ!`, 'success');
    }

    this.openSuccessModal(
      rowsToImport.length,
      this.pendingFile ? this.pendingFile.name : 'Import_File.xlsx',
      `ខែ${monthVal} ឆ្នាំ${yearVal}`,
      remarkVal
    );
  }

  openSuccessModal(count, fileName, period, remark) {
    const modal = document.getElementById('promotion-import-success-modal');
    if (!modal) return;

    const countEl = document.getElementById('promo-success-count');
    const fileEl = document.getElementById('promo-success-file');
    const periodEl = document.getElementById('promo-success-period');
    const remarkEl = document.getElementById('promo-success-remark');

    if (countEl) countEl.textContent = `${count} នាក់`;
    if (fileEl) fileEl.textContent = fileName || '-';
    if (periodEl) periodEl.textContent = period || '-';
    if (remarkEl) remarkEl.textContent = remark || '-';

    modal.style.display = 'flex';
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  }

  closeSuccessModal() {
    const modal = document.getElementById('promotion-import-success-modal');
    if (modal) modal.style.display = 'none';
  }

  deleteBatch(batchId) {
    if (!confirm('តើអ្នកពិតជាចង់លុប Batch នាំចូលនេះមែនដែរឬទេ? ទិន្នន័យទាំងអស់ក្នុង Batch នេះនឹងត្រូវលុបចេញពីប្រព័ន្ធ។')) return;

    let records = dataStore.getPromotionRecords() || [];
    records = records.filter(r => r.batchId !== batchId);
    dataStore.savePromotionRecords(records);

    let batches = dataStore.getPromotionBatches() || [];
    batches = batches.filter(b => b.id !== batchId);
    dataStore.savePromotionBatches(batches);

    this.render();
    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast('🗑️ បានលុប Batch នាំចូល និងទិន្នន័យពាក់ព័ន្ធរួចរាល់!', 'info');
    }
  }

  /**
   * Export Promotion Analysis Data as Excel (.xlsx)
   */
  exportExcel() {
    if (typeof XLSX === 'undefined') {
      if (typeof app !== 'undefined') app.showToast('❌ SheetJS (XLSX) Library មិនទាន់ដំណើរការ', 'error');
      return;
    }

    const records = this.getProcessedRecords();
    if (records.length === 0) {
      if (typeof app !== 'undefined') app.showToast('⚠️ គ្មានទិន្នន័យសម្រាប់ Export ឡើយ!', 'warning');
      return;
    }

    const wb = XLSX.utils.book_new();

    const headers = [
      'ល.រ', 'អត្តលេខ', 'គោត្តនាម និងនាម', 'ភេទ', 'តួនាទី', 'ថ្ងៃខែឆ្នាំកំណើត',
      'ថ្ងៃខែឆ្នាំចូលបម្រើការងារ', 'ថ្ងៃខែឆ្នាំឡើងឋានន្តរស័ក្តិ', 'ឋានន្តរស័ក្តិ និងថ្នាក់បច្ចុប្បន្ន',
      'ការស្នើសុំ', 'បានដំឡើង', 'ប្រកាសដំឡើង', 'តាមកម្រិត', 'ផ្សេងៗ',
      'ថ្ងៃខែឆ្នាំគិតគូរ', 'រយៈពេលបានប្រើ',
      'រយៈពេលព្យួរ/បាត់បង់សិទ្ធិ', 'រយៈពេលនៅសល់', 'ថ្ងៃគ្រប់កាលកំណត់ថ្មី', 'ថ្ងៃខែឆ្នាំអាចស្នើសុំបាន', 'ស្ថានភាព', 'Reason / Remark'
    ];

    const rows = records.map((r, i) => [
      i + 1, r.staffId || '', r.fullName || '', r.gender || '', r.position || '',
      StatusCalculator ? StatusCalculator.formatDateDisplay(r.dob) : (r.dob || ''),
      StatusCalculator ? StatusCalculator.formatDateDisplay(r.serviceStartDate) : (r.serviceStartDate || ''),
      StatusCalculator ? StatusCalculator.formatDateDisplay(r.promotionDate) : (r.promotionDate || ''),
      r.currentRank || '', r.requestedRank || '',
      r.promotedRank || '', r.prakasNo || '', r.degree || '', r.otherRemark || '',
      StatusCalculator ? StatusCalculator.formatDateDisplay(r.calcDate) : (r.calcDate || ''),
      r.actualDurationText || '', r.suspensionDurationText || 'គ្មាន', r.remainingDurationText || '',
      StatusCalculator ? StatusCalculator.formatDateDisplay(r.newMaturedPromotionDateStr) : (r.newMaturedPromotionDateStr || ''),
      StatusCalculator ? StatusCalculator.formatDateDisplay(r.nextEligibleDateStr) : (r.nextEligibleDateStr || ''),
      r.statusLabel || '', r.historyReasonText || '-'
    ]);

    const wsData = [
      ['របាយការណ៍គ្រប់គ្រង និងត្រួតពិនិត្យការស្នើសុំឡើងឋានន្តរស័ក្តិ (Staff Promotion Eligibility Report)'],
      [`ថ្ងៃខែឆ្នាំគិតគូរ៖ ${this.calcDate} | សរុបសំណើ៖ ${records.length} | កាលបរិច្ឆេទ Export៖ ${new Date().toLocaleDateString('km-KH')}`],
      [],
      headers,
      ...rows
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Promotion Eligibility');

    const fileName = `Promotion_Eligibility_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);

    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`📊 បានទាញយករបាយការណ៍ឡើងឋានន្តរស័ក្តិ ${fileName} ដោយជោគជ័យ!`, 'success');
    }
  }

  /**
   * Export CSV File for Eligible, Ineligible or All records
   */
  exportCSV(filterType = 'all') {
    const allRecords = this.getProcessedRecords();
    let recordsToExport = allRecords;
    let fileSuffix = 'All';

    if (filterType === 'eligible') {
      recordsToExport = allRecords.filter(r => r.statusKey === 'ELIGIBLE');
      fileSuffix = 'Eligible_អាចស្នើបាន';
    } else if (filterType === 'ineligible') {
      recordsToExport = allRecords.filter(r => r.statusKey === 'INELIGIBLE' || r.statusKey === 'NEAR_ELIGIBLE');
      fileSuffix = 'Ineligible_មិនទាន់អាច';
    }

    if (recordsToExport.length === 0) {
      if (typeof app !== 'undefined' && app.showToast) {
        app.showToast('⚠️ គ្មានទិន្នន័យសម្រាប់ Export ជា CSV ឡើយ!', 'warning');
      }
      return;
    }

    const headers = [
      'ល.រ', 'អត្តលេខ', 'គោត្តនាម និងនាម', 'ភេទ', 'តួនាទី', 'ថ្ងៃខែឆ្នាំកំណើត',
      'ថ្ងៃខែឆ្នាំចូលបម្រើការងារ', 'ថ្ងៃខែឆ្នាំឡើងឋានន្តរស័ក្តិ', 'ឋានន្តរស័ក្តិ និងថ្នាក់បច្ចុប្បន្ន',
      'ការស្នើសុំ', 'បានដំឡើង', 'ប្រកាសដំឡើង', 'តាមកម្រិត', 'ផ្សេងៗ',
      'ថ្ងៃខែឆ្នាំគិតគូរ', 'រយៈពេលបានប្រើ',
      'រយៈពេលព្យួរ/បាត់បង់សិទ្ធិ', 'រយៈពេលនៅសល់', 'ថ្ងៃគ្រប់កាលកំណត់ថ្មី', 'ថ្ងៃខែឆ្នាំអាចស្នើសុំបាន', 'ស្ថានភាព', 'Reason / Remark'
    ];

    const escapeCSV = (str) => {
      if (str === null || str === undefined) return '""';
      const valStr = String(str).replace(/"/g, '""');
      return `"${valStr}"`;
    };

    let csvContent = '\uFEFF'; // UTF-8 BOM for Khmer text support in MS Excel
    csvContent += headers.map(escapeCSV).join(',') + '\r\n';

    recordsToExport.forEach((r, i) => {
      const rowData = [
        i + 1,
        r.staffId || '',
        r.fullName || '',
        r.gender || '',
        r.position || '',
        StatusCalculator ? StatusCalculator.formatDateDisplay(r.dob) : (r.dob || ''),
        StatusCalculator ? StatusCalculator.formatDateDisplay(r.serviceStartDate) : (r.serviceStartDate || ''),
        StatusCalculator ? StatusCalculator.formatDateDisplay(r.promotionDate) : (r.promotionDate || ''),
        r.currentRank || '',
        r.requestedRank || '',
        r.promotedRank || '',
        r.prakasNo || '',
        r.degree || '',
        r.otherRemark || '',
        StatusCalculator ? StatusCalculator.formatDateDisplay(r.calcDate) : (r.calcDate || ''),
        r.actualDurationText || '',
        r.suspensionDurationText || 'គ្មាន',
        r.remainingDurationText || '',
        StatusCalculator ? StatusCalculator.formatDateDisplay(r.newMaturedPromotionDateStr) : (r.newMaturedPromotionDateStr || ''),
        StatusCalculator ? StatusCalculator.formatDateDisplay(r.nextEligibleDateStr) : (r.nextEligibleDateStr || ''),
        r.statusLabel || '',
        r.historyReasonText || '-'
      ];
      csvContent += rowData.map(escapeCSV).join(',') + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const fileName = `Promotion_${fileSuffix}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`📄 បានទាញយកឯកសារ CSV (${fileName}) ដោយជោគជ័យ!`, 'success');
    }
  }

  /**
   * Print Report A or Report B
   */
  printReport(reportType = 'all') {
    const allRecords = this.getProcessedRecords();
    let recordsToPrint = allRecords;

    let reportTitle = 'របាយការណ៍សរុបការស្នើសុំឡើងឋានន្តរស័ក្តិ';
    if (reportType === 'eligible') {
      recordsToPrint = allRecords.filter(r => r.statusKey === 'ELIGIBLE');
      reportTitle = 'របាយការណ៍បុគ្គលិកដែលមានសិទ្ធិគ្រប់លក្ខខណ្ឌស្នើសុំឡើងឋានន្តរស័ក្តិ (Report A)';
    } else if (reportType === 'ineligible') {
      recordsToPrint = allRecords.filter(r => r.statusKey === 'INELIGIBLE' || r.statusKey === 'NEAR_ELIGIBLE');
      reportTitle = 'របាយការណ៍បុគ្គលិកដែលមិនទាន់គ្រប់លក្ខខណ្ឌស្នើសុំឡើងឋានន្តរស័ក្តិ (Report B)';
    }

    if (recordsToPrint.length === 0) {
      if (typeof app !== 'undefined' && app.showToast) {
        app.showToast('⚠️ គ្មានទិន្នន័យសម្រាប់បោះពុម្ពតាមលក្ខខណ្ឌដែលបានជ្រើសរើសឡើយ!', 'warning');
      }
      return;
    }

    const target = document.getElementById('official-report-render-target');
    if (!target) {
      window.print();
      return;
    }

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
            ${reportTitle}
          </h2>
          <div style="font-size: 8.5pt; color: #334155; margin-bottom: 0.25rem;">
            (គិតត្រឹមថ្ងៃទី៖ <strong>${this.calcDate}</strong>)
          </div>
          <div style="font-size: 9pt; font-weight: bold; color: #0f172a;">
            ចំនួនបុគ្គលិកសរុប៖ <strong>${recordsToPrint.length} នាក់</strong>
          </div>
        </div>

        <!-- PRINTABLE TABLE -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; font-size: 8pt; border: 1px solid #000;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 35px;">ល.រ</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: left;">ឈ្មោះបុគ្គលិក</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 75px;">អត្តលេខ</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: left;">តួនាទី / អង្គភាព</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 85px;">ថ្ងៃឡើងថ្នាក់</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: left;">ឋានន្តរស័ក្តិបច្ចុប្បន្ន ➔ ការស្នើសុំ</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: left; width: 110px;">រយៈពេលបានប្រើ</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: left; width: 100px;">រយៈពេលព្យួរ</th>
              ${reportType === 'ineligible' ? '<th style="border: 1px solid #000; padding: 4px; text-align: center; width: 85px;">ថ្ងៃអាចស្នើបាន</th>' : ''}
              <th style="border: 1px solid #000; padding: 4px; text-align: center;">ស្ថានភាព & មូលហេតុ</th>
            </tr>
          </thead>
          <tbody>
            ${recordsToPrint.map((r, i) => `
              <tr>
                <td style="border: 1px solid #000; padding: 3px; text-align: center;">${i + 1}</td>
                <td style="border: 1px solid #000; padding: 3px;"><strong>${r.fullName || '-'}</strong></td>
                <td style="border: 1px solid #000; padding: 3px; text-align: center;">${r.staffId || '-'}</td>
                <td style="border: 1px solid #000; padding: 3px;">${r.position || '-'} (${r.department || '-'})</td>
                <td style="border: 1px solid #000; padding: 3px; text-align: center;">${r.promotionDate || '-'}</td>
                <td style="border: 1px solid #000; padding: 3px;">${r.currentRank || '-'} ➔ <strong>${r.requestedRank || '-'}</strong></td>
                <td style="border: 1px solid #000; padding: 3px; font-weight: bold;">${r.actualDurationText}</td>
                <td style="border: 1px solid #000; padding: 3px;">${r.hasSuspension ? r.suspensionDurationText : 'គ្មាន'}</td>
                ${reportType === 'ineligible' ? `<td style="border: 1px solid #000; padding: 3px; text-align: center; font-weight: bold;">${r.nextEligibleDateStr}</td>` : ''}
                <td style="border: 1px solid #000; padding: 3px; font-size: 7.5pt;">
                  <strong style="color: ${r.statusKey === 'ELIGIBLE' ? '#059669' : '#dc2626'};">${r.statusLabel}</strong><br>
                  <span>${r.reason}</span>
                </td>
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

  /**
   * Download Standard Excel Template for Promotion Data (.xlsx)
   */
  downloadExcelTemplate() {
    if (typeof XLSX === 'undefined') {
      if (typeof app !== 'undefined') app.showToast('❌ SheetJS (XLSX) Library មិនទាន់ដំណើរការ', 'error');
      return;
    }

    const headers = [
      'ល.រ',
      'អត្តលេខ',
      'គោត្តនាម និងនាម',
      'ភេទ',
      'តួនាទី',
      'ថ្ងៃខែឆ្នាំកំណើត',
      'ថ្ងៃខែឆ្នាំចូលបម្រើការងារ',
      'ថ្ងៃខែឆ្នាំឡើងឋានន្តរស័ក្តិ',
      'ឋានន្តរស័ក្តិ និងថ្នាក់បច្ចុប្បន្ន',
      'ការស្នើសុំ',
      'បានដំឡើង',
      'ប្រកាសដំឡើង',
      'ឋានន្តរស័ក្តិថ្នាក់ចុងក្រោយ',
      'កម្រិតសញ្ញាបត្រ',
      'ផ្សេងៗ'
    ];

    const sampleRows = [
      [
        1,
        '0042',
        'សុខ ចាន់ថន',
        'ប្រុស',
        'ប្រធានការិយាល័យ',
        '15-May-1988',
        '01-Jan-2012',
        '20-Aug-2024',
        'វរមន្ត្រី ថ្នាក់លេខ ២',
        'វរមន្ត្រី ថ្នាក់លេខ ១',
        'វរមន្ត្រី ថ្នាក់លេខ ១',
        '១២៣៤ ប្រក.ហរ',
        'វរមន្ត្រី ថ្នាក់លេខ ១',
        'បរិញ្ញាបត្ររង',
        'ស្នើសុំឡើងថ្នាក់ប្រចាំឆ្នាំ២០២៦'
      ],
      [
        2,
        '0108',
        'គង់ ស្រីណុច',
        'ស្រី',
        'អនុប្រធានការិយាល័យ',
        '22-Oct-1991',
        '15-Mar-2015',
        '10-Jan-2023',
        'អនុមន្ត្រី ថ្នាក់លេខ ៣',
        'អនុមន្ត្រី ថ្នាក់លេខ ២',
        'អនុមន្ត្រី ថ្នាក់លេខ ២',
        '៥៦៧៨ ប្រក.ហរ',
        'អនុមន្ត្រី ថ្នាក់លេខ ២',
        'បរិញ្ញាបត្រ',
        'ស្នើសុំឡើងថ្នាក់'
      ],
      [
        3,
        '0215',
        'ជា វុទ្ធី',
        'ប្រុស',
        'មន្ត្រីស៊ើបអង្កេត',
        '05-Jul-1993',
        '10-Jun-2018',
        '20-Aug-2025',
        'មន្ត្រី ថ្នាក់លេខ ៤',
        'មន្ត្រី ថ្នាក់លេខ ៣',
        '',
        '៩០១២ ប្រក.ហរ',
        'មន្ត្រី ថ្នាក់លេខ ៤',
        'បរិញ្ញាបត្រជាន់ខ្ពស់',
        'ទិន្នន័យគំរូសម្រាប់រៀបចំ'
      ]
    ];

    const wsData = [
      headers,
      ...sampleRows
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = [
      { wch: 6 },  // ល.រ
      { wch: 12 }, // អត្តលេខ
      { wch: 22 }, // គោត្តនាម និងនាម
      { wch: 8 },  // ភេទ
      { wch: 22 }, // តួនាទី
      { wch: 16 }, // ថ្ងៃខែឆ្នាំកំណើត
      { wch: 20 }, // ថ្ងៃខែឆ្នាំចូលបម្រើការងារ
      { wch: 22 }, // ថ្ងៃខែឆ្នាំឡើងឋានន្តរស័ក្តិ
      { wch: 24 }, // ឋានន្តរស័ក្តិ និងថ្នាក់បច្ចុប្បន្ន
      { wch: 22 }, // ការស្នើសុំ
      { wch: 20 }, // បានដំឡើង
      { wch: 18 }, // ប្រកាសដំឡើង
      { wch: 24 }, // ឋានន្តរស័ក្តិថ្នាក់ចុងក្រោយ
      { wch: 22 }, // កម្រិតសញ្ញាបត្រ
      { wch: 28 }  // ផ្សេងៗ
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Promotion_Template');

    const fileName = `Promotion_Import_Template.xlsx`;
    XLSX.writeFile(wb, fileName);

    if (typeof app !== 'undefined' && app.showToast) {
      app.showToast(`📋 បានទាញយកទម្រង់គំរូ Excel (${fileName}) ដោយជោគជ័យ!`, 'success');
    }
  }
}

const promotionController = new PromotionController();
