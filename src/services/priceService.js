const { isConfigured, buildDataGovUrl } = require('../config/dataGovApi');
const { normalizeRecord } = require('../utils/normalizeData');
const { calculateTrend, validateTrendParams } = require('./trendService');
const { calculateHaversineDistance, isValidCoordinates } = require('../utils/geoUtils');

/**
 * Verifies that a normalized record matches requested filter values case-insensitively.
 * 
 * @param {object} record Normalized record
 * @param {object} filters Requested filters
 * @returns {boolean}
 */
function recordMatchesFilters(record, filters) {
  if (filters.commodity && typeof filters.commodity === 'string' && filters.commodity.trim()) {
    const target = filters.commodity.trim().toLowerCase();
    const actual = (record.commodity || '').toLowerCase();
    const matches = actual === target || actual.startsWith(target + '(') || actual.startsWith(target + ' ');
    if (!matches) return false;
  }

  if (filters.district && typeof filters.district === 'string' && filters.district.trim()) {
    const target = filters.district.trim().toLowerCase();
    const actual = (record.district || '').toLowerCase();
    if (actual !== target) return false;
  }

  if (filters.state && typeof filters.state === 'string' && filters.state.trim()) {
    const target = filters.state.trim().toLowerCase();
    const actual = (record.state || '').toLowerCase();
    if (actual !== target) return false;
  }

  return true;
}

/**
 * Executes a filtered query against data.gov.in.
 * 
 * @param {object} filters { commodity, district, state, limit, offset }
 * @returns {Promise<object>}
 */
