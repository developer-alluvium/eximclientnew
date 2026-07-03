const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function readReport() {
  const workbook = new ExcelJS.Workbook();
  const filePath = path.join(__dirname, '../EwayBill_QA_Test_Report.xlsx');
  await workbook.xlsx.readFile(filePath);

  const testCasesSheet = workbook.getWorksheet('Test Cases');
  const headers = [];
  testCasesSheet.getRow(2).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = cell.value;
  });

  const failedCases = [];
  testCasesSheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 2) return;

    const statusVal = row.getCell(10).value;
    const statusStr = statusVal ? String(statusVal).trim().toUpperCase() : '';
    
    if (statusStr === 'FAIL' || statusStr === 'FAILED') {
      const caseDetails = {};
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber] || `Col_${colNumber}`;
        caseDetails[header] = cell.value;
      });
      caseDetails._rowNumber = rowNumber;
      failedCases.push(caseDetails);
    }
  });

  const outputPath = path.join(__dirname, 'failed_test_cases.json');
  fs.writeFileSync(outputPath, JSON.stringify(failedCases, null, 2), 'utf-8');
  console.log(`Successfully wrote ${failedCases.length} failed cases to ${outputPath}`);
}

readReport().catch(err => console.error(err));
