// Vercel serverless function that adapts the TanStack Start worker bundle
// (originally built for Cloudflare Workers) to Vercel's Node runtime.
// Node 20+ exposes Request/Response/fetch globally.
import worker from "../dist/server/index.js";

export const config = {
  runtime: "edge",
};

export default async function handler(request) {
  return worker.fetch(request, process.env, {
    waitUntil() {},
    passThroughOnException() {},
  });
}
