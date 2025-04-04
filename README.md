# ⚡ Z-Fetch

The pragmatic native fetch API wrapper made to enhance fetching in JavaScript Applications.

Just arguments and wraps native fetch so can work in any framework or JavaScript environment where fetch is available with no additional setup needed.

## 🚀 Features

- Framework Agnostic – use in any JavaScript project.
- Zero dependencies, just wraps the native fetch API.
- Intuitive modern API with per-request configuration and flexibility.
- Supports request cancellation on demand or on timeout.
- Global configuration for common request options.
- Supports all native fetch API options.
- Built-in caching with auto revalidation.
- Built-in request retries and configurable polling.
- Built-in bearer token handling – no interceptors required!
- Auto JSON parsing and graceful error handling.
- Request refetching on demand.
- **New! Additional HTTP methods:** OPTIONS, TRACE, HEAD and a CUSTOM method for any other HTTP verb.
- **New! TypeScript support** for better type safety and autocompletion.
- **New! Test coverage** for all core features and methods, for better reliability.

## ▶️ Installation

1. **Using npm, yarn or pnpm**

   ```bash
   npm install @z-fetch/fetch
   ```

2. **Using a CDN**

  ```html
  <script src="https://cdn.jsdelivr.net/npm/@z-fetch/fetch@latest/dist/index.js"></script>
  ```

## Notes For Nerds

- Z-Fetch is built on top of the native fetch API, so all fetch options are valid and supported.
- JSON parsing responses is done automatically, but you can disable it if needed via request options or global config.
- Payloads or bodys are automatically stringified to JSON, but you can disable it if needed via request options or global config.

## 😇 How To Use With Examples

### GET Request

```js
import { GET } from '@z-fetch/fetch';

const getPosts = async () => {
  const { data, error, loading } = await GET('https://jsonplaceholder.typicode.com/posts');
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
  const { data, error, loading } = await POST('https://jsonplaceholder.typicode.com/posts', {
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

### PUT Request

```js
import { PUT } from '@z-fetch/fetch';

