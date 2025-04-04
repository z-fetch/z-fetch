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
  }
};
var config = { ...defaultConfig };
var cache = /* @__PURE__ */ new Map();
function setConfig(newConfig) {
  config = { ...config, ...newConfig };
}
function setBearerToken(token) {
  config.bearerToken = token;
  config.headers["Authorization"] = `Bearer ${token}`;
}
async function request(url, method, options = { ...defaultConfig }) {
  const abortController = new AbortController();
  const { signal } = abortController;
  let loading = true;
  let error = null;
  let data = null;
  let retryCount = 0;
  const fullUrl = config.baseUrl ? config.baseUrl + url : url;
  const timeoutId = setTimeout(() => {
    abortController.abort();
    loading = true;
    error = { message: "Request timed out!", status: "TIMEOUT" };
  }, config.timeout);
  const performRequest = async () => {
    try {
      let fetchOptions = {
        signal,
        method,
        ...config,
        ...options,
        headers: { ...config.headers, ...options.headers || {} }
      };
      if (config.stringifyPayload && fetchOptions.body && typeof fetchOptions.body === "object") {
        fetchOptions.body = JSON.stringify(fetchOptions.body);
      }
      const response = await fetch(fullUrl, fetchOptions);
      if (!response.ok) {
        error = { message: response.statusText, status: response.status };
      } else {
        data = config.parseJson ? await response.json() : await response.text();
      }
      clearTimeout(timeoutId);
      loading = false;
      return { loading, error, data, response };
    } catch (err) {
      error = { message: err.message, status: "NETWORK_ERROR" };
      clearTimeout(timeoutId);
      loading = false;
      return { loading, error, data, response: null };
    }
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

export { CUSTOM, DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT, TRACE, setBearerToken, setConfig };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map