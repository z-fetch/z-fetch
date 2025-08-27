'use strict';

// src/lib/index.ts
var defaultConfig = {
  baseUrl: "",
  bearerToken: null,
  timeout: 9e4,
  retry: false,
  maxRetries: 3,
  startPolling: false,
  stopPolling: false,
  pollingInterval: 5e3,
  revalidateCache: 1e4,
  withCredentials: false,
  withCache: true,
  parseJson: true,
  stringifyPayload: true,
  mode: "cors",
  headers: {
    "Content-Type": "application/json",
    Accept: "*/*"
  },
  hooks: {},
  errorMapping: {}
};
var config = { ...defaultConfig };
var cache = /* @__PURE__ */ new Map();
async function request(url, method, options = { ...defaultConfig }) {
  const abortController = new AbortController();
  const { signal } = abortController;
  let loading = true;
  let error = null;
  let data = null;
  let retryCount = 0;
  let fullUrl = config.baseUrl ? config.baseUrl + url : url;
  const timeoutId = setTimeout(() => {
    abortController.abort();
    loading = true;
    error = { message: "Request timed out!", status: "TIMEOUT" };
  }, config.timeout);
  const performRequest = async () => {
    const mergedConfig = { ...config, ...options };
    try {
      const headers = { ...config.headers, ...options.headers || {} };
      if (mergedConfig.bearerToken && !headers["Authorization"]) {
        headers["Authorization"] = `Bearer ${mergedConfig.bearerToken}`;
      }
      let fetchOptions = {
        signal,
        method,
        headers
      };
      if (mergedConfig.body !== void 0) {
        if (typeof mergedConfig.body === "object" && mergedConfig.body !== null) {
          fetchOptions.body = mergedConfig.stringifyPayload ? JSON.stringify(mergedConfig.body) : mergedConfig.body;
        } else {
          fetchOptions.body = mergedConfig.body;
        }
      }
      if (mergedConfig.cache !== void 0) fetchOptions.cache = mergedConfig.cache;
      if (mergedConfig.credentials !== void 0) fetchOptions.credentials = mergedConfig.credentials;
      if (mergedConfig.withCredentials) fetchOptions.credentials = "include";
      if (mergedConfig.integrity !== void 0) fetchOptions.integrity = mergedConfig.integrity;
      if (mergedConfig.keepalive !== void 0) fetchOptions.keepalive = mergedConfig.keepalive;
      if (mergedConfig.mode !== void 0) fetchOptions.mode = mergedConfig.mode;
      if (mergedConfig.redirect !== void 0) fetchOptions.redirect = mergedConfig.redirect;
      if (mergedConfig.referrer !== void 0) fetchOptions.referrer = mergedConfig.referrer;
      if (mergedConfig.referrerPolicy !== void 0) fetchOptions.referrerPolicy = mergedConfig.referrerPolicy;
      if (mergedConfig.referrerPolicy !== void 0) fetchOptions.referrerPolicy = mergedConfig.referrerPolicy;
      if (options.baseUrl) {
        fullUrl = options.baseUrl + url;
      }
      const response = await fetch(fullUrl, fetchOptions);
      if (!response.ok) {
        const originalMessage = response.statusText;
        let mappedMessage = originalMessage;
        if (mergedConfig.errorMapping) {
          if (mergedConfig.errorMapping[response.status]) {
            mappedMessage = mergedConfig.errorMapping[response.status];
          } else {
            for (const [pattern, message] of Object.entries(mergedConfig.errorMapping)) {
              if (typeof pattern === "string") {
                if (pattern === response.status.toString()) {
                  mappedMessage = message;
                  break;
                }
                if (originalMessage.toLowerCase().includes(pattern.toLowerCase()) || response.status.toString().includes(pattern)) {
                  mappedMessage = message;
                  break;
                }
              }
            }
          }
        }
        error = { message: mappedMessage, status: response.status };
      } else {
        data = mergedConfig.parseJson ? await response.json() : await response.text();
      }
      clearTimeout(timeoutId);
      loading = false;
      return { loading, error, data, response };
    } catch (err) {
      let mappedMessage = err.message;
      if (mergedConfig.errorMapping) {
        for (const [pattern, message] of Object.entries(mergedConfig.errorMapping)) {
          if (typeof pattern === "string") {
            if (err.message.toLowerCase().includes(pattern.toLowerCase()) || pattern.toLowerCase() === "network_error" || pattern.toLowerCase() === "fetch failed") {
              mappedMessage = message;
              break;
            }
          }
        }
      }
      error = { message: mappedMessage, status: "NETWORK_ERROR" };
      clearTimeout(timeoutId);
      loading = false;
      return { loading, error, data, response: null };
    }
  };
  const refetch = async (callback) => {
    const newData = await performRequest();
    return callback({
      ...newData,
      refetch,
      cancelRequest,
      startPolling,
      stopPolling,
      onPollDataReceived
    });
  };
  const cancelRequest = () => {
    abortController.abort();
  };
  let result = await performRequest();
  while (config.retry && retryCount < config.maxRetries && result.error) {
    retryCount++;
    result = await performRequest();
  }
  let pollingIntervalId = null;
  let pollCallback = null;
  const stopPolling = () => {
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId);
      pollingIntervalId = null;
    }
  };
  const onPollDataReceived = (callback) => {
    if (typeof callback !== "function") {
      throw new Error("onPollDataReceived callback must be a function");
    }
    pollCallback = callback;
    if (config.startPolling && !pollingIntervalId) {
      startPolling();
    }
  };
  const startPolling = (interval = config.pollingInterval) => {
    if (!pollCallback) {
      console.warn("Polling not started: onPollDataReceived callback not set");
      return;
    }
    if (pollingIntervalId) {
      stopPolling();
    }
    pollingIntervalId = setInterval(async () => {
      try {
        const newResult = await performRequest();
        pollCallback(newResult);
        Object.assign(result, newResult);
      } catch (pollError) {
        console.error("Polling error:", pollError);
      }
    }, interval);
  };
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
            onPollDataReceived
          });
        }
      });
    }, config.revalidateCache);
    return cache.get(cacheKey);
  }
  if (config.withCache && method === "GET" && !result.error) {
    cache.set(cacheKey, {
      ...result,
      refetch,
      cancelRequest,
      startPolling,
      stopPolling,
      onPollDataReceived
    });
  }
  return {
    ...result,
    refetch,
    cancelRequest,
    startPolling,
    stopPolling,
    onPollDataReceived
  };
}
function GET(url, options) {
  return request(url, "GET", options);
}
function POST(url, options) {
  return request(url, "POST", options);
}
function PUT(url, options) {
  return request(url, "PUT", options);
}
function DELETE(url, options) {
  return request(url, "DELETE", options);
}
function PATCH(url, options) {
  return request(url, "PATCH", options);
}
function OPTIONS(url, options) {
  return request(url, "OPTIONS", options);
}
function TRACE(url, options) {
  return request(url, "TRACE", options);
}
function HEAD(url, options) {
  return request(url, "HEAD", options);
}
function CUSTOM(url, method, options) {
  return request(url, method, options);
}
function createInstance(instanceConfig = {}) {
  const instanceConfigWithDefaults = { ...defaultConfig, ...instanceConfig };
  const { onRequest, onResponse } = instanceConfigWithDefaults.hooks || {};
  const interceptor = async (method, url, options) => {
    let context = {
      config: instanceConfigWithDefaults,
      request: {
        method,
        url,
        options: {
          ...instanceConfigWithDefaults,
          ...options,
          headers: { ...instanceConfigWithDefaults.headers, ...options.headers || {} }
        }
      },
      result: null,
      // Helper methods for easier manipulation
      setHeaders: (updater) => {
        const currentHeaders = context.request.options.headers || {};
        const result2 = updater(currentHeaders);
        if (result2) {
          context.request.options.headers = result2;
        }
      },
      setBody: (body) => {
        context.request.options.body = body;
      },
      setOptions: (updater) => {
        const result2 = updater(context.request.options);
        if (result2) {
          context.request.options = result2;
        }
      },
      setUrl: (url2) => {
        context.request.url = url2;
      },
      setMethod: (method2) => {
        context.request.method = method2;
      }
    };
    const applyPatch = (original, patch2) => {
      if (!patch2) return original;
      const updated = {
        ...original,
        ...patch2,
        request: {
          ...original.request,
          ...patch2.request,
          options: {
            ...original.request.options,
            ...patch2.request?.options,
            headers: {
              ...original.request.options.headers,
              ...patch2.request?.options?.headers || {}
            }
          }
        },
        result: patch2.result ?? original.result,
        // Preserve helper methods
        setHeaders: original.setHeaders,
        setBody: original.setBody,
        setOptions: original.setOptions,
        setUrl: original.setUrl,
        setMethod: original.setMethod
      };
      updated.setHeaders = (updater) => {
        const currentHeaders = updated.request.options.headers || {};
        const result2 = updater(currentHeaders);
        if (result2) {
          updated.request.options.headers = result2;
        }
      };
      updated.setBody = (body) => {
        updated.request.options.body = body;
      };
      updated.setOptions = (updater) => {
        const result2 = updater(updated.request.options);
        if (result2) {
          updated.request.options = result2;
        }
      };
      updated.setUrl = (url2) => {
        updated.request.url = url2;
      };
      updated.setMethod = (method2) => {
        updated.request.method = method2;
      };
      return updated;
    };
    if (onRequest) {
      const patch2 = await onRequest(context);
      if (patch2) {
        context = applyPatch(context, patch2);
      }
    }
    const result = await request(
      context.request.url,
      context.request.method,
      context.request.options
    );
    context.result = result;
    if (onResponse) {
      const patch2 = await onResponse(context);
      if (patch2) {
        context = applyPatch(context, patch2);
      }
    }
    return context.result;
  };
  const createMethod = (method) => {
    return (url, options) => interceptor(method, url, options || {});
  };
  const get = createMethod("GET");
  const post = createMethod("POST");
  const put = createMethod("PUT");
  const delete_ = createMethod("DELETE");
  const patch = createMethod("PATCH");
  const options_ = createMethod("OPTIONS");
  const trace = createMethod("TRACE");
  const head = createMethod("HEAD");
  const custom = (url, method, options) => interceptor(method, url, options || {});
  const setBearerToken = (token) => {
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
      setBearerToken
    }
  };
}

exports.CUSTOM = CUSTOM;
exports.DELETE = DELETE;
exports.GET = GET;
exports.HEAD = HEAD;
exports.OPTIONS = OPTIONS;
exports.PATCH = PATCH;
exports.POST = POST;
exports.PUT = PUT;
exports.TRACE = TRACE;
exports.createInstance = createInstance;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map