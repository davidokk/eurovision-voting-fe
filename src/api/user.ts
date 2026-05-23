const API_URL = import.meta.env.VITE_API_URL;

export type UserPublic = {
  id: string;
  username: string;
  avatar_url?: string | null;
};

export async function fetchUserPublic(id: string): Promise<UserPublic> {
  const res = await fetch(`${API_URL}/v1/user/public?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("user not found");
  return res.json();
}

export async function fetchMe(token: string): Promise<UserPublic> {
  const res = await fetch(`${API_URL}/v1/user/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("unauthorized");
  return res.json();
}

export async function uploadAvatar(file: Blob): Promise<string> {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("not authenticated");

  const form = new FormData();
  form.append("kind", "avatar");
  form.append("file", file, "avatar.jpg");

  const res = await fetch(`${API_URL}/v1/media/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "upload failed");
  }

  const data = (await res.json()) as { url: string };
  return data.url;
}

export function setStoredAvatarUrl(url: string | null) {
  if (url) localStorage.setItem("avatar_url", url);
  else localStorage.removeItem("avatar_url");
  window.dispatchEvent(new CustomEvent("ev-avatar-updated", { detail: url }));
}

export function getStoredAvatarUrl(): string | null {
  return localStorage.getItem("avatar_url");
}

export async function deleteAvatar(): Promise<void> {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("not authenticated");

  const res = await fetch(`${API_URL}/v1/user/avatar`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "delete failed");
  }

  setStoredAvatarUrl(null);
}
