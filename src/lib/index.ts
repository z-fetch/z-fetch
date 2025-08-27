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

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Hook = (
  context: Context,
) => Promise<DeepPartial<Context> | void> | DeepPartial<Context> | void;

export type Context = {
  config: Config;
  request: {
    method: METHODS;
    url: string;
    options: RequestOptions;
  };
  result: RequestResult | null;
  error: { message: string; status: string | number } | null;
  // Helper methods for easier manipulation
  setHeaders: (updater: (headers: { [key: string]: string }) => { [key: string]: string } | void) => void;
  setBody: (body: any) => void;
  setOptions: (updater: (options: RequestOptions) => RequestOptions | void) => void;
  setUrl: (url: string) => void;
  setMethod: (method: METHODS) => void;
  setError: (error: { message: string; status: string | number } | null) => void;
};

export type Config = {
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
  headers: { [key: string]: string };
  hooks: {
    onRequest?: Hook;
    onResponse?: Hook;
    onError?: Hook;
  };
  errorMapping?: {
    [statusCode: number]: string;
    [statusPattern: string]: string;
  };
  // Progress tracking options
  onUploadProgress?: (event: ProgressEvent) => void;
  onDownloadProgress?: (event: ProgressEvent) => void;
  useXHRForProgress?: boolean; // Force XMLHttpRequest when progress callbacks are provided
};

export type RequestResult = {
  loading: boolean;
  error: { message: string; status: string | number } | null;
  data: any;
  response: Response | null;
  refetch: (callback: (result: RequestResult) => void) => Promise<any>;
  cancelRequest: () => void;
  startPolling: (interval?: number) => void;
  stopPolling: () => void;
  onPollDataReceived: (callback: (result: RequestResult) => void) => void;
  // Streaming utilities
  streamToString?: () => Promise<string>;
  streamToBlob?: () => Promise<Blob>;
  streamToArrayBuffer?: () => Promise<ArrayBuffer>;
  streamChunks?: (callback: (chunk: Uint8Array) => void) => Promise<void>;
};

export type RequestOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | object | null;
} & Partial<Config>;

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

const cache: Map<string, RequestResult> = new Map();

