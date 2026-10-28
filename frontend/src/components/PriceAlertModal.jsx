import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Trash2,
  Plus,
} from 'lucide-react';
import { useAlerts } from '../context/AlertContext';
import { useLanguage } from '../context/LanguageContext';
import { POPULAR_CROPS } from '../utils/translations';

export default function PriceAlertModal() {
  const { lang } = useLanguage();
  const {
    alerts,
    addAlert,
    deleteAlert,
    toggleAlertActive,
    isAlertModalOpen,
    setIsAlertModalOpen,
    modalPrefill,
    setModalPrefill,
    requestNotificationPermission,
  } = useAlerts();

  const [activeTab, setActiveTab] = useState('set'); // 'set' | 'manage'
  const [commodity, setCommodity] = useState('Wheat');
  const [district, setDistrict] = useState('Lucknow');
  const [condition, setCondition] = useState('above'); // 'above' | 'below'
  const [targetPrice, setTargetPrice] = useState('2500');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [notifPermission, setNotifPermission] = useState('default');

  // Check notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, [isAlertModalOpen]);

  // Handle prefill data from PriceCard
  useEffect(() => {
    if (modalPrefill) {
      if (modalPrefill.commodity) setCommodity(modalPrefill.commodity);
      if (modalPrefill.district) setDistrict(modalPrefill.district);
      if (modalPrefill.currentPrice) {
        // Suggest a target price 5% above or below
        const curr = Number(modalPrefill.currentPrice);
        setTargetPrice(String(Math.round(curr + 50)));
      }
      setActiveTab('set');
    }
  }, [modalPrefill]);

  if (!isAlertModalOpen) return null;

  const handleClose = () => {
    setIsAlertModalOpen(false);
    setModalPrefill(null);
    setSavedSuccess(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!targetPrice || isNaN(Number(targetPrice)) || Number(targetPrice) <= 0) return;

    addAlert({
      commodity,
      district,
      targetPrice: Number(targetPrice),
      condition,
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setActiveTab('manage');
    }, 1200);
  };

  const handleEnableNotifications = async () => {
    const res = await requestNotificationPermission();
    setNotifPermission(res);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#0f3d24] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#166534] text-[#22c55e] flex items-center justify-center shadow-sm">
              <Bell size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-base">
                {lang === 'hi' ? 'मंडी भाव अलर्ट (Price Alert)' : 'Mandi Price Alerts'}
              </h3>
              <p className="text-xs text-emerald-200">
                {lang === 'hi'
                  ? 'मनचाहा भाव आने पर तुरंत नोटिफिकेशन पाएं'
                  : 'Get instant alerts when your target price is reached'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-gray-200 bg-gray-50 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('set')}
            className={`flex-1 py-3 text-center transition flex items-center justify-center gap-1.5 ${
              activeTab === 'set'
                ? 'bg-white text-[#166534] border-b-2 border-[#166534] shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Plus size={14} />
            <span>{lang === 'hi' ? 'नया अलर्ट लगाएं' : 'Set New Alert'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manage')}
            className={`flex-1 py-3 text-center transition flex items-center justify-center gap-1.5 ${
              activeTab === 'manage'
                ? 'bg-white text-[#166534] border-b-2 border-[#166534] shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Bell size={14} />
            <span>
              {lang === 'hi' ? 'सक्रिय अलर्ट्स' : 'Active Alerts'} ({alerts.length})
            </span>
          </button>
        </div>

        {/* Tab 1: Set New Alert Form */}
        {activeTab === 'set' && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {savedSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
                <CheckCircle2 size={16} className="text-[#166534]" />
                <span>
                  {lang === 'hi'
                    ? 'अलर्ट सफलतापूर्वक सेट हो गया! जैसे ही भाव इस दर पर पहुंचेगा, आपको अलर्ट मिलेगा।'
                    : 'Alert set successfully! You will be notified when price reaches this target.'}
                </span>
              </div>
            )}

            {/* Notification Permission Banner if not enabled */}
            {notifPermission !== 'granted' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-2 text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <AlertCircle size={15} className="text-amber-600 flex-shrink-0" />
                  <span>
                    {lang === 'hi'
                      ? 'ब्राउज़र नोटिफिकेशन की अनुमति दें ताकि स्क्रीन पर अलर्ट आ सके।'
                      : 'Enable browser notifications to receive instant alert popups.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleEnableNotifications}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] whitespace-nowrap shadow-xs cursor-pointer"
                >
                  {lang === 'hi' ? 'अनुमति दें' : 'Enable'}
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Commodity Select */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  {lang === 'hi' ? 'फसल' : 'Commodity'}
                </label>
                <select
                  value={commodity}
                  onChange={(e) => setCommodity(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-[#166534] outline-none"
                >
                  {POPULAR_CROPS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {lang === 'hi' ? c.labelHi : c.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* District Input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  {lang === 'hi' ? 'ज़िला' : 'District'}
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g. Lucknow, Kanpur"
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-[#166534] outline-none"
                />
              </div>
            </div>

            {/* Condition: Above vs Below */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {lang === 'hi' ? 'अलर्ट की शर्त' : 'Alert Condition'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCondition('above')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    condition === 'above'
                      ? 'bg-emerald-50 text-[#166534] border-[#166534] ring-1 ring-[#166534]'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <TrendingUp size={14} className="text-emerald-600" />
                  <span>{lang === 'hi' ? 'भाव इससे ऊपर जाए (≥)' : 'Price Rises Above (≥)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCondition('below')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    condition === 'below'
                      ? 'bg-rose-50 text-rose-700 border-rose-600 ring-1 ring-rose-600'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <TrendingDown size={14} className="text-rose-600" />
                  <span>{lang === 'hi' ? 'भाव इससे नीचे जाए (≤)' : 'Price Drops Below (≤)'}</span>
                </button>
              </div>
            </div>

            {/* Target Price */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>{lang === 'hi' ? 'लक्षित भाव (₹/क्विंटल)' : 'Target Price (₹/qtl)'}</span>
                {modalPrefill?.currentPrice && (
                  <span className="text-[11px] text-gray-500 font-semibold">
                    वर्तमान भाव: ₹{modalPrefill.currentPrice}
                  </span>
                )}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-400 font-bold text-sm">₹</span>
                <input
                  type="number"
                  step="10"
                  min="100"
                  max="100000"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  placeholder="e.g. 2500"
                  required
                  className="w-full pl-8 pr-16 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-base font-extrabold text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#166534] outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-semibold">/ qtl</span>
              </div>

              {/* Quick increment chips */}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] text-gray-400 font-medium">त्वरित बदलाव:</span>
                {[+50, +100, +200].map((delta) => (
                  <button
                    key={delta}
                    type="button"
                    onClick={() => setTargetPrice((prev) => String((Number(prev) || 2000) + delta))}
                    className="text-[11px] font-bold px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
                  >
                    +{delta}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-[#166534] hover:bg-[#0f3d24] text-white font-extrabold rounded-xl text-sm shadow transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Bell size={16} />
                <span>{lang === 'hi' ? 'अलर्ट सुरक्षित करें (Save Alert)' : 'Save Price Alert'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Manage Saved Alerts */}
        {activeTab === 'manage' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-gray-600 border-b border-gray-100 pb-2">
              <span>{lang === 'hi' ? 'आपके सक्रिय भाव अलर्ट' : 'Your Configured Alerts'}</span>
              <span className="text-[11px] text-gray-400">
                {alerts.length} {lang === 'hi' ? 'अलर्ट सुरक्षित' : 'alerts saved'}
              </span>
            </div>

            {alerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500 space-y-2">
                <Bell size={32} className="mx-auto text-gray-300" />
                <p className="text-sm font-bold text-gray-700">
                  {lang === 'hi' ? 'कोई सक्रिय अलर्ट नहीं है' : 'No active price alerts'}
                </p>
                <p className="text-xs text-gray-400">
                  {lang === 'hi'
                    ? 'अपनी फसल का लक्षित भाव सेट करने के लिए "नया अलर्ट लगाएं" पर जाएं।'
                    : 'Switch to "Set New Alert" to create your first price notification.'}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('set')}
                  className="mt-3 px-4 py-2 bg-[#166534] text-white rounded-xl text-xs font-bold"
                >
                  + {lang === 'hi' ? 'अलर्ट जोड़ें' : 'Add Alert'}
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                      alert.active ? 'bg-white border-gray-200 shadow-2xs' : 'bg-gray-50 border-gray-200 opacity-60'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-gray-900">{alert.commodity}</span>
                        <span className="text-xs text-gray-500 font-medium">({alert.district})</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className={`font-black flex items-center gap-1 ${
                            alert.condition === 'above' ? 'text-[#166534]' : 'text-rose-600'
                          }`}
                        >
                          {alert.condition === 'above' ? (
                            <>
                              <TrendingUp size={13} />
                              <span>≥ ₹{alert.targetPrice.toLocaleString('en-IN')}</span>
                            </>
                          ) : (
                            <>
                              <TrendingDown size={13} />
                              <span>≤ ₹{alert.targetPrice.toLocaleString('en-IN')}</span>
                            </>
                          )}
                        </span>
                        <span className="text-[11px] text-gray-400">/ क्विंटल</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleAlertActive(alert.id)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                          alert.active
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {alert.active ? (lang === 'hi' ? 'सक्रिय' : 'Active') : lang === 'hi' ? 'बंद' : 'Paused'}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteAlert(alert.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Delete Alert"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
