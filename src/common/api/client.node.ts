import fetch, { type RequestInit as NodeFetchRequestInit } from 'node-fetch';
import type { ApiClient, ApiRequestConfig } from './client.interface';
import type { ApiRequestInit } from './api.types';
import { buildHeadersAndBody, parseResponseOrThrow } from './api-helpers';

/**
 * Node.js реализация ApiClient
 * Использует node-fetch для HTTP запросов
 */
export const apiClientNode: ApiClient = {
    async request<T>(config: ApiRequestConfig, path: string, init: ApiRequestInit = {}): Promise<T> {
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        const url = `${config.baseUrl}${normalizedPath}`;

        const { headers, bodySerialized } = buildHeadersAndBody(config, init, console.error);

        const fetchInit: NodeFetchRequestInit = {
            method: init.method ?? 'get',
            headers,
            body: bodySerialized,
        };

        let res: Awaited<ReturnType<typeof fetch>>;

        try {
            res = await fetch(url, fetchInit);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[${config.logPrefix}] fetch error:`, errorMessage);
            throw new Error(`${config.logPrefix} fetch failed: ${errorMessage}`);
        }

        const text = await res.text().catch(() => '');

        return parseResponseOrThrow<T>(config, path, res.status, text, console.error);
    },
};
