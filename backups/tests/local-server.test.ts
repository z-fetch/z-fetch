import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { createInstance, GET, POST, PUT, DELETE } from "../lib/index";

/**
 * Integration tests using a local HTTP server.
 * This ensures tests work reliably without depending on external APIs.
 * 
 * Creates a simple REST API that mimics JSONPlaceholder behavior.
 */

// Simple in-memory data store
const posts = [
  { id: 1, userId: 1, title: "Test Post 1", body: "Body of post 1" },
  { id: 2, userId: 1, title: "Test Post 2", body: "Body of post 2" },
];

const users = [
  { id: 1, name: "Test User", username: "testuser", email: "test@example.com" },
];

// Simple HTTP server that mimics a REST API
function createTestServer() {
  let nextPostId = 3;
  
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || "/", `http://localhost`);
    const path = url.pathname;
    const method = req.method || "GET";

    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Custom-Header, X-Instance-Header, X-Request-Header");
    res.setHeader("Content-Type", "application/json");

    // Handle preflight
    if (method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Parse body for POST/PUT
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      let parsedBody: any = null;
      if (body) {
        try {
          parsedBody = JSON.parse(body);
        } catch {
          // Ignore parse errors
        }
      }

      // Routes
      // GET /posts
      if (method === "GET" && path === "/posts") {
        res.writeHead(200);
        res.end(JSON.stringify(posts));
        return;
      }

      // GET /posts/:id
      if (method === "GET" && path.match(/^\/posts\/\d+$/)) {
        const id = parseInt(path.split("/")[2]);
        const post = posts.find((p) => p.id === id);
        if (post) {
          res.writeHead(200);
          res.end(JSON.stringify(post));
        } else {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Not Found" }));
        }
        return;
      }

      // POST /posts
      if (method === "POST" && path === "/posts") {
        const newPost = {
          id: nextPostId++,
          ...parsedBody,
        };
        res.writeHead(201);
        res.end(JSON.stringify(newPost));
        return;
      }

      // PUT /posts/:id
      if (method === "PUT" && path.match(/^\/posts\/\d+$/)) {
        const id = parseInt(path.split("/")[2]);
        const post = posts.find((p) => p.id === id);
        if (post) {
          res.writeHead(200);
          res.end(JSON.stringify({ ...post, ...parsedBody }));
        } else {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Not Found" }));
        }
        return;
      }

      // DELETE /posts/:id
      if (method === "DELETE" && path.match(/^\/posts\/\d+$/)) {
        res.writeHead(200);
        res.end(JSON.stringify({}));
        return;
      }

      // GET /users/:id
      if (method === "GET" && path.match(/^\/users\/\d+$/)) {
        const id = parseInt(path.split("/")[2]);
        const user = users.find((u) => u.id === id);
        if (user) {
          res.writeHead(200);
          res.end(JSON.stringify(user));
        } else {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Not Found" }));
        }
        return;
      }

      // GET /error/400 - Return 400 Bad Request
      if (method === "GET" && path === "/error/400") {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Bad Request", message: "Invalid input" }));
        return;
      }

      // GET /error/500 - Return 500 Internal Server Error
      if (method === "GET" && path === "/error/500") {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal Server Error" }));
        return;
      }

      // GET /error/401 - Return 401 Unauthorized
      if (method === "GET" && path === "/error/401") {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized" }));
        return;
      }

      // GET /error/403 - Return 403 Forbidden
      if (method === "GET" && path === "/error/403") {
        res.writeHead(403, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Forbidden" }));
        return;
      }

      // Default: 404
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not Found" }));
    });
  });

  return server;
}

