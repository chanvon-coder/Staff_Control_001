# ការណែនាំអំពីការប្រើប្រាស់ប្រព័ន្ធគ្រប់គ្រងបុគ្គលិកក្នុង Microsoft Excel (Book1.xlsm)

ឯកសារនេះពន្យល់ពីរបៀបរៀបចំ និងដំណើរការប្រព័ន្ធគ្រប់គ្រងបុគ្គលិក (Staff System Control) ដោយផ្ទាល់នៅក្នុង **Microsoft Excel** ជាមួយ VBA Macros និង ២២ ជួរឈរដើមនៃ Book1។

---

## ១. រចនាសម្ព័ន្ធជួរឈរទាំង ២២ (Master 22-Field Columns)

| ល.រ (Col) | ឈ្មោះជួរឈរ (Header) | ការពិពណ៌នា (Description) |
| :---: | :--- | :--- |
| A | **ល.រ** | លេខរៀងស្វ័យប្រវត្ត (Auto Serial No) |
| B | **អត្តលេខ អពដ** | អត្តលេខសម្គាល់បុគ្គលិក (Staff ID / GDT ID) |
| C | **អត្តលេខ កសហវ** | អត្តលេខសម្គាល់បន្ទាប់បន្សំ (MEF Secondary ID) |
| D | **ឈ្មោះឡាតាំង** | ឈ្មោះជាអក្សរឡាតាំង (Latin Name) |
| E | **ឈ្មោះខ្មែរ** | ឈ្មោះជាអក្សរខ្មែរ (Khmer Name) |
| F | **អង្គភាព** | នាយកដ្ឋាន ឬអង្គភាពសាមី (Department) |
| G | **ការិយាល័យ** | ការិយាល័យចំណុះ (Office) |
| H | **តួនាទី** | តួនាទី / មុខតំណែង (Position) |
| I | **ភេទ** | ភេទ (Gender: ប្រុស / ស្រី) |
| J | **ថ្ងៃខែឆ្នាំកំណើត** | ថ្ងៃខែឆ្នាំកំណើត (DOB) |
| K | **ថ្ងៃខែឆ្នាំបម្រើការងារ** | ថ្ងៃចាប់ផ្តើមបម្រើការងារ (Service Date) |
| L | **ថ្ងៃខែឆ្នាំស្នើសុំ** | ថ្ងៃដាក់ពាក្យស្នើសុំ (Request Date) |
| M | **ថ្ងៃខែឆ្នាំបញ្ចប់** | ថ្ងៃបញ្ចប់សុពលភាព (End Date) |
| N | **ថ្ងៃខែឆ្នាំចាប់ផ្តើម** | ថ្ងៃចាប់ផ្តើមអនុវត្ត (Start Date) |
| O | **ប្រចាំឆ្នាំ** | ឆ្នាំអនុវត្ត (Annual Year) |
| P | **មូលហេតុនៃសំណើ** | មូលហេតុស្នើសុំ (Request Reason) |
| Q | **ប្រកាសលេខ** | លេខប្រកាស ឬសេចក្តីសម្រេច (Prakas No.) |
| R | **ពិព័ណនាផ្សេងៗ** | ព័ត៌មានលម្អិតបន្ថែម (Description) |
| S | **ថ្ងៃខែបិទប្រព័ន្ធ** | កាលបរិច្ឆេទបិទប្រព័ន្ធ (Closing Date) |
| T | **ឯកសារយោង** | លិខិត ឬឯកសារយោង (Reference Doc) |
| U | **ថ្ងៃខែទទួលឯកសារ ឬប្រកាសផ្សេងៗ** | ថ្ងៃទទួលឯកសារ (Received Date) |
| V | **Remark** | កំណត់សម្គាល់បន្ថែម (Remarks) |

---

## ២. របៀបនាំចូល VBA Module ទៅក្នុង Microsoft Excel

1. បើកកម្មវិធី **Microsoft Excel** ហើយបើកឯកសារ `Book1` របស់អ្នក។
2. ចុចគ្រាប់ចុច `ALT + F11` ដើម្បីបើកផ្ទាំង **VBA Editor**។
3. ក្នុងម៉ឺនុយខាងលើ ចុច **File** ➔ **Import File...** (ឬចុច `Ctrl + M`)។
4. ជ្រើសរើសឯកសារ [Staff_System_Control.bas](file:///C:/Users/mcz/.gemini/antigravity/scratch/staff-system-control/excel-vba/Staff_System_Control.bas)។
5. ត្រឡប់ទៅផ្ទាំង Excel វិញ រួចចុច `ALT + F8` ហើយជ្រើសរើស `InitializeStaffSystem` រួចចុច **Run**។
6. ប្រព័ន្ធនឹងបង្កើតសន្លឹកការងារ (`Staff_Data`, `Setting`, `Document_Control`, `Dashboard`, `User_Control`, `Log`) ដោយស្វ័យប្រវត្ត។
7. រក្សាទុកឯកសារជាទម្រង់ **Excel Macro-Enabled Workbook (*.xlsm)**។

---

## ៣. រូបមន្តគណនាស្ថានភាពស្វ័យប្រវត្ត (Formula for Status Column W)

នៅក្នុងសន្លឹកកិច្ចការ `Staff_Data` នៅជួរឈរ `W2` (ស្ថានភាព / Status) អ្នកអាចប្រើរូបមន្ត Excel ខាងក្រោម៖

```excel
=IF(ISBLANK(B2), "", IF(NOT(ISBLANK(S2)), "បានបិទប្រព័ន្ធ (Closed)", IF(OR(AND(ISBLANK(N2), NOT(ISBLANK(L2))), AND(ISBLANK(T2), NOT(ISBLANK(L2)))), "ខ្វះព័ត៌មាន (Missing)", IF(AND(ISNUMBER(M2), M2<TODAY()), "ផុតសុពលភាព (Expired)", IF(AND(ISNUMBER(N2), N2>TODAY()), "រង់ចាំដំណើរការ (Pending)", "សកម្ម (Active)")))))
```
