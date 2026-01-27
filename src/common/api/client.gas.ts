import type { ApiClient, ApiRequestConfig } from './client.interface';
import type { ApiRequestInit } from './api.types';
import { buildHeadersAndBody, parseResponseOrThrow } from './api-helpers';

/**
 * GAS реализация ApiClient
 * Использует UrlFetchApp для HTTP запросов
 */
export const apiClientGas: ApiClient = {
    async request<T>(config: ApiRequestConfig, path: string, init: ApiRequestInit = {}): Promise<T> {
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        const url = `${config.baseUrl}${normalizedPath}`;

        const { headers, bodySerialized } = buildHeadersAndBody(
            config,
            init,
            (message?: unknown, ...rest: unknown[]) => {
                Logger.log(String(message));
                if (rest.length > 0) {
                    Logger.log(JSON.stringify(rest));
                }
            },
        );

        const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
            method: (init.method ?? 'get') as GoogleAppsScript.URL_Fetch.HttpMethod,
            headers,
            muteHttpExceptions: true,
        };

        if (bodySerialized !== undefined) {
            options.payload = bodySerialized;
        }

        const response = UrlFetchApp.fetch(url, options);
        const responseCode = response.getResponseCode();
        const text = response.getContentText();

        return parseResponseOrThrow<T>(config, path, responseCode, text, (message?: unknown, ...rest: unknown[]) => {
            Logger.log(String(message));
            if (rest.length > 0) {
                Logger.log(JSON.stringify(rest));
            }
        });
    },
};
