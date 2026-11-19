import type { ContestView, ContestsByYear, PerformanceWithScores } from "../types/contest";

const API_URL = import.meta.env.VITE_API_URL;

export async function getContests(): Promise<ContestsByYear> {

  const res = await fetch(`${API_URL}/v1/contest`);

  return res.json();

}

export async function getContest(id: string): Promise<ContestView> {

  const res = await fetch(`${API_URL}/v1/contest/${id}`);

  return res.json();

}

export async function getTopPerformances(): Promise<PerformanceWithScores[]> {
  const res = await fetch(`${API_URL}/v1/top`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}