const API_URL = import.meta.env.VITE_API_URL;

type AuthResponse = {
  token: string;
};

export async function signup(
  username: string,
  password: string,
): Promise<AuthResponse> {

  const res = await fetch(
    `${API_URL}/v1/auth/signup`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        username,
        password,
      }),
    }
  );

  if (!res.ok) {
    throw new Error("signup failed");
  }

  return res.json();
}

type ApiError = {
  message: string;
  code?: string;
};

export async function signin(
  username: string,
  password: string,
) {
  const res = await fetch(
    `${API_URL}/v1/auth/signin`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    }
  );

  if (!res.ok) {
    const err: ApiError = await res.json();
    throw err;
  }

  return res.json();
}