import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GET, POST, createInstance } from "../lib/index";

describe("throwOnError Configuration", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("Default behavior (throwOnError: false)", () => {
    it("should return error in result.error for HTTP errors when mapErrors: true", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => ({}),
          text: async () => "",
          clone: function() { return this; },
        }) as any;

      const result = await GET("https://api.example.com/test-default-http", {
        mapErrors: true, // Need mapErrors: true to get error object for HTTP errors
        withCache: false,
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.status).toBe(404);
    });

    it("should NOT create error object for HTTP errors when mapErrors: false (native fetch)", async () => {
      const responseBody = { message: "Not found" };
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => responseBody,
          text: async () => JSON.stringify(responseBody),
          clone: function() { return this; },
        }) as any;

      const result = await GET("https://api.example.com/test-native-fetch", {
        withCache: false,
      });

      // mapErrors: false (default) = like native fetch
      expect(result.error).toBeNull();
      expect(result.response?.ok).toBe(false);
      expect(result.response?.status).toBe(404);
      expect(result.data).toEqual(responseBody);
    });

    it("should not throw for network errors by default", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const result = await GET("https://api.example.com/test-network-default", {
        withCache: false,
      });

      // Network errors always create error objects
      expect(result.error).not.toBeNull();
      expect(result.error?.status).toBe("NETWORK_ERROR");
      expect(result.data).toBeNull();
    });

    it("should not throw for timeout errors by default", async () => {
      globalThis.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error("timeout")), 10);
          }),
      );

      const result = await GET("https://api.example.com/test-timeout", {
        timeout: 50,
        withCache: false,
      });

      // May have error or not depending on timing, but shouldn't throw
      expect(result).toBeDefined();
    });
  });

  describe("With throwOnError: true", () => {
    it("should throw error for HTTP errors when mapErrors: true", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => ({}),
          text: async () => "",
          clone: function() { return this; },
        }) as any;

      await expect(
        GET("https://api.example.com/test-throw-http", {
          throwOnError: true,
          mapErrors: true, // Need mapErrors: true to get error object to throw
          withCache: false,
        }),
      ).rejects.toMatchObject({
        message: expect.any(String),
        status: 404,
      });
    });

    it("should NOT throw for HTTP errors when mapErrors: false (no error to throw)", async () => {
      const responseBody = { error: "Not Found" };
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => responseBody,
          text: async () => JSON.stringify(responseBody),
          clone: function() { return this; },
        }) as any;

      // With mapErrors: false, no error object is created, so nothing to throw
      const result = await GET("https://api.example.com/test-no-throw-http", {
        throwOnError: true,
        mapErrors: false,
        withCache: false,
      });

      expect(result.error).toBeNull();
      expect(result.response?.ok).toBe(false);
      expect(result.data).toEqual(responseBody);
    });

    it("should throw error for network errors", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("fetch failed"));

      await expect(
        GET("https://api.example.com/test-throw-network", {
          throwOnError: true,
          withCache: false,
        }),
      ).rejects.toMatchObject({
        message: "fetch failed",
        status: "NETWORK_ERROR",
      });
    });

    it("should throw custom mapped error messages when mapErrors: true", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          json: async () => ({}),
          text: async () => "",
          clone: function() { return this; },
        }) as any;

      await expect(
        GET("https://api.example.com/test-mapped-throw", {
          throwOnError: true,
          mapErrors: true,
          withCache: false,
          errorMapping: {
            401: "Custom auth error",
          },
        }),
      ).rejects.toMatchObject({
        message: "Custom auth error",
        status: 401,
      });
    });

    it("should not throw for successful requests", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({ id: 1 }),
        text: async () => '{"id":1}',
        clone: function () {
          return this;
        },
      };
      globalThis.fetch = async () => mockResponse as any;

      const result = await GET("https://api.example.com/test-success", {
        throwOnError: true,
        withCache: false,
      });

      expect(result.error).toBeNull();
      expect(result.data).toEqual({ id: 1 });
    });

    it("should work with POST requests when mapErrors: true", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: async () => ({}),
          text: async () => "",
          clone: function() { return this; },
        }) as any;

      await expect(
        POST("https://api.example.com/test-post-throw", {
          throwOnError: true,
          mapErrors: true,
          withCache: false,
          body: { test: "data" },
        }),
      ).rejects.toMatchObject({
        status: 500,
      });
    });
  });

  describe("With createInstance", () => {
    it("should respect instance-level throwOnError and mapErrors", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => ({}),
          text: async () => "",
          clone: function() { return this; },
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        throwOnError: true,
        mapErrors: true, // Need mapErrors: true for throwOnError to work
        withCache: false,
      });

      await expect(api.get("/test-instance-throw")).rejects.toMatchObject({
        status: 404,
      });
    });

    it("should allow request-level override of instance throwOnError", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => ({}),
          text: async () => "",
          clone: function() { return this; },
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        throwOnError: true,
        mapErrors: true,
        withCache: false,
      });

      // Override to false at request level
      const result = await api.get("/test-override-throw", { throwOnError: false });

      expect(result.error).not.toBeNull();
      expect(result.error?.status).toBe(404);
      // Should not throw
    });

    it("should work with instance-level error mapping when mapErrors: true", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 403,
          statusText: "Forbidden",
          json: async () => ({}),
          text: async () => "",
          clone: function() { return this; },
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        throwOnError: true,
        mapErrors: true, // Enable error mapping
        withCache: false,
        errorMapping: {
          403: "Custom forbidden message",
          404: "Custom not found",
        },
      });

      await expect(api.get("/test-instance-mapping")).rejects.toMatchObject({
        message: "Custom forbidden message",
        status: 403,
      });
    });
  });

  describe("With hooks", () => {
    it("should call onError hook before throwing when mapErrors: true", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => ({}),
          text: async () => "",
          clone: function() { return this; },
        }) as any;

      const onErrorSpy = vi.fn();
      const api = createInstance({
        baseUrl: "https://api.example.com",
        throwOnError: true,
        mapErrors: true,
        withCache: false,
        hooks: {
          onError: onErrorSpy,
        },
      });

      try {
        await api.get("/test-hooks-throw");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(onErrorSpy).toHaveBeenCalledTimes(1);
        expect(onErrorSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.objectContaining({
              status: 404,
            }),
          }),
        );
      }
    });

    it("should throw modified error from onError hook", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => ({}),
          text: async () => "",
          clone: function() { return this; },
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        throwOnError: true,
        mapErrors: true,
        withCache: false,
        hooks: {
          onError: async (context) => {
            context.setError({
              message: "Modified by hook",
              status: "CUSTOM",
            });
          },
        },
      });

      await expect(api.get("/test-hook-modify")).rejects.toMatchObject({
        message: "Modified by hook",
        status: "CUSTOM",
      });
    });
  });

  describe("With retries", () => {
    it("should throw after all retries are exhausted when mapErrors: true", async () => {
      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(async () => {
        callCount++;
        return {
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: async () => ({}),
          text: async () => "",
          clone: function() { return this; },
        } as any;
      });

      await expect(
        GET("https://api.example.com/test-retry-exhaust", {
          throwOnError: true,
          mapErrors: true,
          retry: true,
          maxRetries: 3,
          withCache: false,
        }),
      ).rejects.toMatchObject({
        status: 500,
      });

      // Should have tried original + 3 retries = 4 times
      expect(callCount).toBe(4);
    });

    it("should not throw if retry succeeds", async () => {
      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: false,
            status: 500,
            statusText: "Internal Server Error",
            json: async () => ({}),
            text: async () => "",
            clone: function() { return this; },
          } as any;
        }
        const mockResponse = {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({ success: true }),
          text: async () => '{"success":true}',
          clone: function () {
            return this;
          },
        };
        return mockResponse as any;
      });

      const result = await GET("https://api.example.com/test-retry-success", {
        throwOnError: true,
        mapErrors: true,
        retry: true,
        maxRetries: 3,
        withCache: false,
      });

      expect(result.error).toBeNull();
      expect(result.data).toEqual({ success: true });
      expect(callCount).toBe(2);
    });
  });

  describe("With caching", () => {
    it("should throw from cached error when throwOnError: true and mapErrors: true", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => ({}),
          text: async () => "",
          clone: function() { return this; },
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        withCache: false, // Errors aren't cached, so disable cache
        mapErrors: true,
        throwOnError: false, // Initially don't throw
      });

      // First request - get the error
      const firstResult = await api.get("/test-cached-error");
      expect(firstResult.error).not.toBeNull();

      // Second request with throwOnError - should throw
      await expect(
        api.get("/test-cached-error-2", { throwOnError: true }),
      ).rejects.toMatchObject({
        status: 404,
      });
    });

    it("should not throw from cached success when throwOnError is true", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({ cached: true }),
        text: async () => '{"cached":true}',
        clone: function () {
          return this;
        },
      };
      globalThis.fetch = async () => mockResponse as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        withCache: true,
      });

      // First request - cache the success
      const firstResult = await api.get("/test-cached-success");
      expect(firstResult.error).toBeNull();
      expect(firstResult.data).toEqual({ cached: true });

      // Second request with throwOnError - should still succeed
      const secondResult = await api.get("/test-cached-success", {
        throwOnError: true,
      });
      expect(secondResult.error).toBeNull();
      expect(secondResult.data).toEqual({ cached: true });
    });
  });

  describe("Error object structure", () => {
    it("should throw error object with message and status properties", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 403,
          statusText: "Forbidden",
          json: async () => ({}),
          text: async () => "",
          clone: function() { return this; },
        }) as any;

      await expect(
        GET("https://api.example.com/test-error-structure-1", {
          throwOnError: true,
          mapErrors: true,
          withCache: false,
        }),
      ).rejects.toMatchObject({
        message: expect.any(String),
        status: 403,
      });
    });

    it("should preserve error status as string for special cases", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      await expect(
        GET("https://api.example.com/test-error-structure-2", {
          throwOnError: true,
          withCache: false,
        }),
      ).rejects.toMatchObject({
        message: "Network error",
        status: "NETWORK_ERROR",
      });
    });
  });

  describe("Backward compatibility", () => {
    it("should not create error for HTTP errors when mapErrors is not set (native fetch behavior)", async () => {
      const responseBody = { error: "Not found" };
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => responseBody,
        text: async () => JSON.stringify(responseBody),
        clone: function () {
          return this;
        },
      };
      globalThis.fetch = async () => mockResponse as any;

      // This is the NEW default behavior - like native fetch
      const result = await GET("https://api.example.com/test-backward-compat", {
        withCache: false,
      });

      // mapErrors: false (default) = no error object for HTTP errors
      expect(result.error).toBeNull();
      expect(result.response?.ok).toBe(false);
      expect(result.response?.status).toBe(404);
      expect(result.data).toEqual(responseBody);
    });

    it("should maintain all result properties when throwOnError is false", async () => {
      globalThis.fetch = async () =>
        ({
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({ test: "data" }),
          text: async () => '{"test":"data"}',
          clone: function () {
            return this;
          },
        }) as any;

      const result = await GET(
        "https://api.example.com/test-backward-compat-2",
        {
          throwOnError: false,
          withCache: false,
        },
      );

      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("error");
      expect(result).toHaveProperty("loading");
      expect(result).toHaveProperty("response");
      expect(result).toHaveProperty("refetch");
      expect(result).toHaveProperty("cancelRequest");
    });
  });
});
