const { fetchMandiPrices } = require('./priceService');
const { calculateDistance, isValidCoordinates } = require('../utils/distance');

/**
 * Validates mandi comparison query parameters.
 * 
 * @param {object} params
 * @returns {{ isValid: boolean, code?: string, error?: string, commodity: string, district?: string, state?: string, farmerCoords?: { lat: number, lon: number }|null, sortBy: string }}
 */
function validateCompareParams(params = {}) {
  const { commodity, district, state, latitude, longitude, lat, lng, sortBy } = params;

  if (!commodity || typeof commodity !== 'string' || !commodity.trim()) {
    return {
      isValid: false,
      code: 'MISSING_REQUIRED_PARAMETER',
      error: 'Query parameter "commodity" is required for mandi comparison.'
    };
  }

  // Check optional coordinates (accept latitude/longitude or lat/lng)
  const inputLat = latitude !== undefined ? latitude : lat;
  const inputLon = longitude !== undefined ? longitude : lng;

  let farmerCoords = null;
  if (inputLat !== undefined || inputLon !== undefined) {
    if (!isValidCoordinates(inputLat, inputLon)) {
      return {
        isValid: false,
        code: 'INVALID_COORDINATES',
        error: 'Provided coordinates (lat, lng) are invalid. Latitude must be between -90 and 90, Longitude between -180 and 180.'
      };
    }
    farmerCoords = {
      lat: Number(inputLat),
      lon: Number(inputLon)
    };
  }

  const requestedSortBy = (sortBy || 'price').toLowerCase().trim();
  const validSortBy = requestedSortBy === 'distance' ? 'distance' : 'price';

  return {
    isValid: true,
    commodity: commodity.trim(),
    district: district && typeof district === 'string' && district.trim() ? district.trim() : null,
    state: state && typeof state === 'string' && state.trim() ? state.trim() : null,
    farmerCoords,
    sortBy: validSortBy,
    requestedSortBy
  };
}

/**
 * Deterministically selects the comparison basis (variety and grade).
 * 
 * Deterministic Selection Rule:
 * 1. If both variety and grade are provided by user, use them.
 * 2. Group all records by normalized (variety, grade) pairs.
 * 3. Count records with valid modal prices for each (variety, grade) pair.
 * 4. Select the pair with the most valid reported records.
 * 5. If counts tie, break tie deterministically:
 *    a) Prefer 'FAQ' grade (Fair Average Quality standard in Indian mandis),
 *    b) Then alphabetical order by variety ascending, then grade ascending.
 * 
 * @param {Array<object>} records 
 * @param {string|null} requestedVariety 
 * @param {string|null} requestedGrade 
 * @returns {{ variety: string, grade: string, isAutoSelected: boolean, selectionRule: string }}
 */
function determineComparisonBasis(records, requestedVariety, requestedGrade) {
  if (requestedVariety && requestedGrade) {
    return {
      variety: requestedVariety.trim(),
      grade: requestedGrade.trim(),
      isAutoSelected: false,
      selectionRule: 'User specified both variety and grade in query parameters.'
    };
  }

  const groupMap = new Map();

  for (const r of records) {
    const v = (r.variety || 'Standard').trim();
    const g = (r.grade || 'FAQ').trim();
    const key = `${v.toLowerCase()}::${g.toLowerCase()}`;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        variety: v,
        grade: g,
        totalCount: 0,
        validPriceCount: 0
      });
    }

    const group = groupMap.get(key);
    group.totalCount++;
    if (r.modalPrice !== null && !isNaN(r.modalPrice) && r.modalPrice > 0 && r.isPriceValid !== false) {
      group.validPriceCount++;
    }
  }

  if (groupMap.size === 0) {
    return {
      variety: requestedVariety ? requestedVariety.trim() : 'Standard',
      grade: requestedGrade ? requestedGrade.trim() : 'FAQ',
      isAutoSelected: true,
      selectionRule: 'Default fallback (no records available).'
    };
  }

  let candidateGroups = Array.from(groupMap.values());
  if (requestedVariety) {
    const targetV = requestedVariety.trim().toLowerCase();
    const filtered = candidateGroups.filter((grp) => grp.variety.toLowerCase() === targetV);
    if (filtered.length > 0) candidateGroups = filtered;
  }
  if (requestedGrade) {
    const targetG = requestedGrade.trim().toLowerCase();
    const filtered = candidateGroups.filter((grp) => grp.grade.toLowerCase() === targetG);
    if (filtered.length > 0) candidateGroups = filtered;
  }

  // Sort candidate groups deterministically:
  // 1. Highest validPriceCount descending
  // 2. Highest totalCount descending
  // 3. Prefer 'FAQ' grade
  // 4. Alphabetical variety ascending
  // 5. Alphabetical grade ascending
  candidateGroups.sort((a, b) => {
    if (b.validPriceCount !== a.validPriceCount) {
      return b.validPriceCount - a.validPriceCount;
    }
    if (b.totalCount !== a.totalCount) {
      return b.totalCount - a.totalCount;
    }

    const aIsFaq = a.grade.toLowerCase() === 'faq';
    const bIsFaq = b.grade.toLowerCase() === 'faq';
    if (aIsFaq && !bIsFaq) return -1;
    if (!aIsFaq && bIsFaq) return 1;

    const vCmp = a.variety.localeCompare(b.variety);
    if (vCmp !== 0) return vCmp;
    return a.grade.localeCompare(b.grade);
  });

  const bestGroup = candidateGroups[0];
  return {
    variety: bestGroup.variety,
    grade: bestGroup.grade,
    isAutoSelected: true,
    selectionRule: 'Automatically selected the (variety, grade) pair with the most valid reported records. Ties broken by FAQ priority and alphabetical order.'
  };
}

