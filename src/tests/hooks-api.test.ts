import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createInstance, Context } from "../lib/index.js";
import { setupMockFetch } from "./mock-helpers.js";

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

describe("Hooks API Enhancement Tests", () => {
  let mockSetup: ReturnType<typeof setupMockFetch>;

  beforeEach(() => {
    mockSetup = setupMockFetch({ success: true });
  });

  afterEach(() => {
    mockSetup.restore();
  });

  describe("setHeaders helper", () => {
    it("should allow setting headers using setHeaders helper", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onRequest: async (context) => {
            context.setHeaders((headers) => {
              return {
                ...headers,
                "X-Custom-Header": "custom-value",
                "X-Test": "test-value",
              };
            });
          },
        },
      });

      await api.get("/test");

      expect(mockSetup.calls).toHaveLength(1);
      const call = mockSetup.calls[0];
      expect(call.url).toBe("https://api.example.com/test");
      expect(call.options.headers["X-Custom-Header"]).toBe("custom-value");
      expect(call.options.headers["X-Test"]).toBe("test-value");
    });

    it("should allow modifying existing headers using setHeaders helper", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer old-token",
        },
        hooks: {
          onRequest: async (context) => {
            context.setHeaders((headers) => {
              return {
                ...headers,
                Authorization: "Bearer new-token",
                "X-Modified": "true",
              };
            });
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

    it("should allow in-place header modification when setHeaders returns void", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        headers: {
          "Content-Type": "application/json",
        },
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
      expect(call.options.headers["Content-Type"]).toBe("application/json");
      expect(call.options.headers["X-In-Place"]).toBe("modified");
    });
  });

  describe("setBody helper", () => {
    it("should allow setting request body using setBody helper", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onRequest: async (context) => {
            context.setBody({
              originalData: "from request",
              injected: "from hook",
            });
          },
        },
      });

      await api.post("/test", {
        body: { originalData: "will be replaced" },
      });

      expect(mockSetup.calls).toHaveLength(1);
      const call = mockSetup.calls[0];
      expect(call.options.body).toBe(
        JSON.stringify({
          originalData: "from request",
          injected: "from hook",
        }),
      );
    });

    it("should allow modifying existing body data", async () => {
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
  });

  describe("setOptions helper", () => {
    it("should allow setting request options using setOptions helper", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onRequest: async (context) => {
            context.setOptions((options) => {
              return {
                ...options,
                cache: "no-cache",
                mode: "same-origin",
              };
            });
          },
        },
      });

      await api.get("/test");

      expect(mockSetup.calls).toHaveLength(1);
      const call = mockSetup.calls[0];
      expect(call.options.cache).toBe("no-cache");
      expect(call.options.mode).toBe("same-origin");
    });

    it("should allow in-place options modification when setOptions returns void", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onRequest: async (context) => {
            context.setOptions((options) => {
              options.cache = "force-cache";
              // Return void - should use in-place modification
            });
          },
        },
      });

      await api.get("/test");

      expect(mockSetup.calls).toHaveLength(1);
      const call = mockSetup.calls[0];
      expect(call.options.cache).toBe("force-cache");
    });
  });

  describe("setUrl and setMethod helpers", () => {
    it("should allow modifying URL using setUrl helper", async () => {
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

    it("should allow modifying HTTP method using setMethod helper", async () => {
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
  });

  describe("combined helper usage", () => {
    it("should allow using multiple helpers together in one hook", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onRequest: async (context) => {
            context.setHeaders((headers) => ({
              ...headers,
              "X-Hook-Applied": "true",
            }));

            context.setBody({
              ...((context.request.options.body as object) || {}),
              hookTimestamp: 1234567890,
            });

            context.setOptions((options) => ({
              ...options,
              cache: "no-cache",
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
      expect(call.options.headers["X-Hook-Applied"]).toBe("true");

      const bodyData = JSON.parse(call.options.body);
      expect(bodyData).toMatchObject({
        data: "test",
        hookTimestamp: 1234567890,
      });
    });
  });

  describe("backwards compatibility", () => {
    it("should maintain backwards compatibility with manual context manipulation", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onRequest: async (context) => {
            // Old way - should still work
            return {
              request: {
                options: {
                  headers: {
                    ...(context.request.options.headers as Record<
                      string,
                      string
                    >),
                    "X-Old-Way": "still-works",
                  },
                },
              },
            } as DeepPartial<Context>;
          },
        },
      });

      await api.get("/test");

      expect(mockSetup.calls).toHaveLength(1);
      const call = mockSetup.calls[0];
      expect(call.options.headers["X-Old-Way"]).toBe("still-works");
    });

    it("should work with both new helpers and old context return pattern", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onRequest: async (context) => {
            // Use new helper
            context.setHeaders((headers) => ({
              ...headers,
              "X-New-Helper": "works",
            }));

            // Also return context modification (old way)
            return {
              request: {
                options: {
                  cache: "no-store",
                },
              },
            };
          },
        },
      });

      await api.get("/test");

      expect(mockSetup.calls).toHaveLength(1);
      const call = mockSetup.calls[0];
      expect(call.options.cache).toBe("no-store");
      expect(call.options.headers["X-New-Helper"]).toBe("works");
    });
  });
});
