// @lovable.dev/vite-tanstack-config supplies the shared TanStack, React, Tailwind,
// aliases, environment injection, and Nitro plugins. Keep these plugins centralized
// to avoid registering duplicates.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const isVercel = Boolean(process.env.VERCEL);

export default defineConfig({
  // Vercel needs Nitro's Vercel preset. The wrapper otherwise defaults to
  // its Cloudflare target, which is not compatible with Vercel deployments.
  ...(isVercel ? { nitro: { preset: "vercel" } } : {}),
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    server: { entry: "server" },
  },
});
