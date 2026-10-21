const priceService = require('./priceService');
const { isConfigured } = require('../config/dataGovApi');

/**
 * Adapter preserving compatibility with Part 3, 4, 5 endpoints
 */
async function getTodayPrices(params = {}) {
  return priceService.getTodayPrices(params);
}

async function getPriceTrend(params = {}) {
  return priceService.getPriceTrend(params);
}

async function compareMandis(params = {}) {
  return priceService.compareMandis(params);
}

function isDataGovConfigured() {
  return isConfigured();
}

module.exports = {
  getTodayPrices,
  getPriceTrend,
  compareMandis,
  isDataGovConfigured
};
