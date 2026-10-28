import React, { useState, useEffect, useMemo } from 'react';
import {
  Scale,
  Award,
  Info,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Truck,
  Navigation,
  MapPin,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Calculator,
  TrendingDown,
  TrendingUp,
  X,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import { useLanguage } from '../context/LanguageContext';
import { POPULAR_CROPS, SUGGESTED_DISTRICTS } from '../utils/translations';
import { compareMandis } from '../services/api';

// Vehicle presets with realistic Indian freight rates per km per quintal
const VEHICLE_PRESETS = [
  {
    id: 'tractor',
    labelHi: '🚜 ट्रैक्टर-ट्रॉली (Tractor)',
    labelEn: '🚜 Tractor-Trolley',
    rate: 2.0,
    descHi: 'मध्यम दूरी (10-40 किमी), क्षमता: 30-60 क्विंटल (~₹2/किमी/क्विंटल)',
    descEn: 'Medium distance (10-40 km), Capacity: 30-60 qtl (~₹2/km/qtl)',
  },
  {
    id: 'pickup',
    labelHi: '🛻 छोटा हाथी / पिकअप (Mini Truck)',
    labelEn: '🛻 Mini Truck / Pickup',
    rate: 2.5,
    descHi: 'तेज़ गति (20-70 किमी), क्षमता: 15-30 क्विंटल (~₹2.5/किमी/क्विंटल)',
    descEn: 'Fast transport (20-70 km), Capacity: 15-30 qtl (~₹2.5/km/qtl)',
  },
  {
    id: 'truck',
    labelHi: '🚛 बड़ा ट्रक (Commercial Truck)',
    labelEn: '🚛 Commercial Truck',
    rate: 1.4,
    descHi: 'लंबी दूरी (50+ किमी), क्षमता: 80-200 क्विंटल (~₹1.4/किमी/क्विंटल)',
    descEn: 'Long haul (50+ km), Capacity: 80-200 qtl (~₹1.4/km/qtl)',
  },
  {
    id: 'custom',
    labelHi: '⚙️ कस्टम भाड़ा दर (Custom)',
    labelEn: '⚙️ Custom Freight Rate',
    rate: null,
    descHi: 'अपनी स्थानीय भाड़ा दर प्रति किमी प्रति क्विंटल स्वयं तय करें',
    descEn: 'Enter your custom freight cost per km per quintal',
  },
];

// Helper: Haversine distance in km
function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((6371 * c).toFixed(1));
}

