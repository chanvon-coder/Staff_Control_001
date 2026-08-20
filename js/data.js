/**
 * Staff System Control - Master Data Definition & Initial Store
 * Exact 22 Book1 Header Fields Preservation, Dynamic Customization & Attachments
 */

const DEFAULT_MASTER_FIELDS = [
  { key: 'no', kh: 'ល.រ', en: 'No.', index: 1, type: 'number', required: false, align: 'center', desc: 'លេខរៀងស្វ័យប្រវត្ត' },
  { key: 'staffId', kh: 'អត្តលេខ អពដ', en: 'Staff ID (GDT)', index: 2, type: 'text', required: true, align: 'left', desc: 'អត្តលេខសម្គាល់បុគ្គលិកចម្បង' },
  { key: 'secondaryId', kh: 'អត្តលេខ កសហវ', en: 'Secondary ID (MEF)', index: 3, type: 'text', required: false, align: 'left', desc: 'អត្តលេខបន្ទាប់បន្សំ' },
  { key: 'latinName', kh: 'ឈ្មោះឡាតាំង', en: 'Latin Name', index: 4, type: 'text', required: true, align: 'left', desc: 'ឈ្មោះជាអក្សរឡាតាំង' },
  { key: 'khmerName', kh: 'ឈ្មោះខ្មែរ', en: 'Khmer Name', index: 5, type: 'text', required: true, align: 'left', desc: 'ឈ្មោះជាអក្សរខ្មែរ' },
  { key: 'department', kh: 'អង្គភាព', en: 'Department', index: 6, type: 'select', required: true, align: 'left', desc: 'នាយកដ្ឋាន ឬអង្គភាព' },
  { key: 'office', kh: 'ការិយាល័យ', en: 'Office', index: 7, type: 'select', required: true, align: 'left', desc: 'ការិយាល័យចំណុះ' },
  { key: 'position', kh: 'តួនាទី', en: 'Position', index: 8, type: 'select', required: true, align: 'left', desc: 'មុខតំណែង ឬតួនាទី' },
  { key: 'gender', kh: 'ភេទ', en: 'Gender', index: 9, type: 'select', required: true, align: 'center', desc: 'ភេទ' },
  { key: 'dob', kh: 'ថ្ងៃខែឆ្នាំកំណើត', en: 'Date of Birth', index: 10, type: 'date', required: false, align: 'left', desc: 'ថ្ងៃខែឆ្នាំកំណើត' },
  { key: 'serviceStartDate', kh: 'ថ្ងៃខែឆ្នាំបម្រើការងារ', en: 'Service Start Date', index: 11, type: 'date', required: false, align: 'left', desc: 'ថ្ងៃចូលបម្រើការងារ' },
  { key: 'requestDate', kh: 'ថ្ងៃស្នើសុំ', en: 'Request Date', index: 12, type: 'date', required: false, align: 'left', desc: 'ថ្ងៃដាក់ពាក្យស្នើសុំ' },
  { key: 'endDate', kh: 'ថ្ងៃបញ្ចប់', en: 'End Date', index: 13, type: 'date', required: false, align: 'left', desc: 'ថ្ងៃបញ្ចប់សុពលភាព' },
  { key: 'startDate', kh: 'ថ្ងៃចាប់ផ្តើម', en: 'Start Date', index: 14, type: 'date', required: false, align: 'left', desc: 'ថ្ងៃចាប់ផ្តើមអនុវត្ត' },
  { key: 'annualPeriod', kh: 'ប្រចាំឆ្នាំ', en: 'Annual Period', index: 15, type: 'select', required: false, align: 'center', desc: 'ឆ្នាំអនុវត្ត' },
  { key: 'requestReason', kh: 'មូលហេតុនៃសំណើ', en: 'Reason for Request', index: 16, type: 'select', required: false, align: 'left', desc: 'មូលហេតុស្នើសុំ' },
  { key: 'prakasNo', kh: 'ប្រកាសលេខ', en: 'Prakas No.', index: 17, type: 'text', required: false, align: 'left', desc: 'លេខប្រកាស ឬសេចក្តីសម្រេច' },
  { key: 'description', kh: 'ពិព័ណនាផ្សេងៗ', en: 'Description', index: 18, type: 'textarea', required: false, align: 'left', desc: 'ពិព័ណនាលម្អិតបន្ថែម' },
  { key: 'systemClosingDate', kh: 'ថ្ងៃខែបិទប្រព័ន្ធ', en: 'System Closing Date', index: 19, type: 'date', required: false, align: 'left', desc: 'កាលបរិច្ឆេទបិទប្រព័ន្ធ' },
  { key: 'refDocument', kh: 'ឯកសារយោង', en: 'Reference Document', index: 20, type: 'text', required: false, align: 'left', desc: 'លិខិត ឬឯកសារយោង' },
  { key: 'receivedDate', kh: 'ថ្ងៃខែទទួលឯកសារ ឬប្រកាសផ្សេងៗ', en: 'Doc Received Date', index: 21, type: 'date', required: false, align: 'left', desc: 'ថ្ងៃទទួលឯកសារ' },
  { key: 'remark', kh: 'Remark', en: 'Remark', index: 22, type: 'textarea', required: false, align: 'left', desc: 'កំណត់សម្គាល់ផ្សេងៗ' }
];

