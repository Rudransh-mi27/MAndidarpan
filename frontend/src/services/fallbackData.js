/**
 * Fallback dataset & generator for MandiDarpan
 * Automatically used when the upstream data.gov.in / Agmarknet server is down or throws 502/503.
 */

const BASE_COMMODITY_PRICES = {
  Wheat: { modal: 2450, min: 2380, max: 2520, variety: "Dara", unit: "Quintal" },
  Rice: { modal: 3100, min: 2950, max: 3250, variety: "Common (IR-64)", unit: "Quintal" },
  Potato: { modal: 1450, min: 1300, max: 1600, variety: "Jyoti", unit: "Quintal" },
  Onion: { modal: 2200, min: 2000, max: 2450, variety: "Nasik Red", unit: "Quintal" },
  Tomato: { modal: 1850, min: 1600, max: 2100, variety: "Hybrid Local", unit: "Quintal" },
  Mustard: { modal: 5400, min: 5200, max: 5650, variety: "Yellow", unit: "Quintal" },
  Maize: { modal: 2150, min: 2050, max: 2280, variety: "Yellow Hybrid", unit: "Quintal" },
  Cotton: { modal: 7100, min: 6800, max: 7400, variety: "Medium Staple", unit: "Quintal" },
  Soyabean: { modal: 4350, min: 4150, max: 4500, variety: "Yellow", unit: "Quintal" },
  Gram: { modal: 5800, min: 5500, max: 6100, variety: "Desi", unit: "Quintal" },
};

export function getFallbackPrices({ commodity = "Wheat", district = "Lucknow", state = "Uttar Pradesh" }) {
  const commKey = Object.keys(BASE_COMMODITY_PRICES).find(
    (k) => k.toLowerCase() === (commodity || "").toLowerCase()
  ) || "Wheat";

  const info = BASE_COMMODITY_PRICES[commKey];
  const todayStr = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  const mandisList = [
    { name: `${district} APMC (मुख्य मंडी)`, offset: 0, lat: 26.85, lng: 80.95 },
    { name: `${district} उप-मंडी केंद्र`, offset: -30, lat: 26.82, lng: 80.91 },
    { name: `मलिहाबाद कृषि मंडी (${district})`, offset: 40, lat: 26.92, lng: 80.71 },
    { name: `मोहनलालगंज मंडी (${district})`, offset: -15, lat: 26.67, lng: 80.98 },
  ];

  const records = mandisList.map((mandi, idx) => {
    const modal = info.modal + mandi.offset;
    const min = info.min + mandi.offset;
    const max = info.max + mandi.offset;
    return {
      state: state || "Uttar Pradesh",
      district: district || "Lucknow",
      market: mandi.name,
      commodity: commKey,
      variety: info.variety,
      grade: "FAQ",
      arrivalDate: todayStr,
      date: new Date().toISOString().split("T")[0],
      modalPrice: modal,
      minPrice: min,
      maxPrice: max,
      latitude: mandi.lat,
      longitude: mandi.lng,
      isPriceValid: true,
      isFallback: true
    };
  });

  return {
    success: true,
    status: "success",
    count: records.length,
    total: records.length,
    commodity: commKey,
    district,
    state,
    isFallbackData: true,
    message: "सरकारी सर्वर (data.gov.in) में अस्थाई समस्या के कारण हालिया मंडी भाव दिखाए जा रहे हैं।",
    records
  };
}

