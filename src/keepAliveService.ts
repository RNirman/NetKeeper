import { request } from 'node:https';

export interface KeepAliveResult {
  success: boolean;
  statusCode?: number;
  latency: number;
  error?: string;
}

export const sendKeepAliveRequest = (
  targetUrl: string,
): Promise<KeepAliveResult> => {
  return new Promise((resolve) => {
    const startTime = Date.now();

    let url: URL;

    try {
      url = new URL(targetUrl);
    } catch {
      resolve({
        success: false,
        latency: Date.now() - startTime,
        error: 'Invalid URL',
      });

      return;
    }

    const req = request(
      url,
      {
        method: 'HEAD',
        timeout: 10000,
      },
      (response) => {
        response.resume();

        const latency = Date.now() - startTime;

        resolve({
          success:
            response.statusCode !== undefined &&
            response.statusCode >= 200 &&
            response.statusCode < 500,
          statusCode: response.statusCode,
          latency,
        });
      },
    );

    req.on('timeout', () => {
      req.destroy();

      resolve({
        success: false,
        latency: Date.now() - startTime,
        error: 'Request timed out',
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        latency: Date.now() - startTime,
        error: error.message,
      });
    });

    req.end();
  });
};