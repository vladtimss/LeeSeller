/**
 * Типы для Ozon API: список FBO отправлений
 * POST /v2/posting/fbo/list
 */

export interface FboPostingListFilter {
    since: string;
    to: string;
    status?: string;
}

export interface FboPostingListRequestWith {
    analytics_data: boolean;
    financial_data: boolean;
    legal_info?: boolean;
}

export interface FboPostingListRequest {
    dir?: 'ASC' | 'DESC';
    filter: FboPostingListFilter;
    limit: number;
    offset: number;
    translit?: boolean;
    with?: FboPostingListRequestWith;
}

export interface FboPostingProduct {
    sku: number;
    name: string;
    quantity: number;
    offer_id: string;
    price: string;
    digital_codes: string[];
    currency_code: string;
    is_marketplace_buyout: boolean;
}

export interface FboPostingAnalyticsData {
    city: string;
    delivery_type: string;
    is_premium: boolean;
    payment_type_group_name: string;
    warehouse_id: number;
    warehouse_name: string;
    is_legal: boolean;
    client_delivery_date_begin: string | null;
    client_delivery_date_end: string | null;
}

export interface FboPostingFinancialProduct {
    commission_amount: number;
    commission_percent: number;
    payout: number;
    product_id: number;
    old_price: number;
    price: number;
    total_discount_value: number;
    total_discount_percent: number;
    actions: string[];
    currency_code: string;
}

export interface FboPostingFinancialData {
    products: FboPostingFinancialProduct[];
    cluster_from: string;
    cluster_to: string;
}

export interface FboPostingLegalInfo {
    company_name: string;
    inn: string;
    kpp: string;
}

export interface FboPosting {
    order_id: number;
    order_number: string;
    posting_number: string;
    status: string;
    cancel_reason_id: number;
    created_at: string;
    in_process_at: string;
    products: FboPostingProduct[];
    analytics_data?: FboPostingAnalyticsData | null;
    financial_data?: FboPostingFinancialData | null;
    additional_data?: unknown[];
    legal_info?: FboPostingLegalInfo | null;
    substatus: string;
}

export interface FboPostingListResponse {
    result: FboPosting[];
}
