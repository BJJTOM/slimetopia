import type { CapacitorConfig } from "@capacitor/cli";

const isLiveReload = process.env.LIVE_RELOAD === "true";

const config: CapacitorConfig = {
  appId: "com.slimetopia.app",
  appName: "SlimeTopia",
  webDir: "out",
  android: {
    allowMixedContent: true,
  },
  server: {
    androidScheme: "https",
    // Production: load login page from Cloudflare Pages directly
    // This avoids Capacitor bridge timing issues with landing page detection
    url: "https://slimetopia.pages.dev/login/",
    // Dev: live reload from local dev server
    ...(isLiveReload && {
      url: process.env.LIVE_RELOAD_URL,
      cleartext: true,
    }),
  },
  plugins: {
    App: {},
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
