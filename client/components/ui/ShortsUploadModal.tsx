"use client";

import { useState, useRef } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import { useShortsStore } from "@/lib/store/shortsStore";
import { uploadApi } from "@/lib/api/client";
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
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const addTag = () => {
    const t = tagsInput.trim();
    if (t && tags.length < 10 && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagsInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleUpload = async () => {
    if (!token || !videoFile || !title.trim()) return;
    setUploading(true);
    setProgress(0);

    try {
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

      toastSuccess("쇼츠가 업로드되었어요!");
      fetchFeed(token, true);
      onClose();
    } catch {
      toastError("업로드에 실패했어요");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div
        className="w-full max-w-lg bg-[#1a1a2e] rounded-t-3xl max-h-[90vh] overflow-y-auto"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#1a1a2e] z-10 flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/5">
          <button onClick={onClose} className="text-white/50 text-sm">취소</button>
          <h2 className="text-white font-bold">쇼츠 업로드</h2>
          <button
            onClick={handleUpload}
            disabled={!videoFile || !title.trim() || uploading}
            className="text-sm font-bold px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white disabled:opacity-30"
          >
            {uploading ? `${progress}%` : "업로드"}
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Video picker */}
          {!videoPreview ? (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full aspect-[9/16] max-h-60 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 bg-white/5"
            >
              <span className="text-4xl">🎬</span>
              <span className="text-white/40 text-sm">영상을 선택하세요</span>
              <span className="text-white/20 text-xs">최대 50MB</span>
            </button>
          ) : (
            <div className="relative w-full aspect-[9/16] max-h-60 rounded-2xl overflow-hidden bg-black">
              <video
                src={videoPreview}
                className="w-full h-full object-contain"
                controls
                muted
              />
              <button
                onClick={() => { setVideoFile(null); setVideoPreview(null); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white/60 text-xs"
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
            <label className="text-white/40 text-xs mb-1 block">제목 *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 100))}
              placeholder="쇼츠 제목을 입력하세요"
              className="w-full bg-white/5 text-white rounded-xl px-4 py-2.5 text-sm outline-none border border-white/5 focus:border-purple-500/40 placeholder:text-white/20"
            />
            <span className="text-white/20 text-[10px] mt-0.5 block text-right">{title.length}/100</span>
          </div>

          {/* Description */}
          <div>
            <label className="text-white/40 text-xs mb-1 block">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              placeholder="설명을 추가하세요 (선택)"
              rows={2}
              className="w-full bg-white/5 text-white rounded-xl px-4 py-2.5 text-sm outline-none border border-white/5 focus:border-purple-500/40 placeholder:text-white/20 resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-white/40 text-xs mb-1 block">카테고리</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    category === cat.value
                      ? "bg-purple-500/30 text-purple-300 border border-purple-500/40"
                      : "bg-white/5 text-white/40 border border-white/5"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-white/40 text-xs mb-1 block">태그</label>
            <div className="flex gap-2">
              <input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="태그 입력 후 Enter"
                className="flex-1 bg-white/5 text-white rounded-xl px-4 py-2 text-sm outline-none border border-white/5 focus:border-purple-500/40 placeholder:text-white/20"
              />
              <button
                onClick={addTag}
                className="px-3 py-2 bg-white/5 rounded-xl text-white/40 text-sm border border-white/5"
              >
                추가
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-cyan-500/10 text-cyan-300/80 rounded-full text-xs"
                  >
                    #{tag}
                    <button onClick={() => removeTag(tag)} className="text-cyan-300/40 hover:text-cyan-300">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Visibility */}
          <div>
            <label className="text-white/40 text-xs mb-1 block">공개 설정</label>
            <div className="flex gap-2">
              {VISIBILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setVisibility(opt.value)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    visibility === opt.value
                      ? "bg-purple-500/30 text-purple-300 border border-purple-500/40"
                      : "bg-white/5 text-white/40 border border-white/5"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Upload progress bar */}
          {uploading && (
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
