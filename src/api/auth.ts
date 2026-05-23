const API_URL = import.meta.env.VITE_API_URL;

type AuthResponse = {
  token: string;
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
    const err = (await res.json()) as { Err?: string; err?: string; message?: string; code?: string };
    return {
      message: err.Err || err.err || err.message || "Ошибка запроса",
      code: err.code,
    };
  } catch {
    return { message: "Ошибка запроса" };
  }
}

export async function signup(username: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/v1/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const err = await parseApiError(res);
    if (res.status === 403) {
      throw { ...err, code: "SIGNUP_CLOSED" };
    }
    throw err;
  }

  return res.json();
}

export async function signin(username: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/v1/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    throw await parseApiError(res);
  }

  return res.json();
}
