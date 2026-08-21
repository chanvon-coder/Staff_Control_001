/**
 * Staff System Control - UserForm Controller
 * Implements: Staff Info, Organization, Request/Document Info, Actions,
 * Update Information (Metadata/History) & Attachment Files Management
 */

class UserFormController {
  constructor() {
    this.currentMode = 'NEW'; // 'NEW' or 'EDIT'
    this.selectedRecordNo = null;
    this.currentAttachments = [];
    this.modalEl = null;
    this.formEl = null;
    this.isStartDateManuallyEdited = false;
  }

  init() {
    this.modalEl = document.getElementById('userform-modal');
    this.formEl = document.getElementById('staff-userform');
    this.populateDropdowns();
    this.updateFieldLabels();
    this.bindEvents();
    this.initAttachmentUploadEvents();
  }

  updateFieldLabels() {
    const fields = dataStore.getMasterFields();
    fields.forEach(f => {
      const labelEl = document.getElementById(`lbl-uf-${f.key}`);
      if (labelEl) {
        labelEl.innerHTML = `${f.kh} <small style="color: var(--text-muted); font-size: 0.72rem;">(${f.en})</small> ${f.required ? '<span class="required-mark">*</span>' : ''}`;
      }
    });
  }

  populateDropdowns() {
    const settings = dataStore.getSettings();

    const populateSelect = (selectId, items, defaultText) => {
      const el = document.getElementById(selectId);
      if (!el) return;
      const currentVal = el.value;
      el.innerHTML = `<option value="">-- ${defaultText} --</option>`;
      if (Array.isArray(items)) {
        items.forEach(item => {
          const opt = document.createElement('option');
          opt.value = item;
          opt.textContent = item;
          el.appendChild(opt);
        });
      }
      if (currentVal && items && items.includes(currentVal)) {
        el.value = currentVal;
      }
    };

    populateSelect('uf-department', settings.departments, 'ជ្រើសរើសអង្គភាព (Select Department)');
    populateSelect('uf-office', settings.offices, 'ជ្រើសរើសការិយាល័យ (Select Office)');
    populateSelect('uf-position', settings.positions, 'ជ្រើសរើសតួនាទី (Select Position)');
    populateSelect('uf-gender', settings.genders, 'ជ្រើសរើសភេទ (Select Gender)');
    populateSelect('uf-annualPeriod', settings.annualPeriods, 'ជ្រើសរើសឆ្នាំ (Select Year)');
    populateSelect('uf-requestReason', settings.requestReasons, 'ជ្រើសរើសមូលហេតុ (Select Reason)');
    populateSelect('uf-remark-select', settings.remarks, 'ជ្រើសរើសកំណត់សម្គាល់គំរូពី Droplist (Select Preset Remark)');

    this.populateStaffIdDatalist();
  }

  /**
   * Populate Staff ID and Secondary ID datalists for fast selection & VLOOKUP
   */
  populateStaffIdDatalist() {
    const list = dataStore.getStaffData();
    const staffDatalist = document.getElementById('staffId-datalist');
    const secDatalist = document.getElementById('secondaryId-datalist');

    if (staffDatalist) {
      staffDatalist.innerHTML = list
        .filter(r => r.staffId)
        .map(r => `<option value="${r.staffId}">${r.khmerName || r.latinName || ''} • ${r.department || ''}</option>`)
        .join('');
    }

    if (secDatalist) {
      secDatalist.innerHTML = list
        .filter(r => r.secondaryId)
        .map(r => `<option value="${r.secondaryId}">${r.khmerName || r.latinName || ''} • ${r.staffId || ''}</option>`)
        .join('');
    }
  }

