/**
 * Supported HTTP methods for z-fetch requests.
 * Includes standard HTTP methods and support for custom methods.
 */
type METHODS = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "TRACE" | "HEAD" | "CUSTOM" | string;
/**
 * Utility type for making all properties of an object optional recursively.
 * Used internally for partial context updates in hooks.
 */
type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
/**
 * Hook function type for intercepting and modifying requests/responses.
 * Hooks can be synchronous or asynchronous and can return partial context updates.
 *
 * @param context - The current request/response context
 * @returns A partial context update object or void
 *
 * @example
 * ```typescript
 * const requestHook: Hook = async (context) => {
 *   // Add custom header
 *   context.setHeaders(headers => ({ ...headers, 'X-Custom': 'value' }));
 *
 *   // Or return a partial update
 *   return {
 *     request: {
 *       options: {
 *         headers: { ...context.request.options.headers, 'X-Custom': 'value' }
 *       }
 *     }
 *   };
 * };
 * ```
 */
type Hook = (context: Context) => Promise<DeepPartial<Context> | void> | DeepPartial<Context> | void;
/**
 * Context object passed to hooks containing request/response information and helper methods.
 * Provides access to configuration, request details, response data, and utility functions.
 *
 * @example
 * ```typescript
 * const onRequest: Hook = (context) => {
 *   // Access current request
 *   console.log(context.request.method, context.request.url);
 *
 *   // Use helper methods
 *   context.setHeaders(headers => ({ ...headers, 'Authorization': 'Bearer token' }));
 *   context.setBody({ timestamp: Date.now() });
 * };
 * ```
 */
type Context = {
    /** Current z-fetch configuration */
    config: Config;
    /** Request information including method, URL, and options */
    request: {
        method: METHODS;
        url: string;
        options: RequestOptions;
    };
    /** Response result (null during onRequest hook) */
    result: RequestResult | null;
    /** Error information (null if no error occurred) */
    error: {
        message: string;
        status: string | number;
    } | null;
    /** Helper method to update request headers */
    setHeaders: (updater: (headers: {
        [key: string]: string;
    }) => {
        [key: string]: string;
    } | void) => void;
    /** Helper method to update request body */
    setBody: (body: any) => void;
    /** Helper method to update request options */
    setOptions: (updater: (options: RequestOptions) => RequestOptions | void) => void;
    /** Helper method to update request URL */
    setUrl: (url: string) => void;
    /** Helper method to update request method */
    setMethod: (method: METHODS) => void;
    /** Helper method to update error information */
    setError: (error: {
        message: string;
        status: string | number;
    } | null) => void;
};
/**
 * Configuration object for z-fetch instances and requests.
 * Defines default behaviors, authentication, hooks, and other options.
 *
 * @example
 * ```typescript
 * const config: Config = {
 *   baseUrl: 'https://api.example.com',
 *   bearerToken: 'your-token',
 *   headers: { 'Content-Type': 'application/json' },
 *   throwOnError: true, // Throw errors instead of returning them
 *   mapErrors: true, // Enable error mapping for backend HTTP errors
 *   errorMapping: {
 *     401: 'Please log in',
 *     500: 'Server error'
 *   },
 *   hooks: {
 *     onRequest: (context) => {
 *       context.setHeaders(headers => ({ ...headers, 'X-Timestamp': Date.now().toString() }));
 *     },
 *     onError: (context) => {
 *       console.error('Request failed:', context.error);
 *     }
 *   },
 *   onUploadProgress: (event) => {
 *     console.log(`Upload: ${event.loaded}/${event.total}`);
 *   }
 * };
 * ```
 */
type Config = {
    /** Base URL to prepend to all request URLs */
    baseUrl: string;
    /** Bearer token for automatic Authorization header */
    bearerToken: string | null;
    /** Request timeout in milliseconds */
    timeout: number;
    /** Whether to enable automatic retries on failure */
    retry: boolean;
    /** Maximum number of retry attempts */
    maxRetries: number;
    /** Whether to start polling immediately after request */
    startPolling: boolean;
    /** Whether to stop any active polling */
    stopPolling: boolean;
    /** Interval between polling requests in milliseconds */
    pollingInterval: number;
    /** Cache revalidation interval in milliseconds */
    revalidateCache: number;
    /** Whether to include credentials in requests */
    withCredentials: boolean;
    /** Whether to enable response caching for GET requests */
    withCache: boolean;
    /** Whether to automatically parse JSON responses */
    parseJson: boolean;
    /** Whether to automatically stringify request payload */
    stringifyPayload: boolean;
    /** CORS mode for the request */
    mode: RequestMode;
    /** Default headers to include with all requests */
    headers: {
        [key: string]: string;
    };
    /** Hook functions for request/response/error interception */
    hooks: {
        /** Called before sending the request */
        onRequest?: Hook;
        /** Called after receiving the response */
        onResponse?: Hook;
        /** Called when an error occurs */
        onError?: Hook;
    };
    /** Mapping of status codes/patterns to custom error messages */
    errorMapping?: {
        [statusCode: number]: string;
        [statusPattern: string]: string;
    };
    /** Whether to apply error mapping to backend HTTP errors (400s, 500s). Default: false (only maps z-fetch internal errors) */
    mapErrors: boolean;
    /** Whether to throw errors instead of returning them in result.error */
    throwOnError: boolean;
    /** Callback for upload progress tracking */
    onUploadProgress?: (event: ProgressEvent) => void;
    /** Callback for download progress tracking */
    onDownloadProgress?: (event: ProgressEvent) => void;
    /** Force XMLHttpRequest when progress callbacks are provided */
    useXHRForProgress?: boolean;
};
/**
 * Result object returned by z-fetch requests containing response data and utility methods.
 * Provides access to response data, error information, and various control methods.
 *
 * @example
 * ```typescript
 * const result = await api.get('/users');
 *
 * if (result.error) {
 *   console.error('Request failed:', result.error.message);
 * } else {
 *   console.log('Users:', result.data);
 *
 *   // Stream response data
 *   const text = await result.streamToString();
 *
 *   // Start polling for updates
 *   result.onPollDataReceived((newResult) => {
 *     console.log('Updated data:', newResult.data);
 *   });
 *   result.startPolling(5000);
 * }
 * ```
 */
