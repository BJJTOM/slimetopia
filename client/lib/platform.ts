export function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

export function getPlatform(): string {
  if (typeof window === "undefined") return "web";
  return (window as any).Capacitor?.getPlatform?.() ?? "web";
}
