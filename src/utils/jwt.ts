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

export function applyAuthSession(
  token: string,
  extras?: { avatar_url?: string | null; verified?: boolean; email_verified?: boolean }
) {
  localStorage.setItem("token", token);
  const payload = parseJwt(token);
  if (payload?.username && typeof payload.username === "string") {
    localStorage.setItem("username", payload.username);
  }
  if (payload?.user_id && typeof payload.user_id === "string") {
    localStorage.setItem("user_id", payload.user_id);
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

export function isAccountVerifiedLocally(): boolean {
  return localStorage.getItem("account_verified") === "1";
}
