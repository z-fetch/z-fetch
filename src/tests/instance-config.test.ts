import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createInstance } from "../lib/index";
import { setupMockFetch } from "./mock-helpers";

describe("Instance configuration (Issue #4)", () => {
  let mockSetup: ReturnType<typeof setupMockFetch>;

  beforeEach(() => {
    mockSetup = setupMockFetch({ id: 1, data: "test" });
  });

  afterEach(() => {
    mockSetup.restore();
  });

  it("should apply withCredentials: true to requests", async () => {
    const api = createInstance({
      baseUrl: "https://api.example.com",
      withCredentials: true,
    });

    await api.get("/test");

    expect(mockSetup.calls).toHaveLength(1);
    expect(mockSetup.calls[0].options.credentials).toBe("include");
  });

  it("should apply custom headers from instance config", async () => {
    const api = createInstance({
      baseUrl: "https://api.example.com",
      headers: {
        "X-Custom-Header": "instance-value",
        "Accept": "application/json",
      },
    });

    await api.get("/test");

    expect(mockSetup.calls).toHaveLength(1);
    const headers = mockSetup.calls[0].options.headers;
    expect(headers).toHaveProperty("X-Custom-Header", "instance-value");
    expect(headers).toHaveProperty("Accept", "application/json");
  });

  it("should apply custom mode from instance config", async () => {
    const api = createInstance({
      baseUrl: "https://api.example.com", 
      mode: "no-cors",
    });

    await api.get("/test");

    expect(mockSetup.calls).toHaveLength(1);
    expect(mockSetup.calls[0].options.mode).toBe("no-cors");
  });

  it("should merge instance headers with request headers", async () => {
    const api = createInstance({
      baseUrl: "https://api.example.com",
      headers: {
        "X-Instance": "instance-value",
        "Content-Type": "application/json",
      },
    });

    await api.post("/test", {
      headers: {
        "X-Request": "request-value",
        "Content-Type": "application/xml", // Should override instance
      },
      body: { test: "data" },
    });

    expect(mockSetup.calls).toHaveLength(1);
    const headers = mockSetup.calls[0].options.headers;
    expect(headers).toHaveProperty("X-Instance", "instance-value");
    expect(headers).toHaveProperty("X-Request", "request-value");
    expect(headers).toHaveProperty("Content-Type", "application/xml");
  });

  it("should apply bearerToken from setBearerToken helper", async () => {
    const api = createInstance({
      baseUrl: "https://api.example.com",
    });

    api.helpers.setBearerToken("helper-token");
    await api.get("/test");

    expect(mockSetup.calls).toHaveLength(1);
    expect(mockSetup.calls[0].options.headers).toHaveProperty(
      "Authorization",
      "Bearer helper-token"
    );
  });

  it("should return correct config from getConfig helper", () => {
    const api = createInstance({
      baseUrl: "https://api.example.com",
      timeout: 5000,
      headers: {
        "X-Test": "test-value",
      },
    });

    const config = api.helpers.getConfig();
    expect(config.baseUrl).toBe("https://api.example.com");
    expect(config.timeout).toBe(5000);
    expect(config.headers).toHaveProperty("X-Test", "test-value");
  });

  it("should combine instance baseUrl with relative URLs", async () => {
    const api = createInstance({
      baseUrl: "https://api.example.com/v1",
    });

    await api.get("/users/123");

    expect(mockSetup.calls).toHaveLength(1);
    expect(mockSetup.calls[0].url).toBe("https://api.example.com/v1/users/123");
  });
});