import { OzonStoreIdentifier } from '../../enums/ozon-store-identifier.enum';
import { prepareOutputDir, joinPath } from '../../../common/helpers/files/files.helper';
import { buildSemicolonCsvContent } from '../../helpers/ozon-csv.helper';
import * as fs from 'fs';

function getStoreShortName(storeIdentifier: OzonStoreIdentifier): string {
    switch (storeIdentifier) {
        case OzonStoreIdentifier.LEESHOP:
            return 'lee';
        case OzonStoreIdentifier.POVAR:
            return 'povar';
        default:
            return storeIdentifier;
    }
}

/** Дата сегодня в YYYY-MM-DD для имени файла остатков */
function getTodayDate(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/**
 * Путь к файлу CSV остатков: data/output/ozon-{store}-stocks-{date}.csv
 */
export function getOzonStocksFilePath(storeIdentifier: OzonStoreIdentifier): string {
    const outputDirResult = prepareOutputDir();
    const storeShort = getStoreShortName(storeIdentifier);
    const dateStr = getTodayDate();
    const fileName = `ozon-${storeShort}-stocks-${dateStr}.csv`;
    return joinPath(outputDirResult.pathOrId, fileName);
}

export function writeOzonStocksCsv(filePath: string, headers: string[], rows: (string | number)[][]): void {
    const content = buildSemicolonCsvContent(headers, rows);
    fs.writeFileSync(filePath, content, 'utf-8');
}
