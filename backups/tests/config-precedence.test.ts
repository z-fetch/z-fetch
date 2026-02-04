import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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
    it("GET should use global default mapErrors: false", async () => {
      const responseBody = { error: "Not found" };
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => responseBody,
          text: async () => JSON.stringify(responseBody),
          clone: function () { return this; },
        }) as any;

      const result = await GET("https://api.example.com/test-global-default", {
        withCache: false,
      });

      // Global default mapErrors: false = no error object, like native fetch
      expect(result.error).toBeNull();
      expect(result.response?.ok).toBe(false);
      expect(result.response?.status).toBe(404);
      expect(result.data).toEqual(responseBody);
    });

    it("POST should use global default mapErrors: false", async () => {
      const responseBody = { error: "Bad Request" };
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: async () => responseBody,
          text: async () => JSON.stringify(responseBody),
          clone: function () { return this; },
        }) as any;

      const result = await POST("https://api.example.com/test-post-default", {
        body: { test: "data" },
        withCache: false,
      });

      expect(result.error).toBeNull();
      expect(result.response?.ok).toBe(false);
      expect(result.data).toEqual(responseBody);
    });

    it("direct calls can override mapErrors per-request", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => ({}),
          text: async () => "",
          clone: function () { return this; },
        }) as any;

      const result = await GET("https://api.example.com/test-direct-override", {
        mapErrors: true, // Override global default
        withCache: false,
      });

      // Per-request mapErrors: true should create error object
      expect(result.error).not.toBeNull();
      expect(result.error?.status).toBe(404);
    });

    it("direct calls can override throwOnError per-request", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: async () => ({}),
          text: async () => "",
          clone: function () { return this; },
        }) as any;

      // Need both mapErrors: true and throwOnError: true for throw
      await expect(
        GET("https://api.example.com/test-direct-throw", {
          mapErrors: true,
          throwOnError: true,
          withCache: false,
        })
      ).rejects.toMatchObject({
        status: 500,
      });
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
          clone: function () { return this; },
        }) as any;

      // Instance with mapErrors: true
      const apiWithErrors = createInstance({
        baseUrl: "https://api.example.com",
        mapErrors: true,
        withCache: false,
      });

      // Instance with mapErrors: false
      const apiNativeFetch = createInstance({
        baseUrl: "https://api.example.com",
        mapErrors: false,
        withCache: false,
      });

      // apiWithErrors should have error object
      const result1 = await apiWithErrors.get("/test-isolation-1");
      expect(result1.error).not.toBeNull();
      expect(result1.error?.status).toBe(400);

      // apiNativeFetch should NOT have error object
      const result2 = await apiNativeFetch.get("/test-isolation-2");
      expect(result2.error).toBeNull();
      expect(result2.response?.ok).toBe(false);
    });

    it("instance config changes should not affect other instances", () => {
      const api1 = createInstance({
        baseUrl: "https://api1.example.com",
        mapErrors: true,
        throwOnError: true,
        errorMapping: { 404: "Not Found - API1" },
      });

      const api2 = createInstance({
        baseUrl: "https://api2.example.com",
        mapErrors: false,
        throwOnError: false,
        errorMapping: { 404: "Not Found - API2" },
      });

      const config1 = api1.helpers.getConfig();
      const config2 = api2.helpers.getConfig();

      expect(config1.baseUrl).toBe("https://api1.example.com");
      expect(config1.mapErrors).toBe(true);
      expect(config1.throwOnError).toBe(true);
      expect(config1.errorMapping).toEqual({ 404: "Not Found - API1" });

      expect(config2.baseUrl).toBe("https://api2.example.com");
      expect(config2.mapErrors).toBe(false);
      expect(config2.throwOnError).toBe(false);
      expect(config2.errorMapping).toEqual({ 404: "Not Found - API2" });
    });
  });

  describe("Config precedence (per-request overrides instance)", () => {
    describe("mapErrors precedence", () => {
      it("per-request mapErrors: true overrides instance mapErrors: false", async () => {
        globalThis.fetch = async () =>
          ({
            ok: false,
            status: 403,
            statusText: "Forbidden",
            json: async () => ({}),
            text: async () => "",
            clone: function () { return this; },
          }) as any;

        const api = createInstance({
          baseUrl: "https://api.example.com",
          mapErrors: false, // Instance default
          withCache: false,
        });

        // Per-request override
        const result = await api.get("/test-override-map-true", {
          mapErrors: true,
        });

        expect(result.error).not.toBeNull();
        expect(result.error?.status).toBe(403);
      });

      it("per-request mapErrors: false overrides instance mapErrors: true", async () => {
        const responseBody = { error: "Forbidden" };
        globalThis.fetch = async () =>
          ({
            ok: false,
            status: 403,
            statusText: "Forbidden",
            json: async () => responseBody,
            text: async () => JSON.stringify(responseBody),
            clone: function () { return this; },
          }) as any;

        const api = createInstance({
          baseUrl: "https://api.example.com",
          mapErrors: true, // Instance default
          withCache: false,
        });

        // Per-request override
        const result = await api.get("/test-override-map-false", {
          mapErrors: false,
        });

        expect(result.error).toBeNull();
        expect(result.response?.ok).toBe(false);
        expect(result.data).toEqual(responseBody);
      });
    });

    describe("throwOnError precedence", () => {
      it("per-request throwOnError: true overrides instance throwOnError: false", async () => {
        globalThis.fetch = async () =>
          ({
            ok: false,
            status: 500,
            statusText: "Internal Server Error",
            json: async () => ({}),
            text: async () => "",
            clone: function () { return this; },
          }) as any;

        const api = createInstance({
          baseUrl: "https://api.example.com",
          mapErrors: true, // Need mapErrors: true for error to throw
          throwOnError: false, // Instance default
          withCache: false,
        });

        // Per-request override
        await expect(
          api.get("/test-override-throw-true", { throwOnError: true })
        ).rejects.toMatchObject({
          status: 500,
        });
      });

      it("per-request throwOnError: false overrides instance throwOnError: true", async () => {
        globalThis.fetch = async () =>
          ({
            ok: false,
            status: 500,
            statusText: "Internal Server Error",
            json: async () => ({}),
            text: async () => "",
            clone: function () { return this; },
          }) as any;

        const api = createInstance({
          baseUrl: "https://api.example.com",
          mapErrors: true,
          throwOnError: true, // Instance default
          withCache: false,
        });

        // Per-request override
        const result = await api.get("/test-override-throw-false", {
          throwOnError: false,
        });

        // Should NOT throw, should return error in result
        expect(result.error).not.toBeNull();
        expect(result.error?.status).toBe(500);
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
            clone: function () { return this; },
          }) as any;

        const api = createInstance({
          baseUrl: "https://api.example.com",
          mapErrors: true,
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
            clone: function () { return this; },
          }) as any;

        const api = createInstance({
          baseUrl: "https://api.example.com",
          mapErrors: true,
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
            clone: function () { return this; },
          } as any;
        };

        const api = createInstance({
          baseUrl: "https://api.example.com",
          headers: {
            "X-Instance-Header": "instance-value",
            "Authorization": "Bearer instance-token",
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
          "Authorization": "Bearer instance-token",
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
            clone: function () { return this; },
          } as any;
        };

        const api = createInstance({
          baseUrl: "https://api.example.com",
          headers: {
            "Authorization": "Bearer instance-token",
          },
          withCache: false,
        });

        await api.get("/test-headers-override", {
          headers: {
            "Authorization": "Bearer request-token",
          },
        });

        expect(capturedHeaders?.["Authorization"]).toBe("Bearer request-token");
      });
    });
  });

  describe("Combined config scenarios", () => {
    it("mapErrors: false + throwOnError: true = no throw (no error to throw)", async () => {
      const responseBody = { error: "Not found" };
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => responseBody,
          text: async () => JSON.stringify(responseBody),
          clone: function () { return this; },
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        mapErrors: false, // No error object created
        throwOnError: true, // Has no effect
        withCache: false,
      });

      // Should NOT throw because mapErrors: false means no error object
      const result = await api.get("/test-no-throw");

      expect(result.error).toBeNull();
      expect(result.response?.ok).toBe(false);
      expect(result.data).toEqual(responseBody);
    });

    it("mapErrors: true + throwOnError: false = error in result, no throw", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: async () => ({}),
          text: async () => "",
          clone: function () { return this; },
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        mapErrors: true,
        throwOnError: false,
        withCache: false,
      });

      const result = await api.get("/test-error-no-throw");

      expect(result.error).not.toBeNull();
      expect(result.error?.status).toBe(400);
    });

    it("mapErrors: true + throwOnError: true + errorMapping = throw mapped error", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          json: async () => ({}),
          text: async () => "",
          clone: function () { return this; },
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        mapErrors: true,
        throwOnError: true,
        errorMapping: {
          401: "Please log in to continue",
        },
        withCache: false,
      });

      await expect(api.get("/test-throw-mapped")).rejects.toMatchObject({
        message: "Please log in to continue",
        status: 401,
      });
    });

    it("complex scenario: instance + per-request overrides", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 403,
          statusText: "Forbidden",
          json: async () => ({}),
          text: async () => "",
          clone: function () { return this; },
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        mapErrors: false, // Instance: no error
        throwOnError: false, // Instance: no throw
        withCache: false,
        errorMapping: {
          403: "Instance: Access denied",
        },
      });

      // Per-request: enable error mapping and throwing
      await expect(
        api.get("/test-complex", {
          mapErrors: true,
          throwOnError: true,
          errorMapping: {
            403: "Request: You don't have permission",
          },
        })
      ).rejects.toMatchObject({
        message: "Request: You don't have permission",
        status: 403,
      });
    });
  });

  describe("Default values verification", () => {
    it("createInstance with no options should use defaults", () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
      });

      const config = api.helpers.getConfig();

      expect(config.mapErrors).toBe(false);
      expect(config.throwOnError).toBe(false);
    });

    it("createInstance should preserve explicitly set false values", () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        mapErrors: false,
        throwOnError: false,
      });

      const config = api.helpers.getConfig();

      expect(config.mapErrors).toBe(false);
      expect(config.throwOnError).toBe(false);
    });

    it("createInstance should preserve explicitly set true values", () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        mapErrors: true,
        throwOnError: true,
      });

      const config = api.helpers.getConfig();

      expect(config.mapErrors).toBe(true);
      expect(config.throwOnError).toBe(true);
    });
  });
});