// XMLHttpRequest-based request for progress tracking
async function requestWithProgress(
  url: string,
  method: METHODS,
  options: RequestOptions = { ...defaultConfig },
  context?: { config: Config; onError?: Hook },
): Promise<{
  loading: boolean;
  error: { message: string; status: string | number } | null;
  data: any;
  response: Response | null;
}> {
  return new Promise((resolve) => {
    const mergedConfig = { ...config, ...options };
    let fullUrl = mergedConfig.baseUrl ? mergedConfig.baseUrl + url : url;
    
    const xhr = new XMLHttpRequest();
    
    // Setup upload progress tracking
    if (mergedConfig.onUploadProgress && xhr.upload) {
      xhr.upload.addEventListener('progress', mergedConfig.onUploadProgress);
    }
    
    // Setup download progress tracking
    if (mergedConfig.onDownloadProgress) {
      xhr.addEventListener('progress', mergedConfig.onDownloadProgress);
    }
    
    const handleError = async (error: { message: string; status: string | number }) => {
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
          setError: (newError: { message: string; status: string | number } | null) => {
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
    
    xhr.addEventListener('loadend', async () => {
      let error: { message: string; status: string | number } | null = null;
      let data: any = null;
      let response: Response | null = null;
      
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          data = mergedConfig.parseJson ? JSON.parse(xhr.responseText) : xhr.responseText;
          // Create a mock Response object for compatibility
          response = {
            ok: true,
            status: xhr.status,
            statusText: xhr.statusText,
            url: fullUrl,
            headers: new Headers(),
            json: async () => mergedConfig.parseJson ? JSON.parse(xhr.responseText) : xhr.responseText,
            text: async () => xhr.responseText,
            blob: async () => new Blob([xhr.response]),
            arrayBuffer: async () => xhr.response,
            formData: async () => new FormData(),
            body: null,
            bodyUsed: false,
            clone: function() { return this; },
            type: 'basic',
            redirected: false
          } as Response;
        } catch (err) {
          error = { message: 'Failed to parse response', status: 'PARSE_ERROR' };
          error = await handleError(error);
        }
      } else {
        const originalMessage = xhr.statusText;
        let mappedMessage = originalMessage;
        
        // Apply error mapping if configured
        if (mergedConfig.errorMapping) {
          // Check for exact status code match
          if (mergedConfig.errorMapping[xhr.status]) {
            mappedMessage = mergedConfig.errorMapping[xhr.status];
          } else {
            // Check for pattern matches
            for (const [pattern, message] of Object.entries(mergedConfig.errorMapping)) {
              if (typeof pattern === 'string') {
                if (pattern === xhr.status.toString()) {
                  mappedMessage = message;
                  break;
                }
                if (originalMessage.toLowerCase().includes(pattern.toLowerCase()) ||
                    xhr.status.toString().includes(pattern)) {
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
    
    xhr.addEventListener('error', async () => {
      let mappedMessage = 'Network error';
      
      // Apply error mapping for network errors if configured
      if (mergedConfig.errorMapping) {
        for (const [pattern, message] of Object.entries(mergedConfig.errorMapping)) {
          if (typeof pattern === 'string') {
            if (pattern.toLowerCase() === 'network_error' ||
                pattern.toLowerCase() === 'fetch failed') {
              mappedMessage = message;
              break;
            }
          }
        }
      }
      
      let error: { message: string; status: string | number } = { message: mappedMessage, status: 'NETWORK_ERROR' };
      const handledError = await handleError(error);
      error = handledError || error;
      
      resolve({ 
        loading: false, 
        error, 
        data: null, 
        response: null 
      });
    });
    
    xhr.addEventListener('timeout', async () => {
      let error: { message: string; status: string | number } = { message: 'Request timed out!', status: 'TIMEOUT' };
      const handledError = await handleError(error);
      error = handledError || error;
      
      resolve({ 
        loading: false, 
        error, 
        data: null, 
        response: null 
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
        body = mergedConfig.stringifyPayload ? JSON.stringify(mergedConfig.body) : mergedConfig.body;
      } else {
        body = mergedConfig.body;
      }
    }
    
    xhr.send(body);
  });
}

async function request(
  url: string,
  method: METHODS,
  options: RequestOptions = { ...defaultConfig },
): Promise<RequestResult> {
  const abortController = new AbortController();
  const { signal } = abortController;

  let loading = true;
  let error: { message: string; status: string | number } | null = null;
  let data: any = null;
  let retryCount = 0;

  // Merge configuration properly
  const mergedConfig = { ...config, ...options };
  let fullUrl = mergedConfig.baseUrl ? mergedConfig.baseUrl + url : url;

  // Check if we should use XMLHttpRequest for progress tracking
  const shouldUseXHR = mergedConfig.useXHRForProgress || 
                       mergedConfig.onUploadProgress || 
                       mergedConfig.onDownloadProgress;

  const timeoutId = setTimeout(() => {
    abortController.abort();
    loading = true;
    error = { message: "Request timed out!", status: "TIMEOUT" };
  }, mergedConfig.timeout);

  const performRequest = async (): Promise<{
    loading: boolean;
    error: typeof error;
    data: any;
    response: Response | null;
  }> => {
    // Use XMLHttpRequest if progress tracking is needed
    if (shouldUseXHR) {
      return await requestWithProgress(url, method, options, {
        config: mergedConfig,
        onError: mergedConfig.hooks?.onError,
      });
    }
    
    const handleError = async (error: { message: string; status: string | number }) => {
      if (mergedConfig.hooks?.onError) {
        const errorContext = {
          config: mergedConfig,
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
          setError: (newError: { message: string; status: string | number } | null) => {
            error = newError || error;
          },
        };
        
        const patch = await mergedConfig.hooks.onError(errorContext);
        if (patch?.error !== undefined) {
          error = patch.error || error;
        }
      }
      return error;
    };
    
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
        if (typeof mergedConfig.body === "object" && mergedConfig.body !== null) {
          fetchOptions.body = mergedConfig.stringifyPayload ? JSON.stringify(mergedConfig.body) : mergedConfig.body as BodyInit;
        } else {
          fetchOptions.body = mergedConfig.body as BodyInit;
        }
      }
      if (mergedConfig.cache !== undefined) fetchOptions.cache = mergedConfig.cache;
      if (mergedConfig.credentials !== undefined) fetchOptions.credentials = mergedConfig.credentials;
      if (mergedConfig.withCredentials) fetchOptions.credentials = 'include';
      if (mergedConfig.integrity !== undefined) fetchOptions.integrity = mergedConfig.integrity;
      if (mergedConfig.keepalive !== undefined) fetchOptions.keepalive = mergedConfig.keepalive;
      if (mergedConfig.mode !== undefined) fetchOptions.mode = mergedConfig.mode;
      if (mergedConfig.redirect !== undefined) fetchOptions.redirect = mergedConfig.redirect;
      if (mergedConfig.referrer !== undefined) fetchOptions.referrer = mergedConfig.referrer;
      if (mergedConfig.referrerPolicy !== undefined) fetchOptions.referrerPolicy = mergedConfig.referrerPolicy;

      if (mergedConfig.referrerPolicy !== undefined) fetchOptions.referrerPolicy = mergedConfig.referrerPolicy;

      if (options.baseUrl) {
        fullUrl = options.baseUrl + url;
      }

      const response = await fetch(fullUrl, fetchOptions);

      if (!response.ok) {
        const originalMessage = response.statusText;
        let mappedMessage = originalMessage;
        
        // Apply error mapping if configured
        if (mergedConfig.errorMapping) {
          // Check for exact status code match
          if (mergedConfig.errorMapping[response.status]) {
            mappedMessage = mergedConfig.errorMapping[response.status];
          } else {
            // Check for pattern matches
            for (const [pattern, message] of Object.entries(mergedConfig.errorMapping)) {
              if (typeof pattern === 'string') {
                // Check if status code matches pattern
                if (pattern === response.status.toString()) {
                  mappedMessage = message;
                  break;
                }
                // Check if original message contains pattern (case insensitive)
                if (originalMessage.toLowerCase().includes(pattern.toLowerCase()) ||
                    response.status.toString().includes(pattern)) {
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
        data = mergedConfig.parseJson ? await response.json() : await response.text();
      }

      clearTimeout(timeoutId);
      loading = false;
      return { loading, error, data, response };
    } catch (err: any) {
      let mappedMessage = err.message;
      
      // Apply error mapping for network errors if configured
      if (mergedConfig.errorMapping) {
        for (const [pattern, message] of Object.entries(mergedConfig.errorMapping)) {
          if (typeof pattern === 'string') {
            if (err.message.toLowerCase().includes(pattern.toLowerCase()) ||
                pattern.toLowerCase() === 'network_error' ||
                pattern.toLowerCase() === 'fetch failed') {
              mappedMessage = message;
              break;
            }
          }
        }
      }
      
      error = { message: mappedMessage, status: "NETWORK_ERROR" };
      error = await handleError(error);
      clearTimeout(timeoutId);
      loading = false;
      return { loading, error, data, response: null };
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

  const cancelRequest = (): void => {
    abortController.abort();
  };

  let result = await performRequest();

  while (config.retry && retryCount < config.maxRetries && result.error) {
    retryCount++;
    result = await performRequest();
  }

  let pollingIntervalId: any | null = null;
  let pollCallback: ((result: RequestResult) => void) | null = null;

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
    if (config.startPolling && !pollingIntervalId) {
      startPolling();
    }
  };

  const startPolling = (interval: number = config.pollingInterval): void => {
    if (!pollCallback) {
      console.warn("Polling not started: onPollDataReceived callback not set");
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
        console.error("Polling error:", pollError);
      }
    }, interval);
  };

  // Streaming utility functions
  const streamToString = async (): Promise<string> => {
    if (!result.response) {
      throw new Error('No response available for streaming');
    }
    if (!result.response.body && typeof result.response.text !== 'function') {
      throw new Error('No response body available for streaming');
    }
    return await result.response.text();
  };

  const streamToBlob = async (): Promise<Blob> => {
    if (!result.response) {
      throw new Error('No response available for streaming');
    }
    if (!result.response.body && typeof result.response.blob !== 'function') {
      throw new Error('No response body available for streaming');
    }
    return await result.response.blob();
  };

  const streamToArrayBuffer = async (): Promise<ArrayBuffer> => {
    if (!result.response) {
      throw new Error('No response available for streaming');
    }
    if (!result.response.body && typeof result.response.arrayBuffer !== 'function') {
      throw new Error('No response body available for streaming');
    }
    return await result.response.arrayBuffer();
  };

  const streamChunks = async (callback: (chunk: Uint8Array) => void): Promise<void> => {
    if (!result.response || !result.response.body) {
      throw new Error('No response body available for streaming');
    }
    
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
  };

  // Check cache for GET requests
  const cacheKey = `${method}:${fullUrl}`;
  if (config.withCache && method === "GET" && cache.has(cacheKey)) {
    setTimeout(() => {
      performRequest().then((newResult) => {
        if (!newResult.error) {
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
    }, config.revalidateCache);
    return cache.get(cacheKey)!;
  }

  // Cache successful GET requests
  if (config.withCache && method === "GET" && !result.error) {
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

  return {
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
  };
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
): Promise<RequestResult> {
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
): Promise<RequestResult> {
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
): Promise<RequestResult> {
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
): Promise<RequestResult> {
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
): Promise<RequestResult> {
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
): Promise<RequestResult> {
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
): Promise<RequestResult> {
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
): Promise<RequestResult> {
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
): Promise<RequestResult> {
  return request(url, method, options);
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
  const { onRequest, onResponse, onError } = instanceConfigWithDefaults.hooks || {};

  const interceptor = async (
    method: METHODS,
    url: string,
    options: RequestOptions,
  ): Promise<RequestResult> => {
    let context: Context = {
      config: instanceConfigWithDefaults,
      request: {
        method,
        url,
        options: { 
          ...instanceConfigWithDefaults, 
          ...options,
          headers: { ...instanceConfigWithDefaults.headers, ...(options.headers || {}) }
        },
      },
      result: null,
      error: null,
      // Helper methods for easier manipulation
      setHeaders: (updater: (headers: { [key: string]: string }) => { [key: string]: string } | void) => {
        const currentHeaders = context.request.options.headers || {};
        const result = updater(currentHeaders);
        if (result) {
          context.request.options.headers = result;
        }
      },
      setBody: (body: any) => {
        context.request.options.body = body;
      },
      setOptions: (updater: (options: RequestOptions) => RequestOptions | void) => {
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
      setError: (error: { message: string; status: string | number } | null) => {
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
              ...(patch.request?.options?.headers || {})
            }
          }
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
      updated.setHeaders = (updater: (headers: { [key: string]: string }) => { [key: string]: string } | void) => {
        const currentHeaders = updated.request.options.headers || {};
        const result = updater(currentHeaders);
        if (result) {
          updated.request.options.headers = result;
        }
      };
      updated.setBody = (body: any) => {
        updated.request.options.body = body;
      };
      updated.setOptions = (updater: (options: RequestOptions) => RequestOptions | void) => {
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
      updated.setError = (error: { message: string; status: string | number } | null) => {
        updated.error = error;
      };
      
      return updated;
    };

    // console.log('context log before::', context.request.options);
    if (onRequest) {
      const patch = await onRequest(context);
      if (patch) {
        context = applyPatch(context, patch);
      }
    }

    // console.log('context log after::', context.request.options);

    const result = await request(
      context.request.url,
      context.request.method,
      { ...context.request.options, hooks: { onError } },
    );

    context.result = result;

    if (onResponse) {
      const patch = await onResponse(context);
      if (patch) {
        context = applyPatch(context, patch);
      }
    }

    return context.result!;
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
