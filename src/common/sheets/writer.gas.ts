import type { SheetWriter, SheetWriterWriteOptions } from './writer.interface';

/**
 * Получает или создает лист в таблице
 */
function getOrCreateSheet(
    spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
    sheetName: string,
): GoogleAppsScript.Spreadsheet.Sheet {
    let sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
        sheet = spreadsheet.insertSheet(sheetName);
    }
    return sheet;
}

/**
 * GAS реализация SheetWriter
 * Использует SpreadsheetApp для записи в Google Sheets
 */
export const sheetWriterGas: SheetWriter = {
    write(options: SheetWriterWriteOptions): void {
        const { sheetName, headers, rows, mode = 'overwrite' } = options;

        if (rows.length === 0 && mode === 'append') {
            return;
        }

        const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
        if (!spreadsheetId) {
            throw new Error('SPREADSHEET_ID не установлен в PropertiesService. Запустите setupTokens() для настройки.');
        }

        const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
        const sheet = getOrCreateSheet(spreadsheet, sheetName);

        if (mode === 'overwrite') {
            sheet.clear();
            sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

            if (rows.length > 0) {
                sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
            }

            return;
        }

        // append
        const lastRow = sheet.getLastRow();
        const startRow = lastRow === 0 ? 1 : lastRow + 1;

        if (lastRow === 0) {
            sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        }

        if (rows.length > 0) {
            sheet.getRange(startRow, 1, rows.length, headers.length).setValues(rows);
        }
    },
};
