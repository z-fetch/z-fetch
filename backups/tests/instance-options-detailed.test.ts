import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createInstance, GET } from "../lib/index";

describe("Instance configuration options detailed tests", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("mapErrors option on instance - native fetch behavior", () => {
    it("should NOT create error object for HTTP 400 when mapErrors: false (like native fetch)", async () => {
      const responseBody = { message: "Validation failed" };
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: async () => responseBody,
          text: async () => JSON.stringify(responseBody),
          clone: function() { return this; },
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        mapErrors: false,
        withCache: false, // Disable caching for test isolation
        errorMapping: {
          400: "Custom mapped error - should NOT be used",
        },
      });

      const result = await api.get("/test-400-no-map");

      // mapErrors: false means NO error handling for HTTP errors - like native fetch
      expect(result.error).toBeNull();
      // Response should still be available so user can check response.ok
      expect(result.response?.ok).toBe(false);
      expect(result.response?.status).toBe(400);
      // Data should still be parsed
      expect(result.data).toEqual(responseBody);
    });

    it("should NOT create error object for HTTP 500 when mapErrors: false (like native fetch)", async () => {
      const responseBody = { error: "Internal server error" };
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: async () => responseBody,
          text: async () => JSON.stringify(responseBody),
          clone: function() { return this; },
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        mapErrors: false,
        withCache: false, // Disable caching for test isolation
      });

      const result = await api.get("/test-500-no-map");

      // mapErrors: false means NO error handling for HTTP errors
      expect(result.error).toBeNull();
      expect(result.response?.ok).toBe(false);
      expect(result.response?.status).toBe(500);
      expect(result.data).toEqual(responseBody);
    });

    it("should CREATE error object and MAP backend 400 error when mapErrors: true", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: async () => ({}),
          text: async () => "",
          clone: function() { return this; },
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        mapErrors: true,
        withCache: false, // Disable caching for test isolation
        errorMapping: {
          400: "Custom mapped error - SHOULD be used",
        },
      });

      const result = await api.get("/test-400-with-map");

      expect(result.error).not.toBeNull();
      // mapErrors: true means we should get the mapped message
      expect(result.error?.message).toBe("Custom mapped error - SHOULD be used");
      expect(result.error?.status).toBe(400);
    });

    it("should create error with original statusText when mapErrors: true but no mapping provided", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: async () => ({}),
          text: async () => "",
          clone: function() { return this; },
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        mapErrors: true,
        withCache: false,
        // No errorMapping for 400
      });

      const result = await api.get("/test-400-no-mapping");

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Bad Request");
      expect(result.error?.status).toBe(400);
    });

    it("per-request mapErrors: true should override instance mapErrors: false", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: async () => ({}),
          text: async () => "",
          clone: function() { return this; },
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        mapErrors: false,
        withCache: false,
        errorMapping: {
          400: "Instance mapped error",
        },
      });

      // Override mapErrors at request level
      const result = await api.get("/test-override-to-true", {
        mapErrors: true,
      });

      expect(result.error).not.toBeNull();
      // Per-request mapErrors: true should override instance mapErrors: false
      expect(result.error?.message).toBe("Instance mapped error");
      expect(result.error?.status).toBe(400);
    });

    it("per-request mapErrors: false should override instance mapErrors: true", async () => {
      const responseBody = { message: "Error details" };
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: async () => responseBody,
          text: async () => JSON.stringify(responseBody),
          clone: function() { return this; },
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        mapErrors: true,
        withCache: false,
        errorMapping: {
          400: "Instance mapped error",
        },
      });

      // Override mapErrors at request level
      const result = await api.get("/test-override-to-false", {
        mapErrors: false,
      });

      // Per-request mapErrors: false should override instance mapErrors: true
      expect(result.error).toBeNull();
      expect(result.response?.ok).toBe(false);
      expect(result.data).toEqual(responseBody);
    });
  });

  describe("throwOnError option on instance", () => {
    it("should NOT throw when throwOnError: false with mapErrors: true", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: async () => ({}),
          text: async () => "",
          clone: function() { return this; },
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        mapErrors: true, // Need mapErrors: true to create error
        throwOnError: false,
        withCache: false,
      });

      // Should NOT throw, should return error in result
      const result = await api.get("/test-no-throw");

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Bad Request");
    });

    it("should THROW when throwOnError: true with mapErrors: true", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: async () => ({}),
          text: async () => "",
          clone: function() { return this; },
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        mapErrors: true, // Need mapErrors: true to create error
        throwOnError: true,
        withCache: false,
      });

      // Should throw
      await expect(api.get("/test-should-throw")).rejects.toMatchObject({
        message: "Bad Request",
        status: 400,
      });
    });

    it("throwOnError has no effect when mapErrors: false (no error to throw)", async () => {
      const responseBody = { message: "Error" };
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: async () => responseBody,
          text: async () => JSON.stringify(responseBody),
          clone: function() { return this; },
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        mapErrors: false,
        throwOnError: true, // This has no effect when mapErrors: false
        withCache: false,
      });

      // Should NOT throw because there's no error to throw
      const result = await api.get("/test-no-effect");

      expect(result.error).toBeNull();
      expect(result.response?.ok).toBe(false);
      expect(result.data).toEqual(responseBody);
    });

    it("per-request throwOnError should work with mapErrors: true", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: async () => ({}),
          text: async () => "",
          clone: function() { return this; },
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        mapErrors: true,
        throwOnError: false,
        withCache: false,
      });

      // Override throwOnError at request level
      await expect(api.get("/test-per-request-throw", { throwOnError: true })).rejects.toMatchObject({
        message: "Bad Request",
        status: 400,
      });
    });
  });

  describe("Combined mapErrors + throwOnError scenarios", () => {
    it("mapErrors: false + throwOnError: false = native fetch behavior", async () => {
      const responseBody = { error: "Not authorized" };
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          json: async () => responseBody,
          text: async () => JSON.stringify(responseBody),
          clone: function() { return this; },
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        mapErrors: false,
        throwOnError: false,
        withCache: false,
        errorMapping: {
          401: "Should NOT be used",
        },
      });

      const result = await api.get("/test-native-fetch");

      // Like native fetch - no error handling, just returns the response
      expect(result.error).toBeNull();
      expect(result.response?.ok).toBe(false);
      expect(result.response?.status).toBe(401);
      expect(result.data).toEqual(responseBody);
    });

    it("mapErrors: true + throwOnError: true = throw mapped error", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: async () => ({}),
          text: async () => "",
          clone: function() { return this; },
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        mapErrors: true,
        throwOnError: true,
        withCache: false,
        errorMapping: {
          400: "Mapped error",
        },
      });

      await expect(api.get("/test-throw-mapped")).rejects.toMatchObject({
        message: "Mapped error",
        status: 400,
      });
    });
  });

  describe("Config verification", () => {
    it("getConfig should return instance config with correct mapErrors value", () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        mapErrors: false,
        throwOnError: false,
        errorMapping: { 400: "test" },
      });

      const config = api.helpers.getConfig();
      expect(config.mapErrors).toBe(false);
      expect(config.throwOnError).toBe(false);
      expect(config.errorMapping).toEqual({ 400: "test" });
    });

    it("default config should have mapErrors: false", () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
      });

      const config = api.helpers.getConfig();
      expect(config.mapErrors).toBe(false);
      expect(config.throwOnError).toBe(false);
    });
  });
});
