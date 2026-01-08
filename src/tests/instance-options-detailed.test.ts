import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createInstance, GET } from "../lib/index";

describe("Instance configuration options detailed tests", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("mapErrors option on instance", () => {
    it("should NOT map backend 400 error when mapErrors: false is set on instance", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: async () => ({}),
          text: async () => "",
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        mapErrors: false,
        errorMapping: {
          400: "Custom mapped error - should NOT be used",
        },
      });

      const result = await api.get("/test");

      expect(result.error).not.toBeNull();
      // mapErrors: false means we should get the original statusText
      expect(result.error?.message).toBe("Bad Request");
      expect(result.error?.status).toBe(400);
    });

    it("should MAP backend 400 error when mapErrors: true is set on instance", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: async () => ({}),
          text: async () => "",
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        mapErrors: true,
        errorMapping: {
          400: "Custom mapped error - SHOULD be used",
        },
      });

      const result = await api.get("/test");

      expect(result.error).not.toBeNull();
      // mapErrors: true means we should get the mapped message
      expect(result.error?.message).toBe("Custom mapped error - SHOULD be used");
      expect(result.error?.status).toBe(400);
    });

    it("per-request mapErrors should override instance mapErrors: false", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: async () => ({}),
          text: async () => "",
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        mapErrors: false,
        errorMapping: {
          400: "Instance mapped error",
        },
      });

      // Override mapErrors at request level
      const result = await api.get("/test", {
        mapErrors: true,
      });

      expect(result.error).not.toBeNull();
      // Per-request mapErrors: true should override instance mapErrors: false
      expect(result.error?.message).toBe("Instance mapped error");
      expect(result.error?.status).toBe(400);
    });

    it("per-request mapErrors: false should override instance mapErrors: true", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: async () => ({}),
          text: async () => "",
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        mapErrors: true,
        errorMapping: {
          400: "Instance mapped error",
        },
      });

      // Override mapErrors at request level
      const result = await api.get("/test", {
        mapErrors: false,
      });

      expect(result.error).not.toBeNull();
      // Per-request mapErrors: false should override instance mapErrors: true
      expect(result.error?.message).toBe("Bad Request");
      expect(result.error?.status).toBe(400);
    });
  });

  describe("throwOnError option on instance", () => {
    it("should NOT throw when throwOnError: false is set on instance", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: async () => ({}),
          text: async () => "",
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        throwOnError: false,
      });

      // Should NOT throw, should return error in result
      const result = await api.get("/test");

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Bad Request");
    });

    it("should THROW when throwOnError: true is set on instance", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: async () => ({}),
          text: async () => "",
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        throwOnError: true,
      });

      // Should throw
      await expect(api.get("/test")).rejects.toMatchObject({
        message: "Bad Request",
        status: 400,
      });
    });

    it("per-request throwOnError should override instance throwOnError: false", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: async () => ({}),
          text: async () => "",
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        throwOnError: false,
      });

      // Override throwOnError at request level
      await expect(api.get("/test", { throwOnError: true })).rejects.toMatchObject({
        message: "Bad Request",
        status: 400,
      });
    });

    it("per-request throwOnError: false should override instance throwOnError: true", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: async () => ({}),
          text: async () => "",
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        throwOnError: true,
      });

      // Override throwOnError at request level - should NOT throw
      const result = await api.get("/test", { throwOnError: false });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Bad Request");
    });
  });

  describe("Combined mapErrors + throwOnError on instance", () => {
    it("should respect both mapErrors: false and throwOnError: false", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: async () => ({}),
          text: async () => "",
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        mapErrors: false,
        throwOnError: false,
        errorMapping: {
          400: "Should NOT be used",
        },
      });

      const result = await api.get("/test");

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe("Bad Request");
      expect(result.error?.status).toBe(400);
    });

    it("should respect both mapErrors: true and throwOnError: true", async () => {
      globalThis.fetch = async () =>
        ({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: async () => ({}),
          text: async () => "",
        }) as any;

      const api = createInstance({
        baseUrl: "https://api.example.com",
        mapErrors: true,
        throwOnError: true,
        errorMapping: {
          400: "Mapped error",
        },
      });

      await expect(api.get("/test")).rejects.toMatchObject({
        message: "Mapped error",
        status: 400,
      });
    });
  });

  describe("Config verification", () => {
    it("getConfig should return instance config with correct mapErrors value", () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
        mapErrors: false,
        throwOnError: false,
        errorMapping: { 400: "test" },
      });

      const config = api.helpers.getConfig();
      expect(config.mapErrors).toBe(false);
      expect(config.throwOnError).toBe(false);
      expect(config.errorMapping).toEqual({ 400: "test" });
    });

    it("default config should have mapErrors: false", () => {
      const api = createInstance({
        baseUrl: "https://api.example.com",
      });

      const config = api.helpers.getConfig();
      expect(config.mapErrors).toBe(false);
      expect(config.throwOnError).toBe(false);
    });
  });
});
