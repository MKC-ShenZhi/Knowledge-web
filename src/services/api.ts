import { request } from "./request";
import type { Category, Conference, ConferenceQuery } from "../types/conference";
import type { PaperQuery, PaperSearchResult, PaperTrack, PaperVenue } from "../types/paper";

export async function fetchCategories(signal?: AbortSignal): Promise<Category[]> {
  return request<Category[]>("/categories", { signal });
}

export async function fetchConferences(query: ConferenceQuery, signal?: AbortSignal): Promise<Conference[]> {
  const params = new URLSearchParams();
  if (query.sub) {
    const subValue = Array.isArray(query.sub) ? query.sub.join(",") : query.sub;
    params.set("sub", subValue);
  }
  if (query.q) params.set("q", query.q);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return request<Conference[]>(`/conferences${suffix}`, { signal });
}

export async function addConference(conferenceData: unknown): Promise<unknown> {
  return request("/conferences", { method: "POST", body: conferenceData as Record<string, unknown> });
}

export async function fetchPaperVenues(signal?: AbortSignal): Promise<PaperVenue[]> {
  return request<PaperVenue[]>("/papers/venues", { signal });
}

export async function fetchPaperTracks(conference: string, signal?: AbortSignal): Promise<PaperTrack[]> {
  const params = new URLSearchParams({ conference });
  return request<PaperTrack[]>(`/papers/tracks?${params.toString()}`, { signal });
}

export async function fetchPapers(query: PaperQuery, signal?: AbortSignal): Promise<PaperSearchResult> {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.conference) params.set("conference", query.conference);
  if (query.year) params.set("year", String(query.year));
  if (query.track) params.set("track", query.track);
  if (query.limit) params.set("limit", String(query.limit));
  if (query.offset) params.set("offset", String(query.offset));
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return request<PaperSearchResult>(`/papers${suffix}`, { signal });
}