describe("Integration Tests with Local Server", () => {
  let server: ReturnType<typeof createServer>;
  let BASE_URL: string;

  beforeAll(async () => {
    server = createTestServer();
    
    // Start server and get the assigned port
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (address && typeof address === "object") {
          BASE_URL = `http://127.0.0.1:${address.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe("Direct function calls (global config)", () => {
    it("GET should fetch posts successfully", async () => {
      const result = await GET(`${BASE_URL}/posts/1`, {
        withCache: false,
      });

      expect(result.error).toBeNull();
      expect(result.response?.ok).toBe(true);
      expect(result.response?.status).toBe(200);
      expect(result.data).toMatchObject({
        userId: 1,
        id: 1,
        title: expect.any(String),
        body: expect.any(String),
      });
    });

    it("POST should create a new post", async () => {
      const newPost = {
        title: "Test Post",
        body: "This is a test post body",
        userId: 1,
      };

      const result = await POST(`${BASE_URL}/posts`, {
        body: newPost,
        withCache: false,
      });

      expect(result.error).toBeNull();
      expect(result.response?.ok).toBe(true);
      expect(result.response?.status).toBe(201);
      expect(result.data).toMatchObject({
        id: expect.any(Number),
        title: "Test Post",
        body: "This is a test post body",
        userId: 1,
      });
    });

    it("GET with 404 should not create error (mapErrors: false default)", async () => {
      const result = await GET(`${BASE_URL}/posts/99999`, {
        withCache: false,
      });

      // mapErrors: false by default = like native fetch
      expect(result.error).toBeNull();
      expect(result.response?.ok).toBe(false);
      expect(result.response?.status).toBe(404);
    });

    it("GET with 400 should not create error (mapErrors: false default)", async () => {
      const result = await GET(`${BASE_URL}/error/400`, {
        withCache: false,
      });

      // mapErrors: false by default = like native fetch
      expect(result.error).toBeNull();
      expect(result.response?.ok).toBe(false);
      expect(result.response?.status).toBe(400);
      expect(result.data).toMatchObject({ error: "Bad Request" });
    });

    it("GET with 500 should not create error (mapErrors: false default)", async () => {
      const result = await GET(`${BASE_URL}/error/500`, {
        withCache: false,
      });

      // mapErrors: false by default = like native fetch
      expect(result.error).toBeNull();
      expect(result.response?.ok).toBe(false);
      expect(result.response?.status).toBe(500);
    });
  });

  describe("Instance with mapErrors: false (native fetch behavior)", () => {
    it("should successfully fetch data on 200", async () => {
      const api = createInstance({
        baseUrl: BASE_URL,
        mapErrors: false,
        withCache: false,
      });

      const result = await api.get("/users/1");

      expect(result.error).toBeNull();
      expect(result.response?.ok).toBe(true);
      expect(result.response?.status).toBe(200);
      expect(result.data).toMatchObject({
        id: 1,
        name: expect.any(String),
        username: expect.any(String),
        email: expect.any(String),
      });
    });

    it("should NOT create error for 404 - behave like native fetch", async () => {
      const api = createInstance({
        baseUrl: BASE_URL,
        mapErrors: false,
        withCache: false,
      });

      const result = await api.get("/posts/99999");

      expect(result.error).toBeNull();
      expect(result.response?.ok).toBe(false);
      expect(result.response?.status).toBe(404);
      expect(result.data).toMatchObject({ error: "Not Found" });
    });

    it("should NOT create error for 400 - behave like native fetch", async () => {
      const api = createInstance({
        baseUrl: BASE_URL,
        mapErrors: false,
        withCache: false,
      });

      const result = await api.get("/error/400");

      expect(result.error).toBeNull();
      expect(result.response?.ok).toBe(false);
      expect(result.response?.status).toBe(400);
      expect(result.data).toMatchObject({ error: "Bad Request" });
    });

    it("should NOT create error for 500 - behave like native fetch", async () => {
      const api = createInstance({
        baseUrl: BASE_URL,
        mapErrors: false,
        withCache: false,
      });

      const result = await api.get("/error/500");

      expect(result.error).toBeNull();
      expect(result.response?.ok).toBe(false);
      expect(result.response?.status).toBe(500);
    });

    it("should make POST request successfully", async () => {
      const api = createInstance({
        baseUrl: BASE_URL,
        mapErrors: false,
        withCache: false,
      });

      const result = await api.post("/posts", {
        body: {
          title: "Instance Test",
          body: "Test body",
          userId: 1,
        },
      });

      expect(result.error).toBeNull();
      expect(result.response?.ok).toBe(true);
      expect(result.data?.id).toBeDefined();
    });

    it("should make PUT request successfully", async () => {
      const api = createInstance({
        baseUrl: BASE_URL,
        mapErrors: false,
        withCache: false,
      });

      const result = await api.put("/posts/1", {
        body: {
          id: 1,
          title: "Updated Title",
          body: "Updated body",
          userId: 1,
        },
      });

      expect(result.error).toBeNull();
      expect(result.response?.ok).toBe(true);
      expect(result.data?.title).toBe("Updated Title");
    });

    it("should make DELETE request successfully", async () => {
      const api = createInstance({
        baseUrl: BASE_URL,
        mapErrors: false,
        withCache: false,
      });

      const result = await api.delete("/posts/1");

      expect(result.error).toBeNull();
      expect(result.response?.ok).toBe(true);
      expect(result.response?.status).toBe(200);
    });
  });

  describe("Instance with mapErrors: true (create error objects)", () => {
    it("should successfully fetch data on 200", async () => {
      const api = createInstance({
        baseUrl: BASE_URL,
        mapErrors: true,
        throwOnError: false,
        withCache: false,
      });

      const result = await api.get("/users/1");

      expect(result.error).toBeNull();
      expect(result.response?.ok).toBe(true);
    });

    it("should CREATE error object for 404", async () => {
      const api = createInstance({
        baseUrl: BASE_URL,
        mapErrors: true,
        throwOnError: false,
        withCache: false,
      });

      const result = await api.get("/posts/99999");

      expect(result.error).not.toBeNull();
      expect(result.error?.status).toBe(404);
      expect(result.error?.message).toBeDefined();
    });

    it("should CREATE error object for 400", async () => {
      const api = createInstance({
        baseUrl: BASE_URL,
        mapErrors: true,
        throwOnError: false,
        withCache: false,
      });

      const result = await api.get("/error/400");

      expect(result.error).not.toBeNull();
      expect(result.error?.status).toBe(400);
    });

    it("should CREATE error object for 500", async () => {
      const api = createInstance({
        baseUrl: BASE_URL,
        mapErrors: true,
        throwOnError: false,
        withCache: false,
      });

      const result = await api.get("/error/500");

      expect(result.error).not.toBeNull();
      expect(result.error?.status).toBe(500);
    });
  });

  describe("Instance with mapErrors: true + throwOnError: true", () => {
    it("should not throw on successful request", async () => {
      const api = createInstance({
        baseUrl: BASE_URL,
        mapErrors: true,
        throwOnError: true,
        withCache: false,
      });

      const result = await api.get("/posts/1");

      expect(result.error).toBeNull();
      expect(result.data?.id).toBe(1);
    });

    it("should THROW on 404 error", async () => {
      const api = createInstance({
        baseUrl: BASE_URL,
        mapErrors: true,
        throwOnError: true,
        withCache: false,
      });

      await expect(api.get("/posts/99999")).rejects.toMatchObject({
        status: 404,
        message: expect.any(String),
      });
    });

    it("should THROW on 400 error", async () => {
      const api = createInstance({
        baseUrl: BASE_URL,
        mapErrors: true,
        throwOnError: true,
        withCache: false,
      });

      await expect(api.get("/error/400")).rejects.toMatchObject({
        status: 400,
      });
    });

    it("should THROW on 500 error", async () => {
      const api = createInstance({
        baseUrl: BASE_URL,
        mapErrors: true,
        throwOnError: true,
        withCache: false,
      });

      await expect(api.get("/error/500")).rejects.toMatchObject({
        status: 500,
      });
    });
  });

  describe("errorMapping", () => {
    it("should use custom error mapping for 404", async () => {
      const api = createInstance({
        baseUrl: BASE_URL,
        mapErrors: true,
        throwOnError: false,
        withCache: false,
        errorMapping: {
          404: "Resource not found",
          500: "Server error occurred",
        },
      });

      const result = await api.get("/posts/99999");

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Resource not found");
      expect(result.error?.status).toBe(404);
    });

    it("should use custom error mapping for 400", async () => {
      const api = createInstance({
        baseUrl: BASE_URL,
        mapErrors: true,
        throwOnError: false,
        withCache: false,
        errorMapping: {
          400: "Invalid request data",
        },
      });

      const result = await api.get("/error/400");

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Invalid request data");
      expect(result.error?.status).toBe(400);
    });

    it("should use custom error mapping for 500", async () => {
      const api = createInstance({
        baseUrl: BASE_URL,
        mapErrors: true,
        throwOnError: false,
        withCache: false,
        errorMapping: {
          500: "Something went wrong on the server",
        },
      });

      const result = await api.get("/error/500");

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Something went wrong on the server");
      expect(result.error?.status).toBe(500);
    });
  });

  describe("Per-request config overrides", () => {
    it("per-request mapErrors: true should override instance mapErrors: false", async () => {
      const api = createInstance({
        baseUrl: BASE_URL,
        mapErrors: false,
        withCache: false,
      });

      const result = await api.get("/posts/99999", {
        mapErrors: true,
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.status).toBe(404);
    });

    it("per-request mapErrors: false should override instance mapErrors: true", async () => {
      const api = createInstance({
        baseUrl: BASE_URL,
        mapErrors: true,
        withCache: false,
      });

      const result = await api.get("/posts/99999", {
        mapErrors: false,
      });

      expect(result.error).toBeNull();
      expect(result.response?.ok).toBe(false);
      expect(result.response?.status).toBe(404);
    });

    it("per-request throwOnError: true should override instance throwOnError: false", async () => {
      const api = createInstance({
        baseUrl: BASE_URL,
        mapErrors: true,
        throwOnError: false,
        withCache: false,
      });

      await expect(
        api.get("/posts/99999", { throwOnError: true })
      ).rejects.toMatchObject({
        status: 404,
      });
    });

    it("per-request throwOnError: false should override instance throwOnError: true", async () => {
      const api = createInstance({
        baseUrl: BASE_URL,
        mapErrors: true,
        throwOnError: true,
        withCache: false,
      });

      const result = await api.get("/posts/99999", {
        throwOnError: false,
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.status).toBe(404);
    });

    it("per-request errorMapping should override instance errorMapping", async () => {
      const api = createInstance({
        baseUrl: BASE_URL,
        mapErrors: true,
        withCache: false,
        errorMapping: {
          404: "Instance: Not Found",
        },
      });

      const result = await api.get("/posts/99999", {
        errorMapping: {
          404: "Request: Custom 404 Message",
        },
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Request: Custom 404 Message");
    });
  });

  describe("Instance config isolation", () => {
    it("different instances should have isolated configs", async () => {
      const apiWithErrors = createInstance({
        baseUrl: BASE_URL,
        mapErrors: true,
        throwOnError: true,
        withCache: false,
      });

      const apiNativeFetch = createInstance({
        baseUrl: BASE_URL,
        mapErrors: false,
        throwOnError: false,
        withCache: false,
      });

      // apiWithErrors should throw on 404
      await expect(apiWithErrors.get("/posts/99999")).rejects.toMatchObject({
        status: 404,
      });

      // apiNativeFetch should NOT throw
      const result = await apiNativeFetch.get("/posts/99999");
      expect(result.error).toBeNull();
      expect(result.response?.ok).toBe(false);
    });
  });

  describe("Response data parsing", () => {
    it("should correctly parse JSON array responses", async () => {
      const api = createInstance({
        baseUrl: BASE_URL,
        withCache: false,
      });

      const result = await api.get("/posts");

      expect(result.error).toBeNull();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0]).toMatchObject({
        userId: expect.any(Number),
        id: expect.any(Number),
        title: expect.any(String),
        body: expect.any(String),
      });
    });

    it("should preserve response object for manual inspection", async () => {
      const api = createInstance({
        baseUrl: BASE_URL,
        mapErrors: false,
        withCache: false,
      });

      const result = await api.get("/posts/1");

      expect(result.response).toBeDefined();
      expect(result.response?.ok).toBe(true);
      expect(result.response?.status).toBe(200);
    });

    it("should parse error response data with mapErrors: false", async () => {
      const api = createInstance({
        baseUrl: BASE_URL,
        mapErrors: false,
        withCache: false,
      });

      const result = await api.get("/error/400");

      expect(result.error).toBeNull();
      expect(result.data).toMatchObject({
        error: "Bad Request",
        message: "Invalid input",
      });
    });
  });

  describe("Headers configuration", () => {
    it("should use instance-level headers", async () => {
      const api = createInstance({
        baseUrl: BASE_URL,
        headers: {
          "X-Custom-Header": "test-value",
        },
        withCache: false,
      });

      const result = await api.get("/posts/1");
      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
    });

    it("should allow per-request header overrides", async () => {
      const api = createInstance({
        baseUrl: BASE_URL,
        headers: {
          "X-Instance-Header": "instance-value",
        },
        withCache: false,
      });

      const result = await api.get("/posts/1", {
        headers: {
          "X-Request-Header": "request-value",
        },
      });

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
    });
  });

  describe("getConfig helper", () => {
    it("should return correct config for mapErrors: false", () => {
      const api = createInstance({
        baseUrl: BASE_URL,
        mapErrors: false,
        throwOnError: false,
      });

      const config = api.helpers.getConfig();
      expect(config.mapErrors).toBe(false);
      expect(config.throwOnError).toBe(false);
      expect(config.baseUrl).toBe(BASE_URL);
    });

    it("should return correct config for mapErrors: true", () => {
      const api = createInstance({
        baseUrl: BASE_URL,
        mapErrors: true,
        throwOnError: true,
        errorMapping: { 404: "Not Found" },
      });

      const config = api.helpers.getConfig();
      expect(config.mapErrors).toBe(true);
      expect(config.throwOnError).toBe(true);
      expect(config.errorMapping).toEqual({ 404: "Not Found" });
    });
  });
});
