const API_URL = import.meta.env.VITE_API_URL;

export type UserMe = {
  id: string;
  username: string;
  email: string;
  email_verified: boolean;
  needs_email_setup: boolean;
  telegram_linked?: boolean;
  telegram_username?: string;
  needs_telegram_setup?: boolean;
  avatar_url?: string | null;
};

export type AuthResponse = {
  token: string;
  user?: UserMe;
};

export type TelegramStartResponse = {
  link_token: string;
  bot_url: string;
  bot_username?: string;
};

export type TelegramSessionStatus = {
  status: string;
  telegram_connected: boolean;
  code_sent: boolean;
};

export type ApiError = {
  message: string;
  code?: string;
};

async function parseApiError(res: Response): Promise<ApiError> {
  if (res.status === 403) {
    return { message: "Доступ запрещён", code: "FORBIDDEN" };
  }
  try {
    const err = (await res.json()) as {
      Err?: string;
      err?: string;
      message?: string;
      code?: string;
    };
    return {
      message: err.Err || err.err || err.message || "Ошибка запроса",
      code: err.code,
    };
  } catch {
    return { message: "Ошибка запроса" };
  }
}

/** @deprecated Email signup — kept for fallback */
export async function signupStart(email: string, username: string, password: string): Promise<void> {
  const res = await fetch(`${API_URL}/v1/auth/signup/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, username, password }),
  });
  if (!res.ok) {
    const err = await parseApiError(res);
    if (res.status === 403) throw { ...err, code: "SIGNUP_CLOSED" };
    throw err;
  }
}

/** @deprecated */
export async function signupConfirm(email: string, code: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/v1/auth/signup/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  if (!res.ok) throw await parseApiError(res);
  return res.json();
}

/** Вход для аккаунтов, зарегистрированных до Telegram (email или имя + пароль). */
export async function signin(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/v1/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw await parseApiError(res);
  return res.json();
}

export async function telegramSigninStart(): Promise<TelegramStartResponse> {
  const res = await fetch(`${API_URL}/v1/auth/telegram/signin/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw await parseApiError(res);
  return res.json();
}

export async function telegramSigninConfirm(
  linkToken: string,
  code: string
): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/v1/auth/telegram/signin/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ link_token: linkToken, code }),
  });
  if (!res.ok) throw await parseApiError(res);
  return res.json();
}

export async function telegramSessionStatus(
  linkToken: string
): Promise<TelegramSessionStatus> {
  const res = await fetch(
    `${API_URL}/v1/auth/telegram/session?link_token=${encodeURIComponent(linkToken)}`
  );
  if (!res.ok) {
    const err = await parseApiError(res);
    if (res.status === 403) throw { ...err, code: err.code || "SIGNUP_CLOSED" };
    throw err;
  }
  return res.json();
}

/** @deprecated */
export async function requestEmailBind(email: string): Promise<void> {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/v1/auth/email/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw await parseApiError(res);
}

/** @deprecated */
export async function confirmEmailBind(email: string, code: string): Promise<AuthResponse> {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/v1/auth/email/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ email, code }),
  });
  if (!res.ok) throw await parseApiError(res);
  return res.json();
}

/** @deprecated */
export async function passwordForgot(email: string): Promise<void> {
  const res = await fetch(`${API_URL}/v1/auth/password/forgot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw await parseApiError(res);
}

/** @deprecated */
export async function passwordReset(email: string, code: string, password: string): Promise<void> {
  const res = await fetch(`${API_URL}/v1/auth/password/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code, password }),
  });
  if (!res.ok) throw await parseApiError(res);
}
