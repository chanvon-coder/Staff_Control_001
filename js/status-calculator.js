/**
 * Staff System Control - Automatic Status & Field Calculations Engine
 */

const StatusCalculator = {
  STATUS_DEFINITIONS: [
    { key: 'AUTO', labelKh: 'ស្វ័យប្រវត្ត', labelEn: 'Auto Calculated', cssClass: 'status-auto' },
    { key: 'active', labelKh: 'កំពុងដំណើរការ', labelEn: 'Active', cssClass: 'status-active' },
    { key: 'pending', labelKh: 'រង់ចាំដំណើរការ', labelEn: 'Pending', cssClass: 'status-pending' },
    { key: 'completed', labelKh: 'បានបញ្ចប់', labelEn: 'Completed', cssClass: 'status-completed' },
    { key: 'expired', labelKh: 'ផុតសុពលភាព', labelEn: 'Expired', cssClass: 'status-expired' },
    { key: 'closed', labelKh: 'បានបិទប្រព័ន្ធ', labelEn: 'Closed', cssClass: 'status-closed' },
    { key: 'missing', labelKh: 'ខ្វះព័ត៌មាន', labelEn: 'Missing Info', cssClass: 'status-missing' }
  ],

  /**
   * Determine record status automatically or by user manual override
   */
  calculateStatus(record) {
    if (!record) {
      return { key: 'active', labelKh: 'កំពុងដំណើរការ', labelEn: 'Active', cssClass: 'status-active', isManual: false };
    }

    // 0. Manual Status Override if chosen from dropdown
    if (record.customStatus && record.customStatus !== 'AUTO') {
      const found = this.STATUS_DEFINITIONS.find(s => s.key === record.customStatus);
      if (found) {
        return {
          key: found.key,
          labelKh: found.labelKh,
          labelEn: found.labelEn,
          cssClass: found.cssClass,
          isManual: true
        };
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const hasRefDoc = !!(record.refDocument && String(record.refDocument).trim() !== '');
    const hasClosingDate = !!(record.systemClosingDate && String(record.systemClosingDate).trim() !== '');
    const hasPrakas = !!(record.prakasNo && String(record.prakasNo).trim() !== '');
    const hasReqDate = !!(record.requestDate && String(record.requestDate).trim() !== '');
    const hasEndDate = !!(record.endDate && String(record.endDate).trim() !== '');
    const hasStartDate = !!(record.startDate && String(record.startDate).trim() !== '');

    // 1. Completed: Reference document has text/number, system closing date has date, Prakas No. has note, Request Date and End Date have date
    if (hasRefDoc && hasClosingDate && hasPrakas && hasReqDate && hasEndDate) {
      return {
        key: 'completed',
        labelKh: 'បានបញ្ចប់',
        labelEn: 'Completed',
        cssClass: 'status-completed',
        isManual: false
      };
    }

    // 2. Closed / Inactive Check
    const remarkLower = record.remark ? String(record.remark).trim().toLowerCase() : '';
    const isRemarkInactive = remarkLower === 'inactive' || remarkLower.includes('inactive') || remarkLower.includes('closed') || remarkLower.includes('បានបិទ') || remarkLower.includes('បិទប្រព័ន្ធ');

    if (isRemarkInactive || hasClosingDate) {
      return {
        key: 'closed',
        labelKh: 'បានបិទប្រព័ន្ធ',
        labelEn: 'Closed',
        cssClass: 'status-closed',
        isManual: false
      };
    }

    // 3. Pending: If in Reference document no text or number, status MUST show Pending
    if (!hasRefDoc) {
      return {
        key: 'pending',
        labelKh: 'រង់ចាំដំណើរការ',
        labelEn: 'Pending',
        cssClass: 'status-pending',
        isManual: false
      };
    }

    // Parse dates
    const startDate = hasStartDate ? new Date(this.normalizeDate(record.startDate)) : null;
    if (startDate) startDate.setHours(0, 0, 0, 0);

    const endDate = hasEndDate ? new Date(this.normalizeDate(record.endDate)) : null;
    if (endDate) endDate.setHours(0, 0, 0, 0);

    const maturityBase = record.maturityBase || 'endDate';
    const maturityDate = (maturityBase === 'startDate') ? startDate : endDate;

    // 4. Pending if start date is in the future
    if (startDate && startDate > today) {
      return {
        key: 'pending',
        labelKh: 'រង់ចាំដំណើរការ',
        labelEn: 'Pending',
        cssClass: 'status-pending',
        isManual: false
      };
    }

    // 5. Expired: Maturity date (Start Date or End Date according to selection) arrived at or before today
    if (maturityDate && maturityDate <= today) {
      return {
        key: 'expired',
        labelKh: 'ផុតសុពលភាព',
        labelEn: 'Expired',
        cssClass: 'status-expired',
        isManual: false
      };
    }

    // 6. Active: Default active
    return {
      key: 'active',
      labelKh: 'កំពុងដំណើរការ',
      labelEn: 'Active',
      cssClass: 'status-active',
      isManual: false
    };
  },

  /**
   * Convert any date format to standard ISO YYYY-MM-DD format
   */
  normalizeDate(val) {
    if (val === null || val === undefined || val === '') return '';

    if (val instanceof Date && !isNaN(val.getTime())) {
      const year = val.getFullYear();
      const month = String(val.getMonth() + 1).padStart(2, '0');
      const day = String(val.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // Handle Excel Date Serial Numbers (numeric or numeric strings like 44652, 45760, 35097, 35226)
    let numVal = typeof val === 'number' ? val : (typeof val === 'string' && /^\d{5}(\.\d+)?$/.test(val.trim()) ? parseFloat(val.trim()) : NaN);
    if (!isNaN(numVal) && numVal > 10000 && numVal < 100000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const targetDate = new Date(excelEpoch.getTime() + numVal * 86400000);
      if (!isNaN(targetDate.getTime())) {
        const year = targetDate.getUTCFullYear();
        const month = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(targetDate.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }

    let str = String(val).trim();
    if (!str) return '';

    // Handle DD-MMM-YYYY (e.g. 15-May-1988, 15-05-1988)
    const monthNamesMap = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const dmmmyMatch = str.match(/^(\d{1,2})[-/. ]([A-Za-z]{3})[-/. ](\d{4})/);
    if (dmmmyMatch) {
      const day = dmmmyMatch[1].padStart(2, '0');
      const mStr = dmmmyMatch[2].toLowerCase();
      const month = monthNamesMap[mStr] || '01';
      const year = dmmmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (isoMatch) {
      const year = isoMatch[1];
      const month = isoMatch[2].padStart(2, '0');
      const day = isoMatch[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return str;
  },

  /**
   * Format ISO date string into DD-MM-YYYY display
   */
  formatDateDisplay(val) {
    if (val === null || val === undefined || val === '') return '-';
    const iso = this.normalizeDate(val);
    if (!iso) return '-';

    const parts = iso.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return iso;
  },

  /**
   * Sanitize all date fields in record
   */
  sanitizeRecordDates(record) {
    if (!record) return;
    const dateFields = ['dob', 'serviceStartDate', 'requestDate', 'startDate', 'endDate', 'receivedDate', 'systemClosingDate'];
    dateFields.forEach(f => {
      if (record[f] !== undefined && record[f] !== null && record[f] !== '') {
        record[f] = this.normalizeDate(record[f]);
      }
    });
  },

  /**
   * Normalize gender strings
   */
  normalizeGender(val) {
    if (!val) return '';
    const str = String(val).trim();
    const lower = str.toLowerCase();
    if (lower === 'm' || lower === 'male' || lower.includes('ប្រុស')) return 'ប្រុស';
    if (lower === 'f' || lower === 'female' || lower.includes('ស្រី')) return 'ស្រី';
    return str;
  },

  /**
   * Calculate Age from Date of Birth (dob) in exact years
   */
  calculateAge(dobVal) {
    const iso = this.normalizeDate(dobVal);
    if (!iso) return '';

    const birthDate = new Date(iso);
    if (isNaN(birthDate.getTime())) return '';

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age >= 0 ? age : 0;
  },

  /**
   * Calculate Work Duration in years with decimal precision
   */
  calculateWorkDuration(serviceStartDateVal) {
    const iso = this.normalizeDate(serviceStartDateVal);
    if (!iso) return '';

    const startDate = new Date(iso);
    if (isNaN(startDate.getTime())) return '';

    const today = new Date();
    if (startDate > today) return '0 ឆ្នាំ';

    let years = today.getFullYear() - startDate.getFullYear();
    let months = today.getMonth() - startDate.getMonth();
    let days = today.getDate() - startDate.getDate();

    if (days < 0) {
      months--;
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    if (years <= 0 && months <= 0) {
      return 'ថ្មីៗ';
    }

    if (years > 0 && months > 0) {
      return `${years} ឆ្នាំ ${months} ខែ`;
    } else if (years > 0) {
      return `${years} ឆ្នាំ`;
    } else {
      return `${months} ខែ`;
    }
  },

  /**
   * Alias for calculateWorkDuration
   */
  calculateServiceDuration(serviceStartDateVal) {
    return this.calculateWorkDuration(serviceStartDateVal);
  },

  /**
   * Calculate exact duration between two dates in Years, Months, and Days
   * Calculates true calendar year/month/day differences (not dividing by 365)
   */
  calculateExactDurationYMD(startDateVal, endDateVal) {
    if (!startDateVal || !endDateVal) return '';

    const isoStart = this.normalizeDate(startDateVal);
    const isoEnd = this.normalizeDate(endDateVal);
    if (!isoStart || !isoEnd) return '';

    const d1 = new Date(isoStart);
    const d2 = new Date(isoEnd);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return '';

    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);

    if (d2 < d1) {
      return 'កាលបរិច្ឆេទមិនត្រឹមត្រូវ';
    }

    let y1 = d1.getFullYear();
    let m1 = d1.getMonth(); // 0-indexed
    let day1 = d1.getDate();

    let y2 = d2.getFullYear();
    let m2 = d2.getMonth();
    let day2 = d2.getDate();

    let years = y2 - y1;
    let months = m2 - m1;
    let days = day2 - day1;

    if (days < 0) {
      months -= 1;
      // Get the number of days in the month prior to d2
      const prevMonthLastDay = new Date(y2, m2, 0).getDate();
      days += prevMonthLastDay;
    }

    if (months < 0) {
      years -= 1;
      months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years} ឆ្នាំ`);
    if (months > 0) parts.push(`${months} ខែ`);
    if (days > 0 || parts.length === 0) parts.push(`${days} ថ្ងៃ`);

    return parts.join(' ');
  },

  /**
   * Calculate suspension duration for a record
   * Returns empty string if requestReason is not "ព្យួរការងារ"
   */
  calculateSuspensionDuration(record) {
    if (!record) return '';
    const reason = (record.requestReason || '').trim();
    if (!reason.includes('ព្យួរការងារ')) {
      return '';
    }

    const startDate = record.requestDate || record.startDate;
    const endDate = record.endDate;

    if (!startDate || !endDate) return '';

    return this.calculateExactDurationYMD(startDate, endDate);
  },

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
  },

  /**
   * Complete Suspension & Early Return Calculation Engine per Individual Case
   * Implements 7 Rules specified by User:
   * 1. Unique Staff ID + Case ID binding
   * 2. Part 1: Used Period = Early Return Date − Original Start Date (01-07-2022 -> 01-05-2023 = 10 months)
   * 3. Part 2: Remaining Period = Original End Date − Early Return Date (01-05-2023 -> 30-06-2024 = 1 year 1 month 29 days)
   * 4. Part 3: New Remaining End Date = Early Return Date + Remaining Period (30-06-2024)
   * 5. Validations: Early Return Date >= Start Date, calendar YMD accuracy, multi-case isolation.
   */
  calculateSuspensionCaseDetails(suspensionRecord, reinstatementRecords = []) {
    if (!suspensionRecord) return null;

    const staffId = suspensionRecord.staffId || '-';
    const caseId = suspensionRecord.no || suspensionRecord.id || 'CASE_1';

    const startDateStr = suspensionRecord.startDate || suspensionRecord.requestDate;
    const originalEndDateStr = suspensionRecord.endDate;

    if (!startDateStr || !originalEndDateStr) return null;

    const startDateObj = new Date(this.normalizeDate(startDateStr));
    const originalEndDateObj = new Date(this.normalizeDate(originalEndDateStr));

    if (isNaN(startDateObj.getTime()) || isNaN(originalEndDateObj.getTime())) return null;

    startDateObj.setHours(0, 0, 0, 0);
    originalEndDateObj.setHours(0, 0, 0, 0);

    // Find matched early return / reinstatement record for this specific staff ID & case
    let matchedReturnRec = null;
    if (Array.isArray(reinstatementRecords) && reinstatementRecords.length > 0) {
      matchedReturnRec = reinstatementRecords.find(rein => {
        const reinDateStr = rein.startDate || rein.requestDate || rein.receivedDate || rein.systemClosingDate;
        if (!reinDateStr) return false;
        const reinObj = new Date(this.normalizeDate(reinDateStr));
        return !isNaN(reinObj.getTime()) && reinObj >= startDateObj;
      });
    }

    let earlyReturnDateStr = matchedReturnRec ? (matchedReturnRec.startDate || matchedReturnRec.requestDate || matchedReturnRec.receivedDate || matchedReturnRec.systemClosingDate) : null;
    let earlyReturnDateObj = earlyReturnDateStr ? new Date(this.normalizeDate(earlyReturnDateStr)) : null;

    if (earlyReturnDateObj) earlyReturnDateObj.setHours(0, 0, 0, 0);

    // Validation 1: Reject Early Return Date < Original Start Date
    if (earlyReturnDateObj && earlyReturnDateObj < startDateObj) {
      earlyReturnDateObj = null;
      earlyReturnDateStr = null;
    }

    // Part 1: Used Duration ( Early Return Date || Original End Date − Start Date )
    const effectiveUsedEndDateObj = earlyReturnDateObj || originalEndDateObj;
    const effectiveUsedEndDateStr = earlyReturnDateStr || originalEndDateStr;

    const usedDurationText = this.calculateExactDurationYMD(startDateStr, effectiveUsedEndDateStr);
    const usedDays = Math.max(0, Math.round((effectiveUsedEndDateObj - startDateObj) / (1000 * 60 * 60 * 24)));

    // Part 2: Remaining Duration ( Original End Date − Early Return Date )
    let remainingDurationText = '0 ថ្ងៃ';
    let remainingDays = 0;
    let remainingStartDateStr = null;
    let remainingEndDateStr = null;

    if (earlyReturnDateObj && earlyReturnDateObj < originalEndDateObj) {
      remainingDurationText = this.calculateExactDurationYMD(earlyReturnDateStr, originalEndDateStr);
      remainingDays = Math.max(0, Math.round((originalEndDateObj - earlyReturnDateObj) / (1000 * 60 * 60 * 24)));
      remainingStartDateStr = earlyReturnDateStr;
      remainingEndDateStr = originalEndDateStr; // Early Return Date + Remaining Period = Original End Date
    } else if (!earlyReturnDateObj) {
      // No early return => full original period used, 0 remaining
      remainingDurationText = '0 ថ្ងៃ';
      remainingDays = 0;
    }

    return {
      staffId,
      caseId,
      startDateStr,
      originalEndDateStr,
      earlyReturnDateStr: earlyReturnDateStr || '-',
      usedDurationText: usedDurationText || '0 ថ្ងៃ',
      usedDays,
      remainingDurationText: remainingDurationText || '0 ថ្ងៃ',
      remainingDays,
      remainingStartDateStr: remainingStartDateStr || '-',
      remainingEndDateStr: remainingEndDateStr || '-',
      hasEarlyReturn: !!earlyReturnDateObj && earlyReturnDateObj < originalEndDateObj
    };
  },

  /**
   * Calculate Date Alert metadata for Countdown, Badges & Progress Bars
   */
  getDateControlMeta(dateStr, baseRuleDays = 30) {
    if (!dateStr) return null;
    const iso = this.normalizeDate(dateStr);
    if (!iso) return null;

    const targetDate = new Date(iso);
    if (isNaN(targetDate.getTime())) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((targetDate - today) / (1000 * 60 * 60 * 24));
    const totalThreshold = baseRuleDays || 30;

    let alertLevel = 'normal'; // 'overdue' | 'today' | 'tomorrow' | 'urgent' | 'warning' | 'normal'
    let badgeText = '';
    let badgeIcon = '';
    let badgeClass = 'date-badge-normal';
    let progressColor = 'progress-blue';
    let progressPct = 0;

    // Overdue by more than 30 days: Do NOT show alert style anymore!
    if (diffDays < -30) {
      alertLevel = 'none';
      badgeText = '';
      badgeIcon = '';
      badgeClass = '';
      progressColor = '';
      progressPct = 0;
    } else if (diffDays < 0) {
      alertLevel = 'overdue';
      const absDays = Math.abs(diffDays);
      badgeText = `✅ បានបញ្ចប់ ${absDays} ថ្ងៃមុន`;
      badgeIcon = 'check';
      badgeClass = 'date-badge-ended';
      progressColor = 'progress-overdue';
      progressPct = 100;
    } else if (diffDays === 0) {
      alertLevel = 'today';
      badgeText = '🎯 ថ្ងៃនេះ';
      badgeIcon = 'target';
      badgeClass = 'date-badge-urgent';
      progressColor = 'progress-urgent';
      progressPct = 100;
    } else if (diffDays === 1) {
      alertLevel = 'tomorrow';
      badgeText = '⏰ ថ្ងៃស្អែក';
      badgeIcon = 'clock';
      badgeClass = 'date-badge-urgent';
      progressColor = 'progress-urgent';
      progressPct = Math.max(12, Math.round((1 / totalThreshold) * 100));
    } else if (diffDays <= 3) {
      alertLevel = 'urgent';
      badgeText = `🔴 បន្ទាន់ — នៅសល់ ${diffDays} ថ្ងៃ`;
      badgeIcon = 'alert-circle';
      badgeClass = 'date-badge-urgent';
      progressColor = 'progress-urgent';
      progressPct = Math.max(12, Math.min(100, Math.round((diffDays / totalThreshold) * 100)));
    } else if (diffDays >= 4 && diffDays <= 7) {
      alertLevel = 'warning';
      badgeText = `🟠 ជិតដល់កំណត់ — នៅសល់ ${diffDays} ថ្ងៃ`;
      badgeIcon = 'hourglass';
      badgeClass = 'date-badge-warning';
      progressColor = 'progress-warning';
      progressPct = Math.max(15, Math.min(100, Math.round((diffDays / totalThreshold) * 100)));
    } else {
      alertLevel = 'normal';
      badgeText = `🔵 នៅសល់ ${diffDays} ថ្ងៃ`;
      badgeIcon = 'calendar';
      badgeClass = 'date-badge-normal';
      progressColor = 'progress-blue';
      progressPct = Math.max(15, Math.min(100, Math.round((diffDays / totalThreshold) * 100)));
    }

    return {
      iso,
      displayDate: this.formatDateDisplay(iso),
      diffDays,
      totalThreshold,
      alertLevel,
      badgeText,
      badgeIcon,
      badgeClass,
      progressColor,
      progressPct
    };
  },

  /**
   * Render Modern Professional Date Control Cell for Master Table
   */
  renderDateControlCell(field, record, settings) {
    if (!record) return '-';
    const rawVal = record[field];
    if (!rawVal) return '<span style="color: var(--text-muted); font-size: 0.85rem;">-</span>';

    const formattedDate = this.formatDateDisplay(rawVal);
    const rules = (settings && settings.requestReasonRules) ? settings.requestReasonRules : {};
    const reasonRule = record.requestReason ? rules[record.requestReason] : null;

    if (field === 'requestDate') {
      const alerts = this.calculateAlerts(record, settings);
      const reqAlert = alerts.requestDateAlert;
      return `
        <div class="date-ctrl-card date-ctrl-req">
          <div class="date-ctrl-text">
            <span>${formattedDate}</span>
          </div>
          ${reqAlert ? `<div class="date-ctrl-badge date-badge-warning" title="${reqAlert.message}">⚠️ ${reqAlert.days} ថ្ងៃ</div>` : ''}
        </div>
      `;
    }

    if (field === 'endDate') {
      const endThreshold = (reasonRule && reasonRule.endDays) ? parseInt(reasonRule.endDays, 10) : 30;
      const meta = this.getDateControlMeta(rawVal, endThreshold);
      if (!meta) return `<div class="date-ctrl-card"><div class="date-ctrl-text">${formattedDate}</div></div>`;

      // If overdue by more than 30 days: Do NOT show alert style anymore!
      if (meta.diffDays < -30) {
        return `
          <div class="date-ctrl-card date-ctrl-end">
            <div class="date-ctrl-text">
              <span class="date-val-num">${meta.displayDate}</span>
            </div>
          </div>
        `;
      }

      let endBadgeHtml = '';
      if (meta.diffDays < 0) {
        endBadgeHtml = `<div class="date-ctrl-badge date-badge-ended">✅ បានបញ្ចប់ ${Math.abs(meta.diffDays)} ថ្ងៃមុន</div>`;
      } else if (meta.diffDays === 0) {
        endBadgeHtml = `<div class="date-ctrl-badge date-badge-urgent">🎯 ថ្ងៃនេះ</div>`;
      } else if (meta.diffDays === 1) {
        endBadgeHtml = `<div class="date-ctrl-badge date-badge-urgent">⏰ ថ្ងៃស្អែក</div>`;
      } else if (meta.diffDays <= 3) {
        endBadgeHtml = `<div class="date-ctrl-badge date-badge-urgent">🔴 នៅសល់ ${meta.diffDays} ថ្ងៃ</div>`;
      } else if (meta.diffDays <= 7) {
        endBadgeHtml = `<div class="date-ctrl-badge date-badge-warning">🟠 នៅសល់ ${meta.diffDays} ថ្ងៃ</div>`;
      } else {
        endBadgeHtml = `<div class="date-ctrl-badge date-badge-normal">📅 នៅសល់ ${meta.diffDays} ថ្ងៃ</div>`;
      }

      return `
        <div class="date-ctrl-card date-ctrl-end">
          <div class="date-ctrl-text">
            <span class="date-val-num">${meta.displayDate}</span>
          </div>
          <div class="date-ctrl-badge-row">
            ${endBadgeHtml}
          </div>
        </div>
      `;
    }

    if (field === 'startDate') {
      const startThreshold = (reasonRule && reasonRule.startDays) ? parseInt(reasonRule.startDays, 10) : 15;
      const meta = this.getDateControlMeta(rawVal, startThreshold);
      const isMaturityStart = record.maturityBase === 'startDate';

      if (!meta) {
        return `
          <div class="date-ctrl-card date-ctrl-start">
            <div class="date-ctrl-text">
              <span class="date-val-num">${formattedDate}</span>
              ${isMaturityStart ? '<span class="date-ctrl-calc-tag" title="គណនាកាលកំណត់តាមថ្ងៃចាប់ផ្តើម">🎯 គណនាកាលកំណត់</span>' : ''}
            </div>
          </div>
        `;
      }

      // If started > 30 days ago (overdue > 30 days): Do NOT show alert style anymore!
      if (meta.diffDays < -30) {
        return `
          <div class="date-ctrl-card date-ctrl-start">
            <div class="date-ctrl-text">
              <span class="date-val-num">${meta.displayDate}</span>
              ${isMaturityStart ? '<span class="date-ctrl-calc-tag" title="គណនាកាលកំណត់តាមថ្ងៃចាប់ផ្តើម">🎯</span>' : ''}
            </div>
          </div>
        `;
      }

      let startBadgeHtml = '';
      if (meta.diffDays === 0) {
        startBadgeHtml = `<div class="date-ctrl-badge date-badge-start-today">🚀 ចាប់ផ្តើមក្នុងថ្ងៃនេះ</div>`;
      } else if (meta.diffDays === 1) {
        startBadgeHtml = `<div class="date-ctrl-badge date-badge-urgent">⏰ ថ្ងៃស្អែក</div>`;
      } else if (meta.diffDays >= 2 && meta.diffDays <= 3) {
        startBadgeHtml = `<div class="date-ctrl-badge date-badge-urgent">⏰ នៅសល់ ${meta.diffDays} ថ្ងៃ</div>`;
      } else if (meta.diffDays >= 4 && meta.diffDays <= 7) {
        startBadgeHtml = `<div class="date-ctrl-badge date-badge-warning">⏰ នៅសល់ ${meta.diffDays} ថ្ងៃ</div>`;
      } else if (meta.diffDays > 7) {
        startBadgeHtml = `<div class="date-ctrl-badge date-badge-start-active">🚀 នៅសល់ ${meta.diffDays} ថ្ងៃ</div>`;
      } else {
        startBadgeHtml = `<div class="date-ctrl-badge date-badge-started">✅ បានចាប់ផ្តើម ${Math.abs(meta.diffDays)} ថ្ងៃមុន</div>`;
      }

      return `
        <div class="date-ctrl-card date-ctrl-start">
          <div class="date-ctrl-text">
            <span class="date-val-num">${meta.displayDate}</span>
            ${isMaturityStart ? '<span class="date-ctrl-calc-tag" title="គណនាកាលកំណត់តាមថ្ងៃចាប់ផ្តើម">🎯</span>' : ''}
          </div>
          <div class="date-ctrl-badge-row">
            ${startBadgeHtml}
          </div>
        </div>
      `;
    }

    return formattedDate;
  },

  /**
   * Calculate alerts for request dates, start dates, and end dates
   * Highlights rows with modern pastel themes according to urgency.
   */
  calculateAlerts(record, settings) {
    if (!record) return { requestDateAlert: null, endDateAlert: null, startDateAlert: null, hasAlert: false, rowClass: 'row-normal' };

    const status = this.calculateStatus(record);

    // If record is already completed, closed, or expired, do not show active countdown alerts
    if (status.key === 'completed' || status.key === 'closed' || status.key === 'expired') {
      return { requestDateAlert: null, endDateAlert: null, startDateAlert: null, hasAlert: false, rowClass: 'row-normal' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rules = (settings && settings.requestReasonRules) ? settings.requestReasonRules : {};
    const reasonRule = record.requestReason ? rules[record.requestReason] : null;

    let reqThreshold = 15;
    let endThreshold = 30;
    let startThreshold = 15;

    if (reasonRule) {
      if (reasonRule.requestDays !== null && reasonRule.requestDays !== undefined && reasonRule.requestDays !== '') {
        reqThreshold = parseInt(reasonRule.requestDays, 10);
      }
      if (reasonRule.endDays !== null && reasonRule.endDays !== undefined && reasonRule.endDays !== '') {
        endThreshold = parseInt(reasonRule.endDays, 10);
      }
      if (reasonRule.startDays !== null && reasonRule.startDays !== undefined && reasonRule.startDays !== '') {
        startThreshold = parseInt(reasonRule.startDays, 10);
      }
    }

    let requestDateAlert = null;
    let endDateAlert = null;
    let startDateAlert = null;

    // 1. Request Date Alert: ONLY show when status is PENDING and waiting longer than threshold
    if (status.key === 'pending' && record.requestDate) {
      const reqDate = new Date(this.normalizeDate(record.requestDate));
      if (!isNaN(reqDate.getTime())) {
        reqDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((today - reqDate) / (1000 * 60 * 60 * 24));
        if (diffDays >= reqThreshold) {
          requestDateAlert = {
            level: 'warning',
            type: 'warning',
            days: diffDays,
            threshold: reqThreshold,
            message: `បានស្នើ ${diffDays} ថ្ងៃហើយ (លើសកម្រិត ${reqThreshold} ថ្ងៃ)`,
            label: `⚠️ ${diffDays} ថ្ងៃ`
          };
        }
      }
    }

    // 2. End Date Alert: ONLY show when status is ACTIVE and approaching maturity
    const maturityBase = record.maturityBase || 'endDate';
    const maturityDateStr = (maturityBase === 'startDate') ? record.startDate : record.endDate;

    if (status.key === 'active' && maturityDateStr) {
      const targetDate = new Date(this.normalizeDate(maturityDateStr));
      if (!isNaN(targetDate.getTime())) {
        targetDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((targetDate - today) / (1000 * 60 * 60 * 24));
        // If overdue > 30 days, do NOT show alert style!
        if (diffDays >= -30 && diffDays <= endThreshold) {
          endDateAlert = {
            level: diffDays < 0 ? 'normal' : (diffDays <= 3 ? 'urgent' : (diffDays <= 7 ? 'warning' : 'normal')),
            type: diffDays < 0 ? 'normal' : (diffDays <= 3 ? 'urgent' : (diffDays <= 7 ? 'warning' : 'normal')),
            days: diffDays,
            threshold: endThreshold,
            message: diffDays < 0 ? `បានបញ្ចប់ ${Math.abs(diffDays)} ថ្ងៃមុន` : (diffDays === 0 ? 'ផុតកំណត់ថ្ងៃនេះ' : `នៅសល់ ${diffDays} ថ្ងៃទៀតផុតកំណត់`),
            label: diffDays < 0 ? `✅ បានបញ្ចប់ ${Math.abs(diffDays)} ថ្ងៃមុន` : (diffDays <= 3 ? `🔴 នៅសល់ ${diffDays} ថ្ងៃ` : (diffDays <= 7 ? `🟠 នៅសល់ ${diffDays} ថ្ងៃ` : `🔵 នៅសល់ ${diffDays} ថ្ងៃ`))
          };
        }
      }
    }

    // 3. Start Date Alert: ONLY show when status is PENDING and start date is approaching in future
    if (status.key === 'pending' && record.startDate) {
      const startDate = new Date(this.normalizeDate(record.startDate));
      if (!isNaN(startDate.getTime())) {
        startDate.setHours(0, 0, 0, 0);
        const diffStartDays = Math.round((startDate - today) / (1000 * 60 * 60 * 24));
        // If overdue > 30 days, do NOT show alert style!
        if (diffStartDays >= -30 && diffStartDays <= startThreshold) {
          startDateAlert = {
            level: diffStartDays < 0 ? 'normal' : (diffStartDays <= 3 ? 'urgent' : (diffStartDays <= 7 ? 'warning' : 'info')),
            type: diffStartDays < 0 ? 'normal' : (diffStartDays <= 3 ? 'urgent' : (diffStartDays <= 7 ? 'warning' : 'info')),
            days: diffStartDays,
            threshold: startThreshold,
            message: diffStartDays < 0 ? `បានចាប់ផ្តើម ${Math.abs(diffStartDays)} ថ្ងៃមុន` : `នៅសល់ ${diffStartDays} ថ្ងៃទៀតដល់ថ្ងៃចាប់ផ្តើម`,
            label: diffStartDays < 0 ? `✅ បានចាប់ផ្តើម ${Math.abs(diffStartDays)} ថ្ងៃមុន` : `🚀 ${diffStartDays} ថ្ងៃ`
          };
        }
      }
    }

    const hasAlert = !!(endDateAlert || startDateAlert);

    // Row Urgency styling:
    // Urgent records (diffDays <= 3 and not past) -> row-alert-urgent (very light red/pink)
    // Warning records (4–7 days) -> row-alert-warning (soft pastel amber)
    // Normal records -> row-normal (light blue tint or crisp white)
    let rowClass = 'row-normal';
    if ((endDateAlert && endDateAlert.level === 'urgent') || (startDateAlert && startDateAlert.level === 'urgent')) {
      rowClass = 'row-alert-urgent';
    } else if ((endDateAlert && endDateAlert.level === 'warning') || (startDateAlert && startDateAlert.level === 'warning')) {
      rowClass = 'row-alert-warning';
    } else if (endDateAlert || startDateAlert) {
      rowClass = 'row-alert-caution';
    }

    return {
      requestDateAlert,
      endDateAlert,
      startDateAlert,
      hasAlert,
      rowClass
    };
  },

  /**
   * Format 4-digit ID
   */
  format4DigitId(val) {
    if (val === null || val === undefined || val === '') return '';
    let str = String(val).trim();
    if (str.endsWith('.0')) str = str.slice(0, -2);
    if (/^\d+$/.test(str)) {
      if (str.length >= 10) return str;
      if (str.length <= 4) return str.padStart(4, '0');
      return str;
    }
    const match = str.match(/^([A-Za-z\u1780-\u17FF\s\-_]+)(\d+)$/);
    if (match) {
      if (match[2].length >= 10) return `${match[1]}${match[2]}`;
      return `${match[1]}${match[2].padStart(4, '0')}`;
    }
    return str;
  },

  /**
   * Return array of missing mandatory fields for record
   */
  getMissingFieldsList(record) {
    if (!record) return [];
    const missing = [];
    if (!record.staffId) missing.push('Staff ID');
    if (!record.khmerName) missing.push('ឈ្មោះខ្មែរ (Khmer Name)');
    if (!record.latinName) missing.push('ឈ្មោះឡាតាំង (Latin Name)');
    if (!record.gender) missing.push('ភេទ (Gender)');
    if (!record.department) missing.push('នាយកដ្ឋាន (Department)');
    if (!record.position) missing.push('តួនាទី (Position)');
    if (!record.refDocument && record.requestDate) missing.push('លិខិតយោង (Ref Document)');
    if (!record.startDate && record.requestDate) missing.push('ថ្ងៃចាប់ផ្តើម (Start Date)');
    return missing;
  }
};
