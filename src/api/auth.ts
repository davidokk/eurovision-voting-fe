const API_URL = import.meta.env.VITE_API_URL;

export type UserMe = {
  id: string;
  username: string;
  telegram_linked?: boolean;
  telegram_username?: string;
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
