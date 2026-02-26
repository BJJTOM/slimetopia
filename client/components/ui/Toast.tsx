"use client";

import { create } from "zustand";
import { useEffect, useState } from "react";

export interface ToastMessage {
  id: number;
  text: string;
  type: "success" | "reward" | "error" | "info" | "levelup";
  icon?: string;
  duration?: number;
}

interface ToastState {
  toasts: ToastMessage[];
  addToast: (msg: Omit<ToastMessage, "id">) => void;
  removeToast: (id: number) => void;
}

let toastId = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (msg) => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts, { ...msg, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, msg.duration || 3000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// Helper functions for common toast types
export function toastReward(text: string, icon?: string) {
  useToastStore.getState().addToast({ text, type: "reward", icon: icon || "🎁" });
}
export function toastSuccess(text: string, icon?: string) {
  useToastStore.getState().addToast({ text, type: "success", icon: icon || "✅" });
}
export function toastError(text: string) {
  useToastStore.getState().addToast({ text, type: "error", icon: "❌" });
}
export function toastInfo(text: string, icon?: string) {
  useToastStore.getState().addToast({ text, type: "info", icon: icon || "💡" });
}
export function toastLevelUp(text: string) {
  useToastStore.getState().addToast({ text, type: "levelup", icon: "⬆️", duration: 4000 });
}

const typeStyles: Record<ToastMessage["type"], { bg: string; border: string; text: string }> = {
  success: { bg: "rgba(85,239,196,0.12)", border: "rgba(85,239,196,0.3)", text: "#55EFC4" },
  reward: { bg: "rgba(255,234,167,0.12)", border: "rgba(255,234,167,0.3)", text: "#FFEAA7" },
  error: { bg: "rgba(255,107,107,0.12)", border: "rgba(255,107,107,0.3)", text: "#FF6B6B" },
  info: { bg: "rgba(116,185,255,0.12)", border: "rgba(116,185,255,0.3)", text: "#74B9FF" },
  levelup: { bg: "rgba(162,155,254,0.15)", border: "rgba(162,155,254,0.4)", text: "#A29BFE" },
};

function ToastItem({ toast }: { toast: ToastMessage }) {
  const [exiting, setExiting] = useState(false);
  const style = typeStyles[toast.type];

  useEffect(() => {
    const dur = toast.duration || 3000;
    const t = setTimeout(() => setExiting(true), dur - 400);
    return () => clearTimeout(t);
  }, [toast.duration]);

  return (
    <div
      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl backdrop-blur-xl pointer-events-auto shadow-lg ${
        exiting ? "animate-toast-exit" : "animate-toast-enter"
      }`}
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        boxShadow: `0 4px 24px rgba(0,0,0,0.3), 0 0 20px ${style.border}`,
      }}
      onClick={() => useToastStore.getState().removeToast(toast.id)}
    >
      {toast.icon && <span className="text-lg flex-shrink-0 drop-shadow-sm">{toast.icon}</span>}
      <span className="text-xs font-bold" style={{ color: style.text }}>
        {toast.text}
      </span>
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
