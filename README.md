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

### Error Mapping Configuration (New Feature - Issue #5)

Configure custom error messages for z-fetch internal errors (network failures, timeouts, etc.):

```js
import { createInstance } from "@z-fetch/fetch";

const api = createInstance({
  baseUrl: "https://api.example.com",
  errorMapping: {
    // Map z-fetch internal error patterns
    "fetch failed": "Network connection failed - please check your internet",
    "network error": "Unable to connect to server",
    "Network error": "Connection lost - please check your internet",
  },
});

// Backend HTTP errors (400s, 500s) are returned as-is from the API
const result = await api.get("/protected");
if (result.error) {
  // Backend errors show original statusText from the server
  console.log(result.error.message); // e.g., "Unauthorized", "Not Found", etc.
  console.log(result.error.status); // e.g., 401, 404, 500
}
```

**Note:** Error mapping only applies to z-fetch internal errors (NETWORK_ERROR, TIMEOUT, CANCELED). Backend HTTP errors are returned as-is with the original response.statusText, allowing your backend to control error messages.

### Error Handling Configuration (New Feature)

Choose between returning errors in `result.error` (default) or throwing errors like traditional fetch/axios:

#### Default Behavior - Errors Returned in Result

```js
import { GET } from "@z-fetch/fetch";

// By default, errors are returned in result.error
const result = await GET("https://api.example.com/users");
if (result.error) {
  console.error("Request failed:", result.error.message);
  console.error("Status:", result.error.status);
} else {
  console.log("Data:", result.data);
}
```

#### throwOnError: true - Errors Are Thrown

```js
import { GET, createInstance } from "@z-fetch/fetch";

// Enable throwOnError for traditional try-catch error handling
try {
  const result = await GET("https://api.example.com/users", {
    throwOnError: true,
  });
  console.log("Data:", result.data);
} catch (error) {
  console.error("Request failed:", error.message);
  console.error("Status:", error.status);
}

// Or configure it at the instance level
const api = createInstance({
  baseUrl: "https://api.example.com",
  throwOnError: true,
  errorMapping: {
    "fetch failed": "Network connection failed",
    "network error": "Unable to connect",
  },
});

// All requests will now throw on error
try {
  const users = await api.get("/users");
  const posts = await api.get("/posts");
  console.log({ users, posts });
} catch (error) {
  // Backend errors show original statusText from server
  // Network errors show custom message from errorMapping
  console.error("API Error:", error.message, error.status);
}

// You can still override per request
const result = await api.get("/users", { throwOnError: false });
if (result.error) {
  // Back to the default behavior for this request
  console.error("Error:", result.error);
}
```

**Benefits:**
- **Default (throwOnError: false)**: Safer for beginners, no unexpected crashes, explicit error checking
- **throwOnError: true**: Familiar for developers coming from fetch/axios, cleaner async/await code with try-catch
- **Flexible**: Configure globally or per-request based on your needs
- **Works with all features**: Retries, error mapping, hooks, and caching all work with both modes

## 🌟 Contributing

That’s it for now! More features will surely come, but this version of Z-Fetch already elevates fetching in your applications with enhanced flexibility and control.
Feel free to contribute, share suggestions, or propose new features. I’d be happy to hear from you!

Humble regards,
I am [Hussein Kizz](mailto:hssnkizz@gmail.com)
