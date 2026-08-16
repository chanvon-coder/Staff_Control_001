Attribute VB_Name = "modStaffSystemControl"
' =========================================================================================
' STAFF SYSTEM CONTROL - EXCEL VBA MASTER MODULE
' Conforms strictly to the 22 Book1 Header Fields
' 1. ល.រ | 2. អត្តលេខ អពដ | 3. អត្តលេខ កសហវ | 4. ឈ្មោះឡាតាំង | 5. ឈ្មោះខ្មែរ | 6. អង្គភាព
' 7. ការិយាល័យ | 8. តួនាទី | 9. ភេទ | 10. ថ្ងៃខែឆ្នាំកំណើត | 11. ថ្ងៃខែឆ្នាំបម្រើការងារ
' 12. ថ្ងៃខែឆ្នាំស្នើសុំ | 13. ថ្ងៃខែឆ្នាំបញ្ចប់ | 14. ថ្ងៃខែឆ្នាំចាប់ផ្តើម | 15. ប្រចាំឆ្នាំ
' 16. មូលហេតុនៃសំណើ | 17. ប្រកាសលេខ | 18. ពិព័ណនាផ្សេងៗ | 19. ថ្ងៃខែបិទប្រព័ន្ធ
' 20. ឯកសារយោង | 21. ថ្ងៃខែទទួលឯកសារ ឬប្រកាសផ្សេងៗ | 22. Remark
' =========================================================================================

Option Explicit

Public Const SHEET_STAFF As String = "Staff_Data"
Public Const SHEET_SETTING As String = "Setting"
Public Const SHEET_DASHBOARD As String = "Dashboard"
Public Const SHEET_LOG As String = "Log"
Public Const SHEET_USER As String = "User_Control"

' -------------------------------------------------------------------------
' 1. INITIALIZE SHEETS & WORKBOOK STRUCTURE
' -------------------------------------------------------------------------
Public Sub InitializeStaffSystem()
    Dim wb As Workbook
    Dim wsStaff As Worksheet, wsSetting As Worksheet, wsDash As Worksheet, wsLog As Worksheet, wsUser As Worksheet
    Dim headers As Variant
    Dim i As Long

    Set wb = ThisWorkbook

    ' Ensure Master Sheets Exist
    Set wsStaff = GetOrCreateSheet(wb, SHEET_STAFF)
    Set wsSetting = GetOrCreateSheet(wb, SHEET_SETTING)
    Set wsDash = GetOrCreateSheet(wb, SHEET_DASHBOARD)
    Set wsLog = GetOrCreateSheet(wb, SHEET_LOG)
    Set wsUser = GetOrCreateSheet(wb, SHEET_USER)

    ' Setup Exact 22 Book1 Headers
    headers = Array("ល.រ", "អត្តលេខ អពដ", "អត្តលេខ កសហវ", "ឈ្មោះឡាតាំង", "ឈ្មោះខ្មែរ", _
                    "អង្គភាព", "ការិយាល័យ", "តួនាទី", "ភេទ", "ថ្ងៃខែឆ្នាំកំណើត", _
                    "ថ្ងៃខែឆ្នាំបម្រើការងារ", "ថ្ងៃខែឆ្នាំស្នើសុំ", "ថ្ងៃខែឆ្នាំបញ្ចប់", _
                    "ថ្ងៃខែឆ្នាំចាប់ផ្តើម", "ប្រចាំឆ្នាំ", "មូលហេតុនៃសំណើ", "ប្រកាសលេខ", _
                    "ពិព័ណនាផ្សេងៗ", "ថ្ងៃខែបិទប្រព័ន្ធ", "ឯកសារយោង", _
                    "ថ្ងៃខែទទួលឯកសារ ឬប្រកាសផ្សេងៗ", "Remark", "ស្ថានភាព (Status)")

    With wsStaff
        .Rows(1).Font.Bold = True
        .Rows(1).Interior.Color = RGB(37, 99, 235) ' Royal Blue
        .Rows(1).Font.Color = RGB(255, 255, 255)
        .Rows(1).RowHeight = 28
        .Rows(1).VerticalAlignment = xlCenter

        For i = LBound(headers) To UBound(headers)
            .Cells(1, i + 1).Value = headers(i)
        Next i
        
        .Columns.AutoFit
    End With

    ' Setup Log Headers
    With wsLog
        .Rows(1).Font.Bold = True
        .Rows(1).Interior.Color = RGB(75, 85, 99)
        .Rows(1).Font.Color = RGB(255, 255, 255)
        .Cells(1, 1).Value = "Log ID"
        .Cells(1, 2).Value = "កាលបរិច្ឆេទ (Timestamp)"
        .Cells(1, 3).Value = "អ្នកប្រើប្រាស់ (User)"
        .Cells(1, 4).Value = "សកម្មភាព (Action)"
        .Cells(1, 5).Value = "អត្តលេខ (Staff ID)"
        .Cells(1, 6).Value = "ពិព័ណនា (Description)"
        .Columns.AutoFit
    End With

    MsgBox "ប្រព័ន្ធគ្រប់គ្រងទិន្នន័យបុគ្គលិកត្រូវបានរៀបចំជោគជ័យ! (Staff System initialized successfully!)", vbInformation, "Staff System Control"
