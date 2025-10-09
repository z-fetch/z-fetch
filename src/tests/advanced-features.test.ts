import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createInstance } from "../lib/index.js";
import { setupMockFetch } from "./mock-helpers.js";

// Mock XMLHttpRequest for progress testing
global.XMLHttpRequest = vi.fn(() => ({
  open: vi.fn(),
  send: vi.fn(),
  setRequestHeader: vi.fn(),
  addEventListener: vi.fn(),
  abort: vi.fn(),
  upload: {
    addEventListener: vi.fn(),
  },
  timeout: 0,
  withCredentials: false,
  status: 200,
  statusText: "OK",
  responseText: JSON.stringify({ success: true }),
  response: "test response",
})) as any;

describe("Advanced Features Tests", () => {
  let mockFetch: ReturnType<typeof setupMockFetch>;
  let mockXHR: any;

  beforeEach(() => {
    mockFetch = setupMockFetch({ success: true });
    mockXHR = {
      open: vi.fn(),
      send: vi.fn(),
      setRequestHeader: vi.fn(),
      addEventListener: vi.fn(),
      abort: vi.fn(),
      upload: {
        addEventListener: vi.fn(),
      },
      timeout: 0,
      withCredentials: false,
      status: 200,
      statusText: "OK",
      responseText: JSON.stringify({ success: true }),
    };
    (global.XMLHttpRequest as any).mockReturnValue(mockXHR);
    vi.useFakeTimers();
  });

  afterEach(() => {
    mockFetch.restore();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Request Cancellation", () => {
    it("should cancel an XMLHttpRequest request", async () => {
      const onUploadProgress = vi.fn();
      const api = createInstance({
        baseUrl: "https://api.example.com",
        onUploadProgress,
      });

      // Mock the abort event to resolve the request
      mockXHR.addEventListener.mockImplementation(
        (event: string, callback: Function) => {
          if (event === "abort") {
            // Simulate the abort event being triggered
            setTimeout(() => {
              mockXHR.status = 0; // Status is 0 for aborted requests
              callback();
            }, 0);
          }
        },
      );

      const promise = api.post("/upload", { body: { file: "data" } });

      // Immediately cancel the request
      promise.then((result) => {
        result.cancelRequest();
      });

      await vi.runAllTimersAsync();

      const result = await promise;

      expect(mockXHR.abort).toHaveBeenCalled();
      expect(result.error).not.toBeNull();
      expect(result.error?.status).toBe("CANCELED");
      expect(result.error?.message).toBe("Request canceled");
    });
  });

  describe("Caching", () => {
    it("should cache a successful GET request", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        withCache: true,
      });

      // First call - should hit the network
      const result1 = await api.get("/cache-test");
      expect(result1.data).toEqual({ success: true });

      // Change network response to simulate failure; cache should still serve old data
      mockFetch.setResponse({
        success: false,
        status: 500,
        statusText: "Error",
      });

      // Second call - should be served from cache despite network now failing
      const result2 = await api.get("/cache-test");
      expect(result2.error).toBeNull();
      expect(result2.data).toEqual({ success: true });
    });

    it("should not cache failed requests", async () => {
      mockFetch.setResponse({ message: "Not Found" }, 404);
      const api = createInstance({
        baseUrl: "https://api.example.com",
        withCache: true,
      });

      // First call - should fail
      await api.get("/cache-fail");
      expect(mockFetch.calls.length).toBe(1);

      // Second call - should try the network again
      await api.get("/cache-fail");
      expect(mockFetch.calls.length).toBe(2);
    });

    it("should revalidate cache in the background", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        withCache: true,
        revalidateCache: 1000, // 1 second
      });

      // First call - populate cache
      await api.get("/revalidate");
      expect(mockFetch.calls.length).toBe(1);

      // Second call - may hit network depending on timing; ensure data returned
      const beforeCalls = mockFetch.calls.length;
      const res2 = await api.get("/revalidate");
      expect(res2.error).toBeNull();
      expect(typeof res2.data).toBe("object");
      expect(mockFetch.calls.length).toBeGreaterThanOrEqual(beforeCalls);

      // Advance timers to trigger background revalidation
      await vi.advanceTimersByTimeAsync(1100);
      // Allow queued microtasks to run
      await Promise.resolve();

      // At least one more call should have occurred due to revalidation
      expect(mockFetch.calls.length).toBeGreaterThanOrEqual(beforeCalls + 1);
    });

    it("should not cache a canceled GET; subsequent GET hits network again", async () => {
      // Custom fetch that respects AbortSignal and delays resolution
      let callCount = 0;
      const customFetch = vi
        .fn()
        .mockImplementation((url: string | URL, options: any = {}) => {
          callCount++;
          return new Promise((resolve, reject) => {
            const signal: AbortSignal | undefined = options.signal;
            if (signal) {
              if (signal.aborted) {
                reject(new Error("AbortError"));
                return;
              }
              signal.addEventListener("abort", () =>
                reject(new Error("AbortError")),
              );
            }
            setTimeout(() => {
              resolve({
                ok: true,
                status: 200,
                statusText: "OK",
                url: url.toString(),
                json: vi.fn().mockResolvedValue({ ok: true }),
                text: vi.fn().mockResolvedValue(JSON.stringify({ ok: true })),
                headers: new Headers(),
                body: null,
                bodyUsed: false,
                clone: function () {
                  return this as any;
                },
                formData: vi.fn().mockResolvedValue(new FormData()),
                arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
                blob: vi.fn().mockResolvedValue(new Blob()),
              } as any);
            }, 1000);
          });
        });

      // Override fetch for this test
      const originalFetch = global.fetch;
      global.fetch = customFetch as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        withCache: true,
      });

      const p1 = api.get("/slow-cancel");
      // Cancel before resolution
      (p1 as any).cancel();

      await Promise.resolve();
      await vi.runAllTimersAsync();

      const r1 = await p1;
      expect(r1.error).toBeTruthy();
      expect(r1.error?.status).toBe("CANCELED");
      expect(callCount).toBe(1);

      const p2 = api.get("/slow-cancel");
      // Let the delayed fetch resolve
      await vi.advanceTimersByTimeAsync(1000);
      const r2 = await p2;

      expect(r2.error).toBeNull();
      expect(callCount).toBe(2);

      // Restore original fetch
      global.fetch = originalFetch as any;
    });

    it("should keep cached data when background revalidation fails", async () => {
      // Use real timers for this test to avoid fake-timer deadlocks
      vi.useRealTimers();

      let callCount = 0;
      let mode: "success" | "fail" = "success";
      const data = { value: 1 };

      const customFetch = vi
        .fn()
        .mockImplementation((url: string | URL, _options: any = {}) => {
          callCount++;
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              if (mode === "success") {
                resolve({
                  ok: true,
                  status: 200,
                  statusText: "OK",
                  url: url.toString(),
                  json: vi.fn().mockResolvedValue(data),
                  text: vi.fn().mockResolvedValue(JSON.stringify(data)),
                  headers: new Headers(),
                  body: null,
                  bodyUsed: false,
                  clone: function () {
                    return this as any;
                  },
                  formData: vi.fn().mockResolvedValue(new FormData()),
                  arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
                  blob: vi.fn().mockResolvedValue(new Blob()),
                } as any);
              } else {
                reject(new Error("Network error"));
              }
            }, 10);
          });
        });

      const originalFetch = global.fetch;
      global.fetch = customFetch as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        withCache: true,
        revalidateCache: 0,
      });

      // Initial successful cache population
      const r1 = await api.get("/reval-fail");
      expect(r1.error).toBeNull();
      expect(r1.data).toEqual({ value: 1 });

      // Next call returns cached data and schedules background revalidation
      mode = "fail"; // make revalidation fail
      const beforeCalls = callCount;
      const r2 = await api.get("/reval-fail");
      expect(r2.data).toEqual({ value: 1 });

      // Give background revalidation time to execute
      await new Promise((r) => setTimeout(r, 30));

      // Ensure a revalidation attempt was made
      expect(callCount).toBeGreaterThanOrEqual(beforeCalls + 1);

      // Cache should still hold the old successful data
      const r3 = await api.get("/reval-fail");
      expect(r3.data).toEqual({ value: 1 });

      global.fetch = originalFetch as any;
    });
  });

  describe("Credentials", () => {
    it("should include credentials for fetch when withCredentials is true", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        withCredentials: true,
      });

      await api.get("/credentials");

      expect(mockFetch.calls[0].options.credentials).toBe("include");
    });

    it("should include credentials for XMLHttpRequest when withCredentials is true", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        withCredentials: true,
        useXHRForProgress: true, // Force XHR
      });

      // Mock the loadend event to resolve the request
      mockXHR.addEventListener.mockImplementation(
        (event: string, callback: Function) => {
          if (event === "loadend") {
            setTimeout(callback, 0);
          }
        },
      );

      const p = api.get("/credentials-xhr");
      await vi.runAllTimersAsync();
      await p;

      expect(mockXHR.withCredentials).toBe(true);
    });

    it("should not include credentials by default for fetch", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        // withCredentials defaults to false
      });

      await api.get("/no-credentials");

      expect(mockFetch.calls[0].options.credentials).toBeUndefined();
    });

    it("should not set withCredentials by default for XMLHttpRequest", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        useXHRForProgress: true, // Force XHR
        // withCredentials defaults to false
      });

      // Mock the loadend event to resolve the request
      mockXHR.addEventListener.mockImplementation(
        (event: string, callback: Function) => {
          if (event === "loadend") {
            setTimeout(callback, 0);
          }
        },
      );

      const p = api.get("/no-credentials-xhr");
      await vi.runAllTimersAsync();
      await p;

      expect(mockXHR.withCredentials).toBe(false);
    });
  });
});
