/**
 * Staff System Control - Excel (XLSX / CSV) Native Handler
 * Preserves 100% fidelity to the 22 Book1 Header Fields with Dynamic Custom Labels
 */

const ExcelHandler = {
  getHeadersKh() {
    return dataStore.getMasterFields().map(f => f.kh);
  },

  getHeadersEn() {
    return dataStore.getMasterFields().map(f => f.en);
  },

  /**
   * Convert internal record object to 22-column array
   */
  recordToRow(item, index) {
    const fields = dataStore.getMasterFields();
    return fields.map((f, fIdx) => {
      if (f.key === 'no') return item.no || (index + 1);
      if (f.type === 'date' && item[f.key]) {
        return StatusCalculator.formatDateDisplay(item[f.key]);
      }
      return item[f.key] || '';
    });
  },

  /**
   * Download Standard Import Template Workbook (.xlsx)
   */
  downloadImportTemplate() {
    if (typeof XLSX === 'undefined') {
      alert('កំហុស៖ បណ្ណាល័យ XLSX មិនទាន់ផ្ទុក (XLSX library not loaded)');
      return;
    }

    const settings = dataStore.getSettings();
    const headersKh = this.getHeadersKh();
    const wb = XLSX.utils.book_new();

    // Sheet 1: Staff_Import_Template (Formatted as DD-MM-YYYY)
    const templateRows = [
      headersKh,
      [
        1,
        'GDT-01234',
        'MEF-5678',
        'SOK SAMNANG',
        'សុខ សំណាង',
        settings.departments[0] || 'នាយកដ្ឋានបុគ្គលិក និងការបណ្តុះបណ្តាល',
        settings.offices[0] || 'ការិយាល័យគ្រប់គ្រងបុគ្គលិក',
        settings.positions[0] || 'អនុប្រធានការិយាល័យ',
        'ប្រុស',
        '12-05-1988',
        '01-03-2015',
        '01-08-2026',
        '31-08-2027',
        '01-09-2026',
        '2026',
        settings.requestReasons[0] || 'ស្នើសុំតម្លើងឋានន្តរស័ក្តិ',
        'ប្រកាសលេខ ១២៣ សហវ',
        'សំណើតម្លើងឋានន្តរស័ក្តិប្រចាំឆ្នាំ២០២៦',
        '',
        'ពាក្យស្នើសុំលេខ ០១',
        '05-08-2026',
        'ឯកសារគ្រប់គ្រាន់'
      ],
      [
        2,
        'GDT-05678',
        'MEF-9012',
        'CHAN THEARY',
        'ចាន់ ធារី',
        settings.departments[1] || 'នាយកដ្ឋានបច្ចេកវិទ្យាព័ត៌មាន',
        settings.offices[1] || 'ការិយាល័យអភិវឌ្ឍន៍ប្រព័ន្ធ',
        settings.positions[1] || 'មន្ត្រី',
        'ស្រី',
        '20-11-1992',
        '15-06-2018',
        '10-08-2026',
        '09-08-2027',
        '10-08-2026',
        '2026',
        settings.requestReasons[1] || 'ស្នើសុំផ្លាស់ប្តូរកន្លែងការងារ',
        '',
        'ផ្ទេរមកពីសាខាពន្ធដារខេត្តកណ្តាល',
        '',
        'លិខិតផ្ទេរលេខ ៤៥',
        '',
        'រង់ចាំប្រកាស'
      ]
    ];

    const wsTemplate = XLSX.utils.aoa_to_sheet(templateRows);
    wsTemplate['!cols'] = [
      { wch: 6 },  // ល.រ
      { wch: 16 }, // អត្តលេខ អពដ
      { wch: 16 }, // អត្តលេខ កសហវ
      { wch: 22 }, // ឈ្មោះឡាតាំង
      { wch: 20 }, // ឈ្មោះខ្មែរ
      { wch: 32 }, // អង្គភាព
      { wch: 28 }, // ការិយាល័យ
      { wch: 22 }, // តួនាទី
      { wch: 10 }, // ភេទ
      { wch: 16 }, // ថ្ងៃខែឆ្នាំកំណើត
      { wch: 18 }, // ថ្ងៃខែឆ្នាំបម្រើការងារ
      { wch: 16 }, // ថ្ងៃខែឆ្នាំស្នើសុំ
      { wch: 16 }, // ថ្ងៃខែឆ្នាំបញ្ចប់
      { wch: 16 }, // ថ្ងៃខែឆ្នាំចាប់ផ្តើម
      { wch: 12 }, // ប្រចាំឆ្នាំ
      { wch: 26 }, // មូលហេតុនៃសំណើ
      { wch: 22 }, // ប្រកាសលេខ
      { wch: 35 }, // ពិព័ណនាផ្សេងៗ
      { wch: 18 }, // ថ្ងៃខែបិទប្រព័ន្ធ
      { wch: 22 }, // ឯកសារយោង
      { wch: 22 }, // ថ្ងៃខែទទួលឯកសារ
      { wch: 30 }  // Remark
    ];
    XLSX.utils.book_append_sheet(wb, wsTemplate, 'Staff_Import_Template');

    // Sheet 2: Controlled_Lists_Reference
    const remarksList = settings.remarks || [];
    const maxRows = Math.max(
      settings.departments.length,
      settings.offices.length,
      settings.positions.length,
      settings.genders.length,
      settings.annualPeriods.length,
      settings.requestReasons.length,
      remarksList.length
    );

    const refRows = [
      ['អង្គភាព (Department)', 'ការិយាល័យ (Office)', 'តួនាទី (Position)', 'ភេទ (Gender)', 'ប្រចាំឆ្នាំ (Year)', 'មូលហេតុសំណើ (Reason)', 'កំណត់សម្គាល់ (Remarks)']
    ];

    for (let i = 0; i < maxRows; i++) {
      refRows.push([
        settings.departments[i] || '',
        settings.offices[i] || '',
        settings.positions[i] || '',
        settings.genders[i] || '',
        settings.annualPeriods[i] || '',
        settings.requestReasons[i] || '',
        remarksList[i] || ''
      ]);
    }
    const wsRef = XLSX.utils.aoa_to_sheet(refRows);
    XLSX.utils.book_append_sheet(wb, wsRef, 'Lists_Reference');

    XLSX.writeFile(wb, 'Book1_Staff_Control_Import_Template.xlsx');
    if (typeof app !== 'undefined') {
      app.showToast('បានទាញយកទម្រង់គំរូ Excel ដោយជោគជ័យ!', 'success');
    }
  },

  /**
   * Export Full Multi-Sheet Excel Workbook (.xlsx)
   */
  exportFullWorkbook() {
    if (typeof XLSX === 'undefined') {
      alert('កំហុស៖ បណ្ណាល័យ XLSX មិនទាន់ផ្ទុក (XLSX library not loaded)');
      return;
    }

    const staffData = dataStore.getStaffData();
    const settings = dataStore.getSettings();
    const logs = typeof auditLogger !== 'undefined' ? auditLogger.getLogs() : [];
    const headersKh = this.getHeadersKh();

    const wb = XLSX.utils.book_new();

    // Sheet 1: Staff_Data (Book1 Exact Header Sequence)
    const staffRows = [headersKh];
    staffData.forEach((item, idx) => {
      staffRows.push(this.recordToRow(item, idx));
    });
    const wsStaff = XLSX.utils.aoa_to_sheet(staffRows);

    // Set column widths for readability
    wsStaff['!cols'] = [
      { wch: 6 },  // ល.រ
      { wch: 16 }, // អត្តលេខ អពដ
      { wch: 16 }, // អត្តលេខ កសហវ
      { wch: 22 }, // ឈ្មោះឡាតាំង
      { wch: 20 }, // ឈ្មោះខ្មែរ
      { wch: 32 }, // អង្គភាព
      { wch: 28 }, // ការិយាល័យ
      { wch: 22 }, // តួនាទី
      { wch: 10 }, // ភេទ
      { wch: 16 }, // ថ្ងៃខែឆ្នាំកំណើត
      { wch: 18 }, // ថ្ងៃខែឆ្នាំបម្រើការងារ
      { wch: 16 }, // ថ្ងៃខែឆ្នាំស្នើសុំ
      { wch: 16 }, // ថ្ងៃខែឆ្នាំបញ្ចប់
      { wch: 16 }, // ថ្ងៃខែឆ្នាំចាប់ផ្តើម
      { wch: 12 }, // ប្រចាំឆ្នាំ
      { wch: 26 }, // មូលហេតុនៃសំណើ
      { wch: 22 }, // ប្រកាសលេខ
      { wch: 35 }, // ពិព័ណនាផ្សេងៗ
      { wch: 18 }, // ថ្ងៃខែបិទប្រព័ន្ធ
      { wch: 22 }, // ឯកសារយោង
      { wch: 22 }, // ថ្ងៃខែទទួលឯកសារ
      { wch: 30 }  // Remark
    ];
    XLSX.utils.book_append_sheet(wb, wsStaff, 'Staff_Data');

    // Sheet 2: Setting (Controlled Lists)
    const remarksList = settings.remarks || [];
    const maxRows = Math.max(
      settings.departments.length,
      settings.offices.length,
      settings.positions.length,
      settings.genders.length,
      settings.annualPeriods.length,
      settings.requestReasons.length,
      remarksList.length
    );

    const settingRows = [
      ['អង្គភាព (Department)', 'ការិយាល័យ (Office)', 'តួនាទី (Position)', 'ភេទ (Gender)', 'ប្រចាំឆ្នាំ (Year)', 'មូលហេតុសំណើ (Reason)', 'កំណត់សម្គាល់ (Remarks)']
    ];

    for (let i = 0; i < maxRows; i++) {
      settingRows.push([
        settings.departments[i] || '',
        settings.offices[i] || '',
        settings.positions[i] || '',
        settings.genders[i] || '',
        settings.annualPeriods[i] || '',
        settings.requestReasons[i] || '',
        remarksList[i] || ''
      ]);
    }
    const wsSetting = XLSX.utils.aoa_to_sheet(settingRows);
    XLSX.utils.book_append_sheet(wb, wsSetting, 'Setting');

    // Sheet 3: Document_Control
    const docRows = [
      ['ល.រ', 'អត្តលេខ អពដ', 'ឈ្មោះខ្មែរ', 'ថ្ងៃស្នើសុំ', 'ថ្ងៃចាប់ផ្តើម', 'ថ្ងៃបញ្ចប់', 'ប្រកាសលេខ', 'ឯកសារយោង', 'ថ្ងៃទទួលឯកសារ', 'ស្ថានភាព']
    ];
    staffData.forEach((item, idx) => {
      const status = StatusCalculator.calculateStatus(item);
      docRows.push([
        item.no || (idx + 1),
        item.staffId || '',
        item.khmerName || '',
        StatusCalculator.formatDateDisplay(item.requestDate),
        StatusCalculator.formatDateDisplay(item.startDate),
        StatusCalculator.formatDateDisplay(item.endDate),
        item.prakasNo || '',
        item.refDocument || '',
        StatusCalculator.formatDateDisplay(item.receivedDate),
        status.labelKh
      ]);
    });
    const wsDoc = XLSX.utils.aoa_to_sheet(docRows);
    XLSX.utils.book_append_sheet(wb, wsDoc, 'Document_Control');

    // Sheet 4: Dashboard Summary
    let total = staffData.length;
    let active = 0, pending = 0, completed = 0, expired = 0, closed = 0, missing = 0;
    staffData.forEach(item => {
      const s = StatusCalculator.calculateStatus(item).key;
      if (s === 'active') active++;
      else if (s === 'pending') pending++;
      else if (s === 'completed') completed++;
      else if (s === 'expired') expired++;
      else if (s === 'closed') closed++;
      else if (s === 'missing') missing++;
    });

    const summaryRows = [
      ['សូចនាករស្ថិតិ (Dashboard Metric)', 'ចំនួនសរុប (Count)'],
      ['បុគ្គលិកសរុប (Total Staff)', total],
      ['បុគ្គលិកកំពុងដំណើរការ (Active Staff)', active],
      ['សំណើរង់ចាំ (Pending Records)', pending],
      ['បានបញ្ចប់ (Completed Records)', completed],
      ['ផុតសុពលភាព (Expired Records)', expired],
      ['បានបិទប្រព័ន្ធ (Closed Records)', closed],
      ['ខ្វះព័ត៌មាន (Missing Info)', missing],
      ['', ''],
      ['កាលបរិច្ឆេទបង្កើតរបាយការណ៍ (Generated At)', new Date().toLocaleString()]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Dashboard');

    // Sheet 5: User_Control
    const userRows = [
      ['តួនាទី (Role)', 'ឈ្មោះខ្មែរ (Khmer Title)', 'សិទ្ធិបញ្ចូល (Add)', 'សិទ្ធិកែប្រែ (Edit)', 'សិទ្ធិលុប (Delete)', 'សិទ្ធិកំណត់ប្រព័ន្ធ (Settings)'],
      ['ADMIN', 'អ្នកគ្រប់គ្រងប្រព័ន្ធ', 'YES', 'YES', 'YES', 'YES'],
      ['OFFICER', 'មន្ត្រីបញ្ចូលទិន្នន័យ', 'YES', 'YES', 'NO', 'NO'],
      ['VIEWER', 'អ្នកត្រួតពិនិត្យ', 'NO', 'NO', 'NO', 'NO']
    ];
    const wsUsers = XLSX.utils.aoa_to_sheet(userRows);
    XLSX.utils.book_append_sheet(wb, wsUsers, 'User_Control');

    // Sheet 6: Log (Audit Trail)
    const logRows = [
      ['Log ID', 'Timestamp', 'User', 'Action', 'Staff ID', 'Description', 'Details']
    ];
    logs.forEach(l => {
      logRows.push([
        l.id,
        l.timestamp,
        l.user,
        l.action,
        l.staffId,
        l.description,
        l.details
      ]);
    });
    const wsLog = XLSX.utils.aoa_to_sheet(logRows);
    XLSX.utils.book_append_sheet(wb, wsLog, 'Log');

    // Generate and download file
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Staff_System_Control_Book1_${dateStr}.xlsx`);
    if (typeof auditLogger !== 'undefined') {
      auditLogger.log('EXPORT_EXCEL', 'ALL', `បានទាញយកទិន្នន័យជាឯកសារ Excel (${staffData.length} records)`);
    }
  },

  /**
   * Export to UTF-8 CSV with BOM for Excel Khmer Support
   */
  exportToCSV() {
    const staffData = dataStore.getStaffData();
    const headersKh = this.getHeadersKh();
    let csvContent = '\uFEFF'; // UTF-8 BOM
    csvContent += headersKh.join(',') + '\r\n';

    staffData.forEach((item, idx) => {
      const row = this.recordToRow(item, idx).map(cell => {
        let text = String(cell || '').replace(/"/g, '""');
        if (text.search(/("|,|\n)/g) >= 0) {
          text = `"${text}"`;
        }
        return text;
      });
      csvContent += row.join(',') + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Staff_Control_Data_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (typeof auditLogger !== 'undefined') {
      auditLogger.log('EXPORT_CSV', 'ALL', `បានទាញយកទិន្នន័យជាឯកសារ CSV (${staffData.length} records)`);
    }
  },

  /**
   * Import from Excel file (.xlsx / .csv)
   */
  importFromFile(file, onComplete, onError) {
    if (!file) return;
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!rawData || rawData.length < 2) {
          throw new Error('ឯកសារគ្មានទិន្នន័យគ្រប់គ្រាន់ (Empty or invalid file)');
        }

        const rows = rawData.slice(1);
        const parsedRecords = [];

        rows.forEach((row, rIdx) => {
          if (!row || row.length === 0 || !row.some(cell => cell !== null && cell !== '')) return;

          const record = {
            no: parseInt(row[0], 10) || (rIdx + 1),
            staffId: String(row[1] || '').trim(),
            secondaryId: String(row[2] || '').trim(),
            latinName: String(row[3] || '').trim(),
            khmerName: String(row[4] || '').trim(),
            department: String(row[5] || '').trim(),
            office: String(row[6] || '').trim(),
            position: String(row[7] || '').trim(),
            gender: StatusCalculator.normalizeGender ? StatusCalculator.normalizeGender(row[8]) : String(row[8] || '').trim(),
            dob: StatusCalculator.normalizeDate(row[9]),
            serviceStartDate: StatusCalculator.normalizeDate(row[10]),
            requestDate: StatusCalculator.normalizeDate(row[11]),
            endDate: StatusCalculator.normalizeDate(row[12]),
            startDate: StatusCalculator.normalizeDate(row[13]),
            annualPeriod: String(row[14] || '').trim(),
            requestReason: String(row[15] || '').trim(),
            prakasNo: String(row[16] || '').trim(),
            description: String(row[17] || '').trim(),
            systemClosingDate: StatusCalculator.normalizeDate(row[18]),
            refDocument: String(row[19] || '').trim(),
            receivedDate: StatusCalculator.normalizeDate(row[20]),
            remark: String(row[21] || '').trim()
          };

          // Start Date Auto-Fallback: follows Request Date if empty/missing
          if (!record.startDate && record.requestDate) {
            record.startDate = record.requestDate;
          }

          parsedRecords.push(record);
        });

        if (parsedRecords.length === 0) {
          throw new Error('រកមិនឃើញទិន្នន័យបុគ្គលិកត្រឹមត្រូវក្នុងឯកសារនេះទេ');
        }

        if (onComplete) onComplete(parsedRecords);
      } catch (err) {
        if (onError) onError(err);
      }
    };

    reader.onerror = (err) => {
      if (onError) onError(err);
    };

    reader.readAsArrayBuffer(file);
  },

  /**
   * Download Excel Template (.xlsx) for importing Settings (Department, Office, Position, etc.)
   */
  downloadSettingsImportTemplate() {
    if (typeof XLSX === 'undefined') {
      alert('កំហុស៖ បណ្ណាល័យ XLSX មិនទាន់ផ្ទុក (XLSX library not loaded)');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Headers
    const headers = [
      'Department (អង្គភាព)',
      'Office (ការិយាល័យ)',
      'Position (តួនាទី)',
      'Annual Period (ប្រចាំឆ្នាំ)',
      'Request Reason (មូលហេតុនៃសំណើ)',
      'Remark (កំណត់សម្គាល់)'
    ];

    const sampleRows = [
      headers,
      [
        'Internal Audit Department',
        'Office of Network and Information Security',
        'Head of Department',
        '2026',
        'ស្នើសុំបន្តការសិក្សា',
        'Active'
      ],
      [
        'Department of Law and Litigation',
        'Administrative Office',
        'Vice Chair of Department',
        '2027',
        'ស្នើសុំផ្ទេរការងារ',
        'Inactive'
      ],
      [
        'Siem Reap Branch',
        'Office of Accounting and Finance',
        'Head of Office',
        '2025',
        'ស្នើសុំតម្លើងឋានន្តរស័ក្តិ',
        'កំពុងដំណើរការ (Active)'
      ],
      [
        'Branch of Taxation',
        'Audit Office',
        'Vice President of the Office',
        '2028',
        'ស្នើសុំច្បាប់ឈប់សម្រាកព្យាបាល',
        'បានបិទប្រព័ន្ធ (Closed)'
      ],
      [
        'Tax Branch',
        'Office of Taxpayer Services',
        'Head of Section',
        '2024',
        'ស្នើសុំលាលែងពីការងារ',
        'បុគ្គលិកជាប់កិច្ចសន្យា'
      ],
      [
        'នាយកដ្ឋានបុគ្គលិក និងការបណ្តុះបណ្តាល',
        'ការិយាល័យគ្រប់គ្រងបុគ្គលិក',
        'ប្រធាននាយកដ្ឋាន',
        '2026',
        'ស្នើសុំលិខិតបញ្ជាក់ការងារ',
        'Active'
      ],
      [
        'នាយកដ្ឋានបច្ចេកវិទ្យាព័ត៌មាន',
        'ការិយាល័យអភិវឌ្ឍន៍ប្រព័ន្ធ',
        'មន្ត្រីជំនាញ',
        '2027',
        'ស្នើសុំផ្លាស់ប្តូរវេនការងារ',
        'Inactive'
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(sampleRows);
    ws['!cols'] = [
      { wch: 35 }, // Department
      { wch: 44 }, // Office
      { wch: 30 }, // Position
      { wch: 25 }, // Annual Period
      { wch: 35 }, // Request Reason
      { wch: 25 }  // Remark
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Settings_Template');
    XLSX.writeFile(wb, `Organization_Settings_Template_${new Date().toISOString().slice(0, 10)}.xlsx`);

    if (typeof app !== 'undefined') {
      app.showToast('បានទាញយកឯកសារគំរូ Excel សម្រាប់ការកំណត់ជោគជ័យ!', 'success');
    }
  },

  /**
   * Download CSV Template for importing Settings
   */
  downloadSettingsCSVTemplate() {
    const headers = ['Department (អង្គភាព)', 'Office (ការិយាល័យ)', 'Position (តួនាទី)', 'Annual Period (ប្រចាំឆ្នាំ)', 'Request Reason (មូលហេតុនៃសំណើ)', 'Remark (កំណត់សម្គាល់)'];
    const rows = [
      ['Internal Audit Department', 'Office of Network and Information Security', 'Head of Department', '2026', 'ស្នើសុំបន្តការសិក្សា', 'Active'],
      ['Department of Law and Litigation', 'Administrative Office', 'Vice Chair of Department', '2027', 'ស្នើសុំផ្ទេរការងារ', 'Inactive'],
      ['Siem Reap Branch', 'Office of Accounting and Finance', 'Head of Office', '2025', 'ស្នើសុំតម្លើងឋានន្តរស័ក្តិ', 'កំពុងដំណើរការ (Active)'],
      ['Branch of Taxation', 'Audit Office', 'Vice President of the Office', '2028', 'ស្នើសុំច្បាប់ឈប់សម្រាកព្យាបាល', 'បានបិទប្រព័ន្ធ (Closed)'],
      ['Tax Branch', 'Office of Taxpayer Services', 'Head of Section', '2024', 'ស្នើសុំលាលែងពីការងារ', 'បុគ្គលិកជាប់កិច្ចសន្យា']
    ];

    let csvContent = '\uFEFF' + headers.map(h => `"${h}"`).join(',') + '\r\n';
    rows.forEach(r => {
      csvContent += r.map(c => `"${c.replace(/"/g, '""')}"`).join(',') + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Organization_Settings_Template_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (typeof app !== 'undefined') {
      app.showToast('បានទាញយកឯកសារគំរូ CSV សម្រាប់ការកំណត់ជោគជ័យ!', 'success');
    }
  },

  /**
   * Handle Settings File Upload (.xlsx / .xls / .csv)
   */
  handleSettingsFileUpload(input) {
    const file = input.files && input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!rawData || rawData.length < 2) {
          alert('ឯកសារគ្មានទិន្នន័យ ឬមិនត្រឹមត្រូវ (Empty or invalid file)');
          input.value = '';
          return;
        }

        const headerRow = rawData[0].map(h => String(h || '').toLowerCase().trim());
        const dataRows = rawData.slice(1);

        // Map column indices to settings categories
        const colMap = {};
        headerRow.forEach((h, idx) => {
          if (h.includes('department') || h.includes('អង្គភាព') || h.includes('នាយកដ្ឋាន') || h.includes('dept')) {
            colMap.departments = idx;
          } else if (h.includes('office') || h.includes('ការិយាល័យ')) {
            colMap.offices = idx;
          } else if (h.includes('position') || h.includes('តួនាទី') || h.includes('role') || h.includes('តំណែង') || h.includes('pos')) {
            colMap.positions = idx;
          } else if (h.includes('annual') || h.includes('period') || h.includes('year') || h.includes('ឆ្នាំ') || h.includes('ប្រចាំឆ្នាំ')) {
            colMap.annualPeriods = idx;
          } else if (h.includes('reason') || h.includes('request') || h.includes('មូលហេតុ') || h.includes('សំណើ')) {
            colMap.requestReasons = idx;
          } else if (h.includes('remark') || h.includes('note') || h.includes('សម្គាល់')) {
            colMap.remarks = idx;
          }
        });

        // Fallback column positions if header keywords not matched
        if (Object.keys(colMap).length === 0) {
          if (headerRow.length >= 1) colMap.departments = 0;
          if (headerRow.length >= 2) colMap.offices = 1;
          if (headerRow.length >= 3) colMap.positions = 2;
          if (headerRow.length >= 4) colMap.annualPeriods = 3;
          if (headerRow.length >= 5) colMap.requestReasons = 4;
          if (headerRow.length >= 6) colMap.remarks = 5;
        }

        const currentSettings = dataStore.getSettings();
        const counts = { departments: 0, offices: 0, positions: 0, annualPeriods: 0, requestReasons: 0, remarks: 0 };

        Object.keys(colMap).forEach(cat => {
          const colIdx = colMap[cat];
          if (colIdx !== undefined) {
            if (!Array.isArray(currentSettings[cat])) currentSettings[cat] = [];
            dataRows.forEach(row => {
              const val = String(row[colIdx] || '').trim();
              if (val && !currentSettings[cat].includes(val)) {
                currentSettings[cat].push(val);
                counts[cat]++;
              }
            });
          }
        });

        dataStore.saveSettings(currentSettings);

        // Refresh all connected UI components
        if (typeof app !== 'undefined') {
          app.renderSettingsLists();
          if (typeof userformController !== 'undefined') {
            userformController.populateDropdowns();
          }
          if (typeof multiFilter !== 'undefined') {
            multiFilter.renderAllHubDroplists();
          }
          app.updateFilterCounts();
          app.renderStaffTable();
          app.showToast(`✅ នាំចូលជោគជ័យ៖ ${counts.departments} អង្គភាព, ${counts.offices} ការិយាល័យ, ${counts.positions} តួនាទី!`, 'success');
        }

        if (typeof auditLogger !== 'undefined') {
          auditLogger.log('IMPORT_SETTINGS', 'SYS', `បាននាំចូលការកំណត់ពី Excel (${counts.departments} depts, ${counts.offices} offices, ${counts.positions} positions)`);
        }

        input.value = '';
      } catch (err) {
        console.error('Settings import error:', err);
        alert('កំហុសពេលនាំចូល៖ ' + err.message);
        input.value = '';
      }
    };

    reader.onerror = () => {
      alert('កំហុសក្នុងការអានឯកសារ (Error reading file)');
      input.value = '';
    };

    reader.readAsArrayBuffer(file);
  },

  /**
   * Download Advanced Data Entry Template with built-in VLOOKUP Formulas (.xlsx)
   * Sheet 1: Data_Entry (Input ID -> VLOOKUP auto-fills Personal & Org info)
   * Sheet 2: Staff_Master_Roster (Lookup source table)
   */
  downloadVLookupDataEntryTemplate() {
    if (typeof XLSX === 'undefined') {
      alert('កំហុស៖ បណ្ណាល័យ XLSX មិនទាន់ផ្ទុក (XLSX library not loaded)');
      return;
    }

    const staffData = dataStore.getStaffData();
    const settings = dataStore.getSettings();
    const wb = XLSX.utils.book_new();

    // Sheet 1: Data_Entry (User inputs Staff ID in Column B -> Formulas auto-populate Cols C to J)
    const entryHeaders = [
      'No. (ល.រ)',
      'Staff ID (អត្តលេខ អពដ) [INPUT 👈]',
      'Secondary ID (អត្តលេខ កសហវ)',
      'Latin Name (ឈ្មោះឡាតាំង)',
      'Khmer Name (ឈ្មោះខ្មែរ)',
      'Department (អង្គភាព)',
      'Office (ការិយាល័យ)',
      'Position (តួនាទី)',
      'Gender (ភេទ)',
      'Date of Birth (ថ្ងៃខែឆ្នាំកំណើត)',
      'Service Start Date (ថ្ងៃចូលបម្រើការងារ)',
      'Request Date (ថ្ងៃស្នើសុំ) [INPUT 👈]',
      'Start Date (ថ្ងៃចាប់ផ្តើម) [INPUT 👈]',
      'End Date (ថ្ងៃបញ្ចប់) [INPUT 👈]',
      'Annual Period (ប្រចាំឆ្នាំ) [INPUT 👈]',
      'Request Reason (មូលហេតុនៃសំណើ) [INPUT 👈]',
      'Prakas No. (ប្រកាសលេខ) [INPUT 👈]',
      'Description (ពិព័ណនា) [INPUT 👈]',
      'System Closing Date (ថ្ងៃខែបិទប្រព័ន្ធ) [INPUT 👈]',
      'Ref Document (ឯកសារយោង) [INPUT 👈]',
      'Received Date (ថ្ងៃខែទទួលឯកសារ) [INPUT 👈]',
      'Remark (កំណត់សម្គាល់) [INPUT 👈]'
    ];

    const entryRows = [entryHeaders];

    // Pre-populate sample/entry rows with Excel VLOOKUP formulas!
    for (let r = 2; r <= 30; r++) {
      const isSample1 = r === 2;
      const isSample2 = r === 3;
      const sampleId = isSample1 ? (staffData[0]?.staffId || 'GDT-01234') : (isSample2 ? (staffData[1]?.staffId || 'GDT-05678') : '');

      entryRows.push([
        r - 1, // No
        sampleId, // Staff ID
        { f: `IF(B${r}="","",IFERROR(VLOOKUP(B${r},Staff_Master_Roster!A:J,2,FALSE),""))` }, // Secondary ID
        { f: `IF(B${r}="","",IFERROR(VLOOKUP(B${r},Staff_Master_Roster!A:J,3,FALSE),""))` }, // Latin Name
        { f: `IF(B${r}="","",IFERROR(VLOOKUP(B${r},Staff_Master_Roster!A:J,4,FALSE),""))` }, // Khmer Name
        { f: `IF(B${r}="","",IFERROR(VLOOKUP(B${r},Staff_Master_Roster!A:J,5,FALSE),""))` }, // Department
        { f: `IF(B${r}="","",IFERROR(VLOOKUP(B${r},Staff_Master_Roster!A:J,6,FALSE),""))` }, // Office
        { f: `IF(B${r}="","",IFERROR(VLOOKUP(B${r},Staff_Master_Roster!A:J,7,FALSE),""))` }, // Position
        { f: `IF(B${r}="","",IFERROR(VLOOKUP(B${r},Staff_Master_Roster!A:J,8,FALSE),""))` }, // Gender
        { f: `IF(B${r}="","",IFERROR(VLOOKUP(B${r},Staff_Master_Roster!A:J,9,FALSE),""))` }, // DOB
        { f: `IF(B${r}="","",IFERROR(VLOOKUP(B${r},Staff_Master_Roster!A:J,10,FALSE),""))` }, // Service Date
        isSample1 ? '01-08-2026' : (isSample2 ? '15-08-2026' : ''), // Request Date
        isSample1 ? '01-09-2026' : (isSample2 ? '01-09-2026' : ''), // Start Date
        isSample1 ? '31-08-2027' : (isSample2 ? '31-08-2027' : ''), // End Date
        '2026', // Annual Period
        isSample1 ? (settings.requestReasons[0] || 'ស្នើសុំបន្តការសិក្សា') : (isSample2 ? (settings.requestReasons[1] || 'ស្នើសុំផ្ទេរការងារ') : ''),
        isSample1 ? 'ប្រកាសលេខ ១២៣' : '',
        isSample1 ? 'សំណើប្រចាំឆ្នាំ' : '',
        '',
        isSample1 ? 'ពាក្យស្នើសុំលេខ ០១' : '',
        isSample1 ? '05-08-2026' : '',
        'Active'
      ]);
    }

    const wsEntry = XLSX.utils.aoa_to_sheet(entryRows);
    wsEntry['!cols'] = [
      { wch: 8 },  // No
      { wch: 22 }, // Staff ID (Input)
      { wch: 20 }, // Secondary ID (VLOOKUP)
      { wch: 22 }, // Latin Name (VLOOKUP)
      { wch: 22 }, // Khmer Name (VLOOKUP)
      { wch: 32 }, // Department (VLOOKUP)
      { wch: 32 }, // Office (VLOOKUP)
      { wch: 25 }, // Position (VLOOKUP)
      { wch: 12 }, // Gender (VLOOKUP)
      { wch: 18 }, // DOB (VLOOKUP)
      { wch: 22 }, // Service Date (VLOOKUP)
      { wch: 18 }, // Request Date
      { wch: 18 }, // Start Date
      { wch: 18 }, // End Date
      { wch: 15 }, // Annual Period
      { wch: 30 }, // Request Reason
      { wch: 22 }, // Prakas No
      { wch: 30 }, // Description
      { wch: 18 }, // System Closing Date
      { wch: 22 }, // Ref Document
      { wch: 20 }, // Received Date
      { wch: 20 }  // Remark
    ];
    XLSX.utils.book_append_sheet(wb, wsEntry, 'Data_Entry_Form');

    // Sheet 2: Staff_Master_Roster (Lookup Table with complete Profiles)
    const masterHeaders = [
      'Staff ID (អត្តលេខ អពដ)',
      'Secondary ID (អត្តលេខ កសហវ)',
      'Latin Name (ឈ្មោះឡាតាំង)',
      'Khmer Name (ឈ្មោះខ្មែរ)',
      'Department (អង្គភាព)',
      'Office (ការិយាល័យ)',
      'Position (តួនាទី)',
      'Gender (ភេទ)',
      'Date of Birth (ថ្ងៃកំណើត)',
      'Service Start Date (ថ្ងៃចូលបម្រើការងារ)'
    ];

    const masterRows = [masterHeaders];
    staffData.forEach(r => {
      masterRows.push([
        r.staffId || '',
        r.secondaryId || '',
        r.latinName || '',
        r.khmerName || '',
        r.department || '',
        r.office || '',
        r.position || '',
        r.gender || '',
        StatusCalculator.formatDateDisplay(r.dob),
        StatusCalculator.formatDateDisplay(r.serviceStartDate)
      ]);
    });

    const wsMaster = XLSX.utils.aoa_to_sheet(masterRows);
    wsMaster['!cols'] = [
      { wch: 22 }, { wch: 20 }, { wch: 22 }, { wch: 22 },
      { wch: 35 }, { wch: 35 }, { wch: 28 }, { wch: 12 },
      { wch: 18 }, { wch: 22 }
    ];
    XLSX.utils.book_append_sheet(wb, wsMaster, 'Staff_Master_Roster');

    XLSX.writeFile(wb, `Staff_VLOOKUP_Data_Entry_Template_${new Date().toISOString().slice(0, 10)}.xlsx`);

    if (typeof app !== 'undefined') {
      app.showToast('✅ បានទាញយកគំរូ Excel VLOOKUP (Data Entry with Auto-Lookup) ជោគជ័យ!', 'success');
    }
  }
};
