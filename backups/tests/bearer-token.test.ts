import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET, POST, createInstance } from "../lib/index";
import { setupMockFetch } from "./mock-helpers";

describe("Bearer Token functionality (Issue #3)", () => {
  let mockSetup: ReturnType<typeof setupMockFetch>;

  beforeEach(() => {
    mockSetup = setupMockFetch({ id: 1, title: "test" });
  });

  afterEach(() => {
    mockSetup.restore();
  });

  it("should add Authorization header when bearerToken is passed in request options", async () => {
    await GET("https://api.example.com/test", {
      bearerToken: "test-token-123",
    });

    expect(mockSetup.calls).toHaveLength(1);
    expect(mockSetup.calls[0].options.headers).toHaveProperty(
      "Authorization",
      "Bearer test-token-123",
    );
  });

  it("should add Authorization header for POST requests with bearerToken", async () => {
    await POST("https://api.example.com/posts", {
      body: { title: "test post" },
      bearerToken: "post-token-456",
    });

    expect(mockSetup.calls).toHaveLength(1);
    expect(mockSetup.calls[0].options.headers).toHaveProperty(
      "Authorization",
      "Bearer post-token-456",
    );
  });

  it("should work with createInstance and bearerToken in request options", async () => {
    const api = createInstance({
      baseUrl: "https://api.example.com",
    });

    await api.get("/test", {
      bearerToken: "instance-token-789",
    });

    expect(mockSetup.calls).toHaveLength(1);
    expect(mockSetup.calls[0].options.headers).toHaveProperty(
      "Authorization",
      "Bearer instance-token-789",
    );
  });

  it("should merge bearerToken with existing headers", async () => {
    await GET("https://api.example.com/test", {
      headers: {
        "X-Custom": "custom-value",
      },
      bearerToken: "merge-token",
    });

    expect(mockSetup.calls).toHaveLength(1);
    const headers = mockSetup.calls[0].options.headers;
    expect(headers).toHaveProperty("Authorization", "Bearer merge-token");
    expect(headers).toHaveProperty("X-Custom", "custom-value");
  });

  it("should prioritize explicit Authorization header over bearerToken", async () => {
    await GET("https://api.example.com/test", {
      headers: {
        Authorization: "Bearer explicit-token",
      },
      bearerToken: "should-be-ignored",
    });

    expect(mockSetup.calls).toHaveLength(1);
    expect(mockSetup.calls[0].options.headers).toHaveProperty(
      "Authorization",
      "Bearer explicit-token",
    );
  });
});
