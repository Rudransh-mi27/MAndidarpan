import React, { useState, useEffect } from 'react';
import { Scale, Award, Info, RefreshCw, AlertCircle, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import { useLanguage } from '../context/LanguageContext';
import { POPULAR_CROPS, SUGGESTED_DISTRICTS } from '../utils/translations';
import { compareMandis } from '../services/api';

export default function CompareMandisPage() {
  const { lang } = useLanguage();

  const [commodity, setCommodity] = useState('Tomato');
  const [district, setDistrict] = useState('Ludhiana');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const fetchComparison = async (customParams = null) => {
    const c = customParams?.commodity ?? commodity;
    const d = customParams?.district ?? district;

    setLoading(true);
    setError(null);

    const res = await compareMandis({
      commodity: c,
      district: d
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

  const handleSearch = (e) => {
    e.preventDefault();
    fetchComparison();
  };

  const basis = data?.comparisonBasis;
  const bestMandi = data?.bestMandi;
  const mandis = data?.mandis || [];
  const comparisonMessage = data?.comparisonMessage || data?.message;
  const isNoData = data?.status === 'no_data' || (data?.success && mandis.length === 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        title={lang === 'hi' ? 'मंडियों की मूल्य तुलना' : 'Mandi Price Comparison'}
        subtitle={
          lang === 'hi'
            ? 'समान किस्म और समान ग्रेड (Like-for-Like) के आधार पर मंडियों की तुलना।'
            : 'Strict like-for-like comparison maintaining variety and grade consistency.'
        }
        badge="Like-for-Like Pure Rule"
      />

      {/* Filter Form */}
      <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
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
              placeholder="e.g. Ludhiana, Lucknow"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:bg-white focus:ring-2 focus:ring-[#166534] outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-[#166534] hover:bg-[#0f3d24] text-white font-bold rounded-xl text-sm shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Scale size={16} />}
            <span>{lang === 'hi' ? 'तुलना करें' : 'Compare Mandis'}</span>
          </button>
        </form>

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
              className="text-xs px-2.5 py-0.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {loading && <LoadingIndicator message={lang === 'hi' ? 'मंडियों की तुलना की जा रही है...' : 'Comparing mandis...'} />}
      {error && <ErrorMessage message={error.message} hint={error.hint} onRetry={() => fetchComparison()} />}

      {/* No Data State */}
      {!loading && !error && isNoData && (
        <div className="bg-amber-50/70 border border-amber-200 p-8 rounded-3xl text-center">
          <AlertCircle size={32} className="mx-auto text-amber-600 mb-2" />
          <h3 className="text-lg font-bold text-gray-900">
            {lang === 'hi' ? 'कोई तुलना योग्य मंडी नहीं मिली' : 'No Comparable Mandis Found'}
          </h3>
          <p className="text-gray-700 text-sm max-w-md mx-auto mt-1">
            {comparisonMessage || (lang === 'hi'
              ? `${district} में ${commodity} के लिए आज कोई रिकॉर्ड उपलब्ध नहीं है।`
              : `No recorded mandis for ${commodity} in ${district} today.`)}
          </p>
        </div>
      )}

      {/* Comparison Basis & Results */}
      {!loading && !error && !isNoData && mandis.length > 0 && (
        <div className="space-y-6">
          {/* Comparison Basis Notice Card */}
          {basis && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2 text-emerald-900 font-bold">
                <CheckCircle2 size={18} className="text-[#166534]" />
                <span>
                  {lang === 'hi' ? 'तुलना का आधार (Comparison Basis):' : 'Comparison Basis:'}
                </span>
                <span className="px-2.5 py-0.5 bg-white border border-emerald-300 rounded-lg text-emerald-800">
                  {lang === 'hi' ? 'किस्म:' : 'Variety:'} <strong>{basis.variety}</strong>
                </span>
                <span className="px-2.5 py-0.5 bg-white border border-emerald-300 rounded-lg text-emerald-800">
                  {lang === 'hi' ? 'ग्रेड:' : 'Grade:'} <strong>{basis.grade}</strong>
                </span>
              </div>
              <span className="text-xs text-emerald-700 font-medium">
                {lang === 'hi' ? '* विभिन्न किस्मों या ग्रेड को आपस में नहीं मिलाया गया है' : '* Varieties & grades strictly isolated'}
              </span>
            </div>
          )}

          {/* Best Mandi Highlight (if present and valid) */}
          {bestMandi && bestMandi.modalPrice && (
            <div className="bg-gradient-to-r from-[#0f3d24] to-[#166534] text-white p-6 rounded-3xl shadow-md flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#22c55e]/20 text-[#22c55e] text-xs font-bold rounded-full mb-2 border border-[#22c55e]/30">
                  <Award size={14} />
                  <span>{lang === 'hi' ? 'सर्वश्रेष्ठ मॉडल भाव वाली मंडी' : 'Highest Modal Price Mandi'}</span>
                </span>
                <h3 className="text-2xl font-black">{bestMandi.market}</h3>
                <p className="text-emerald-100 text-xs mt-1">
                  {bestMandi.district}, {bestMandi.state} • तारीख: {bestMandi.arrivalDate}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-emerald-200 font-bold block">
                  {lang === 'hi' ? 'मॉडल भाव (औसत दर)' : 'Reported Modal Price'}
                </span>
                <span className="text-3xl md:text-4xl font-black text-[#22c55e]">
                  ₹{Number(bestMandi.modalPrice).toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-emerald-200 block">/ क्विंटल</span>
              </div>
            </div>
          )}

          {/* Comparison Message when single or few mandis */}
          {comparisonMessage && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-center gap-2">
              <Info size={16} className="text-blue-600 flex-shrink-0" />
              <span>{comparisonMessage}</span>
            </div>
          )}

          {/* Mandis Comparison Table */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-800 text-sm flex items-center justify-between">
              <span>{lang === 'hi' ? 'समान आधार वाली मंडियों की सूची' : 'Comparable Markets List'}</span>
              <span className="text-xs text-gray-500 font-semibold">
                {lang === 'hi' ? `कुल मंडियां: ${mandis.length}` : `Total Markets: ${mandis.length}`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0f3d24] text-white text-xs uppercase font-bold">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">{lang === 'hi' ? 'मंडी का नाम' : 'Market'}</th>
                    <th className="py-3 px-4">{lang === 'hi' ? 'ज़िला' : 'District'}</th>
                    <th className="py-3 px-4">{lang === 'hi' ? 'किस्म / ग्रेड' : 'Variety / Grade'}</th>
                    <th className="py-3 px-4 text-right bg-[#166534]">{lang === 'hi' ? 'मॉडल भाव (₹/क्विंटल)' : 'Modal Price'}</th>
                    <th className="py-3 px-4 text-right">{lang === 'hi' ? 'दायरा (Min - Max)' : 'Range'}</th>
                    <th className="py-3 px-4 text-center">{lang === 'hi' ? 'तारीख' : 'Date'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {mandis.map((m, idx) => (
                    <tr key={idx} className={m.isTiedBest ? 'bg-emerald-50/60 font-semibold' : 'hover:bg-gray-50'}>
                      <td className="py-3 px-4 text-xs text-gray-500">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-gray-900">
                        {m.market}
                        {m.isTiedBest && (
                          <span className="ml-2 text-[10px] px-2 py-0.5 bg-[#166534] text-white rounded-md uppercase font-bold">
                            Best
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-xs">{m.district}</td>
                      <td className="py-3 px-4 text-xs text-gray-700">
                        {m.variety} • {m.grade}
                      </td>
                      <td className="py-3 px-4 text-right bg-emerald-50/30">
                        {m.modalPrice ? (
                          <span className="font-extrabold text-[#166534] text-base">
                            ₹{Number(m.modalPrice).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">अनुपलब्ध</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-gray-600">
                        ₹{m.minPrice || '—'} - ₹{m.maxPrice || '—'}
                      </td>
                      <td className="py-3 px-4 text-center text-xs text-gray-500 whitespace-nowrap">
                        {m.arrivalDate || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