End Sub

' -------------------------------------------------------------------------
' 2. GET NEXT SERIAL NUMBER (ល.រ)
' -------------------------------------------------------------------------
Public Function GetNextSerialNo() As Long
    Dim ws As Worksheet
    Dim lastRow As Long
    Dim maxNo As Long, i As Long, currentNo As Long

    Set ws = ThisWorkbook.Sheets(SHEET_STAFF)
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row

    If lastRow <= 1 Then
        GetNextSerialNo = 1
        Exit Function
    End If

    maxNo = 0
    For i = 2 To lastRow
        If IsNumeric(ws.Cells(i, 1).Value) Then
            currentNo = CLng(ws.Cells(i, 1).Value)
            If currentNo > maxNo Then maxNo = currentNo
        End If
    Next i

    GetNextSerialNo = maxNo + 1
End Function

' -------------------------------------------------------------------------
' 3. CHECK DUPLICATE STAFF ID (អត្តលេខ អពដ)
' -------------------------------------------------------------------------
Public Function IsDuplicateStaffID(ByVal staffId As String, Optional ByVal currentRow As Long = 0) As Boolean
    Dim ws As Worksheet
    Dim lastRow As Long, i As Long
    Dim cleanId As String

    Set ws = ThisWorkbook.Sheets(SHEET_STAFF)
    lastRow = ws.Cells(ws.Rows.Count, 2).End(xlUp).Row
    cleanId = UCase(Trim(staffId))

    If cleanId = "" Then
        IsDuplicateStaffID = False
        Exit Function
    End If

    For i = 2 To lastRow
        If i <> currentRow Then
            If UCase(Trim(CStr(ws.Cells(i, 2).Value))) = cleanId Then
                IsDuplicateStaffID = True
                Exit Function
            End If
        End If
    Next i

    IsDuplicateStaffID = False
End Function

' -------------------------------------------------------------------------
' 4. AUTOMATIC STATUS CALCULATION (UDF)
' -------------------------------------------------------------------------
Public Function CalculateStaffStatus(ByVal closingDate As Variant, _
                                     ByVal startDate As Variant, _
                                     ByVal endDate As Variant, _
                                     ByVal requestDate As Variant, _
                                     ByVal refDoc As Variant) As String
    Dim todayDate As Date
    todayDate = Date

    ' 1. Closed
    If Not IsEmpty(closingDate) And Trim(CStr(closingDate)) <> "" Then
        CalculateStaffStatus = "បានបិទប្រព័ន្ធ (Closed)"
        Exit Function
    End If

    ' 2. Missing Critical Info
    If (IsEmpty(startDate) And Not IsEmpty(requestDate)) Or _
       (IsEmpty(refDoc) And Not IsEmpty(requestDate)) Then
        CalculateStaffStatus = "ខ្វះព័ត៌មាន (Missing Info)"
        Exit Function
    End If

    ' 3. Expired
    If IsDate(endDate) Then
        If CDate(endDate) < todayDate Then
            CalculateStaffStatus = "ផុតសុពលភាព (Expired)"
            Exit Function
        End If
    End If

    ' 4. Pending
    If IsDate(startDate) Then
        If CDate(startDate) > todayDate Then
            CalculateStaffStatus = "រង់ចាំដំណើរការ (Pending)"
            Exit Function
        End If
    End If

    ' 5. Active
    CalculateStaffStatus = "សកម្ម (Active)"
End Function

' -------------------------------------------------------------------------
' 5. AUDIT LOGGING PROCEDURE
' -------------------------------------------------------------------------
Public Sub WriteAuditLog(ByVal actionType As String, ByVal staffId As String, ByVal description As String)
    Dim wsLog As Worksheet
    Dim nextRow As Long

    On Error Resume Next
    Set wsLog = ThisWorkbook.Sheets(SHEET_LOG)
    If wsLog Is Nothing Then Exit Sub

    nextRow = wsLog.Cells(wsLog.Rows.Count, 1).End(xlUp).Row + 1
    If nextRow < 2 Then nextRow = 2

    wsLog.Cells(nextRow, 1).Value = "LOG-" & Format(Now, "yyyymmddhhnnss")
    wsLog.Cells(nextRow, 2).Value = Format(Now, "yyyy-mm-dd hh:nn:ss")
    wsLog.Cells(nextRow, 3).Value = Application.UserName
    wsLog.Cells(nextRow, 4).Value = actionType
    wsLog.Cells(nextRow, 5).Value = staffId
    wsLog.Cells(nextRow, 6).Value = description
    On Error GoTo 0
End Sub

' -------------------------------------------------------------------------
' HELPER: GET OR CREATE WORKSHEET
' -------------------------------------------------------------------------
Private Function GetOrCreateSheet(ByRef wb As Workbook, ByVal sheetName As String) As Worksheet
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = wb.Sheets(sheetName)
    On Error GoTo 0

    If ws Is Nothing Then
        Set ws = wb.Sheets.Add(After:=wb.Sheets(wb.Sheets.Count))
        ws.Name = sheetName
    End If
    Set GetOrCreateSheet = ws
End Function
