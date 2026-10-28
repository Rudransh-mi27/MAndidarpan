import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AlertContext = createContext();

const STORAGE_KEY = 'mandidarpan_price_alerts';

/**
 * Synthesizes a clean two-tone chime using Web Audio API (100% free, zero external files)
 */
function playAlertChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    // First tone (E5 ~ 659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.35);

    // Second tone (G#5 ~ 830.6 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(830.6, ctx.currentTime + 0.15);
    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.65);
  } catch (e) {
    console.warn('Audio chime playback not allowed or supported:', e);
  }
}

export function AlertProvider({ children }) {
  const [alerts, setAlerts] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [modalPrefill, setModalPrefill] = useState(null);
  const [activeToast, setActiveToast] = useState(null);

  // Sync with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
    } catch (e) {
      console.warn('Could not save alerts to localStorage:', e);
    }
  }, [alerts]);

  // Request browser notification permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    if (Notification.permission === 'granted') {
      return 'granted';
    }
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch {
      return Notification.permission;
    }
  };

  // Add a new alert rule
  const addAlert = ({
    commodity,
    district,
    targetPrice,
    condition = 'above', // 'above' | 'below'
    market = null,
  }) => {
    const newAlert = {
      id: 'alert_' + Date.now(),
      commodity: commodity.trim(),
      district: district.trim(),
      market: market ? market.trim() : null,
      targetPrice: Number(targetPrice),
      condition,
      active: true,
      createdAt: new Date().toISOString(),
      triggeredAt: null,
    };

    setAlerts((prev) => [newAlert, ...prev]);
    requestNotificationPermission();
    return newAlert;
  };

  // Delete an alert rule
  const deleteAlert = (alertId) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  // Toggle active status
  const toggleAlertActive = (alertId) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, active: !a.active } : a))
    );
  };

  // Trigger notification (Browser push + In-app toast + Chime)
  const triggerNotification = useCallback((alertItem, currentPrice, marketName) => {
    // Play chime sound
    playAlertChime();

    const title =
      alertItem.condition === 'above'
        ? `🔔 भाव अलर्ट: ${alertItem.commodity} ₹${alertItem.targetPrice} से ऊपर!`
        : `🔔 भाव अलर्ट: ${alertItem.commodity} ₹${alertItem.targetPrice} से नीचे!`;

    const body = `${marketName || alertItem.district} में वर्तमान भाव ₹${currentPrice}/क्विंटल पहुंच गया है। (लक्षित: ₹${alertItem.targetPrice})`;

    // Browser Push Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
      } catch (err) {
        console.warn('Browser push error:', err);
      }
    }

    // In-app banner toast
    setActiveToast({
      id: Date.now(),
      title,
      body,
      commodity: alertItem.commodity,
      currentPrice,
      targetPrice: alertItem.targetPrice,
      condition: alertItem.condition,
    });

    // Mark alert as triggered
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertItem.id ? { ...a, triggeredAt: new Date().toISOString() } : a
      )
    );
  }, []);

  // Evaluate price records against all active alerts
  const checkPricesAgainstAlerts = useCallback(
    (records) => {
      if (!records || !Array.isArray(records) || records.length === 0) return;
      if (alerts.length === 0) return;

      records.forEach((record) => {
        const modal = Number(record.modalPrice);
        if (!modal || isNaN(modal)) return;

        const comm = (record.commodity || '').trim().toLowerCase();
        const dist = (record.district || '').trim().toLowerCase();

        alerts.forEach((alert) => {
          if (!alert.active) return;
          // Don't re-trigger if already triggered in the last 2 hours
          if (alert.triggeredAt) {
            const diffHours = (Date.now() - new Date(alert.triggeredAt).getTime()) / (1000 * 60 * 60);
            if (diffHours < 2) return;
          }

          const alertComm = (alert.commodity || '').trim().toLowerCase();
          const alertDist = (alert.district || '').trim().toLowerCase();

          // Check if crop matches and (district is matching or generic)
          const matchesCrop = comm === alertComm || comm.includes(alertComm) || alertComm.includes(comm);
          const matchesDist = !alertDist || dist === alertDist || dist.includes(alertDist);

          if (matchesCrop && matchesDist) {
            if (alert.condition === 'above' && modal >= alert.targetPrice) {
              triggerNotification(alert, modal, record.market);
            } else if (alert.condition === 'below' && modal <= alert.targetPrice) {
              triggerNotification(alert, modal, record.market);
            }
          }
        });
      });
    },
    [alerts, triggerNotification]
  );

  // Send a quick test notification
  const sendTestNotification = () => {
    playAlertChime();
    const title = '🔔 टेस्ट भाव अलर्ट (MandiDarpan)';
    const body = 'यह एक परीक्षण नोटिफिकेशन है! जब आपका लक्षित भाव आएगा, आपको इसी तरह अलर्ट मिलेगा।';

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/favicon.ico' });
      } catch (e) {
        console.warn(e);
      }
    }

    setActiveToast({
      id: Date.now(),
      title,
      body,
      commodity: 'गेहूं (Wheat)',
      currentPrice: 2450,
      targetPrice: 2400,
      condition: 'above',
    });
  };

  // Open modal with prefilled data from a price card
  const openAlertModalWithPrefill = (prefillData) => {
    setModalPrefill(prefillData);
    setIsAlertModalOpen(true);
  };

  return (
    <AlertContext.Provider
      value={{
        alerts,
        activeAlertsCount: alerts.filter((a) => a.active).length,
        addAlert,
        deleteAlert,
        toggleAlertActive,
        checkPricesAgainstAlerts,
        isAlertModalOpen,
        setIsAlertModalOpen,
        modalPrefill,
        setModalPrefill,
        openAlertModalWithPrefill,
        sendTestNotification,
        requestNotificationPermission,
        activeToast,
        setActiveToast,
      }}
    >
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
}
