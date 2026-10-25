// MandiDarpan Unified API Service
// Connects to MandiMitra backend with resilient port fallback (5000 / 5001)

const PRIMARY_API_URL =
  import.meta.env.VITE_API_URL || "https://gdg-srmcem.onrender.com/";
const FALLBACK_API_URL = "https://gdg-srmcem.onrender.com/";

let activeBaseUrl = PRIMARY_API_URL;

/**
 * Robust fetch wrapper that handles HTTP errors and port fallback
 */
async function fetchWithFallback(endpoint, options = {}) {
  try {
    const res = await fetch(`${activeBaseUrl}${endpoint}`, options);
    return res;
  } catch (err) {
    // If primary failed and was 5000, try 5001 (macOS AirPlay fallback)
    if (activeBaseUrl !== FALLBACK_API_URL) {
      try {
        const fallbackRes = await fetch(
          `${FALLBACK_API_URL}${endpoint}`,
          options,
        );
        activeBaseUrl = FALLBACK_API_URL; // sticky to working port
        return fallbackRes;
      } catch {
        throw err;
      }
    }
    throw err;
  }
}

/**
 * 1. GET /api/prices/today
 */
export async function getTodayPrices({
  commodity,
  district,
  state,
  limit = 50,
} = {}) {
  const queryParams = new URLSearchParams();
  if (commodity?.trim()) queryParams.append("commodity", commodity.trim());
  if (district?.trim()) queryParams.append("district", district.trim());
  if (state?.trim()) queryParams.append("state", state.trim());
  if (limit) queryParams.append("limit", String(limit));

  try {
    const res = await fetchWithFallback(
      `/api/prices/today?${queryParams.toString()}`,
    );
    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        status: data?.error?.code || "error",
        message:
          data?.error?.message ||
          data?.message ||
          `HTTP ${res.status}: Failed to fetch prices`,
        hint: data?.error?.hint,
        records: [],
      };
    }

    return {
      success: true,
      status: data.status || "success",
      count: data.count || 0,
      total: data.total || data.count || 0,
      commodity: data.commodity,
      district: data.district,
      state: data.state,
      message: data.message,
      records: Array.isArray(data.records) ? data.records : [],
    };
  } catch (err) {
    return {
      success: false,
      status: "network_error",
      message:
        "Unable to connect to MandiMitra backend server. Please verify backend is running.",
      details: err.message,
      records: [],
    };
  }
}

/**
 * 2. GET /api/prices/trend
 */
export async function getPriceTrend({
  commodity,
  district,
  state,
  days = 7,
  market,
} = {}) {
  const queryParams = new URLSearchParams();
  if (commodity?.trim()) queryParams.append("commodity", commodity.trim());
  if (district?.trim()) queryParams.append("district", district.trim());
  if (state?.trim()) queryParams.append("state", state.trim());
  if (days) queryParams.append("days", String(days));
  if (market?.trim()) queryParams.append("market", market.trim());

  try {
    const res = await fetchWithFallback(
      `/api/prices/trend?${queryParams.toString()}`,
    );
    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        status: data?.error?.code || "error",
        message:
          data?.error?.message ||
          data?.message ||
          "Failed to fetch price trend",
        hint: data?.error?.hint,
      };
    }

    return data;
  } catch (err) {
    return {
      success: false,
      status: "network_error",
      message:
        "Failed to connect to trend service. Please check your backend connection.",
      details: err.message,
    };
  }
}

/**
 * 3. GET /api/mandis/compare
 */
export async function compareMandis({
  commodity,
  district,
  userLat,
  userLon,
} = {}) {
  const queryParams = new URLSearchParams();
  if (commodity?.trim()) queryParams.append("commodity", commodity.trim());
  if (district?.trim()) queryParams.append("district", district.trim());
  if (userLat !== undefined && userLat !== null) {
    queryParams.append("lat", String(userLat));
  }

  if (userLon !== undefined && userLon !== null) {
    queryParams.append("lng", String(userLon));
  }

  try {
    const res = await fetchWithFallback(
      `/api/mandis/compare?${queryParams.toString()}`,
    );
    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        status: data?.error?.code || "error",
        message:
          data?.error?.message || data?.message || "Failed to compare mandis",
        hint: data?.error?.hint,
      };
    }

    return data;
  } catch (err) {
    return {
      success: false,
      status: "network_error",
      message: "Failed to connect to mandi comparison service.",
      details: err.message,
    };
  }
}

/**
 * 4. POST /api/query (Gemma 4 AI Assistant)
 */
export async function queryGemma({ question }) {
  try {
    const res = await fetchWithFallback("/api/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ question: question.trim() }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        status: data?.error?.code || "error",
        message:
          data?.error?.message ||
          data?.message ||
          "AI assistant request failed",
        hint: data?.error?.hint,
        answer: data?.error?.message || "AI सेवा से उत्तर प्राप्त नहीं हो सका।",
      };
    }

    return data;
  } catch (err) {
    return {
      success: false,
      status: "network_error",
      message: "Unable to communicate with MandiMitra AI assistant.",
      answer: "सर्वर से संपर्क नहीं हो पा रहा है। कृपया बैकएंड कनेक्शन जांचें।",
      details: err.message,
    };
  }
}

/**
 * Health check
 */
export async function checkBackendHealth() {
  try {
    const res = await fetchWithFallback("/api/health");
    if (res.ok) {
      const data = await res.json();
      return { isOnline: true, data };
    }
    return { isOnline: false };
  } catch {
    return { isOnline: false };
  }
}
