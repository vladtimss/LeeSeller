/**
 * Типы для Ozon API: товары и аналитика остатков
 * /v4/product/info/attributes — для получения SKU
 * /v1/analytics/stocks — для получения остатков и метрик
 */

// ---------- /v4/product/info/attributes ----------

export interface OzonProductAttributesFilter {
    visibility?: string;
    product_id?: number[];
    offer_id?: string[];
}

export interface OzonProductAttributesRequest {
    filter?: OzonProductAttributesFilter;
    limit?: number;
    last_id?: string;
    sort_dir?: 'ASC' | 'DESC';
}

export interface OzonProductAttributesItem {
    product_id: number;
    offer_id: string;
    sku: number;
    name: string;
    // Остальные поля атрибутов нам сейчас не нужны
}

export interface OzonProductAttributesResponse {
    result: OzonProductAttributesItem[];
    total: number;
    last_id: string | null;
}

// ---------- /v1/analytics/stocks ----------

export interface OzonAnalyticsStocksRequest {
    skus: number[];
}

export interface OzonAnalyticsStocksItem {
    sku: number;
    name: string;
    offer_id: string;
    warehouse_id: number;
    warehouse_name: string;
    cluster_id: number;
    cluster_name: string;
    macrolocal_cluster_id?: number;

    item_tags: string[];

    ads: number | null;
    ads_cluster: number | null;

    available_stock_count: number;
    valid_stock_count: number;
    waiting_docs_stock_count: number;
    expiring_stock_count: number;
    transit_defect_stock_count: number;
    stock_defect_stock_count: number;
    excess_stock_count: number;
    other_stock_count: number;
    requested_stock_count: number;
    transit_stock_count: number;
    return_from_customer_stock_count: number;
    return_to_seller_stock_count: number;

    days_without_sales: number;
    days_without_sales_cluster: number;

    idc: number | null;
    idc_cluster: number | null;

    turnover_grade: string | null;
    turnover_grade_cluster: string | null;
}

/** Ответ /v1/analytics/stocks — массив в поле items */
export interface OzonAnalyticsStocksResponse {
    items: OzonAnalyticsStocksItem[];
}

