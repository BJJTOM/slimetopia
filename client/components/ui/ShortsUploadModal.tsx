"use client";

import { useState, useRef } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useShortsStore } from "@/lib/store/shortsStore";
import { uploadApi, authApi } from "@/lib/api/client";
import { toastSuccess, toastError } from "@/components/ui/Toast";

const CATEGORIES = [
  { value: "general", label: "일반" },
  { value: "tip", label: "꿀팁" },
  { value: "showcase", label: "자랑" },
  { value: "recipe", label: "레시피" },
  { value: "funny", label: "재미" },
];

const VISIBILITY_OPTIONS = [
  { value: "public", label: "공개" },
  { value: "unlisted", label: "비공개 링크" },
  { value: "private", label: "비공개" },
];

interface Props {
  onClose: () => void;
}

export default function ShortsUploadModal({ onClose }: Props) {
  const token = useAuthStore((s) => s.accessToken);
  const fetchFeed = useShortsStore((s) => s.fetchFeed);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [visibility, setVisibility] = useState("public");
  const [tagsInput, setTagsInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const fileRef = useRef<HTMLInputElement>(null);

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toastError("50MB 이하의 영상만 업로드할 수 있어요");
      return;
    }
    try {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    } catch {
      toastError("영상을 불러올 수 없어요");
      setVideoFile(null);
      setVideoPreview(null);
    }
    // Reset input value so same file can be re-selected
    if (fileRef.current) fileRef.current.value = "";
  };

  const addTag = () => {
    const t = tagsInput.trim();
    if (t && tags.length < 10 && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagsInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((tt) => tt !== tag));
  };

  const handleUpload = async () => {
    if (!token || !title.trim()) return;
    setUploading(true);
    setProgress(0);

    try {
      if (videoFile) {
        // Multipart upload with video
        const formData = new FormData();
        formData.append("video", videoFile);
        formData.append("title", title.trim());
        formData.append("description", description);
        formData.append("category", category);
        formData.append("visibility", visibility);
        if (tags.length > 0) {
          formData.append("tags", tags.join(","));
        }

        await uploadApi<{ id: string; video_url: string }>(
          "/api/shorts/upload",
          formData,
          token,
          (pct) => setProgress(pct),
        );
      } else {
        // Text-only short (no video)
        const formData = new FormData();
        formData.append("title", title.trim());
        formData.append("description", description);
        formData.append("category", category);
        formData.append("visibility", visibility);
        if (tags.length > 0) {
          formData.append("tags", tags.join(","));
        }

        await uploadApi<{ id: string }>(
          "/api/shorts/upload",
          formData,
          token,
          (pct) => setProgress(pct),
        );
      }

      toastSuccess("쇼츠가 업로드되었어요!");
      fetchFeed(token, true);
      onClose();
    } catch (err: unknown) {
      const apiMsg = (err as { data?: { error?: string } })?.data?.error;
      if (apiMsg === "daily upload limit reached") {
        toastError("오늘 업로드 가능한 횟수를 초과했어요 (하루 5개)");
      } else {
        toastError("업로드에 실패했어요. 다시 시도해주세요.");
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-3xl max-h-[90vh] overflow-y-auto"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
          background: "linear-gradient(180deg, #2C1810, #1A0E08)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-5 pb-3"
          style={{
            background: "linear-gradient(180deg, #3D2017, #2C1810)",
            borderBottom: "3px double #8B6914",
          }}>
          <button onClick={onClose} className="text-sm" style={{ color: "rgba(245,230,200,0.5)" }}>취소</button>
          <h2 className="font-bold" style={{ color: "#F5E6C8", fontFamily: "Georgia, 'Times New Roman', serif" }}>쇼츠 업로드</h2>
          <button
            onClick={handleUpload}
            disabled={!title.trim() || uploading}
            className="text-sm font-bold px-4 py-1.5 rounded-full text-white disabled:opacity-30 transition active:scale-95"
            style={{ background: "linear-gradient(135deg, #C9A84C, #8B6914)" }}
          >
            {uploading ? `${progress}%` : "업로드"}
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Video picker — optional */}
          {!videoPreview ? (
            <div className="rounded-2xl overflow-hidden" style={{ border: "2px dashed rgba(139,105,20,0.3)", background: "rgba(245,230,200,0.03)" }}>
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full py-8 flex flex-col items-center justify-center gap-2"
              >
                <span className="text-4xl">🎬</span>
                <span className="text-sm" style={{ color: "rgba(245,230,200,0.5)" }}>영상 추가 (선택사항)</span>
                <span className="text-xs" style={{ color: "rgba(245,230,200,0.25)" }}>최대 50MB · 영상 없이 텍스트만으로도 올릴 수 있어요</span>
              </button>
            </div>
          ) : (
            <div className="relative w-full aspect-[9/16] max-h-60 rounded-2xl overflow-hidden bg-black"
              style={{ border: "1px solid rgba(139,105,20,0.3)" }}>
              <video
                src={videoPreview}
                className="w-full h-full object-contain"
                controls
                muted
                playsInline
              />
              <button
                onClick={() => {
                  if (videoPreview) URL.revokeObjectURL(videoPreview);
                  setVideoFile(null);
                  setVideoPreview(null);
                }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs"
                style={{ background: "rgba(0,0,0,0.6)", color: "rgba(245,230,200,0.6)" }}
              >
                ✕
              </button>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleVideoSelect}
          />

          {/* Title */}
          <div>
            <label className="text-xs mb-1 block" style={{ color: "rgba(201,168,76,0.6)" }}>제목 *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 100))}
              placeholder="쇼츠 제목을 입력하세요"
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
              style={{
                background: "rgba(245,230,200,0.05)",
                color: "#F5E6C8",
                border: "1px solid rgba(139,105,20,0.15)",
              }}
            />
            <span className="text-[10px] mt-0.5 block text-right" style={{ color: "rgba(245,230,200,0.2)" }}>{title.length}/100</span>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs mb-1 block" style={{ color: "rgba(201,168,76,0.6)" }}>설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              placeholder="설명을 추가하세요 (선택)"
              rows={2}
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-none"
              style={{
                background: "rgba(245,230,200,0.05)",
                color: "#F5E6C8",
                border: "1px solid rgba(139,105,20,0.15)",
              }}
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs mb-1 block" style={{ color: "rgba(201,168,76,0.6)" }}>카테고리</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                  style={{
                    background: category === cat.value ? "rgba(201,168,76,0.15)" : "rgba(245,230,200,0.04)",
                    color: category === cat.value ? "#C9A84C" : "rgba(245,230,200,0.4)",
                    border: category === cat.value ? "1px solid rgba(201,168,76,0.3)" : "1px solid rgba(139,105,20,0.1)",
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs mb-1 block" style={{ color: "rgba(201,168,76,0.6)" }}>태그</label>
            <div className="flex gap-2">
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="태그 입력 후 Enter"
                className="flex-1 rounded-xl px-4 py-2 text-sm outline-none"
                style={{
                  background: "rgba(245,230,200,0.05)",
                  color: "#F5E6C8",
                  border: "1px solid rgba(139,105,20,0.15)",
                }}
              />
              <button
                onClick={addTag}
                className="px-3 py-2 rounded-xl text-sm"
                style={{
                  background: "rgba(245,230,200,0.04)",
                  color: "rgba(245,230,200,0.4)",
                  border: "1px solid rgba(139,105,20,0.1)",
                }}
              >
                추가
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs"
                    style={{ background: "rgba(201,168,76,0.1)", color: "#C9A84C" }}
                  >
                    #{tag}
                    <button onClick={() => removeTag(tag)} style={{ color: "rgba(201,168,76,0.4)" }}>✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Visibility */}
          <div>
            <label className="text-xs mb-1 block" style={{ color: "rgba(201,168,76,0.6)" }}>공개 설정</label>
            <div className="flex gap-2">
              {VISIBILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setVisibility(opt.value)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background: visibility === opt.value ? "rgba(201,168,76,0.15)" : "rgba(245,230,200,0.04)",
                    color: visibility === opt.value ? "#C9A84C" : "rgba(245,230,200,0.4)",
                    border: visibility === opt.value ? "1px solid rgba(201,168,76,0.3)" : "1px solid rgba(139,105,20,0.1)",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Upload progress bar */}
          {uploading && (
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(139,105,20,0.15)" }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, background: "linear-gradient(90deg, #C9A84C, #D4AF37)" }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