/**
 * Compares mandi prices for a commodity, strictly comparing like with like.
 * 
 * Strict Consistency Guarantees:
 * 1. Every returned mandi in `mandis` strictly matches the comparisonBasis for variety and grade.
 * 2. Different varieties or grades are never mixed in the same comparison group.
 * 3. Unpriced records for the matching basis are placed in `unpricedMandis`.
 * 4. bestMandi and priceSpread are calculated solely from eligible records in `mandis`.
 * 5. Ties for highest price are represented accurately with explicit tie-breaking rules.
 * 
 * @param {object} params Query parameters
 * @returns {Promise<object>}
 */
async function compareMandis(params = {}) {
  const validation = validateCompareParams(params);
  if (!validation.isValid) {
    return {
      success: false,
      status: 'invalid_params',
      code: validation.code,
      error: validation.error
    };
  }

  const { commodity, district, state, farmerCoords, sortBy, requestedSortBy } = validation;
  const { variety, grade } = params;

  // Retrieve raw records from data.gov.in
  const fetchResult = await fetchMandiPrices({
    commodity,
    district,
    state,
    limit: 100
  });

  if (!fetchResult.success) {
    return {
      success: false,
      status: 'source_unavailable',
      message: 'External price data source is unavailable.',
      error: fetchResult.error,
      mandis: []
    };
  }

  if (fetchResult.status === 'no_data' || fetchResult.records.length === 0) {
    return {
      success: true,
      status: 'no_data',
      commodity,
      district: district || 'All',
      message: `No price records found for commodity "${commodity}".`,
      totalMandisCompared: 0,
      mandis: [],
      unpricedMandis: []
    };
  }

  const allRecords = fetchResult.records;

  // 1. Determine comparison basis deterministically
  const basis = determineComparisonBasis(allRecords, variety, grade);
  const targetVarietyLower = basis.variety.trim().toLowerCase();
  const targetGradeLower = basis.grade.trim().toLowerCase();

  // 2. Filter records strictly matching BOTH variety AND grade
  // Requirement 2 & 4: Ensure every returned mandi matches the comparison basis; do not mix grades/varieties!
  const strictlyMatchingRecords = allRecords.filter((r) => {
    const v = (r.variety || 'Standard').trim().toLowerCase();
    const g = (r.grade || 'FAQ').trim().toLowerCase();
    return v === targetVarietyLower && g === targetGradeLower;
  });

  // Separate records with valid modal prices from missing/invalid price records
  const pricedMandis = [];
  const unpricedMandis = [];

  for (const record of strictlyMatchingRecords) {
    let distanceKm = null;
    let distanceAvailable = false;

    if (farmerCoords && isValidCoordinates(record.latitude, record.longitude)) {
      distanceKm = calculateDistance(
        farmerCoords.lat,
        farmerCoords.lon,
        record.latitude,
        record.longitude
      );
      distanceAvailable = distanceKm !== null;
    }

    const item = {
      market: record.market,
      district: record.district,
      state: record.state,
      commodity: record.commodity,
      variety: basis.variety, // Preserves exact basis label
      grade: basis.grade,     // Preserves exact basis label
      arrivalDate: record.date || record.arrivalDate,
      minPrice: record.minPrice,
      maxPrice: record.maxPrice,
      modalPrice: record.modalPrice,
      distanceKm,
      distanceAvailable
    };

    if (
      record.modalPrice !== null &&
      record.isPriceValid !== false &&
      !isNaN(record.modalPrice) &&
      record.modalPrice > 0
    ) {
      pricedMandis.push(item);
    } else {
      unpricedMandis.push({
        ...item,
        priceAvailable: false,
        note: 'Modal price unavailable for this reporting date.'
      });
    }
  }

  // Distance sorting feasibility check
  const hasDistances = pricedMandis.some((m) => m.distanceAvailable);
  let appliedSortBy = 'price';

  if (requestedSortBy === 'distance' && farmerCoords && hasDistances) {
    appliedSortBy = 'distance';
    pricedMandis.sort((a, b) => {
      if (a.distanceKm === null && b.distanceKm === null) return b.modalPrice - a.modalPrice;
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      return b.modalPrice - a.modalPrice;
    });
  } else {
    appliedSortBy = 'price';
    // Sort by modalPrice descending. Ties broken by distance (if known) then market name alphabetically
    pricedMandis.sort((a, b) => {
      if (b.modalPrice !== a.modalPrice) {
        return b.modalPrice - a.modalPrice;
      }
      if (a.distanceKm !== null && b.distanceKm !== null && a.distanceKm !== b.distanceKm) {
        return a.distanceKm - b.distanceKm;
      }
      return a.market.localeCompare(b.market);
    });
  }

  // Requirement 7 & 8: Calculate bestMandi, ties, and priceSpread from exactly the eligible records in `mandis`
  let bestMandi = null;
  let tiedBestMandis = [];
  let isTieForBestPrice = false;
  let priceSpread = null;

  if (pricedMandis.length > 0) {
    const highestPrice = Math.max(...pricedMandis.map((m) => m.modalPrice));
    const lowestPrice = Math.min(...pricedMandis.map((m) => m.modalPrice));

    tiedBestMandis = pricedMandis.filter((m) => m.modalPrice === highestPrice);
    isTieForBestPrice = tiedBestMandis.length > 1;

    // Pick top sorted item as primary bestMandi
    const topMandi = pricedMandis[0];
    bestMandi = {
      market: topMandi.market,
      district: topMandi.district,
      modalPrice: topMandi.modalPrice,
      arrivalDate: topMandi.arrivalDate,
      distanceKm: topMandi.distanceKm
    };

    if (pricedMandis.length >= 2) {
      priceSpread = {
        highestPrice,
        lowestPrice,
        difference: Math.round((highestPrice - lowestPrice) * 100) / 100
      };
    }
  }

  // Requirement 5: Indicate insufficient comparable markets if < 2 mandis match the basis
  const hasComparableMarkets = pricedMandis.length >= 2;
  const comparisonMessage = !hasComparableMarkets
    ? pricedMandis.length === 1
      ? `Only 1 mandi found matching variety "${basis.variety}" and grade "${basis.grade}". Insufficient comparable markets in this query for cross-market comparison.`
      : `No mandis with valid modal prices found matching variety "${basis.variety}" and grade "${basis.grade}".`
    : `Compared ${pricedMandis.length} mandis with matching variety "${basis.variety}" and grade "${basis.grade}".`;

  return {
    success: true,
    status: 'success',
    commodity,
    district: district || 'All',
    state: state || null,
    comparisonBasis: {
      variety: basis.variety,
      grade: basis.grade,
      selectionRule: basis.selectionRule,
      note: 'Comparing like with like. Different varieties and grades are never mixed.'
    },
    sortBy: appliedSortBy,
    farmerLocationProvided: Boolean(farmerCoords),
    distancesAvailable: hasDistances,
    totalMandisCompared: pricedMandis.length,
    insufficientComparableMarkets: !hasComparableMarkets,
    comparisonMessage,
    unpricedMandisCount: unpricedMandis.length,
    bestMandi,
    isTieForBestPrice,
    tiedBestMandis: isTieForBestPrice
      ? tiedBestMandis.map((m) => ({
          market: m.market,
          district: m.district,
          modalPrice: m.modalPrice,
          arrivalDate: m.arrivalDate,
          distanceKm: m.distanceKm
        }))
      : undefined,
    tieBreakingRule: isTieForBestPrice
      ? 'Multiple mandis share the highest price. Primary bestMandi is broken by nearest distance (if coordinates provided) or alphabetical market order.'
      : undefined,
    priceSpread,
    mandis: pricedMandis,
    unpricedMandis
  };
}

module.exports = {
  validateCompareParams,
  determineComparisonBasis,
  compareMandis
};
