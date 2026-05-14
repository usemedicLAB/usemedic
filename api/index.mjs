// Vercel serverless function that adapts the TanStack Start worker bundle
// (originally built for Cloudflare Workers) to Vercel's Node runtime.
// Node 20+ exposes Request/Response/fetch globally.
import worker from "../dist/server/index.js";

export const config = {
  runtime: "nodejs",
};

export default async function handler(req, res) {
  // If Vercel natively passes a Web Request, handle it directly
  if (req instanceof Request) {
    return worker.fetch(req, process.env, { waitUntil() {}, passThroughOnException() {} });
  }

  // 1. Build the Web URL
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const url = new URL(req.url || '/', `${protocol}://${host}`);

  // 2. Build the Web Headers
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      value.forEach(v => headers.append(key, v));
    } else if (value) {
      headers.set(key, value);
    }
  }

  // 3. Handle the Web Body stream
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  let body = undefined;
  if (hasBody) {
    body = new ReadableStream({
      start(controller) {
        req.on('data', chunk => controller.enqueue(chunk));
        req.on('end', () => controller.close());
        req.on('error', err => controller.error(err));
      }
    });
  }

  // 4. Create the standard Web Request
  const webRequest = new Request(url, {
    method: req.method,
    headers,
    body,
    duplex: hasBody ? 'half' : undefined
  });

  try {
    // 5. Let the TanStack Start worker process the request
    const webResponse = await worker.fetch(webRequest, process.env, {
      waitUntil() {},
      passThroughOnException() {}
    });

    // 6. Pipe the Web Response back to the Vercel Node Response
    res.statusCode = webResponse.status;
    webResponse.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    if (webResponse.body) {
      const reader = webResponse.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } else {
      res.end();
    }
  } catch (error) {
    console.error("Worker fetch failed:", error);
    if (!res.headersSent) {
      res.statusCode = 500;
    }
    res.end("Internal Server Error");
  }
}
