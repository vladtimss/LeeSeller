import { OzonStoreIdentifier } from '../../enums/ozon-store-identifier.enum';
import { prepareOutputDir, joinPath } from '../../../common/helpers/files/files.helper';
import { buildSemicolonCsvContent } from '../../helpers/ozon-csv.helper';
import { isNode } from '../../../common/helpers/runtime/runtime-env.helper';
import * as fs from 'fs';

/**
 * Период для запроса заказов (since/to в формате YYYY-MM-DD по МСК или ISO)
 * Ozon API принимает даты в формате ISO 8601 для filter.since / filter.to
 */
export interface OzonOrdersPeriod {
    since: string;
    to: string;
}

/**
 * Вчерашний день в формате YYYY-MM-DD (локальная дата, для простоты без явной МСК)
 */
function getYesterdayDate(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** Регулярка для даты YYYY-MM-DD */
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Собирает период из строк дат (YYYY-MM-DD).
 * @returns Период в ISO для Ozon API или null, если даты невалидны
 */
export function buildOrdersPeriodFromDates(sinceDate: string, toDate: string): OzonOrdersPeriod | null {
    if (!DATE_ONLY_REGEX.test(sinceDate) || !DATE_ONLY_REGEX.test(toDate)) {
        return null;
    }
    const sinceTime = new Date(sinceDate + 'T00:00:00.000Z').getTime();
    const toTime = new Date(toDate + 'T23:59:59.999Z').getTime();
    if (sinceTime > toTime) {
        return null;
    }
    return {
        since: `${sinceDate}T00:00:00.000Z`,
        to: `${toDate}T23:59:59.999Z`,
    };
}

/**
 * Возвращает период за вчера: since и to = вчера (00:00 - 23:59 в ISO для Ozon)
 * Ozon в доке часто принимает даты как "2026-02-22" или с временем — используем начало/конец дня в UTC для простоты
 */
export function getDefaultOrdersPeriod(): OzonOrdersPeriod {
    const yesterday = getYesterdayDate();
    return {
        since: `${yesterday}T00:00:00.000Z`,
        to: `${yesterday}T23:59:59.000Z`,
    };
}

/**
 * Короткое имя магазина для имени файла
 */
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

/** Имя листа Google Sheets для GAS (общий лист по обоим магазинам) */
const OZON_FUNNEL_SHEET_NAME = 'ozon-funnel-data';

/**
 * Путь к файлу CSV заказов (Node) или имя листа для GAS.
 * Node: data/output/ozon-{store}-orders-{date}.csv
 * GAS: ozon-funnel-data (общий лист с колонкой \"Магазин\")
 */
export function getOzonOrdersFilePath(period: OzonOrdersPeriod, storeIdentifier: OzonStoreIdentifier): string {
    if (!isNode()) {
        return OZON_FUNNEL_SHEET_NAME;
    }
    const outputDirResult = prepareOutputDir();
    const storeShort = getStoreShortName(storeIdentifier);
    const sinceStr = period.since.slice(0, 10);
    const toStr = period.to.slice(0, 10);
    const fileName =
        sinceStr === toStr
            ? `ozon-${storeShort}-orders-${sinceStr}.csv`
            : `ozon-${storeShort}-orders-${sinceStr}--${toStr}.csv`;
    return joinPath(outputDirResult.pathOrId, fileName);
}

/**
 * Записывает CSV с разделителем ";" в файл (UTF-8)
 */
export function writeOzonOrdersCsv(
    filePath: string,
    headers: string[],
    rows: (string | number)[][],
): void {
    const content = buildSemicolonCsvContent(headers, rows);
    fs.writeFileSync(filePath, content, 'utf-8');
}
