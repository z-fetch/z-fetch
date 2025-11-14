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
    it("should return error in result.error by default", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => ({}),
          text: async () => "",
        }) as any;

      const result = await GET("https://api.example.com/test");

      expect(result.error).not.toBeNull();
      expect(result.error?.status).toBe(404);
      expect(result.data).toBeNull();
    });

    it("should not throw for network errors by default", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const result = await GET("https://api.example.com/test");

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

      const result = await GET("https://api.example.com/test", {
        timeout: 50,
      });

      // May have error or not depending on timing, but shouldn't throw
      expect(result).toBeDefined();
    });
  });

  describe("With throwOnError: true", () => {
    it("should throw error for HTTP errors", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => ({}),
          text: async () => "",
        }) as any;

      await expect(
        GET("https://api.example.com/test", { throwOnError: true }),
      ).rejects.toMatchObject({
        message: expect.any(String),
        status: 404,
      });
    });

    it("should throw error for network errors", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("fetch failed"));

      await expect(
        GET("https://api.example.com/test", { throwOnError: true }),
      ).rejects.toMatchObject({
        message: "fetch failed",
        status: "NETWORK_ERROR",
      });
    });

    it("should throw custom mapped error messages", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          json: async () => ({}),
          text: async () => "",
        }) as any;

      await expect(
        GET("https://api.example.com/test", {
          throwOnError: true,
          errorMapping: {
            401: "Custom authentication error",
          },
        }),
      ).rejects.toMatchObject({
        message: "Custom authentication error",
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

      const result = await GET("https://api.example.com/test", {
        throwOnError: true,
      });

      expect(result.error).toBeNull();
      expect(result.data).toEqual({ id: 1 });
    });

    it("should work with POST requests", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: async () => ({}),
          text: async () => "",
        }) as any;

      await expect(
        POST("https://api.example.com/test", {
          throwOnError: true,
          body: { test: "data" },
        }),
      ).rejects.toMatchObject({
        status: 500,
      });
    });
  });

  describe("With createInstance", () => {
    it("should respect instance-level throwOnError configuration", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => ({}),
          text: async () => "",
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        throwOnError: true,
      });

      await expect(api.get("/test")).rejects.toMatchObject({
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
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        throwOnError: true,
      });

      // Override to false at request level
      const result = await api.get("/test", { throwOnError: false });

      expect(result.error).not.toBeNull();
      expect(result.error?.status).toBe(404);
      // Should not throw
    });

    it("should work with instance-level error mapping", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 403,
          statusText: "Forbidden",
          json: async () => ({}),
          text: async () => "",
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        throwOnError: true,
        errorMapping: {
          403: "Access forbidden",
          404: "Not found",
        },
      });

      await expect(api.get("/test")).rejects.toMatchObject({
        message: "Access forbidden",
        status: 403,
      });
    });
  });

  describe("With hooks", () => {
    it("should call onError hook before throwing", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => ({}),
          text: async () => "",
        }) as any;

      const onErrorSpy = vi.fn();
      const api = createInstance({
        baseUrl: "https://api.example.com",
        throwOnError: true,
        hooks: {
          onError: onErrorSpy,
        },
      });

      try {
        await api.get("/test");
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
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        throwOnError: true,
        hooks: {
          onError: async (context) => {
            context.setError({
              message: "Modified by hook",
              status: "CUSTOM",
            });
          },
        },
      });

      await expect(api.get("/test")).rejects.toMatchObject({
        message: "Modified by hook",
        status: "CUSTOM",
      });
    });
  });

  describe("With retries", () => {
    it("should throw after all retries are exhausted", async () => {
      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(async () => {
        callCount++;
        return {
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: async () => ({}),
          text: async () => "",
        } as any;
      });

      await expect(
        GET("https://api.example.com/test", {
          throwOnError: true,
          retry: true,
          maxRetries: 3,
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

      const result = await GET("https://api.example.com/test", {
        throwOnError: true,
        retry: true,
        maxRetries: 3,
      });

      expect(result.error).toBeNull();
      expect(result.data).toEqual({ success: true });
      expect(callCount).toBe(2);
    });
  });

  describe("With caching", () => {
    it("should throw from cached error when throwOnError is true", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => ({}),
          text: async () => "",
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        withCache: true,
        throwOnError: false, // Initially don't throw
      });

      // First request - cache the error
      const firstResult = await api.get("/test");
      expect(firstResult.error).not.toBeNull();

      // Second request with throwOnError - should throw from cache
      await expect(
        api.get("/test", { throwOnError: true }),
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
      const firstResult = await api.get("/test");
      expect(firstResult.error).toBeNull();
      expect(firstResult.data).toEqual({ cached: true });

      // Second request with throwOnError - should still succeed
      const secondResult = await api.get("/test", { throwOnError: true });
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
        }) as any;

      await expect(
        GET("https://api.example.com/test-error-structure-1", {
          throwOnError: true,
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
    it("should not affect existing code that doesn't use throwOnError", async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => {
          throw new Error("Response not ok");
        },
        text: async () => "Not Found",
        clone: function () {
          return this;
        },
      };
      globalThis.fetch = async () => mockResponse as any;

      // This is how users have been using z-fetch
      const result = await GET("https://api.example.com/test-backward-compat", {
        withCache: false,
      });

      // Should still work the old way - returning error in result
      expect(result.error).not.toBeNull();
      expect(result.error?.status).toBe(404);
      expect(result.data).toBeNull();
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
