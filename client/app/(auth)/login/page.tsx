"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { useLocaleStore } from "@/lib/store/localeStore";
import { generateSlimeIconSvg } from "@/lib/slimeSvg";
import { isNativePlatform } from "@/lib/platform";
import type { Locale } from "@/lib/i18n/translations";

/* ---- Static data (never re-created) ---- */
const STARS = Array.from({ length: 60 }, (_, i) => ({
  size: 1 + ((i * 7 + 3) % 3),
  left: (i * 31 + 17) % 100,
  top: (i * 23 + 7) % 90,
  opacity: 0.08 + ((i * 13) % 5) * 0.06,
  dur: 2.5 + ((i * 11) % 5),
  delay: ((i * 7) % 30) / 10,
}));

const BG_SLIMES = [
  { element: "water", left: 3, top: 70, size: 44, delay: 0, dur: 14 },
  { element: "fire", left: 90, top: 60, size: 36, delay: 3, dur: 16 },
  { element: "grass", left: 10, top: 18, size: 30, delay: 1.5, dur: 12 },
  { element: "light", left: 84, top: 10, size: 26, delay: 4.5, dur: 15 },
  { element: "dark", left: 50, top: 90, size: 28, delay: 2, dur: 18 },
  { element: "ice", left: 96, top: 36, size: 22, delay: 5, dur: 13 },
  { element: "electric", left: 28, top: 6, size: 24, delay: 1, dur: 11 },
  { element: "poison", left: 72, top: 84, size: 20, delay: 6, dur: 17 },
  { element: "earth", left: 58, top: 4, size: 18, delay: 3.5, dur: 14 },
  { element: "wind", left: 16, top: 50, size: 16, delay: 7, dur: 16 },
];

const LANG_OPTIONS: { value: Locale; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "ko", label: "KO" },
  { value: "en", label: "EN" },
  { value: "ja", label: "JA" },
  { value: "zh-TW", label: "中文" },
];

