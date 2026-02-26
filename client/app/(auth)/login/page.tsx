"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { generateSlimeIconSvg } from "@/lib/slimeSvg";
import { isNativePlatform } from "@/lib/platform";

const STARS = Array.from({ length: 50 }, (_, i) => ({
  size: 1 + ((i * 7 + 3) % 3),
  left: (i * 31 + 17) % 100,
  top: (i * 23 + 7) % 80,
  opacity: 0.12 + ((i * 13) % 5) * 0.08,
  dur: 2 + ((i * 11) % 4),
  delay: ((i * 7) % 30) / 10,
}));

const BG_SLIMES = [
  { element: "water", left: 5, top: 72, size: 40, delay: 0, dur: 14 },
  { element: "fire", left: 88, top: 62, size: 32, delay: 3, dur: 16 },
  { element: "grass", left: 12, top: 22, size: 28, delay: 1.5, dur: 12 },
  { element: "light", left: 82, top: 12, size: 24, delay: 4.5, dur: 15 },
  { element: "dark", left: 48, top: 88, size: 26, delay: 2, dur: 18 },
  { element: "ice", left: 94, top: 38, size: 20, delay: 5, dur: 13 },
  { element: "electric", left: 30, top: 8, size: 22, delay: 1, dur: 11 },
  { element: "poison", left: 70, top: 82, size: 18, delay: 6, dur: 17 },
];

