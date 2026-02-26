import type { FboPosting, FboPostingProduct, FboPostingFinancialData } from '../ozon-fbo-orders.types';
import { OZON_ORDERS_CSV_HEADERS } from '../ozon-fbo-orders.headers.const';

/**
 * Формат "Принят в обработку" как в скачанном файле ЛК: DD.MM.YYYY HH:mm (UTC)
 */
function formatAcceptedAtFile(iso: string | null | undefined): string {
    if (!iso) {
        return '';
    }
    try {
        const d = new Date(iso);
        const day = String(d.getUTCDate()).padStart(2, '0');
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const y = d.getUTCFullYear();
        const h = String(d.getUTCHours()).padStart(2, '0');
        const min = String(d.getUTCMinutes()).padStart(2, '0');
        return `${day}.${m}.${y} ${h}:${min}`;
    } catch {
        return '';
    }
}

/**
 * Маппинг status (API) -> формулировки как в выгрузке ЛК Ozon
 */
function mapStatus(status: string): string {
    const map: Record<string, string> = {
        awaiting_packaging: 'Ожидает сборки',
        awaiting_deliver: 'Ожидает отгрузки',
        delivering: 'Доставляется',
        delivered: 'Доставлен',
        cancelled: 'Отменён',
    };
    return map[status] ?? status;
}

/**
 * delivery_type API -> способ доставки в CSV
 */
function mapDeliveryType(deliveryType: string): string {
    if (deliveryType === 'PVZ') {
        return 'ПВЗ';
    }
    if (deliveryType === 'Courier') {
        return 'Курьер';
    }
    return deliveryType || '';
}

/**
 * is_premium -> сегмент клиента
 */
function mapSegment(isPremium: boolean): string {
    return isPremium ? 'Премиум' : 'Не премиум';
}

/**
 * is_legal -> юридическое лицо
 */
function mapLegal(isLegal: boolean): string {
    return isLegal ? 'да' : 'нет';
}

/**
 * Выкуп товара: формулировки как в выгрузке ЛК (Подлежит выкупу / нет)
 */
function mapBuyout(isMarketplaceBuyout: boolean): string {
    return isMarketplaceBuyout ? 'Подлежит выкупу' : 'нет';
}

/**
 * По одному отправлению формирует массив строк CSV (одна строка на каждый товар в отправлении).
 * Заполняем только колонки, совпадающие с выгрузкой ЛК; остальные — пустая строка (из API игнорируем).
 * Порядок колонок = порядок в файле (OZON_ORDERS_CSV_HEADERS).
 */
export function adaptFboPostingToOrderCsvRows(posting: FboPosting): (string | number)[][] {
    const rows: (string | number)[][] = [];
    const products = posting.products ?? [];
    if (products.length === 0) {
        return rows;
    }

    const analytics = posting.analytics_data;
    const financial =
        posting.financial_data ??
        ({
            products: [],
            cluster_from: '',
            cluster_to: '',
        } as FboPostingFinancialData);

    for (let i = 0; i < products.length; i++) {
        const product: FboPostingProduct = products[i];
        const sumRow = Number(product.price) * product.quantity;
        const currencyCode = product.currency_code;

        const row: (string | number)[] = [
            posting.order_number, // 1. Номер заказа
            posting.posting_number, // 2. Номер отправления
            formatAcceptedAtFile(posting.in_process_at), // 3. Принят в обработку (DD.MM.YYYY HH:mm)
            '', // 4. Дата отгрузки — игнор
            mapStatus(posting.status), // 5. Статус
            '', // 6. Дата доставки — игнор
            '', // 7. Фактическая дата передачи — игнор
            sumRow.toFixed(2), // 8. Сумма отправления
            currencyCode, // 9. Код валюты отправления
            product.name, // 10. Название товара
            product.sku, // 11. SKU
            product.offer_id, // 12. Артикул
            product.price, // 13. Ваша цена
            product.currency_code, // 14. Код валюты товара
            '', // 15. Оплачено покупателем — игнор
            '', // 16. Код валюты покупателя — игнор
            product.quantity, // 17. Количество
            '', // 18. Стоимость доставки — игнор
            '', // 19. Связанные отправления — игнор
            mapBuyout(product.is_marketplace_buyout), // 20. Выкуп товара
            '', // 21. Цена товара до скидок — игнор
            '', // 22. Скидка % — игнор
            '', // 23. Скидка руб — игнор
            '', // 24. Акции — игнор
            '', // 25. Объемный вес — игнор
            financial.cluster_from ?? '', // 26. Кластер отгрузки
            financial.cluster_to ?? '', // 27. Кластер доставки
            '', // 28. Норм. время доставки — игнор
            '', // 29. Оценка отгрузки — игнор
            analytics?.warehouse_name ?? '', // 30. Склад отгрузки
            '', // 31. Регион доставки — игнор
            '', // 32. Город доставки — пусто по требованию
            mapDeliveryType(analytics?.delivery_type ?? ''), // 33. Способ доставки
            mapSegment(analytics?.is_premium ?? false), // 34. Сегмент клиента
            mapLegal(analytics?.is_legal ?? false), // 35. Юридическое лицо
            analytics?.payment_type_group_name ?? '', // 36. Способ оплаты
            '', // 37. Адрес покупателя — игнор
            '', // 38. Штрихкод ювелирного изделия — пусто
        ];

        rows.push(row);
    }

    return rows;
}

/**
 * Возвращает заголовки в порядке, совпадающем с эталонным CSV
 */
export function getOzonOrdersCsvHeaders(): string[] {
    return [...OZON_ORDERS_CSV_HEADERS];
}
