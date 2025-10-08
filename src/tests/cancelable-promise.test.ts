import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createInstance, GET } from "../lib/index.js";

describe("Cancelable Promise", () => {
  let originalFetch: any;
  let originalXHR: any;

  beforeEach(() => {
    originalFetch = global.fetch;
    originalXHR = (global as any).XMLHttpRequest;
    vi.useFakeTimers();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    (global as any).XMLHttpRequest = originalXHR;
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("should cancel a fetch request via promise.cancel()", async () => {
    // Mock fetch to delay resolution and reject on AbortSignal
    const mockFetch = vi
      .fn()
      .mockImplementation((url: string | URL, options: any = {}) => {
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
          // Resolve later if not aborted (should not be hit in this test)
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
                return this;
              },
              formData: vi.fn().mockResolvedValue(new FormData()),
              arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
              blob: vi.fn().mockResolvedValue(new Blob()),
            } as any);
          }, 1000);
        });
      });

    global.fetch = mockFetch as any;

    const p = GET("https://api.example.com/slow");

    // Ensure cancel exists on promise
    expect(typeof (p as any).cancel).toBe("function");

    // Cancel before the delayed resolution
    (p as any).cancel();

    // Flush timers and microtasks
    await Promise.resolve();
    await vi.runAllTimersAsync();

    const result = await p;

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.error).toBeTruthy();
    expect(result.error?.status).toBe("CANCELED");
    expect(result.error?.message).toBe("Request canceled");
  });

  it("should cancel an XMLHttpRequest request via promise.cancel()", async () => {
    // Minimal XHR mock with abort event propagation
    const listeners: Record<string, Function[]> = {};
    const mockXHR = {
      open: vi.fn(),
      send: vi.fn(),
      setRequestHeader: vi.fn(),
      withCredentials: false,
      timeout: 0,
      status: 200,
      statusText: "OK",
      responseText: JSON.stringify({ ok: true }),
      response: "",
      addEventListener: vi.fn((event: string, cb: Function) => {
        (listeners[event] ||= []).push(cb);
      }),
      abort: vi.fn(() => {
        // Fire abort listeners synchronously
        (listeners["abort"] || []).forEach((cb) => cb());
      }),
      upload: {
        addEventListener: vi.fn(),
      },
    } as any;

    (global as any).XMLHttpRequest = vi.fn(() => mockXHR) as any;

    const api = createInstance({
      baseUrl: "https://api.example.com",
      // Force XHR path
      onUploadProgress: () => {},
    });

    const p = api.post("/upload", { body: { file: "data" } });

    // Ensure cancel exists on promise
    expect(typeof (p as any).cancel).toBe("function");

    // Cancel immediately; should call xhr.abort and resolve with CANCELED
    (p as any).cancel();

    // Flush timers (none scheduled, but keep consistent)
    await Promise.resolve();
    await vi.runAllTimersAsync();

    const result = await p;

    expect(mockXHR.abort).toHaveBeenCalled();
    expect(result.error).toBeTruthy();
    expect(result.error?.status).toBe("CANCELED");
    expect(result.error?.message).toBe("Request canceled");
  });
});
