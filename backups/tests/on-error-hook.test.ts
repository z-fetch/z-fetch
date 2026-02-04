import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createInstance, Context } from "../lib/index.js";
import { setupMockFetch } from "./mock-helpers.js";

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Mock XMLHttpRequest for error testing
global.XMLHttpRequest = vi.fn(() => ({
  open: vi.fn(),
  send: vi.fn(),
  setRequestHeader: vi.fn(),
  addEventListener: vi.fn(),
  upload: {
    addEventListener: vi.fn(),
  },
  timeout: 0,
  withCredentials: false,
  status: 404,
  statusText: "Not Found",
  responseText: "",
  response: "",
})) as any;

describe("onError Hook Tests", () => {
  let mockSetup: ReturnType<typeof setupMockFetch>;
  let mockXHR: any;

  beforeEach(() => {
    mockSetup = setupMockFetch({ success: false, status: 404 });
    mockXHR = {
      open: vi.fn(),
      send: vi.fn(),
      setRequestHeader: vi.fn(),
      addEventListener: vi.fn(),
      upload: {
        addEventListener: vi.fn(),
      },
      timeout: 0,
      withCredentials: false,
      status: 404,
      statusText: "Not Found",
      responseText: "",
      response: "",
    };
    (global.XMLHttpRequest as any).mockReturnValue(mockXHR);
  });

  afterEach(() => {
    mockSetup.restore();
    vi.clearAllMocks();
  });

  describe("HTTP Error Handling", () => {
    it("should call onError hook when HTTP error occurs", async () => {
      const onErrorSpy = vi.fn();

      const api = createInstance({
        baseUrl: "https://api.example.com",
        withCache: false,
        hooks: {
          onError: onErrorSpy,
        },
      });

      const result = await api.get("/notfound");

      expect(onErrorSpy).toHaveBeenCalledTimes(1);
      expect(onErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.any(Object),
          request: expect.objectContaining({
            method: "GET",
            url: "/notfound",
            options: expect.any(Object),
          }),
          result: null,
          error: expect.objectContaining({
            message: expect.any(String),
            status: 404,
          }),
          setError: expect.any(Function),
        }),
      );

      expect(result.error).toBeTruthy();
      expect(result.error?.status).toBe(404);
    });

    it("should allow onError hook to modify error message", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        withCache: false,
        hooks: {
          onError: async (context) => {
            context.setError({
              message: "Custom error message from hook",
              status: context.error?.status || "UNKNOWN",
            });
          },
        },
      });

      const result = await api.get("/notfound-modify");

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe("Custom error message from hook");
      expect(result.error?.status).toBe(404);
    });

    it("should allow onError hook to modify error via return value", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        withCache: false,
        hooks: {
          onError: async () => {
            return {
              error: {
                message: "Modified via return value",
                status: "CUSTOM_ERROR",
              },
            } as DeepPartial<Context>;
          },
        },
      });

      const result = await api.get("/notfound-return");

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe("Modified via return value");
      expect(result.error?.status).toBe("CUSTOM_ERROR");
    });
  });

  describe("Network Error Handling", () => {
    it("should call onError hook for network errors with fetch", async () => {
      const onErrorSpy = vi.fn();

      // Make fetch throw a network error
      global.fetch = vi.fn().mockRejectedValue(new Error("fetch failed"));

      const api = createInstance({
        baseUrl: "https://api.example.com",
        withCache: false,
        hooks: {
          onError: onErrorSpy,
        },
      });

      const result = await api.get("/test-network");

      expect(onErrorSpy).toHaveBeenCalledTimes(1);
      expect(onErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: "fetch failed",
            status: "NETWORK_ERROR",
          }),
        }),
      );

      expect(result.error).toBeTruthy();
      expect(result.error?.status).toBe("NETWORK_ERROR");
    });

    it("should call onError hook for network errors with XMLHttpRequest", async () => {
      const onErrorSpy = vi.fn();

      const api = createInstance({
        baseUrl: "https://api.example.com",
        onUploadProgress: () => {}, // Force XMLHttpRequest usage
        withCache: false,
        hooks: {
          onError: onErrorSpy,
        },
      });

      // Mock network error with XMLHttpRequest
      mockXHR.addEventListener.mockImplementation(
        (event: string, callback: Function) => {
          if (event === "error") {
            setTimeout(callback, 0);
          }
        },
      );

      const result = await api.post("/upload-network", {
        body: { data: "test" },
      });

      expect(onErrorSpy).toHaveBeenCalledTimes(1);
      expect(onErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: "Network error",
            status: "NETWORK_ERROR",
          }),
        }),
      );

      expect(result.error).toBeTruthy();
      expect(result.error?.status).toBe("NETWORK_ERROR");
    });
  });

  describe("Timeout Error Handling", () => {
    it("should call onError hook for timeout errors with XMLHttpRequest", async () => {
      const onErrorSpy = vi.fn();

      const api = createInstance({
        baseUrl: "https://api.example.com",
        timeout: 100,
        onDownloadProgress: () => {}, // Force XMLHttpRequest usage
        withCache: false,
        hooks: {
          onError: onErrorSpy,
        },
      });

      // Mock timeout error with XMLHttpRequest
      mockXHR.addEventListener.mockImplementation(
        (event: string, callback: Function) => {
          if (event === "timeout") {
            setTimeout(callback, 0);
          }
        },
      );

      const result = await api.get("/slow-timeout");

      expect(onErrorSpy).toHaveBeenCalledTimes(1);
      expect(onErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: "Request timed out!",
            status: "TIMEOUT",
          }),
        }),
      );

      expect(result.error).toBeTruthy();
      expect(result.error?.status).toBe("TIMEOUT");
    });
  });

  describe("Parse Error Handling", () => {
    it("should NOT call onError hook for JSON parse errors in XHR", async () => {
      // Parse errors on successful responses don't create error objects
      // The data is just set to null when parsing fails
      const onErrorSpy = vi.fn();

      const api = createInstance({
        baseUrl: "https://api.example.com",
        parseJson: true,
        onUploadProgress: () => {}, // Force XMLHttpRequest usage
        withCache: false,
        hooks: {
          onError: onErrorSpy,
        },
      });

      // Mock successful response with invalid JSON
      mockXHR.status = 200;
      mockXHR.statusText = "OK";
      mockXHR.responseText = "invalid json";
      mockXHR.addEventListener.mockImplementation(
        (event: string, callback: Function) => {
          if (event === "loadend") {
            setTimeout(callback, 0);
          }
        },
      );

      const result = await api.post("/upload-parse", {
        body: { data: "test" },
      });

      // With the new behavior, parse failures just leave data as null
      // The onError hook is NOT called because response.ok was true
      expect(result.error).toBeNull();
      expect(result.data).toBeNull();
    });
  });

  describe("Error Mapping Integration", () => {
    it("should apply error mapping to HTTP errors", async () => {
      const onErrorSpy = vi.fn();

      const api = createInstance({
        baseUrl: "https://api.example.com",
        withCache: false,
        errorMapping: {
          404: "Custom mapped message for 404",
        },
        hooks: {
          onError: onErrorSpy,
        },
      });

      const result = await api.get("/notfound-mapping");

      expect(onErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: "Custom mapped message for 404",
            status: 404,
          }),
        }),
      );

      expect(result.error?.message).toBe("Custom mapped message for 404");
    });

    it("should allow onError hook to modify mapped error messages", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        withCache: false,
        errorMapping: {
          404: "Original mapped message",
        },
        hooks: {
          onError: async (context) => {
            context.setError({
              message: "Hook modified the mapped error",
              status: context.error?.status || "UNKNOWN",
            });
          },
        },
      });

      const result = await api.get("/notfound-hook-modify");

      expect(result.error?.message).toBe("Hook modified the mapped error");
      expect(result.error?.status).toBe(404);
    });
  });

  describe("Hook Context Properties", () => {
    it("should provide complete context to onError hook for HTTP errors", async () => {
      let capturedContext: Context | null = null;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        mapErrors: true, // Required to get error object for HTTP errors
        withCache: false,
        headers: {
          "X-Custom": "value",
        },
        hooks: {
          onError: async (context) => {
            capturedContext = context;
          },
        },
      });

      await api.post("/notfound-context", {
        body: { test: "data" },
        headers: { "X-Request": "header" },
      });

      expect(capturedContext).toBeTruthy();
      // Type assertion to help TypeScript understand the context
      const context = capturedContext as unknown as Context;
      expect(context.config).toBeDefined();
      expect(context.request).toMatchObject({
        method: "POST",
        url: "/notfound-context",
        options: expect.objectContaining({
          body: { test: "data" },
          headers: expect.objectContaining({
            "X-Custom": "value",
            "X-Request": "header",
          }),
        }),
      });
      expect(context.error).toMatchObject({
        status: 404,
      });
      expect(context.result).toBeNull();
      expect(typeof context.setError).toBe("function");
    });
  });

  describe("Multiple Hook Integration", () => {
    it("should work alongside onRequest and onResponse hooks when mapErrors: true", async () => {
      const onRequestSpy = vi.fn();
      const onResponseSpy = vi.fn();
      const onErrorSpy = vi.fn();

      const api = createInstance({
        baseUrl: "https://api.example.com",
        mapErrors: true,
        withCache: false,
        hooks: {
          onRequest: onRequestSpy,
          onResponse: onResponseSpy,
          onError: onErrorSpy,
        },
      });

      await api.get("/notfound-hooks");

      expect(onRequestSpy).toHaveBeenCalledTimes(1);
      expect(onErrorSpy).toHaveBeenCalledTimes(1);
      expect(onResponseSpy).toHaveBeenCalledTimes(1);
    });

    it("should not call onError when request is successful", async () => {
      mockSetup.restore();
      mockSetup = setupMockFetch({ success: true });

      const onErrorSpy = vi.fn();

      const api = createInstance({
        baseUrl: "https://api.example.com",
        withCache: false,
        hooks: {
          onError: onErrorSpy,
        },
      });

      const result = await api.get("/success");

      expect(onErrorSpy).not.toHaveBeenCalled();
      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
    });
  });
});
