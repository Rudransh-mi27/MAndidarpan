import React, { useEffect } from 'react';
import { Bell, X, TrendingUp, TrendingDown } from 'lucide-react';
import { useAlerts } from '../context/AlertContext';

export default function AlertToast() {
  const { activeToast, setActiveToast, setIsAlertModalOpen } = useAlerts();

  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [activeToast, setActiveToast]);

  if (!activeToast) return null;

  return (
    <div className="fixed top-16 right-4 sm:right-6 z-50 max-w-sm w-full bg-white rounded-2xl border-2 border-emerald-500 shadow-2xl p-4 animate-in slide-in-from-top-4 duration-300">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#166534] text-[#22c55e] flex items-center justify-center flex-shrink-0 animate-bounce">
          <Bell size={20} />
        </div>

        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#166534]">
              {activeToast.title}
            </h4>
            <button
              type="button"
              onClick={() => setActiveToast(null)}
              className="text-gray-400 hover:text-gray-700 p-0.5 rounded cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          <p className="text-xs text-gray-800 leading-relaxed font-medium">
            {activeToast.body}
          </p>

          <div className="pt-1 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={() => {
                setActiveToast(null);
                setIsAlertModalOpen(true);
              }}
              className="font-bold text-[#166534] hover:underline cursor-pointer"
            >
              अलर्ट्स देखें →
            </button>
            <span className="text-gray-400 font-medium">अभी ट्रिगर हुआ</span>
          </div>
        </div>
      </div>
    </div>
  );
}
