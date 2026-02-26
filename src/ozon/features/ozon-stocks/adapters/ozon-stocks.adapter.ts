import type { OzonAnalyticsStocksItem } from '../ozon-stocks.types';
import { OZON_STOCKS_CSV_HEADERS } from '../ozon-stocks.headers.const';

/**
 * Одна строка CSV = товар × кластер × склад.
 */
export function adaptAnalyticsStockToCsvRow(item: OzonAnalyticsStocksItem): (string | number)[] {
    const tags = Array.isArray(item.item_tags) ? item.item_tags.join(',') : '';

    return [
        item.offer_id ?? '',
        item.name ?? '',
        item.sku ?? '',
        tags,
        '', // Зона размещения — оставляем пустой
        item.cluster_name ?? '',
        item.cluster_id ?? '',
        item.warehouse_name ?? '',
        item.warehouse_id ?? '',

        item.available_stock_count ?? 0,
        item.valid_stock_count ?? 0,
        item.waiting_docs_stock_count ?? 0,
        '', // Маркируемые товары, ожидающие УПД — в API отдельного поля нет
        item.expiring_stock_count ?? 0,
        item.transit_defect_stock_count ?? 0,
        item.stock_defect_stock_count ?? 0,
        item.excess_stock_count ?? 0,
        item.other_stock_count ?? 0,
        item.requested_stock_count ?? 0,
        item.transit_stock_count ?? 0,
        item.return_from_customer_stock_count ?? 0,
        item.return_to_seller_stock_count ?? 0,

        item.ads ?? 0,
        item.days_without_sales ?? 0,
        item.idc ?? 0,
        item.turnover_grade ?? '',

        item.ads_cluster ?? 0,
        item.days_without_sales_cluster ?? 0,
        item.idc_cluster ?? 0,
        item.turnover_grade_cluster ?? '',

        item.macrolocal_cluster_id ?? '',
    ];
}

export function getOzonStocksCsvHeaders(): string[] {
    return [...OZON_STOCKS_CSV_HEADERS];
}
