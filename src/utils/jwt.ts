export function parseJwt(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function readVerified(
  payload: Record<string, unknown> | null,
  extras?: { verified?: boolean; email_verified?: boolean }
): boolean | undefined {
  if (typeof extras?.verified === "boolean") return extras.verified;
  if (typeof extras?.email_verified === "boolean") return extras.email_verified;
  if (typeof payload?.verified === "boolean") return payload.verified;
  if (typeof payload?.email_verified === "boolean") return payload.email_verified;
  return undefined;
}

function readUserId(
  payload: Record<string, unknown> | null,
  extras?: { user_id?: string }
): string | undefined {
  if (extras?.user_id) return extras.user_id;
  const id = payload?.user_id;
  if (typeof id === "string") return id;
  return undefined;
}

function readUsername(
  payload: Record<string, unknown> | null,
  extras?: { username?: string }
): string | undefined {
  if (extras?.username) return extras.username;
  const name = payload?.username;
  if (typeof name === "string") return name;
  return undefined;
}

export function applyAuthSession(
  token: string,
  extras?: {
    avatar_url?: string | null;
    verified?: boolean;
    email_verified?: boolean;
    user_id?: string;
    username?: string;
  }
) {
  localStorage.setItem("token", token);
  const payload = parseJwt(token);

  const userId = readUserId(payload, extras);
  if (userId) {
    localStorage.setItem("user_id", userId);
  }

  const username = readUsername(payload, extras);
  if (username) {
    localStorage.setItem("username", username);
  }

  const verified = readVerified(payload, extras);
  if (typeof verified === "boolean") {
    localStorage.setItem("account_verified", verified ? "1" : "0");
  }
  if (extras && "avatar_url" in extras) {
    if (extras.avatar_url) {
      localStorage.setItem("avatar_url", extras.avatar_url);
    } else {
      localStorage.removeItem("avatar_url");
    }
    window.dispatchEvent(
      new CustomEvent("ev-avatar-updated", { detail: extras.avatar_url ?? null })
    );
  }
  window.dispatchEvent(new CustomEvent("ev-auth-updated"));
}

export function readAuthFromStorage(): {
  token: string | null;
  userId: string | null;
  username: string | null;
} {
  return {
    token: localStorage.getItem("token"),
    userId: localStorage.getItem("user_id"),
    username: localStorage.getItem("username"),
  };
}

export function isAccountVerifiedLocally(): boolean {
  return localStorage.getItem("account_verified") === "1";
}
