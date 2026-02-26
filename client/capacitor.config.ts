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
    androidScheme: isLiveReload ? "http" : "https",
    // Live reload: load from dev server instead of bundled files
    ...(isLiveReload && {
      url: process.env.LIVE_RELOAD_URL,
      cleartext: true,
    }),
  },
  plugins: {
    App: {},
    // Native HTTP — bypasses WebView mixed-content & CORS restrictions
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
