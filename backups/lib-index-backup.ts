/**
 * Supported HTTP methods for z-fetch requests.
 * Includes standard HTTP methods and support for custom methods.
 */
export type METHODS =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "OPTIONS"
  | "TRACE"
  | "HEAD"
  | "CUSTOM"
  | string;

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
export type Hook = (
  context: Context,
) => Promise<DeepPartial<Context> | void> | DeepPartial<Context> | void;

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
export type Context = {
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
  error: { message: string; status: string | number } | null;

  // Helper methods for easier manipulation
  /** Helper method to update request headers */
  setHeaders: (
    updater: (headers: {
      [key: string]: string;
    }) => { [key: string]: string } | void,
  ) => void;
  /** Helper method to update request body */
  setBody: (body: any) => void;
  /** Helper method to update request options */
  setOptions: (
    updater: (options: RequestOptions) => RequestOptions | void,
  ) => void;
  /** Helper method to update request URL */
  setUrl: (url: string) => void;
  /** Helper method to update request method */
  setMethod: (method: METHODS) => void;
  /** Helper method to update error information */
  setError: (
    error: { message: string; status: string | number } | null,
  ) => void;
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
export type Config = {
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
  headers: { [key: string]: string };
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
export type RequestResult = {
  /** Whether the request is currently loading */
  loading: boolean;
  /** Error information if the request failed */
  error: { message: string; status: string | number } | null;
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

  // Streaming utilities
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
export type CancelablePromise<T> = Promise<T> & { cancel: () => void };

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
export type RequestOptions = Omit<RequestInit, "body"> & {
  /** Request body - can be object (will be stringified), string, or any BodyInit */
  body?: BodyInit | object | null;
} & Partial<Config>;

/**
 * Default configuration object for z-fetch.
 * Provides sensible defaults for all configuration options.
 * Can be overridden globally or per-instance.
 *
 * @example
 * ```typescript
 * // Global config override
 * Object.assign(defaultConfig, {
 *   baseUrl: 'https://api.myapp.com',
 *   timeout: 60000
 * });
 *
 * // Or use createInstance for per-instance config
 * const api = createInstance({
 *   ...defaultConfig,
 *   bearerToken: 'my-token'
 * });
 * ```
 */
export const defaultConfig: Config = {
  baseUrl: "",
  bearerToken: null,
  timeout: 90000,
  retry: false,
  maxRetries: 3,
  startPolling: false,
  stopPolling: false,
  pollingInterval: 5000,
  revalidateCache: 10000,
  withCredentials: false,
  withCache: true,
  parseJson: true,
  stringifyPayload: true,
  mode: "cors",
  headers: {
    "Content-Type": "application/json",
    Accept: "*/*",
  },
  hooks: {},
  errorMapping: {},
  useXHRForProgress: false,
};

let config: Config = { ...defaultConfig };

/**
 * Internal cache for storing GET request results.
 * Used when withCache is enabled to avoid duplicate requests.
 */
const cache: Map<string, RequestResult> = new Map();

/**
 * Performs HTTP request using XMLHttpRequest for progress tracking support.
 * Used internally when upload/download progress callbacks are provided.
 *
 * @param url - The request URL
 * @param method - HTTP method to use
 * @param options - Request options and configuration
 * @param context - Additional context for error handling
 * @returns Promise resolving to basic request result
 *
 * @internal
 */
async function requestWithProgress(
  url: string,
  method: METHODS,
  options: RequestOptions = { ...defaultConfig },
  context?: { config: Config; onError?: Hook },
  signal?: AbortSignal,
): Promise<{
  loading: boolean;
  error: { message: string; status: string | number } | null;
  data: any;
  response: Response | null;
}> {
  return new Promise((resolve, reject) => {
    const mergedConfig = { ...config, ...options };
    let fullUrl = mergedConfig.baseUrl ? mergedConfig.baseUrl + url : url;

    const xhr = new XMLHttpRequest();

    // Handle cancellation
    if (signal) {
      signal.addEventListener("abort", () => {
        xhr.abort();
      });
    }

    // Setup upload progress tracking
    if (mergedConfig.onUploadProgress && xhr.upload) {
      xhr.upload.addEventListener("progress", mergedConfig.onUploadProgress);
    }

    // Setup download progress tracking
    if (mergedConfig.onDownloadProgress) {
      xhr.addEventListener("progress", mergedConfig.onDownloadProgress);
    }

    const handleError = async (error: {
      message: string;
      status: string | number;
    }) => {
      if (context?.onError && context.config) {
        const errorContext = {
          config: context.config,
          request: {
            method,
            url,
            options: mergedConfig,
          },
          result: null,
          error,
          setHeaders: () => {},
          setBody: () => {},
          setOptions: () => {},
          setUrl: () => {},
          setMethod: () => {},
          setError: (
            newError: { message: string; status: string | number } | null,
          ) => {
            error = newError || error;
          },
        };

        const patch = await context.onError(errorContext);
        if (patch?.error !== undefined) {
          error = patch.error || error;
        }
      }
      return error;
    };

    xhr.addEventListener("loadend", async () => {
      let error: { message: string; status: string | number } | null = null;
      let data: any = null;
      let response: Response | null = null;

      // Try to parse response data regardless of status (like native fetch)
      try {
        data = mergedConfig.parseJson
          ? JSON.parse(xhr.responseText)
          : xhr.responseText;
      } catch {
        // If parsing fails, leave data as null
        data = null;
      }

      // Create a mock Response object for compatibility
      const isOk = xhr.status >= 200 && xhr.status < 300;
      response = {
        ok: isOk,
        status: xhr.status,
        statusText: xhr.statusText,
        url: fullUrl,
        headers: new Headers(),
        json: async () =>
          mergedConfig.parseJson
            ? JSON.parse(xhr.responseText)
            : xhr.responseText,
        text: async () => xhr.responseText,
        blob: async () => new Blob([xhr.response]),
        arrayBuffer: async () => xhr.response as any,
        formData: async () => new FormData(),
        body: null,
        bodyUsed: false,
        clone: function () {
          return this;
        },
        type: "basic",
        redirected: false,
      } as Response;

      // Always handle HTTP errors (non-2xx responses)
      if (!isOk) {
        const originalMessage = xhr.statusText || "Request failed";
        let mappedMessage = originalMessage;

        // Apply error mapping to backend errors if errorMapping is provided
        if (mergedConfig.errorMapping) {
          // Check for exact status code match
          if (mergedConfig.errorMapping[xhr.status]) {
            mappedMessage = mergedConfig.errorMapping[xhr.status];
          } else {
            // Check for pattern matches
            for (const [pattern, message] of Object.entries(
              mergedConfig.errorMapping,
            )) {
              if (typeof pattern === "string") {
                if (pattern === xhr.status.toString()) {
                  mappedMessage = message;
                  break;
                }
                if (
                  originalMessage
                    .toLowerCase()
                    .includes(pattern.toLowerCase()) ||
                  xhr.status.toString().includes(pattern)
                ) {
                  mappedMessage = message;
                  break;
                }
              }
            }
          }
        }

        error = { message: mappedMessage, status: xhr.status };
        error = await handleError(error);
      }

      resolve({ loading: false, error, data, response });
    });

    xhr.addEventListener("error", async () => {
      let mappedMessage = "Network error";

      // Apply error mapping for network errors if configured
      if (mergedConfig.errorMapping) {
        for (const [pattern, message] of Object.entries(
          mergedConfig.errorMapping,
        )) {
          if (typeof pattern === "string") {
            if (
              pattern.toLowerCase() === "network_error" ||
              pattern.toLowerCase() === "fetch failed"
            ) {
              mappedMessage = message;
              break;
            }
          }
        }
      }

      let error: { message: string; status: string | number } = {
        message: mappedMessage,
        status: "NETWORK_ERROR",
      };
      const handledError = await handleError(error);
      error = handledError || error;

      resolve({
        loading: false,
        error,
        data: null,
        response: null,
      });
    });

    xhr.addEventListener("timeout", async () => {
      let error: { message: string; status: string | number } = {
        message: "Request timed out!",
        status: "TIMEOUT",
      };
      const handledError = await handleError(error);
      error = handledError || error;

      resolve({
        loading: false,
        error,
        data: null,
        response: null,
      });
    });

    xhr.addEventListener("abort", async () => {
      let error: { message: string; status: string | number } = {
        message: "Request canceled",
        status: "CANCELED",
      };
      const handledError = await handleError(error);
      error = handledError || error;

      resolve({
        loading: false,
        error,
        data: null,
        response: null,
      });
    });

    // Setup the request
    xhr.open(method, fullUrl);
    xhr.timeout = mergedConfig.timeout;

    // Set headers
    const headers = { ...config.headers, ...(options.headers || {}) };
    if (mergedConfig.bearerToken && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${mergedConfig.bearerToken}`;
    }

    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, String(value));
    });

    // Set credentials
    if (mergedConfig.withCredentials) {
      xhr.withCredentials = true;
    }

    // Send the request
    let body: any = null;
    if (mergedConfig.body !== undefined) {
      if (typeof mergedConfig.body === "object" && mergedConfig.body !== null) {
        body = mergedConfig.stringifyPayload
          ? JSON.stringify(mergedConfig.body)
          : mergedConfig.body;
      } else {
        body = mergedConfig.body;
      }
    }

    xhr.send(body);
  });
}

/**
 * Core request function that handles HTTP requests using fetch API or XMLHttpRequest.
 * Provides comprehensive error handling, retries, caching, polling, and streaming support.
 * Automatically switches to XMLHttpRequest when progress tracking is needed.
 *
 * @param url - The request URL (can be relative if baseUrl is configured)
 * @param method - HTTP method to use
 * @param options - Request options and configuration overrides
 * @returns Promise resolving to RequestResult with response data and utilities
 *
 * @internal
 */
function request(
  url: string,
  method: METHODS,
  options: RequestOptions = { ...defaultConfig },
): CancelablePromise<RequestResult> {
  const abortController = new AbortController();
  const { signal } = abortController;

  // Merge configuration properly
  const mergedConfig = { ...config, ...options };
  let fullUrl = mergedConfig.baseUrl ? mergedConfig.baseUrl + url : url;

  // Check if we should use XMLHttpRequest for progress tracking
  const shouldUseXHR =
    mergedConfig.useXHRForProgress ||
    mergedConfig.onUploadProgress ||
    mergedConfig.onDownloadProgress;

  let pollingIntervalId: any | null = null;
  let pollCallback: ((result: RequestResult) => void) | null = null;

  const cancelRequest = (): void => {
    abortController.abort();
  };

  const promise = new Promise<RequestResult>(async (resolve, reject) => {
    let loading = true;
    let error: { message: string; status: string | number } | null = null;
    let data: any = null;
    let retryCount = 0;
    let timedOut = false;

    const handleError = async (errObj: {
      message: string;
      status: string | number;
    }) => {
      if (mergedConfig.hooks?.onError) {
        const errorContext = {
          config: mergedConfig,
          request: {
            method,
            url,
            options: mergedConfig,
          },
          result: null,
          error: errObj,
          setHeaders: () => {},
          setBody: () => {},
          setOptions: () => {},
          setUrl: () => {},
          setMethod: () => {},
          setError: (
            newError: { message: string; status: string | number } | null,
          ) => {
            errObj = newError || errObj;
          },
        };
        const patch = await mergedConfig.hooks.onError(errorContext);
        if (patch?.error !== undefined) {
          errObj = patch.error || errObj;
        }
      }
      return errObj;
    };

    const performRequest = async (): Promise<{
      loading: boolean;
      error: typeof error;
      data: any;
      response: Response | null;
    }> => {
      // Use XMLHttpRequest if progress tracking is needed
      if (shouldUseXHR) {
        const xhrResult = await requestWithProgress(
          url,
          method,
          options,
          {
            config: mergedConfig,
            onError: mergedConfig.hooks?.onError,
          },
          signal,
        );
        return xhrResult;
      }

      try {
        // Handle bearerToken option - but don't override explicit Authorization header
        const headers = { ...config.headers, ...(options.headers || {}) };
        if (mergedConfig.bearerToken && !headers["Authorization"]) {
          headers["Authorization"] = `Bearer ${mergedConfig.bearerToken}`;
        }

        // Only pass valid fetch options, excluding z-fetch specific config
        let fetchOptions: RequestInit = {
          signal,
          method,
          headers,
        };

        // Add valid fetch options from merged config
        if (mergedConfig.body !== undefined) {
          if (
            typeof mergedConfig.body === "object" &&
            mergedConfig.body !== null
          ) {
            fetchOptions.body = mergedConfig.stringifyPayload
              ? JSON.stringify(mergedConfig.body)
              : (mergedConfig.body as BodyInit);
          } else {
            fetchOptions.body = mergedConfig.body as BodyInit;
          }
        }
        if (mergedConfig.cache !== undefined)
          fetchOptions.cache = mergedConfig.cache;
        if (mergedConfig.credentials !== undefined)
          fetchOptions.credentials = mergedConfig.credentials;
        if (mergedConfig.withCredentials) fetchOptions.credentials = "include";
        if (mergedConfig.integrity !== undefined)
          fetchOptions.integrity = mergedConfig.integrity;
        if (mergedConfig.keepalive !== undefined)
          fetchOptions.keepalive = mergedConfig.keepalive;
        if (mergedConfig.mode !== undefined)
          fetchOptions.mode = mergedConfig.mode;
        if (mergedConfig.redirect !== undefined)
          fetchOptions.redirect = mergedConfig.redirect;
        if (mergedConfig.referrer !== undefined)
          fetchOptions.referrer = mergedConfig.referrer;
        if (mergedConfig.referrerPolicy !== undefined)
          fetchOptions.referrerPolicy = mergedConfig.referrerPolicy;

        if (options.baseUrl) {
          fullUrl = options.baseUrl + url;
        }

        const timeoutId = setTimeout(() => {
          timedOut = true;
          abortController.abort();
        }, mergedConfig.timeout);

        const response = await fetch(fullUrl, fetchOptions);
        clearTimeout(timeoutId);

        // Always handle HTTP errors (non-2xx responses)
        if (!response.ok) {
          const originalMessage = response.statusText || "Request failed";
          let mappedMessage = originalMessage;

          // Apply error mapping to backend errors if errorMapping is provided
          if (mergedConfig.errorMapping) {
            // Check for exact status code match
            if (mergedConfig.errorMapping[response.status]) {
              mappedMessage = mergedConfig.errorMapping[response.status];
            } else {
              // Check for pattern matches
              for (const [pattern, message] of Object.entries(
                mergedConfig.errorMapping,
              )) {
                if (typeof pattern === "string") {
                  // Check if status code matches pattern
                  if (pattern === response.status.toString()) {
                    mappedMessage = message;
                    break;
                  }
                  // Check if original message contains pattern (case insensitive)
                  if (
                    originalMessage
                      .toLowerCase()
                      .includes(pattern.toLowerCase()) ||
                    response.status.toString().includes(pattern)
                  ) {
                    mappedMessage = message;
                    break;
                  }
                }
              }
            }
          }

          error = { message: mappedMessage, status: response.status };
          error = await handleError(error);
        } else {
          // Clear error on success
          error = null;
        }

        // Always try to parse response data (like native fetch)
        // Clone response for data extraction to preserve body for streaming utilities
        // Note: Check for clone function to handle mock Response objects in tests
        try {
          const responseForData =
            typeof response.clone === "function" ? response.clone() : response;
          data = mergedConfig.parseJson
            ? await responseForData.json()
            : await responseForData.text();
        } catch {
          // If parsing fails (e.g., empty response), leave data as null
          data = null;
        }

        loading = false;
        return { loading, error, data, response };
      } catch (err: any) {
        let status: string | number = "NETWORK_ERROR";
        let message: string = err?.message || "Network error";

        if (signal.aborted) {
          if (timedOut) {
            message = "Request timed out!";
            status = "TIMEOUT";
          } else {
            message = "Request canceled";
            status = "CANCELED";
          }
        }

        // Apply error mapping for network errors if configured (skip for cancel/timeout)
        if (
          status === "NETWORK_ERROR" &&
          mergedConfig.errorMapping &&
          typeof message === "string"
        ) {
          for (const [pattern, mapped] of Object.entries(
            mergedConfig.errorMapping,
          )) {
            if (typeof pattern === "string") {
              if (
                message.toLowerCase().includes(pattern.toLowerCase()) ||
                pattern.toLowerCase() === "network_error" ||
                pattern.toLowerCase() === "fetch failed"
              ) {
                message = mapped;
                break;
              }
            }
          }
        }

        let errObj = { message, status } as {
          message: string;
          status: string | number;
        };
        errObj = (await handleError(errObj)) || errObj;
        loading = false;
        return { loading, error: errObj, data, response: null };
      }
    };

    const refetch = async (
      callback: (result: RequestResult) => void,
    ): Promise<any> => {
      const newData = await performRequest();
      return callback({
        ...newData,
        refetch,
        cancelRequest,
        startPolling,
        stopPolling,
        onPollDataReceived,
      });
    };

    const stopPolling = (): void => {
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
        pollingIntervalId = null;
      }
    };

    const onPollDataReceived = (
      callback: (result: RequestResult) => void,
    ): void => {
      if (typeof callback !== "function") {
        throw new Error("onPollDataReceived callback must be a function");
      }
      pollCallback = callback;
      // Start polling if it was requested but delayed due to missing callback
      if (mergedConfig.startPolling && !pollingIntervalId) {
        startPolling();
      }
    };

    const startPolling = (
      interval: number = mergedConfig.pollingInterval,
    ): void => {
      if (!pollCallback) {
        // eslint-disable-next-line no-console
        console.warn(
          "Polling not started: onPollDataReceived callback not set",
        );
        return;
      }
      if (pollingIntervalId) {
        stopPolling(); // Clear existing interval if any
      }
      pollingIntervalId = setInterval(async () => {
        try {
          const newResult = await performRequest();
          pollCallback!(newResult as RequestResult);
          Object.assign(result, newResult);
        } catch (pollError) {
          // eslint-disable-next-line no-console
          console.error("Polling error:", pollError);
        }
      }, interval);
    };

    // Placeholder for result to support streaming utils referencing latest response
    let result = await performRequest();

    while (
      mergedConfig.retry &&
      retryCount < mergedConfig.maxRetries &&
      result.error
    ) {
      retryCount++;
      result = await performRequest();
    }

    // Streaming utility functions
    const streamToString = async (): Promise<string> => {
      if (!result.response) {
        throw new Error("No response available for streaming");
      }
      if (typeof result.response.text !== "function") {
        throw new Error("No response body available for streaming");
      }
      try {
        return await result.response.text();
      } catch {
        throw new Error("Failed to read response as text");
      }
    };

    const streamToBlob = async (): Promise<Blob> => {
      if (!result.response) {
        throw new Error("No response available for streaming");
      }
      if (typeof result.response.blob !== "function") {
        throw new Error("No response body available for streaming");
      }
      try {
        return await result.response.blob();
      } catch {
        throw new Error("Failed to read response as blob");
      }
    };

    const streamToArrayBuffer = async (): Promise<ArrayBuffer> => {
      if (!result.response) {
        throw new Error("No response available for streaming");
      }
      if (typeof result.response.arrayBuffer !== "function") {
        throw new Error("No response body available for streaming");
      }
      try {
        return await result.response.arrayBuffer();
      } catch {
        throw new Error("Failed to read response as array buffer");
      }
    };

    const streamChunks = async (
      callback: (chunk: Uint8Array) => void,
    ): Promise<void> => {
      if (!result.response) {
        throw new Error("No response available for streaming");
      }
      if (!result.response.body) {
        throw new Error("No response body available for streaming");
      }

      try {
        const reader = result.response.body.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            callback(value);
          }
        } finally {
          reader.releaseLock();
        }
      } catch {
        throw new Error("Failed to read response stream");
      }
    };

    const cacheKey = `${method}:${fullUrl}`;

    // If we have a cached GET, return it immediately and schedule revalidation
    if (mergedConfig.withCache && method === "GET" && cache.has(cacheKey)) {
      setTimeout(() => {
        performRequest().then((newResult) => {
          // Only cache successful responses (check response.ok, not just !error)
          if (newResult.response?.ok) {
            cache.set(cacheKey, {
              ...newResult,
              refetch,
              cancelRequest,
              startPolling,
              stopPolling,
              onPollDataReceived,
            });
          }
        });
      }, mergedConfig.revalidateCache);

      const cachedResult = cache.get(cacheKey)!;
      resolve(cachedResult);
      return;
    }

    // Cache successful GET requests (only when response.ok is true, not just when there's no error object)
    if (mergedConfig.withCache && method === "GET" && result.response?.ok) {
      cache.set(cacheKey, {
        ...result,
        refetch,
        cancelRequest,
        startPolling,
        stopPolling,
        onPollDataReceived,
        streamToString,
        streamToBlob,
        streamToArrayBuffer,
        streamChunks,
      });
    }

    resolve({
      ...result,
      refetch,
      cancelRequest,
      startPolling,
      stopPolling,
      onPollDataReceived,
      streamToString,
      streamToBlob,
      streamToArrayBuffer,
      streamChunks,
    });
  }) as CancelablePromise<RequestResult>;

  (promise as CancelablePromise<RequestResult>).cancel = cancelRequest;
  return promise;
}

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
export function GET(
  url: string,
  options?: RequestOptions,
): CancelablePromise<RequestResult> {
  return request(url, "GET", options);
}

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
export function POST(
  url: string,
  options?: RequestOptions,
): CancelablePromise<RequestResult> {
  return request(url, "POST", options);
}

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
export function PUT(
  url: string,
  options?: RequestOptions,
): CancelablePromise<RequestResult> {
  return request(url, "PUT", options);
}

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
export function DELETE(
  url: string,
  options?: RequestOptions,
): CancelablePromise<RequestResult> {
  return request(url, "DELETE", options);
}

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
export function PATCH(
  url: string,
  options?: RequestOptions,
): CancelablePromise<RequestResult> {
  return request(url, "PATCH", options);
}

// Additional HTTP methods

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
export function OPTIONS(
  url: string,
  options?: RequestOptions,
): CancelablePromise<RequestResult> {
  return request(url, "OPTIONS", options);
}

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
export function TRACE(
  url: string,
  options?: RequestOptions,
): CancelablePromise<RequestResult> {
  return request(url, "TRACE", options);
}

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
export function HEAD(
  url: string,
  options?: RequestOptions,
): CancelablePromise<RequestResult> {
  return request(url, "HEAD", options);
}

/**
 * CUSTOM method allows you to specify any HTTP method.
 * @param {string} url - The URL to request
 * @param {string} method - The HTTP method (e.g. "CONNECT", "CUSTOM", etc.)
 * @param {RequestOptions} [options] - Additional options for the request
 * @returns {Promise<RequestResult>} The request result
 */
export function CUSTOM(
  url: string,
  method: string,
  options?: RequestOptions,
): CancelablePromise<RequestResult> {
  return request(url, method as METHODS, options);
}

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
export function createInstance(instanceConfig: Partial<Config> = {}) {
  const instanceConfigWithDefaults = { ...defaultConfig, ...instanceConfig };
  const { onRequest, onResponse, onError } =
    instanceConfigWithDefaults.hooks || {};

  const interceptor = (
    method: METHODS,
    url: string,
    options: RequestOptions,
  ): CancelablePromise<RequestResult> => {
    let context: Context = {
      config: instanceConfigWithDefaults,
      request: {
        method,
        url,
        options: {
          ...instanceConfigWithDefaults,
          ...options,
          headers: {
            ...instanceConfigWithDefaults.headers,
            ...(options.headers || {}),
          },
        },
      },
      result: null,
      error: null,
      // Helper methods for easier manipulation
      setHeaders: (
        updater: (headers: {
          [key: string]: string;
        }) => { [key: string]: string } | void,
      ) => {
        const currentHeaders = context.request.options.headers || {};
        const result = updater(currentHeaders);
        if (result) {
          context.request.options.headers = result;
        }
      },
      setBody: (body: any) => {
        context.request.options.body = body;
      },
      setOptions: (
        updater: (options: RequestOptions) => RequestOptions | void,
      ) => {
        const result = updater(context.request.options);
        if (result) {
          context.request.options = result;
        }
      },
      setUrl: (url: string) => {
        context.request.url = url;
      },
      setMethod: (method: METHODS) => {
        context.request.method = method;
      },
      setError: (
        error: { message: string; status: string | number } | null,
      ) => {
        context.error = error;
      },
    };

    const applyPatch = (original: Context, patch?: DeepPartial<Context>) => {
      if (!patch) return original;
      const updated = {
        ...original,
        ...patch,
        request: {
          ...original.request,
          ...patch.request,
          options: {
            ...original.request.options,
            ...patch.request?.options,
            headers: {
              ...original.request.options.headers,
              ...(patch.request?.options?.headers || {}),
            },
          },
        },
        result: patch.result ?? original.result,
        error: patch.error ?? original.error,
        // Preserve helper methods
        setHeaders: original.setHeaders,
        setBody: original.setBody,
        setOptions: original.setOptions,
        setUrl: original.setUrl,
        setMethod: original.setMethod,
        setError: original.setError,
      } as Context;

      // Update the helper methods to work with the new context
      updated.setHeaders = (
        updater: (headers: {
          [key: string]: string;
        }) => { [key: string]: string } | void,
      ) => {
        const currentHeaders = updated.request.options.headers || {};
        const result = updater(currentHeaders);
        if (result) {
          updated.request.options.headers = result;
        }
      };
      updated.setBody = (body: any) => {
        updated.request.options.body = body;
      };
      updated.setOptions = (
        updater: (options: RequestOptions) => RequestOptions | void,
      ) => {
        const result = updater(updated.request.options);
        if (result) {
          updated.request.options = result;
        }
      };
      updated.setUrl = (url: string) => {
        updated.request.url = url;
      };
      updated.setMethod = (method: METHODS) => {
        updated.request.method = method;
      };
      updated.setError = (
        error: { message: string; status: string | number } | null,
      ) => {
        updated.error = error;
      };

      return updated;
    };

    let basePromise: CancelablePromise<RequestResult> | null = null;

    const runner = async (): Promise<RequestResult> => {
      if (onRequest) {
        const patch = await onRequest(context);
        if (patch) {
          context = applyPatch(context, patch);
        }
      }

      basePromise = request(context.request.url, context.request.method, {
        ...context.request.options,
        hooks: { onError },
      });

      const result = await basePromise;
      context.result = result;

      if (onResponse) {
        const patch = await onResponse(context);
        if (patch) {
          context = applyPatch(context, patch);
        }
      }

      return context.result!;
    };

    const promise = new Promise<RequestResult>(async (resolve, reject) => {
      try {
        const res = await runner();
        resolve(res);
      } catch (error) {
        reject(error);
      }
    }) as CancelablePromise<RequestResult>;

    promise.cancel = () => {
      basePromise?.cancel();
    };

    return promise;
  };

  const createMethod = (method: METHODS) => {
    return (url: string, options?: RequestOptions) =>
      interceptor(method, url, options || {});
  };

  const get = createMethod("GET");
  const post = createMethod("POST");
  const put = createMethod("PUT");
  const delete_ = createMethod("DELETE");
  const patch = createMethod("PATCH");
  const options_ = createMethod("OPTIONS");
  const trace = createMethod("TRACE");
  const head = createMethod("HEAD");
  const custom = (url: string, method: string, options?: RequestOptions) =>
    interceptor(method as METHODS, url, options || {});
  const setBearerToken = (token: string) => {
    instanceConfigWithDefaults.bearerToken = token;
    instanceConfigWithDefaults.headers["Authorization"] = `Bearer ${token}`;
  };

  return {
    get,
    post,
    put,
    delete: delete_,
    patch,
    options: options_,
    trace,
    head,
    custom,
    helpers: {
      getConfig: () => instanceConfigWithDefaults,
      setBearerToken,
    },
  };
}
