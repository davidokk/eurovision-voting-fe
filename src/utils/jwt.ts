export function parseJwt(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split(".")[1];
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function applyAuthSession(
  token: string,
  extras?: { avatar_url?: string | null; email_verified?: boolean }
) {
  localStorage.setItem("token", token);
  const payload = parseJwt(token);
  if (payload?.username && typeof payload.username === "string") {
    localStorage.setItem("username", payload.username);
  }
  if (payload?.user_id && typeof payload.user_id === "string") {
    localStorage.setItem("user_id", payload.user_id);
  }
  const verified =
    extras?.email_verified ??
    (typeof payload?.email_verified === "boolean" ? payload.email_verified : undefined);
  if (typeof verified === "boolean") {
    localStorage.setItem("email_verified", verified ? "1" : "0");
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

export function isEmailVerifiedLocally(): boolean {
  return localStorage.getItem("email_verified") === "1";
}
