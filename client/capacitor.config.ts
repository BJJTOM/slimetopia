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
    // Use http to avoid mixed-content blocking when API is http://
    androidScheme: "http",
    cleartext: true,
    // Live reload: load from dev server instead of bundled files
    ...(isLiveReload && {
      url: process.env.LIVE_RELOAD_URL,
    }),
  },
  plugins: {
    App: {},
  },
};

export default config;
