import React, { useState, useEffect } from 'react';
import { Compass, MapPin, Navigation, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import { useLanguage } from '../context/LanguageContext';
import { POPULAR_CROPS, SUGGESTED_DISTRICTS } from '../utils/translations';
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
      userLon: lon
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
          longitude: pos.coords.longitude
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        title={lang === 'hi' ? 'नज़दीकी मंडी दूरी व भाव' : 'Nearest Mandi & Distance'}
        subtitle={
          lang === 'hi'
            ? 'अपने क्षेत्र के पास स्थित सरकारी APMC मंडियों की दूरी और उपलब्ध भाव।'
            : 'Find nearby APMC markets and review prices safely without fabricated distances.'
        }
        badge="Zero Hallucination Distance"
      />

      {/* GPS Location Permission Banner */}
      <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#166534] flex items-center justify-center flex-shrink-0">
            <Navigation size={22} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">
              {lang === 'hi' ? 'अपने खेत / गाँव की लोकेशन अनुमति दें' : 'Allow Your Location Access'}
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">
              {coords
                ? (lang === 'hi'
                    ? `सत्यापित लोकेशन: अक्षांश ${coords.latitude.toFixed(4)}, देशांतर ${coords.longitude.toFixed(4)}`
                    : `Verified Location: Lat ${coords.latitude.toFixed(4)}, Lon ${coords.longitude.toFixed(4)}`)
                : (lang === 'hi'
                    ? 'दूरी की गणना तभी की जाएगी जब मंडी के वास्तविक GPS निर्देशांक उपलब्ध होंगे।'
                    : 'Distances calculated only when verified market coordinates are present.')}
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

      {/* Strict Grounding Notice */}
      <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900 leading-relaxed">
        <AlertTriangle size={18} className="text-amber-700 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold block mb-0.5">
            {lang === 'hi' ? 'पारदर्शिता नियम (Strict Transparency):' : 'Strict Transparency Notice:'}
          </strong>
          {lang === 'hi'
            ? 'सरकारी Agmarknet डेटासेट में यदि किसी मंडी के अक्षांश/देशांतर दर्ज नहीं हैं, तो हम काल्पनिक दूरी कभी नहीं दिखाते। ऐसे में "दूरी उपलब्ध नहीं" स्पष्ट रूप से लिखा जाता है, ताकि किसान भाई गुमराह न हों।'
            : 'When official government Agmarknet records lack latitude/longitude coordinates, we never invent or estimate fake distances. "Distance unavailable" is strictly displayed.'}
        </div>
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
            placeholder="e.g. Lucknow, Ludhiana"
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

      {/* Markets List with Distance & Safe Price display */}
      {!loading && !error && mandis.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-800 text-sm flex items-center justify-between">
            <span>{lang === 'hi' ? 'उपलब्ध मंडियां एवं दूरी स्थिति' : 'Available Mandis and Distance Status'}</span>
            <span className="text-xs text-gray-500 font-semibold">
              {lang === 'hi' ? `कुल: ${mandis.length}` : `Total: ${mandis.length}`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0f3d24] text-white text-xs uppercase font-bold">
                <tr>
                  <th className="py-3 px-4">{lang === 'hi' ? 'मंडी' : 'Market'}</th>
                  <th className="py-3 px-4">{lang === 'hi' ? 'ज़िला' : 'District'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'hi' ? 'अनुमानित दूरी' : 'Verified Distance'}</th>
                  <th className="py-3 px-4 text-right bg-[#166534]">{lang === 'hi' ? 'मॉडल भाव' : 'Modal Price'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'hi' ? 'रिपोर्टिंग तारीख' : 'Date'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {mandis.map((m, idx) => {
                  const hasDistance = m.distanceKm !== null && m.distanceKm !== undefined && !isNaN(m.distanceKm);

                  return (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-3.5 px-4 font-bold text-gray-900 flex items-center gap-1.5">
                        <MapPin size={16} className="text-[#166534] flex-shrink-0" />
                        <span>{m.market}</span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 text-xs">{m.district}</td>
                      <td className="py-3.5 px-4 text-center">
                        {hasDistance ? (
                          <span className="px-2.5 py-1 bg-emerald-100 text-[#166534] rounded-lg text-xs font-black">
                            {Number(m.distanceKm).toFixed(1)} km
                          </span>
                        ) : (
                          <span className="text-gray-500 text-xs font-semibold bg-gray-100 px-2.5 py-1 rounded-lg">
                            {lang === 'hi' ? 'दूरी उपलब्ध नहीं' : 'Distance unavailable'}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right bg-emerald-50/30">
                        {m.modalPrice ? (
                          <span className="font-extrabold text-[#166534] text-base">
                            ₹{Number(m.modalPrice).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">अनुपलब्ध</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center text-xs text-gray-500 whitespace-nowrap">
                        {m.arrivalDate || '—'}
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
