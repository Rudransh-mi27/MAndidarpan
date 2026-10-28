import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  User,
  Sparkles,
  AlertCircle,
  RefreshCw,
  HelpCircle,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useLanguage } from '../context/LanguageContext';
import { queryGemma } from '../services/api';
import {
  speakText,
  stopSpeaking,
  startVoiceRecognition,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
} from '../utils/speechUtils';

export default function AiAssistantPage() {
  const { lang } = useLanguage();

  const [inputQuestion, setInputQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text:
        lang === 'hi'
          ? 'नमस्ते किसान भाई! मैं मंडी दर्पण किसान सहायक हूँ। आप मुझसे अपनी भाषा में किसी भी मंडी के भाव, मूल्य रुझान या तुलना के बारे में पूछ सकते हैं। आप नीचे दिए गए माइक 🎙️ बटन को दबाकर बोलकर भी पूछ सकते हैं!'
          : 'Hello Farmer Friend! I am your MandiDarpan Kisan Sahayak. Ask me about mandi prices, price trends, or market comparisons. You can also tap the mic 🎙️ button to speak your question!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Voice Input (Speech-to-Text) State
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const recognitionRef = useRef(null);

  // Voice Output (Text-to-Speech) State
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [autoSpeak, setAutoSpeak] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, isListening]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  // Send question to AI
  const handleSend = async (questionText = null) => {
    const q = (questionText || inputQuestion).trim();
    if (!q || loading) return;

    // Stop ongoing speech
    stopSpeaking();
    setSpeakingMessageId(null);

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuestion('');
    setVoiceError(null);
    setLoading(true);

    const res = await queryGemma({ question: q });
    setLoading(false);

    let answerText = '';
    let isError = false;

    if (res.success && res.answer) {
      answerText = res.answer;
    } else {
      isError = true;
      answerText =
        res.answer ||
        res.message ||
        (lang === 'hi'
          ? 'माफ़ कीजिए, अभी किसान सहायक से उत्तर प्राप्त नहीं हो सका। कृपया बैकएंड कनेक्शन जांचें।'
          : 'Sorry, could not retrieve Kisan Sahayak answer. Please verify backend connection.');
    }

    const aiMsgId = Date.now() + 1;
    const aiResponse = {
      id: aiMsgId,
      sender: 'ai',
      text: answerText,
      isError,
      intent: res?.intent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, aiResponse]);

    // If auto-speak is enabled, speak the answer immediately
    if (autoSpeak && !isError) {
      handleToggleSpeech(aiMsgId, answerText);
    }
  };

  // Toggle voice recognition (Mic on/off)
  const handleToggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      setVoiceError(
        lang === 'hi'
          ? 'आपके ब्राउज़र में वॉइस इनपुट (माइक) समर्थित नहीं है। कृपया Google Chrome का उपयोग करें।'
          : 'Voice input is not supported in this browser. Please use Google Chrome.'
      );
      return;
    }

    setVoiceError(null);
    stopSpeaking();
    setSpeakingMessageId(null);

    const recognition = startVoiceRecognition({
      lang,
      onStart: () => {
        setIsListening(true);
      },
      onResult: (spokenText) => {
        setIsListening(false);
        if (spokenText && spokenText.trim()) {
          setInputQuestion(spokenText);
          handleSend(spokenText);
        }
      },
      onError: (err) => {
        setIsListening(false);
        console.warn('Voice recognition error:', err);
        if (err.error === 'not-allowed' || err.error === 'service-not-allowed') {
          setVoiceError(
            lang === 'hi'
              ? 'माइक की अनुमति (Permission) नहीं मिली। कृपया ब्राउज़र में माइक की अनुमति दें।'
              : 'Microphone permission denied. Please allow microphone access.'
          );
        } else if (err.error === 'no-speech') {
          setVoiceError(
            lang === 'hi'
              ? 'कोई आवाज़ सुनाई नहीं दी। कृपया माइक दबाकर दोबारा साफ़-साफ़ बोलें।'
              : 'No speech was detected. Please tap mic and speak again.'
          );
        } else {
          setVoiceError(
            lang === 'hi'
              ? 'आवाज़ पहचानने में समस्या आई। कृपया दोबारा प्रयास करें।'
              : 'Could not recognize voice. Please try again.'
          );
        }
      },
      onEnd: () => {
        setIsListening(false);
      },
    });

    recognitionRef.current = recognition;
  };

  // Toggle Text-to-Speech playback for a message
  const handleToggleSpeech = (msgId, text) => {
    if (speakingMessageId === msgId) {
      stopSpeaking();
      setSpeakingMessageId(null);
      return;
    }

    setSpeakingMessageId(msgId);
    speakText({
      text,
      lang,
      rate: 0.92,
      onStart: () => setSpeakingMessageId(msgId),
      onEnd: () => setSpeakingMessageId(null),
      onError: () => setSpeakingMessageId(null),
    });
  };

  const handleExampleClick = (exampleQuery) => {
    setInputQuestion(exampleQuery);
    handleSend(exampleQuery);
  };

  const exampleQuestions = [
    { hi: 'लखनऊ में आज गेहूं का भाव क्या है?', en: 'Aaj gehun ka bhav kya hai?' },
    { hi: 'लखनऊ में गेहूं का भाव पिछले 7 दिन में बढ़ा या घटा?', en: 'Pichhle 7 din mein bhav badha ya ghata?' },
    { hi: 'लुधियाना में टमाटर की विभिन्न मंडियों के भाव की तुलना करें।', en: 'Mandi ke bhav compare karo.' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 flex flex-col h-[calc(100vh-140px)] min-h-[580px]">
      <PageHeader
        title={lang === 'hi' ? 'किसान सहायक (Kisan Sahayak)' : 'Kisan Sahayak (Gemma 4)'}
        subtitle={
          lang === 'hi'
            ? 'बोलकर या लिखकर अपनी भाषा में मंडी भाव व रुझान पूछें। केवल सत्यापित सरकारी डेटा पर आधारित।'
            : 'Ask mandi rates and trends by speaking or typing. Powered by verified official data.'
        }
        badge="Voice Enabled • Gemma 4"
      />

      {/* Chat Container */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm flex flex-col flex-1 overflow-hidden">
        {/* Chat Header Note & Voice Toggle */}
        <div className="bg-[#0f3d24] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#166534] flex items-center justify-center text-[#22c55e]">
              <Bot size={18} />
            </div>
            <div>
              <h4 className="font-bold text-sm">
                {lang === 'hi' ? 'MandiDarpan किसान सहायक' : 'MandiDarpan Kisan Sahayak'}
              </h4>
              <p className="text-[11px] text-emerald-200">
                {lang === 'hi' ? 'बोलकर पूछें और बोलकर सुनें' : 'Two-way Voice Assistant'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-Speak Toggle Button */}
            {isSpeechSynthesisSupported() && (
              <button
                type="button"
                onClick={() => {
                  const nextState = !autoSpeak;
                  setAutoSpeak(nextState);
                  if (!nextState) stopSpeaking();
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 border ${
                  autoSpeak
                    ? 'bg-[#22c55e] text-gray-950 border-[#22c55e] shadow-sm'
                    : 'bg-[#166534] text-emerald-100 hover:bg-[#1e4620] border-emerald-500/40'
                }`}
                title={lang === 'hi' ? 'जवाब अपने आप बोलकर सुनाएं' : 'Auto read-out AI answers'}
              >
                {autoSpeak ? <Volume2 size={13} /> : <VolumeX size={13} />}
                <span className="hidden sm:inline">
                  {autoSpeak
                    ? lang === 'hi'
                      ? '🔊 बोलकर सुनाना चालू'
                      : '🔊 Auto-Voice ON'
                    : lang === 'hi'
                    ? 'आवाज़ बंद'
                    : 'Voice OFF'}
                </span>
              </button>
            )}

            <span className="text-xs bg-[#166534] px-2.5 py-1 rounded-full text-emerald-100 font-semibold border border-emerald-500/40">
              {lang === 'hi' ? 'सक्रिय' : 'Active'}
            </span>
          </div>
        </div>

        {/* Voice Error Banner */}
        {voiceError && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="text-amber-600 flex-shrink-0" />
              <span>{voiceError}</span>
            </div>
            <button
              type="button"
              onClick={() => setVoiceError(null)}
              className="text-amber-700 hover:text-amber-900 font-bold px-2 py-0.5 rounded"
            >
              ✕
            </button>
          </div>
        )}

        {/* Messages Scroll Area */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 bg-[#f8faf7]/50">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const isSpeakingThis = speakingMessageId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] md:max-w-[75%] ${
                  isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isUser ? 'bg-[#166534] text-white' : 'bg-[#0f3d24] text-[#22c55e]'
                  }`}
                >
                  {isUser ? <User size={16} /> : <Bot size={16} />}
                </div>

                <div className="space-y-1">
                  <div
                    className={`p-4 rounded-2xl text-sm leading-relaxed ${
                      isUser
                        ? 'bg-[#166534] text-white rounded-tr-none shadow-sm'
                        : msg.isError
                        ? 'bg-rose-50 text-rose-900 border border-rose-200 rounded-tl-none'
                        : 'bg-white text-gray-800 border border-gray-200/90 rounded-tl-none shadow-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>

                  {/* Message Meta & Read Aloud Button */}
                  <div
                    className={`flex items-center gap-2 text-[10px] text-gray-400 px-1 ${
                      isUser ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <span>{msg.timestamp}</span>

                    {/* Listen Button for AI Responses */}
                    {!isUser && isSpeechSynthesisSupported() && (
                      <button
                        type="button"
                        onClick={() => handleToggleSpeech(msg.id, msg.text)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold transition ${
                          isSpeakingThis
                            ? 'bg-[#166534] text-white animate-pulse'
                            : 'bg-gray-100 hover:bg-emerald-100 text-gray-700 hover:text-emerald-800'
                        }`}
                        title={isSpeakingThis ? 'बोलना रोकें' : 'बोलकर सुनें'}
                      >
                        {isSpeakingThis ? (
                          <>
                            <VolumeX size={11} />
                            <span>{lang === 'hi' ? 'रुकें' : 'Stop'}</span>
                          </>
                        ) : (
                          <>
                            <Volume2 size={11} className="text-[#166534]" />
                            <span>{lang === 'hi' ? 'बोलकर सुनें' : 'Listen'}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Active Listening Animated Banner */}
          {isListening && (
            <div className="flex gap-3 max-w-[80%] mr-auto animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center flex-shrink-0 animate-pulse">
                <Mic size={16} />
              </div>
              <div className="bg-rose-50 border border-rose-300 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-4 bg-rose-600 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-6 bg-rose-600 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                  <span className="w-1.5 h-3 bg-rose-600 rounded-full animate-bounce [animation-delay:0.3s]"></span>
                </div>
                <div>
                  <h5 className="text-xs font-black text-rose-950">
                    {lang === 'hi' ? '🎙️ बोलिए, किसान सहायक सुन रहा है...' : '🎙️ Listening... speak your question now'}
                  </h5>
                  <p className="text-[11px] text-rose-700">
                    {lang === 'hi'
                      ? 'उदाहरण: "लखनऊ में आज टमाटर का भाव क्या है?"'
                      : 'e.g. "Lucknow mein gehun ka kya bhav hai?"'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleListening}
                  className="ml-auto text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-200 px-2.5 py-1 rounded-lg"
                >
                  {lang === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
              </div>
            </div>
          )}

          {/* Loading Indicator in Chat */}
          {loading && (
            <div className="flex gap-3 max-w-[80%] mr-auto">
              <div className="w-8 h-8 rounded-full bg-[#0f3d24] text-[#22c55e] flex items-center justify-center flex-shrink-0">
                <Bot size={16} />
              </div>
              <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-200 shadow-sm flex items-center gap-2 text-xs text-gray-600 font-medium">
                <RefreshCw size={15} className="animate-spin text-[#166534]" />
                <span>
                  {lang === 'hi'
                    ? 'किसान सहायक उत्तर तैयार कर रहा है (सत्यापित सरकारी डेटा विश्लेषण)...'
                    : 'Kisan Sahayak is generating answer from verified mandi records...'}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="font-bold text-gray-500 whitespace-nowrap flex items-center gap-1">
            <HelpCircle size={13} />
            {lang === 'hi' ? 'सुझाए गए प्रश्न:' : 'Example Questions:'}
          </span>
          {exampleQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleExampleClick(lang === 'hi' ? q.hi : q.en)}
              className="px-3 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-gray-200 rounded-full font-medium text-gray-700 whitespace-nowrap transition shadow-2xs"
            >
              {lang === 'hi' ? q.hi : q.en}
            </button>
          ))}
        </div>

        {/* Input Bar with Voice Input (Mic) and Send */}
        <div className="p-3 md:p-4 bg-white border-t border-gray-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            {/* Prominent Microphone Voice Input Button */}
            <button
              type="button"
              onClick={handleToggleListening}
              className={`p-3 rounded-2xl font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-200'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-[#166534] border border-emerald-200'
              }`}
              title={
                isListening
                  ? lang === 'hi'
                    ? 'सुनना बंद करें'
                    : 'Stop Listening'
                  : lang === 'hi'
                  ? 'बोलकर पूछें (Voice Input)'
                  : 'Speak Question (Mic)'
              }
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              <span className="text-xs font-black hidden sm:inline">
                {isListening
                  ? lang === 'hi'
                    ? 'सुन रहा हूँ...'
                    : 'Listening...'
                  : lang === 'hi'
                  ? 'बोलकर पूछें'
                  : 'Speak'}
              </span>
            </button>

            {/* Question Text Input */}
            <input
              type="text"
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              placeholder={
                lang === 'hi'
                  ? 'सवाल लिखें या माइक 🎙️ दबाकर बोलें...'
                  : 'Type question or tap 🎙️ mic to speak...'
              }
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-2xl text-sm font-medium text-gray-800 focus:bg-white focus:ring-2 focus:ring-[#166534] outline-none transition"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={loading || !inputQuestion.trim()}
              className="p-3 bg-[#166534] hover:bg-[#0f3d24] active:scale-95 text-white rounded-2xl shadow transition disabled:opacity-40 cursor-pointer"
              title="Send question"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
