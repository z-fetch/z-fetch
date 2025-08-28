// Mock fetch helper for testing without network dependency
export function createMockFetch(mockResponse: any = { id: 1, title: "test" }) {
  const calls: Array<{ url: string; options: any }> = [];

  const mockFetch = async (url: string | URL, options: any = {}) => {
    calls.push({ url: url.toString(), options });

    // Handle error scenarios based on mockResponse configuration
    if (mockResponse && typeof mockResponse === "object") {
      if (mockResponse.success === false || mockResponse.status >= 400) {
        const status = mockResponse.status || 404;
        const statusText =
          mockResponse.statusText || (status === 404 ? "Not Found" : "Error");

        return {
          ok: false,
          status,
          statusText,
          url: url.toString(),
          json: async () => {
            throw new Error("Response not ok");
          },
          text: async () => statusText,
          headers: new Headers(),
          body: null,
          bodyUsed: false,
          clone: () => mockFetch(url, options),
          formData: async () => new FormData(),
          arrayBuffer: async () => new ArrayBuffer(0),
          blob: async () => new Blob(),
        };
      }
    }

    return {
      ok: true,
      status: 200,
      statusText: "OK",
      url: url.toString(),
      json: async () => mockResponse,
      text: async () => JSON.stringify(mockResponse),
      headers: new Headers(),
      body: null,
      bodyUsed: false,
      clone: function () {
        return this;
      },
      formData: async () => new FormData(),
      arrayBuffer: async () => new ArrayBuffer(0),
      blob: async () => new Blob(),
    };
  };

  return { mockFetch, calls };
}

export function setupMockFetch(mockResponse?: any) {
  const originalFetch = globalThis.fetch;
  const { mockFetch, calls } = createMockFetch(mockResponse);

  globalThis.fetch = mockFetch as any;

  return {
    calls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}