let MASTER_FIELDS = [...DEFAULT_MASTER_FIELDS];

const DEFAULT_TABLE_HEADER_TITLES = {
  left: 'តារាងគ្រប់គ្រងទិន្នន័យ',
  middle: 'អគ្គនាយកដ្ឋានពន្ធដារ • General Department of Taxation',
  right: 'Book1 Master Control',
  leftAlign: 'left',
  middleAlign: 'center',
  rightAlign: 'right'
};

const DEFAULT_SETTINGS = {
  departments: [
    'នាយកដ្ឋានបុគ្គលិក និងការបណ្តុះបណ្តាល',
    'នាយកដ្ឋានបច្ចេកវិទ្យាព័ត៌មាន',
    'នាយកដ្ឋានរដ្ឋបាល និងកិច្ចការទូទៅ',
    'នាយកដ្ឋានសវនកម្មផ្ទៃក្នុង',
    'នាយកដ្ឋានច្បាប់ និងវិវាទ',
    'សាខាពន្ធដារខេត្តសៀមរាប',
    'សាខាពន្ធដារខេត្តបាត់ដំបង',
    'សាខាពន្ធដារខណ្ឌចំការមន'
  ],
  offices: [
    'ការិយាល័យគ្រប់គ្រងបុគ្គលិក',
    'ការិយាល័យអភិវឌ្ឍន៍ប្រព័ន្ធ',
    'ការិយាល័យបណ្តាញ និងសន្តិសុខព័ត៌មាន',
    'ការិយាល័យរដ្ឋបាល',
    'ការិយាល័យគណនេយ្យ និងហិរញ្ញវត្ថុ',
    'ការិយាល័យសវនកម្ម',
    'ការិយាល័យសេវាអ្នកជាប់ពន្ធ'
  ],
  positions: [
    'ប្រធាននាយកដ្ឋាន',
    'អនុប្រធាននាយកដ្ឋាន',
    'ប្រធានការិយាល័យ',
    'អនុប្រធានការិយាល័យ',
    'ប្រធានផ្នែក',
    'មន្ត្រីជំនាញ',
    'មន្ត្រីបច្ចេកទេស',
    'មន្ត្រីរដ្ឋបាល',
    'ជំនួយការការិយាល័យ'
  ],
  genders: ['ប្រុស', 'ស្រី'],
  annualPeriods: [
    '2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019',
    '2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'
  ],
  requestReasons: [
    'ស្នើសុំផ្ទេរភារកិច្ច',
    'ស្នើសុំតម្លើងឋានន្តរស័ក្តិ',
    'ស្នើសុំចូលបម្រើការងារថ្មី',
    'ស្នើសុំច្បាប់ឈប់សម្រាកព្យាបាល',
    'ស្នើសុំបន្តការសិក្សា',
    'ស្នើសុំចូលនិវត្តន៍',
    'ស្នើសុំបិទប្រព័ន្ធបណ្តោះអាសន្ន',
    'ស្នើសុំបើកសិទ្ធិប្រើប្រាស់ប្រព័ន្ធ'
  ],
  requestReasonRules: {
    'ស្នើសុំច្បាប់ឈប់សម្រាកព្យាបាល': { requestDays: 15, endDays: 15 },
    'ស្នើសុំបន្តការសិក្សា': { requestDays: 15, endDays: 30 },
    'ស្នើសុំចូលនិវត្តន៍': { requestDays: null, endDays: 30 },
    'ស្នើសុំបិទប្រព័ន្ធបណ្តោះអាសន្ន': { requestDays: 30, endDays: null },
    'ស្នើសុំបើកសិទ្ធិប្រើប្រាស់ប្រព័ន្ធ': { requestDays: 15, endDays: 60 },
    'ស្នើសុំផ្ទេរភារកិច្ច': { requestDays: 30, endDays: 30 },
    'ស្នើសុំតម្លើងឋានន្តរស័ក្តិ': { requestDays: 60, endDays: 60 },
    'ស្នើសុំចូលបម្រើការងារថ្មី': { requestDays: 15, endDays: 30 }
  },
  remarks: [
    'Active',
    'Inactive',
    'កំពុងដំណើរការ (Active)',
    'បានបិទប្រព័ន្ធ (Closed)',
    'ឯកសារពេញលេញ និងត្រឹមត្រូវ',
    'រង់ចាំការសម្រេចពីថ្នាក់ដឹកនាំ',
    'រង់ចាំប្រកាសផ្លូវការ',
    'ផ្ទេរមកពីអង្គភាពផ្សេង',
    'ស្នើសុំព្យួរការងារបណ្តោះអាសន្ន',
    'បានចូលនិវត្តន៍តាមកាលកំណត់',
    'បានបញ្ចប់កិច្ចសន្យាការងារ',
    'ព័ត៌មានខ្វះឯកសារយោង'
  ]
};

