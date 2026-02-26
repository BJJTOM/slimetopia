"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setTokens = useAuthStore((s) => s.setTokens);
  const fetchUser = useAuthStore((s) => s.fetchUser);

  useEffect(() => {
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");

    if (accessToken && refreshToken) {
      setTokens(accessToken, refreshToken);
      fetchUser().then(() => router.push("/play"));
    } else {
      router.push("/login");
    }
  }, [searchParams, setTokens, fetchUser, router]);

  return (
    <p className="text-[#55EFC4] text-lg animate-pulse">로그인 처리 중...</p>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
      <Suspense
        fallback={
          <p className="text-[#55EFC4] text-lg animate-pulse">
            로그인 처리 중...
          </p>
        }
      >
        <CallbackHandler />
      </Suspense>
    </div>
  );
}
