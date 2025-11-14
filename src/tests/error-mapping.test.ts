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

  describe("Default behavior (mapBackendErrors: false)", () => {
    it("should NOT map HTTP status codes by default - return backend errors as-is", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          json: async () => ({}),
          text: async () => "",
        }) as any;

      const result = await GET("https://api.example.com/test", {
        errorMapping: {
          401: "This should NOT be used when mapBackendErrors is false",
        },
      });

      expect(result.error).not.toBeNull();
      // Should use original statusText, NOT the mapped message
      expect(result.error?.message).toBe("Unauthorized");
      expect(result.error?.status).toBe(401);
    });

    it("should NOT map 403 status code by default - return backend error as-is", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 403,
          statusText: "Forbidden",
          json: async () => ({}),
          text: async () => "",
        }) as any;

      const result = await GET("https://api.example.com/test", {
        errorMapping: {
          403: "This should NOT be used when mapBackendErrors is false",
        },
    });

    expect(result.error).not.toBeNull();
    // Should use original statusText, NOT the mapped message
    expect(result.error?.message).toBe("Forbidden");
    expect(result.error?.status).toBe(403);
  });

  it("should NOT map 404 status code - return backend error as-is", async () => {
    globalThis.fetch = async () =>
      ({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({}),
        text: async () => "",
      }) as any;

    const result = await GET("https://api.example.com/users", {
      errorMapping: {
        404: "This should NOT be used",
      },
    });

    expect(result.error).not.toBeNull();
    // Should use original statusText, NOT the mapped message
    expect(result.error?.message).toBe("Not Found");
    expect(result.error?.status).toBe(404);
  });

  it("should NOT map 500 status code - return backend error as-is", async () => {
    globalThis.fetch = async () =>
      ({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({}),
        text: async () => "",
      }) as any;

    const result = await GET("https://api.example.com/test", {
      errorMapping: {
        500: "This should NOT be used",
      },
    });

    expect(result.error).not.toBeNull();
    // Should use original statusText, NOT the mapped message
    expect(result.error?.message).toBe("Internal Server Error");
    expect(result.error?.status).toBe(500);
  });

  it("should always return original backend error message", async () => {
    globalThis.fetch = async () =>
      ({
        ok: false,
        status: 418,
        statusText: "I'm a teapot",
        json: async () => ({}),
        text: async () => "",
      }) as any;

    const result = await GET("https://api.example.com/test", {
      errorMapping: {
        418: "This should NOT be used",
        401: "Authentication failed",
        500: "Server error",
      },
    });

    expect(result.error).not.toBeNull();
    // Always use original statusText for backend errors by default
    expect(result.error?.message).toBe("I'm a teapot");
    expect(result.error?.status).toBe(418);
    });

    it("should map network errors (z-fetch internal errors) even when mapBackendErrors is false", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("fetch failed"));

      const result = await GET("https://api.example.com/test", {
        errorMapping: {
          "fetch failed": "Network connection failed",
        },
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Network connection failed");
      expect(result.error?.status).toBe("NETWORK_ERROR");
    });
  });

  describe("With mapBackendErrors: true", () => {
    it("should map 401 status code when enabled", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          json: async () => ({}),
          text: async () => "",
        }) as any;

      const result = await GET("https://api.example.com/test", {
        mapBackendErrors: true,
        errorMapping: {
          401: "Authentication failed - please sign in again",
        },
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Authentication failed - please sign in again");
      expect(result.error?.status).toBe(401);
    });

    it("should map 403 status code when enabled", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 403,
          statusText: "Forbidden",
          json: async () => ({}),
          text: async () => "",
        }) as any;

      const result = await GET("https://api.example.com/test", {
        mapBackendErrors: true,
        errorMapping: {
          403: "Access denied - insufficient permissions",
        },
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Access denied - insufficient permissions");
      expect(result.error?.status).toBe(403);
    });

    it("should map 404 status code when enabled", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 404,
          statusText: "Not Found",
          json: async () => ({}),
          text: async () => "",
        }) as any;

      const result = await GET("https://api.example.com/test", {
        mapBackendErrors: true,
        errorMapping: {
          404: "Resource not found",
        },
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Resource not found");
      expect(result.error?.status).toBe(404);
    });

    it("should map 500 status code when enabled", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: async () => ({}),
          text: async () => "",
        }) as any;

      const result = await GET("https://api.example.com/test", {
        mapBackendErrors: true,
        errorMapping: {
          500: "Server error - please try again later",
        },
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Server error - please try again later");
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
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        mapBackendErrors: true,
        errorMapping: {
          401: "Please log in",
          403: "Access denied",
          404: "Not found",
          500: "Server error",
        },
      });

      const result = await api.get("/test");

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
        }) as any;

      const result = await GET("https://api.example.com/test", {
        mapBackendErrors: true,
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

    const result = await GET("https://api.example.com/test", {
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

    const result = await GET("https://api.example.com/test", {
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
      errorMapping: {
        "fetch failed": "Network connection lost",
        "network error": "Unable to connect",
      },
    });

    const result = await api.get("/test");

    expect(result.error).not.toBeNull();
    expect(result.error?.message).toBe("Network connection lost");
    expect(result.error?.status).toBe("NETWORK_ERROR");
  });
});