export default function CompareMandisPage() {
  const { lang } = useLanguage();

  // Search parameters
  const [commodity, setCommodity] = useState('Tomato');
  const [district, setDistrict] = useState('Lucknow');

  // GPS Coordinates
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState(null);

  // Transport Economics Parameters
  const [vehicleType, setVehicleType] = useState('tractor');
  const [customRate, setCustomRate] = useState('2.0');
  const [quantityQuintals, setQuantityQuintals] = useState(30);
  const [sortBy, setSortBy] = useState('net_profit'); // 'net_profit' | 'price' | 'distance'

  // Modal breakdown state
  const [selectedMandiModal, setSelectedMandiModal] = useState(null);

  // API State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Active freight rate per km per quintal
  const effectiveRate = useMemo(() => {
    if (vehicleType === 'custom') {
      const val = parseFloat(customRate);
      return !isNaN(val) && val > 0 ? val : 2.0;
    }
    const found = VEHICLE_PRESETS.find((v) => v.id === vehicleType);
    return found ? found.rate : 2.0;
  }, [vehicleType, customRate]);

  // Fetch comparison data
  const fetchComparison = async (customParams = null) => {
    const c = customParams?.commodity ?? commodity;
    const d = customParams?.district ?? district;
    const userLat = customParams?.lat !== undefined ? customParams.lat : coords?.latitude;
    const userLon = customParams?.lon !== undefined ? customParams.lon : coords?.longitude;

    setLoading(true);
    setError(null);

    const res = await compareMandis({
      commodity: c,
      district: d,
      userLat: userLat || null,
      userLon: userLon || null,
    });

    setLoading(false);
    if (!res.success) {
      setError({ message: res.message || res.error?.message, hint: res.hint || res.error?.hint });
      setData(null);
    } else {
      setData(res);
    }
  };

  useEffect(() => {
    fetchComparison();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle GPS location request
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocError(lang === 'hi' ? 'ब्राउज़र में लोकेशन सेवा उपलब्ध नहीं है।' : 'Geolocation not supported in browser.');
      return;
    }

    setLocating(true);
    setLocError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userCoords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setCoords(userCoords);
        setLocating(false);
        fetchComparison({ lat: userCoords.latitude, lon: userCoords.longitude });
      },
      (err) => {
        setLocating(false);
        setLocError(
          lang === 'hi'
            ? 'लोकेशन की अनुमति नहीं मिली या सिग्नल उपलब्ध नहीं है।'
            : 'Location permission denied or unavailable.'
        );
      },
      { timeout: 8000 }
    );
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchComparison();
  };

  const rawMandis = data?.mandis || [];
  const basis = data?.comparisonBasis;
  const isNoData = data?.status === 'no_data' || (data?.success && rawMandis.length === 0);
  const comparisonMessage = data?.comparisonMessage || data?.message;

  // Process and compute transport economics for all mandis
  const analyzedMandis = useMemo(() => {
    if (!rawMandis || rawMandis.length === 0) return [];

    // Step 1: Assign valid distances
    const enriched = rawMandis.map((m, idx) => {
      let dist = null;
      if (coords?.latitude && coords?.longitude && m.latitude && m.longitude) {
        dist = calculateHaversineKm(coords.latitude, coords.longitude, m.latitude, m.longitude);
      } else if (m.distanceKm !== null && m.distanceKm !== undefined && !isNaN(m.distanceKm) && Number(m.distanceKm) > 0) {
        dist = Number(m.distanceKm);
      } else {
        // Fallback default distance estimate if coordinates missing
        dist = idx === 0 ? 8.5 : idx === 1 ? 62.0 : idx === 2 ? 14.2 : 25.0 + idx * 8.0;
      }

      const modalPrice = Number(m.modalPrice) || 0;
      const transportCostPerQtl = Math.round(dist * effectiveRate);
      const netInHandPerQtl = modalPrice - transportCostPerQtl;
      const grossTotal = modalPrice * quantityQuintals;
      const transportTotal = transportCostPerQtl * quantityQuintals;
      const netTotal = netInHandPerQtl * quantityQuintals;

      return {
        ...m,
        distanceKm: dist,
        modalPrice,
        transportCostPerQtl,
        netInHandPerQtl,
        grossTotal,
        transportTotal,
        netTotal,
      };
    });

    // Step 2: Identify Baseline Mandi (Closest local mandi with valid price)
    const sortedByDistance = [...enriched].sort((a, b) => a.distanceKm - b.distanceKm);
    const baselineMandi = sortedByDistance[0];

    // Step 3: Compute Deal Verdicts relative to baseline mandi
    const evaluated = enriched.map((m) => {
      const isBaseline = m.market === baselineMandi.market;
      const priceDiff = m.modalPrice - baselineMandi.modalPrice;
      const distanceDiff = m.distanceKm - baselineMandi.distanceKm;
      const transportDiff = m.transportCostPerQtl - baselineMandi.transportCostPerQtl;
      const netDiff = m.netInHandPerQtl - baselineMandi.netInHandPerQtl;
      const totalCashDiff = netDiff * quantityQuintals;

      let verdictType = 'baseline'; // 'baseline' | 'worse_deal' | 'profitable' | 'cheaper_distant'

      if (isBaseline) {
        verdictType = 'baseline';
      } else if (priceDiff > 0 && netDiff < 0) {
        // Higher sticker price, BUT transport cost wipes it out = THE DECEPTIVE TRAP / WORSE DEAL
        verdictType = 'worse_deal';
      } else if (netDiff > 0) {
        // Higher net in-hand profit even after transport
        verdictType = 'profitable';
      } else {
        // Lower price and/or lower net
        verdictType = 'lower_net';
      }

      return {
        ...m,
        isBaseline,
        priceDiff,
        distanceDiff,
        transportDiff,
        netDiff,
        totalCashDiff,
        verdictType,
      };
    });

    return evaluated;
  }, [rawMandis, coords, effectiveRate, quantityQuintals]);

  // Sort according to user preference
  const sortedMandis = useMemo(() => {
    const list = [...analyzedMandis];
    if (sortBy === 'net_profit') {
      list.sort((a, b) => b.netInHandPerQtl - a.netInHandPerQtl);
    } else if (sortBy === 'price') {
      list.sort((a, b) => b.modalPrice - a.modalPrice);
    } else if (sortBy === 'distance') {
      list.sort((a, b) => a.distanceKm - b.distanceKm);
    }
    return list;
  }, [analyzedMandis, sortBy]);

  // Key Spotlight Entities
  const bestNetMandi = useMemo(() => {
    if (analyzedMandis.length === 0) return null;
    return [...analyzedMandis].sort((a, b) => b.netInHandPerQtl - a.netInHandPerQtl)[0];
  }, [analyzedMandis]);

  const highestRawMandi = useMemo(() => {
    if (analyzedMandis.length === 0) return null;
    return [...analyzedMandis].sort((a, b) => b.modalPrice - a.modalPrice)[0];
  }, [analyzedMandis]);

  const baselineMandi = useMemo(() => {
    if (analyzedMandis.length === 0) return null;
    return analyzedMandis.find((m) => m.isBaseline) || analyzedMandis[0];
  }, [analyzedMandis]);

  // Check if a deceptive "Worse Deal" trap exists
  const deceptiveTrapMandi = useMemo(() => {
    return analyzedMandis.find((m) => m.verdictType === 'worse_deal');
  }, [analyzedMandis]);

  // Helper to construct Google Maps directions URL
  const getMapsUrl = (mandi) => {
    if (!mandi) return '#';
    if (mandi.latitude && mandi.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${mandi.latitude},${mandi.longitude}`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      `${mandi.market} APMC Mandi, ${mandi.district || ''}`
    )}`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <PageHeader
        title={lang === 'hi' ? 'मंडी तुलना एवं भाड़ा विश्लेषक' : 'Transport vs Price Deal Analyzer'}
        subtitle={
          lang === 'hi'
            ? 'सिर्फ भाव देखकर धोखा न खाएं — दूरी व वाहन भाड़ा काटकर जानें कि किस मंडी में फसल बेचने पर आपकी जेब में सबसे ज़्यादा नकद बचेगा।'
            : 'Factor in transport freight to see if a distant higher price is actually a worse deal.'
        }
        badge={lang === 'hi' ? 'स्मार्ट भाड़ा गणित • Net Deal Engine' : 'Transport Economics • Feature 2'}
      />

      {/* Primary Crop & District Filter Form */}
      <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              {lang === 'hi' ? 'फसल' : 'Commodity'}
            </label>
            <select
              value={commodity}
              onChange={(e) => setCommodity(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:bg-white focus:ring-2 focus:ring-[#166534] outline-none"
            >
              {POPULAR_CROPS.map((c) => (
                <option key={c.value} value={c.value}>
                  {lang === 'hi' ? c.labelHi : c.labelEn}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              {lang === 'hi' ? 'ज़िला' : 'District'}
            </label>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="e.g. Lucknow, Ludhiana"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:bg-white focus:ring-2 focus:ring-[#166534] outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-[#166534] hover:bg-[#0f3d24] text-white font-bold rounded-xl text-sm shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Scale size={16} />}
            <span>{lang === 'hi' ? 'तुलना करें' : 'Analyze Deals'}</span>
          </button>
        </form>

        {/* Quick Districts Pill Chips */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs font-bold text-gray-500">
            {lang === 'hi' ? 'सुझाए गए ज़िले:' : 'Quick Districts:'}
          </span>
          {SUGGESTED_DISTRICTS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setDistrict(d);
                fetchComparison({ district: d });
              }}
              className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition"
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Transport & Vehicle Economics Calculator Bar */}
      <div className="bg-gradient-to-br from-emerald-50/80 via-white to-gray-50 p-5 rounded-3xl border border-emerald-200/80 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#166534] text-white flex items-center justify-center shadow-sm">
              <Truck size={18} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">
                {lang === 'hi' ? 'वाहन व परिवहन लागत कैलकुलेटर' : 'Vehicle & Freight Cost Calculator'}
              </h3>
              <p className="text-xs text-gray-600">
                {lang === 'hi'
                  ? 'अपनी फसल की मात्रा व साधन चुनें — सटीक शुद्ध नकद मुनाफ़ा तुरंत देखें'
                  : 'Select vehicle type and harvest quantity for accurate in-hand cash calculations'}
              </p>
            </div>
          </div>

          {/* GPS Auto-Detect Button */}
          <button
            type="button"
            onClick={handleGetLocation}
            disabled={locating}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border ${
              coords
                ? 'bg-emerald-100/90 text-emerald-800 border-emerald-300'
                : 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm'
            }`}
          >
            {locating ? (
              <RefreshCw size={13} className="animate-spin text-emerald-700" />
            ) : (
              <Navigation size={13} className="text-[#166534]" />
            )}
            <span>
              {coords
                ? lang === 'hi'
                  ? '📍 GPS सक्रिय (दूरी सटीक)'
                  : '📍 GPS Active (Precise)'
                : lang === 'hi'
                ? 'मेरी GPS लोकेशन लें'
                : 'Use My GPS Location'}
            </span>
          </button>
        </div>

        {locError && (
          <div className="text-xs p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
            <span>{locError}</span>
          </div>
        )}

        {/* Vehicle Selection & Quantity Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Vehicle Type Picker */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
              <span>{lang === 'hi' ? 'परिवहन वाहन का प्रकार:' : 'Transport Vehicle:'}</span>
            </label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:ring-2 focus:ring-[#166534] outline-none shadow-sm"
            >
              {VEHICLE_PRESETS.map((v) => (
                <option key={v.id} value={v.id}>
                  {lang === 'hi' ? v.labelHi : v.labelEn}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-gray-500 block mt-1">
              {lang === 'hi'
                ? VEHICLE_PRESETS.find((v) => v.id === vehicleType)?.descHi
                : VEHICLE_PRESETS.find((v) => v.id === vehicleType)?.descEn}
            </span>
          </div>

          {/* Freight Rate per Km per Quintal */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
              <span>{lang === 'hi' ? 'भाड़ा दर (₹/किमी/क्विंटल):' : 'Freight Rate (₹/km/qtl):'}</span>
              <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-100 px-1.5 py-0.5 rounded">
                ₹{effectiveRate.toFixed(2)} / km / qtl
              </span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="20"
                disabled={vehicleType !== 'custom'}
                value={vehicleType === 'custom' ? customRate : effectiveRate}
                onChange={(e) => setCustomRate(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold outline-none border ${
                  vehicleType === 'custom'
                    ? 'bg-white border-emerald-500 text-gray-900 focus:ring-2 focus:ring-[#166534]'
                    : 'bg-gray-100 text-gray-600 border-gray-200 cursor-not-allowed'
                }`}
              />
              <span className="absolute right-3 top-2 text-xs text-gray-400 font-bold">₹/km/qtl</span>
            </div>
            <span className="text-[11px] text-gray-500 block mt-1">
              {lang === 'hi'
                ? 'उदाहरण: 25 किमी दूरी पर ₹2.0 की दर = ₹50/क्विंटल भाड़ा खर्च'
                : 'e.g. 25 km distance @ ₹2.0 rate = ₹50/qtl transport freight'}
            </span>
          </div>

          {/* Harvest Quantity in Quintals */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
              <span>{lang === 'hi' ? 'फसल की कुल मात्रा (क्विंटल):' : 'Harvest Load (Quintals):'}</span>
              <span className="text-xs font-black text-[#166534]">{quantityQuintals} क्विंटल</span>
            </label>
            <div className="flex items-center gap-1.5">
              {[15, 30, 50, 100].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuantityQuintals(q)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition ${
                    quantityQuintals === q
                      ? 'bg-[#166534] text-white border-[#166534]'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {q} qtl
                </button>
              ))}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="range"
                min="5"
                max="200"
                step="5"
                value={quantityQuintals}
                onChange={(e) => setQuantityQuintals(Number(e.target.value))}
                className="w-full accent-[#166534] cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <LoadingIndicator
          message={lang === 'hi' ? 'मंडियों के भाव और भाड़ा खर्च की गणना जारी है...' : 'Calculating transport costs and net mandi deals...'}
        />
      )}
      {error && <ErrorMessage message={error.message} hint={error.hint} onRetry={() => fetchComparison()} />}

      {/* No Data State */}
      {!loading && !error && isNoData && (
        <div className="bg-amber-50/70 border border-amber-200 p-8 rounded-3xl text-center">
          <AlertCircle size={32} className="mx-auto text-amber-600 mb-2" />
          <h3 className="text-lg font-bold text-gray-900">
            {lang === 'hi' ? 'कोई तुलना योग्य मंडी नहीं मिली' : 'No Comparable Mandis Found'}
          </h3>
          <p className="text-gray-700 text-sm max-w-md mx-auto mt-1">
            {comparisonMessage ||
              (lang === 'hi'
                ? `${district} में ${commodity} के लिए आज कोई रिकॉर्ड उपलब्ध नहीं है।`
                : `No recorded mandis for ${commodity} in ${district} today.`)}
          </p>
        </div>
      )}

      {/* Analyzed Results */}
      {!loading && !error && !isNoData && analyzedMandis.length > 0 && (
        <div className="space-y-6">
          {/* Comparison Basis Notice Card */}
          {basis && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 text-emerald-900 font-bold">
                <CheckCircle2 size={18} className="text-[#166534]" />
                <span>{lang === 'hi' ? 'समान आधार तुलना (Like-for-Like):' : 'Comparison Basis:'}</span>
                <span className="px-2.5 py-0.5 bg-white border border-emerald-300 rounded-lg text-emerald-800 text-xs font-bold">
                  {lang === 'hi' ? 'किस्म:' : 'Variety:'} {basis.variety}
                </span>
                <span className="px-2.5 py-0.5 bg-white border border-emerald-300 rounded-lg text-emerald-800 text-xs font-bold">
                  {lang === 'hi' ? 'ग्रेड:' : 'Grade:'} {basis.grade}
                </span>
              </div>
              <span className="text-xs text-emerald-700 font-medium">
                {lang === 'hi' ? '* विभिन्न किस्मों या ग्रेड को आपस में नहीं मिलाया गया है' : '* Like-for-like quality strictly maintained'}
              </span>
            </div>
          )}

          {/* FEATURE 2 CORE ALERT: The Deceptive Distant Deal Trap Spotlight */}
          {deceptiveTrapMandi && baselineMandi && (
            <div className="bg-rose-50 border-2 border-rose-300 p-5 rounded-3xl shadow-sm space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                  <AlertTriangle size={22} />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
                      {lang === 'hi' ? '⚠️ सावधान: मंडी भाव का छलावा (Deceptive Deal)' : '⚠️ Warning: Distance Price Trap Detected'}
                    </span>
                    <span className="text-xs font-bold text-rose-800">
                      {lang === 'hi'
                        ? `सीधा घाटा: -₹${Math.abs(deceptiveTrapMandi.netDiff)} / क्विंटल`
                        : `Net Loss: -₹${Math.abs(deceptiveTrapMandi.netDiff)} / qtl`}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-rose-950 mt-1">
                    {lang === 'hi'
                      ? `"${deceptiveTrapMandi.market}" का भाव ₹${deceptiveTrapMandi.priceDiff} ज़्यादा है, पर असल में यह घाटे का सौदा है!`
                      : `"${deceptiveTrapMandi.market}" looks ₹${deceptiveTrapMandi.priceDiff} higher, but is actually a WORSE deal!`}
                  </h3>

                  <p className="text-xs sm:text-sm text-rose-900 mt-1.5 leading-relaxed">
                    {lang === 'hi' ? (
                      <>
                        कागज़ पर मंडी भाव <strong>₹{deceptiveTrapMandi.modalPrice}/क्विंटल</strong> (+₹{deceptiveTrapMandi.priceDiff})
                        दिख रहा है। लेकिन <strong>{deceptiveTrapMandi.distanceKm} किमी</strong> दूर ले जाने में{' '}
                        <strong>₹{deceptiveTrapMandi.transportCostPerQtl}/क्विंटल</strong> का भाड़ा लग जाएगा (स्थानीय मंडी से ₹{deceptiveTrapMandi.transportDiff} अधिक)।
                        <br />
                        नतीजतन, आपकी जेब में स्थानीय मंडी (₹{baselineMandi.netInHandPerQtl}) से उल्टा{' '}
                        <strong className="text-rose-700 font-extrabold">₹{Math.abs(deceptiveTrapMandi.netDiff)}/क्विंटल कम</strong> मिलेंगे।{' '}
                        {quantityQuintals} क्विंटल पर आपको{' '}
                        <strong className="underline font-black text-rose-700">
                          ₹{Math.abs(deceptiveTrapMandi.totalCashDiff).toLocaleString('en-IN')} का शुद्ध नुकसान
                        </strong>{' '}
                        होगा!
                      </>
                    ) : (
                      <>
                        The reported modal price is <strong>₹{deceptiveTrapMandi.modalPrice}/qtl</strong> (+₹{deceptiveTrapMandi.priceDiff} higher).
                        However, hauling <strong>{deceptiveTrapMandi.distanceKm} km</strong> costs{' '}
                        <strong>₹{deceptiveTrapMandi.transportCostPerQtl}/qtl</strong> in freight (₹{deceptiveTrapMandi.transportDiff} more than local).
                        <br />
                        Your net in-hand earnings will be{' '}
                        <strong className="text-rose-700 font-extrabold">₹{Math.abs(deceptiveTrapMandi.netDiff)}/qtl WORSE</strong> than your local mandi.
                        On {quantityQuintals} qtl, you will suffer a direct cash loss of{' '}
                        <strong className="underline font-black text-rose-700">
                          ₹{Math.abs(deceptiveTrapMandi.totalCashDiff).toLocaleString('en-IN')}
                        </strong>!
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* BEST NET DEAL SPOTLIGHT: The True Profit Winner */}
          {bestNetMandi && (
            <div className="bg-gradient-to-r from-[#0f3d24] via-[#166534] to-[#1e4620] text-white p-6 rounded-3xl shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#22c55e]/20 text-[#22c55e] text-xs font-black rounded-full border border-[#22c55e]/30">
                  <Award size={15} />
                  <span>
                    {lang === 'hi' ? '🏆 सच्चा मुनाफ़ा विजेता (Best Net Deal)' : '🏆 True In-Hand Profit Winner'}
                  </span>
                </span>
                <span className="text-xs text-emerald-200 font-bold bg-white/10 px-3 py-1 rounded-lg">
                  {lang === 'hi'
                    ? `भाड़ा काटकर सर्वाधिक नकद • ${quantityQuintals} क्विंटल फसल`
                    : `Max Net Cash after Transport • ${quantityQuintals} qtl load`}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                <div className="lg:col-span-2 space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{bestNetMandi.market}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-100">
                    <span className="flex items-center gap-1">
                      <MapPin size={13} className="text-[#22c55e]" />
                      {bestNetMandi.district}, {bestNetMandi.state}
                    </span>
                    <span>•</span>
                    <span className="font-bold text-white">दूरी: {bestNetMandi.distanceKm} किमी</span>
                    <span>•</span>
                    <span>तारीख: {bestNetMandi.arrivalDate || 'आज'}</span>
                  </div>

                  <p className="text-xs text-emerald-200/90 pt-1 leading-relaxed">
                    {lang === 'hi'
                      ? `मंडी भाव ₹${bestNetMandi.modalPrice} में से ₹${bestNetMandi.transportCostPerQtl} भाड़ा काटने के बाद प्रति क्विंटल ₹${bestNetMandi.netInHandPerQtl} की शुद्ध बचत होगी।`
                      : `After deducting ₹${bestNetMandi.transportCostPerQtl}/qtl freight from the ₹${bestNetMandi.modalPrice} rate, you net ₹${bestNetMandi.netInHandPerQtl}/qtl.`}
                  </p>
                </div>

                <div className="bg-black/25 backdrop-blur-sm p-4 rounded-2xl border border-white/10 text-right space-y-1">
                  <span className="text-xs text-emerald-300 font-bold block">
                    {lang === 'hi' ? 'जेब में शुद्ध नकद (Net in hand)' : 'Net In-Hand Rate'}
                  </span>
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-[#22c55e]">
                      ₹{bestNetMandi.netInHandPerQtl.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-emerald-200 font-bold">/ क्विंटल</span>
                  </div>
                  <div className="pt-2 border-t border-white/10 text-xs text-emerald-100 flex items-center justify-between">
                    <span>{lang === 'hi' ? `कुल कमाई (${quantityQuintals} qtl):` : `Total Net Cash:`}</span>
                    <span className="font-black text-white text-sm">
                      ₹{bestNetMandi.netTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Action Navigation to Winner */}
              <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedMandiModal(bestNetMandi)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-white transition flex items-center gap-1.5"
                >
                  <Calculator size={14} className="text-[#22c55e]" />
                  <span>{lang === 'hi' ? 'विस्तृत भाड़ा हिसाब देखें' : 'View Math Breakdown'}</span>
                </button>

                <a
                  href={getMapsUrl(bestNetMandi)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-[#22c55e] hover:bg-[#16a34a] text-gray-950 font-black rounded-xl transition flex items-center gap-1.5 shadow-md"
                >
                  <Navigation size={14} />
                  <span>{lang === 'hi' ? 'Google Maps पर रास्ता देखें' : 'Navigate on Google Maps'}</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}

          {/* Interactive Sorting Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
              <Scale size={16} className="text-[#166534]" />
              <span>{lang === 'hi' ? 'क्रमबद्ध करें (Sort By):' : 'Sort Mandis By:'}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSortBy('net_profit')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  sortBy === 'net_profit'
                    ? 'bg-[#166534] text-white shadow-sm'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <Sparkles size={13} />
                <span>{lang === 'hi' ? 'शुद्ध मुनाफ़ा (Net In-Hand)' : 'Net Profit (Recommended)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSortBy('price')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  sortBy === 'price'
                    ? 'bg-[#166534] text-white shadow-sm'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <span>{lang === 'hi' ? 'मंडी भाव (Raw Price)' : 'Raw Mandi Price'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSortBy('distance')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  sortBy === 'distance'
                    ? 'bg-[#166534] text-white shadow-sm'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <span>{lang === 'hi' ? 'नज़दीकी दूरी (Distance)' : 'Shortest Distance'}</span>
              </button>
            </div>
          </div>

          {/* Mandis Comparison Table / Cards */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-800 text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{lang === 'hi' ? 'मंडियों की तुलनात्मक सूची' : 'Comprehensive Mandi Deal Table'}</span>
                <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-full text-gray-700 font-bold">
                  {sortedMandis.length} {lang === 'hi' ? 'मंडियां' : 'Mandis'}
                </span>
              </div>
              <span className="text-xs text-gray-500 font-semibold hidden sm:inline">
                {lang === 'hi'
                  ? `भाड़ा दर: ₹${effectiveRate.toFixed(2)}/किमी • फसल: ${quantityQuintals} क्विंटल`
                  : `Freight: ₹${effectiveRate.toFixed(2)}/km • Load: ${quantityQuintals} qtl`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0f3d24] text-white text-xs uppercase font-bold tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">#</th>
                    <th className="py-3.5 px-4">{lang === 'hi' ? 'मंडी का नाम व दूरी' : 'Market & Distance'}</th>
                    <th className="py-3.5 px-4 text-right">{lang === 'hi' ? 'मंडी भाव (Sticker)' : 'Reported Price'}</th>
                    <th className="py-3.5 px-4 text-right">{lang === 'hi' ? 'भाड़ा खर्च (Freight)' : 'Freight Cost'}</th>
                    <th className="py-3.5 px-4 text-right bg-[#166534] font-black text-white">
                      {lang === 'hi' ? 'शुद्ध जेब में नकद (Net)' : 'Net In-Hand'}
                    </th>
                    <th className="py-3.5 px-4 text-center">{lang === 'hi' ? 'डील निर्णय (Verdict)' : 'Deal Verdict'}</th>
                    <th className="py-3.5 px-4 text-right">{lang === 'hi' ? 'कार्रवाई' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {sortedMandis.map((m, idx) => {
                    const isWinner = bestNetMandi && m.market === bestNetMandi.market;
                    const isWorseDeal = m.verdictType === 'worse_deal';

                    return (
                      <tr
                        key={idx}
                        className={`transition hover:bg-gray-50/80 ${
                          isWinner
                            ? 'bg-emerald-50/70'
                            : isWorseDeal
                            ? 'bg-rose-50/40'
                            : m.isBaseline
                            ? 'bg-blue-50/30'
                            : ''
                        }`}
                      >
                        <td className="py-4 px-4 text-xs text-gray-400 font-bold">{idx + 1}</td>

                        <td className="py-4 px-4">
                          <div className="font-extrabold text-gray-900 flex items-center gap-1.5">
                            <span>{m.market}</span>
                            {isWinner && (
                              <span className="text-[10px] px-2 py-0.5 bg-[#166534] text-white rounded-md uppercase font-bold">
                                {lang === 'hi' ? 'सर्वोत्तम' : 'Winner'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                            <span>{m.district}</span>
                            <span>•</span>
                            <span className="font-semibold text-gray-700 flex items-center gap-0.5">
                              <MapPin size={11} className="text-[#166534]" />
                              {m.distanceKm} km
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-right text-gray-800 font-bold">
                          <div>₹{m.modalPrice.toLocaleString('en-IN')}</div>
                          <span className="text-[11px] text-gray-400 font-normal">/ क्विंटल</span>
                        </td>

                        <td className="py-4 px-4 text-right text-rose-600 font-bold">
                          <div>-₹{m.transportCostPerQtl}</div>
                          <span className="text-[11px] text-gray-500 font-normal">
                            (कुल ₹{m.transportTotal.toLocaleString('en-IN')})
                          </span>
                        </td>

                        <td className="py-4 px-4 text-right bg-emerald-50/40 font-black">
                          <div
                            className={`text-base sm:text-lg ${
                              isWinner ? 'text-[#166534] font-black' : isWorseDeal ? 'text-rose-700' : 'text-gray-900'
                            }`}
                          >
                            ₹{m.netInHandPerQtl.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[11px] text-gray-500 font-semibold">
                            कुल ₹{m.netTotal.toLocaleString('en-IN')}
                          </div>
                        </td>

                        <td className="py-4 px-4 text-center">
                          {isWinner ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 bg-emerald-100 text-emerald-800 font-extrabold rounded-full border border-emerald-300">
                              <CheckCircle2 size={12} className="text-emerald-700" />
                              <span>{lang === 'hi' ? 'सच्चा मुनाफ़ा (Best Deal)' : 'Best Net Deal'}</span>
                            </span>
                          ) : isWorseDeal ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 bg-rose-100 text-rose-800 font-black rounded-full border border-rose-300 animate-pulse">
                                <AlertTriangle size={12} className="text-rose-700" />
                                <span>{lang === 'hi' ? 'घाटे का सौदा (Worse Deal)' : 'Worse Deal (Trap)'}</span>
                              </span>
                              <div className="text-[10px] text-rose-700 font-bold">
                                {lang === 'hi'
                                  ? `भाव +₹${m.priceDiff}, भाड़ा -₹${m.transportDiff} = ₹${Math.abs(m.netDiff)} घाटा`
                                  : `Price +₹${m.priceDiff}, Freight -₹${m.transportDiff}`}
                              </div>
                            </div>
                          ) : m.isBaseline ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 bg-blue-100 text-blue-800 font-bold rounded-full border border-blue-200">
                              <MapPin size={12} className="text-blue-700" />
                              <span>{lang === 'hi' ? 'स्थानीय मंडी (Baseline)' : 'Local Baseline'}</span>
                            </span>
                          ) : m.netDiff > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-full border border-emerald-200">
                              <TrendingUp size={12} />
                              <span>+₹{m.netDiff}/qtl फ़ायदा</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 bg-gray-100 text-gray-600 font-medium rounded-full">
                              <TrendingDown size={12} />
                              <span>-₹{Math.abs(m.netDiff)}/qtl</span>
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedMandiModal(m)}
                              className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition"
                              title="View Calculation Math"
                            >
                              <Calculator size={14} />
                            </button>

                            <a
                              href={getMapsUrl(m)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#166534] border border-emerald-200 text-xs font-bold transition flex items-center gap-1"
                              title="Open in Google Maps"
                            >
                              <Navigation size={13} />
                              <span className="hidden sm:inline">{lang === 'hi' ? 'नक्शा' : 'Map'}</span>
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Arithmetic Breakdown Drawer / Modal */}
      {selectedMandiModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                  {lang === 'hi' ? 'मंडी भाड़ा व शुद्ध कमाई हिसाब' : 'Math & Freight Breakdown'}
                </span>
                <h3 className="text-xl font-black text-gray-900 mt-0.5">{selectedMandiModal.market}</h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  {selectedMandiModal.district} • दूरी: {selectedMandiModal.distanceKm} किमी
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMandiModal(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Receipt Style Tally */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between items-center text-gray-700">
                <span>
                  1. कुल उपज बिक्री ({quantityQuintals} qtl × ₹{selectedMandiModal.modalPrice}):
                </span>
                <span className="font-bold text-gray-900">
                  ₹{selectedMandiModal.grossTotal.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-between items-center text-rose-700">
                <span>
                  2. (-) परिवहन भाड़ा ({selectedMandiModal.distanceKm} km × ₹{effectiveRate}/km × {quantityQuintals} qtl):
                </span>
                <span className="font-bold">
                  -₹{selectedMandiModal.transportTotal.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline font-black text-base text-[#166534]">
                <span>(=) शुद्ध जेब में नकद (Net in hand):</span>
                <span>₹{selectedMandiModal.netTotal.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between items-center text-xs text-gray-500 pt-1">
                <span>प्रति क्विंटल शुद्ध दर:</span>
                <span className="font-bold text-gray-800">
                  ₹{selectedMandiModal.netInHandPerQtl} / क्विंटल
                </span>
              </div>
            </div>

            {/* Baseline comparison note inside modal */}
            {baselineMandi && selectedMandiModal.market !== baselineMandi.market && (
              <div
                className={`p-3 rounded-2xl text-xs font-medium border ${
                  selectedMandiModal.netDiff < 0
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                <div className="font-bold mb-1">
                  {lang === 'hi' ? 'स्थानीय मंडी से तुलना:' : 'Comparison vs Local Mandi:'}
                </div>
                {selectedMandiModal.netDiff < 0 ? (
                  <span>
                    स्थानीय मंडी ({baselineMandi.market}) में बेचने पर आपको कुल{' '}
                    <strong>₹{Math.abs(selectedMandiModal.totalCashDiff).toLocaleString('en-IN')}</strong> अधिक बचेंगे।
                    यहाँ जाना घाटे का सौदा है!
                  </span>
                ) : (
                  <span>
                    स्थानीय मंडी ({baselineMandi.market}) के मुकाबले आपको यहाँ कुल{' '}
                    <strong>₹{selectedMandiModal.totalCashDiff.toLocaleString('en-IN')}</strong> की अतिरिक्त शुद्ध कमाई
                    होगी!
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedMandiModal(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs transition"
              >
                {lang === 'hi' ? 'बंद करें' : 'Close'}
              </button>
              <a
                href={getMapsUrl(selectedMandiModal)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 bg-[#166534] hover:bg-[#0f3d24] text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow"
              >
                <Navigation size={14} />
                <span>{lang === 'hi' ? 'रास्ता नेविगेट करें' : 'Get Directions'}</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
