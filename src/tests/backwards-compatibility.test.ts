import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createInstance, Context } from "../lib/index.js";
import { setupMockFetch } from "./mock-helpers.js";

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

describe("Backwards Compatibility Tests", () => {
  let mockSetup: ReturnType<typeof setupMockFetch>;

  beforeEach(() => {
    mockSetup = setupMockFetch({ success: true });
  });

  afterEach(() => {
    mockSetup.restore();
  });

  describe("Old-style context returns", () => {
    it("should handle basic old-style return with headers", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onRequest: async (_context) => {
            return {
              request: {
                options: {
                  headers: {
                    "X-Old-Style": "test",
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
      expect(call.options.headers["X-Old-Style"]).toBe("test");
    });

    it("should handle complex nested object returns", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onRequest: async (_context) => {
            return {
              request: {
                url: "/modified-endpoint",
                options: {
                  headers: {
                    "X-Complex": "test",
                  },
                  cache: "no-cache",
                },
              },
            } as DeepPartial<Context>;
          },
        },
      });

      await api.get("/original");

      expect(mockSetup.calls).toHaveLength(1);
      const call = mockSetup.calls[0];
      expect(call.url).toBe("https://api.example.com/modified-endpoint");
      expect(call.options.headers["X-Complex"]).toBe("test");
      expect(call.options.cache).toBe("no-cache");
    });

    it("should handle response hook old-style returns", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onResponse: async (_context) => {
            if (_context.result?.data) {
              return {
                result: {
                  ..._context.result,
                  data: {
                    ..._context.result.data,
                    processed: true,
                    timestamp: Date.now(),
                  },
                },
              } as DeepPartial<Context>;
            }
          },
        },
      });

      const result = await api.get("/test");

      expect(result.data).toMatchObject({
        processed: true,
        timestamp: expect.any(Number),
      });
    });

    it("should handle error hook old-style returns", async () => {
      mockSetup.restore();
      mockSetup = setupMockFetch({ success: false, status: 404 });

      const api = createInstance({
        baseUrl: "https://api.example.com",
        mapErrors: true, // Required for HTTP errors to trigger onError hook
        withCache: false,
        hooks: {
          onError: async (_context) => {
            return {
              error: {
                message: "Custom error from old-style return",
                status: "CUSTOM_ERROR",
              },
            } as DeepPartial<Context>;
          },
        },
      });

      const result = await api.get("/notfound-old-style");

      expect(result.error).toMatchObject({
        message: "Custom error from old-style return",
        status: "CUSTOM_ERROR",
      });
    });
  });

  describe("Mixed old and new style usage", () => {
    it("should handle helper methods before old-style return", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onRequest: async (_context) => {
            // Use new helper first
            _context.setHeaders((headers) => ({
              ...headers,
              "X-Helper": "first",
            }));

            // Then return old style
            return {
              request: {
                options: {
                  headers: {
                    "X-Return": "second",
                  },
                  cache: "no-store",
                },
              },
            } as DeepPartial<Context>;
          },
        },
      });

      await api.get("/test");

      expect(mockSetup.calls).toHaveLength(1);
      const call = mockSetup.calls[0];
      expect(call.options.headers["X-Helper"]).toBe("first");
      expect(call.options.headers["X-Return"]).toBe("second");
      expect(call.options.cache).toBe("no-store");
    });

    it("should handle helper methods after old-style return", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onRequest: async (_context) => {
            // Return old style first
            const oldReturn = {
              request: {
                options: {
                  headers: {
                    "X-Return": "first",
                  },
                },
              },
            } as DeepPartial<Context>;

            // Use helper after (this might not work as expected)
            _context.setHeaders((headers) => ({
              ...headers,
              "X-Helper": "second",
            }));

            return oldReturn;
          },
        },
      });

      await api.get("/test");

      expect(mockSetup.calls).toHaveLength(1);
      const call = mockSetup.calls[0];
      // The helper method should override the return value
      expect(call.options.headers["X-Helper"]).toBe("second");
      expect(call.options.headers["X-Return"]).toBe("first");
    });
  });

  describe("Edge cases and potential issues", () => {
    it("should handle headers merging correctly with existing headers", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer original",
        },
        hooks: {
          onRequest: async (_context) => {
            return {
              request: {
                options: {
                  headers: {
                    "X-Custom": "value",
                    Authorization: "Bearer new-token",
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
      expect(call.options.headers["Content-Type"]).toBe("application/json");
      expect(call.options.headers["Authorization"]).toBe("Bearer new-token");
      expect(call.options.headers["X-Custom"]).toBe("value");
    });

    it("should handle multiple hooks with old-style returns", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onRequest: async (_context) => {
            return {
              request: {
                options: {
                  headers: {
                    "X-Request": "hook",
                  },
                },
              },
            } as DeepPartial<Context>;
          },
          onResponse: async (_context) => {
            if (_context.result?.data) {
              return {
                result: {
                  ..._context.result,
                  data: {
                    ..._context.result.data,
                    processed: true,
                  },
                },
              } as DeepPartial<Context>;
            }
          },
        },
      });

      const result = await api.get("/test");

      expect(mockSetup.calls).toHaveLength(1);
      const call = mockSetup.calls[0];
      expect(call.options.headers["X-Request"]).toBe("hook");
      expect(result.data).toMatchObject({
        processed: true,
      });
    });

    it("should handle deep nested object merging", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onRequest: async (_context) => {
            return {
              request: {
                options: {
                  headers: {
                    Authorization: "Bearer deep-nested",
                  },
                  body: {
                    nested: {
                      deep: "value",
                      array: [1, 2, 3],
                    },
                  },
                },
              },
            } as DeepPartial<Context>;
          },
        },
      });

      await api.post("/test", {
        body: { original: "data" },
      });

      expect(mockSetup.calls).toHaveLength(1);
      const call = mockSetup.calls[0];
      expect(call.options.headers["Authorization"]).toBe("Bearer deep-nested");

      const bodyData = JSON.parse(call.options.body);
      expect(bodyData).toMatchObject({
        nested: {
          deep: "value",
          array: [1, 2, 3],
        },
      });
    });
  });

  describe("Potential issues with applyPatch", () => {
    it("should preserve helper methods after context patching", async () => {
      let capturedContext: Context | null = null;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onRequest: async (_context) => {
            capturedContext = _context;

            // Return old style
            return {
              request: {
                options: {
                  headers: {
                    "X-Test": "value",
                  },
                },
              },
            } as DeepPartial<Context>;
          },
        },
      });

      await api.get("/test");

      expect(capturedContext).toBeTruthy();
      expect(typeof capturedContext!.setHeaders).toBe("function");
      expect(typeof capturedContext!.setBody).toBe("function");
      expect(typeof capturedContext!.setOptions).toBe("function");
      expect(typeof capturedContext!.setUrl).toBe("function");
      expect(typeof capturedContext!.setMethod).toBe("function");
    });

    it("should handle undefined/null values in patches", async () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        hooks: {
          onRequest: async (_context) => {
            return {
              request: {
                options: {
                  headers: undefined, // This might cause issues
                  cache: undefined, // This might cause issues
                },
              },
            } as DeepPartial<Context>;
          },
        },
      });

      // This should not throw an error
      await api.get("/test");

      expect(mockSetup.calls).toHaveLength(1);
    });
  });
});