type RequestResult = {
    /** Whether the request is currently loading */
    loading: boolean;
    /** Error information if the request failed */
    error: {
        message: string;
        status: string | number;
    } | null;
    /** Response data (parsed JSON or raw text based on parseJson config) */
    data: any;
    /** Raw Response object from fetch API */
    response: Response | null;
    /** Method to refetch the same request */
    refetch: (callback: (result: RequestResult) => void) => Promise<any>;
    /** Method to cancel the ongoing request */
    cancelRequest: () => void;
    /** Method to start polling for updates */
    startPolling: (interval?: number) => void;
    /** Method to stop active polling */
    stopPolling: () => void;
    /** Method to set callback for polling data updates */
    onPollDataReceived: (callback: (result: RequestResult) => void) => void;
    /** Stream response body as string */
    streamToString?: () => Promise<string>;
    /** Stream response body as Blob */
    streamToBlob?: () => Promise<Blob>;
    /** Stream response body as ArrayBuffer */
    streamToArrayBuffer?: () => Promise<ArrayBuffer>;
    /** Stream response body chunk by chunk */
    streamChunks?: (callback: (chunk: Uint8Array) => void) => Promise<void>;
};
/** Cancelable promise type for early cancellation */
type CancelablePromise<T> = Promise<T> & {
    cancel: () => void;
};
/**
 * Request options for z-fetch requests.
 * Extends standard RequestInit while allowing object bodies and partial Config options.
 *
 * @example
 * ```typescript
 * const options: RequestOptions = {
 *   body: { name: 'John', age: 30 }, // Will be JSON.stringify'd if stringifyPayload is true
 *   headers: { 'X-Custom': 'value' },
 *   timeout: 10000,
 *   bearerToken: 'override-token',
 *   onUploadProgress: (event) => console.log(`Progress: ${event.loaded}/${event.total}`)
 * };
 *
 * const result = await api.post('/users', options);
 * ```
 */
type RequestOptions = Omit<RequestInit, "body"> & {
    /** Request body - can be object (will be stringified), string, or any BodyInit */
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
declare function GET(url: string, options?: RequestOptions): CancelablePromise<RequestResult>;
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
declare function POST(url: string, options?: RequestOptions): CancelablePromise<RequestResult>;
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
declare function PUT(url: string, options?: RequestOptions): CancelablePromise<RequestResult>;
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
declare function DELETE(url: string, options?: RequestOptions): CancelablePromise<RequestResult>;
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
declare function PATCH(url: string, options?: RequestOptions): CancelablePromise<RequestResult>;
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
declare function OPTIONS(url: string, options?: RequestOptions): CancelablePromise<RequestResult>;
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
declare function TRACE(url: string, options?: RequestOptions): CancelablePromise<RequestResult>;
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
declare function HEAD(url: string, options?: RequestOptions): CancelablePromise<RequestResult>;
/**
 * CUSTOM method allows you to specify any HTTP method.
 * @param {string} url - The URL to request
 * @param {string} method - The HTTP method (e.g. "CONNECT", "CUSTOM", etc.)
 * @param {RequestOptions} [options] - Additional options for the request
 * @returns {Promise<RequestResult>} The request result
 */
declare function CUSTOM(url: string, method: string, options?: RequestOptions): CancelablePromise<RequestResult>;
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
    get: (url: string, options?: RequestOptions) => CancelablePromise<RequestResult>;
    post: (url: string, options?: RequestOptions) => CancelablePromise<RequestResult>;
    put: (url: string, options?: RequestOptions) => CancelablePromise<RequestResult>;
    delete: (url: string, options?: RequestOptions) => CancelablePromise<RequestResult>;
    patch: (url: string, options?: RequestOptions) => CancelablePromise<RequestResult>;
    options: (url: string, options?: RequestOptions) => CancelablePromise<RequestResult>;
    trace: (url: string, options?: RequestOptions) => CancelablePromise<RequestResult>;
    head: (url: string, options?: RequestOptions) => CancelablePromise<RequestResult>;
    custom: (url: string, method: string, options?: RequestOptions) => CancelablePromise<RequestResult>;
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
                /** Called before sending the request */
                onRequest?: Hook;
                /** Called after receiving the response */
                onResponse?: Hook;
                /** Called when an error occurs */
                onError?: Hook;
            };
            errorMapping?: {
                [statusCode: number]: string;
                [statusPattern: string]: string;
            };
            mapErrors: boolean;
            throwOnError: boolean;
            onUploadProgress?: (event: ProgressEvent) => void;
            onDownloadProgress?: (event: ProgressEvent) => void;
            useXHRForProgress?: boolean;
        };
        setBearerToken: (token: string) => void;
    };
};

export { CUSTOM, type CancelablePromise, type Config, type Context, DELETE, GET, HEAD, type Hook, type METHODS, OPTIONS, PATCH, POST, PUT, type RequestOptions, type RequestResult, TRACE, createInstance };
