/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkFirst, StaleWhileRevalidate, CacheFirst, ExpirationPlugin } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const customCache = [
  {
    matcher: ({ request, url }: { request: Request; url: URL }) => 
      request.mode === 'navigate' || url.searchParams.has('_rsc'),
    handler: new NetworkFirst({
      cacheName: 'html-rsc-cache',
      networkTimeoutSeconds: 3,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        }),
      ],
    }),
  },
  {
    matcher: ({ url }: { url: URL }) => 
      url.pathname.startsWith('/api/prices') || url.pathname.startsWith('/api/historical'),
    handler: new StaleWhileRevalidate({
      cacheName: 'api-prices-cache',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 30,
          maxAgeSeconds: 15 * 60, // 15 minutes
        }),
      ],
    }),
  },
  {
    matcher: ({ url }: { url: URL }) => 
      url.pathname.startsWith('/_next/static/'),
    handler: new CacheFirst({
      cacheName: 'static-assets-cache',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
      ],
    }),
  },
  ...defaultCache,
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: customCache,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener('sync', (event) => {
  // We'll post a message to clients or trigger a fetch
  if (event.tag === 'fintrack-sync') {
    event.waitUntil(
      (async () => {
        const clients = await self.clients.matchAll({ type: 'window' });
        for (const client of clients) {
          client.postMessage({ type: 'SYNC_NOW' });
        }
      })()
    );
  }
});