  bindEvents() {
    // Real-Time VLOOKUP on Staff ID & Secondary ID
    const staffIdInput = document.getElementById('uf-staffId');
    const secondaryIdInput = document.getElementById('uf-secondaryId');

    const performStaffVlookup = (searchVal, isSecondary = false) => {
      const role = (typeof UserControl !== 'undefined' && UserControl.getCurrentRole) ? UserControl.getCurrentRole() : { id: 'ADMIN', canEdit: true };
      if (role.id === 'VIEWER' || !role.canEdit) {
        return; // Viewer cannot edit or trigger VLOOKUP modifications
      }

      const q = (searchVal || '').trim().toLowerCase();
      const badge = document.getElementById('uf-vlookup-badge');
      const sec1Card = document.getElementById('uf-sec1-card');
      const sec2Card = document.getElementById('uf-sec2-card');

      if (!q || q.length < 2) {
        if (badge) badge.style.display = 'none';
        if (sec1Card) sec1Card.classList.remove('form-section-vlookup-hit');
        if (sec2Card) sec2Card.classList.remove('form-section-vlookup-hit');
        return;
      }

      const allRecords = dataStore.getStaffData();
      const match = allRecords.find(r => {
        if (isSecondary) {
          return r.secondaryId && r.secondaryId.toLowerCase() === q;
        }
        return (r.staffId && r.staffId.toLowerCase() === q) || (r.secondaryId && r.secondaryId.toLowerCase() === q);
      });

      if (match) {
        // Auto-fill Section 1 (Personal Information)
        if (!isSecondary && match.secondaryId && secondaryIdInput && !secondaryIdInput.value) {
          secondaryIdInput.value = match.secondaryId;
        }
        if (isSecondary && match.staffId && staffIdInput && !staffIdInput.value) {
          staffIdInput.value = match.staffId;
        }

        const setSelectVal = (id, val) => {
          const el = document.getElementById(id);
          if (!el || val === undefined || val === null) return;
          const trimmed = String(val).trim();
          if (!trimmed) {
            el.value = '';
            return;
          }

          let found = false;
          for (let opt of el.options) {
            if (opt.value === trimmed || opt.text === trimmed) {
              el.value = opt.value;
              found = true;
              break;
            }
          }

          if (!found) {
            const lower = trimmed.toLowerCase();
            for (let opt of el.options) {
              if (opt.value.toLowerCase() === lower || opt.text.toLowerCase() === lower) {
                el.value = opt.value;
                found = true;
                break;
              }
            }
          }

          if (!found) {
            const opt = document.createElement('option');
            opt.value = trimmed;
            opt.textContent = trimmed;
            el.appendChild(opt);
            el.value = trimmed;
          }
        };

        const setVal = (id, val) => {
          const el = document.getElementById(id);
          if (el && val !== undefined && val !== null) {
            el.value = val;
          }
        };

        setVal('uf-latinName', match.latinName || '');
        setVal('uf-khmerName', match.khmerName || '');
        
        // Auto-select normalized Gender ('ប្រុស' or 'ស្រី')
        const normGender = StatusCalculator.normalizeGender ? StatusCalculator.normalizeGender(match.gender) : (match.gender || '');
        setSelectVal('uf-gender', normGender);

        setVal('uf-dob', match.dob || '');
        setVal('uf-serviceStartDate', match.serviceStartDate || '');

        // Auto-fill Section 2 (Organization Information)
        setSelectVal('uf-department', match.department || '');
        setSelectVal('uf-office', match.office || '');
        setSelectVal('uf-position', match.position || '');

        this.updateCalculatedBadges();

        // Show VLOOKUP Hit Badge & Card Highlight
        if (badge) {
          badge.style.display = 'inline-flex';
          badge.innerHTML = `<i data-lucide="zap" style="width: 12px; height: 12px;"></i> <span>⚡ VLOOKUP: ${match.khmerName || match.latinName} • ភេទ ${normGender || '-'} (${match.department || 'អង្គភាព'})</span>`;
        }

        if (sec1Card) {
          sec1Card.classList.add('form-section-vlookup-hit');
          setTimeout(() => sec1Card.classList.remove('form-section-vlookup-hit'), 2500);
        }
        if (sec2Card) {
          sec2Card.classList.add('form-section-vlookup-hit');
          setTimeout(() => sec2Card.classList.remove('form-section-vlookup-hit'), 2500);
        }

        const errStaffId = document.getElementById('err-uf-staffId');
        if (errStaffId) errStaffId.textContent = '';
        if (staffIdInput) staffIdInput.classList.remove('is-invalid');

        const errSecId = document.getElementById('err-uf-secondaryId');
        if (errSecId) errSecId.textContent = '';
        if (secondaryIdInput) secondaryIdInput.classList.remove('is-invalid');

        if (typeof lucide !== 'undefined' && lucide.createIcons) {
          lucide.createIcons();
        }
      } else {
        if (badge) badge.style.display = 'none';
      }
    };

    if (staffIdInput) {
      staffIdInput.addEventListener('input', (e) => {
        const err = document.getElementById('err-uf-staffId');
        if (err) err.textContent = '';
        staffIdInput.classList.remove('is-invalid');
        performStaffVlookup(e.target.value, false);
      });
      staffIdInput.addEventListener('change', (e) => performStaffVlookup(e.target.value, false));
      staffIdInput.addEventListener('blur', (e) => {
        if (e.target.value && typeof StatusCalculator !== 'undefined') {
          e.target.value = StatusCalculator.format4DigitId(e.target.value);
        }
      });
    }

    if (secondaryIdInput) {
      secondaryIdInput.addEventListener('input', (e) => {
        const err = document.getElementById('err-uf-secondaryId');
        if (err) err.textContent = '';
        secondaryIdInput.classList.remove('is-invalid');
        performStaffVlookup(e.target.value, true);
      });
      secondaryIdInput.addEventListener('change', (e) => performStaffVlookup(e.target.value, true));
      secondaryIdInput.addEventListener('blur', (e) => {
        if (e.target.value && typeof StatusCalculator !== 'undefined') {
          e.target.value = StatusCalculator.format4DigitId(e.target.value);
        }
      });
    }

    // Dynamic date calculations on change
    const dobInput = document.getElementById('uf-dob');
    if (dobInput) {
      dobInput.addEventListener('change', (e) => {
        const ageBadge = document.getElementById('uf-age-calculated');
        if (ageBadge) {
          ageBadge.textContent = StatusCalculator.calculateAge(e.target.value);
        }
      });
    }

    const serviceDateInput = document.getElementById('uf-serviceStartDate');
    if (serviceDateInput) {
      serviceDateInput.addEventListener('change', (e) => {
        const durBadge = document.getElementById('uf-service-duration-calculated');
        if (durBadge) {
          durBadge.textContent = StatusCalculator.calculateServiceDuration(e.target.value);
        }
      });
    }

    const statusDropdown = document.getElementById('uf-customStatus');
    if (statusDropdown) {
      statusDropdown.addEventListener('change', (e) => {
        const val = e.target.value;
        const closingDateInput = document.getElementById('uf-systemClosingDate');

        // If user selects 'closed', auto-fill today's closing date if empty and set remark to 'Inactive'
        if (val === 'closed') {
          if (closingDateInput && !closingDateInput.value) {
            closingDateInput.value = new Date().toISOString().slice(0, 10);
          }
          const remarkInput = document.getElementById('uf-remark');
          const remarkSelect = document.getElementById('uf-remark-select');
          if (remarkInput) remarkInput.value = 'Inactive';
          if (remarkSelect) remarkSelect.value = 'Inactive';
        } else {
          // If user switches away from closed (e.g. active, AUTO, pending...), clear closing date so it unlocks completely
          if (closingDateInput && closingDateInput.value) {
            closingDateInput.value = '';
          }
          const remarkInput = document.getElementById('uf-remark');
          const remarkSelect = document.getElementById('uf-remark-select');
          if (val === 'active') {
            if (remarkInput && (!remarkInput.value || remarkInput.value.toLowerCase().includes('inactive'))) {
              remarkInput.value = 'Active';
            }
            if (remarkSelect && (!remarkSelect.value || remarkSelect.value.toLowerCase().includes('inactive'))) {
              remarkSelect.value = 'Active';
            }
          }
        }

        const statusBadge = document.getElementById('uf-status-calculated');
        if (statusBadge) {
          const fakeRec = this.getFormData();
          fakeRec.customStatus = val;
          const calc = StatusCalculator.calculateStatus(fakeRec);
          statusBadge.textContent = `${calc.labelKh} (${calc.labelEn})`;
          statusBadge.className = `status-badge ${calc.cssClass}`;
        }

        this.updateFormLockState();

        if (typeof app !== 'undefined' && val === 'active') {
          app.showToast('🟢 បានប្តូរស្ថានភាពទៅជា «កំពុងដំណើរការ (Active)» និងបើកសិទ្ធិកែប្រែ!', 'success');
        }
      });
    }

    const closingDateInput = document.getElementById('uf-systemClosingDate');
    if (closingDateInput) {
      closingDateInput.addEventListener('change', (e) => {
        if (e.target.value.trim() !== '') {
          const statusDropdown = document.getElementById('uf-customStatus');
          if (statusDropdown && statusDropdown.value === 'AUTO') {
            statusDropdown.value = 'closed';
          }
        }
        this.updateFormLockState();
      });
    }

    // Remark Droplist selector event
    const remarkSelect = document.getElementById('uf-remark-select');
    const remarkTextarea = document.getElementById('uf-remark');
    if (remarkSelect && remarkTextarea) {
      remarkSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val) {
          remarkTextarea.value = val;
          remarkTextarea.focus();
          this.updateCalculatedBadges();
          this.updateFormLockState();
        }
      });

      remarkTextarea.addEventListener('input', () => {
        this.updateCalculatedBadges();
        this.updateFormLockState();
      });
    }

    // Auto-sync Request Date to Start Date with Custom Override option
    const reqDateInput = document.getElementById('uf-requestDate');
    const startDateInput = document.getElementById('uf-startDate');

    if (reqDateInput && startDateInput) {
      const handleReqDateChange = (e) => {
        const val = e.target.value;
        if (!this.isStartDateManuallyEdited || !startDateInput.value) {
          startDateInput.value = val;
          this.updateStartDateIndicator(true);
        }
      };

      reqDateInput.addEventListener('input', handleReqDateChange);
      reqDateInput.addEventListener('change', handleReqDateChange);

      const handleStartDateChange = () => {
        if (startDateInput.value && reqDateInput.value && startDateInput.value !== reqDateInput.value) {
          this.isStartDateManuallyEdited = true;
          this.updateStartDateIndicator(false);
        } else {
          this.isStartDateManuallyEdited = false;
          this.updateStartDateIndicator(true);
        }
      };

      startDateInput.addEventListener('input', handleStartDateChange);
      startDateInput.addEventListener('change', handleStartDateChange);
    }

    // Suspension Duration Live Calculation Listeners
    const reasonInput = document.getElementById('uf-requestReason');
    const endDateInput = document.getElementById('uf-endDate');
    if (reasonInput) reasonInput.addEventListener('change', () => this.updateSuspensionDuration());
    if (reqDateInput) reqDateInput.addEventListener('change', () => this.updateSuspensionDuration());
    if (startDateInput) startDateInput.addEventListener('change', () => this.updateSuspensionDuration());
    if (endDateInput) endDateInput.addEventListener('change', () => this.updateSuspensionDuration());
  }

  syncStartDateWithRequestDate() {
    const reqDateInput = document.getElementById('uf-requestDate');
    const startDateInput = document.getElementById('uf-startDate');
    if (reqDateInput && startDateInput) {
      startDateInput.value = reqDateInput.value;
      this.isStartDateManuallyEdited = false;
      this.updateStartDateIndicator(true);
      this.updateSuspensionDuration();
      if (typeof app !== 'undefined') {
        app.showToast('បានកំណត់ថ្ងៃចាប់ផ្តើមស្មើថ្ងៃស្នើសុំ (Synced Start Date with Request Date)', 'info');
      }
    }
  }

  updateStartDateIndicator(isSynced) {
    const ind = document.getElementById('uf-startdate-sync-indicator');
    if (!ind) return;
    if (isSynced) {
      ind.textContent = '⚡ ស្វ័យប្រវត្ត (Auto)';
      ind.style.color = 'var(--primary)';
      ind.style.background = 'rgba(79, 70, 229, 0.08)';
      ind.title = 'ថ្ងៃចាប់ផ្តើមដើរតាមថ្ងៃស្នើសុំដោយស្វ័យប្រវត្ត (ចុចលើប្រអប់ដើម្បីកែប្រែដោយសេរី)';
    } else {
      ind.textContent = '✏️ កែប្រែដោយផ្ទាល់ (Custom)';
      ind.style.color = '#d97706';
      ind.style.background = 'rgba(217, 119, 6, 0.12)';
      ind.title = 'ថ្ងៃចាប់ផ្តើមខុសពីថ្ងៃស្នើសុំ (ចុចទីនេះដើម្បីកំណត់ស្មើថ្ងៃស្នើសុំវិញ)';
    }
  }

  /**
   * Update calculated age, duration, status, and suspension duration badges in real-time
   */
  updateCalculatedBadges() {
    const dobVal = document.getElementById('uf-dob')?.value;
    const serviceDateVal = document.getElementById('uf-serviceStartDate')?.value;
    const ageBadge = document.getElementById('uf-age-calculated');
    if (ageBadge) {
      ageBadge.textContent = StatusCalculator.calculateAge(dobVal);
    }
    const durBadge = document.getElementById('uf-service-duration-calculated');
    if (durBadge) {
      durBadge.textContent = StatusCalculator.calculateServiceDuration(serviceDateVal);
    }

    const statusBadge = document.getElementById('uf-status-calculated');
    if (statusBadge) {
      const fakeRec = this.getFormData();
      const calc = StatusCalculator.calculateStatus(fakeRec);
      statusBadge.textContent = `${calc.labelKh} (${calc.labelEn})`;
      statusBadge.className = `status-badge ${calc.cssClass}`;
    }

    this.updateSuspensionDuration();
    this.checkFormEligibility();
  }

  /**
   * Real-time Eligibility Gatekeeper in UserForm Modal
   */
  checkFormEligibility() {
    const alertBox = document.getElementById('uf-eligibility-alert-box');
    if (!alertBox) return;

    const staffId = (document.getElementById('uf-staffId')?.value || '').trim();
    const khmerName = (document.getElementById('uf-khmerName')?.value || '').trim();
    const reason = (document.getElementById('uf-requestReason')?.value || '').trim();

    const staffKey = staffId || khmerName;
    if (!staffKey || !reason) {
      alertBox.style.display = 'none';
      return;
    }

    if (typeof eligibilityController === 'undefined') return;

    const verdict = eligibilityController.checkEligibility(staffKey, reason);

    if (!verdict.hasHistory && verdict.verdict === 'ELIGIBLE_NEW') {
      alertBox.style.display = 'none';
      return;
    }

    alertBox.style.display = 'block';
    alertBox.style.background = verdict.bgColor;
    alertBox.style.borderColor = verdict.color;
    alertBox.style.color = verdict.color;

    alertBox.innerHTML = `
      <div style="font-size: 0.85rem; font-weight: 800; display: flex; align-items: center; gap: 0.35rem;">
        <span>${verdict.verdictLabel}</span>
      </div>
      <div style="font-size: 0.78rem; font-weight: 600; color: var(--text-primary); margin-top: 3px; line-height: 1.35;">
        ${verdict.message}
      </div>
    `;
  }

  /**
   * Live calculation for Suspension Duration in UserForm
   */
  updateSuspensionDuration() {
    const box = document.getElementById('uf-suspension-duration-box');
    const textEl = document.getElementById('uf-suspension-duration-text');
    if (!box || !textEl) return;

    const reasonEl = document.getElementById('uf-requestReason');
    const reason = reasonEl ? (reasonEl.value || '').trim() : '';

    if (!reason.includes('ព្យួរការងារ')) {
      box.style.display = 'none';
      return;
    }

    const reqDateEl = document.getElementById('uf-requestDate');
    const startDateEl = document.getElementById('uf-startDate');
    const endDateEl = document.getElementById('uf-endDate');

    const startDate = (reqDateEl && reqDateEl.value) ? reqDateEl.value : (startDateEl ? startDateEl.value : '');
    const endDate = endDateEl ? endDateEl.value : '';

    if (!startDate || !endDate) {
      box.style.display = 'none';
      return;
    }

    const duration = StatusCalculator.calculateExactDurationYMD(startDate, endDate);
    if (duration) {
      box.style.display = 'flex';
      textEl.textContent = `⏱️ ${duration}`;
      if (duration === 'កាលបរិច្ឆេទមិនត្រឹមត្រូវ') {
        textEl.style.color = '#dc2626';
        textEl.style.background = '#fef2f2';
        textEl.style.borderColor = '#fca5a5';
      } else {
        textEl.style.color = '#c2410c';
        textEl.style.background = '#fff7ed';
        textEl.style.borderColor = '#fed7aa';
      }
    } else {
      box.style.display = 'none';
    }
  }

  /**
   * Save custom Remark entered in textarea to settings reusable droplist
   */
  saveCurrentRemarkAsPreset() {
    const remarkTextarea = document.getElementById('uf-remark');
    const val = remarkTextarea ? remarkTextarea.value.trim() : '';
    if (!val) {
      alert('សូមវាយបញ្ចូលកំណត់សម្គាល់ក្នុងប្រអប់ជាមុនសិន (Please enter a remark first)');
      return;
    }
    const added = SettingsManager.addItem('remarks', val);
    if (added) {
      this.populateDropdowns();
      if (typeof app !== 'undefined') {
        app.renderSettingsLists();
        app.showToast(`បានបន្ថែម "${val}" ទៅក្នុង Droplist កំណត់សម្គាល់ជោគជ័យ!`, 'success');
      }
    } else {
      alert('កំណត់សម្គាល់នេះមានក្នុងបញ្ជី Droplist រួចហើយ (Remark already in list)');
    }
  }

  /**
    * Lock/Unlock form inputs when status is 'closed' or role is 'VIEWER'
    */
  updateFormLockState() {
    const statusSelect = document.getElementById('uf-customStatus');
    const statusVal = statusSelect ? statusSelect.value : 'AUTO';

    const role = UserControl.getCurrentRole();
    const isViewer = role.id === 'VIEWER';

    let isClosed = false;
    if (statusVal === 'closed') {
      isClosed = true;
    } else if (['active', 'pending', 'completed', 'expired', 'missing'].includes(statusVal)) {
      isClosed = false;
    } else {
      // AUTO calculation
      const fakeRec = this.getFormData();
      fakeRec.customStatus = 'AUTO';
      const calcStatus = StatusCalculator.calculateStatus(fakeRec);
      isClosed = calcStatus.key === 'closed';
    }

    const isLocked = isClosed || isViewer;

    const banner = document.getElementById('uf-locked-banner');
    if (banner) {
      if (isViewer) {
        banner.style.display = 'flex';
        banner.style.background = '#eff6ff';
        banner.style.borderColor = '#bfdbfe';
        banner.innerHTML = `
          <i data-lucide="eye" style="width: 22px; height: 22px; color: #2563eb; flex-shrink: 0;"></i>
          <div style="flex: 1;">
            <div style="font-weight: 700; font-size: 0.88rem; color: #1e40af; margin-bottom: 0.15rem;">
              👁️ របៀបមើលព័ត៌មានតែប៉ុណ្ណោះ (Viewer Mode - Read Only)
            </div>
            <div style="font-size: 0.76rem; color: #3b82f6; line-height: 1.35;">
              គណនីរបស់អ្នកមានសិទ្ធិត្រឹមតែមើលទិន្នន័យប៉ុណ្ណោះ (Read-Only) មិនអាចកែប្រែ បន្ថែម ឬលុបទិន្នន័យបានឡើយ។
            </div>
          </div>
        `;
      } else if (isClosed) {
        banner.style.display = 'flex';
        banner.style.background = '#fef2f2';
        banner.style.borderColor = '#fecaca';
        banner.innerHTML = `
          <i data-lucide="lock" style="width: 22px; height: 22px; color: #dc2626; flex-shrink: 0;"></i>
          <div style="flex: 1;">
            <div style="font-weight: 700; font-size: 0.88rem; color: #991b1b; margin-bottom: 0.15rem;">
              🔒 ប្រព័ន្ធបានបិទ (System Closed)
            </div>
            <div style="font-size: 0.76rem; color: #b91c1c; line-height: 1.35;">
              ព័ត៌មានទូទៅត្រូវបានចាក់សោរ ប៉ុន្តែលោកអ្នកនៅតែអាច <strong>កែប្រែ «ថ្ងៃខែបិទប្រព័ន្ធ (Closing Date)»</strong> និងប្តូរស្ថានភាពបានគ្រប់ពេល រួចចុច <strong>កែប្រែ (Update)</strong> ដើម្បីរក្សាទុក។
            </div>
          </div>
        `;
      } else {
        banner.style.display = 'none';
      }
    }

    // List of input IDs to lock/unlock (System closing date is excluded so it stays editable!)
    const inputIds = [
      'uf-staffId', 'uf-secondaryId', 'uf-latinName', 'uf-khmerName',
      'uf-dob', 'uf-serviceStartDate', 'uf-gender',
      'uf-department', 'uf-office', 'uf-position', 'uf-staffType',
      'uf-requestDate', 'uf-startDate', 'uf-endDate', 'uf-annualPeriod',
      'uf-requestReason', 'uf-prakasNo', 'uf-refDocument', 'uf-receivedDate',
      'uf-description', 'uf-remark', 'uf-remark-select'
    ];

    inputIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.disabled = isLocked;
        if (isLocked) {
          el.classList.add('input-locked-readonly');
        } else {
          el.classList.remove('input-locked-readonly');
        }
      }
    });

    // ថ្ងៃខែបិទប្រព័ន្ធ (System Closing Date) MUST remain editable for Admin / Officer even if closed!
    const closingDateEl = document.getElementById('uf-systemClosingDate');
    const setClosingTodayBtn = document.getElementById('btn-set-closing-today');
    if (closingDateEl) {
      if (isViewer) {
        closingDateEl.disabled = true;
        closingDateEl.classList.add('input-locked-readonly');
      } else {
        closingDateEl.disabled = false;
        closingDateEl.classList.remove('input-locked-readonly');
      }
    }
    if (setClosingTodayBtn) {
      setClosingTodayBtn.style.display = isViewer ? 'none' : 'inline-flex';
    }

    if (statusSelect && isViewer) {
      statusSelect.disabled = true;
      statusSelect.classList.add('input-locked-readonly');
    } else if (statusSelect) {
      statusSelect.disabled = false;
      statusSelect.classList.remove('input-locked-readonly');
    }

    // Dropzone lock
    const dropzone = document.getElementById('uf-attachment-dropzone');
    if (dropzone) {
      dropzone.style.pointerEvents = isLocked ? 'none' : 'auto';
      dropzone.style.opacity = isLocked ? '0.45' : '1';
      dropzone.style.display = isViewer ? 'none' : '';
    }

    const codePanel = document.getElementById('uf-att-code-panel');
    const pathPanel = document.getElementById('uf-att-path-panel');
    const optionTabs = document.querySelector('.attachment-option-tabs');
    const docCodeInput = document.getElementById('uf-input-doc-code');
    const docTitleInput = document.getElementById('uf-input-doc-title');
    const customPathInput = document.getElementById('uf-input-custom-path');
    const customTitleInput = document.getElementById('uf-input-custom-path-title');
    const defaultFolderInput = document.getElementById('uf-default-folder-path');

    if (optionTabs) {
      optionTabs.style.display = isViewer ? 'none' : 'flex';
    }
    if (codePanel) {
      if (isViewer) codePanel.style.display = 'none';
      if (docCodeInput) docCodeInput.disabled = isLocked;
      if (docTitleInput) docTitleInput.disabled = isLocked;
    }
    if (pathPanel) {
      if (isViewer) pathPanel.style.display = 'none';
      if (customPathInput) customPathInput.disabled = isLocked;
      if (customTitleInput) customTitleInput.disabled = isLocked;
    }
    if (defaultFolderInput) {
      defaultFolderInput.disabled = isLocked;
      defaultFolderInput.readOnly = isLocked;
      if (isLocked) {
        defaultFolderInput.classList.add('input-locked-readonly');
      } else {
        defaultFolderInput.classList.remove('input-locked-readonly');
      }
    }

    // Quick drive buttons (D:\, C:\) - Hide for Viewer / Locked mode
    document.querySelectorAll('.btn-quick-drive').forEach(btn => {
      btn.style.display = isLocked ? 'none' : 'inline-block';
      btn.disabled = isLocked;
    });

    // Attachment delete and edit buttons - Hide for Viewer / Locked mode
    document.querySelectorAll('.attachment-delete-btn').forEach(btn => {
      btn.style.display = isLocked ? 'none' : 'inline-flex';
    });
    document.querySelectorAll('.att-edit-btn').forEach(btn => {
      btn.style.display = isLocked ? 'none' : 'inline-flex';
    });

    // Excel VLOOKUP Template Button & Hint Banner Lock for Viewer
    const vlookupBtn = document.getElementById('btn-uf-vlookup-template');
    if (vlookupBtn) {
      vlookupBtn.style.display = isViewer ? 'none' : 'inline-flex';
      vlookupBtn.disabled = isLocked;
    }
    const vlookupHint = document.getElementById('uf-vlookup-hint-banner');
    if (vlookupHint) {
      vlookupHint.style.display = isViewer ? 'none' : 'flex';
    }

    // Action buttons display handling
    const saveBtn = document.getElementById('btn-uf-save');
    const updateBtn = document.getElementById('btn-uf-update');
    const deleteBtn = document.getElementById('btn-uf-delete');
    const leftFooterActions = document.getElementById('uf-footer-left-actions');
    const newBtn = document.getElementById('btn-uf-new');
    const searchBtn = document.getElementById('btn-uf-search');
    const clearBtn = document.getElementById('btn-uf-clear');

    // Synchronize Remark with Status: Closed -> Inactive; Active -> Active
    const remarkEl = document.getElementById('uf-remark');
    if (remarkEl) {
      if (isClosed) {
        if (!remarkEl.value || remarkEl.value.trim() === '' || remarkEl.value.trim().toLowerCase() === 'active') {
          remarkEl.value = 'Inactive';
        }
      } else if (statusVal === 'active' || (calcStatus && calcStatus.key === 'active')) {
        if (!remarkEl.value || remarkEl.value.trim() === '' || remarkEl.value.trim().toLowerCase() === 'inactive') {
          remarkEl.value = 'Active';
        }
      }
    }

    // Hide folder storage bar in closed/viewer mode
    const folderBar = document.getElementById('uf-folder-storage-bar');
    if (folderBar) {
      folderBar.style.display = isLocked ? 'none' : 'flex';
    }

    // For Viewer: strictly view-only, hide left actions (Search, Clear, New), attachment options & mutation buttons
    if (isViewer) {
      if (leftFooterActions) leftFooterActions.style.display = 'none';
      if (newBtn) newBtn.style.display = 'none';
      if (searchBtn) searchBtn.style.display = 'none';
      if (clearBtn) clearBtn.style.display = 'none';
      if (saveBtn) saveBtn.style.display = 'none';
      if (updateBtn) updateBtn.style.display = 'none';
      if (deleteBtn) deleteBtn.style.display = 'none';
    } else {
      // Unlocked Admin / Officer mode (Even if record is closed, allow Update/Save and Search/Clear/New!)
      if (leftFooterActions) leftFooterActions.style.display = 'flex';
      if (newBtn) newBtn.style.display = 'inline-flex';
      if (searchBtn) searchBtn.style.display = 'inline-flex';
      if (clearBtn) clearBtn.style.display = 'inline-flex';

      if (this.currentMode === 'NEW') {
        if (saveBtn) saveBtn.style.display = 'inline-flex';
        if (updateBtn) updateBtn.style.display = 'none';
        if (deleteBtn) deleteBtn.style.display = 'none';
      } else {
        // EDIT mode
        if (saveBtn) saveBtn.style.display = 'none';
        if (updateBtn) updateBtn.style.display = 'inline-flex';
        if (deleteBtn) deleteBtn.style.display = (role.canDelete !== false) ? 'inline-flex' : 'none';
      }
    }

    if (typeof app !== 'undefined' && app.refreshIcons) {
      app.refreshIcons();
    }
  }

  /* ---------------- Attachment Files Handling ---------------- */
  initAttachmentUploadEvents() {
    const fileInput = document.getElementById('uf-attachment-input');
    const dropzone = document.getElementById('uf-attachment-dropzone');

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        this.handleFilesSelected(e.target.files);
        fileInput.value = '';
      });
    }

    if (dropzone) {
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
          this.handleFilesSelected(e.dataTransfer.files);
        }
      });
    }
  }

  getDefaultFolderPath() {
    return localStorage.getItem('STAFF_CONTROL_DEFAULT_FOLDER_PATH') || 'D:\\GDT_Documents\\Staff_2026\\';
  }

  saveDefaultFolderPath(path) {
    const role = (typeof UserControl !== 'undefined' && UserControl.getCurrentRole) ? UserControl.getCurrentRole() : { id: 'ADMIN', canEdit: true };
    if (role.id === 'VIEWER' || !role.canEdit) {
      return;
    }
    if (path) {
      let formatted = path.trim();
      if (!formatted.endsWith('\\') && !formatted.endsWith('/')) {
        formatted += '\\';
      }
      localStorage.setItem('STAFF_CONTROL_DEFAULT_FOLDER_PATH', formatted);
      const el = document.getElementById('uf-default-folder-path');
      if (el) el.value = formatted;
    }
  }

  setQuickDrive(drivePrefix) {
    const role = (typeof UserControl !== 'undefined' && UserControl.getCurrentRole) ? UserControl.getCurrentRole() : { id: 'ADMIN', canEdit: true };
    if (role.id === 'VIEWER' || !role.canEdit) {
      if (typeof app !== 'undefined') {
        app.showToast('គណនីរបស់អ្នកជា Viewer Mode មិនអាចកែប្រែទីតាំង Folder បានទេ (Read-Only)', 'error');
      }
      return;
    }
    this.saveDefaultFolderPath(drivePrefix);
    const input = document.getElementById('uf-input-custom-path');
    if (input && !input.value) input.value = drivePrefix;
    if (typeof app !== 'undefined') {
      app.showToast(`បានជ្រើសរើសផ្លូវ Folder: ${drivePrefix}`, 'info');
    }
  }

  fillPathPreset(path) {
    const role = (typeof UserControl !== 'undefined' && UserControl.getCurrentRole) ? UserControl.getCurrentRole() : { id: 'ADMIN', canEdit: true };
    if (role.id === 'VIEWER' || !role.canEdit) return;
    const input = document.getElementById('uf-input-custom-path');
    if (input) {
      input.value = path;
      input.focus();
    }
  }

  handleFilesSelected(fileList) {
    const role = (typeof UserControl !== 'undefined' && UserControl.getCurrentRole) ? UserControl.getCurrentRole() : { id: 'ADMIN', canEdit: true };
    if (role.id === 'VIEWER' || !role.canEdit) {
      alert('គណនីរបស់អ្នកជា Viewer Mode មិនអាចភ្ជាប់ឯកសារថ្មីបានទេ (Read-Only)');
      return;
    }
    if (!fileList || fileList.length === 0) return;

    const defaultFolder = this.getDefaultFolderPath();

    Array.from(fileList).forEach(file => {
      // Max 10MB per file
      if (file.size > 10 * 1024 * 1024) {
        alert(`ឯកសារ "${file.name}" មានទំហំធំជាង 10MB (File too large)`);
        return;
      }

      const sizeStr = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${Math.round(file.size / 1024)} KB`;

      const reader = new FileReader();
      reader.onload = (e) => {
        const newAtt = {
          id: 'att-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          name: file.name,
          locationPath: defaultFolder + file.name,
          size: sizeStr,
          type: file.type || 'application/octet-stream',
          uploadDate: new Date().toLocaleString(),
          dataUrl: e.target.result
        };

        this.currentAttachments.push(newAtt);
        this.renderAttachmentsList();
        if (typeof app !== 'undefined') {
          app.showToast(`បានភ្ជាប់ឯកសារ "${file.name}" (ទីតាំង៖ ${newAtt.locationPath})`, 'success');
        }
      };

      // Read as DataURL for direct preview / download
      reader.readAsDataURL(file);
    });
  }

  switchAttachmentMode(mode) {
    const filePanel = document.getElementById('uf-att-file-panel');
    const codePanel = document.getElementById('uf-att-code-panel');
    const btnFile = document.getElementById('btn-att-tab-file');
    const btnCode = document.getElementById('btn-att-tab-code');

    if (btnFile) btnFile.classList.toggle('active', mode === 'file');
    if (btnCode) btnCode.classList.toggle('active', mode === 'code');

    if (filePanel) filePanel.style.display = mode === 'file' ? 'block' : 'none';
    if (codePanel) {
      codePanel.style.display = mode === 'code' ? 'block' : 'none';
      if (mode === 'code') {
        const input = document.getElementById('uf-input-doc-code');
        if (input) input.focus();
      }
    }
    if (typeof app !== 'undefined' && app.refreshIcons) {
      app.refreshIcons();
    }
  }

  addDocEntryCode() {
    const role = (typeof UserControl !== 'undefined' && UserControl.getCurrentRole) ? UserControl.getCurrentRole() : { id: 'ADMIN', canEdit: true };
    if (role.id === 'VIEWER' || !role.canEdit) {
      alert('គណនីរបស់អ្នកជា Viewer Mode មិនអាចបញ្ចូលលេខកូដឯកសារថ្មីបានទេ (Read-Only)');
      return;
    }
    const codeInput = document.getElementById('uf-input-doc-code');
    const titleInput = document.getElementById('uf-input-doc-title');
    if (!codeInput) return;

    const code = codeInput.value.trim();
    const title = titleInput ? titleInput.value.trim() : '';

    if (!code) {
      alert('សូមបញ្ចូលលេខកូដសម្គាល់ឯកសារ (ឧទាហរណ៍៖ MXC0231536)');
      codeInput.focus();
      return;
    }

    if (!Array.isArray(this.currentAttachments)) {
      this.currentAttachments = [];
    }

    const now = new Date();
    const timeStr = now.toLocaleDateString('km-KH') + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newDoc = {
      id: 'doc-code-' + Date.now(),
      type: 'code',
      isCode: true,
      name: code,
      code: code,
      title: title || 'លិខិតបទដ្ឋាន / Document Entry',
      size: 'Text / Code',
      uploadDate: timeStr
    };

    this.currentAttachments.push(newDoc);
    codeInput.value = '';
    if (titleInput) titleInput.value = '';

    this.renderAttachmentsList();
    if (typeof app !== 'undefined') {
      app.showToast(`បានបន្ថែមលេខកូដឯកសារ "${code}" ដោយជោគជ័យ!`, 'success');
    }
  }

  addCustomFilePath() {
    const role = (typeof UserControl !== 'undefined' && UserControl.getCurrentRole) ? UserControl.getCurrentRole() : { id: 'ADMIN', canEdit: true };
    if (role.id === 'VIEWER' || !role.canEdit) {
      alert('គណនីរបស់អ្នកជា Viewer Mode មិនអាចបន្ថែមទីតាំងឯកសារបានទេ (Read-Only)');
      return;
    }
    const pathInput = document.getElementById('uf-input-custom-path');
    const titleInput = document.getElementById('uf-input-custom-path-title');
    if (!pathInput) return;

    const fullPath = pathInput.value.trim();
    const title = titleInput ? titleInput.value.trim() : '';

    if (!fullPath) {
      alert('សូមបញ្ចូលផ្លូវទីតាំងឯកសារក្នុងកុំព្យូទ័រ (ឧទាហរណ៍៖ D:\\GDT_Documents\\Prakas_542.pdf)');
      pathInput.focus();
      return;
    }

    if (!Array.isArray(this.currentAttachments)) {
      this.currentAttachments = [];
    }

    const now = new Date();
    const timeStr = now.toLocaleDateString('km-KH') + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const fileName = fullPath.split(/[\/\\]/).pop() || fullPath;

    const newDoc = {
      id: 'doc-path-' + Date.now(),
      type: 'local_path',
      isPath: true,
      name: fileName,
      locationPath: fullPath,
      title: title || 'ទីតាំងឯកសារក្នុងកុំព្យូទ័រ (Local Path)',
      size: fullPath.startsWith('D:') ? 'Drive D:' : (fullPath.startsWith('C:') ? 'Drive C:' : 'Local Disk'),
      uploadDate: timeStr
    };

    this.currentAttachments.push(newDoc);
    pathInput.value = '';
    if (titleInput) titleInput.value = '';

    this.renderAttachmentsList();
    if (typeof app !== 'undefined') {
      app.showToast(`បានបន្ថែមទីតាំងឯកសារ "${fileName}" ដោយជោគជ័យ!`, 'success');
    }
  }

  editAttachmentPath(idx) {
    const role = (typeof UserControl !== 'undefined' && UserControl.getCurrentRole) ? UserControl.getCurrentRole() : { id: 'ADMIN', canEdit: true };
    if (role.id === 'VIEWER' || !role.canEdit) {
      alert('គណនីរបស់អ្នកជា Viewer Mode មិនអាចកែប្រែទីតាំងឯកសារបានទេ (Read-Only: Cannot edit location files)');
      return;
    }
    const att = this.currentAttachments[idx];
    if (!att) return;

    const currentPath = att.locationPath || (this.getDefaultFolderPath() + (att.name || ''));
    const newPath = prompt(`កែប្រែផ្លូវទីតាំងឯកសារក្នុងកុំព្យូទ័រ (Edit Computer Folder/Drive Location):`, currentPath);
    if (newPath !== null && newPath.trim() !== '') {
      att.locationPath = newPath.trim();
      this.renderAttachmentsList();
      if (typeof app !== 'undefined') {
        app.showToast(`បានកែប្រែទីតាំងឯកសារទៅជា "${att.locationPath}"`, 'success');
      }
    }
  }

  copyAttachmentPath(path) {
    if (!path) return;
    navigator.clipboard.writeText(path).then(() => {
      if (typeof app !== 'undefined') {
        app.showToast(`📁 បានចម្លងទីតាំង "${path}" ទៅក្នុង Clipboard`, 'info');
      } else {
        alert(`បានចម្លងទីតាំងឯកសារ: ${path}`);
      }
    }).catch(() => {
      prompt('ចម្លងផ្លូវទីតាំងឯកសារ (Copy path):', path);
    });
  }

  copyDocCode(code) {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      if (typeof app !== 'undefined') {
        app.showToast(`📋 បានចម្លងលេខកូដ "${code}" ទៅក្នុង Clipboard`, 'info');
      } else {
        alert(`បានចម្លងលេខកូដ: ${code}`);
      }
    }).catch(() => {
      prompt('ចម្លងលេខកូដឯកសារ (Copy code):', code);
    });
  }

  renderAttachmentsList() {
    const container = document.getElementById('uf-attachments-list');
    if (!container) return;

    if (!this.currentAttachments || this.currentAttachments.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 1rem; color: var(--text-muted); font-size: 0.8rem;">
          គ្មានឯកសារភ្ជាប់ លេខកូដឯកសារ ឬទីតាំង Folder នៅឡើយទេ (No attached files, codes or folder paths yet)
        </div>
      `;
      return;
    }

    const defaultFolder = this.getDefaultFolderPath();
    const role = (typeof UserControl !== 'undefined' && UserControl.getCurrentRole) ? UserControl.getCurrentRole() : { id: 'ADMIN', canEdit: true };
    const isViewer = role.id === 'VIEWER';
    const statusSelect = document.getElementById('uf-customStatus');
    const isClosed = statusSelect && statusSelect.value === 'closed';
    const isLocked = isViewer || isClosed;

    container.innerHTML = this.currentAttachments.map((att, idx) => {
      // 1. Document Entry Code / Text Reference (e.g. MXC0231536)
      if (att.isCode || att.type === 'code') {
        return `
          <div class="attachment-item-card is-code" style="border-left: 3px solid var(--primary); background: var(--bg-card);">
            <div class="att-file-info">
              <div class="att-icon-box code" style="background: rgba(79, 70, 229, 0.12); color: #4f46e5;">
                <i data-lucide="hash"></i>
              </div>
              <div class="att-text">
                <div class="att-name" style="color: var(--primary); font-weight: 700; letter-spacing: 0.5px;" title="${att.code || att.name}">
                  ${att.code || att.name}
                </div>
                <div class="att-meta">${att.title ? att.title + ' • ' : ''}${att.uploadDate || ''}</div>
              </div>
            </div>
            <div class="att-actions">
              <button class="icon-btn" type="button" title="ចម្លងលេខកូដ (Copy Code)" onclick="userformController.copyDocCode('${att.code || att.name}')">
                <i data-lucide="copy"></i>
              </button>
              ${!isLocked ? `
                <button class="icon-btn icon-btn-danger attachment-delete-btn" type="button" title="លុបលេខកូដ (Delete)" onclick="userformController.removeAttachment(${idx})">
                  <i data-lucide="trash-2"></i>
                </button>
              ` : ''}
            </div>
          </div>
        `;
      }

      // 2. Direct Location Path (Drive C:, D:, Network)
      if (att.isPath || att.type === 'local_path') {
        return `
          <div class="attachment-item-card" style="border-left: 3px solid #059669; background: var(--bg-card);">
            <div class="att-file-info">
              <div class="att-icon-box" style="background: #ecfdf5; color: #059669;">
                <i data-lucide="hard-drive"></i>
              </div>
              <div class="att-text">
                <div class="att-name" title="${att.name}" style="font-weight: 700;">${att.name}</div>
                <div class="att-meta" style="font-family: monospace; font-size: 0.68rem; color: #059669; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px;" title="${att.locationPath || ''}">
                  📍 ${att.locationPath || ''}
                </div>
              </div>
            </div>
            <div class="att-actions">
              <button class="icon-btn" type="button" title="ចម្លងទីតាំងឯកសារ (Copy Path)" onclick="userformController.copyAttachmentPath('${(att.locationPath || '').replace(/\\/g, '\\\\')}')">
                <i data-lucide="copy"></i>
              </button>
              ${!isLocked ? `
                <button class="icon-btn att-edit-btn" type="button" title="កែប្រែទីតាំងឯកសារ (Edit Path)" onclick="userformController.editAttachmentPath(${idx})">
                  <i data-lucide="edit-2"></i>
                </button>
                <button class="icon-btn icon-btn-danger attachment-delete-btn" type="button" title="លុបទីតាំង (Delete)" onclick="userformController.removeAttachment(${idx})">
                  <i data-lucide="trash-2"></i>
                </button>
              ` : ''}
            </div>
          </div>
        `;
      }

      // 3. Physical File Attachment (with Location Path on Drive)
      let icon = 'file-text';
      let iconClass = 'word';
      const ext = att.name ? att.name.split('.').pop().toLowerCase() : '';
      const isPdf = ext === 'pdf' || (att.type && att.type.includes('pdf'));

      if (isPdf) {
        icon = 'file-text';
        iconClass = 'pdf';
      } else if (att.type && (att.type.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext))) {
        icon = 'image';
        iconClass = 'image';
      } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
        icon = 'sheet';
        iconClass = 'excel';
      }

      const filePath = att.locationPath || (defaultFolder + (att.name || ''));

      // Viewer Rights: Can view ONLY PDF files, and NO right to download any files
      const canPreview = att.dataUrl && (!isViewer || isPdf);
      const canDownload = !isViewer && att.dataUrl;

      return `
        <div class="attachment-item-card">
          <div class="att-file-info">
            <div class="att-icon-box ${iconClass}">
              <i data-lucide="${icon}"></i>
            </div>
            <div class="att-text">
              <div class="att-name" title="${att.name}">${att.name}</div>
              <div class="att-meta" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px;" title="${filePath}">
                <span style="font-family: monospace; font-size: 0.66rem; color: var(--text-muted);">📍 ${filePath}</span>
              </div>
            </div>
          </div>
          <div class="att-actions">
            ${canPreview ? `
              <button class="icon-btn" type="button" title="${isPdf ? 'មើលឯកសារ PDF (Preview PDF)' : 'មើលឯកសារ (Preview)'}" onclick="userformController.previewAttachment(${idx})">
                <i data-lucide="eye"></i>
              </button>
            ` : ''}
            ${canDownload ? `
              <button class="icon-btn" type="button" title="ទាញយក (Download)" onclick="userformController.downloadAttachment(${idx})">
                <i data-lucide="download"></i>
              </button>
            ` : ''}
            <button class="icon-btn" type="button" title="ចម្លងទីតាំងឯកសារ (Copy Path)" onclick="userformController.copyAttachmentPath('${filePath.replace(/\\/g, '\\\\')}')">
              <i data-lucide="copy"></i>
            </button>
            ${!isLocked ? `
              <button class="icon-btn att-edit-btn" type="button" title="កែប្រែទីតាំងឯកសារ (Edit Path)" onclick="userformController.editAttachmentPath(${idx})">
                <i data-lucide="edit-2"></i>
              </button>
              <button class="icon-btn icon-btn-danger attachment-delete-btn" type="button" title="លុបឯកសារ (Delete)" onclick="userformController.removeAttachment(${idx})">
                <i data-lucide="trash-2"></i>
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  async removeAttachment(idx) {
    const role = (typeof UserControl !== 'undefined' && UserControl.getCurrentRole) ? UserControl.getCurrentRole() : { id: 'ADMIN', canEdit: true };
    if (role.id === 'VIEWER' || !role.canEdit) {
      alert('គណនីរបស់អ្នកជា Viewer Mode មិនអាចលុបឯកសារបានទេ (Read-Only)');
      return;
    }

    const att = this.currentAttachments[idx];
    const attName = att ? (att.code || att.name || 'ឯកសារភ្ជាប់') : 'ឯកសារភ្ជាប់';

    let confirmed = true;
    if (typeof app !== 'undefined' && app.showConfirm) {
      confirmed = await app.showConfirm({
        title: 'ការបញ្ជាក់ការលុបឯកសារ',
        messageKh: `តើអ្នកពិតជាចង់លុប <strong>"${attName}"</strong> នេះចេញមែនទេ?`,
        messageEn: 'This attachment will be removed from this document record.',
        icon: 'trash-2',
        type: 'danger',
        confirmText: 'លុបឯកសារ',
        cancelText: 'បោះបង់'
      });
    } else {
      confirmed = confirm('តើអ្នកពិតជាចង់លុបឯកសារភ្ជាប់នេះមែនទេ?');
    }

    if (confirmed) {
      this.currentAttachments.splice(idx, 1);
      this.renderAttachmentsList();
    }
  }

  previewAttachment(idx) {
    const att = this.currentAttachments[idx];
    if (!att) return;

    const role = (typeof UserControl !== 'undefined' && UserControl.getCurrentRole) ? UserControl.getCurrentRole() : { id: 'ADMIN', canEdit: true };
    const ext = att.name ? att.name.split('.').pop().toLowerCase() : '';
    const isPdf = ext === 'pdf' || (att.type && att.type.includes('pdf'));

    if (role.id === 'VIEWER' && !isPdf) {
      if (typeof app !== 'undefined') {
        app.showToast('គណនី Viewer អាចបើកមើលបានតែឯកសារប្រភេទ PDF ប៉ុណ្ណោះ (Viewer can only view PDF files)', 'warning');
      } else {
        alert('គណនី Viewer អាចបើកមើលបានតែឯកសារប្រភេទ PDF ប៉ុណ្ណោះ (Viewer can only view PDF files)');
      }
      return;
    }

    const modal = document.getElementById('lightbox-preview-modal');
    const title = document.getElementById('lightbox-file-name');
    const body = document.getElementById('lightbox-body-content');

    if (modal && title && body) {
      title.textContent = att.name;

      if (isPdf) {
        body.innerHTML = `<iframe src="${att.dataUrl || ''}" style="width: 100%; height: 75vh; border: none; border-radius: 8px;"></iframe>`;
      } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) || (att.type && att.type.includes('image'))) {
        body.innerHTML = `<img src="${att.dataUrl || ''}" alt="${att.name}" style="max-width: 100%; max-height: 75vh; border-radius: 8px; object-fit: contain;">`;
      } else {
        const canDownload = role.id !== 'VIEWER';
        body.innerHTML = `
          <div style="padding: 2rem; text-align: center;">
            <i data-lucide="file-text" style="width: 48px; height: 48px; color: var(--primary); margin-bottom: 1rem;"></i>
            <h4 style="margin-bottom: 0.5rem;">${att.name}</h4>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1.5rem;">${canDownload ? 'ប្រភេទឯកសារនេះមិនអាច Preview ផ្ទាល់បានទេ សូមទាញយកដើម្បីបើកមើល។' : 'គណនី Viewer មិនមានសិទ្ធិទាញយកឯកសារនេះទេ។'}</p>
            ${canDownload ? `
              <button class="btn btn-primary" onclick="userformController.downloadAttachment(${idx})">
                <i data-lucide="download"></i> <span>ទាញយកឯកសារ (${att.size})</span>
              </button>
            ` : ''}
          </div>
        `;
      }

      modal.classList.add('open');
      if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
      }
    }
  }

  downloadAttachment(idx) {
    const role = (typeof UserControl !== 'undefined' && UserControl.getCurrentRole) ? UserControl.getCurrentRole() : { id: 'ADMIN', canEdit: true };
    if (role.id === 'VIEWER') {
      if (typeof app !== 'undefined') {
        app.showToast('គណនី Viewer គ្មានសិទ្ធិទាញយកឯកសារទេ (Viewer has no right to download files)', 'error');
      } else {
        alert('គណនី Viewer គ្មានសិទ្ធិទាញយកឯកសារទេ (Viewer has no right to download files)');
      }
      return;
    }

    const att = this.currentAttachments[idx];
    if (!att) return;

    if (att.dataUrl) {
      const a = document.createElement('a');
      a.href = att.dataUrl;
      a.download = att.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      alert('មិនមានទិន្នន័យឯកសារដើម្បីទាញយកទេ (No file data)');
    }
  }

  /* ---------------- Update Information & Metadata Banner ---------------- */
  renderUpdateMetadata(record) {
    const metaBar = document.getElementById('uf-record-meta-bar');
    if (!metaBar) return;

    if (this.currentMode === 'NEW' || !record || !record.metadata) {
      metaBar.style.display = 'none';
      return;
    }

    metaBar.style.display = 'flex';
    const meta = record.metadata;

    const createdEl = document.getElementById('meta-created-at');
    const createdByEl = document.getElementById('meta-created-by');
    const updatedEl = document.getElementById('meta-updated-at');
    const updatedByEl = document.getElementById('meta-updated-by');
    const versionEl = document.getElementById('meta-version-badge');

    if (createdEl) createdEl.textContent = meta.createdAt || '-';
    if (createdByEl) createdByEl.textContent = meta.createdBy || 'Admin';
    if (updatedEl) updatedEl.textContent = meta.updatedAt || meta.createdAt || '-';
    if (updatedByEl) updatedByEl.textContent = meta.updatedBy || 'Admin';
    if (versionEl) versionEl.textContent = `v${meta.version || 1}`;

    // Render change history timeline
    const historyBox = document.getElementById('uf-change-history-list');
    if (historyBox) {
      const logs = meta.changeLog || [{ timestamp: meta.createdAt, user: meta.createdBy, action: 'បង្កើតកំណត់ត្រា' }];
      historyBox.innerHTML = logs.map(l => `
        <div class="history-item">
          <div class="history-dot"></div>
          <div>
            <div style="font-weight: 700; color: var(--text-primary);">${l.action}</div>
            <div style="color: var(--text-muted); font-size: 0.7rem;">ដោយ <strong>${l.user}</strong> • ${l.timestamp}</div>
          </div>
        </div>
      `).join('');
    }
  }

  toggleChangeHistory() {
    const box = document.getElementById('uf-change-history-box');
    if (box) {
      box.classList.toggle('open');
    }
  }

  /**
   * Open UserForm in NEW mode
   */
  openNew() {
    try {
      const role = (typeof UserControl !== 'undefined' && UserControl.getCurrentRole) ? UserControl.getCurrentRole() : { canAdd: true, id: 'ADMIN' };
      if (role.id === 'VIEWER') {
        alert('🔒 សិទ្ធិមើលតែប៉ុណ្ណោះ (Read-Only Viewer): មិនអនុញ្ញាតឱ្យចុះឈ្មោះ ឬបន្ថែមទិន្នន័យថ្មីឡើយ');
        return;
      }

      this.currentMode = 'NEW';
      this.selectedRecordNo = null;
      this.currentAttachments = [];
      this.populateDropdowns();
      this.updateFieldLabels();
      this.clearForm();
      this.renderAttachmentsList();
      this.renderUpdateMetadata(null);

      const nextNo = dataStore.getNextSerialNo();
      const noEl = document.getElementById('uf-no');
      if (noEl) noEl.value = nextNo;

      const titleEl = document.getElementById('modal-title-text');
      if (titleEl) {
        titleEl.innerHTML = '<i data-lucide="user-plus"></i> <span>ចុះឈ្មោះបុគ្គលិកថ្មី (New Staff Registration)</span>';
      }
      
      // Update button states
      const saveBtn = document.getElementById('btn-uf-save');
      const updateBtn = document.getElementById('btn-uf-update');
      const deleteBtn = document.getElementById('btn-uf-delete');
      const duplicateBtn = document.getElementById('btn-uf-duplicate');

      if (saveBtn) saveBtn.style.display = 'inline-flex';
      if (updateBtn) updateBtn.style.display = 'none';
      if (deleteBtn) deleteBtn.style.display = 'none';
      if (duplicateBtn) duplicateBtn.style.display = 'none';

      // Unlock all inputs unconditionally for NEW registration
      const banner = document.getElementById('uf-locked-banner');
      if (banner) banner.style.display = 'none';

      const inputIds = [
        'uf-staffId', 'uf-secondaryId', 'uf-latinName', 'uf-khmerName',
        'uf-dob', 'uf-serviceStartDate', 'uf-gender',
        'uf-department', 'uf-office', 'uf-position', 'uf-staffType',
        'uf-requestDate', 'uf-startDate', 'uf-endDate', 'uf-annualPeriod',
        'uf-requestReason', 'uf-prakasNo', 'uf-refDocument', 'uf-receivedDate',
        'uf-systemClosingDate', 'uf-description', 'uf-remark', 'uf-remark-select'
      ];
      inputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.disabled = false;
          el.readOnly = false;
        }
      });

      const startRadio = document.getElementById('uf-maturity-start');
      const endRadio = document.getElementById('uf-maturity-end');
      if (startRadio) startRadio.checked = false;
      if (endRadio) endRadio.checked = true;

      this.isStartDateManuallyEdited = false;
      this.updateStartDateIndicator(true);
      this.showModal();
    } catch (err) {
      console.error('openNew error:', err);
      this.showModal();
    }
  }

  /**
   * Open UserForm in EDIT mode with existing record data
   */
  openEdit(recordNo) {
    const list = dataStore.getStaffData();
    const record = list.find(item => String(item.no) === String(recordNo));
    if (!record) {
      alert('រកមិនឃើញទិន្នន័យបុគ្គលិកនេះទេ (Record not found)');
      return;
    }

    this.currentMode = 'EDIT';
    this.selectedRecordNo = record.no;
    this.currentAttachments = record.attachments ? [...record.attachments] : [];
    
    this.populateDropdowns();
    this.updateFieldLabels();
    this.clearErrors();
    this.renderAttachmentsList();
    this.renderUpdateMetadata(record);

    // Map record values to UserForm inputs
    const fields = dataStore.getMasterFields();
    fields.forEach(f => {
      const el = document.getElementById(`uf-${f.key}`);
      if (el) {
        if (f.type === 'date') {
          el.value = StatusCalculator.normalizeDate(record[f.key]);
        } else if (f.key === 'gender') {
          const g = (record.gender || '').trim();
          if (g.toLowerCase() === 'm' || g.toLowerCase() === 'male' || g.includes('ប្រុស')) {
            el.value = 'ប្រុស';
          } else if (g.toLowerCase() === 'f' || g.toLowerCase() === 'female' || g.includes('ស្រី')) {
            el.value = 'ស្រី';
          } else {
            el.value = g;
          }
        } else {
          el.value = record[f.key] || '';
        }
      }
    });

    const staffTypeSelect = document.getElementById('uf-staffType');
    if (staffTypeSelect) {
      staffTypeSelect.value = record.staffType || 'មន្ត្រីក្របខណ្ឌ (Civil Servant)';
    }

    // Check if startDate matches requestDate or is custom
    if (record.startDate && record.requestDate && record.startDate !== record.requestDate) {
      this.isStartDateManuallyEdited = true;
      this.updateStartDateIndicator(false);
    } else {
      this.isStartDateManuallyEdited = false;
      this.updateStartDateIndicator(true);
    }

    // Update calculated badges
    const ageBadge = document.getElementById('uf-age-calculated');
    if (ageBadge) ageBadge.textContent = StatusCalculator.calculateAge(record.dob);

    const durBadge = document.getElementById('uf-service-duration-calculated');
    if (durBadge) durBadge.textContent = StatusCalculator.calculateServiceDuration(record.serviceStartDate);

    const statusObj = StatusCalculator.calculateStatus(record);
    const statusEl = document.getElementById('uf-status-calculated');
    if (statusEl) {
      statusEl.textContent = `${statusObj.labelKh} (${statusObj.labelEn})`;
      statusEl.className = `status-badge ${statusObj.cssClass}`;
    }

    // Update customStatus dropdown
    const statusSelect = document.getElementById('uf-customStatus');
    if (statusSelect) {
      statusSelect.value = record.customStatus || 'AUTO';
    }

    const role = UserControl.getCurrentRole();
    const isViewer = role.id === 'VIEWER';

    const titleEl = document.getElementById('modal-title-text');
    if (titleEl) {
      titleEl.innerHTML = isViewer
        ? `<i data-lucide="eye"></i> <span>ព័ត៌មានលម្អិតបុគ្គលិក #${record.no} - ${record.khmerName} (${record.staffId}) [View-Only]</span>`
        : `<i data-lucide="edit-3"></i> <span>កែប្រែទិន្នន័យបុគ្គលិក #${record.no} - ${record.khmerName} (${record.staffId})</span>`;
    }

    // Update button states
    const saveBtn = document.getElementById('btn-uf-save');
    const updateBtn = document.getElementById('btn-uf-update');
    const deleteBtn = document.getElementById('btn-uf-delete');
    const duplicateBtn = document.getElementById('btn-uf-duplicate');

    if (saveBtn) saveBtn.style.display = 'none';
    if (updateBtn) updateBtn.style.display = isViewer ? 'none' : 'inline-flex';
    if (deleteBtn) deleteBtn.style.display = (isViewer || !role.canDelete) ? 'none' : 'inline-flex';
    if (duplicateBtn) duplicateBtn.style.display = isViewer ? 'none' : 'inline-flex';

    // Update maturityBase radio selection
    const maturityBase = record.maturityBase || 'endDate';
    const startRadio = document.getElementById('uf-maturity-start');
    const endRadio = document.getElementById('uf-maturity-end');
    if (startRadio) startRadio.checked = (maturityBase === 'startDate');
    if (endRadio) endRadio.checked = (maturityBase !== 'startDate');

    this.updateFormLockState();
    this.showModal();
  }

  /**
   * Helper: Open Edit mode then trigger duplicate
   */
  duplicateFromRecord(recordNo) {
    this.openEdit(recordNo);
    setTimeout(() => {
      this.handleDuplicateRecord();
    }, 150);
  }

  /**
   * Duplicate existing record to quickly create a new request record for the same officer.
   * Pre-fills personal/organizational info, resets request dates/reasons, and focuses user on new request entry.
   */
  handleDuplicateRecord() {
    try {
      const currentNo = this.selectedRecordNo;
      const list = dataStore.getStaffData();
      const record = list.find(item => String(item.no) === String(currentNo));

      if (!record) {
        if (typeof app !== 'undefined') app.showToast('⚠️ រកមិនឃើញទិន្នន័យដើម្បីចម្លងទេ', 'warning');
        return;
      }

      const officerName = record.khmerName || record.latinName || 'បុគ្គលិក';
      const staffId = record.staffId || '';

      // Switch mode to NEW registration
      this.currentMode = 'NEW';
      this.selectedRecordNo = null;
      
      // Auto-assign next serial number
      const nextNo = dataStore.getNextSerialNo();
      const noEl = document.getElementById('uf-no');
      if (noEl) noEl.value = nextNo;

      // Update Modal Title
      const titleEl = document.getElementById('modal-title-text');
      if (titleEl) {
        titleEl.innerHTML = `<i data-lucide="copy"></i> <span>📋 ចម្លងបង្កើតសំណើថ្មីសម្រាប់៖ ${officerName} (${staffId})</span>`;
      }

      // Update button visibility (Switch to Save Mode)
      const saveBtn = document.getElementById('btn-uf-save');
      const updateBtn = document.getElementById('btn-uf-update');
      const deleteBtn = document.getElementById('btn-uf-delete');
      const duplicateBtn = document.getElementById('btn-uf-duplicate');

      if (saveBtn) saveBtn.style.display = 'inline-flex';
      if (updateBtn) updateBtn.style.display = 'none';
      if (deleteBtn) deleteBtn.style.display = 'none';
      if (duplicateBtn) duplicateBtn.style.display = 'none';

      // Unlock form inputs
      const banner = document.getElementById('uf-locked-banner');
      if (banner) banner.style.display = 'none';

      const inputIds = [
        'uf-staffId', 'uf-secondaryId', 'uf-latinName', 'uf-khmerName',
        'uf-dob', 'uf-serviceStartDate', 'uf-gender',
        'uf-department', 'uf-office', 'uf-position', 'uf-staffType',
        'uf-requestDate', 'uf-startDate', 'uf-endDate', 'uf-annualPeriod',
        'uf-requestReason', 'uf-prakasNo', 'uf-refDocument', 'uf-receivedDate',
        'uf-systemClosingDate', 'uf-description', 'uf-remark', 'uf-remark-select'
      ];
      inputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.disabled = false;
          el.readOnly = false;
        }
      });

      // Reset request-specific fields for new request entry
      const resetFields = ['uf-requestReason', 'uf-requestDate', 'uf-startDate', 'uf-endDate', 'uf-prakasNo', 'uf-refDocument', 'uf-description', 'uf-systemClosingDate'];
      resetFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });

      // Clear attachments for new request or keep attachments if desired
      this.currentAttachments = [];
      this.renderAttachmentsList();
      this.renderUpdateMetadata(null);

      // Set today's date for new requestDate as default
      const todayISO = StatusCalculator ? StatusCalculator.normalizeDate(new Date()) : new Date().toISOString().slice(0, 10);
      const reqDateEl = document.getElementById('uf-requestDate');
      if (reqDateEl) reqDateEl.value = todayISO;

      const startDateEl = document.getElementById('uf-startDate');
      if (startDateEl) startDateEl.value = todayISO;

      // Toast notification and focus on requestReason or requestDate
      if (typeof app !== 'undefined') {
        app.showToast(`📋 បានចម្លងព័ត៌មានបុគ្គលិក «${officerName}» រួចរាល់! សូមបញ្ចូលមូលហេតុ និងថ្ងៃខែឆ្នាំសំណើថ្មី`, 'info');
      }

      const focusEl = document.getElementById('uf-requestReason') || document.getElementById('uf-requestDate');
      if (focusEl) {
        focusEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        focusEl.focus();
      }

      if (typeof app !== 'undefined' && app.refreshIcons) {
        app.refreshIcons();
      }
    } catch (err) {
      console.error('handleDuplicateRecord error:', err);
    }
  }

  showModal() {
    if (!this.modalEl) {
      this.modalEl = document.getElementById('userform-modal');
    }
    if (this.modalEl) {
      this.modalEl.classList.add('open');
    }
    if (typeof app !== 'undefined' && app.refreshIcons) {
      app.refreshIcons();
    }
  }

  closeModal() {
    if (!this.modalEl) {
      this.modalEl = document.getElementById('userform-modal');
    }
    if (this.modalEl) {
      this.modalEl.classList.remove('open');
    }
    this.clearErrors();
  }

  clearForm() {
    const role = (typeof UserControl !== 'undefined' && UserControl.getCurrentRole) ? UserControl.getCurrentRole() : { id: 'ADMIN', canEdit: true };
    if (role.id === 'VIEWER' || !role.canEdit) {
      return; // Viewer cannot clear or reset form
    }

    if (!this.formEl) {
      this.formEl = document.getElementById('staff-userform');
    }
    if (this.formEl) this.formEl.reset();

    const noEl = document.getElementById('uf-no');
    if (noEl) noEl.value = dataStore.getNextSerialNo();

    const ageEl = document.getElementById('uf-age-calculated');
    if (ageEl) ageEl.textContent = '-';

    const durEl = document.getElementById('uf-service-duration-calculated');
    if (durEl) durEl.textContent = '-';

    const statusEl = document.getElementById('uf-status-calculated');
    if (statusEl) {
      statusEl.textContent = 'ថ្មី (New)';
      statusEl.className = 'status-badge status-pending';
    }

    const statusSelect = document.getElementById('uf-customStatus');
    if (statusSelect) statusSelect.value = 'AUTO';

    const remarkSelect = document.getElementById('uf-remark-select');
    if (remarkSelect) remarkSelect.value = '';

    const vlookupBadge = document.getElementById('uf-vlookup-badge');
    if (vlookupBadge) vlookupBadge.style.display = 'none';

    const docCodeInput = document.getElementById('uf-input-doc-code');
    if (docCodeInput) docCodeInput.value = '';
    const docTitleInput = document.getElementById('uf-input-doc-title');
    if (docTitleInput) docTitleInput.value = '';

    const customPathInput = document.getElementById('uf-input-custom-path');
    if (customPathInput) customPathInput.value = '';
    const customTitleInput = document.getElementById('uf-input-custom-path-title');
    if (customTitleInput) customTitleInput.value = '';

    const defaultFolderInput = document.getElementById('uf-default-folder-path');
    if (defaultFolderInput) defaultFolderInput.value = this.getDefaultFolderPath();

    this.switchAttachmentMode('file');

    const staffTypeSelect = document.getElementById('uf-staffType');
    if (staffTypeSelect) staffTypeSelect.value = 'មន្ត្រីក្របខណ្ឌ (Civil Servant)';

    this.currentAttachments = [];
    this.renderAttachmentsList();
    this.clearErrors();
    this.updateFormLockState();
  }

  getFormData() {
    const record = {};
    const fields = dataStore.getMasterFields();
    fields.forEach(f => {
      const el = document.getElementById(`uf-${f.key}`);
      if (el) {
        record[f.key] = el.value !== undefined ? el.value.trim() : '';
      } else {
        record[f.key] = '';
      }
    });

    // Auto-map Reason of Request -> Reason/Remark for individual request record
    if (record.requestReason && record.requestReason.trim() !== '') {
      if (!record.remark || record.remark.trim() === '' || record.remark === 'undefined') {
        record.remark = record.requestReason.trim();
      }
    } else {
      if (record.remark === 'undefined') {
        record.remark = '';
      }
    }

    const staffTypeSelect = document.getElementById('uf-staffType');
    if (staffTypeSelect) {
      record.staffType = staffTypeSelect.value || 'មន្ត្រីក្របខណ្ឌ (Civil Servant)';
    }

    if (record.staffId && typeof StatusCalculator !== 'undefined' && StatusCalculator.format4DigitId) {
      record.staffId = StatusCalculator.format4DigitId(record.staffId);
    }
    if (record.secondaryId && typeof StatusCalculator !== 'undefined' && StatusCalculator.format4DigitId) {
      record.secondaryId = StatusCalculator.format4DigitId(record.secondaryId);
    }

    const noVal = document.getElementById('uf-no')?.value;
    record.no = noVal ? parseInt(noVal, 10) : dataStore.getNextSerialNo();
    record.attachments = Array.isArray(this.currentAttachments) ? [...this.currentAttachments] : [];
    const statusVal = document.getElementById('uf-customStatus')?.value;
    record.customStatus = statusVal || 'AUTO';

    const maturityStartRadio = document.getElementById('uf-maturity-start');
    record.maturityBase = (maturityStartRadio && maturityStartRadio.checked) ? 'startDate' : 'endDate';

    return record;
  }

  handleMaturityBaseChange(base) {
    const fakeRec = this.getFormData();
    fakeRec.maturityBase = base;
    const calc = StatusCalculator.calculateStatus(fakeRec);
    const statusEl = document.getElementById('uf-status-calculated');
    if (statusEl) {
      statusEl.textContent = `${calc.labelKh} (${calc.labelEn})`;
      statusEl.className = `status-badge ${calc.cssClass}`;
    }
  }

  setClosingDateToday() {
    const role = (typeof UserControl !== 'undefined' && UserControl.getCurrentRole) ? UserControl.getCurrentRole() : { id: 'ADMIN', canEdit: true };
    if (role.id === 'VIEWER') return;
    const closingInput = document.getElementById('uf-systemClosingDate');
    if (closingInput) {
      closingInput.value = new Date().toISOString().slice(0, 10);
      const statusDropdown = document.getElementById('uf-customStatus');
      if (statusDropdown && statusDropdown.value !== 'closed') {
        statusDropdown.value = 'closed';
      }
      this.updateFormLockState();
    }
  }

  clearErrors() {
    document.querySelectorAll('.field-error-msg').forEach(el => el.textContent = '');
    document.querySelectorAll('.form-control.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  }

  displayErrors(errors) {
    this.clearErrors();
    Object.keys(errors).forEach(key => {
      const errEl = document.getElementById(`err-uf-${key}`);
      const inputEl = document.getElementById(`uf-${key}`);
      if (errEl) errEl.textContent = errors[key];
      if (inputEl) inputEl.classList.add('is-invalid');
    });
  }

  /**
   * Action: Save New Record
   */
  handleSave() {
    try {
      const role = (typeof UserControl !== 'undefined' && UserControl.getCurrentRole) ? UserControl.getCurrentRole() : { canAdd: true, id: 'ADMIN', titleKh: 'អ្នកគ្រប់គ្រង' };
      if (role.id === 'VIEWER') {
        alert('អ្នកមិនមានសិទ្ធិបញ្ចូលទិន្នន័យថ្មីទេ (Permission denied - Viewer Read Only)');
        return;
      }

      const newRecord = this.getFormData();
      const existingList = dataStore.getStaffData();

      // Fallbacks & Normalization
      if (!newRecord.department) newRecord.department = 'មិនទាន់បញ្ជាក់';
      if (!newRecord.office) newRecord.office = 'មិនទាន់បញ្ជាក់';
      if (!newRecord.position) newRecord.position = 'មន្ត្រី';
      
      // Gender normalization
      if (newRecord.gender) {
        const g = newRecord.gender.trim();
        if (g.toLowerCase() === 'm' || g.toLowerCase() === 'male' || g.includes('ប្រុស')) {
          newRecord.gender = 'ប្រុស';
        } else if (g.toLowerCase() === 'f' || g.toLowerCase() === 'female' || g.includes('ស្រី')) {
          newRecord.gender = 'ស្រី';
        }
      } else {
        newRecord.gender = 'មិនទាន់បញ្ជាក់';
      }

      if (!newRecord.latinName && newRecord.khmerName) newRecord.latinName = newRecord.khmerName;

      // Validate
      const validation = Validator.validate(newRecord, existingList, false);
      if (!validation.isValid) {
        this.displayErrors(validation.errors);
        const firstErr = document.querySelector('.form-control.is-invalid');
        if (firstErr) {
          firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstErr.focus();
        }
        if (typeof app !== 'undefined') {
          const firstErrMsg = Object.values(validation.errors)[0];
          app.showToast(firstErrMsg || 'សូមពិនិត្យព័ត៌មានដែលមិនត្រឹមត្រូវ', 'error');
        }
        return;
      }

      // Set Initial Metadata
      const nowStr = new Date().toLocaleString();
      const userStr = `${role.titleKh} (${role.id})`;

      newRecord.metadata = {
        createdAt: nowStr,
        createdBy: userStr,
        updatedAt: nowStr,
        updatedBy: role.id,
        version: 1,
        changeLog: [
          { timestamp: nowStr, user: role.id, action: `បានបង្កើតកំណត់ត្រាបុគ្គលិកថ្មី (${newRecord.attachments.length} ឯកសារភ្ជាប់)` }
        ]
      };

      // Save
      existingList.push(newRecord);
      dataStore.saveStaffData(existingList);
      
      // Auto-Transfer Data to Google Sheet / Cloud Link
      if (typeof CloudSyncService !== 'undefined') {
        CloudSyncService.syncRecord('CREATE', newRecord);
      }

      if (typeof auditLogger !== 'undefined') {
        auditLogger.log('CREATE', newRecord.staffId, `បានចុះឈ្មោះបុគ្គលិកថ្មី ${newRecord.khmerName} (${newRecord.staffId}) ភ្ជាប់ ${newRecord.attachments.length} ឯកសារ`);
      }

      if (typeof app !== 'undefined') {
        app.showToast(`បានរក្សាទុកបុគ្គលិក ${newRecord.khmerName} ដោយជោគជ័យ!`, 'success');
        this.closeModal();
        app.refreshAll();
      }
    } catch (err) {
      console.error('Save error:', err);
      if (err && (err.name === 'QuotaExceededError' || (err.message && err.message.includes('exceeded the quota')))) {
        try {
          dataStore.handleQuotaExceededRecovery(existingList);
          if (typeof app !== 'undefined') {
            app.showToast(`បានរក្សាទុកបុគ្គលិក ${newRecord.khmerName} ដោយជោគជ័យ (រក្សាទុកក្នុង IndexedDB Storage)!`, 'success');
            this.closeModal();
            app.refreshAll();
            return;
          }
        } catch (retryErr) {
          console.error('Retry save failed:', retryErr);
        }
      }
      alert('មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យ៖ ' + err.message);
    }
  }

  /**
   * Action: Update Existing Record
   */
  async handleUpdate() {
    try {
      const role = (typeof UserControl !== 'undefined' && UserControl.getCurrentRole) ? UserControl.getCurrentRole() : { canEdit: true, id: 'ADMIN', titleKh: 'អ្នកគ្រប់គ្រង' };
      if (role.id === 'VIEWER') {
        alert('អ្នកមិនមានសិទ្ធិកែប្រែទិន្នន័យទេ (Permission denied - Viewer Read Only)');
        return;
      }

      const updatedRecord = this.getFormData();
      const existingList = dataStore.getStaffData();
      const targetIdx = existingList.findIndex(item => String(item.no) === String(this.selectedRecordNo));

      if (targetIdx === -1) {
        alert('រកមិនឃើញទិន្នន័យដើម្បីកែប្រែទេ');
        return;
      }

      // Fallbacks & Normalization
      if (!updatedRecord.department) updatedRecord.department = 'មិនទាន់បញ្ជាក់';
      if (!updatedRecord.office) updatedRecord.office = 'មិនទាន់បញ្ជាក់';
      if (!updatedRecord.position) updatedRecord.position = 'មន្ត្រី';
      
      // Gender normalization
      if (updatedRecord.gender) {
        const g = updatedRecord.gender.trim();
        if (g.toLowerCase() === 'm' || g.toLowerCase() === 'male' || g.includes('ប្រុស')) {
          updatedRecord.gender = 'ប្រុស';
        } else if (g.toLowerCase() === 'f' || g.toLowerCase() === 'female' || g.includes('ស្រី')) {
          updatedRecord.gender = 'ស្រី';
        }
      } else {
        updatedRecord.gender = 'មិនទាន់បញ្ជាក់';
      }

      if (!updatedRecord.latinName && updatedRecord.khmerName) updatedRecord.latinName = updatedRecord.khmerName;

      // Validate
      const validation = Validator.validate(updatedRecord, existingList, true, this.selectedRecordNo);
      if (!validation.isValid) {
        this.displayErrors(validation.errors);
        const firstErr = document.querySelector('.form-control.is-invalid');
        if (firstErr) {
          firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstErr.focus();
        }
        if (typeof app !== 'undefined') {
          const firstErrMsg = Object.values(validation.errors)[0];
          app.showToast(firstErrMsg || 'សូមពិនិត្យព័ត៌មានដែលមិនត្រឹមត្រូវ', 'error');
        }
        return;
      }

      // Confirmation before updating - Beautiful Centered Custom Modal
      let confirmed = true;
      if (typeof app !== 'undefined' && app.showConfirm) {
        confirmed = await app.showConfirm({
          title: 'ការបញ្ជាក់ការកែប្រែទិន្នន័យ',
          messageKh: `តើលោកអ្នកពិតជាចង់កែប្រែទិន្នន័យរបស់ <strong>"${updatedRecord.khmerName}"</strong> (អត្តលេខ: <code>${updatedRecord.staffId}</code>) មែនទេ?`,
          messageEn: 'Are you sure you want to save your modifications to this staff record in the master database?',
          icon: 'edit-3',
          type: 'warning',
          confirmText: 'កែប្រែទិន្នន័យ',
          cancelText: 'បោះបង់'
        });
      } else {
        confirmed = confirm(`តើលោកអ្នកពិតជាចង់កែប្រែទិន្នន័យរបស់ "${updatedRecord.khmerName}" (អត្តលេខ: ${updatedRecord.staffId}) មែនទេ?`);
      }
      if (!confirmed) return;

      const oldRecord = existingList[targetIdx];
      const nowStr = new Date().toLocaleString();

      // Preserve and update metadata history
      const oldMeta = oldRecord.metadata || {
        createdAt: nowStr,
        createdBy: 'System Administrator',
        version: 1,
        changeLog: []
      };

      const newVersion = (oldMeta.version || 1) + 1;
      const historyList = oldMeta.changeLog || [];
      
      historyList.unshift({
        timestamp: nowStr,
        user: role.id,
        action: `បានកែប្រែទិន្នន័យ (v${newVersion}) • ${updatedRecord.attachments.length} ឯកសារភ្ជាប់`
      });

      updatedRecord.metadata = {
        createdAt: oldMeta.createdAt || nowStr,
        createdBy: oldMeta.createdBy || 'System Administrator',
        updatedAt: nowStr,
        updatedBy: role.id,
        version: newVersion,
        changeLog: historyList
      };

      existingList[targetIdx] = updatedRecord;
      dataStore.saveStaffData(existingList);
      
      // Auto-Transfer Updated Data to Google Sheet / Cloud Link
      if (typeof CloudSyncService !== 'undefined') {
        CloudSyncService.syncRecord('UPDATE', updatedRecord);
      }

      if (typeof auditLogger !== 'undefined') {
        auditLogger.log('UPDATE', updatedRecord.staffId, `បានកែប្រែទិន្នន័យ ${updatedRecord.khmerName} (v${newVersion})`, `អត្តលេខ៖ ${updatedRecord.staffId}`);
      }

      if (typeof app !== 'undefined') {
        app.showToast(`បានកែប្រែទិន្នន័យ ${updatedRecord.khmerName} ដោយជោគជ័យ!`, 'success');
        this.closeModal();
        app.refreshAll();
      }
    } catch (err) {
      console.error('Update error:', err);
      alert('មានបញ្ហាក្នុងការកែប្រែទិន្នន័យ៖ ' + err.message);
    }
  }

  /**
   * Action: Delete Record
   */
  async handleDelete() {
    const role = (typeof UserControl !== 'undefined' && UserControl.getCurrentRole) ? UserControl.getCurrentRole() : { canDelete: true, id: 'ADMIN' };
    if (!role.canDelete && role.id === 'VIEWER') {
      alert('អ្នកមិនមានសិទ្ធិលុបទិន្នន័យទេ (Only Administrator can delete)');
      return;
    }

    const existingList = dataStore.getStaffData();
    const targetIdx = existingList.findIndex(item => String(item.no) === String(this.selectedRecordNo));
    if (targetIdx === -1) return;

    const record = existingList[targetIdx];

    // Confirmation before deleting - Beautiful Centered Custom Modal
    let confirmed = true;
    if (typeof app !== 'undefined' && app.showConfirm) {
      confirmed = await app.showConfirm({
        title: 'ការបញ្ជាក់ការលុបទិន្នន័យ',
        messageKh: `តើលោកអ្នកពិតជាចង់លុបកំណត់ត្រាបុគ្គលិក <strong>"${record.khmerName}"</strong> (អត្តលេខ: <code>${record.staffId}</code>) នេះចេញពីប្រព័ន្ធមែនទេ?`,
        messageEn: 'Warning: This action cannot be undone! The record will be permanently deleted from the database.',
        icon: 'alert-triangle',
        type: 'danger',
        confirmText: 'លុបទិន្នន័យ',
        cancelText: 'បោះបង់'
      });
    } else {
      confirmed = confirm(`⚠️ ការព្រមាន៖ តើលោកអ្នកពិតជាចង់លុបកំណត់ត្រាបុគ្គលិក "${record.khmerName}" (អត្តលេខ: ${record.staffId}) នេះចេញពីប្រព័ន្ធមែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ!`);
    }
    if (!confirmed) return;

    existingList.splice(targetIdx, 1);
    dataStore.saveStaffData(existingList);
    
    // Auto-Transfer Deletion to Google Sheet / Cloud Link
    if (typeof CloudSyncService !== 'undefined') {
      CloudSyncService.syncRecord('DELETE', record);
    }

    if (typeof auditLogger !== 'undefined') {
      auditLogger.log('DELETE', record.staffId, `បានលុបកំណត់ត្រាបុគ្គលិក ${record.khmerName} (${record.staffId}) ចេញពីប្រព័ន្ធ`);
    }

    if (typeof app !== 'undefined') {
      app.showToast(`បានលុបបុគ្គលិក ${record.khmerName} ដោយជោគជ័យ!`, 'warning');
      this.closeModal();
      app.refreshAll();
    }
  }

  /**
   * Action: Quick Search inside Form
   */
  handleSearchPrompt() {
    const role = (typeof UserControl !== 'undefined' && UserControl.getCurrentRole) ? UserControl.getCurrentRole() : { id: 'ADMIN', canEdit: true };
    if (role.id === 'VIEWER' || !role.canEdit) {
      return; // Viewer cannot trigger in-form search prompt
    }

    const query = prompt('សូមបញ្ចូលអត្តលេខ ឬឈ្មោះបុគ្គលិកដើម្បីស្វែងរកក្នុងទម្រង់ (Enter Staff ID or Name):');
    if (!query || !query.trim()) return;

    const q = query.trim().toLowerCase();
    const list = dataStore.getStaffData();
    const match = list.find(item => 
      (item.staffId && item.staffId.toLowerCase().includes(q)) ||
      (item.secondaryId && item.secondaryId.toLowerCase().includes(q)) ||
      (item.khmerName && item.khmerName.toLowerCase().includes(q)) ||
      (item.latinName && item.latinName.toLowerCase().includes(q))
    );

    if (match) {
      this.openEdit(match.no);
    } else {
      alert(`រកមិនឃើញបុគ្គលិកដែលមានពាក្យ "${query}" ទេ`);
    }
  }
}

const userformController = new UserFormController();
