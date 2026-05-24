const API_URL = import.meta.env.VITE_API_URL;

function authHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string; Err?: string };
    return body.message || body.Err || res.statusText;
  } catch {
    return res.statusText;
  }
}

export type Country = {
  id: string;
  name_ru: string;
  flag_emoji: string;
};

export type CreatedContest = {
  id: string;
  type: string;
  year: number;
  starts: string;
  ends: string;
};

export async function updatePerformance(
  token: string,
  performanceId: string,
  data: { qualified: boolean; youtube_link: string; place: number | null }
) {
  const res = await fetch(`${API_URL}/admin/performance/${performanceId}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export type ContestFormPayload = {
  year: number;
  type: string;
  starts: string;
  ends: string;
};

export async function createContest(
  token: string,
  data: ContestFormPayload
): Promise<CreatedContest> {
  const res = await fetch(`${API_URL}/admin/contest`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function updateContest(
  token: string,
  contestId: string,
  data: ContestFormPayload
): Promise<CreatedContest> {
  const res = await fetch(`${API_URL}/admin/contest/${contestId}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function createPerformance(
  token: string,
  contestId: string,
  data: {
    country_id: string;
    number?: number;
    artist: string;
    song: string;
    youtube_link?: string;
  }
): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/admin/contest/${contestId}/performance`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function updatePlaces(token: string, contestId: string, ranked: string[]) {
  const res = await fetch(`${API_URL}/admin/contest/${contestId}/places`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ ranked }),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function getCountries(): Promise<Country[]> {
  const res = await fetch(`${API_URL}/v1/countries`);
  if (!res.ok) throw new Error("countries fetch failed");
  return res.json();
}
