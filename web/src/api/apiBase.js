/**
 * Centralized API base URL.
 * In development: http://localhost:5000/api
 * In production (Vercel): /api  (same-domain, relative path)
 */
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000/api";

export default API_BASE;