const updatePost = async () => {
  const { data, error, loading } = await PUT('https://jsonplaceholder.typicode.com/posts/1', {
    body: {
      title: 'dune latest',
      body: 'a story about the dune verse has changed now the spices rule!',
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

### PATCH Request

```js
import { PATCH } from '@z-fetch/fetch';

const modifyPost = async () => {
  const { data, error, loading } = await PATCH('https://jsonplaceholder.typicode.com/posts/1', {
    body: {
      title: 'dune movie',
    },
  });
  if (data) {
    console.log('Data:', data);
  } else {
    console.error('Error:', error.message);
  }
};
```

### DELETE Request

```js
import { DELETE } from '@z-fetch/fetch';

const deletePost = async () => {
  const { error } = await DELETE('https://jsonplaceholder.typicode.com/posts/1');
  if (!error) {
    console.log('Item deleted successfully!');
  } else {
    console.error('Error Deleting Item:', error.message);
  }
};
```

### OPTIONS, TRACE, HEAD and CUSTOM Methods

**OPTIONS Request**

```js
import { OPTIONS } from '@z-fetch/fetch';

const optionsRequest = async () => {
  const { data, error, loading } = await OPTIONS('https://jsonplaceholder.typicode.com/posts');
  if (data) {
    console.log('OPTIONS Data:', data);
  } else {
    console.error('Error:', error.message);
  }
};
```

**TRACE Request**

```js
import { TRACE } from '@z-fetch/fetch';

const traceRequest = async () => {
  const { data, error, loading } = await TRACE('https://jsonplaceholder.typicode.com/posts');
  if (data) {
    console.log('TRACE Data:', data);
  } else {
    console.error('Error:', error.message);
  }
};
```

**HEAD Request**

```js
import { HEAD } from '@z-fetch/fetch';

const headRequest = async () => {
  const { response, error, loading } = await HEAD('https://jsonplaceholder.typicode.com/posts');
  if (response) {
    console.log('HEAD Response Headers:', response.headers);
  } else {
    console.error('Error:', error.message);
  }
};
```

**CUSTOM Request**

```js
import { CUSTOM } from '@z-fetch/fetch';

const customRequest = async () => {
  // Example with a custom HTTP method like CONNECT or any other non-standard method.
  const { data, error, loading } = await CUSTOM('https://jsonplaceholder.typicode.com/posts', 'CUSTOM', {
    body: {
      customData: 'example',
    },
  });
  if (data) {
    console.log('CUSTOM Data:', data);
  } else {
    console.error('Error:', error.message);
  }
};
```

## Advanced Usage 😳

### Set Global Configuration

```js
import { setConfig, GET } from '@z-fetch/fetch';

setConfig({
  baseUrl: 'https://jsonplaceholder.typicode.com',
  timeout: 5000,
  withCredentials: false,
  parseJson: true,
});

const getPosts = async () => {
  const { data, error, loading } = await GET('/posts');
  if (data) {
    console.log('Data:', data);
  } else {
    console.error('Error:', error.message);
  }
};
```

Or set per request:

```js
import { GET } from '@z-fetch/fetch';

const getPosts = async () => {
  const { data, error, loading } = await GET('https://jsonplaceholder.typicode.com/posts', {
    parseJson: false,
    headers: {
      'Content-Type': 'application/text',
    },
    retry: true,
    maxRetries: 3,
  });

  if (data) {
    console.log('Data:', data);
  } else {
    console.error('Error:', error.message);
  }
};
```

## List of All Available Config Options

Here is the list of all the available options in addition to the native fetch options. Note that all fetch API options are valid and supported; these below are just enhancements Z-Fetch adds on top.

| Option             | Description                                          | Use Case                                   | Default Value                                             |
| ------------------ | ---------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------- |
| `baseUrl`          | Base URL for all requests                            | Set a common base URL for all API requests | `''`                                                      |
| `bearerToken`      | Bearer token for authentication                      | Authenticate requests with a bearer token  | `null`                                                    |
| `timeout`          | Request timeout in milliseconds                      | Set a timeout for requests                 | `90000`                                                   |
| `retry`            | Whether to retry failed requests                     | Automatically retry failed requests        | `false`                                                   |
| `maxRetries`       | Maximum number of retries                            | Set a limit on the number of retries       | `3`                                                       |
| `startPolling`     | Whether to start polling automatically               | Enable automatic polling                   | `false`                                                   |
| `stopPolling`      | Whether to stop polling automatically                | Disable polling after certain conditions   | `false`                                                   |
| `pollingInterval`  | Interval between polls in milliseconds               | Set polling interval                       | `5000`                                                    |
| `revalidateCache`  | Time in milliseconds before revalidating cached data | Refresh cached data after a specific time  | `10000`                                                   |
| `withCredentials`  | Whether to include credentials in requests           | Include credentials like cookies           | `false`                                                   |
| `withCache`        | Whether to use caching for GET requests              | Cache GET request responses                | `true`                                                    |
| `parseJson`        | Whether to parse response as JSON                    | Automatically parse JSON responses         | `true`                                                    |
| `stringifyPayload` | Whether to stringify request body                    | Automatically stringify request body       | `true`                                                    |
| `mode`             | CORS mode for requests                               | Set CORS mode (e.g., 'cors', 'no-cors')    | `'cors'`                                                  |
| `headers`          | Default headers for all requests                     | Set default headers                        | `{ 'Content-Type': 'application/json', 'Accept': '*/*' }` |

Alternatively, you can set the bearer token globally for all requests using the `setBearerToken` method:

```js
import { setBearerToken } from '@z-fetch/fetch';

setBearerToken('your-bearer-token');
```

## More Advanced Features

Z-Fetch also exposes methods for polling, caching, request cancellation, and refetching:

### Polling

```js
import { setConfig, GET } from '@z-fetch/fetch';

setConfig({
  baseUrl: 'https://jsonplaceholder.typicode.com',
  timeout: 5000,
  withCredentials: true,
  parseJson: true,
});

let pageCount = 1;
let pagesData = [];

const getPosts = async () => {
  const { data, error, loading, startPolling, stopPolling, onPollDataReceived } = await GET(`/posts?page=${pageCount}`);
  if (data) {
    pagesData.push({ page: pageCount, data });
    pageCount++;
  } else {
    console.error('Error:', error.message);
  }

  if (pageCount < 100) {
    startPolling(10000); // Poll every 10 seconds
    onPollDataReceived((pollData) => {
      pagesData.push({ page: pageCount, data: pollData });
      pageCount++;
    });
  } else {
    stopPolling();
  }
};
```

### Caching

```js
import { GET } from '@z-fetch/fetch';

const getCachedPosts = async () => {
  const { data, error, loading } = await GET('https://jsonplaceholder.typicode.com/posts', {
    withCache: true,
    revalidateCache: 60000, // Revalidate cache every 60 seconds
  });
  if (data) {
    console.log('Cached Data:', data);
  } else {
    console.error('Caching Error:', error.message);
  }
};
```

### Request Cancelling

```js
import { GET } from '@z-fetch/fetch';

const cancelButton = document.getElementById('cancelButton');

const getPosts = async () => {
  const { data, error, loading, cancelRequest } = await GET('https://jsonplaceholder.typicode.com/posts');
  if (data) {
    console.log('Data:', data);
  } else {
    console.error('Error:', error.message);
  }
};

cancelButton.addEventListener('click', () => cancelRequest());
```

### Refetching

```js
import { GET } from '@z-fetch/fetch';

let reloadButton = document.getElementById('reloadButton');
let itemsList = [];

const getPosts = async () => {
  const { data, error, loading, refetch } = await GET('https://jsonplaceholder.typicode.com/posts');
  if (data) {
    itemsList = data;
  } else {
    console.error('Error:', error.message);
  }
};

reloadButton.addEventListener('click', () => refetch((newData) => {
  itemsList = newData;
}));
```

### Direct Use of Fetch Options

You can use Z-Fetch as you would use the native fetch, with extra features:

```js
import { POST } from '@z-fetch/fetch';

const createPost = async () => {
  const { response } = await POST('https://jsonplaceholder.typicode.com/posts', {
    body: JSON.stringify({
      title: 'dune',
      body: 'A family gets attacked and great houses do nothing about it!',
      userId: 1,
    }),
    parseJson: false,
    stringifyPayload: false,
  });
  const data = await response.json();
  if (data) {
    console.log('Data:', data);
  } else {
    console.error('Error:', response.error.message);
  }
};
```

## 🌟 Contributing

That’s it for now! More features will surely come, but this version of Z-Fetch already elevates fetching in your applications with enhanced flexibility and control.  
Feel free to contribute, share suggestions, or propose new features. I’d be happy to hear from you!

Humble regards,  
I am [Hussein Kizz](mailto:hssnkizz@gmail.com)