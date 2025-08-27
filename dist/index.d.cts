type METHODS = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "TRACE" | "HEAD" | "CUSTOM" | string;
type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
type Hook = (context: Context) => Promise<DeepPartial<Context> | void> | DeepPartial<Context> | void;
type Context = {
    config: Config;
    request: {
        method: METHODS;
        url: string;
        options: RequestOptions;
    };
    result: RequestResult | null;
    setHeaders: (updater: (headers: {
        [key: string]: string;
    }) => {
        [key: string]: string;
    } | void) => void;
    setBody: (body: any) => void;
    setOptions: (updater: (options: RequestOptions) => RequestOptions | void) => void;
    setUrl: (url: string) => void;
    setMethod: (method: METHODS) => void;
};
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
    hooks: {
        onRequest?: Hook;
        onResponse?: Hook;
    };
    errorMapping?: {
        [statusCode: number]: string;
        [statusPattern: string]: string;
    };
    onUploadProgress?: (event: ProgressEvent) => void;
    onDownloadProgress?: (event: ProgressEvent) => void;
    useXHRForProgress?: boolean;
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
    streamToString?: () => Promise<string>;
    streamToBlob?: () => Promise<Blob>;
    streamToArrayBuffer?: () => Promise<ArrayBuffer>;
    streamChunks?: (callback: (chunk: Uint8Array) => void) => Promise<void>;
};
type RequestOptions = Omit<RequestInit, "body"> & {
    body?: BodyInit | object | null;
} & Partial<Config>;
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
/**
 * Creates a new Z-Fetch instance with custom configuration.
 *
 * @param instanceConfig - Optional configuration object to override default settings
 * @returns An object containing HTTP methods (get, post, etc.) and helper utilities
 *
 * @example
 * ```typescript
 * // Create a new instance with custom config
 * const api = createInstance({
 *   baseUrl: 'https://api.example.com',
 *   headers: { 'Content-Type': 'application/json' },
 *   hooks: {
 *     // Modify request before sending
 *     onRequest: (context) => {
 *       context.request.options.headers['X-Custom-Header'] = 'value';
 *       return context;
 *     },
 *
 *     // Modify response after receiving
 *     onResponse: (context) => {
 *       context.result.data = {
 *         ...context.result.data,
 *         customData: 'value'
 *       };
 *       return context;
 *     }
 *   }
 * });
 *
 * // Make HTTP requests
 * const data = await api.get('/users');
 *
 * // Use Helpers, eg. access instance configuration
 * const config = api.helpers.getConfig();
 * ```
 */
declare function createInstance(instanceConfig?: Partial<Config>): {
    get: (url: string, options?: RequestOptions) => Promise<RequestResult>;
    post: (url: string, options?: RequestOptions) => Promise<RequestResult>;
    put: (url: string, options?: RequestOptions) => Promise<RequestResult>;
    delete: (url: string, options?: RequestOptions) => Promise<RequestResult>;
    patch: (url: string, options?: RequestOptions) => Promise<RequestResult>;
    options: (url: string, options?: RequestOptions) => Promise<RequestResult>;
    trace: (url: string, options?: RequestOptions) => Promise<RequestResult>;
    head: (url: string, options?: RequestOptions) => Promise<RequestResult>;
    custom: (url: string, method: string, options?: RequestOptions) => Promise<RequestResult>;
    helpers: {
        getConfig: () => {
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
            hooks: {
                onRequest?: Hook;
                onResponse?: Hook;
            };
            errorMapping?: {
                [statusCode: number]: string;
                [statusPattern: string]: string;
            };
            onUploadProgress?: (event: ProgressEvent) => void;
            onDownloadProgress?: (event: ProgressEvent) => void;
            useXHRForProgress?: boolean;
        };
        setBearerToken: (token: string) => void;
    };
};

export { CUSTOM, type Config, type Context, DELETE, GET, HEAD, type Hook, type METHODS, OPTIONS, PATCH, POST, PUT, type RequestOptions, type RequestResult, TRACE, createInstance };
