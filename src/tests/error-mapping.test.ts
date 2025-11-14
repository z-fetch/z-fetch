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

  it("should NOT map HTTP status codes - return backend errors as-is", async () => {
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
        401: "This should NOT be used",
      },
    });

    expect(result.error).not.toBeNull();
    // Should use original statusText, NOT the mapped message
    expect(result.error?.message).toBe("Unauthorized");
    expect(result.error?.status).toBe(401);
  });

  it("should NOT map 403 status code - return backend error as-is", async () => {
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
        403: "This should NOT be used",
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
    // Always use original statusText for backend errors
    expect(result.error?.message).toBe("I'm a teapot");
    expect(result.error?.status).toBe(418);
    }
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
