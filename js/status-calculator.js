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
   * Priority:
   * 0. Manual Override (if chosen from dropdown and !== AUTO)
   * 1. Remark Keyword Evaluation:
   *    - If Remark contains 'inactive', 'closed', 'បានបិទ', 'បិទប្រព័ន្ធ' -> 'closed' (បានបិទប្រព័ន្ធ)
   *    - If Remark contains 'active', 'កំពុងដំណើរការ' -> 'active' (កំពុងដំណើរការ)
   * 2. System Closing Date: If filled -> 'closed' (បានបិទប្រព័ន្ធ)
   * 3. Missing Critical Info -> 'missing' (ខ្វះព័ត៌មាន)
   * 4. Expired: If End Date < today -> 'expired' (ផុតសុពលភាព)
   * 5. Pending: If Request Date filled & Start Date in future -> 'pending' (រង់ចាំដំណើរការ)
   * 6. Active: Start Date <= today <= End Date -> 'active' (កំពុងដំណើរការ)
   */
  calculateStatus(record) {
    // 0. Manual Status Override if chosen from dropdown
    if (record && record.customStatus && record.customStatus !== 'AUTO') {
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

    // 1. Remark Keyword Evaluation (Inactive -> Closed; Active -> Active)
    if (record && record.remark) {
      const remarkLower = String(record.remark).trim().toLowerCase();
      // If Remark contains inactive / closed / បានបិទ / បិទប្រព័ន្ធ
      if (
        remarkLower === 'inactive' ||
        remarkLower.includes('inactive') ||
        remarkLower === 'closed' ||
        remarkLower.includes('closed') ||
        remarkLower.includes('បានបិទ') ||
        remarkLower.includes('បិទប្រព័ន្ធ')
      ) {
        return {
          key: 'closed',
          labelKh: 'បានបិទប្រព័ន្ធ',
          labelEn: 'Closed',
          cssClass: 'status-closed',
          isManual: false
        };
      }

      // If Remark contains active / កំពុងដំណើរការ (and does not say inactive)
      if (
        remarkLower === 'active' ||
        (remarkLower.includes('active') && !remarkLower.includes('inactive')) ||
        remarkLower.includes('កំពុងដំណើរការ')
      ) {
        return {
          key: 'active',
          labelKh: 'កំពុងដំណើរការ',
          labelEn: 'Active',
          cssClass: 'status-active',
          isManual: false
        };
      }
    }

    // 2. Closed: If System Closing Date is filled
    if (record && record.systemClosingDate && String(record.systemClosingDate).trim() !== '') {
      return {
        key: 'closed',
        labelKh: 'បានបិទប្រព័ន្ធ',
        labelEn: 'Closed',
        cssClass: 'status-closed',
        isManual: false
      };
    }

    // 3. Missing Information: If critical fields or documents are absent
    const isMissingCritical = 
      !record ||
      !record.staffId || 
      !record.latinName || 
      !record.khmerName || 
      !record.department || 
      !record.office || 
      !record.position ||
      !record.gender ||
      (!record.startDate && record.requestDate) ||
      (!record.refDocument && record.requestDate);

    if (isMissingCritical) {
      return {
        key: 'missing',
        labelKh: 'ខ្វះព័ត៌មាន',
        labelEn: 'Missing Info',
        cssClass: 'status-missing',
        isManual: false
      };
    }

    // Parse dates
    const startDate = record.startDate ? new Date(record.startDate) : null;
    const endDate = record.endDate ? new Date(record.endDate) : null;
    const requestDate = record.requestDate ? new Date(record.requestDate) : null;

    // 4. Expired: If End Date is in the past
    if (endDate && endDate < today) {
      return {
        key: 'expired',
        labelKh: 'ផុតសុពលភាព',
        labelEn: 'Expired',
        cssClass: 'status-expired',
        isManual: false
      };
    }

    // 5. Pending: If Request Date is filled and (Start Date is in future OR no start date yet)
    if (requestDate && startDate && startDate > today) {
      return {
        key: 'pending',
        labelKh: 'រង់ចាំដំណើរការ',
        labelEn: 'Pending',
        cssClass: 'status-pending',
        isManual: false
      };
    }

    // 6. Active: Start Date <= today <= End Date (or no end date, ongoing)
    if (startDate && startDate <= today && (!endDate || endDate >= today)) {
      return {
        key: 'active',
        labelKh: 'កំពុងដំណើរការ',
        labelEn: 'Active',
        cssClass: 'status-active',
        isManual: false
      };
    }

    // Default fallback to Active
    return {
      key: 'active',
      labelKh: 'កំពុងដំណើរការ',
      labelEn: 'Active',
      cssClass: 'status-active',
      isManual: false
    };
  },

  /**
   * Convert any date format (Excel Serial Date 44132/32878, JS Date, DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
   * to standard ISO YYYY-MM-DD format
   */
  normalizeDate(val) {
    if (val === null || val === undefined || val === '') return '';

    // 1. If Date object
    if (val instanceof Date && !isNaN(val.getTime())) {
      const year = val.getFullYear();
      const month = String(val.getMonth() + 1).padStart(2, '0');
      const day = String(val.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    const rawStr = String(val).trim();
    if (!rawStr || rawStr === '-' || rawStr === 'null' || rawStr === 'undefined') return '';

    // 2. If number or numeric string representing Excel Serial Date (e.g. 32878, 44132, "32878")
    if (/^\d{4,6}(\.\d+)?$/.test(rawStr)) {
      const num = parseFloat(rawStr);
      if (num >= 1000 && num <= 100000) {
        // Excel 1900 date system (offset 25569 days between 1899-12-30 and 1970-01-01)
        const utc_days = Math.floor(num - 25569);
        const date_info = new Date(utc_days * 86400 * 1000);
        if (!isNaN(date_info.getTime())) {
          const year = date_info.getUTCFullYear();
          const month = String(date_info.getUTCMonth() + 1).padStart(2, '0');
          const day = String(date_info.getUTCDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      }
    }

    // 3. ISO format: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
    const isoMatch = rawStr.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (isoMatch) {
      const y = isoMatch[1];
      const m = isoMatch[2].padStart(2, '0');
      const d = isoMatch[3].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    // 4. DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const dmyMatch = rawStr.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (dmyMatch) {
      let d = dmyMatch[1].padStart(2, '0');
      let m = dmyMatch[2].padStart(2, '0');
      const y = dmyMatch[3];
      if (parseInt(m, 10) > 12 && parseInt(d, 10) <= 12) {
        const tmp = d;
        d = m;
        m = tmp;
      }
      return `${y}-${m}-${d}`;
    }

    // 5. Fallback Date.parse
    const parsed = new Date(rawStr);
    if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 1900 && parsed.getFullYear() <= 2100) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return rawStr;
  },

  /**
   * Format any date value into standard Cambodian DD-MM-YYYY format (e.g. 28-10-2020)
   */
  formatDateDisplay(val) {
    if (!val && val !== 0) return '-';
    const iso = this.normalizeDate(val);
    if (!iso) return '-';
    const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = match[1];
      const month = match[2];
      const day = match[3];
      return `${day}-${month}-${year}`;
    }
    return String(val);
  },

  /**
   * Helper to sanitize all date fields on a staff record
   */
  sanitizeRecordDates(record) {
    if (!record) return record;
    const dateFields = ['dob', 'serviceStartDate', 'requestDate', 'endDate', 'startDate', 'systemClosingDate', 'receivedDate'];
    dateFields.forEach(f => {
      if (record[f] !== undefined && record[f] !== null) {
        record[f] = this.normalizeDate(record[f]);
      }
    });
    return record;
  },

  /**
   * Calculate Age from Date of Birth
   */
  calculateAge(dobString) {
    const cleanDob = this.normalizeDate(dobString);
    if (!cleanDob) return '-';
    const birthDate = new Date(cleanDob);
    if (isNaN(birthDate.getTime())) return '-';
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age > 0 ? `${age} ឆ្នាំ (${age} yrs)` : '-';
  },

  /**
   * Calculate Service Duration from Employment Start Date
   */
  calculateServiceDuration(serviceStartDateString) {
    const cleanStartDate = this.normalizeDate(serviceStartDateString);
    if (!cleanStartDate) return '-';
    const startDate = new Date(cleanStartDate);
    if (isNaN(startDate.getTime())) return '-';
    const today = new Date();
    
    let years = today.getFullYear() - startDate.getFullYear();
    let months = today.getMonth() - startDate.getMonth();
    if (months < 0) {
      years--;
      months += 12;
    }
    if (years < 0) return '-';
    
    if (years === 0) {
      return `${months} ខែ (${months} mos)`;
    }
    return `${years} ឆ្នាំ ${months} ខែ (${years}y ${months}m)`;
  },

  /**
   * Identify missing fields checklist for a staff record
   */
  getMissingFieldsList(record) {
    const missing = [];
    if (!record.staffId) missing.push('អត្តលេខ អពដ (Staff ID)');
    if (!record.secondaryId) missing.push('អត្តលេខ កសហវ (Secondary ID)');
    if (!record.latinName) missing.push('ឈ្មោះឡាតាំង (Latin Name)');
    if (!record.khmerName) missing.push('ឈ្មោះខ្មែរ (Khmer Name)');
    if (!record.department) missing.push('អង្គភាព (Department)');
    if (!record.office) missing.push('ការិយាល័យ (Office)');
    if (!record.position) missing.push('តួនាទី (Position)');
    if (!record.gender) missing.push('ភេទ (Gender)');
    if (!record.dob) missing.push('ថ្ងៃខែឆ្នាំកំណើត (DOB)');
    if (!record.serviceStartDate) missing.push('ថ្ងៃខែឆ្នាំបម្រើការងារ (Service Start Date)');
    if (!record.startDate) missing.push('ថ្ងៃខែឆ្នាំចាប់ផ្តើម (Start Date)');
    if (!record.endDate) missing.push('ថ្ងៃខែឆ្នាំបញ្ចប់ (End Date)');
    if (!record.refDocument) missing.push('ឯកសារយោង (Reference Document)');
    if (!record.receivedDate) missing.push('ថ្ងៃខែទទួលឯកសារ (Doc Received Date)');
    return missing;
  },

  /**
   * Calculate Alert and Warning state based on Request Reason alert rules
   * Supported: Request Date (within 15, 30, 60 or custom days) and End Date (less than 15, 30, 60 or custom days)
   */
  calculateAlerts(record, customSettings) {
    const settings = customSettings || (typeof dataStore !== 'undefined' ? dataStore.getSettings() : {});
    const rules = settings.requestReasonRules || {};
    const reason = record ? (record.requestReason || '').trim() : '';
    const rule = rules[reason] || null;

    const result = {
      hasAlert: false,
      alertLevel: 'none', // 'urgent' (<= 15d), 'warning' (<= 30d), 'caution' (<= 60d), 'expired' (< 0d), 'req_alert'
      rowClass: '',
      endDateDaysLeft: null,
      endDateAlert: null,
      requestDateDays: null,
      requestDateAlert: null
    };

    if (!record) return result;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Evaluate End Date Alert
    if (record.endDate) {
      const endD = new Date(record.endDate);
      if (!isNaN(endD.getTime())) {
        endD.setHours(0, 0, 0, 0);
        const diffMs = endD.getTime() - today.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        result.endDateDaysLeft = diffDays;

        const threshold = rule && rule.endDays ? parseInt(rule.endDays, 10) : (diffDays <= 30 && diffDays >= 0 ? 30 : null);
        
        if (diffDays < 0) {
          result.hasAlert = true;
          result.alertLevel = 'expired';
          result.rowClass = 'row-alert-expired';
          result.endDateAlert = {
            type: 'expired',
            days: Math.abs(diffDays),
            label: `⛔ ផុតកំណត់ ${Math.abs(diffDays)} ថ្ងៃ`
          };
        } else if (threshold && diffDays <= threshold) {
          result.hasAlert = true;
          if (diffDays <= 15) {
            result.alertLevel = 'urgent';
            result.rowClass = 'row-alert-urgent';
          } else if (diffDays <= 30) {
            result.alertLevel = 'warning';
            result.rowClass = 'row-alert-warning';
          } else {
            result.alertLevel = 'caution';
            result.rowClass = 'row-alert-caution';
          }
          result.endDateAlert = {
            type: result.alertLevel,
            days: diffDays,
            threshold: threshold,
            label: `⚠️ នៅសល់ ${diffDays} ថ្ងៃ (≤ ${threshold} ថ្ងៃ)`
          };
        }
      }
    }

    // 2. Evaluate Request Date Alert
    if (record.requestDate) {
      const reqD = new Date(record.requestDate);
      if (!isNaN(reqD.getTime())) {
        reqD.setHours(0, 0, 0, 0);
        const diffFromReq = Math.ceil((today.getTime() - reqD.getTime()) / (1000 * 60 * 60 * 24));
        result.requestDateDays = diffFromReq;

        const reqThreshold = rule && rule.requestDays ? parseInt(rule.requestDays, 10) : null;
        if (reqThreshold && diffFromReq >= 0 && diffFromReq <= reqThreshold) {
          result.hasAlert = true;
          if (result.alertLevel === 'none') {
            result.alertLevel = 'req_alert';
            result.rowClass = 'row-alert-req';
          }
          result.requestDateAlert = {
            type: 'req_alert',
            days: diffFromReq,
            threshold: reqThreshold,
            label: `⏳ ស្នើសុំ ${diffFromReq} ថ្ងៃមុន (≤ ${reqThreshold} ថ្ងៃ)`
          };
        }
      }
    }

    return result;
  },

  /**
   * Normalize gender strings from Excel or various input formats to standard 'ប្រុស' / 'ស្រី'
   */
  normalizeGender(gender) {
    if (!gender) return '';
    const str = String(gender).trim().toLowerCase();
    if (str === 'm' || str === 'male' || str === 'man' || str === 'boy' || str === '1' || str.includes('ប្រុស') || str.includes('បុរស') || str.includes('កម្លោះ')) {
      return 'ប្រុស';
    }
    if (str === 'f' || str === 'female' || str === 'woman' || str === 'girl' || str === '2' || str.includes('ស្រី') || str.includes('នារី') || str.includes('ស្ត្រី')) {
      return 'ស្រី';
    }
    return String(gender).trim();
  }
};
