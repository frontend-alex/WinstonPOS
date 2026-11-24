import type { ApiResponse, Lead, ScanQueued } from "@repo/contracts";
import { api } from "@/lib/api-client";

export async function getLeads(signal?: AbortSignal): Promise<Lead[]> {
	const response = await api.get<ApiResponse<Lead[]>>("/leads", { signal });
	return response.data.data;
}

export async function scanSources(): Promise<ScanQueued> {
	const response = await api.post<ApiResponse<ScanQueued>>("/leads/scan");
	return response.data.data;
}