async function fetchMandiPrices(filters = {}) {
  if (!isConfigured()) {
    return {
      success: false,
      status: 'unconfigured',
      error: 'DATA_GOV_API_KEY is not configured or contains placeholder in .env.'
    };
  }

  const requestUrl = buildDataGovUrl({
    commodity: filters.commodity,
    district: filters.district,
    state: filters.state,
    limit: filters.limit || 100,
    offset: filters.offset || 0
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(requestUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      return {
        success: false,
        status: 'api_error',
        statusCode: response.status,
        error: `Upstream data.gov.in API returned HTTP ${response.status}: ${response.statusText}`
      };
    }

    const data = await response.json();
    const rawRecords = Array.isArray(data.records) ? data.records : [];
    const totalCount = typeof data.total === 'number' ? data.total : rawRecords.length;

    if (totalCount === 0 || rawRecords.length === 0) {
      return {
        success: true,
        status: 'no_data',
        count: 0,
        total: 0,
        commodity: filters.commodity || null,
        district: filters.district || null,
        state: filters.state || null,
        records: [],
        message: 'No mandi price records found matching the requested filters.'
      };
    }

    const normalized = rawRecords
      .map(normalizeRecord)
      .filter(Boolean)
      .filter((rec) => recordMatchesFilters(rec, filters));

    if (normalized.length === 0) {
      return {
        success: true,
        status: 'no_data',
        count: 0,
        total: totalCount,
        commodity: filters.commodity || null,
        district: filters.district || null,
        state: filters.state || null,
        records: [],
        message: 'No mandi price records found matching the requested filters after verification.'
      };
    }

    return {
      success: true,
      status: 'success',
      count: normalized.length,
      total: totalCount,
      commodity: filters.commodity || null,
      district: filters.district || null,
      state: filters.state || null,
      records: normalized
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      return {
        success: false,
        status: 'api_error',
        error: 'Upstream data.gov.in API request timed out (20s limit).'
      };
    }
    return {
      success: false,
      status: 'api_error',
      error: `Failed to connect to data.gov.in: ${err.message}`
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Service function for GET /api/prices/today
 */
async function getTodayPrices(params = {}) {
  return fetchMandiPrices(params);
}

/**
 * Service function for GET /api/prices/trend
 * Distinguishes:
 *   - no_data: Successful source lookup with no matching records.
 *   - price_unavailable: Matching records exist but modal price is unavailable or invalid.
 *   - insufficient_data: Too few valid observations (< 2) for a trend.
 *   - source_unavailable: External data source failed.
 */
async function getPriceTrend(params = {}) {
  const validation = validateTrendParams(params);
  if (!validation.isValid) {
    return {
      success: false,
      status: 'invalid_params',
      error: validation.error
    };
  }

  const { commodity, district, days } = validation;
  const { market, variety, grade, state } = params;

  // Retrieve raw records from data.gov.in
  const fetchResult = await fetchMandiPrices({
    commodity,
    district,
    state,
    limit: 100
  });

  // Source unavailable (API key missing, upstream network failure, timeout)
  if (!fetchResult.success) {
    return {
      success: false,
      status: 'source_unavailable',
      message: 'External price data source is unavailable.',
      error: fetchResult.error,
      recordsAvailable: 0,
      commodity,
      district,
      history: [],
      calendarSeries: [],
      change: null,
      direction: 'unknown'
    };
  }

  // Calculate trend using strict series isolation & validation
  const trendResult = calculateTrend(fetchResult.records, {
    commodity,
    district,
    days,
    market,
    variety,
    grade
  });

  return {
    success: true,
    ...trendResult
  };
}

/**
 * Service function for GET /api/mandis/compare
 */
async function compareMandis(params = {}) {
  const { commodity, district, state, lat, lng } = params;

  if (!commodity || !commodity.trim()) {
    return {
      success: false,
      status: 'invalid_params',
      error: 'Query parameter "commodity" is required for mandi comparison.'
    };
  }

  const result = await fetchMandiPrices({
    commodity: commodity.trim(),
    district: district ? district.trim() : undefined,
    state: state ? state.trim() : undefined,
    limit: 100
  });

  if (!result.success) {
    return result;
  }

  if (result.status === 'no_data' || result.records.length === 0) {
    return {
      success: true,
      status: 'no_data',
      commodity,
      mandis: [],
      message: `No price records found for commodity "${commodity}".`
    };
  }

  const hasUserCoords = isValidCoordinates(lat, lng);

  const compared = result.records
    .filter((r) => r.modalPrice !== null && r.isPriceValid !== false)
    .map((record) => {
      let distanceKm = null;
      let distanceAvailable = false;

      if (hasUserCoords && isValidCoordinates(record.latitude, record.longitude)) {
        distanceKm = calculateHaversineDistance(
          lat,
          lng,
          record.latitude,
          record.longitude
        );
        distanceAvailable = distanceKm !== null;
      }

      return {
        market: record.market,
        district: record.district,
        state: record.state,
        modalPrice: record.modalPrice,
        minPrice: record.minPrice,
        maxPrice: record.maxPrice,
        arrivalDate: record.date || record.arrivalDate,
        distanceKm,
        distanceAvailable
      };
    });

  const sorted = [...compared].sort((a, b) => b.modalPrice - a.modalPrice);
  const bestMandi = sorted[0];
  const lowestMandi = sorted[sorted.length - 1];
  const priceDifference = bestMandi ? bestMandi.modalPrice - lowestMandi.modalPrice : 0;

  return {
    success: true,
    status: 'success',
    commodity,
    userCoordinatesProvided: hasUserCoords,
    totalMandis: sorted.length,
    bestMandi: bestMandi
      ? {
          market: bestMandi.market,
          district: bestMandi.district,
          modalPrice: bestMandi.modalPrice
        }
      : null,
    priceSpread: bestMandi
      ? {
          maxPrice: bestMandi.modalPrice,
          minPrice: lowestMandi.modalPrice,
          difference: Math.round(priceDifference * 100) / 100
        }
      : null,
    mandis: sorted
  };
}

module.exports = {
  normalizeRecord,
  recordMatchesFilters,
  fetchMandiPrices,
  getTodayPrices,
  getPriceTrend,
  compareMandis
};
