/**
 * JoyInventory Google Sheets backend
 *
 * 사용 방법
 * 1. Google Sheet에서 확장 프로그램 > Apps Script를 엽니다.
 * 2. 이 파일 내용을 붙여 넣습니다.
 * 3. SHEET_ID 값을 사용할 스프레드시트 ID로 확인합니다.
 * 4. 배포 > 새 배포 > 웹 앱
 *    - 실행 사용자: 나
 *    - 액세스 권한: 링크가 있는 모든 사용자
 * 5. 생성된 Web App URL을 index.html 앱의 설정 > Google Apps Script Web App URL에 입력합니다.
 */

const SHEET_ID = '14i40-G350cTDRaIDSva_L-TXSuzz3uykwhQ1amGlfMY';
const ITEMS_SHEET = 'InventoryItems';
const MOVEMENTS_SHEET = 'InventoryMovements';

const ITEM_HEADERS = [
  'sku', 'imageUrl', 'name', 'category', 'location', 'qty', 'safety',
  'purchaseAmount', 'landedUnitCost', 'marginRate', 'mallFeeRate', 'taxRate',
  'unit', 'supplier', 'memo', 'updatedAt'
];

const MOVEMENT_HEADERS = [
  'id', 'date', 'sku', 'type', 'qty', 'note'
];

function doGet(e) {
  const callback = e.parameter.callback || 'callback';
  const action = e.parameter.action || 'list';
  const payload = parsePayload_(e.parameter.payload);
  let result;

  try {
    if (action === 'list') {
      result = {
        ok: true,
        items: readObjects_(ITEMS_SHEET, ITEM_HEADERS),
        movements: readObjects_(MOVEMENTS_SHEET, MOVEMENT_HEADERS)
      };
    } else if (action === 'replaceAll') {
      replaceObjects_(ITEMS_SHEET, ITEM_HEADERS, payload.items || []);
      replaceObjects_(MOVEMENTS_SHEET, MOVEMENT_HEADERS, payload.movements || []);
      result = { ok: true };
    } else {
      result = { ok: false, error: 'Unknown action: ' + action };
    }
  } catch (error) {
    result = { ok: false, error: String(error && error.message ? error.message : error) };
  }

  return ContentService
    .createTextOutput(callback + '(' + JSON.stringify(result) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function parsePayload_(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    return {};
  }
}

function getSheet_(name, headers) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);

  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const hasHeaders = firstRow.some(String);
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function readObjects_(sheetName, headers) {
  const sheet = getSheet_(sheetName, headers);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const width = Math.max(sheet.getLastColumn(), headers.length);
  const sheetHeaders = sheet.getRange(1, 1, 1, width).getValues()[0]
    .map((header, index) => String(header || headers[index] || '').trim());
  const values = sheet.getRange(2, 1, lastRow - 1, width).getValues();
  return values
    .filter(row => row.some(value => value !== '' && value !== null))
    .map(row => {
      const record = {};
      sheetHeaders.forEach((header, index) => {
        if (header) record[header] = row[index];
      });
      return record;
    });
}

function replaceObjects_(sheetName, headers, records) {
  const sheet = getSheet_(sheetName, headers);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);

  if (!records.length) return;
  const rows = records.map(record => headers.map(header => record[header] == null ? '' : record[header]));
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.autoResizeColumns(1, headers.length);
}
