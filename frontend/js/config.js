// Edit this when pointing the frontend at a deployed backend (e.g. Render URL).
const API_BASE_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:8000"
        : "https://suburban-insight-api.onrender.com";