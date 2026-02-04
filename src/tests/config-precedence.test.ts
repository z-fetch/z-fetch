import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createInstance, GET, POST } from "../lib/index";

/**
 * Unit tests for global config vs per-request config behavior.
 * These tests use mocked fetch to verify configuration precedence.
 */
describe("Global Config vs Per-Request Config Unit Tests", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("Direct function calls (global defaults)", () => {
    it("GET should create error object for non-2xx responses", async () => {
      const responseBody = { error: "Not found" };
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => responseBody,
          text: async () => JSON.stringify(responseBody),
          clone: function () {
            return this;
          },
        }) as any;

      const result = await GET("https://api.example.com/test-error", {
        withCache: false,
      });

      // Library always creates error objects for non-2xx responses
      expect(result.error).not.toBeNull();
      expect(result.error?.status).toBe(404);
      expect(result.response?.ok).toBe(false);
      expect(result.response?.status).toBe(404);
      expect(result.data).toEqual(responseBody);
    });

    it("POST should create error object for non-2xx responses", async () => {
      const responseBody = { error: "Bad Request" };
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: async () => responseBody,
          text: async () => JSON.stringify(responseBody),
          clone: function () {
            return this;
          },
        }) as any;

      const result = await POST("https://api.example.com/test-post-error", {
        body: { test: "data" },
        withCache: false,
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.status).toBe(400);
      expect(result.response?.ok).toBe(false);
      expect(result.data).toEqual(responseBody);
    });

    it("successful responses should have null error", async () => {
      const responseBody = { success: true };
      globalThis.fetch = async () =>
        ({
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => responseBody,
          text: async () => JSON.stringify(responseBody),
          clone: function () {
            return this;
          },
        }) as any;

      const result = await GET("https://api.example.com/test-success", {
        withCache: false,
      });

      expect(result.error).toBeNull();
      expect(result.response?.ok).toBe(true);
      expect(result.data).toEqual(responseBody);
    });
  });

  describe("Instance config isolation", () => {
    it("different instances should have isolated configs", async () => {
      // Setup mock for 400 error
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: async () => ({ error: "validation" }),
          text: async () => JSON.stringify({ error: "validation" }),
          clone: function () {
            return this;
          },
        }) as any;

      // Both instances now always create error objects for non-2xx
      const api1 = createInstance({
        baseUrl: "https://api.example.com",
        withCache: false,
      });

      const api2 = createInstance({
        baseUrl: "https://api.example.com",
        withCache: false,
      });

      // Both should have error objects (new unified behavior)
      const result1 = await api1.get("/test-isolation-1");
      expect(result1.error).not.toBeNull();
      expect(result1.error?.status).toBe(400);

      const result2 = await api2.get("/test-isolation-2");
      expect(result2.error).not.toBeNull();
      expect(result2.error?.status).toBe(400);
    });

    it("instance config changes should not affect other instances", () => {
      const api1 = createInstance({
        baseUrl: "https://api1.example.com",
        errorMapping: { 404: "Not Found - API1" },
      });

      const api2 = createInstance({
        baseUrl: "https://api2.example.com",
        errorMapping: { 404: "Not Found - API2" },
      });

      const config1 = api1.helpers.getConfig();
      const config2 = api2.helpers.getConfig();

      expect(config1.baseUrl).toBe("https://api1.example.com");
      expect(config1.errorMapping).toEqual({ 404: "Not Found - API1" });

      expect(config2.baseUrl).toBe("https://api2.example.com");
      expect(config2.errorMapping).toEqual({ 404: "Not Found - API2" });
    });
  });

  describe("errorMapping precedence", () => {
    it("per-request errorMapping overrides instance errorMapping", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => ({}),
          text: async () => "",
          clone: function () {
            return this;
          },
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        withCache: false,
        errorMapping: {
          404: "Instance: Resource not found",
        },
      });

      // Per-request override
      const result = await api.get("/test-override-mapping", {
        errorMapping: {
          404: "Request: Custom not found message",
        },
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Request: Custom not found message");
    });

    it("per-request errorMapping merges with instance errorMapping", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: async () => ({}),
          text: async () => "",
          clone: function () {
            return this;
          },
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        withCache: false,
        errorMapping: {
          404: "Instance: Not Found",
          500: "Instance: Server Error",
        },
      });

      // Per-request provides different 500 mapping
      const result = await api.get("/test-merge-mapping", {
        errorMapping: {
          500: "Request: Server down",
        },
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Request: Server down");
    });
  });

  describe("headers precedence", () => {
    it("per-request headers should merge with instance headers", async () => {
      let capturedHeaders: any = null;
      globalThis.fetch = async (_url: any, options: any) => {
        capturedHeaders = options?.headers;
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
          text: async () => JSON.stringify({ success: true }),
          clone: function () {
            return this;
          },
        } as any;
      };

      const api = createInstance({
        baseUrl: "https://api.example.com",
        headers: {
          "X-Instance-Header": "instance-value",
          Authorization: "Bearer instance-token",
        },
        withCache: false,
      });

      await api.get("/test-headers-merge", {
        headers: {
          "X-Request-Header": "request-value",
        },
      });

      expect(capturedHeaders).toMatchObject({
        "X-Instance-Header": "instance-value",
        Authorization: "Bearer instance-token",
        "X-Request-Header": "request-value",
      });
    });

    it("per-request headers should override same instance headers", async () => {
      let capturedHeaders: any = null;
      globalThis.fetch = async (_url: any, options: any) => {
        capturedHeaders = options?.headers;
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
          text: async () => JSON.stringify({ success: true }),
          clone: function () {
            return this;
          },
        } as any;
      };

      const api = createInstance({
        baseUrl: "https://api.example.com",
        headers: {
          Authorization: "Bearer instance-token",
        },
        withCache: false,
      });

      await api.get("/test-headers-override", {
        headers: {
          Authorization: "Bearer request-token",
        },
      });

      expect(capturedHeaders?.["Authorization"]).toBe("Bearer request-token");
    });
  });

  describe("Combined config scenarios", () => {
    it("errorMapping is always applied to HTTP errors", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          json: async () => ({}),
          text: async () => "",
          clone: function () {
            return this;
          },
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        errorMapping: {
          401: "Please log in to continue",
        },
        withCache: false,
      });

      const result = await api.get("/test-mapped-error");

      // Library never throws, always returns { data, error }
      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Please log in to continue");
      expect(result.error?.status).toBe(401);
    });

    it("complex scenario: instance + per-request with errorMapping", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 403,
          statusText: "Forbidden",
          json: async () => ({}),
          text: async () => "",
          clone: function () {
            return this;
          },
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        withCache: false,
        errorMapping: {
          403: "Instance: Access denied",
        },
      });

      // Per-request: provide different error mapping
      const result = await api.get("/test-complex", {
        errorMapping: {
          403: "Request: You don't have permission",
        },
      });

      // Should return error in result (never throws)
      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Request: You don't have permission");
      expect(result.error?.status).toBe(403);
    });
  });

  describe("Default values verification", () => {
    it("createInstance with no options should use defaults", () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
      });

      const config = api.helpers.getConfig();

      // mapErrors and throwOnError no longer exist in config
      expect(config.baseUrl).toBe("https://api.example.com");
    });
  });
});