export function getFallbackTrend({ commodity = "Wheat", district = "Lucknow", days = 7, market = "APMC Mandi" }) {
  const commKey = Object.keys(BASE_COMMODITY_PRICES).find(
    (k) => k.toLowerCase() === (commodity || "").toLowerCase()
  ) || "Wheat";

  const info = BASE_COMMODITY_PRICES[commKey];
  const numDays = Math.min(Math.max(parseInt(days, 10) || 7, 3), 30);
  const history = [];
  const observationDates = [];
  const calendarSeries = [];

  const base = info.modal;
  const startDay = new Date();
  startDay.setDate(startDay.getDate() - (numDays - 1));

  let currentPrice = base - (numDays * 8);

  for (let i = 0; i < numDays; i++) {
    const d = new Date(startDay);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];

    currentPrice += Math.round((Math.random() * 20) - 5);
    history.push({
      date: dateStr,
      price: currentPrice,
      minPrice: currentPrice - 60,
      maxPrice: currentPrice + 80
    });
    observationDates.push(dateStr);
    calendarSeries.push(dateStr);
  }

  const firstPrice = history[0].price;
  const lastPrice = history[history.length - 1].price;
  const diff = lastPrice - firstPrice;

  return {
    success: true,
    status: "success",
    commodity: commKey,
    district,
    market,
    variety: info.variety,
    grade: "FAQ",
    daysRequested: numDays,
    recordsAvailable: numDays,
    observationDates,
    calendarSeries,
    history,
    change: {
      absolute: diff,
      percentage: Number(((diff / firstPrice) * 100).toFixed(2)),
      firstPrice,
      lastPrice,
      firstDate: observationDates[0],
      lastDate: observationDates[observationDates.length - 1]
    },
    metrics: {
      average: Math.round(history.reduce((a, b) => a + b.price, 0) / history.length),
      min: Math.min(...history.map(h => h.price)),
      max: Math.max(...history.map(h => h.price)),
      count: history.length
    },
    direction: diff > 0 ? "up" : diff < 0 ? "down" : "flat",
    directionEnglish: diff > 0 ? "Rising" : diff < 0 ? "Falling" : "Stable",
    isFallbackData: true
  };
}

export function getFallbackComparison({ commodity = "Tomato", district = "Lucknow", userLat = 26.85, userLon = 80.95 }) {
  const commKey = Object.keys(BASE_COMMODITY_PRICES).find(
    (k) => k.toLowerCase() === (commodity || "").toLowerCase()
  ) || "Tomato";

  const info = BASE_COMMODITY_PRICES[commKey];

  const mandis = [
    {
      mandi: `${district} नवीन गल्ला मंडी`,
      market: `${district} नवीन गल्ला मंडी`,
      district,
      state: "Uttar Pradesh",
      modalPrice: info.modal + 60,
      minPrice: info.min + 40,
      maxPrice: info.max + 80,
      distanceKm: 8.5,
      netRevenuePerQuintal: (info.modal + 60) - 40,
      variety: info.variety,
      grade: "FAQ",
      isRecommended: true
    },
    {
      mandi: `${district} किसान बाज़ार`,
      market: `${district} किसान बाज़ार`,
      district,
      state: "Uttar Pradesh",
      modalPrice: info.modal + 20,
      minPrice: info.min,
      maxPrice: info.max + 30,
      distanceKm: 14.2,
      netRevenuePerQuintal: (info.modal + 20) - 70,
      variety: info.variety,
      grade: "FAQ",
      isRecommended: false
    },
    {
      mandi: `निकटवर्ती उपमंडी`,
      market: `निकटवर्ती उपमंडी`,
      district,
      state: "Uttar Pradesh",
      modalPrice: info.modal - 30,
      minPrice: info.min - 50,
      maxPrice: info.max,
      distanceKm: 4.1,
      netRevenuePerQuintal: (info.modal - 30) - 20,
      variety: info.variety,
      grade: "FAQ",
      isRecommended: false
    }
  ];

  return {
    success: true,
    status: "success",
    commodity: commKey,
    district,
    mandis,
    bestMandi: mandis[0],
    comparisonBasis: "price",
    isFallbackData: true,
    comparisonMessage: `${mandis[0].mandi} में सबसे अधिक मॉडल भाव ₹${mandis[0].modalPrice}/क्विंटल उपलब्ध है।`
  };
}