type AuthMode = "main" | "login" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("main");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { guestLogin, register, emailLogin } = useAuthStore();

  const mascotMain = useMemo(() => generateSlimeIconSvg("grass", 110, "rare"), []);
  const mascotLeft = useMemo(() => generateSlimeIconSvg("water", 56, "common"), []);
  const mascotRight = useMemo(() => generateSlimeIconSvg("fire", 56, "common"), []);
  const mascotStar = useMemo(() => generateSlimeIconSvg("light", 36, "epic"), []);

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError("");
    try {
      await guestLogin();
      if (useAuthStore.getState().accessToken) router.push("/play");
      else setError("게스트 로그인에 실패했습니다.");
    } catch {
      setError("서버와 연결할 수 없습니다.");
    }
    setIsLoading(false);
  };

  const handleRegister = async () => {
    if (!email.trim() || !password) return;
    if (password.length < 4) { setError("비밀번호는 4자 이상이어야 합니다."); return; }
    if (password !== confirmPw) { setError("비밀번호가 일치하지 않습니다."); return; }
    setIsLoading(true);
    setError("");
    const err = await register(email.trim(), password);
    if (err) {
      if (err === "email_taken") setError("이미 사용 중인 이메일입니다.");
      else setError("회원가입에 실패했습니다.");
    } else if (useAuthStore.getState().accessToken) {
      router.push("/play");
    }
    setIsLoading(false);
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password) return;
    setIsLoading(true);
    setError("");
    const err = await emailLogin(email.trim(), password);
    if (err) {
      if (err === "invalid_credentials") setError("이메일 또는 비밀번호가 틀립니다.");
      else setError("로그인에 실패했습니다.");
    } else if (useAuthStore.getState().accessToken) {
      router.push("/play");
    }
    setIsLoading(false);
  };

  return (
    <div className="game-body">
    <div className="game-frame flex items-center justify-center p-4 relative overflow-hidden">
      {/* === Background layers === */}
      <div className="absolute inset-0 galaxy-bg" />

      <div className="nebula-blob" style={{ width: 240, height: 240, left: "5%", top: "15%", background: "rgba(106, 90, 205, 0.14)" }} />
      <div className="nebula-blob" style={{ width: 180, height: 180, right: "0%", top: "55%", background: "rgba(255, 159, 243, 0.09)", animationDelay: "-5s" }} />
      <div className="nebula-blob" style={{ width: 150, height: 150, left: "35%", bottom: "5%", background: "rgba(85, 239, 196, 0.07)", animationDelay: "-10s" }} />

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
            style={{ left: `${p.left}%`, top: `${p.top}%`, opacity: 0.1, filter: "blur(1px)", animation: `float ${p.dur}s ease-in-out infinite`, animationDelay: `${p.delay}s` }} />
        ))}
      </div>

      {/* === Main content === */}
      <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
        <div className="frosted-card rounded-3xl p-6 pb-5">

          {/* Logo + Mascot */}
          <div className="text-center mb-5">
            <div className="relative mx-auto w-48 h-32 mb-3 flex items-end justify-center">
              <img src={mascotLeft} alt="" className="absolute left-2 bottom-1 drop-shadow-[0_0_16px_rgba(116,185,255,0.5)]"
                style={{ animation: "float 4s ease-in-out infinite 0.5s" }} draggable={false} />
              <img src={mascotMain} alt="SlimeTopia" className="relative z-10 drop-shadow-[0_0_28px_rgba(85,239,196,0.6)]"
                style={{ animation: "float 3s ease-in-out infinite" }} draggable={false} />
              <img src={mascotRight} alt="" className="absolute right-2 bottom-1 drop-shadow-[0_0_16px_rgba(255,107,107,0.5)]"
                style={{ animation: "float 4s ease-in-out infinite 1s" }} draggable={false} />
              <img src={mascotStar} alt="" className="absolute -top-1 right-6 drop-shadow-[0_0_12px_rgba(255,234,167,0.6)]"
                style={{ animation: "float 5s ease-in-out infinite 2s" }} draggable={false} />
              {/* Ground shadow */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-36 h-5 rounded-full"
                style={{ background: "radial-gradient(ellipse, rgba(85,239,196,0.25), transparent 70%)", filter: "blur(10px)" }} />
            </div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-[#55EFC4] via-[#74B9FF] to-[#A29BFE] bg-clip-text text-transparent tracking-tight">
              SlimeTopia
            </h1>
            <p className="text-white/40 text-xs mt-1.5 font-medium tracking-wide">
              나만의 슬라임 왕국을 만들어보세요!
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
            <div className="space-y-3">
              {/* Guest Login — primary CTA */}
              <button onClick={handleGuestLogin} disabled={isLoading}
                className="login-btn-guest w-full py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition active:scale-[0.97] disabled:opacity-50">
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#0a0a1a]/20 border-t-[#0a0a1a] rounded-full animate-spin" />
                    접속 중...
                  </span>
                ) : (
                  <>{"\uD83C\uDFAE"} 게스트로 바로 시작</>
                )}
              </button>
              <p className="text-white/25 text-[10px] text-center -mt-1">
                기기에 저장되며, 나중에 이메일로 연동할 수 있어요
              </p>

              {/* Divider */}
              <div className="flex items-center gap-3 pt-1">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <span className="text-white/25 text-[10px] font-medium tracking-wider">이메일 계정</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>

              {/* Email Login */}
              <button onClick={() => { setMode("login"); setError(""); setEmail(""); setPassword(""); }}
                className="login-btn-email w-full py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition active:scale-[0.97]">
                {"\uD83D\uDCE7"} 이메일로 로그인
              </button>

              {/* Register */}
              <button onClick={() => { setMode("register"); setError(""); setEmail(""); setPassword(""); setConfirmPw(""); }}
                className="login-btn-register w-full py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition active:scale-[0.97]">
                {"\u2728"} 새 계정 만들기
              </button>

              {/* OAuth */}
              {!isNativePlatform() && (
                <>
                  <div className="flex items-center gap-3 pt-1">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <span className="text-white/25 text-[10px] font-medium tracking-wider">소셜 로그인</span>
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
            <div className="space-y-3">
              <div className="text-center mb-1">
                <span className="text-lg">{"\uD83D\uDCE7"}</span>
                <p className="text-white/60 text-sm font-bold mt-1">이메일 로그인</p>
              </div>

              <input type="email" placeholder="이메일 주소" value={email} onChange={(e) => setEmail(e.target.value)}
                className="login-input" autoComplete="email" />
              <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEmailLogin()}
                className="login-input" autoComplete="current-password" />

              <button onClick={handleEmailLogin} disabled={isLoading || !email.trim() || !password}
                className="login-btn-email w-full py-3 rounded-2xl font-bold text-sm transition active:scale-[0.97] disabled:opacity-40">
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    로그인 중...
                  </span>
                ) : "로그인"}
              </button>

              <div className="flex items-center justify-between pt-1">
                <button onClick={() => { setMode("main"); setError(""); }} className="text-white/30 text-xs hover:text-white/60 transition">
                  {"\u2190"} 돌아가기
                </button>
                <button onClick={() => { setMode("register"); setError(""); setConfirmPw(""); }} className="text-[#55EFC4]/50 text-xs hover:text-[#55EFC4] transition font-medium">
                  계정이 없으신가요?
                </button>
              </div>
            </div>
          )}

          {/* ===== REGISTER MODE ===== */}
          {mode === "register" && (
            <div className="space-y-3">
              <div className="text-center mb-1">
                <span className="text-lg">{"\u2728"}</span>
                <p className="text-white/60 text-sm font-bold mt-1">새 계정 만들기</p>
              </div>

              <input type="email" placeholder="이메일 주소" value={email} onChange={(e) => setEmail(e.target.value)}
                className="login-input" autoComplete="email" />
              <input type="password" placeholder="비밀번호 (4자 이상)" value={password} onChange={(e) => setPassword(e.target.value)}
                className="login-input" autoComplete="new-password" />
              <input type="password" placeholder="비밀번호 확인" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                className="login-input" autoComplete="new-password" />

              <p className="text-white/25 text-[10px] text-center">닉네임은 자동 생성됩니다 (나중에 변경 가능)</p>

              <button onClick={handleRegister} disabled={isLoading || !email.trim() || !password || !confirmPw}
                className="login-btn-register w-full py-3 rounded-2xl font-bold text-sm transition active:scale-[0.97] disabled:opacity-40">
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#0a0a1a]/20 border-t-[#0a0a1a] rounded-full animate-spin" />
                    가입 중...
                  </span>
                ) : <>{"\u2728"} 가입하기</>}
              </button>

              <div className="flex items-center justify-between pt-1">
                <button onClick={() => { setMode("main"); setError(""); }} className="text-white/30 text-xs hover:text-white/60 transition">
                  {"\u2190"} 돌아가기
                </button>
                <button onClick={() => { setMode("login"); setError(""); }} className="text-[#A29BFE]/50 text-xs hover:text-[#A29BFE] transition font-medium">
                  이미 계정이 있어요
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Version */}
        <p className="text-center text-white/15 text-[10px] mt-3 font-medium tracking-wider">
          SlimeTopia v1.0.0
        </p>
      </div>
    </div>
    </div>
  );
}
