import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nss_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function formatApiError(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function fileUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${API}/files/${path}`;
}

export async function uploadFile(file, folder = "misc") {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);
  const { data } = await api.post("/files/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
  return data;
}

export default api;
