// Speech utilities for MandiDarpan (Speech-to-Text & Text-to-Speech)

/**
 * Clean markdown symbols for natural Text-to-Speech pronunciation
 */
export function cleanTextForSpeech(text) {
  if (!text) return '';
  return text
    .replace(/[*#_~`>]/g, '') // remove markdown symbols
    .replace(/https?:\/\/\S+/g, '') // remove URLs
    .replace(/[•-]\s+/g, ', ') // convert bullets to pauses
    .replace(/₹\s*(\d+)/g, '$1 रुपये') // pronounce ₹ as रुपये in Hindi
    .replace(/(\d+)\s*\/\s*क्विंटल/g, '$1 रुपये प्रति क्विंटल')
    .replace(/(\d+)\s*\/\s*qtl/gi, '$1 rupees per quintal')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check browser support
 */
export const isSpeechSynthesisSupported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window;

export const isSpeechRecognitionSupported = () =>
  typeof window !== 'undefined' &&
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

/**
 * Text-to-Speech: Speak text aloud
 */
export function speakText({
  text,
  lang = 'hi',
  rate = 0.92,
  onStart = null,
  onEnd = null,
  onError = null,
}) {
  if (!isSpeechSynthesisSupported()) {
    if (onError) onError(new Error('Speech synthesis not supported in this browser'));
    return null;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) return null;

  const utterance = new SpeechSynthesisUtterance(cleaned);
  utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
  utterance.rate = rate; // slightly slower for clear comprehension
  utterance.pitch = 1.0;

  // Try to pick a suitable Hindi voice if available
  const voices = window.speechSynthesis.getVoices();
  const targetPrefix = lang === 'hi' ? 'hi' : 'en';
  const matchedVoice = voices.find(
    (v) => v.lang.toLowerCase().startsWith(targetPrefix) && (v.name.includes('Google') || v.name.includes('India') || true)
  );
  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  if (onStart) utterance.onstart = onStart;
  utterance.onend = () => {
    if (onEnd) onEnd();
  };
  utterance.onerror = (e) => {
    // Treat canceled/interrupted as normal
    if (e.error !== 'canceled' && e.error !== 'interrupted') {
      console.warn('Speech synthesis error:', e.error);
      if (onError) onError(e);
    }
    if (onEnd) onEnd();
  };

  window.speechSynthesis.speak(utterance);
  return utterance;
}

/**
 * Stop any current speech
 */
export function stopSpeaking() {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Speech-to-Text: Initialize browser voice recognition
 */
export function startVoiceRecognition({
  lang = 'hi',
  onResult,
  onError,
  onStart,
  onEnd,
}) {
  if (!isSpeechRecognitionSupported()) {
    if (onError) {
      onError({
        error: 'not_supported',
        message: 'Speech recognition is not supported in this browser.',
      });
    }
    return null;
  }

  const SpeechRecognitionClass =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognitionClass();

  recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  if (onStart) recognition.onstart = onStart;

  recognition.onresult = (event) => {
    if (event.results && event.results.length > 0) {
      const transcript = event.results[0][0].transcript;
      if (onResult) onResult(transcript);
    }
  };

  recognition.onerror = (event) => {
    console.warn('Speech recognition error event:', event.error);
    if (onError) onError(event);
  };

  recognition.onend = () => {
    if (onEnd) onEnd();
  };

  try {
    recognition.start();
    return recognition;
  } catch (err) {
    console.warn('Speech recognition start failed:', err);
    if (onError) onError(err);
    return null;
  }
}