const SAMPLE_STAFF_DATA = [
  {
    no: 1,
    staffId: 'GDT-01024',
    secondaryId: 'MEF-8890',
    latinName: 'SOK SAMNANG',
    khmerName: 'សុខ សំណាង',
    department: 'នាយកដ្ឋានបច្ចេកវិទ្យាព័ត៌មាន',
    office: 'ការិយាល័យអភិវឌ្ឍន៍ប្រព័ន្ធ',
    position: 'ប្រធានការិយាល័យ',
    staffType: 'មន្ត្រីក្របខណ្ឌ (Civil Servant)',
    gender: 'ប្រុស',
    dob: '1988-05-14',
    serviceStartDate: '2012-03-01',
    requestDate: '2026-01-10',
    startDate: '2026-02-01',
    endDate: '2026-12-31',
    annualPeriod: '2026',
    requestReason: 'ស្នើសុំបើកសិទ្ធិប្រើប្រាស់ប្រព័ន្ធ',
    prakasNo: 'ប្រកាសលេខ ៥៤២ សហវ',
    description: 'គ្រប់គ្រងសិទ្ធិចូលដំណើរការម៉ាស៊ីនមេ និងប្រព័ន្ធគ្រប់គ្រងទិន្នន័យ',
    systemClosingDate: '',
    refDocument: 'លិខិតលេខ ០៨៩/២៦ អពដ',
    receivedDate: '2026-01-20',
    remark: 'ទិន្នន័យពេញលេញ និងមានសុពលភាព',
    attachments: [
      { id: 'att-101', name: 'Prakas_542_MEF_Signed.pdf', locationPath: 'D:\\GDT_Documents\\Staff_2026\\Prakas_542_MEF_Signed.pdf', size: '345 KB', type: 'application/pdf', uploadDate: '2026-01-20 14:30' },
      { id: 'att-102', name: 'Letter_089_Ref_Doc.pdf', locationPath: 'D:\\GDT_Documents\\Staff_2026\\Letter_089_Ref_Doc.pdf', size: '180 KB', type: 'application/pdf', uploadDate: '2026-01-20 14:32' },
      { id: 'att-103', isCode: true, type: 'code', code: 'MXC0231536', name: 'MXC0231536', title: 'លិខិតផ្ទេរភារកិច្ចអនឡាញ (Online Doc)', size: 'Text / Code', uploadDate: '2026-01-20 14:35' }
    ],
    metadata: {
      createdAt: '2026-01-10 09:15',
      createdBy: 'System Administrator (admin)',
      updatedAt: '2026-08-14 13:30',
      updatedBy: 'admin',
      version: 2,
      changeLog: [
        { timestamp: '2026-01-10 09:15', user: 'admin', action: 'បានបង្កើតកំណត់ត្រាបុគ្គលិកដំបូង' },
        { timestamp: '2026-08-14 13:30', user: 'admin', action: 'បានភ្ជាប់ឯកសារប្រកាសលេខ ៥៤២ សហវ និងលិខិតយោង' }
      ]
    }
  },
  {
    no: 2,
    staffId: 'GDT-01188',
    secondaryId: 'MEF-9021',
    latinName: 'CHAN SREYMOM',
    khmerName: 'ចាន់ ស្រីមុំ',
    department: 'នាយកដ្ឋានបុគ្គលិក និងការបណ្តុះបណ្តាល',
    office: 'ការិយាល័យគ្រប់គ្រងបុគ្គលិក',
    position: 'អនុប្រធានការិយាល័យ',
    staffType: 'មន្ត្រីក្របខណ្ឌ (Civil Servant)',
    gender: 'ស្រី',
    dob: '1992-09-22',
    serviceStartDate: '2015-07-15',
    requestDate: '2026-02-05',
    startDate: '2026-03-01',
    endDate: '2027-02-28',
    annualPeriod: '2026',
    requestReason: 'ស្នើសុំផ្ទេរភារកិច្ច',
    prakasNo: 'ប្រកាសលេខ ១១仗 សហវ',
    description: 'ផ្ទេរមកបំពេញការងារនៅការិយាល័យគ្រប់គ្រងបុគ្គលិក',
    systemClosingDate: '',
    refDocument: 'លិខិតលេខ ២១៥ អពដ',
    receivedDate: '2026-02-18',
    remark: 'បានភ្ជាប់ឯកសារយោងច្បាប់ដើម',
    attachments: [
      { id: 'att-201', name: 'Transfer_Approval_Prakas_114.pdf', size: '420 KB', type: 'application/pdf', uploadDate: '2026-02-18 10:45' }
    ],
    metadata: {
      createdAt: '2026-02-05 11:20',
      createdBy: 'Document Officer (staff)',
      updatedAt: '2026-02-18 10:50',
      updatedBy: 'staff',
      version: 2,
      changeLog: [
        { timestamp: '2026-02-05 11:20', user: 'staff', action: 'បានបង្កើតសំណើផ្ទេរភារកិច្ច' },
        { timestamp: '2026-02-18 10:50', user: 'staff', action: 'បានទទួលប្រកាសផ្ទេរភារកិច្ចលេខ ១១៤' }
      ]
    }
  },
  {
    no: 3,
    staffId: 'GDT-02055',
    secondaryId: 'MEF-7612',
    latinName: 'KONG VANDETH',
    khmerName: 'គង់ វ៉ាន់ដេត',
    department: 'នាយកដ្ឋានរដ្ឋបាល និងកិច្ចការទូទៅ',
    office: 'ការិយាល័យរដ្ឋបាល',
    position: 'មន្ត្រីជំនាញ',
    staffType: 'មន្ត្រីក្របខណ្ឌ (Civil Servant)',
    gender: 'ប្រុស',
    dob: '1995-11-03',
    serviceStartDate: '2019-10-01',
    requestDate: '2025-01-15',
    startDate: '2025-02-01',
    endDate: '2025-12-31',
    annualPeriod: '2025',
    requestReason: 'ស្នើសុំបិទប្រព័ន្ធបណ្តោះអាសន្ន',
    prakasNo: 'ប្រកាសលេខ ០៧៨ សហវ',
    description: 'បានបញ្ចប់កិច្ចការគម្រោង',
    systemClosingDate: '2025-12-31',
    refDocument: 'លិខិតលេខ ៧៧២ អពដ',
    receivedDate: '2025-01-25',
    remark: 'បានបិទគណនីក្នុងប្រព័ន្ធរួចរាល់',
    attachments: [
      { id: 'att-301', name: 'System_Closing_Official_Notice.pdf', size: '210 KB', type: 'application/pdf', uploadDate: '2025-12-31 16:00' }
    ],
    metadata: {
      createdAt: '2025-01-15 08:30',
      createdBy: 'System Administrator (admin)',
      updatedAt: '2025-12-31 16:05',
      updatedBy: 'admin',
      version: 3,
      changeLog: [
        { timestamp: '2025-01-15 08:30', user: 'admin', action: 'បានបង្កើតកំណត់ត្រាសំណើ' },
        { timestamp: '2025-12-31 16:05', user: 'admin', action: 'បានកំណត់កាលបរិច្ឆេទបិទប្រព័ន្ធ 31/12/2025' }
      ]
    }
  },
  {
    no: 4,
    staffId: 'GDT-03410',
    secondaryId: 'MEF-9544',
    latinName: 'MENG CHHAY',
    khmerName: 'ម៉េង ឆាយ',
    department: 'សាខាពន្ធដារខេត្តសៀមរាប',
    office: 'ការិយាល័យសេវាអ្នកជាប់ពន្ធ',
    position: 'មន្ត្រីបច្ចេកទេស',
    staffType: 'មន្ត្រីជាប់កិច្ចសន្យា (Contract Staff)',
    gender: 'ប្រុស',
    dob: '1990-04-18',
    serviceStartDate: '2016-01-10',
    requestDate: '2026-08-01',
    startDate: '2026-09-01',
    endDate: '2027-08-31',
    annualPeriod: '2026',
    requestReason: 'ស្នើសុំតម្លើងឋានន្តរស័ក្តិ',
    prakasNo: '',
    description: 'រង់ចាំប្រកាសផ្លូវការពីក្រសួងសេដ្ឋកិច្ច និងហិរញ្ញវត្ថុ',
    systemClosingDate: '',
    refDocument: 'ពាក្យស្នើសុំលេខ ៤៥',
    receivedDate: '',
    remark: 'រង់ចាំឯកសារទទួល',
    attachments: [],
    metadata: {
      createdAt: '2026-08-01 14:00',
      createdBy: 'System Administrator (admin)',
      updatedAt: '2026-08-01 14:00',
      updatedBy: 'admin',
      version: 1,
      changeLog: [
        { timestamp: '2026-08-01 14:00', user: 'admin', action: 'បានបង្កើតពាក្យស្នើសុំតម្លើងឋានន្តរស័ក្តិ' }
      ]
    }
  },
  {
    no: 5,
    staffId: 'GDT-01899',
    secondaryId: 'MEF-6520',
    latinName: 'LONG SOPHEA',
    khmerName: 'ឡុង សុភា',
    department: 'នាយកដ្ឋានសវនកម្មផ្ទៃក្នុង',
    office: 'ការិយាល័យសវនកម្ម',
    position: 'អនុប្រធាននាយកដ្ឋាន',
    staffType: 'មន្ត្រីក្របខណ្ឌ (Civil Servant)',
    gender: 'ស្រី',
    dob: '1984-12-08',
    serviceStartDate: '2008-05-15',
    requestDate: '2024-06-01',
    startDate: '2024-07-01',
    endDate: '2025-06-30',
    annualPeriod: '2024',
    requestReason: 'ស្នើសុំបន្តការសិក្សា',
    prakasNo: 'ប្រកាសលេខ ៣៣២ សហវ',
    description: 'អាហារូបករណ៍ថ្នាក់អនុបណ្ឌិតនៅប្រទេសជប៉ុន',
    systemClosingDate: '',
    refDocument: 'លិខិតលេខ ៤០១ អពដ',
    receivedDate: '2024-06-20',
    remark: 'ផុតសុពលភាព - ត្រូវការតាមដាន',
    attachments: [
      { id: 'att-501', name: 'Scholarship_Japan_Letter.pdf', size: '512 KB', type: 'application/pdf', uploadDate: '2024-06-20 15:10' }
    ],
    metadata: {
      createdAt: '2024-06-01 10:00',
      createdBy: 'System Administrator (admin)',
      updatedAt: '2024-06-20 15:15',
      updatedBy: 'admin',
      version: 2,
      changeLog: [
        { timestamp: '2024-06-01 10:00', user: 'admin', action: 'បានបង្កើតសំណើបន្តការសិក្សា' }
      ]
    }
  },
  {
    no: 6,
    staffId: 'GDT-04100',
    secondaryId: '',
    latinName: 'TEP KOLAP',
    khmerName: 'ទេព កុលាប',
    department: 'នាយកដ្ឋានច្បាប់ និងវិវាទ',
    office: 'ការិយាល័យរដ្ឋបាល',
    position: 'មន្ត្រីរដ្ឋបាល',
    staffType: 'មន្ត្រីកម្មសិក្សា (Intern / Probationary)',
    gender: 'ស្រី',
    dob: '1998-07-29',
    serviceStartDate: '2022-09-01',
    requestDate: '2026-07-10',
    startDate: '',
    endDate: '',
    annualPeriod: '2026',
    requestReason: 'ស្នើសុំចូលបម្រើការងារថ្មី',
    prakasNo: '',
    description: 'ខ្វះព័ត៌មានកាលបរិច្ឆេទចាប់ផ្តើម/បញ្ចប់ និងឯកសារយោង',
    systemClosingDate: '',
    refDocument: '',
    receivedDate: '',
    remark: 'ព័ត៌មានមិនទាន់គ្រប់គ្រាន់',
    attachments: [],
    metadata: {
      createdAt: '2026-07-10 09:40',
      createdBy: 'System Administrator (admin)',
      updatedAt: '2026-07-10 09:40',
      updatedBy: 'admin',
      version: 1,
      changeLog: [
        { timestamp: '2026-07-10 09:40', user: 'admin', action: 'បានបង្កើតកំណត់ត្រាដំបូង (ខ្វះព័ត៌មានកាលបរិច្ឆេទ)' }
      ]
    }
  }
];

