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
    }

    if (secondaryIdInput) {
      secondaryIdInput.addEventListener('input', (e) => {
        const err = document.getElementById('err-uf-secondaryId');
        if (err) err.textContent = '';
        secondaryIdInput.classList.remove('is-invalid');
        performStaffVlookup(e.target.value, true);
      });
      secondaryIdInput.addEventListener('change', (e) => performStaffVlookup(e.target.value, true));
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

        // If user selects 'closed', auto-fill today's closing date if empty
        if (val === 'closed') {
          if (closingDateInput && !closingDateInput.value) {
            closingDateInput.value = new Date().toISOString().slice(0, 10);
          }
        } else if (val === 'active' || val === 'AUTO') {
          // If user switches away from closed, clear closing date so it unlocks completely
          if (closingDateInput && closingDateInput.value) {
            closingDateInput.value = '';
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
  }

  syncStartDateWithRequestDate() {
    const reqDateInput = document.getElementById('uf-requestDate');
    const startDateInput = document.getElementById('uf-startDate');
    if (reqDateInput && startDateInput) {
      startDateInput.value = reqDateInput.value;
      this.isStartDateManuallyEdited = false;
      this.updateStartDateIndicator(true);
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
   * Update calculated age, duration, and status badges in real-time
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
    const fakeRec = this.getFormData();
    fakeRec.customStatus = statusVal;
    const calcStatus = StatusCalculator.calculateStatus(fakeRec);

    const role = UserControl.getCurrentRole();
    const isViewer = role.id === 'VIEWER';
    const isClosed = statusVal === 'closed' || (statusVal === 'AUTO' && calcStatus.key === 'closed');
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
              🔒 ប្រព័ន្ធបានបិទ (System Closed - View Only Mode)
            </div>
            <div style="font-size: 0.76rem; color: #b91c1c; line-height: 1.35;">
              កំណត់ត្រានេះត្រូវបានចាក់សោរមិនអនុញ្ញាតឱ្យកែប្រែឡើយ (Read-Only)។ ដើម្បីកែប្រែព័ត៌មានឡើងវិញ សូមប្តូរស្ថានភាពពី «បានបិទប្រព័ន្ធ» ទៅជា «កំពុងដំណើរការ» ឬ «ស្វ័យប្រវត្ត»។
            </div>
          </div>
        `;
      } else {
        banner.style.display = 'none';
      }
    }

    // List of input IDs to lock/unlock
    const inputIds = [
      'uf-staffId', 'uf-secondaryId', 'uf-latinName', 'uf-khmerName',
      'uf-dob', 'uf-serviceStartDate', 'uf-gender',
      'uf-department', 'uf-office', 'uf-position',
      'uf-requestDate', 'uf-startDate', 'uf-endDate', 'uf-annualPeriod',
      'uf-requestReason', 'uf-prakasNo', 'uf-refDocument', 'uf-receivedDate',
      'uf-systemClosingDate', 'uf-description', 'uf-remark', 'uf-remark-select'
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

    if (statusSelect && isViewer) {
      statusSelect.disabled = true;
      statusSelect.classList.add('input-locked-readonly');
    }

    // Dropzone lock
    const dropzone = document.getElementById('uf-attachment-dropzone');
    if (dropzone) {
      dropzone.style.pointerEvents = isLocked ? 'none' : 'auto';
      dropzone.style.opacity = isLocked ? '0.45' : '1';
      dropzone.style.display = isViewer ? 'none' : '';
    }

    // Attachment delete buttons
    document.querySelectorAll('.attachment-delete-btn').forEach(btn => {
      btn.style.display = isLocked ? 'none' : 'inline-flex';
    });

    // Hide edit/delete/save buttons in Viewer mode
    if (isViewer) {
      const saveBtn = document.getElementById('btn-uf-save');
      const updateBtn = document.getElementById('btn-uf-update');
      const deleteBtn = document.getElementById('btn-uf-delete');
      if (saveBtn) saveBtn.style.display = 'none';
      if (updateBtn) updateBtn.style.display = 'none';
      if (deleteBtn) deleteBtn.style.display = 'none';
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

  handleFilesSelected(fileList) {
    if (!fileList || fileList.length === 0) return;

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
          size: sizeStr,
          type: file.type || 'application/octet-stream',
          uploadDate: new Date().toLocaleString(),
          dataUrl: e.target.result
        };

        this.currentAttachments.push(newAtt);
        this.renderAttachmentsList();
        if (typeof app !== 'undefined') {
          app.showToast(`បានភ្ជាប់ឯកសារ "${file.name}"`, 'success');
        }
      };

      // Read as DataURL for direct preview / download
      reader.readAsDataURL(file);
    });
  }

  renderAttachmentsList() {
    const container = document.getElementById('uf-attachments-list');
    if (!container) return;

    if (!this.currentAttachments || this.currentAttachments.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 1rem; color: var(--text-muted); font-size: 0.8rem;">
          គ្មានឯកសារភ្ជាប់នៅឡើយទេ (No attached files yet)
        </div>
      `;
      return;
    }

    container.innerHTML = this.currentAttachments.map((att, idx) => {
      let icon = 'file-text';
      let iconClass = 'word';
      const ext = att.name.split('.').pop().toLowerCase();

      if (att.type.includes('pdf') || ext === 'pdf') {
        icon = 'file-text';
        iconClass = 'pdf';
      } else if (att.type.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        icon = 'image';
        iconClass = 'image';
      } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
        icon = 'sheet';
        iconClass = 'excel';
      }

      return `
        <div class="attachment-item-card">
          <div class="att-file-info">
            <div class="att-icon-box ${iconClass}">
              <i data-lucide="${icon}"></i>
            </div>
            <div class="att-text">
              <div class="att-name" title="${att.name}">${att.name}</div>
              <div class="att-meta">${att.size} • ${att.uploadDate || ''}</div>
            </div>
          </div>
          <div class="att-actions">
            <button class="icon-btn" type="button" title="មើលឯកសារ (Preview)" onclick="userformController.previewAttachment(${idx})">
              <i data-lucide="eye"></i>
            </button>
            <button class="icon-btn" type="button" title="ទាញយក (Download)" onclick="userformController.downloadAttachment(${idx})">
              <i data-lucide="download"></i>
            </button>
            <button class="icon-btn icon-btn-danger" type="button" title="លុបឯកសារ (Delete)" onclick="userformController.removeAttachment(${idx})">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  removeAttachment(idx) {
    if (confirm('តើអ្នកពិតជាចង់លុបឯកសារភ្ជាប់នេះមែនទេ?')) {
      this.currentAttachments.splice(idx, 1);
      this.renderAttachmentsList();
    }
  }

  previewAttachment(idx) {
    const att = this.currentAttachments[idx];
    if (!att) return;

    const modal = document.getElementById('lightbox-preview-modal');
    const title = document.getElementById('lightbox-file-name');
    const body = document.getElementById('lightbox-body-content');

    if (modal && title && body) {
      title.textContent = att.name;
      const ext = att.name.split('.').pop().toLowerCase();

      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) || att.type.includes('image')) {
        body.innerHTML = `<img src="${att.dataUrl || ''}" alt="${att.name}">`;
      } else if (ext === 'pdf' || att.type.includes('pdf')) {
        body.innerHTML = `<iframe src="${att.dataUrl || ''}"></iframe>`;
      } else {
        body.innerHTML = `
          <div style="padding: 2rem; text-align: center;">
            <i data-lucide="file-text" style="width: 48px; height: 48px; color: var(--primary); margin-bottom: 1rem;"></i>
            <h4 style="margin-bottom: 0.5rem;">${att.name}</h4>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1.5rem;">ប្រភេទឯកសារនេះមិនអាច Preview ផ្ទាល់បានទេ សូមទាញយកដើម្បីបើកមើល។</p>
            <button class="btn btn-primary" onclick="userformController.downloadAttachment(${idx})">
              <i data-lucide="download"></i> <span>ទាញយកឯកសារ (${att.size})</span>
            </button>
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
    const role = UserControl.getCurrentRole();
    if (!role.canAdd || role.id === 'VIEWER') {
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

    if (saveBtn) saveBtn.style.display = 'inline-flex';
    if (updateBtn) updateBtn.style.display = 'none';
    if (deleteBtn) deleteBtn.style.display = 'none';

    this.updateFormLockState();
    this.isStartDateManuallyEdited = false;
    this.updateStartDateIndicator(true);
    this.showModal();
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

    if (saveBtn) saveBtn.style.display = 'none';
    if (updateBtn) updateBtn.style.display = isViewer ? 'none' : 'inline-flex';
    if (deleteBtn) deleteBtn.style.display = (isViewer || !role.canDelete) ? 'none' : 'inline-flex';

    this.updateFormLockState();
    this.showModal();
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
    const noVal = document.getElementById('uf-no')?.value;
    record.no = noVal ? parseInt(noVal, 10) : dataStore.getNextSerialNo();
    record.attachments = Array.isArray(this.currentAttachments) ? [...this.currentAttachments] : [];
    const statusVal = document.getElementById('uf-customStatus')?.value;
    record.customStatus = statusVal || 'AUTO';
    return record;
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
      const role = UserControl.getCurrentRole();
      if (!role.canAdd) {
        alert('អ្នកមិនមានសិទ្ធិបញ្ចូលទិន្នន័យថ្មីទេ (Permission denied)');
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
      alert('មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យ៖ ' + err.message);
    }
  }

  /**
   * Action: Update Existing Record
   */
  handleUpdate() {
    try {
      const role = UserControl.getCurrentRole();
      if (!role.canEdit) {
        alert('អ្នកមិនមានសិទ្ធិកែប្រែទិន្នន័យទេ (Permission denied)');
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

      // Confirmation before updating
      const confirmed = confirm(`តើលោកអ្នកពិតជាចង់កែប្រែទិន្នន័យរបស់ "${updatedRecord.khmerName}" (អត្តលេខ: ${updatedRecord.staffId}) មែនទេ?`);
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
        auditLogger.log('UPDATE', updatedRecord.staffId, `បានកែប្រែទិន្នន័យ ${updatedRecord.khmerName} (v${newVersion})`, { old: oldRecord, updated: updatedRecord });
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
  handleDelete() {
    const role = UserControl.getCurrentRole();
    if (!role.canDelete) {
      alert('អ្នកមិនមានសិទ្ធិលុបទិន្នន័យទេ (Only Administrator can delete)');
      return;
    }

    const existingList = dataStore.getStaffData();
    const targetIdx = existingList.findIndex(item => String(item.no) === String(this.selectedRecordNo));
    if (targetIdx === -1) return;

    const record = existingList[targetIdx];
    const confirmed = confirm(`⚠️ ការព្រមាន៖ តើលោកអ្នកពិតជាចង់លុបកំណត់ត្រាបុគ្គលិក "${record.khmerName}" (អត្តលេខ: ${record.staffId}) នេះចេញពីប្រព័ន្ធមែនទេ? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ!`);
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
