import axios, { type AxiosInstance } from "axios";

const DEFAULT_TIMEOUT = 30000;

export const api: AxiosInstance = axios.create({
	baseURL: "http://127.0.0.1:3000",
	withCredentials: true,
	headers: {
		"Content-Type": "application/json",
	},
	timeout: DEFAULT_TIMEOUT,
});
