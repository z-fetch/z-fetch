import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createInstance, GET, POST, PUT, DELETE } from "../lib/index";

/**
 * Integration tests using real public APIs (JSONPlaceholder)
 * These tests verify the library works correctly with actual network requests.
 * 
 * Note: These tests require network connectivity and depend on external APIs.
 * They will be skipped if there's no network access.
 */

// Helper to check if network is available
async function isNetworkAvailable(): Promise<boolean> {
  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/posts/1", {
      method: "HEAD",
    });
    return response.ok;
  } catch {
    return false;
  }
}

describe("Integration Tests with Real APIs", () => {
  // JSONPlaceholder API base URL
  const JSONPLACEHOLDER_URL = "https://jsonplaceholder.typicode.com";
  let networkAvailable = false;

  beforeAll(async () => {
    networkAvailable = await isNetworkAvailable();
  });

  describe("Direct function calls (global config)", () => {
    it.skipIf(!globalThis.fetch)("GET should fetch posts from JSONPlaceholder", async () => {
      if (!networkAvailable) return;

      const result = await GET(`${JSONPLACEHOLDER_URL}/posts/1`, {
        withCache: false,
      });

      expect(result.error).toBeNull();
      expect(result.response?.ok).toBe(true);
      expect(result.response?.status).toBe(200);
      expect(result.data).toMatchObject({
        userId: expect.any(Number),
        id: 1,
        title: expect.any(String),
        body: expect.any(String),
      });
    });

    it.skipIf(!globalThis.fetch)("POST should create a post on JSONPlaceholder", async () => {
      if (!networkAvailable) return;

      const newPost = {
        title: "Test Post",
        body: "This is a test post body",
        userId: 1,
      };

      const result = await POST(`${JSONPLACEHOLDER_URL}/posts`, {
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
  });

  describe("Instance-level config (createInstance)", () => {
    describe("mapErrors: false (default, native fetch behavior)", () => {
      it.skipIf(!globalThis.fetch)("should successfully fetch data on 200", async () => {
        if (!networkAvailable) return;

        const api = createInstance({
          baseUrl: JSONPLACEHOLDER_URL,
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

      it.skipIf(!globalThis.fetch)("should NOT create error for 404 - behave like native fetch", async () => {
        if (!networkAvailable) return;

        const api = createInstance({
          baseUrl: JSONPLACEHOLDER_URL,
          mapErrors: false,
          withCache: false,
        });

        const result = await api.get("/posts/99999");

        // With mapErrors: false, no error object is created
        expect(result.error).toBeNull();
        // User checks response.ok manually, like native fetch
        expect(result.response?.ok).toBe(false);
        expect(result.response?.status).toBe(404);
        // Data should still be available (empty object for 404)
        expect(result.data).toBeDefined();
      });

      it.skipIf(!globalThis.fetch)("should make POST request successfully", async () => {
        if (!networkAvailable) return;

        const api = createInstance({
          baseUrl: JSONPLACEHOLDER_URL,
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

      it.skipIf(!globalThis.fetch)("should make PUT request successfully", async () => {
        if (!networkAvailable) return;

        const api = createInstance({
          baseUrl: JSONPLACEHOLDER_URL,
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

      it.skipIf(!globalThis.fetch)("should make DELETE request successfully", async () => {
        if (!networkAvailable) return;

        const api = createInstance({
          baseUrl: JSONPLACEHOLDER_URL,
          mapErrors: false,
          withCache: false,
        });

        const result = await api.delete("/posts/1");

        expect(result.error).toBeNull();
        expect(result.response?.ok).toBe(true);
        expect(result.response?.status).toBe(200);
      });
    });

    describe("mapErrors: true (create error objects for HTTP errors)", () => {
      it.skipIf(!globalThis.fetch)("should successfully fetch data on 200", async () => {
        if (!networkAvailable) return;

        const api = createInstance({
          baseUrl: JSONPLACEHOLDER_URL,
          mapErrors: true,
          throwOnError: false,
          withCache: false,
        });

        const result = await api.get("/users/1");

        expect(result.error).toBeNull();
        expect(result.response?.ok).toBe(true);
        expect(result.data).toMatchObject({
          id: 1,
          name: expect.any(String),
        });
      });

      it.skipIf(!globalThis.fetch)("should CREATE error object for 404", async () => {
        if (!networkAvailable) return;

        const api = createInstance({
          baseUrl: JSONPLACEHOLDER_URL,
          mapErrors: true,
          throwOnError: false,
          withCache: false,
        });

        const result = await api.get("/posts/99999");

        // With mapErrors: true, error object is created
        expect(result.error).not.toBeNull();
        expect(result.error?.status).toBe(404);
        expect(result.error?.message).toBeDefined();
      });
    });

    describe("mapErrors: true + throwOnError: true", () => {
      it.skipIf(!globalThis.fetch)("should not throw on successful request", async () => {
        if (!networkAvailable) return;

        const api = createInstance({
          baseUrl: JSONPLACEHOLDER_URL,
          mapErrors: true,
          throwOnError: true,
          withCache: false,
        });

        const result = await api.get("/posts/1");

        expect(result.error).toBeNull();
        expect(result.data?.id).toBe(1);
      });

      it.skipIf(!globalThis.fetch)("should THROW on 404 error", async () => {
        if (!networkAvailable) return;

        const api = createInstance({
          baseUrl: JSONPLACEHOLDER_URL,
          mapErrors: true,
          throwOnError: true,
          withCache: false,
        });

        await expect(api.get("/posts/99999")).rejects.toMatchObject({
          status: 404,
          message: expect.any(String),
        });
      });
    });

    describe("errorMapping", () => {
      it.skipIf(!globalThis.fetch)("should use custom error mapping for 404", async () => {
        if (!networkAvailable) return;

        const api = createInstance({
          baseUrl: JSONPLACEHOLDER_URL,
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
    });
  });

  describe("Per-request config overrides", () => {
    describe("mapErrors override", () => {
      it.skipIf(!globalThis.fetch)("per-request mapErrors: true should override instance mapErrors: false", async () => {
        if (!networkAvailable) return;

        const api = createInstance({
          baseUrl: JSONPLACEHOLDER_URL,
          mapErrors: false, // Instance default
          withCache: false,
        });

        // Override to mapErrors: true at request level
        const result = await api.get("/posts/99999", {
          mapErrors: true,
        });

        // Should create error object because per-request mapErrors: true
        expect(result.error).not.toBeNull();
        expect(result.error?.status).toBe(404);
      });

      it.skipIf(!globalThis.fetch)("per-request mapErrors: false should override instance mapErrors: true", async () => {
        if (!networkAvailable) return;

        const api = createInstance({
          baseUrl: JSONPLACEHOLDER_URL,
          mapErrors: true, // Instance default
          withCache: false,
        });

        // Override to mapErrors: false at request level
        const result = await api.get("/posts/99999", {
          mapErrors: false,
        });

        // Should NOT create error object because per-request mapErrors: false
        expect(result.error).toBeNull();
        expect(result.response?.ok).toBe(false);
        expect(result.response?.status).toBe(404);
      });
    });

    describe("throwOnError override", () => {
      it.skipIf(!globalThis.fetch)("per-request throwOnError: true should override instance throwOnError: false", async () => {
        if (!networkAvailable) return;

        const api = createInstance({
          baseUrl: JSONPLACEHOLDER_URL,
          mapErrors: true,
          throwOnError: false, // Instance default - don't throw
          withCache: false,
        });

        // Override to throwOnError: true at request level
        await expect(
          api.get("/posts/99999", { throwOnError: true })
        ).rejects.toMatchObject({
          status: 404,
        });
      });

      it.skipIf(!globalThis.fetch)("per-request throwOnError: false should override instance throwOnError: true", async () => {
        if (!networkAvailable) return;

        const api = createInstance({
          baseUrl: JSONPLACEHOLDER_URL,
          mapErrors: true,
          throwOnError: true, // Instance default - throw
          withCache: false,
        });

        // Override to throwOnError: false at request level
        const result = await api.get("/posts/99999", {
          throwOnError: false,
        });

        // Should NOT throw, should return error in result
        expect(result.error).not.toBeNull();
        expect(result.error?.status).toBe(404);
      });
    });

    describe("errorMapping override", () => {
      it.skipIf(!globalThis.fetch)("per-request errorMapping should override instance errorMapping", async () => {
        if (!networkAvailable) return;

        const api = createInstance({
          baseUrl: JSONPLACEHOLDER_URL,
          mapErrors: true,
          withCache: false,
          errorMapping: {
            404: "Instance: Not Found",
          },
        });

        // Override errorMapping at request level
        const result = await api.get("/posts/99999", {
          errorMapping: {
            404: "Request: Custom 404 Message",
          },
        });

        expect(result.error).not.toBeNull();
        expect(result.error?.message).toBe("Request: Custom 404 Message");
      });
    });
  });

  describe("Global config vs Instance config", () => {
    it.skipIf(!globalThis.fetch)("instance config should be isolated from other instances", async () => {
      if (!networkAvailable) return;

      const apiWithErrors = createInstance({
        baseUrl: JSONPLACEHOLDER_URL,
        mapErrors: true,
        throwOnError: true,
        withCache: false,
      });

      const apiNativeFetch = createInstance({
        baseUrl: JSONPLACEHOLDER_URL,
        mapErrors: false,
        throwOnError: false,
        withCache: false,
      });

      // apiWithErrors should throw on 404
      await expect(apiWithErrors.get("/posts/99999")).rejects.toMatchObject({
        status: 404,
      });

      // apiNativeFetch should NOT throw, behave like native fetch
      const result = await apiNativeFetch.get("/posts/99999");
      expect(result.error).toBeNull();
      expect(result.response?.ok).toBe(false);
    });

    it.skipIf(!globalThis.fetch)("direct GET/POST calls should use global defaults", async () => {
      if (!networkAvailable) return;

      // Direct GET calls should behave like native fetch (mapErrors: false by default)
      const result = await GET(`${JSONPLACEHOLDER_URL}/posts/99999`, {
        withCache: false,
      });

      // mapErrors: false is default, so no error object
      expect(result.error).toBeNull();
      expect(result.response?.ok).toBe(false);
      expect(result.response?.status).toBe(404);
    });
  });

  describe("Response data parsing", () => {
    it.skipIf(!globalThis.fetch)("should correctly parse JSON responses", async () => {
      if (!networkAvailable) return;

      const api = createInstance({
        baseUrl: JSONPLACEHOLDER_URL,
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

    it.skipIf(!globalThis.fetch)("should preserve response object for manual inspection", async () => {
      if (!networkAvailable) return;

      const api = createInstance({
        baseUrl: JSONPLACEHOLDER_URL,
        mapErrors: false,
        withCache: false,
      });

      const result = await api.get("/posts/1");

      expect(result.response).toBeDefined();
      expect(result.response?.ok).toBe(true);
      expect(result.response?.status).toBe(200);
      expect(result.response?.statusText).toBeDefined();
    });
  });

  describe("Headers configuration", () => {
    it.skipIf(!globalThis.fetch)("should use instance-level headers", async () => {
      if (!networkAvailable) return;

      const api = createInstance({
        baseUrl: JSONPLACEHOLDER_URL,
        headers: {
          "X-Custom-Header": "test-value",
        },
        withCache: false,
      });

      // JSONPlaceholder doesn't validate headers, but we can verify the request succeeds
      const result = await api.get("/posts/1");
      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
    });

    it.skipIf(!globalThis.fetch)("should allow per-request header overrides", async () => {
      if (!networkAvailable) return;

      const api = createInstance({
        baseUrl: JSONPLACEHOLDER_URL,
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
        baseUrl: JSONPLACEHOLDER_URL,
        mapErrors: false,
        throwOnError: false,
      });

      const config = api.helpers.getConfig();
      expect(config.mapErrors).toBe(false);
      expect(config.throwOnError).toBe(false);
      expect(config.baseUrl).toBe(JSONPLACEHOLDER_URL);
    });

    it("should return correct config for mapErrors: true", () => {
      const api = createInstance({
        baseUrl: JSONPLACEHOLDER_URL,
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