type AuthMode = "main" | "login" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("main");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { guestLogin, register, emailLogin } = useAuthStore();
  const { t, locale, setLocale } = useLocaleStore();

  useEffect(() => setMounted(true), []);

  /* ---- Mascot slimes ---- */
  const mascotMain = useMemo(() => generateSlimeIconSvg("grass", 120, "rare"), []);
  const mascotLeft = useMemo(() => generateSlimeIconSvg("water", 60, "common"), []);
  const mascotRight = useMemo(() => generateSlimeIconSvg("fire", 60, "common"), []);
  const mascotStar = useMemo(() => generateSlimeIconSvg("light", 40, "epic"), []);
  const mascotDark = useMemo(() => generateSlimeIconSvg("dark", 32, "uncommon"), []);

  /* ---- Handlers ---- */
  const handleGuestLogin = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      await guestLogin();
      if (useAuthStore.getState().accessToken) router.push("/play");
      else setError(t("login_error_guest_fail"));
    } catch {
      setError(t("login_error_server"));
    }
    setIsLoading(false);
  }, [guestLogin, router, t]);

  const handleRegister = useCallback(async () => {
    if (!email.trim() || !password) return;
    if (password.length < 4) { setError(t("login_error_password_length")); return; }
    if (password !== confirmPw) { setError(t("login_error_password_mismatch")); return; }
    setIsLoading(true);
    setError("");
    const err = await register(email.trim(), password);
    if (err) {
      if (err === "email_taken") setError(t("login_error_email_taken"));
      else setError(t("login_error_register_fail"));
    } else if (useAuthStore.getState().accessToken) {
      router.push("/play");
    }
    setIsLoading(false);
  }, [email, password, confirmPw, register, router, t]);

  const handleEmailLogin = useCallback(async () => {
    if (!email.trim() || !password) return;
    setIsLoading(true);
    setError("");
    const err = await emailLogin(email.trim(), password);
    if (err) {
      if (err === "invalid_credentials") setError(t("login_error_invalid_credentials"));
      else setError(t("login_error_login_fail"));
    } else if (useAuthStore.getState().accessToken) {
      router.push("/play");
    }
    setIsLoading(false);
  }, [email, password, emailLogin, router, t]);

  const switchMode = useCallback((m: AuthMode) => {
    setMode(m);
    setError("");
    setEmail("");
    setPassword("");
    setConfirmPw("");
  }, []);

  /* ---- Spinner helper ---- */
  const Spinner = ({ dark }: { dark?: boolean }) => (
    <span className={`w-4 h-4 border-2 rounded-full animate-spin ${dark ? "border-[#0a0a1a]/20 border-t-[#0a0a1a]" : "border-white/20 border-t-white"}`} />
  );

  return (
    <div className="game-body">
      <div className="game-frame flex items-center justify-center p-4 relative overflow-hidden">
        {/* ===== Background ===== */}
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at 30% 20%, rgba(85,239,196,0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(162,155,254,0.06) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, #0c1525 0%, #060a18 60%, #020408 100%)",
        }} />

        {/* Nebula blobs */}
        <div className="nebula-blob" style={{ width: 280, height: 280, left: "0%", top: "10%", background: "rgba(85,239,196,0.06)" }} />
        <div className="nebula-blob" style={{ width: 220, height: 220, right: "-5%", top: "50%", background: "rgba(162,155,254,0.05)", animationDelay: "-5s" }} />
        <div className="nebula-blob" style={{ width: 180, height: 180, left: "30%", bottom: "0%", background: "rgba(116,185,255,0.04)", animationDelay: "-10s" }} />

        {/* Stars */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {STARS.map((star, i) => (
            <div key={i} className="absolute rounded-full bg-white"
              style={{ width: star.size, height: star.size, left: `${star.left}%`, top: `${star.top}%`, opacity: star.opacity, animation: `glow-pulse ${star.dur}s ease-in-out infinite`, animationDelay: `${star.delay}s` }} />
          ))}
        </div>

        {/* Background floating slimes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {BG_SLIMES.map((p, i) => (
            <img key={`bg-${i}`} src={generateSlimeIconSvg(p.element, p.size)} alt="" draggable={false} className="absolute"
              style={{ left: `${p.left}%`, top: `${p.top}%`, opacity: 0.07, filter: "blur(1.5px)", animation: `float ${p.dur}s ease-in-out infinite`, animationDelay: `${p.delay}s` }} />
          ))}
        </div>

        {/* ===== Language Selector (top-right) ===== */}
        <div className="absolute top-3 right-3 z-20 flex gap-1">
          {LANG_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setLocale(opt.value)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                locale === opt.value
                  ? "bg-white/10 text-white/80 border border-white/15"
                  : "text-white/25 hover:text-white/50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* ===== Main Content ===== */}
        <div className={`relative z-10 w-full max-w-sm transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <div className="frosted-card rounded-3xl p-6 pb-5 login-card-glow">

            {/* ===== Logo + Mascot Area ===== */}
            <div className="text-center mb-5">
              <div className="relative mx-auto w-52 h-36 mb-3 flex items-end justify-center">
                {/* Dark slime floating in background */}
                <img src={mascotDark} alt="" draggable={false}
                  className="absolute left-0 top-0 opacity-40"
                  style={{ animation: "float 6s ease-in-out infinite 3s", filter: "drop-shadow(0 0 8px rgba(162,155,254,0.3))" }} />

                {/* Left mascot */}
                <img src={mascotLeft} alt="" draggable={false}
                  className="absolute left-1 bottom-1"
                  style={{ animation: "float 4s ease-in-out infinite 0.5s", filter: "drop-shadow(0 0 20px rgba(116,185,255,0.5))" }} />

                {/* Main mascot */}
                <img src={mascotMain} alt="SlimeTopia" draggable={false}
                  className="relative z-10"
                  style={{ animation: "float 3s ease-in-out infinite", filter: "drop-shadow(0 0 32px rgba(85,239,196,0.6))" }} />

                {/* Right mascot */}
                <img src={mascotRight} alt="" draggable={false}
                  className="absolute right-1 bottom-1"
                  style={{ animation: "float 4s ease-in-out infinite 1s", filter: "drop-shadow(0 0 20px rgba(255,107,107,0.5))" }} />

                {/* Star mascot */}
                <img src={mascotStar} alt="" draggable={false}
                  className="absolute -top-2 right-4"
                  style={{ animation: "float 5s ease-in-out infinite 2s", filter: "drop-shadow(0 0 14px rgba(255,234,167,0.6))" }} />

                {/* Ground shadow */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-40 h-6 rounded-full"
                  style={{ background: "radial-gradient(ellipse, rgba(85,239,196,0.25), transparent 70%)", filter: "blur(10px)" }} />
              </div>

              {/* Title */}
              <h1 className="text-3xl font-extrabold tracking-tight"
                style={{
                  background: "linear-gradient(135deg, #55EFC4 0%, #74B9FF 50%, #A29BFE 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 16px rgba(85,239,196,0.2))",
                }}>
                SlimeTopia
              </h1>
              <p className="text-white/35 text-xs mt-1.5 font-medium tracking-wide">
                {t("login_tagline")}
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-3 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center animate-bounce-in">
                {error}
              </div>
            )}

            {/* ===== MAIN MODE ===== */}
            {mode === "main" && (
              <div className="space-y-3 animate-fade-in-up">
                {/* Guest Login */}
                <button onClick={handleGuestLogin} disabled={isLoading}
                  className="login-btn-guest w-full py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition active:scale-[0.97] disabled:opacity-50">
                  {isLoading ? (
                    <span className="flex items-center gap-2"><Spinner dark /> {t("login_connecting")}</span>
                  ) : (
                    <>{"\uD83C\uDFAE"} {t("login_guest_start")}</>
                  )}
                </button>
                <p className="text-white/20 text-[10px] text-center -mt-1">
                  {t("login_guest_hint")}
                </p>

                {/* Divider */}
                <div className="flex items-center gap-3 pt-1">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  <span className="text-white/20 text-[10px] font-medium tracking-wider">{t("login_email_section")}</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>

                {/* Email Login */}
                <button onClick={() => switchMode("login")}
                  className="login-btn-email w-full py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition active:scale-[0.97]">
                  {"\uD83D\uDCE7"} {t("login_email_btn")}
                </button>

                {/* Register */}
                <button onClick={() => switchMode("register")}
                  className="login-btn-register w-full py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition active:scale-[0.97]">
                  {"\u2728"} {t("login_register_btn")}
                </button>

                {/* OAuth */}
                {!isNativePlatform() && (
                  <>
                    <div className="flex items-center gap-3 pt-1">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                      <span className="text-white/20 text-[10px] font-medium tracking-wider">{t("login_social_section")}</span>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    </div>
                    <div className="flex gap-3">
                      <button className="flex-1 py-2.5 px-4 bg-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 text-gray-700 hover:bg-gray-50 transition active:scale-[0.97] shadow-sm"
                        onClick={() => (window.location.href = "/api/auth/login/google")}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                        Google
                      </button>
                      <button className="flex-1 py-2.5 px-4 bg-[#FEE500] rounded-xl font-medium text-sm flex items-center justify-center gap-2 text-[#3C1E1E] hover:bg-[#fdd800] transition active:scale-[0.97] shadow-sm"
                        onClick={() => (window.location.href = "/api/auth/login/kakao")}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#3C1E1E"><path d="M12 3C6.48 3 2 6.36 2 10.5c0 2.67 1.77 5.02 4.44 6.38l-.93 3.41c-.08.3.26.54.52.37l4.07-2.7c.62.08 1.25.13 1.9.13 5.52 0 10-3.36 10-7.5S17.52 3 12 3z" /></svg>
                        Kakao
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ===== LOGIN MODE ===== */}
            {mode === "login" && (
              <div className="space-y-3 animate-fade-in-up">
                <div className="text-center mb-1">
                  <span className="text-lg">{"\uD83D\uDCE7"}</span>
                  <p className="text-white/60 text-sm font-bold mt-1">{t("login_email_title")}</p>
                </div>

                <input type="email" placeholder={t("login_email_placeholder")} value={email} onChange={(e) => setEmail(e.target.value)}
                  className="login-input" autoComplete="email" />
                <input type="password" placeholder={t("login_password_placeholder")} value={password} onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEmailLogin()}
                  className="login-input" autoComplete="current-password" />

                <button onClick={handleEmailLogin} disabled={isLoading || !email.trim() || !password}
                  className="login-btn-email w-full py-3 rounded-2xl font-bold text-sm transition active:scale-[0.97] disabled:opacity-40">
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2"><Spinner /> {t("login_logging_in")}</span>
                  ) : t("login_btn")}
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button onClick={() => switchMode("main")} className="text-white/30 text-xs hover:text-white/60 transition">
                    {"\u2190"} {t("login_go_back")}
                  </button>
                  <button onClick={() => switchMode("register")} className="text-[#55EFC4]/50 text-xs hover:text-[#55EFC4] transition font-medium">
                    {t("login_no_account")}
                  </button>
                </div>
              </div>
            )}

            {/* ===== REGISTER MODE ===== */}
            {mode === "register" && (
              <div className="space-y-3 animate-fade-in-up">
                <div className="text-center mb-1">
                  <span className="text-lg">{"\u2728"}</span>
                  <p className="text-white/60 text-sm font-bold mt-1">{t("login_register_title")}</p>
                </div>

                <input type="email" placeholder={t("login_email_placeholder")} value={email} onChange={(e) => setEmail(e.target.value)}
                  className="login-input" autoComplete="email" />
                <input type="password" placeholder={t("login_password_hint")} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="login-input" autoComplete="new-password" />
                <input type="password" placeholder={t("login_password_confirm_placeholder")} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                  className="login-input" autoComplete="new-password" />

                <p className="text-white/20 text-[10px] text-center">{t("login_nickname_auto")}</p>

                <button onClick={handleRegister} disabled={isLoading || !email.trim() || !password || !confirmPw}
                  className="login-btn-register w-full py-3 rounded-2xl font-bold text-sm transition active:scale-[0.97] disabled:opacity-40">
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2"><Spinner dark /> {t("login_registering")}</span>
                  ) : <>{"\u2728"} {t("login_register_submit")}</>}
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button onClick={() => switchMode("main")} className="text-white/30 text-xs hover:text-white/60 transition">
                    {"\u2190"} {t("login_go_back")}
                  </button>
                  <button onClick={() => switchMode("login")} className="text-[#A29BFE]/50 text-xs hover:text-[#A29BFE] transition font-medium">
                    {t("login_has_account")}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Version */}
          <p className="text-center text-white/10 text-[10px] mt-3 font-medium tracking-wider">
            SlimeTopia v1.0.0
          </p>
        </div>
      </div>
    </div>
  );
}
