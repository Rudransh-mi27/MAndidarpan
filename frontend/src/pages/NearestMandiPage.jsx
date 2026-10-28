import React, { useState, useEffect } from 'react';
import {
  Compass,
  MapPin,
  Navigation,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Car,
  Store,
  ChevronRight,
  Route,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import { useLanguage } from '../context/LanguageContext';
import { POPULAR_CROPS } from '../utils/translations';
import { compareMandis } from '../services/api';

export default function NearestMandiPage() {
  const { lang } = useLanguage();

  const [commodity, setCommodity] = useState('Wheat');
  const [district, setDistrict] = useState('Lucknow');

  // GPS coordinates state
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Selected mandi for spotlight distance & navigation card
  const [selectedMandiIndex, setSelectedMandiIndex] = useState(0);

  const fetchMarkets = async (customParams = null) => {
    const c = customParams?.commodity ?? commodity;
    const d = customParams?.district ?? district;
    const lat = customParams?.lat !== undefined ? customParams.lat : (coords?.latitude ?? null);
    const lon = customParams?.lon !== undefined ? customParams.lon : (coords?.longitude ?? null);

    setLoading(true);
    setError(null);

    const res = await compareMandis({
      commodity: c,
      district: d,
      userLat: lat,
      userLon: lon,
    });

    setLoading(false);
    if (!res.success) {
      setError({ message: res.message || res.error?.message, hint: res.hint || res.error?.hint });
      setData(null);
    } else {
      setData(res);
      setSelectedMandiIndex(0);
    }
  };

  useEffect(() => {
    fetchMarkets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        fetchMarkets({ lat: userCoords.latitude, lon: userCoords.longitude });
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

  const mandis = data?.mandis || [];
  const selectedMandi = mandis.length > 0 && selectedMandiIndex < mandis.length ? mandis[selectedMandiIndex] : null;

  // Calculate distance dynamically from user's GPS coords if available
  const getDisplayDistance = (mandi) => {
    if (!mandi) return null;
    if (mandi.distanceKm !== null && mandi.distanceKm !== undefined && !isNaN(mandi.distanceKm)) {
      return Number(mandi.distanceKm).toFixed(1);
    }
    if (coords?.latitude && coords?.longitude && mandi.latitude && mandi.longitude) {
      const dLat = ((mandi.latitude - coords.latitude) * Math.PI) / 180;
      const dLon = ((mandi.longitude - coords.longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((coords.latitude * Math.PI) / 180) *
          Math.cos((mandi.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return Number((6371 * c).toFixed(1));
    }
    return null;
  };

  // Estimated drive time based on average speed 35 km/h
  const getEstimatedDriveTime = (kmStr) => {
    if (!kmStr) return null;
    const km = parseFloat(kmStr);
    if (isNaN(km)) return null;
    const minutes = Math.round((km / 35) * 60);
    if (minutes < 60) return `${minutes} ${lang === 'hi' ? 'मिनट' : 'mins'}`;
    const hours = Math.floor(minutes / 60);
    const remMins = minutes % 60;
    return `${hours} ${lang === 'hi' ? 'घंटे' : 'hrs'} ${remMins > 0 ? `${remMins} ${lang === 'hi' ? 'मिनट' : 'mins'}` : ''}`;
  };

  // Build direct Google Maps redirection URL
  const getGoogleMapsUrl = (mandi) => {
    if (!mandi) return 'https://www.google.com/maps';
    const marketName = mandi.market || mandi.mandi || '';
    const districtName = mandi.district || '';
    const stateName = mandi.state || '';
    const query = encodeURIComponent(`${marketName} Mandi, ${districtName}, ${stateName}`.trim());

    if (coords?.latitude && coords?.longitude) {
      if (mandi.latitude && mandi.longitude) {
        return `https://www.google.com/maps/dir/?api=1&origin=${coords.latitude},${coords.longitude}&destination=${mandi.latitude},${mandi.longitude}&travelmode=driving`;
      }
      return `https://www.google.com/maps/dir/?api=1&origin=${coords.latitude},${coords.longitude}&destination=${query}&travelmode=driving`;
    }

    if (mandi.latitude && mandi.longitude) {
      return `https://www.google.com/maps/search/?api=1&query=${mandi.latitude},${mandi.longitude}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        title={lang === 'hi' ? 'नज़दीकी मंडी, दूरी व रास्ता' : 'Nearest Mandi & Google Maps Route'}
        subtitle={
          lang === 'hi'
            ? 'अपनी लोकेशन से किसी भी मंडी की दूरी जानें और Google Maps पर सीधा रास्ता खोलें।'
            : 'Find distances to mandis from your detected location and open direct routes on Google Maps.'
        }
        badge="Live GPS Navigation"
      />

      {/* GPS Location Permission Banner */}
      <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#166534] flex items-center justify-center flex-shrink-0">
            <Navigation size={22} className={locating ? 'animate-pulse' : ''} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">
              {lang === 'hi' ? 'अपने खेत / गाँव की लोकेशन पता करें' : 'Detect Your Location'}
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">
              {coords
                ? (lang === 'hi'
                    ? `✓ आपकी लोकेशन सक्रिय: अक्षांश ${coords.latitude.toFixed(4)}, देशांतर ${coords.longitude.toFixed(4)}`
                    : `✓ Verified Location: Lat ${coords.latitude.toFixed(4)}, Lon ${coords.longitude.toFixed(4)}`)
                : (lang === 'hi'
                    ? 'लोकेशन ऑन करने पर सभी मंडियों की आपके स्थान से सटीक दूरी और Google Maps पर रास्ता दिखेगा।'
                    : 'Turn on location to view exact distances and turn-by-turn Google Maps routes.')}
            </p>
            {locError && <p className="text-xs text-rose-600 mt-1 font-semibold">{locError}</p>}
          </div>
        </div>

        <button
          onClick={handleGetLocation}
          disabled={locating}
          className="px-5 py-2.5 bg-[#166534] hover:bg-[#0f3d24] text-white font-bold text-sm rounded-xl shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-60 whitespace-nowrap"
        >
          {locating ? <RefreshCw size={16} className="animate-spin" /> : <Navigation size={16} />}
          <span>{lang === 'hi' ? 'मेरी लोकेशन पता करें' : 'Detect My Location'}</span>
        </button>
      </div>

      {/* Filter Selector */}
      <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[160px]">
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

        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            {lang === 'hi' ? 'ज़िला' : 'District'}
          </label>
          <input
            type="text"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder="e.g. Lucknow, Kanpur"
            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:bg-white focus:ring-2 focus:ring-[#166534] outline-none"
          />
        </div>

        <button
          onClick={() => fetchMarkets()}
          disabled={loading}
          className="px-6 py-2.5 bg-[#166534] hover:bg-[#0f3d24] text-white font-bold rounded-xl text-sm shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
        >
          {loading ? <RefreshCw size={16} className="animate-spin" /> : <Compass size={16} />}
          <span>{lang === 'hi' ? 'मंडियां खोजें' : 'Find Mandis'}</span>
        </button>
      </div>

      {loading && <LoadingIndicator message={lang === 'hi' ? 'मंडियों की जानकारी लोड हो रही है...' : 'Loading market details...'} />}
      {error && <ErrorMessage message={error.message} hint={error.hint} onRetry={() => fetchMarkets()} />}

      {/* Selected Mandi Spotlight Card */}
      {!loading && !error && selectedMandi && (
        <div className="bg-gradient-to-br from-[#0f3d24] to-[#166534] text-white p-6 rounded-3xl shadow-lg border border-emerald-600/30">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 rounded-full text-xs font-bold flex items-center gap-1.5">
                <Store size={14} />
                {lang === 'hi' ? 'चुनी गई मंडी का विवरण' : 'Selected Mandi Spotlight'}
              </span>
              {selectedMandi.isRecommended && (
                <span className="px-3 py-1 bg-amber-400 text-gray-950 font-black rounded-full text-xs">
                  {lang === 'hi' ? '★ सबसे नज़दीक / अनुशंसित' : '★ Recommended'}
                </span>
              )}
            </div>

            {/* Quick Mandi Switcher Dropdown */}
            {mandis.length > 1 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-200 font-semibold">
                  {lang === 'hi' ? 'मंडी बदलें:' : 'Select Mandi:'}
                </span>
                <select
                  value={selectedMandiIndex}
                  onChange={(e) => setSelectedMandiIndex(Number(e.target.value))}
                  className="bg-emerald-900/90 text-white px-3 py-1.5 rounded-xl border border-emerald-500/50 text-xs font-bold outline-none cursor-pointer"
                >
                  {mandis.map((m, idx) => (
                    <option key={idx} value={idx}>
                      {m.market || m.mandi}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
            {/* Column 1: Mandi Details */}
            <div className="space-y-1 md:col-span-1">
              <h3 className="text-xl md:text-2xl font-black flex items-center gap-2">
                <MapPin size={22} className="text-[#22c55e] shrink-0" />
                <span>{selectedMandi.market || selectedMandi.mandi}</span>
              </h3>
              <p className="text-emerald-200 text-xs md:text-sm pl-7">
                {selectedMandi.district}{selectedMandi.state ? `, ${selectedMandi.state}` : ''}
              </p>
              {selectedMandi.modalPrice && (
                <div className="pt-2 pl-7 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-amber-300">
                    ₹{Number(selectedMandi.modalPrice).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-emerald-200 font-semibold">/ क्विंटल</span>
                </div>
              )}
            </div>

            {/* Column 2: Distance & Drive Time */}
            <div className="bg-emerald-950/50 border border-emerald-500/30 p-4 rounded-2xl flex items-center justify-around text-center md:col-span-1">
              <div>
                <span className="text-[11px] uppercase font-bold text-emerald-300 block mb-0.5">
                  {lang === 'hi' ? 'सत्यापित दूरी' : 'Verified Distance'}
                </span>
                {getDisplayDistance(selectedMandi) ? (
                  <span className="text-2xl md:text-3xl font-black text-white">
                    {getDisplayDistance(selectedMandi)} <span className="text-base text-emerald-300">km</span>
                  </span>
                ) : (
                  <span className="text-xs text-amber-300 font-semibold block pt-1">
                    {lang === 'hi' ? 'लोकेशन ऑन करें' : 'Detect Location'}
                  </span>
                )}
              </div>

              <div className="w-[1px] h-10 bg-emerald-600/40" />

              <div>
                <span className="text-[11px] uppercase font-bold text-emerald-300 block mb-0.5">
                  {lang === 'hi' ? 'यात्रा समय (लगभग)' : 'Est. Drive Time'}
                </span>
                {getDisplayDistance(selectedMandi) ? (
                  <span className="text-base md:text-lg font-bold text-white flex items-center justify-center gap-1">
                    <Car size={16} className="text-emerald-400" />
                    <span>{getEstimatedDriveTime(getDisplayDistance(selectedMandi))}</span>
                  </span>
                ) : (
                  <span className="text-xs text-emerald-300 font-medium">—</span>
                )}
              </div>
            </div>

            {/* Column 3: Prominent Google Maps Redirect Tag */}
            <div className="md:col-span-1 flex flex-col justify-center">
              <a
                href={getGoogleMapsUrl(selectedMandi)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-5 py-3.5 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 active:scale-[0.98] text-gray-950 font-black text-sm md:text-base rounded-2xl shadow-lg transition flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <Navigation size={18} className="text-gray-950 fill-current" />
                <span>{lang === 'hi' ? 'Google Maps पर सीधा रास्ता खोलें' : 'Open Route on Google Maps'}</span>
                <ExternalLink size={16} />
              </a>
              <p className="text-[11px] text-center text-emerald-200/80 mt-2">
                {lang === 'hi'
                  ? 'टैप करने पर सीधे Google Maps ऐप में नेविगेशन शुरू होगा'
                  : 'Opens Google Maps turn-by-turn driving navigation'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Markets List with Distance & Safe Price display */}
      {!loading && !error && mandis.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-800 text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Route size={18} className="text-[#166534]" />
              {lang === 'hi' ? 'सभी उपलब्ध मंडियां (दूरी व Google Maps टैग)' : 'All Mandis (Distance & Google Maps Tag)'}
            </span>
            <span className="text-xs text-gray-500 font-semibold">
              {lang === 'hi' ? `कुल: ${mandis.length} मंडियां` : `Total: ${mandis.length} markets`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0f3d24] text-white text-xs uppercase font-bold">
                <tr>
                  <th className="py-3 px-4">{lang === 'hi' ? 'मंडी' : 'Market'}</th>
                  <th className="py-3 px-4">{lang === 'hi' ? 'ज़िला' : 'District'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'hi' ? 'आपकी लोकेशन से दूरी' : 'Distance'}</th>
                  <th className="py-3 px-4 text-right bg-[#166534]">{lang === 'hi' ? 'मॉडल भाव' : 'Modal Price'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'hi' ? 'Google Maps नेविगेशन टैग' : 'Google Maps Tag'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {mandis.map((m, idx) => {
                  const dist = getDisplayDistance(m);
                  const isSelected = selectedMandiIndex === idx;

                  return (
                    <tr
                      key={idx}
                      onClick={() => setSelectedMandiIndex(idx)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-emerald-50/80 ring-1 ring-inset ring-emerald-300'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className={isSelected ? 'text-[#166534]' : 'text-gray-400'} />
                          <span className={isSelected ? 'text-[#166534] font-black' : ''}>
                            {m.market || m.mandi}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] bg-[#166534] text-white px-2 py-0.5 rounded-full font-bold">
                              {lang === 'hi' ? 'सक्रिय' : 'Selected'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 text-xs">{m.district}</td>
                      <td className="py-3.5 px-4 text-center">
                        {dist ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2.5 py-1 bg-emerald-100 text-[#166534] rounded-lg text-xs font-black flex items-center gap-1">
                              <Navigation size={12} />
                              {dist} km
                            </span>
                            <span className="text-[10px] text-gray-500 mt-0.5 font-medium">
                              ~{getEstimatedDriveTime(dist)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-xs font-semibold bg-gray-100 px-2.5 py-1 rounded-lg">
                            {lang === 'hi' ? 'लोकेशन ऑन करें' : 'Turn on GPS'}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right bg-emerald-50/20">
                        {m.modalPrice ? (
                          <span className="font-extrabold text-[#166534] text-base">
                            ₹{Number(m.modalPrice).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">अनुपलब्ध</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <a
                          href={getGoogleMapsUrl(m)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#166534] hover:bg-[#0f3d24] text-white rounded-xl text-xs font-bold transition shadow-sm hover:shadow cursor-pointer"
                          title="Google Maps पर रास्ता देखें"
                        >
                          <Navigation size={13} className="fill-current" />
                          <span>{lang === 'hi' ? 'रास्ता देखें' : 'Directions'}</span>
                          <ExternalLink size={12} className="opacity-80" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
