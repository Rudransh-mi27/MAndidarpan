import React, { useState, useEffect } from 'react';
import {
  Calendar,
  MapPin,
  Tag,
  Award,
  TrendingUp,
  AlertTriangle,
  Volume2,
  VolumeX,
  Bell,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAlerts } from '../context/AlertContext';
import {
  speakText,
  stopSpeaking,
  isSpeechSynthesisSupported,
} from '../utils/speechUtils';

export default function PriceCard({ record, isFeatured = true }) {
  const { lang, t } = useLanguage();
  const { openAlertModalWithPrefill } = useAlerts();
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      // Clean up speech on unmount
      if (isSpeaking) {
        stopSpeaking();
      }
    };
  }, [isSpeaking]);

  if (!record) return null;

  const {
    market,
    district,
    state,
    commodity,
    variety,
    grade,
    arrivalDate,
    modalPrice,
    minPrice,
    maxPrice,
  } = record;

  const hasModalPrice =
    modalPrice !== null && modalPrice !== undefined && !isNaN(modalPrice);
  const formattedModalPrice = hasModalPrice
    ? Number(modalPrice).toLocaleString('en-IN')
    : null;
  const formattedMinPrice =
    minPrice !== null && minPrice !== undefined
      ? Number(minPrice).toLocaleString('en-IN')
      : null;
  const formattedMaxPrice =
    maxPrice !== null && maxPrice !== undefined
      ? Number(maxPrice).toLocaleString('en-IN')
      : null;

  const handleSpeakPrice = () => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    let speechSentence = '';
    if (lang === 'hi') {
      speechSentence = `आज ${district || ''} के ${market || 'मंडी'} में ${commodity || 'फसल'} का मॉडल भाव ${
        hasModalPrice ? `${formattedModalPrice} रुपये प्रति क्विंटल` : 'उपलब्ध नहीं'
      } है। ${
        formattedMinPrice
          ? `न्यूनतम भाव ${formattedMinPrice} रुपये और अधिकतम भाव ${formattedMaxPrice} रुपये दर्ज हुआ है।`
          : ''
      }`;
    } else {
      speechSentence = `Today at ${market || 'Mandi'} in ${district || ''}, the modal price for ${commodity || 'crop'} is ${
        hasModalPrice ? `${formattedModalPrice} rupees per quintal` : 'not available'
      }. ${
        formattedMinPrice
          ? `Minimum rate is ${formattedMinPrice} rupees and maximum rate is ${formattedMaxPrice} rupees.`
          : ''
      }`;
    }

    setIsSpeaking(true);
    speakText({
      text: speechSentence,
      lang,
      rate: 0.9,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        isFeatured
          ? 'bg-gradient-to-b from-white to-emerald-50/40 border-emerald-300 shadow-md ring-1 ring-emerald-500/10'
          : 'bg-white border-gray-200 shadow-sm hover:shadow'
      }`}
    >
      {/* Top Header Badge */}
      <div className="bg-[#0f3d24] text-white px-5 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-[#22c55e]" />
          <span className="font-extrabold text-base md:text-lg tracking-wide">
            {market || 'Mandi APMC'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold bg-[#166534] text-emerald-100 px-3 py-1 rounded-full border border-emerald-600/50">
          <Calendar size={13} className="text-[#22c55e]" />
          <span>{arrivalDate || 'आज'}</span>
        </div>
      </div>

      <div className="p-5 md:p-6">
        {/* Commodity, Variety Badges & Voice Output Button */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 bg-emerald-100 text-[#166534] font-extrabold text-sm rounded-lg flex items-center gap-1">
              <Tag size={14} />
              {commodity}
            </span>
            {variety && (
              <span className="px-2.5 py-1 bg-gray-100 text-gray-700 font-semibold text-xs rounded-lg">
                {t.home.varietyLabel} <strong className="text-gray-900">{variety}</strong>
              </span>
            )}
            {grade && (
              <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-xs rounded-lg flex items-center gap-1">
                <Award size={12} />
                {grade}
              </span>
            )}
          </div>

          {/* Action buttons: Set Alert & Voice Output */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Set Alert Button */}
            <button
              type="button"
              onClick={() =>
                openAlertModalWithPrefill({
                  commodity,
                  district,
                  currentPrice: modalPrice,
                  market,
                })
              }
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer bg-white hover:bg-emerald-50 text-gray-700 hover:text-[#166534] border border-gray-200 hover:border-emerald-300"
              title={lang === 'hi' ? 'इस फसल पर भाव अलर्ट सेट करें' : 'Set price alert'}
            >
              <Bell size={13} className="text-[#166534]" />
              <span>{lang === 'hi' ? '🔔 अलर्ट सेट करें' : '🔔 Set Alert'}</span>
            </button>

            {/* Voice Output Button for farmers who prefer listening over reading */}
            {isSpeechSynthesisSupported() && (
              <button
                type="button"
                onClick={handleSpeakPrice}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
                  isSpeaking
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-[#166534] border border-emerald-300'
                }`}
                title={isSpeaking ? 'बोलना रोकें' : 'भाव बोलकर सुनें'}
              >
                {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                <span>
                  {isSpeaking
                    ? lang === 'hi'
                      ? 'रुकें'
                      : 'Stop'
                    : lang === 'hi'
                    ? '🔊 भाव सुनें'
                    : '🔊 Listen'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Location subtitle */}
        <div className="text-xs text-gray-500 mb-5 flex items-center gap-1">
          <span>{district}</span>
          {state && <span>, {state}</span>}
        </div>

        {/* Modal Price Highlight */}
        <div className="p-4 bg-white rounded-xl border border-emerald-100 shadow-inner flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {t.home.modalPriceLabel}
            </p>
            {hasModalPrice ? (
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl md:text-4xl font-black text-[#166534]">
                  ₹{formattedModalPrice}
                </span>
                <span className="text-sm font-semibold text-gray-600">
                  {t.home.perQuintal}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-700 text-sm font-medium mt-1">
                <AlertTriangle size={16} />
                <span>मॉडल भाव उपलब्ध नहीं (Min/Max देखें)</span>
              </div>
            )}
          </div>

          <div className="flex sm:flex-col items-center sm:items-end gap-1 text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200/60 font-semibold">
            <TrendingUp size={15} className="text-emerald-600" />
            <span>दैनिक सरकारी भाव</span>
          </div>
        </div>

        {/* Min / Max Range Cards */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200/70">
            <span className="text-xs font-semibold text-gray-500 block">
              {t.home.minPriceLabel}
            </span>
            <span className="text-base md:text-lg font-bold text-gray-800 mt-0.5 block">
              {formattedMinPrice ? `₹${formattedMinPrice}` : 'N/A'}
            </span>
          </div>

          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200/70">
            <span className="text-xs font-semibold text-gray-500 block">
              {t.home.maxPriceLabel}
            </span>
            <span className="text-base md:text-lg font-bold text-gray-800 mt-0.5 block">
              {formattedMaxPrice ? `₹${formattedMaxPrice}` : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
