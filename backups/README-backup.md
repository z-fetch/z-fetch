# ⚡ Z-Fetch

The pragmatic native fetch API wrapper for JavaScript.

Just arguments and wraps native fetch so can work in any framework or JavaScript environment where fetch is available with no additional setup needed.

👉 See [Full Documentation](https://z-fetch.github.io/z-fetch/)

## 🚀 Features

- Framework Agnostic – use in any JavaScript project.
- Zero dependencies, just wraps the native fetch API.
- Intuitive modern API with per-request configuration and flexibility.
- Supports request cancellation on demand or on timeout.
- Global configuration for common request options.
- Supports all native fetch API options.
- Built-in caching with auto revalidation.
- Built-in request retries and configurable polling.
- Built-in helpers for common use cases such as setting bearer token!
- Auto JSON parsing and graceful error handling.
- Builtin hooks or interceptors.
- Request refetching on demand.
- **New! Additional HTTP methods:** OPTIONS, TRACE, HEAD and a CUSTOM method for any other HTTP verb.
- **New! TypeScript support** for better type safety and autocompletion.
- **New! Test coverage** for all core features and methods, for better reliability.

## ▶️ Installation

1. **Using npm, yarn or pnpm**

   ```bash
   npm install @z-fetch/fetch
   ```

## 🧑‍💻 How It Works?

## Creating Custom Instances

Z-Fetch allows you to create custom instances with their own configuration, which is useful for different API endpoints or services in your application.

### Basic Instance Creation - Recommended for most applications

```js
import { createInstance } from "@z-fetch/fetch";

// Create a custom instance with specific configuration
const api = createInstance({
  baseUrl: "https://jsonplaceholder.typicode.com",
  headers: {
    "X-Custom-Header": "custom-value",
  },
  timeout: 30000,
});

// Use the instance to make requests
const getPosts = async () => {
  const result = await api.get("/posts");
  if (result?.data) {
    console.log("Posts:", result.data);
  }
};

const createPost = async () => {
  const result = await api.post("/posts", {
    body: {
      title: "New Post",
      body: "This is the content",
      userId: 1,
    },
  });

  if (result?.data) {
    console.log("Created post:", result.data);
  }
};
```

## 😇 Quick Use, No Instance Needed!

### GET Request

```js
import { GET } from "@z-fetch/fetch";

const getPosts = async () => {
  const { data, error } = await GET(
    "https://jsonplaceholder.typicode.com/posts",
  );
  if (data) {
    console.log("Data:", data);
  } else {
    console.error("Error:", error.message);
  }
};
```

### POST Request

```js
import { POST } from "@z-fetch/fetch";

const createPost = async () => {
  const { data, error } = await POST(
    "https://jsonplaceholder.typicode.com/posts",
    {
      body: {
        title: "dune",
        body: "a story about the dune verse!",
        userId: 1,
      },
    },
  );
  if (data) {
    console.log("Data:", data);
  } else {
    console.error("Error:", error.message);
  }
};
```

👉 Visit the [docs](https://z-fetch.github.io/z-fetch/docs) for more examples on how to use and to explore full functionality.

### Cancellation

- Cancel early via the returned promise: `const p = GET('/users'); p.cancel(); const r = await p;`
- `error.status` is `"CANCELED"` with message `"Request canceled"`.
- Timeouts set `error.status` to `"TIMEOUT"` with message `"Request timed out!"`.
- Instances also expose `result.cancelRequest()` on the resolved result for aborting ongoing work.

```js
// Cancel a request
const p = api.get("/users", { timeout: 10000 });
setTimeout(() => p.cancel(), 50);
const res = await p;
if (res.error?.status === "CANCELED") {
  // handle cancel
}
```

### Cache Behavior

- Successful GETs are cached when `withCache: true`.
- Failed or canceled GETs are NOT cached; subsequent calls hit the network.
- Background revalidation runs after `revalidateCache` ms; on failure, cached data is preserved.

```js
const api = createInstance({ withCache: true, revalidateCache: 1000 });
await api.get("/items"); // caches on success
const { data } = await api.get("/items"); // served from cache; revalidates in background
```

### Credentials

- `withCredentials: true` sets fetch `credentials: 'include'` and XHR `withCredentials = true`.
- By default credentials are not included. You can still set native `credentials` per request when `withCredentials` is not used.

## 🔧 Recent Fixes & Enhancements

### Bearer Token Support (Fixed Issue #3)

Now you can pass `bearerToken` directly in request options:

```js
import { GET, POST } from "@z-fetch/fetch";

// Pass bearer token in request options
const result = await GET("/api/protected", {
  bearerToken: "your-token-here",
});

// Works with all HTTP methods
const postResult = await POST("/api/data", {
  body: { title: "My Post" },
  bearerToken: "your-token-here",
});
```

### Instance Configuration (Fixed Issue #4)

Instance options like `withCredentials` now work correctly:

```js
import { createInstance } from "@z-fetch/fetch";

const api = createInstance({
  baseUrl: "https://api.example.com",
  withCredentials: true, // Now works properly!
  headers: {
    "Content-Type": "application/json",
  },
});

// All requests will include credentials
const result = await api.get("/user-data");
```

### Error Handling - Native Fetch Behavior (Default)

By default, Z-Fetch behaves like native `fetch` for HTTP errors:

#### Default: `mapErrors: false` - Native Fetch Behavior

```js
import { createInstance, GET } from "@z-fetch/fetch";

const api = createInstance({
  baseUrl: "https://api.example.com",
});

// HTTP errors (400s, 500s) do NOT create error objects - just like native fetch
const result = await api.get("/protected");

// Check response.ok manually, like you would with native fetch
if (!result.response?.ok) {
  console.log("HTTP error:", result.response?.status); // e.g., 401, 404, 500
  console.log("Response body:", result.data); // Response body is still parsed
} else {
  console.log("Success:", result.data);
}

// result.error is null for HTTP errors with mapErrors: false
// Only network/timeout/cancel errors set result.error
```

#### Optional: `mapErrors: true` - Create Error Objects for HTTP Errors

Enable `mapErrors: true` to create error objects for HTTP errors (traditional API library behavior):

```js
const api = createInstance({
  baseUrl: "https://api.example.com",
  mapErrors: true, // Enable error objects for HTTP errors
  errorMapping: {
    // Optionally map status codes to custom messages
    401: "Authentication failed - please sign in again",
    403: "Access denied - insufficient permissions",
    404: "Resource not found",
    500: "Server error - please try again later",
    // Also map z-fetch internal errors
    "fetch failed": "Network connection failed",
  },
});

const result = await api.get("/protected");
if (result.error) {
  console.log(result.error.message); // Custom mapped message or statusText
  console.log(result.error.status); // 401, 404, 500, etc.
}
```

**Note:** By default (`mapErrors: false`), Z-Fetch behaves like native `fetch` - HTTP errors do NOT create error objects. You check `response.ok` manually. Network/timeout/cancel errors still create error objects. Set `mapErrors: true` to get traditional API library behavior where HTTP errors create error objects.

### `throwOnError` Configuration

When `mapErrors: true` is enabled, you can choose between returning errors in `result.error` or throwing them:

#### Default: `throwOnError: false` - Errors Returned in Result

```js
import { createInstance } from "@z-fetch/fetch";

const api = createInstance({
  baseUrl: "https://api.example.com",
  mapErrors: true, // Required for throwOnError to have effect on HTTP errors
  throwOnError: false, // Default - errors in result.error
});

const result = await api.get("/users");
if (result.error) {
  console.error("Request failed:", result.error.message);
  console.error("Status:", result.error.status);
} else {
  console.log("Data:", result.data);
}
```

#### `throwOnError: true` - Errors Are Thrown

```js
import { createInstance } from "@z-fetch/fetch";

const api = createInstance({
  baseUrl: "https://api.example.com",
  mapErrors: true, // Required for throwOnError to have effect on HTTP errors
  throwOnError: true, // Throw errors as exceptions
});

try {
  const result = await api.get("/users");
  console.log("Data:", result.data);
} catch (error) {
  console.error("Request failed:", error.message);
  console.error("Status:", error.status);
}

// Override per request
const result = await api.get("/users", { throwOnError: false });
if (result.error) {
  console.error("Error:", result.error);
}
```

**Note:** `throwOnError` only affects HTTP errors when `mapErrors: true`. Network/timeout/cancel errors always create error objects regardless of `mapErrors` setting.

**Benefits:**
- **Default (throwOnError: false)**: Safer, no unexpected crashes, explicit error checking
- **throwOnError: true**: Familiar try-catch pattern for developers from fetch/axios
- **Flexible**: Configure globally or per-request
- **Works with all features**: Retries, error mapping, hooks, and caching all work with both modes

## 🌟 Contributing

That’s it for now! More features will surely come, but this version of Z-Fetch already elevates fetching in your applications with enhanced flexibility and control.
Feel free to contribute, share suggestions, or propose new features. I’d be happy to hear from you!

Humble regards,
I am [Hussein Kizz](mailto:hssnkizz@gmail.com)
