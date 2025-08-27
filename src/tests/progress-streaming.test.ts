import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createInstance } from '../lib/index.js';
import { setupMockFetch } from './mock-helpers.js';

// Mock XMLHttpRequest for progress testing
global.XMLHttpRequest = vi.fn(() => ({
  open: vi.fn(),
  send: vi.fn(),
  setRequestHeader: vi.fn(),
  addEventListener: vi.fn(),
  upload: {
    addEventListener: vi.fn()
  },
  timeout: 0,
  withCredentials: false,
  status: 200,
  statusText: 'OK',
  responseText: JSON.stringify({ success: true }),
  response: 'test response'
})) as any;

describe('Progress and Streaming Support Tests', () => {
  let mockSetup: ReturnType<typeof setupMockFetch>;
  let mockXHR: any;

  beforeEach(() => {
    mockSetup = setupMockFetch({ success: true });
    mockXHR = {
      open: vi.fn(),
      send: vi.fn(),
      setRequestHeader: vi.fn(),
      addEventListener: vi.fn(),
      upload: {
        addEventListener: vi.fn()
      },
      timeout: 0,
      withCredentials: false,
      status: 200,
      statusText: 'OK',
      responseText: JSON.stringify({ success: true }),
      response: 'test response'
    };
    (global.XMLHttpRequest as any).mockReturnValue(mockXHR);
  });

  afterEach(() => {
    mockSetup.restore();
    vi.clearAllMocks();
  });

  describe('Upload Progress Tracking', () => {
    it('should use XMLHttpRequest when onUploadProgress is provided', async () => {
      const onUploadProgress = vi.fn();
      
      const api = createInstance({
        baseUrl: 'https://api.example.com',
        onUploadProgress
      });

      // Mock the loadend event to resolve the request
      mockXHR.addEventListener.mockImplementation((event: string, callback: Function) => {
        if (event === 'loadend') {
          setTimeout(callback, 0);
        }
      });

      await api.post('/upload', {
        body: { file: 'data' }
      });

      expect(global.XMLHttpRequest).toHaveBeenCalled();
      expect(mockXHR.upload.addEventListener).toHaveBeenCalledWith('progress', onUploadProgress);
    });

    it('should call upload progress callback during file upload', async () => {
      const onUploadProgress = vi.fn();
      let progressCallback: Function;
      
      const api = createInstance({
        baseUrl: 'https://api.example.com',
        onUploadProgress
      });

      // Capture the progress callback
      mockXHR.upload.addEventListener.mockImplementation((event: string, callback: Function) => {
        if (event === 'progress') {
          progressCallback = callback;
        }
      });

      // Mock the loadend event to resolve the request
      mockXHR.addEventListener.mockImplementation((event: string, callback: Function) => {
        if (event === 'loadend') {
          setTimeout(() => {
            // Simulate progress event before completion
            if (progressCallback) {
              progressCallback({ loaded: 50, total: 100 });
            }
            callback();
          }, 0);
        }
      });

      await api.post('/upload', {
        body: { file: 'data' }
      });

      expect(onUploadProgress).toHaveBeenCalledWith({ loaded: 50, total: 100 });
    });

    it('should work with per-request onUploadProgress option', async () => {
      const onUploadProgress = vi.fn();
      
      const api = createInstance({
        baseUrl: 'https://api.example.com'
      });

      // Mock the loadend event to resolve the request
      mockXHR.addEventListener.mockImplementation((event: string, callback: Function) => {
        if (event === 'loadend') {
          setTimeout(callback, 0);
        }
      });

      await api.post('/upload', {
        body: { file: 'data' },
        onUploadProgress
      });

      expect(mockXHR.upload.addEventListener).toHaveBeenCalledWith('progress', onUploadProgress);
    });
  });

  describe('Download Progress Tracking', () => {
    it('should use XMLHttpRequest when onDownloadProgress is provided', async () => {
      const onDownloadProgress = vi.fn();
      
      const api = createInstance({
        baseUrl: 'https://api.example.com',
        onDownloadProgress
      });

      // Mock the loadend event to resolve the request
      mockXHR.addEventListener.mockImplementation((event: string, callback: Function) => {
        if (event === 'loadend') {
          setTimeout(callback, 0);
        }
      });

      await api.get('/download');

      expect(global.XMLHttpRequest).toHaveBeenCalled();
      expect(mockXHR.addEventListener).toHaveBeenCalledWith('progress', onDownloadProgress);
    });

    it('should call download progress callback during file download', async () => {
      const onDownloadProgress = vi.fn();
      let progressCallback: Function;
      
      const api = createInstance({
        baseUrl: 'https://api.example.com',
        onDownloadProgress
      });

      // Capture the progress callback
      mockXHR.addEventListener.mockImplementation((event: string, callback: Function) => {
        if (event === 'progress') {
          progressCallback = callback;
        } else if (event === 'loadend') {
          setTimeout(() => {
            // Simulate progress event before completion
            if (progressCallback) {
              progressCallback({ loaded: 75, total: 100 });
            }
            callback();
          }, 0);
        }
      });

      await api.get('/download');

      expect(onDownloadProgress).toHaveBeenCalledWith({ loaded: 75, total: 100 });
    });

    it('should work with per-request onDownloadProgress option', async () => {
      const onDownloadProgress = vi.fn();
      
      const api = createInstance({
        baseUrl: 'https://api.example.com'
      });

      // Mock the loadend event to resolve the request
      mockXHR.addEventListener.mockImplementation((event: string, callback: Function) => {
        if (event === 'loadend') {
          setTimeout(callback, 0);
        }
      });

      await api.get('/download', {
        onDownloadProgress
      });

      expect(mockXHR.addEventListener).toHaveBeenCalledWith('progress', onDownloadProgress);
    });
  });

  describe('Combined Progress Tracking', () => {
    it('should support both upload and download progress callbacks', async () => {
      const onUploadProgress = vi.fn();
      const onDownloadProgress = vi.fn();
      
      const api = createInstance({
        baseUrl: 'https://api.example.com',
        onUploadProgress,
        onDownloadProgress
      });

      // Mock the loadend event to resolve the request
      mockXHR.addEventListener.mockImplementation((event: string, callback: Function) => {
        if (event === 'loadend') {
          setTimeout(callback, 0);
        }
      });

      await api.post('/upload', {
        body: { file: 'data' }
      });

      expect(mockXHR.upload.addEventListener).toHaveBeenCalledWith('progress', onUploadProgress);
      expect(mockXHR.addEventListener).toHaveBeenCalledWith('progress', onDownloadProgress);
    });

    it('should force XMLHttpRequest when useXHRForProgress is true', async () => {
      const api = createInstance({
        baseUrl: 'https://api.example.com',
        useXHRForProgress: true
      });

      // Mock the loadend event to resolve the request
      mockXHR.addEventListener.mockImplementation((event: string, callback: Function) => {
        if (event === 'loadend') {
          setTimeout(callback, 0);
        }
      });

      await api.get('/test');

      expect(global.XMLHttpRequest).toHaveBeenCalled();
    });
  });

  describe('XMLHttpRequest Error Handling', () => {
    it('should handle network errors with XMLHttpRequest', async () => {
      const onUploadProgress = vi.fn();
      
      const api = createInstance({
        baseUrl: 'https://api.example.com',
        onUploadProgress,
        errorMapping: {
          'network_error': 'Custom network error message'
        }
      });

      // Mock network error
      mockXHR.addEventListener.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          setTimeout(callback, 0);
        }
      });

      const result = await api.post('/upload', {
        body: { file: 'data' }
      });

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe('Custom network error message');
    });

    it('should handle HTTP errors with XMLHttpRequest', async () => {
      const onDownloadProgress = vi.fn();
      
      const api = createInstance({
        baseUrl: 'https://api.example.com',
        onDownloadProgress,
        errorMapping: {
          404: 'Custom not found message'
        }
      });

      // Mock HTTP error
      mockXHR.status = 404;
      mockXHR.statusText = 'Not Found';
      mockXHR.addEventListener.mockImplementation((event: string, callback: Function) => {
        if (event === 'loadend') {
          setTimeout(callback, 0);
        }
      });

      const result = await api.get('/notfound');

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe('Custom not found message');
      expect(result.error?.status).toBe(404);
    });

    it('should handle timeout errors with XMLHttpRequest', async () => {
      const onUploadProgress = vi.fn();
      
      const api = createInstance({
        baseUrl: 'https://api.example.com',
        onUploadProgress
      });

      // Mock timeout error
      mockXHR.addEventListener.mockImplementation((event: string, callback: Function) => {
        if (event === 'timeout') {
          setTimeout(callback, 0);
        }
      });

      const result = await api.post('/upload', {
        body: { file: 'data' }
      });

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe('Request timed out!');
      expect(result.error?.status).toBe('TIMEOUT');
    });
  });

  describe('Streaming Utilities', () => {
    beforeEach(() => {
      // Reset to use fetch for streaming tests
      vi.clearAllMocks();
    });

    it('should provide streamToString utility', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: vi.fn().mockResolvedValue('test string response'),
        json: vi.fn().mockResolvedValue({ success: true }),
        blob: vi.fn(),
        arrayBuffer: vi.fn(),
        formData: vi.fn(),
        body: new ReadableStream(),
        bodyUsed: false,
        clone: function() { return this; },
        headers: new Headers(),
        url: 'https://api.example.com/stream'
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const api = createInstance({
        baseUrl: 'https://api.example.com'
      });

      const result = await api.get('/stream');
      
      expect(result.streamToString).toBeDefined();
      if (result.streamToString) {
        const stringData = await result.streamToString();
        expect(stringData).toBe('test string response');
      }
    });

    it('should provide streamToBlob utility', async () => {
      const testBlob = new Blob(['test blob'], { type: 'text/plain' });
      const mockResponse = {
        ok: true,
        status: 200,
        blob: vi.fn().mockResolvedValue(testBlob),
        body: new ReadableStream(),
        json: vi.fn(),
        text: vi.fn()
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const api = createInstance({
        baseUrl: 'https://api.example.com'
      });

      const result = await api.get('/stream');
      
      expect(result.streamToBlob).toBeDefined();
      if (result.streamToBlob) {
        const blobData = await result.streamToBlob();
        expect(blobData).toBe(testBlob);
      }
    });

    it('should provide streamToArrayBuffer utility', async () => {
      const testBuffer = new ArrayBuffer(8);
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: vi.fn(),
        json: vi.fn().mockResolvedValue({ success: true }),
        blob: vi.fn(),
        arrayBuffer: vi.fn().mockResolvedValue(testBuffer),
        formData: vi.fn(),
        body: new ReadableStream(),
        bodyUsed: false,
        clone: function() { return this; },
        headers: new Headers(),
        url: 'https://api.example.com/stream'
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const api = createInstance({
        baseUrl: 'https://api.example.com'
      });

      const result = await api.get('/stream');
      
      expect(result.streamToArrayBuffer).toBeDefined();
      if (result.streamToArrayBuffer) {
        const bufferData = await result.streamToArrayBuffer();
        expect(bufferData).toBe(testBuffer);
      }
    });

    it('should provide streamChunks utility for reading stream chunks', async () => {
      const chunks = [
        new Uint8Array([1, 2, 3]),
        new Uint8Array([4, 5, 6]),
        new Uint8Array([7, 8, 9])
      ];
      
      let chunkIndex = 0;
      const mockReader = {
        read: vi.fn().mockImplementation(() => {
          if (chunkIndex < chunks.length) {
            return Promise.resolve({ done: false, value: chunks[chunkIndex++] });
          }
          return Promise.resolve({ done: true, value: undefined });
        }),
        releaseLock: vi.fn()
      };

      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: vi.fn(),
        json: vi.fn().mockResolvedValue({ success: true }),
        blob: vi.fn(),
        arrayBuffer: vi.fn(),
        formData: vi.fn(),
        body: {
          getReader: vi.fn().mockReturnValue(mockReader)
        },
        bodyUsed: false,
        clone: function() { return this; },
        headers: new Headers(),
        url: 'https://api.example.com/stream'
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const api = createInstance({
        baseUrl: 'https://api.example.com'
      });

      const result = await api.get('/stream');
      
      expect(result.streamChunks).toBeDefined();
      if (result.streamChunks) {
        const receivedChunks: Uint8Array[] = [];
        await result.streamChunks((chunk: Uint8Array) => {
          receivedChunks.push(chunk);
        });

        expect(receivedChunks).toHaveLength(3);
        expect(receivedChunks[0]).toEqual(new Uint8Array([1, 2, 3]));
        expect(receivedChunks[1]).toEqual(new Uint8Array([4, 5, 6]));
        expect(receivedChunks[2]).toEqual(new Uint8Array([7, 8, 9]));
        expect(mockReader.releaseLock).toHaveBeenCalled();
      }
    });

    it('should throw error when trying to stream without response body', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: vi.fn(),
        json: vi.fn().mockResolvedValue({ success: true }),
        blob: vi.fn(),
        arrayBuffer: vi.fn(),
        formData: vi.fn(),
        body: null,
        bodyUsed: false,
        clone: function() { return this; },
        headers: new Headers(),
        url: 'https://api.example.com/stream'
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const api = createInstance({
        baseUrl: 'https://api.example.com'
      });

      const result = await api.get('/stream');
      
      if (result.streamChunks) {
        await expect(result.streamChunks(() => {})).rejects.toThrow('No response body available for streaming');
      }
    });
  });

  describe('Backwards Compatibility', () => {
    it('should use regular fetch when no progress callbacks are provided', async () => {
      const api = createInstance({
        baseUrl: 'https://api.example.com'
      });

      await api.get('/test');

      // XMLHttpRequest should not be used
      expect(global.XMLHttpRequest).not.toHaveBeenCalled();
      // Regular fetch should be used instead
      expect(mockSetup.calls).toHaveLength(1);
    });

    it('should maintain all existing functionality when progress is not used', async () => {
      // Reset mocks and set up specific mock data
      vi.clearAllMocks();
      mockSetup.restore();
      mockSetup = setupMockFetch({ data: 'test' });

      const api = createInstance({
        baseUrl: 'https://api.example.com',
        headers: {
          'X-Test': 'value'
        }
      });

      const result = await api.get('/test');

      expect(result.data).toEqual({ data: 'test' });
      expect(result.error).toBeNull();
      expect(mockSetup.calls[0].options.headers['X-Test']).toBe('value');
    });
  });
});