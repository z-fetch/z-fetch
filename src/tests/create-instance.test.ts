import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { createInstance } from "../lib/index";
import { setupMockFetch } from "./mock-helpers";

let api: ReturnType<typeof createInstance>;
let mockSetup: ReturnType<typeof setupMockFetch>;

beforeAll(() => {
  api = createInstance({
    baseUrl: "https://jsonplaceholder.typicode.com",
    headers: { "X-Test-Header": "test" },
    hooks: {
      onRequest: async ({ request }) => {
        if (request.method === "GET") {
          return {
            request: {
              ...request,
              url: request.url + "?hooked=true",
            },
          };
        }
        return { request };
      },
      onResponse: async ({ result }) => {
        if (result?.data) {
          return {
            result: {
              ...result,
              data: {
                ...result.data,
                hookInjected: true,
              },
            },
          };
        }
        return { result };
      },
    },
  });
});

beforeEach(() => {
  mockSetup = setupMockFetch({
    id: 1,
    title: "test post",
    body: "test body",
    userId: 1,
  });
});

afterEach(() => {
  mockSetup.restore();
});

describe("Z-Fetch createInstance integration tests", () => {
  it("should GET a post using instance", async () => {
    const result = await api.get("/posts/1");
    expect(result?.data).toHaveProperty("id", 1);
    expect(result?.data).toHaveProperty("hookInjected", true);
    expect(result?.error).toBeNull();
  });
  it("should POST a new post using instance", async () => {
    const result = await api.post("/posts", {
      body: { title: "test", body: "body", userId: 1 },
    });
    expect(result?.data).toHaveProperty("id");
    expect(result?.data).toHaveProperty("hookInjected", true);
    expect(result?.error).toBeNull();
  });
  it("should PUT a post using instance", async () => {
    const result = await api.put("/posts/1", {
      body: { id: 1, title: "updated", body: "updated", userId: 1 },
    });
    expect(result?.data).toHaveProperty("id", 1);
    expect(result?.data).toHaveProperty("hookInjected", true);
    expect(result?.error).toBeNull();
  });

  it("should PATCH a post using instance", async () => {
    const result = await api.patch("/posts/1", {
      body: { title: "patched" },
    });
    expect(result?.data).toHaveProperty("id", 1);
    expect(result?.data).toHaveProperty("hookInjected", true);
    expect(result?.error).toBeNull();
  });

  it("should DELETE a post using instance", async () => {
    const result = await api.delete("/posts/1");
    expect(result?.error).toBeNull();
  });

  it("should return updated config with helpers.getConfig()", () => {
    const cfg = api.helpers.getConfig();
    expect(cfg.baseUrl).toBe("https://jsonplaceholder.typicode.com");
    expect(cfg.headers["X-Test-Header"]).toBe("test");
  });

  it("should apply bearer token via helpers.setBearerToken()", async () => {
    api.helpers.setBearerToken("fake-token");
    const result = await api.get("/posts/1");
    expect(result?.error).toBeNull();
    expect(result?.data).toHaveProperty("id", 1);
    expect(api.helpers.getConfig().headers["Authorization"]).toBe(
      "Bearer fake-token",
    );
  });

  it("should apply onRequest hook to add hooked=true parameter", async () => {
    const result = await api.get("/posts/1");

    expect(result?.error).toBeNull();
    expect(result?.data).toHaveProperty("id", 1);

    // Check that the response URL contains the hooked=true parameter
    expect(result?.response?.url).toContain("hooked=true");
  });
});
