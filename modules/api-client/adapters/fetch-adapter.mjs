/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Implement ApiClientPort using native fetch() with JSON handling, base URL composition, default headers, and normalized error responses.
 * @sidecar fetch-adapter.mjs.header.md
 * @layer module | @hex adapter | @ctx api-client
 * @public true
 * @edit careful
 */

/**
 * Fetch-based API client adapter. Uses native fetch() with JSON handling,
 * error normalization, base URL management, and default headers.
 *
 * SpecRefs: TPL-069
 *
 * @param {{ baseUrl?: string, headers?: Record<string, string> }} [options]
 * @returns {import('../ports/api-client-port.mjs').ApiClientPort}
 */
export function createFetchAdapter(options) {
  let baseUrl = (options && options.baseUrl) || '';
  /** @type {Record<string, string>} */
  const defaultHeaders = { ...(options && options.headers) };

  /**
   * Build full URL from base + relative, appending query params.
   * @param {string} url
   * @param {Record<string, string | number>} [params]
   * @returns {string}
   */
  function buildUrl(url, params) {
    // Absolute URLs bypass base URL
    const fullUrl = /^https?:\/\//i.test(url) ? url : baseUrl + url;

    if (params && Object.keys(params).length > 0) {
      const qs = Object.entries(params)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&');
      const separator = fullUrl.includes('?') ? '&' : '?';
      return fullUrl + separator + qs;
    }

    return fullUrl;
  }

  /**
   * Merge default headers with per-request headers (per-request wins).
   * @param {Record<string, string>} [requestHeaders]
   * @returns {Record<string, string>}
   */
  function mergeHeaders(requestHeaders) {
    return { ...defaultHeaders, ...requestHeaders };
  }

  /**
   * Parse response body based on content-type.
   * @param {Response} response
   * @returns {Promise<any>}
   */
  async function parseBody(response) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }
    return response.text();
  }

  /**
   * Extract response headers into a plain object.
   * @param {Response} response
   * @returns {Record<string, string>}
   */
  function extractHeaders(response) {
    /** @type {Record<string, string>} */
    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    return headers;
  }

  /**
   * Execute a fetch request and normalize the response.
   * @param {string} url
   * @param {RequestInit} fetchOptions
   * @param {import('../ports/api-client-port.mjs').ApiRequestOptions} [requestOptions]
   * @returns {Promise<import('../ports/api-client-port.mjs').ApiResponse>}
   */
  async function execute(url, fetchOptions, requestOptions) {
    const fullUrl = buildUrl(url, requestOptions && requestOptions.params);
    const headers = mergeHeaders({
      ...(fetchOptions.headers || {}),
      ...((requestOptions && requestOptions.headers) || {}),
    });

    /** @type {RequestInit} */
    const init = { ...fetchOptions, headers };

    // Add timeout via AbortController if specified
    let controller;
    if (requestOptions && requestOptions.timeout) {
      controller = new AbortController();
      init.signal = controller.signal;
      setTimeout(() => controller.abort(), requestOptions.timeout);
    }

    try {
      const response = await fetch(fullUrl, init);
      const data = await parseBody(response);
      const responseHeaders = extractHeaders(response);

      if (!response.ok) {
        const error = new Error('api-client.error.request_failed');
        /** @type {any} */
        const apiError = error;
        apiError.status = response.status;
        apiError.data = data;
        apiError.headers = responseHeaders;
        apiError.ok = false;
        throw apiError;
      }

      return {
        status: response.status,
        data,
        headers: responseHeaders,
        ok: true,
      };
    } catch (err) {
      // Re-throw ApiErrors (from non-2xx handling above)
      if (err && /** @type {any} */ (err).status !== undefined) {
        throw err;
      }

      // Normalize network/abort errors
      const error = new Error('api-client.error.network_failure');
      /** @type {any} */
      const apiError = error;
      apiError.status = 0;
      apiError.data = null;
      apiError.headers = {};
      apiError.ok = false;
      throw apiError;
    }
  }

  return {
    /** @param {string} url @param {import('../ports/api-client-port.mjs').ApiRequestOptions} [options] */
    get(url, options) {
      return execute(url, { method: 'GET' }, options);
    },

    /** @param {string} url @param {any} [body] @param {import('../ports/api-client-port.mjs').ApiRequestOptions} [options] */
    post(url, body, options) {
      return execute(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body != null ? JSON.stringify(body) : undefined,
        },
        options,
      );
    },

    /** @param {string} url @param {any} [body] @param {import('../ports/api-client-port.mjs').ApiRequestOptions} [options] */
    put(url, body, options) {
      return execute(
        url,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: body != null ? JSON.stringify(body) : undefined,
        },
        options,
      );
    },

    /** @param {string} url @param {import('../ports/api-client-port.mjs').ApiRequestOptions} [options] */
    delete(url, options) {
      return execute(url, { method: 'DELETE' }, options);
    },

    /** @param {string} url */
    setBaseUrl(url) {
      baseUrl = url;
    },

    /** @param {string} name @param {string} value */
    setHeader(name, value) {
      defaultHeaders[name] = value;
    },

    /** @param {string} name */
    removeHeader(name) {
      delete defaultHeaders[name];
    },
  };
}
