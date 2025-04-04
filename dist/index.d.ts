type Config = {
    baseUrl: string;
    bearerToken: string | null;
    timeout: number;
    retry: boolean;
    maxRetries: number;
    startPolling: boolean;
    stopPolling: boolean;
    pollingInterval: number;
    revalidateCache: number;
    withCredentials: boolean;
    withCache: boolean;
    parseJson: boolean;
    stringifyPayload: boolean;
    mode: RequestMode;
    headers: {
        [key: string]: string;
    };
};
type RequestResult = {
    loading: boolean;
    error: {
        message: string;
        status: string | number;
    } | null;
    data: any;
    response: Response | null;
    refetch: (callback: (result: RequestResult) => void) => Promise<any>;
    cancelRequest: () => void;
    startPolling: (interval?: number) => void;
    stopPolling: () => void;
    onPollDataReceived: (callback: (result: RequestResult) => void) => void;
};
type RequestOptions = Omit<RequestInit, "body"> & {
    body?: BodyInit | object | null;
} & Partial<Config>;
/**
 * Updates the global configuration with the provided partial configuration.
 * Merges the new configuration with the existing configuration, allowing selective overrides.
 *
 * @param newConfig - A partial configuration object to update the existing configuration
 */
declare function setConfig(newConfig: Partial<Config>): void;
/**
 * Sets the bearer token for authentication in the global configuration.
 * Updates both the bearerToken and adds an Authorization header with the token for use for all subsquent requests.
 *
 * @param token - The bearer token to be used for authentication
 */
declare function setBearerToken(token: string): void;
/**
 * Sends an HTTP GET request to the specified URL.
 *
 * @param url - The target URL to send the GET request to
 * @param options - Optional configuration options for the request
 * @returns A Promise that resolves to the request result
 *
 * @example
 * const result = await GET('https://api.example.com/resource');
 */
declare function GET(url: string, options?: RequestOptions): Promise<RequestResult>;
/**
 * Sends an HTTP POST request to the specified URL.
 *
 * @param url - The target URL to send the POST request to
 * @param options - Optional configuration options for the request
 * @returns A Promise that resolves to the request result
 *
 * @example
 * const result = await POST('https://api.example.com/resource', { body: { key: 'value' } });
 */
declare function POST(url: string, options?: RequestOptions): Promise<RequestResult>;
/**
 * Sends an HTTP PUT request to the specified URL.
 *
 * @param url - The target URL to send the PUT request to
 * @param options - Optional configuration options for the request
 * @returns A Promise that resolves to the request result
 *
 * @example
 * const result = await PUT('https://api.example.com/resource', { body: { key: 'value' } });
 */
declare function PUT(url: string, options?: RequestOptions): Promise<RequestResult>;
/**
 * Sends an HTTP DELETE request to the specified URL.
 *
 * @param url - The target URL to send the DELETE request to
 * @param options - Optional configuration options for the request
 * @returns A Promise that resolves to the request result
 *
 * @example
 * const result = await DELETE('https://api.example.com/resource');
 */
declare function DELETE(url: string, options?: RequestOptions): Promise<RequestResult>;
/**
 * Sends an HTTP PATCH request to the specified URL.
 *
 * @param url - The target URL to send the PATCH request to
 * @param options - Optional configuration options for the request
 * @returns A Promise that resolves to the request result
 *
 * @example
 *
 * const result = await PATCH('https://api.example.com/resource', { body: { key: 'value' } });
 *
 */
declare function PATCH(url: string, options?: RequestOptions): Promise<RequestResult>;
/**
 * Sends an HTTP OPTIONS request to the specified URL.
 *
 * @param url - The target URL to send the OPTIONS request to
 * @param options - Optional configuration options for the request
 * @returns A Promise that resolves to the request result
 *
 * @example
 * ```ts
 * const result = await OPTIONS('https://api.example.com/resource');
 * ```
 */
declare function OPTIONS(url: string, options?: RequestOptions): Promise<RequestResult>;
/**
 * Sends a TRACE request to the specified URL.
 *
 * The TRACE method performs a message loop-back test along the path to the target resource.
 *
 * @param url - The URL to send the TRACE request to
 * @param options - Optional request configuration options
 * @returns A Promise that resolves to the response from the request
 * @throws {Error} If the request fails or network error occurs
 */
declare function TRACE(url: string, options?: RequestOptions): Promise<RequestResult>;
/**
 * Performs an HTTP HEAD request to the specified URL.
 *
 * @param url - The URL to send the HEAD request to
 * @param options - Optional configuration for the request
 * @returns A Promise that resolves with the response data
 *
 * @example
 * ```typescript
 * const result = await HEAD('https://api.example.com/resource');
 * ```
 */
declare function HEAD(url: string, options?: RequestOptions): Promise<RequestResult>;
/**
 * CUSTOM method allows you to specify any HTTP method.
 * @param {string} url - The URL to request
 * @param {string} method - The HTTP method (e.g. "CONNECT", "CUSTOM", etc.)
 * @param {RequestOptions} [options] - Additional options for the request
 * @returns {Promise<RequestResult>} The request result
 */
declare function CUSTOM(url: string, method: string, options?: RequestOptions): Promise<RequestResult>;

export { CUSTOM, type Config, DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT, type RequestOptions, type RequestResult, TRACE, setBearerToken, setConfig };
