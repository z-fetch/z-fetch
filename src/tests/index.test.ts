import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET, POST, PUT, DELETE, PATCH } from "../../index";
import { setupMockFetch } from "./mock-helpers";

describe("Z-Fetch integration tests (mocked)", () => {
  let mockSetup: ReturnType<typeof setupMockFetch>;

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

  // GET request: fetch a single post
  it("should perform a successful GET request and return data", async () => {
    const result = await GET("https://jsonplaceholder.typicode.com/posts/1");
    expect(result.data).toHaveProperty("id", 1);
    expect(result.error).toBeNull();
  });

  // POST request: create a new post
  it("should perform a successful POST request and return created data", async () => {
    const payload = { title: "foo", body: "bar", userId: 1 };
    const result = await POST("https://jsonplaceholder.typicode.com/posts", {
      body: payload,
    });
    // Mock returns the default mock data with id
    expect(result.data).toHaveProperty("id");
    expect(result.error).toBeNull();
  });

  // PUT request: update an existing post
  it("should perform a successful PUT request and return updated data", async () => {
    const payload = {
      id: 1,
      title: "foo updated",
      body: "bar updated",
      userId: 1,
    };
    const result = await PUT("https://jsonplaceholder.typicode.com/posts/1", {
      body: payload,
    });
    expect(result.data).toHaveProperty("id", 1);
    expect(result.error).toBeNull();
  });

  // PATCH request: partially update a post
  it("should perform a successful PATCH request and return patched data", async () => {
    const payload = { title: "foo patched" };
    const result = await PATCH("https://jsonplaceholder.typicode.com/posts/1", {
      body: payload,
    });
    expect(result.data).toHaveProperty("id", 1);
    expect(result.error).toBeNull();
  });

  // DELETE request: delete a post
  it("should perform a successful DELETE request without error", async () => {
    const result = await DELETE("https://jsonplaceholder.typicode.com/posts/1");
    // Mock returns the default mock data, but no error
    expect(result.error).toBeNull();
  });

  //   // Testing global config: set a baseUrl so that GET('/posts/1') resolves correctly.
  //   it("should update global config and use baseUrl for GET requests", async () => {
  //     // Set the baseUrl for all requests.
  //     setConfig({ baseUrl: "https://jsonplaceholder.typicode.com" });
  //     const result = await GET("/posts/1");
  //     expect(result.data).toHaveProperty("id", 1);
  //     expect(result.error).toBeNull();
  //     // Optionally reset config after the test:
  //     setConfig({ baseUrl: "" });
  //   });

  //   // Testing bearer token: use httpbin.org to echo request headers.
  //   it("should update headers when setting a bearer token", async () => {
  //     // Set a bearer token
  //     setBearerToken("my-secret-token");
  //     // httpbin.org/anything echoes the request details, including headers.
  //     const result = await GET("https://httpbin.org/anything");
  //     expect(result.data.headers).toHaveProperty(
  //       "Authorization",
  //       "Bearer my-secret-token",
  //     );
  //   });
});