class DataStore {
  constructor() {
    this.STORAGE_KEY_DATA = 'STAFF_CONTROL_DATA_V1';
    this.STORAGE_KEY_SETTINGS = 'STAFF_CONTROL_SETTINGS_V1';
    this.STORAGE_KEY_HEADERS = 'STAFF_CONTROL_CUSTOM_HEADERS_V1';
    this.STORAGE_KEY_TABLE_TITLES = 'STAFF_CONTROL_TABLE_TITLES_V1';
    this.init();
  }

  init() {
    if (!localStorage.getItem(this.STORAGE_KEY_DATA)) {
      localStorage.setItem(this.STORAGE_KEY_DATA, JSON.stringify(SAMPLE_STAFF_DATA));
    } else {
      // Migrate existing records: ensure metadata, attachments, and normalize Excel serial dates
      const existing = this.getStaffData();
      let modified = false;
      existing.forEach(r => {
        if (!r.attachments) {
          r.attachments = [];
          modified = true;
        }
        if (!r.metadata) {
          r.metadata = {
            createdAt: new Date().toLocaleString(),
            createdBy: 'System Administrator (admin)',
            updatedAt: new Date().toLocaleString(),
            updatedBy: 'admin',
            version: 1,
            changeLog: [{ timestamp: new Date().toLocaleString(), user: 'admin', action: 'កំណត់ត្រាដំបូង' }]
          };
          modified = true;
        }
        // Normalize any Excel serial date numbers or non-standard date formats
        if (typeof StatusCalculator !== 'undefined') {
          const dateFields = ['dob', 'serviceStartDate', 'requestDate', 'endDate', 'startDate', 'systemClosingDate', 'receivedDate'];
          dateFields.forEach(f => {
            if (r[f] !== undefined && r[f] !== null && r[f] !== '') {
              const cleaned = StatusCalculator.normalizeDate(r[f]);
              if (cleaned !== r[f]) {
                r[f] = cleaned;
                modified = true;
              }
            }
          });

          // Normalize Staff IDs to 4 digits (e.g. 160 -> 0160)
          if (StatusCalculator.format4DigitId) {
            if (r.staffId) {
              const formatted = StatusCalculator.format4DigitId(r.staffId);
              if (formatted !== r.staffId) {
                r.staffId = formatted;
                modified = true;
              }
            }
            if (r.secondaryId) {
              const formatted = StatusCalculator.format4DigitId(r.secondaryId);
              if (formatted !== r.secondaryId) {
                r.secondaryId = formatted;
                modified = true;
              }
            }
          }
        }
      });
      if (modified) {
        this.saveStaffData(existing);
      }
    }

    if (!localStorage.getItem(this.STORAGE_KEY_SETTINGS)) {
      localStorage.setItem(this.STORAGE_KEY_SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }
    if (!localStorage.getItem(this.STORAGE_KEY_HEADERS)) {
      localStorage.setItem(this.STORAGE_KEY_HEADERS, JSON.stringify(DEFAULT_MASTER_FIELDS));
    }
    if (!localStorage.getItem(this.STORAGE_KEY_TABLE_TITLES)) {
      localStorage.setItem(this.STORAGE_KEY_TABLE_TITLES, JSON.stringify(DEFAULT_TABLE_HEADER_TITLES));
    }
    this.loadMasterFields();
  }

  loadMasterFields() {
    try {
      const stored = JSON.parse(localStorage.getItem(this.STORAGE_KEY_HEADERS));
      if (Array.isArray(stored) && stored.length === 22) {
        const reqF = stored.find(f => f.key === 'requestDate');
        if (reqF) { reqF.kh = 'ថ្ងៃស្នើសុំ'; reqF.en = 'Request Date'; }
        const endF = stored.find(f => f.key === 'endDate');
        if (endF) { endF.kh = 'ថ្ងៃបញ្ចប់'; endF.en = 'End Date'; }
        const startF = stored.find(f => f.key === 'startDate');
        if (startF) { startF.kh = 'ថ្ងៃចាប់ផ្តើម'; startF.en = 'Start Date'; }
        MASTER_FIELDS = stored;
      } else {
        MASTER_FIELDS = [...DEFAULT_MASTER_FIELDS];
      }
    } catch (e) {
      MASTER_FIELDS = [...DEFAULT_MASTER_FIELDS];
    }
  }

  getMasterFields() {
    this.loadMasterFields();
    return MASTER_FIELDS;
  }

  saveMasterFields(fields) {
    if (Array.isArray(fields) && fields.length === 22) {
      localStorage.setItem(this.STORAGE_KEY_HEADERS, JSON.stringify(fields));
      MASTER_FIELDS = fields;
      return true;
    }
    return false;
  }

  resetMasterFields() {
    localStorage.setItem(this.STORAGE_KEY_HEADERS, JSON.stringify(DEFAULT_MASTER_FIELDS));
    MASTER_FIELDS = [...DEFAULT_MASTER_FIELDS];
    return MASTER_FIELDS;
  }

  /* ---------------- Table Header Titles (Left, Middle, Right) ---------------- */
  getTableHeaderTitles() {
    try {
      const titles = JSON.parse(localStorage.getItem(this.STORAGE_KEY_TABLE_TITLES));
      if (titles && titles.left && (titles.left.includes('បុគ្គលិក') || titles.left.includes('22 Fields'))) {
        titles.left = 'តារាងគ្រប់គ្រងទិន្នន័យ';
        this.saveTableHeaderTitles(titles);
      }
      return titles || { ...DEFAULT_TABLE_HEADER_TITLES };
    } catch (e) {
      return { ...DEFAULT_TABLE_HEADER_TITLES };
    }
  }

  saveTableHeaderTitles(titles) {
    localStorage.setItem(this.STORAGE_KEY_TABLE_TITLES, JSON.stringify(titles));
  }

  resetTableHeaderTitles() {
    localStorage.setItem(this.STORAGE_KEY_TABLE_TITLES, JSON.stringify(DEFAULT_TABLE_HEADER_TITLES));
    return { ...DEFAULT_TABLE_HEADER_TITLES };
  }

  getStaffData() {
    try {
      let data = JSON.parse(localStorage.getItem(this.STORAGE_KEY_DATA));
      if (!Array.isArray(data) || data.length === 0) {
        data = JSON.parse(JSON.stringify(SAMPLE_STAFF_DATA));
        this.saveStaffData(data);
      }
      if (typeof StatusCalculator !== 'undefined') {
        if (StatusCalculator.sanitizeRecordDates) {
          data.forEach(item => StatusCalculator.sanitizeRecordDates(item));
        }
        if (StatusCalculator.normalizeGender) {
          data.forEach(item => {
            if (item.gender) item.gender = StatusCalculator.normalizeGender(item.gender);
          });
        }
        if (StatusCalculator.format4DigitId) {
          data.forEach(item => {
            if (item.staffId !== undefined && item.staffId !== null && item.staffId !== '') {
              item.staffId = StatusCalculator.format4DigitId(item.staffId);
            }
            if (item.secondaryId !== undefined && item.secondaryId !== null && item.secondaryId !== '') {
              item.secondaryId = StatusCalculator.format4DigitId(item.secondaryId);
            }
          });
        }
      }
      return data;
    } catch (e) {
      return JSON.parse(JSON.stringify(SAMPLE_STAFF_DATA));
    }
  }

  saveStaffData(data) {
    if (Array.isArray(data) && typeof StatusCalculator !== 'undefined') {
      if (StatusCalculator.sanitizeRecordDates) {
        data.forEach(item => StatusCalculator.sanitizeRecordDates(item));
      }
      if (StatusCalculator.normalizeGender) {
        data.forEach(item => {
          if (item.gender) item.gender = StatusCalculator.normalizeGender(item.gender);
        });
      }
      if (StatusCalculator.format4DigitId) {
        data.forEach(item => {
          if (item.staffId !== undefined && item.staffId !== null && item.staffId !== '') {
            item.staffId = StatusCalculator.format4DigitId(item.staffId);
          }
          if (item.secondaryId !== undefined && item.secondaryId !== null && item.secondaryId !== '') {
            item.secondaryId = StatusCalculator.format4DigitId(item.secondaryId);
          }
        });
      }
    }
    localStorage.setItem(this.STORAGE_KEY_DATA, JSON.stringify(data));
  }

  getSettings() {
    try {
      let settings = JSON.parse(localStorage.getItem(this.STORAGE_KEY_SETTINGS));
      if (!settings || typeof settings !== 'object') {
        settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        this.saveSettings(settings);
        return settings;
      }

      // Ensure every category exists and is populated
      const categories = ['departments', 'offices', 'positions', 'genders', 'annualPeriods', 'requestReasons', 'remarks'];
      let modified = false;
      categories.forEach(cat => {
        if (!settings[cat] || !Array.isArray(settings[cat]) || settings[cat].length === 0) {
          settings[cat] = [...DEFAULT_SETTINGS[cat]];
          modified = true;
        }
      });

      // Ensure core remarks exist
      const requiredRemarks = ['Active', 'Inactive', 'កំពុងដំណើរការ (Active)', 'បានបិទប្រព័ន្ធ (Closed)'];
      requiredRemarks.forEach(def => {
        if (!settings.remarks.includes(def)) {
          settings.remarks.unshift(def);
          modified = true;
        }
      });

      // Always ensure annualPeriods is de-duplicated and sorted numerically ascending
      if (Array.isArray(settings.annualPeriods)) {
        const sorted = [...new Set(settings.annualPeriods.map(y => String(y).trim()).filter(Boolean))].sort((a, b) => {
          const numA = parseInt(a, 10);
          const numB = parseInt(b, 10);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return String(a).localeCompare(String(b));
        });
        if (JSON.stringify(sorted) !== JSON.stringify(settings.annualPeriods)) {
          settings.annualPeriods = sorted;
          modified = true;
        }
      }

      // Ensure requestReasonRules exist
      if (!settings.requestReasonRules || typeof settings.requestReasonRules !== 'object') {
        settings.requestReasonRules = { ...DEFAULT_SETTINGS.requestReasonRules };
        modified = true;
      }

      if (modified) {
        this.saveSettings(settings);
      }

      return settings;
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }
  }

  saveSettings(settings) {
    if (settings && Array.isArray(settings.annualPeriods)) {
      settings.annualPeriods = [...new Set(settings.annualPeriods.map(y => String(y).trim()).filter(Boolean))].sort((a, b) => {
        const numA = parseInt(a, 10);
        const numB = parseInt(b, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return String(a).localeCompare(String(b));
      });
    }
    localStorage.setItem(this.STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }

  getNextSerialNo() {
    const list = this.getStaffData();
    if (list.length === 0) return 1;
    const maxNo = list.reduce((max, item) => Math.max(max, parseInt(item.no, 10) || 0), 0);
    return maxNo + 1;
  }

  getPromotionRecords() {
    try {
      let data = JSON.parse(localStorage.getItem('STAFF_PROMOTION_RECORDS'));
      if (!Array.isArray(data) || data.length === 0) {
        data = [
          {
            no: 1,
            staffId: '0042',
            fullName: 'សុខ ចាន់ថន',
            gender: 'ប្រុស',
            position: 'ប្រធានការិយាល័យ',
            department: 'អគ្គនាយកដ្ឋានគយ និងរដ្ឋាករកម្ពុជា',
            office: 'ការិយាល័យរដ្ឋបាល',
            dob: '15-May-1988',
            serviceStartDate: '01-Jan-2012',
            promotionDate: '20-Aug-2024',
            currentRank: 'វរមន្ត្រី ថ្នាក់លេខ ២',
            requestedRank: 'វរមន្ត្រី ថ្នាក់លេខ ១',
            promotedRank: 'វរមន្ត្រី ថ្នាក់លេខ ១',
            prakasNo: '១២៣៤ ប្រក.ហរ',
            finalRank: 'វរមន្ត្រី ថ្នាក់លេខ ១',
            degree: 'បរិញ្ញាបត្ររង',
            otherRemark: 'ស្នើសុំឡើងថ្នាក់ប្រចាំឆ្នាំ២០២៦',
            importYear: '2026',
            importMonth: 'សីហា',
            batchRemark: 'ស្នើសុំឡើងឋានន្តរស័ក្តិប្រចាំខែសីហា ឆ្នាំ២០២៦'
          },
          {
            no: 2,
            staffId: '0108',
            fullName: 'គង់ ស្រីណុច',
            gender: 'ស្រី',
            position: 'អនុប្រធានការិយាល័យ',
            department: 'នាយកដ្ឋានបុគ្គលិក និងរដ្ឋបាល',
            office: 'ការិយាល័យគ្រប់គ្រងទិន្នន័យ',
            dob: '22-Oct-1991',
            serviceStartDate: '15-Mar-2015',
            promotionDate: '10-Jan-2023',
            currentRank: 'អនុមន្ត្រី ថ្នាក់លេខ ៣',
            requestedRank: 'អនុមន្ត្រី ថ្នាក់លេខ ២',
            promotedRank: 'អនុមន្ត្រី ថ្នាក់លេខ ២',
            prakasNo: '៥៦៧៨ ប្រក.ហរ',
            finalRank: 'អនុមន្ត្រី ថ្នាក់លេខ ២',
            degree: 'បរិញ្ញាបត្រ',
            otherRemark: 'ស្នើសុំឡើងថ្នាក់',
            importYear: '2026',
            importMonth: 'សីហា',
            batchRemark: 'ស្នើសុំឡើងឋានន្តរស័ក្តិប្រចាំខែសីហា ឆ្នាំ២០២៦'
          },
          {
            no: 3,
            staffId: '0215',
            fullName: 'ជា វុទ្ធី',
            gender: 'ប្រុស',
            position: 'មន្ត្រីស៊ើបអង្កេត',
            department: 'នាយកដ្ឋានបង្ការ និងបង្ក្រាបបទល្មើស',
            office: 'ការិយាល័យស៊ើបអង្កេត',
            dob: '05-Jul-1993',
            serviceStartDate: '10-Jun-2018',
            promotionDate: '20-Aug-2025',
            currentRank: 'មន្ត្រី ថ្នាក់លេខ ៤',
            requestedRank: 'មន្ត្រី ថ្នាក់លេខ ៣',
            promotedRank: '',
            prakasNo: '៩០១២ ប្រក.ហរ',
            finalRank: 'មន្ត្រី ថ្នាក់លេខ ៤',
            degree: 'បរិញ្ញាបត្រជាន់ខ្ពស់',
            otherRemark: 'ទិន្នន័យគំរូសម្រាប់រៀបចំ',
            importYear: '2026',
            importMonth: 'សីហា',
            batchRemark: 'ស្នើសុំឡើងឋានន្តរស័ក្តិប្រចាំខែសីហា ឆ្នាំ២០២៦'
          },
          {
            no: 4,
            staffId: '0340',
            fullName: 'លី ម៉េងហ៊ាង',
            gender: 'ប្រុស',
            position: 'ប្រធានផ្នែក',
            department: 'នាយកដ្ឋានច្បាប់ និងវិវាទ',
            office: 'ការិយាល័យច្បាប់',
            dob: '18-Feb-1986',
            serviceStartDate: '01-Nov-2010',
            promotionDate: '15-Aug-2022',
            currentRank: 'វរមន្ត្រី ថ្នាក់លេខ ៣',
            requestedRank: 'វរមន្ត្រី ថ្នាក់លេខ ២',
            promotedRank: 'វរមន្ត្រី ថ្នាក់លេខ ២',
            prakasNo: '៤៣២១ ប្រក.ហរ',
            finalRank: 'វរមន្ត្រី ថ្នាក់លេខ ២',
            degree: 'បរិញ្ញាបត្រ',
            otherRemark: 'តាមអតីតភាពការងារ',
            importYear: '2026',
            importMonth: 'សីហា',
            batchRemark: 'ស្នើសុំឡើងឋានន្តរស័ក្តិប្រចាំខែសីហា ឆ្នាំ២០២៦'
          },
          {
            no: 5,
            staffId: '0412',
            fullName: 'អ៊ុំ វ៉ាន់នី',
            gender: 'ស្រី',
            position: 'មន្ត្រីរដ្ឋបាល',
            department: 'អគ្គនាយកដ្ឋានគយ និងរដ្ឋាករកម្ពុជា',
            office: 'ការិយាល័យរដ្ឋបាល',
            dob: '30-Sep-1994',
            serviceStartDate: '01-May-2019',
            promotionDate: '01-Jan-2024',
            currentRank: 'អនុមន្ត្រី ថ្នាក់លេខ ៤',
            requestedRank: 'អនុមន្ត្រី ថ្នាក់លេខ ៣',
            promotedRank: 'អនុមន្ត្រី ថ្នាក់លេខ ៣',
            prakasNo: '៨៧៦៥ ប្រក.ហរ',
            finalRank: 'អនុមន្ត្រី ថ្នាក់លេខ ៣',
            degree: 'បរិញ្ញាបត្រ',
            otherRemark: 'តាមកម្រិតសញ្ញាបត្រ',
            importYear: '2026',
            importMonth: 'សីហា',
            batchRemark: 'ស្នើសុំឡើងឋានន្តរស័ក្តិប្រចាំខែសីហា ឆ្នាំ២០២៦'
          }
        ];
        this.savePromotionRecords(data);
      }
      return data;
    } catch (e) {
      return [];
    }
  }

  savePromotionRecords(records) {
    localStorage.setItem('STAFF_PROMOTION_RECORDS', JSON.stringify(records));
  }

  getPromotionBatches() {
    try {
      const batches = JSON.parse(localStorage.getItem('STAFF_PROMOTION_BATCHES'));
      return Array.isArray(batches) ? batches : [];
    } catch (e) {
      return [];
    }
  }

  savePromotionBatches(batches) {
    localStorage.setItem('STAFF_PROMOTION_BATCHES', JSON.stringify(batches));
  }
}

const dataStore = new DataStore();
