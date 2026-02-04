import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GET, createInstance } from "../lib/index";

describe("Error Mapping functionality (Issue #5)", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("Default behavior (Implicit Error Mapping)", () => {
    it("should create error object for HTTP errors by default", async () => {
      const responseBody = { message: "Unauthorized access" };
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

      const result = await GET("https://api.example.com/test-401", {
        withCache: false,
        errorMapping: {
          401: "This IS used now",
        },
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("This IS used now");
      expect(result.response?.ok).toBe(false);
      expect(result.response?.status).toBe(401);
      expect(result.data).toEqual(responseBody);
    });

    it("should create error object for 403 status", async () => {
      const responseBody = { error: "Forbidden" };
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 403,
          statusText: "Forbidden",
          json: async () => responseBody,
          text: async () => JSON.stringify(responseBody),
          clone: function () {
            return this;
          },
        }) as any;

      const result = await GET("https://api.example.com/test-403", {
        withCache: false,
        errorMapping: {
          403: "Access Denied",
        },
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Access Denied");
      expect(result.response?.ok).toBe(false);
      expect(result.response?.status).toBe(403);
      expect(result.data).toEqual(responseBody);
    });

    it("should create error object for 404 status", async () => {
      const responseBody = { error: "Resource not found" };
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

      const result = await GET("https://api.example.com/users-404", {
        withCache: false,
      });

      // Even without specific mapping, it should create an error object using statusText
      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Not Found");
      expect(result.response?.ok).toBe(false);
      expect(result.response?.status).toBe(404);
      expect(result.data).toEqual(responseBody);
    });

    it("should create error object for 500 status", async () => {
      const responseBody = { error: "Internal error" };
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

      const result = await GET("https://api.example.com/test-500", {
        withCache: false,
        errorMapping: {
          500: "Server went boom",
        },
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Server went boom");
      expect(result.response?.ok).toBe(false);
      expect(result.response?.status).toBe(500);
      expect(result.data).toEqual(responseBody);
    });

    it("should still return response data for any HTTP error status", async () => {
      const responseBody = { error: "I'm a teapot" };
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 418,
          statusText: "I'm a teapot",
          json: async () => responseBody,
          text: async () => JSON.stringify(responseBody),
          clone: function () {
            return this;
          },
        }) as any;

      const result = await GET("https://api.example.com/test-418", {
        withCache: false,
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("I'm a teapot");
      expect(result.response?.ok).toBe(false);
      expect(result.response?.status).toBe(418);
      expect(result.data).toEqual(responseBody);
    });

    it("should map network errors (z-fetch internal errors)", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("fetch failed"));

      const result = await GET("https://api.example.com/test-network", {
        withCache: false,
        errorMapping: {
          "fetch failed": "Network connection failed",
        },
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Network connection failed");
      expect(result.error?.status).toBe("NETWORK_ERROR");
    });
  });

  describe("Specific Error Mappings", () => {
    it("should map 401 status code", async () => {
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

      const result = await GET("https://api.example.com/test-map-401", {
        withCache: false,
        errorMapping: {
          401: "Authentication failed - please sign in again",
        },
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe(
        "Authentication failed - please sign in again",
      );
      expect(result.error?.status).toBe(401);
    });

    it("should map 403 status code", async () => {
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

      const result = await GET("https://api.example.com/test-map-403", {
        withCache: false,
        errorMapping: {
          403: "Access denied - insufficient permissions",
        },
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe(
        "Access denied - insufficient permissions",
      );
      expect(result.error?.status).toBe(403);
    });

    it("should map 404 status code", async () => {
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

      const result = await GET("https://api.example.com/test-map-404", {
        withCache: false,
        errorMapping: {
          404: "Resource not found",
        },
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Resource not found");
      expect(result.error?.status).toBe(404);
    });

    it("should map 500 status code", async () => {
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

      const result = await GET("https://api.example.com/test-map-500", {
        withCache: false,
        errorMapping: {
          500: "Server error - please try again later",
        },
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe(
        "Server error - please try again later",
      );
      expect(result.error?.status).toBe(500);
    });

    it("should work with createInstance", async () => {
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
        withCache: false,
        errorMapping: {
          401: "Please log in",
          403: "Access denied",
          404: "Not found",
          500: "Server error",
        },
      });

      const result = await api.get("/test-instance-map");

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Please log in");
      expect(result.error?.status).toBe(401);
    });

    it("should fallback to original message when no mapping found", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 418,
          statusText: "I'm a teapot",
          json: async () => ({}),
          text: async () => "",
          clone: function () {
            return this;
          },
        }) as any;

      const result = await GET("https://api.example.com/test-no-mapping", {
        withCache: false,
        errorMapping: {
          401: "Authentication failed",
          500: "Server error",
        },
      });

      expect(result.error).not.toBeNull();
      // Falls back to original statusText when no mapping found
      expect(result.error?.message).toBe("I'm a teapot");
      expect(result.error?.status).toBe(418);
    });
  });

  it("should map network errors (z-fetch internal errors)", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("fetch failed"));

    const result = await GET("https://api.example.com/test-network-map", {
      withCache: false,
      errorMapping: {
        "fetch failed":
          "Network connection failed - please check your internet",
      },
    });

    expect(result.error).not.toBeNull();
    expect(result.error?.message).toBe(
      "Network connection failed - please check your internet",
    );
    expect(result.error?.status).toBe("NETWORK_ERROR");
  });

  it("should map network error patterns", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const result = await GET("https://api.example.com/test-network-pattern", {
      withCache: false,
      errorMapping: {
        "network error": "Unable to connect to server",
      },
    });

    expect(result.error).not.toBeNull();
    expect(result.error?.message).toBe("Unable to connect to server");
    expect(result.error?.status).toBe("NETWORK_ERROR");
  });

  it("should work with createInstance for network errors", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("fetch failed"));

    const api = createInstance({
      baseUrl: "https://api.example.com",
      withCache: false,
      errorMapping: {
        "fetch failed": "Network connection lost",
        "network error": "Unable to connect",
      },
    });

    const result = await api.get("/test-network-instance");

    expect(result.error).not.toBeNull();
    expect(result.error?.message).toBe("Network connection lost");
    expect(result.error?.status).toBe("NETWORK_ERROR");
  });
});
