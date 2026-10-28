import {
  getFallbackPrices,
  getFallbackTrend,
  getFallbackComparison,
} from "./fallbackData";

const DEFAULT_API_URL = "https://m-andidarpan.vercel.app";

const PRIMARY_API_URL = (
  import.meta.env.VITE_API_URL || DEFAULT_API_URL
).replace(/\/+$/, "");
const FALLBACK_API_URL = DEFAULT_API_URL;

let activeBaseUrl = PRIMARY_API_URL;

/**
 * Robust fetch wrapper that handles HTTP errors and port fallback
 */
async function fetchWithFallback(endpoint, options = {}) {
  try {
    const res = await fetch(`${activeBaseUrl}${endpoint}`, options);
    return res;
  } catch (err) {
    if (activeBaseUrl !== FALLBACK_API_URL) {
      try {
        const fallbackRes = await fetch(
          `${FALLBACK_API_URL}${endpoint}`,
          options,
        );
        activeBaseUrl = FALLBACK_API_URL;
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

    // 1. If backend returned an HTTP error (500, 502, 503, upstream data.gov.in down)
    if (!res.ok) {
      console.warn(
        `Backend returned HTTP ${res.status}. Falling back to cached/offline mandi data.`,
        data,
      );
      return getFallbackPrices({ commodity, district, state });
    }

    // 2. If the API is working fine, but returned no_data or empty records array from the site:
    if (
      data.status === "no_data" ||
      (Array.isArray(data.records) && data.records.length === 0)
    ) {
      return {
        success: true,
        status: "no_data",
        count: 0,
        total: 0,
        commodity: data.commodity || commodity,
        district: data.district || district,
        state: data.state || state,
        message:
          data.message ||
          "इस फसल या ज़िले के लिए वर्तमान में कोई मंडी भाव उपलब्ध नहीं है।",
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
    console.warn("Mandi API network error, using fallback data:", err.message);
    return getFallbackPrices({ commodity, district, state });
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

    if (!res.ok || data.status === "source_unavailable") {
      console.warn("Trend API error, using fallback trend data.");
      return getFallbackTrend({ commodity, district, days, market });
    }

    return data;
  } catch (err) {
    console.warn("Trend service error, using fallback trend data:", err.message);
    return getFallbackTrend({ commodity, district, days, market });
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

    if (!res.ok || data.status === "source_unavailable") {
      console.warn("Compare API error, using fallback mandi comparison data.");
      return getFallbackComparison({ commodity, district, userLat, userLon });
    }

    return data;
  } catch (err) {
    console.warn("Comparison service error, using fallback data:", err.message);
    return getFallbackComparison({ commodity, district, userLat, userLon });
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

    // If upstream government API had an error, provide fallback mandi prices in AI answer
    if (
      data.success &&
      data.intent &&
      data.intent.commodity &&
      data.groundedData &&
      (!data.groundedData.success ||
        data.groundedData.status === "api_error" ||
        data.groundedData.status === "source_unavailable")
    ) {
      const comm = data.intent.commodity;
      const dist = data.intent.district || "नज़दीकी मंडी";
      const fb = getFallbackPrices({ commodity: comm, district: dist });
      const rec = fb.records && fb.records[0];
      if (rec) {
        data.answer = `सरकारी सर्वर (data.gov.in) में अस्थाई समस्या के कारण, मानक अनुमानित दरों के अनुसार ${dist} में ${comm} का मॉडल भाव लगभग ₹${rec.modalPrice.toLocaleString("en-IN")}/क्विंटल (न्यूनतम ₹${rec.minPrice.toLocaleString("en-IN")}, अधिकतम ₹${rec.maxPrice.toLocaleString("en-IN")}) दर्ज है।`;
        data.isFallbackData = true;
      }
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
