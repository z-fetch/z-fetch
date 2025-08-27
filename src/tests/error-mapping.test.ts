import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET, createInstance } from "../lib/index";
import { setupMockFetch } from "./mock-helpers";

describe("Error Mapping functionality (Issue #5)", () => {
  let mockSetup: ReturnType<typeof setupMockFetch>;

  afterEach(() => {
    mockSetup?.restore();
  });

  it("should map 401 status code to custom message", async () => {
    mockSetup = setupMockFetch();
    
    // Mock a 401 response
    mockSetup.restore();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({}),
      text: async () => "",
    }) as any;
    
    const restoreFetch = () => { globalThis.fetch = originalFetch; };

    try {
      const result = await GET("https://api.example.com/test", {
        errorMapping: {
          401: "Authentication failed - please sign in again",
        },
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Authentication failed - please sign in again");
      expect(result.error?.status).toBe(401);
    } finally {
      restoreFetch();
    }
  });

  it("should map 403 status code to custom message", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      json: async () => ({}),
      text: async () => "",
    }) as any;

    try {
      const result = await GET("https://api.example.com/test", {
        errorMapping: {
          403: "Access denied - insufficient permissions",
        },
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Access denied - insufficient permissions");
      expect(result.error?.status).toBe(403);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("should map 404 status code to custom message with service name", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: false,
      status: 404,
      statusText: "Not Found", 
      json: async () => ({}),
      text: async () => "",
    }) as any;

    try {
      const result = await GET("https://api.example.com/users", {
        errorMapping: {
          404: "Service 'Users API' not found",
        },
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Service 'Users API' not found");
      expect(result.error?.status).toBe(404);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("should map 500 status code to custom message", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({}),
      text: async () => "",
    }) as any;

    try {
      const result = await GET("https://api.example.com/test", {
        errorMapping: {
          500: "Server error - please try again later",
        },
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Server error - please try again later");
      expect(result.error?.status).toBe(500);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("should work with createInstance configuration", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({}),
      text: async () => "",
    }) as any;

    try {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        errorMapping: {
          401: "Authentication failed - please sign in again",
          403: "Access denied - insufficient permissions",
          404: "Resource not found",
          500: "Server error - please try again later",
        },
      });

      const result = await api.get("/test");

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Authentication failed - please sign in again");
      expect(result.error?.status).toBe(401);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("should fallback to original message when no mapping found", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: false,
      status: 418,
      statusText: "I'm a teapot",
      json: async () => ({}),
      text: async () => "",
    }) as any;

    try {
      const result = await GET("https://api.example.com/test", {
        errorMapping: {
          401: "Authentication failed",
          500: "Server error",
        },
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("I'm a teapot"); // Original message
      expect(result.error?.status).toBe(418);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("should map network errors", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error("fetch failed");
    };

    try {
      const result = await GET("https://api.example.com/test", {
        errorMapping: {
          "fetch failed": "Network connection failed - please check your internet",
        },
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Network connection failed - please check your internet");
      expect(result.error?.status).toBe("NETWORK_ERROR");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("should support multiple error mapping patterns", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({}),
      text: async () => "",
    }) as any;

    try {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        errorMapping: {
          // Exact status codes
          401: "Please login",
          403: "Access denied",
          404: "Not found",
          500: "Server error",
          // String patterns
          "unauthorized": "Authentication required",
          "forbidden": "Permission denied",
        },
      });

      const result = await api.get("/test");

      expect(result.error).not.toBeNull();
      // Should match the exact status code (401) first
      expect(result.error?.message).toBe("Please login");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});