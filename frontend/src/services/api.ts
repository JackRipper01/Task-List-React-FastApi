// src/services/api.ts

/**
 * Manages API configuration and provides functions for backend communication.
 * The base URL is determined by the environment variable VITE_API_BASE_URL,
 * with a fallback for local development.
 */

// Use Vite's import.meta.env to get environment variables.
// Provide a fallback for local development if the .env file is not set.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
console.log("Frontend API_BASE_URL resolved to:", API_BASE_URL);

// Base URL for the web application, used for authentication redirects.
export const WEB_APP_BASE_URL = import.meta.env.VITE_WEB_APP_BASE_URL || "http://localhost:5173";
console.log("Frontend WEB_APP_BASE_URL resolved to:", WEB_APP_BASE_URL);