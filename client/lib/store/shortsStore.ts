import { create } from "zustand";
import { authApi } from "@/lib/api/client";

export interface Short {
  id: string;
  user_id: string;
  nickname: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  duration_ms: number;
  tags: string[];
  category: string;
  linked_species_id?: number;
  views: number;
  likes: number;
  comment_count: number;
  created_at: string;
  liked: boolean;
  is_mine: boolean;
}

export interface ShortComment {
  id: string;
  user_id: string;
  nickname: string;
  content: string;
  likes: number;
  created_at: string;
  liked: boolean;
  is_mine: boolean;
}

export interface MyShort {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string;
  views: number;
  likes: number;
  comment_count: number;
  status: string;
  created_at: string;
}

interface ShortsState {
  shorts: Short[];
  cursor: string | null;
  hasMore: boolean;
  loading: boolean;
  comments: ShortComment[];
  commentsLoading: boolean;

  // My shorts (creator studio)
  myShorts: MyShort[];
  myTotalViews: number;
  myTotalLikes: number;
  myTotalTipsGold: number;
  myTotalTipsGems: number;

  fetchFeed: (token: string, reset?: boolean) => Promise<void>;
  likeShort: (token: string, shortId: string) => Promise<void>;
  unlikeShort: (token: string, shortId: string) => Promise<void>;
  viewShort: (token: string, shortId: string) => Promise<void>;
  reactShort: (token: string, shortId: string, emoji: string) => Promise<void>;
  deleteShort: (token: string, shortId: string) => Promise<void>;

  fetchComments: (token: string, shortId: string) => Promise<void>;
  createComment: (token: string, shortId: string, content: string) => Promise<void>;

  fetchMyShorts: (token: string) => Promise<void>;
}

export const useShortsStore = create<ShortsState>((set, get) => ({
  shorts: [],
  cursor: null,
  hasMore: true,
  loading: false,
  comments: [],
  commentsLoading: false,

  myShorts: [],
  myTotalViews: 0,
  myTotalLikes: 0,
  myTotalTipsGold: 0,
  myTotalTipsGems: 0,

  fetchFeed: async (token, reset = false) => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const cursor = reset ? "" : get().cursor || "";
      const params = cursor ? `?cursor=${cursor}&limit=10` : "?limit=10";
      const res = await authApi<{ shorts: Short[]; next_cursor: string }>(
        `/api/shorts/feed${params}`,
        token,
      );
      const newShorts = res.shorts || [];
      set({
        shorts: reset ? newShorts : [...get().shorts, ...newShorts],
        cursor: res.next_cursor || null,
        hasMore: !!res.next_cursor && newShorts.length > 0,
        loading: false,
      });
    } catch {
      set({ loading: false, hasMore: false });
    }
  },

  likeShort: async (token, shortId) => {
    await authApi(`/api/shorts/${shortId}/like`, token, { method: "POST" });
    set({
      shorts: get().shorts.map((s) =>
        s.id === shortId ? { ...s, liked: true, likes: s.likes + 1 } : s,
      ),
    });
  },

  unlikeShort: async (token, shortId) => {
    await authApi(`/api/shorts/${shortId}/unlike`, token, { method: "POST" });
    set({
      shorts: get().shorts.map((s) =>
        s.id === shortId ? { ...s, liked: false, likes: Math.max(0, s.likes - 1) } : s,
      ),
    });
  },

  viewShort: async (token, shortId) => {
    try {
      await authApi(`/api/shorts/${shortId}`, token);
    } catch {
      // silently fail
    }
  },

  reactShort: async (token, shortId, emoji) => {
    await authApi(`/api/shorts/${shortId}/react`, token, {
      method: "POST",
      body: { emoji },
    });
  },

  deleteShort: async (token, shortId) => {
    await authApi(`/api/shorts/${shortId}`, token, { method: "DELETE" });
    set({
      shorts: get().shorts.filter((s) => s.id !== shortId),
      myShorts: get().myShorts.filter((s) => s.id !== shortId),
    });
  },

  fetchComments: async (token, shortId) => {
    set({ commentsLoading: true });
    try {
      const res = await authApi<{ comments: ShortComment[] }>(
        `/api/shorts/${shortId}/comments`,
        token,
      );
      set({ comments: res.comments, commentsLoading: false });
    } catch {
      set({ commentsLoading: false });
    }
  },

  createComment: async (token, shortId, content) => {
    const res = await authApi<{ id: string }>(`/api/shorts/${shortId}/comments`, token, {
      method: "POST",
      body: { content },
    });
    // Re-fetch comments
    get().fetchComments(token, shortId);
    // Update comment count in feed
    set({
      shorts: get().shorts.map((s) =>
        s.id === shortId ? { ...s, comment_count: s.comment_count + 1 } : s,
      ),
    });
  },

  fetchMyShorts: async (token) => {
    try {
      const res = await authApi<{
        shorts: MyShort[];
        total_views: number;
        total_likes: number;
        total_tips_gold: number;
        total_tips_gems: number;
      }>("/api/shorts/mine", token);
      set({
        myShorts: res.shorts,
        myTotalViews: res.total_views,
        myTotalLikes: res.total_likes,
        myTotalTipsGold: res.total_tips_gold,
        myTotalTipsGems: res.total_tips_gems,
      });
    } catch {
      // silently fail
    }
  },
}));
