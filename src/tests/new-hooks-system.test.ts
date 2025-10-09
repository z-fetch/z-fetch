import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createInstance, Context } from "../lib/index.js";
import { setupMockFetch } from "./mock-helpers.js";

describe("New Hooks System Tests", () => {
  let mockSetup: ReturnType<typeof setupMockFetch>;

  beforeEach(() => {
    mockSetup = setupMockFetch({ success: true });
  });

  afterEach(() => {
    mockSetup.restore();
  });

  describe("setHeaders helper", () => {
    it("should add new headers using setHeaders", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onRequest: async (context) => {
            context.setHeaders((headers) => ({
              ...headers,
              "X-Custom": "value",
              "X-Timestamp": Date.now().toString(),
            }));
          },
        },
      });

      await api.get("/test");

      expect(mockSetup.calls).toHaveLength(1);
      const call = mockSetup.calls[0];
      expect(call.options.headers["X-Custom"]).toBe("value");
      expect(call.options.headers["X-Timestamp"]).toBeDefined();
    });

    it("should modify existing headers using setHeaders", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer old-token",
        },
        hooks: {
          onRequest: async (context) => {
            context.setHeaders((headers) => ({
              ...headers,
              Authorization: "Bearer new-token",
              "X-Modified": "true",
            }));
          },
        },
      });

      await api.get("/test");

      expect(mockSetup.calls).toHaveLength(1);
      const call = mockSetup.calls[0];
      expect(call.options.headers["Content-Type"]).toBe("application/json");
      expect(call.options.headers["Authorization"]).toBe("Bearer new-token");
      expect(call.options.headers["X-Modified"]).toBe("true");
    });

    it("should handle in-place header modification", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onRequest: async (context) => {
            context.setHeaders((headers) => {
              headers["X-In-Place"] = "modified";
              // Return void - should use in-place modification
            });
          },
        },
      });

      await api.get("/test");

      expect(mockSetup.calls).toHaveLength(1);
      const call = mockSetup.calls[0];
      expect(call.options.headers["X-In-Place"]).toBe("modified");
    });

    it("should handle conditional header setting", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onRequest: async (context) => {
            const token = "fake-jwt-token";
            if (token) {
              context.setHeaders((headers) => ({
                ...headers,
                Authorization: `Bearer ${token}`,
              }));
            }
          },
        },
      });

      await api.get("/test");

      expect(mockSetup.calls).toHaveLength(1);
      const call = mockSetup.calls[0];
      expect(call.options.headers["Authorization"]).toBe(
        "Bearer fake-jwt-token",
      );
    });
  });

  describe("setBody helper", () => {
    it("should set request body using setBody", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onRequest: async (context) => {
            context.setBody({
              originalData: "from request",
              injected: "from hook",
              timestamp: Date.now(),
            });
          },
        },
      });

      await api.post("/test", {
        body: { originalData: "will be replaced" },
      });

      expect(mockSetup.calls).toHaveLength(1);
      const call = mockSetup.calls[0];
      const bodyData = JSON.parse(call.options.body);
      expect(bodyData).toMatchObject({
        originalData: "from request",
        injected: "from hook",
        timestamp: expect.any(Number),
      });
    });

    it("should modify existing body data", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onRequest: async (context) => {
            const currentBody = context.request.options.body as any;
            context.setBody({
              ...currentBody,
              timestamp: 1234567890,
              modified: true,
            });
          },
        },
      });

      await api.post("/test", {
        body: { name: "test", value: 123 },
      });

      expect(mockSetup.calls).toHaveLength(1);
      const call = mockSetup.calls[0];
      const bodyData = JSON.parse(call.options.body);
      expect(bodyData).toMatchObject({
        name: "test",
        value: 123,
        modified: true,
        timestamp: 1234567890,
      });
    });

    it("should handle complex body structures", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onRequest: async (context) => {
            context.setBody({
              user: {
                id: 123,
                name: "John Doe",
              },
              metadata: {
                timestamp: Date.now(),
                source: "hook",
              },
              items: [1, 2, 3],
            });
          },
        },
      });

      await api.post("/test", {
        body: { original: "data" },
      });

      expect(mockSetup.calls).toHaveLength(1);
      const call = mockSetup.calls[0];
      const bodyData = JSON.parse(call.options.body);
      expect(bodyData).toMatchObject({
        user: {
          id: 123,
          name: "John Doe",
        },
        metadata: {
          timestamp: expect.any(Number),
          source: "hook",
        },
        items: [1, 2, 3],
      });
    });
  });

  describe("setOptions helper", () => {
    it("should modify request options using setOptions", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onRequest: async (context) => {
            context.setOptions((options) => ({
              ...options,
              cache: "no-cache",
              mode: "same-origin",
              credentials: "include",
            }));
          },
        },
      });

      await api.get("/test");

      expect(mockSetup.calls).toHaveLength(1);
      const call = mockSetup.calls[0];
      expect(call.options.cache).toBe("no-cache");
      expect(call.options.mode).toBe("same-origin");
      expect(call.options.credentials).toBe("include");
    });

    it("should handle in-place options modification", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onRequest: async (context) => {
            context.setOptions((options) => {
              options.cache = "force-cache";
              options.timeout = 5000;
              // Return void - should use in-place modification
            });
          },
        },
      });

      await api.get("/test");

      expect(mockSetup.calls).toHaveLength(1);
      const call = mockSetup.calls[0];
      expect(call.options.cache).toBe("force-cache");
      // Note: timeout might not be preserved in mock, but cache should be
    });
  });

  describe("setUrl and setMethod helpers", () => {
    it("should modify URL using setUrl", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onRequest: async (context) => {
            context.setUrl("/modified-endpoint");
          },
        },
      });

      await api.get("/original-endpoint");

      expect(mockSetup.calls).toHaveLength(1);
      const call = mockSetup.calls[0];
      expect(call.url).toBe("https://api.example.com/modified-endpoint");
    });

    it("should modify HTTP method using setMethod", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onRequest: async (context) => {
            context.setMethod("PUT");
          },
        },
      });

      await api.get("/test"); // Called as GET but should become PUT

      expect(mockSetup.calls).toHaveLength(1);
      const call = mockSetup.calls[0];
      expect(call.options.method).toBe("PUT");
    });

    it("should handle dynamic URL modification", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onRequest: async (context) => {
            if (context.request.url.includes("/batch")) {
              context.setUrl("/batch-processed");
              context.setMethod("POST");
            }
          },
        },
      });

      await api.get("/batch");

      expect(mockSetup.calls).toHaveLength(1);
      const call = mockSetup.calls[0];
      expect(call.url).toBe("https://api.example.com/batch-processed");
      expect(call.options.method).toBe("POST");
    });
  });

  describe("setError helper (onError hook)", () => {
    beforeEach(() => {
      mockSetup.restore();
      mockSetup = setupMockFetch({ success: false, status: 404 });
    });

    it("should modify error using setError", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onError: async (context) => {
            context.setError({
              message: "Custom error message from hook",
              status: context.error?.status || "UNKNOWN",
            });
          },
        },
      });

      const result = await api.get("/notfound");

      expect(result.error).toMatchObject({
        message: "Custom error message from hook",
        status: 404,
      });
    });

    it("should handle error context access", async () => {
      let capturedContext: Context | null = null;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onError: async (context) => {
            capturedContext = context;
            context.setError({
              message: `Request to ${context.request.url} failed`,
              status: context.error?.status || "UNKNOWN",
            });
          },
        },
      });

      await api.get("/notfound");

      expect(capturedContext).toBeTruthy();
      expect(capturedContext!.request.url).toBe("/notfound");
      expect(capturedContext!.request.method).toBe("GET");
    });
  });

  describe("Combined helper usage", () => {
    it("should use multiple helpers together in one hook", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onRequest: async (context) => {
            context.setHeaders((headers) => ({
              ...headers,
              "X-Hook-Applied": "true",
              "X-Timestamp": Date.now().toString(),
            }));

            context.setBody({
              ...((context.request.options.body as object) || {}),
              hookTimestamp: 1234567890,
              processed: true,
            });

            context.setOptions((options) => ({
              ...options,
              cache: "no-cache",
              mode: "cors",
            }));

            context.setUrl("/hooked-endpoint");
          },
        },
      });

      await api.post("/original", {
        body: { data: "test" },
      });

      expect(mockSetup.calls).toHaveLength(1);
      const call = mockSetup.calls[0];
      expect(call.url).toBe("https://api.example.com/hooked-endpoint");
      expect(call.options.method).toBe("POST");
      expect(call.options.cache).toBe("no-cache");
      expect(call.options.mode).toBe("cors");
      expect(call.options.headers["X-Hook-Applied"]).toBe("true");
      expect(call.options.headers["X-Timestamp"]).toBeDefined();

      const bodyData = JSON.parse(call.options.body);
      expect(bodyData).toMatchObject({
        data: "test",
        hookTimestamp: 1234567890,
        processed: true,
      });
    });

    it("should handle conditional logic with helpers", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onRequest: async (context) => {
            // Add authentication for protected routes
            if (context.request.url.startsWith("/protected")) {
              context.setHeaders((headers) => ({
                ...headers,
                Authorization: "Bearer fake-token",
              }));
            }

            // Add logging for all requests
            context.setHeaders((headers) => ({
              ...headers,
              "X-Request-ID": Math.random().toString(36).substr(2, 9),
            }));

            // Modify method for certain endpoints
            if (context.request.url.includes("/batch")) {
              context.setMethod("POST");
              context.setBody({
                batch: true,
                timestamp: Date.now(),
              });
            }
          },
        },
      });

      await api.get("/protected/user");

      expect(mockSetup.calls).toHaveLength(1);
      const call = mockSetup.calls[0];
      expect(call.options.headers["Authorization"]).toBe("Bearer fake-token");
      expect(call.options.headers["X-Request-ID"]).toBeDefined();
    });
  });

  describe("Response hooks with new system", () => {
    it("should modify response data directly", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onResponse: async (context) => {
            if (context.result?.data) {
              context.result.data = {
                ...context.result.data,
                processed: true,
                timestamp: Date.now(),
                metadata: {
                  processedBy: "hook",
                  version: "1.0",
                },
              };
            }
          },
        },
      });

      const result = await api.get("/test");

      expect(result.data).toMatchObject({
        processed: true,
        timestamp: expect.any(Number),
        metadata: {
          processedBy: "hook",
          version: "1.0",
        },
      });
    });

    it("should handle response transformation", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onResponse: async (context) => {
            if (context.result?.data) {
              // Transform array data
              if (Array.isArray(context.result.data)) {
                context.result.data = context.result.data.map((item: any) => ({
                  ...item,
                  transformed: true,
                }));
              }

              // Add global metadata
              context.result.data = {
                ...context.result.data,
                _meta: {
                  processedAt: new Date().toISOString(),
                  environment: "test",
                },
              };
            }
          },
        },
      });

      const result = await api.get("/test");

      expect(result.data).toMatchObject({
        _meta: {
          processedAt: expect.any(String),
          environment: "test",
        },
      });
    });
  });

  describe("Real-world scenarios", () => {
    it("should handle authentication flow", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onRequest: async (context) => {
            // Simulate getting token from storage
            const token = "fake-jwt-token";

            if (token) {
              context.setHeaders((headers) => ({
                ...headers,
                Authorization: `Bearer ${token}`,
              }));
            }

            // Add request ID for tracking
            context.setHeaders((headers) => ({
              ...headers,
              "X-Request-ID": `req_${Date.now()}`,
            }));
          },
          onResponse: async (context) => {
            // Handle 401 responses
            if (context.result?.error && context.result.error.status === 401) {
              console.log("Token expired, redirecting to login");
              // In real app: window.location.href = '/login';
            }

            // Add response metadata
            if (context.result?.data) {
              context.result.data = {
                ...context.result.data,
                _responseMeta: {
                  timestamp: Date.now(),
                  requestId: context.request.options.headers?.["X-Request-ID"],
                },
              };
            }
          },
          onError: async (context) => {
            // Log errors
            console.error(
              `Request failed: ${context.request.method} ${context.request.url}`,
            );

            // Custom error handling
            if (context.error?.status === "NETWORK_ERROR") {
              context.setError({
                message:
                  "Network connection failed. Please check your internet connection.",
                status: context.error.status,
              });
            }
          },
        },
      });

      const result = await api.get("/user/profile");

      expect(mockSetup.calls).toHaveLength(1);
      const call = mockSetup.calls[0];
      expect(call.options.headers["Authorization"]).toBe(
        "Bearer fake-jwt-token",
      );
      expect(call.options.headers["X-Request-ID"]).toMatch(/^req_\d+$/);
    });
  });
});
