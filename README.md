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
import { createInstance } from '@z-fetch/fetch';

// Create a custom instance with specific configuration
const api = createInstance({
  baseUrl: 'https://jsonplaceholder.typicode.com',
  headers: {
    'X-Custom-Header': 'custom-value'
  },
  timeout: 30000
});

// Use the instance to make requests
const getPosts = async () => {
  const result = await api.get('/posts');
  if (result?.data) {
    console.log('Posts:', result.data);
  }
};

const createPost = async () => {
  const result = await api.post('/posts', {
    body: {
      title: 'New Post',
      body: 'This is the content',
      userId: 1
    }
  });

  if (result?.data) {
    console.log('Created post:', result.data);
  }
};
```

## 😇 Quick Use, No Instance Needed!

### GET Request

```js
import { GET } from '@z-fetch/fetch';

const getPosts = async () => {
  const { data, error } = await GET('https://jsonplaceholder.typicode.com/posts');
  if (data) {
    console.log('Data:', data);
  } else {
    console.error('Error:', error.message);
  }
};
```

### POST Request

```js
import { POST } from '@z-fetch/fetch';

const createPost = async () => {
  const { data, error } = await POST('https://jsonplaceholder.typicode.com/posts', {
    body: {
      title: 'dune',
      body: 'a story about the dune verse!',
      userId: 1,
    },
  });
  if (data) {
    console.log('Data:', data);
  } else {
    console.error('Error:', error.message);
  }
};
```

👉 Visit the [docs](https://z-fetch.github.io/z-fetch/docs) for more examples on how to use and to explore full functionality.

## 🌟 Contributing

That’s it for now! More features will surely come, but this version of Z-Fetch already elevates fetching in your applications with enhanced flexibility and control.
Feel free to contribute, share suggestions, or propose new features. I’d be happy to hear from you!

Humble regards,
I am [Hussein Kizz](mailto:hssnkizz@gmail.com)
