export function setupMockFetch(initialMockResponse?: any) {
  const originalFetch = globalThis.fetch;
  let mockResponse = initialMockResponse;

  const { mockFetch, calls } = createMockFetch(() => mockResponse);

  globalThis.fetch = mockFetch as any;

  return {
    calls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
    setResponse: (newResponse: any, status?: number) => {
      if (status) {
        mockResponse = { ...newResponse, status };
      } else {
        mockResponse = newResponse;
      }
    },
  };
}

// Mock fetch helper for testing without network dependency
export function createMockFetch(
  getMockResponse: () => any = () => ({ id: 1, title: "test" }),
) {
  const calls: Array<{ url: string; options: any }> = [];

  const mockFetch = async (url: string | URL, options: any = {}) => {
    calls.push({ url: url.toString(), options });
    const currentMockResponse = getMockResponse();

    // Handle error scenarios based on mockResponse configuration
    if (currentMockResponse && typeof currentMockResponse === "object") {
      if (
        currentMockResponse.success === false ||
        currentMockResponse.status >= 400
      ) {
        const status = currentMockResponse.status || 404;
        const statusText =
          currentMockResponse.statusText ||
          (status === 404 ? "Not Found" : "Error");

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
          clone: function () {
            return this; // Return self, don't call mockFetch again
          },
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
      json: async () => currentMockResponse,
      text: async () => JSON.stringify(currentMockResponse),
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
