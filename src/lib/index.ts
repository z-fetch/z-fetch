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
  context: Readonly<Context>,
) => Promise<DeepPartial<Context>> | void;

export type Context = {
  config: Config;
  request: {
    method: METHODS;
    url: string;
    options: RequestOptions;
  };
  result: RequestResult | null;
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
  };
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
};

let config: Config = { ...defaultConfig };

const cache: Map<string, RequestResult> = new Map();

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

  let fullUrl = config.baseUrl ? config.baseUrl + url : url;

  const timeoutId = setTimeout(() => {
    abortController.abort();
    loading = true;
    error = { message: "Request timed out!", status: "TIMEOUT" };
  }, config.timeout);

  const performRequest = async (): Promise<{
    loading: boolean;
    error: typeof error;
    data: any;
    response: Response | null;
  }> => {
    try {
      let fetchOptions: any = {
        signal,
        method,
        ...config,
        ...options,
        headers: { ...config.headers, ...(options.headers || {}) },
      };

      // console.log('fetch options', fetchOptions);

      if (
        config.stringifyPayload &&
        fetchOptions.body &&
        typeof fetchOptions.body === "object"
      ) {
        fetchOptions.body = JSON.stringify(fetchOptions.body);
      }

      if (options.baseUrl) {
        fullUrl = options.baseUrl + url;
      }

      // console.log('log', fullUrl, fetchOptions);

      const response = await fetch(fullUrl, fetchOptions);

      if (!response.ok) {
        error = { message: response.statusText, status: response.status };
      } else {
        data = config.parseJson ? await response.json() : await response.text();
      }

      clearTimeout(timeoutId);
      loading = false;
      return { loading, error, data, response };
    } catch (err: any) {
      error = { message: err.message, status: "NETWORK_ERROR" };
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
    });
  }

  return {
    ...result,
    refetch,
    cancelRequest,
    startPolling,
    stopPolling,
    onPollDataReceived,
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
  const { onRequest, onResponse } = instanceConfigWithDefaults.hooks || {};

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
        options: { ...instanceConfigWithDefaults, ...options },
      },
      result: null,
    };

    const applyPatch = (original: Context, patch?: DeepPartial<Context>) => {
      if (!patch) return original;
      return {
        ...original,
        ...patch,
        request: {
          ...original.request,
          ...patch.request,
        },
        result: patch.result ?? original.result,
      } as Context;
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
      context.request.options,
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
