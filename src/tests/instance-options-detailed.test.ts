import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createInstance, GET } from "../lib/index";

describe("Instance configuration options detailed tests", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("Error object creation for HTTP errors", () => {
    it("should CREATE error object for HTTP 400 (unified error handling)", async () => {
      const responseBody = { message: "Validation failed" };
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

      const api = createInstance({
        baseUrl: "https://api.example.com",
        withCache: false, // Disable caching for test isolation
        errorMapping: {
          400: "Custom mapped error - should be used",
        },
      });

      const result = await api.get("/test-400");

      // Library always creates error objects for non-2xx responses
      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe(
        "Custom mapped error - should be used",
      );
      expect(result.error?.status).toBe(400);
      // Response should still be available so user can check response.ok
      expect(result.response?.ok).toBe(false);
      expect(result.response?.status).toBe(400);
      // Data should still be parsed
      expect(result.data).toEqual(responseBody);
    });

    it("should CREATE error object for HTTP 500 (unified error handling)", async () => {
      const responseBody = { error: "Internal server error" };
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: async () => responseBody,
          text: async () => JSON.stringify(responseBody),
          clone: function () {
            return this;
          },
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        withCache: false, // Disable caching for test isolation
      });

      const result = await api.get("/test-500");

      // Library always creates error objects for non-2xx responses
      expect(result.error).not.toBeNull();
      expect(result.error?.status).toBe(500);
      expect(result.response?.ok).toBe(false);
      expect(result.response?.status).toBe(500);
      expect(result.data).toEqual(responseBody);
    });

    it("should create error with original statusText when no errorMapping provided", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: async () => ({}),
          text: async () => "",
          clone: function () {
            return this;
          },
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        withCache: false,
        // No errorMapping for 400
      });

      const result = await api.get("/test-400-no-mapping");

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Bad Request");
      expect(result.error?.status).toBe(400);
    });
  });

  describe("Error handling - library never throws", () => {
    it("should ALWAYS return error in result for HTTP errors (never throws)", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: async () => ({}),
          text: async () => "",
          clone: function () {
            return this;
          },
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        withCache: false,
      });

      // Library NEVER throws - always returns { data, error }
      const result = await api.get("/test-no-throw");

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Bad Request");
      expect(result.error?.status).toBe(400);
    });

    it("should return error with errorMapping applied", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 400,
          statusText: "Bad Request",
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
          400: "Mapped error message",
        },
      });

      // Should return error in result (never throws)
      const result = await api.get("/test-mapped-error");

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Mapped error message");
      expect(result.error?.status).toBe(400);
    });
  });

  describe("Unified error handling behavior", () => {
    it("always creates error objects for non-2xx responses", async () => {
      const responseBody = { error: "Not authorized" };
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          json: async () => responseBody,
          text: async () => JSON.stringify(responseBody),
          clone: function () {
            return this;
          },
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        withCache: false,
        errorMapping: {
          401: "Custom: Not authorized",
        },
      });

      const result = await api.get("/test-unified");

      // Library always creates error objects for non-2xx responses
      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Custom: Not authorized");
      expect(result.response?.ok).toBe(false);
      expect(result.response?.status).toBe(401);
      expect(result.data).toEqual(responseBody);
    });

    it("successful responses have null error", async () => {
      globalThis.fetch = async () =>
        ({
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({ success: true }),
          text: async () => JSON.stringify({ success: true }),
          clone: function () {
            return this;
          },
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        withCache: false,
      });

      const result = await api.get("/test-success");

      expect(result.error).toBeNull();
      expect(result.response?.ok).toBe(true);
      expect(result.data).toEqual({ success: true });
    });
  });

  describe("Config verification", () => {
    it("getConfig should return instance config", () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        errorMapping: { 400: "test" },
      });

      const config = api.helpers.getConfig();
      expect(config.errorMapping).toEqual({ 400: "test" });
      // mapErrors and throwOnError no longer exist
      expect(config.baseUrl).toBe("https://api.example.com");
    });

    it("default config works without mapErrors/throwOnError", () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
      });

      const config = api.helpers.getConfig();
      expect(config.baseUrl).toBe("https://api.example.com");
    });
  });
});
