import { useState, useEffect, useRef } from 'react';
import API from '../../api/axios';
import { useLanguage } from '../../context/LanguageContext';
import { useSpeechToText } from '../../hooks/useSpeechToText';
import { 
  HiOutlineChatAlt2, HiOutlineX, HiOutlinePaperAirplane, 
  HiOutlineMicrophone, HiOutlineSparkles, HiOutlineLightBulb 
} from 'react-icons/hi';
import { toast } from 'react-toastify';

const AIChatAssistant = () => {
  const { t, lang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [firstCustomerName, setFirstCustomerName] = useState('Ravi');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const fetchFirstCustomer = async () => {
      try {
        const { data } = await API.get('/customers?limit=1');
        if (data.data && data.data.length > 0) {
          setFirstCustomerName(data.data[0].name);
        }
      } catch (err) {
        // Fallback
      }
    };
    fetchFirstCustomer();
  }, []);

  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        sender: 'ai',
        text: 'Hello! I am KathaGPT. 🤖\n\nYou can ask me questions about your ledger, like:',
        suggestions: [
          `How much udhar does customer have?`,
          'Show this month collection',
          'Who has highest due?',
          'Who are the risky customers?'
        ],
        time: new Date()
      }
    ]);
  }, [firstCustomerName]);
  const [speechLangOverride, setSpeechLangOverride] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkServer = async () => {
      try {
        await API.get('/transactions/stats');
        setIsOnline(true);
      } catch (err) {
        setIsOnline(false);
      }
    };
    checkServer();
    const interval = setInterval(checkServer, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // Set up speech to text for assistant
  // Use Indian locales based on active app language or selection override
  const speechLang = speechLangOverride || (lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN');
  
  const {
    isListening,
    startListening,
    stopListening,
    isSupported: isSpeechSupported
  } = useSpeechToText({
    lang: speechLang,
    onResult: (text) => {
      setInputValue(text);
      handleSendMessage(text);
    },
    onInterimResult: (text) => {
      setInputValue(text);
    },
    onEnd: () => {
      // Done listening
    }
  });

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);



  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputValue).trim();
    if (!text) return;

    // Add user message
    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      time: new Date()
    };
    const historyToSend = messages
      .filter(m => m.id !== 'welcome')
      .slice(-6)
      .map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const { data } = await API.post('/ai/chat', { 
        message: text,
        history: historyToSend,
        lang: lang
      });
      setIsOnline(true);
      
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.response,
        suggestions: data.suggestions || [],
        time: new Date()
      };
      
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setIsOnline(false);
      toast.error('KathaGPT is currently offline');
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: 'Sorry, I am having trouble connecting right now. Please try again later.',
        time: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    handleSendMessage(suggestion);
  };

  // Helper to parse double asterisks and bullet points
  const renderMessageText = (text) => {
    return text.split('\n').map((line, lineIdx) => {
      let content = line;
      
      // Check for bullet points
      const isBullet = content.startsWith('* ') || content.startsWith('- ');
      if (isBullet) {
        content = content.substring(2);
      }

      // Check for bold text **text**
      const parts = content.split('**');
      const renderedLine = parts.map((part, idx) => {
        if (idx % 2 === 1) {
          return <strong key={idx} className="font-extrabold text-deep-navy">{part}</strong>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <li key={lineIdx} className="ml-4 list-disc text-xs leading-relaxed my-0.5 text-deep-navy/80">
            {renderedLine}
          </li>
        );
      }

      return (
        <p key={lineIdx} className="text-xs leading-relaxed my-1 text-deep-navy/80">
          {renderedLine}
        </p>
      );
    });
  };

  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-tr from-orange to-orange-hover hover:from-orange-hover hover:to-orange text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-105 border-none cursor-pointer group"
        title="KathaGPT"
        id="ai-chat-btn"
      >
        {isOpen ? (
          <HiOutlineX size={26} className="animate-in spin-in-90 duration-200" />
        ) : (
          <div className="relative">
            <HiOutlineChatAlt2 size={26} className="group-hover:scale-110 transition-transform" />
          </div>
        )}
      </button>

      {/* Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-deep-navy/30 backdrop-blur-xs flex justify-end transition-opacity duration-300">
          {/* Backdrop Closer */}
          <div className="absolute inset-0" onClick={() => setIsOpen(false)} />
          
          {/* Chat Window */}
          <div className="relative w-full max-w-md h-full bg-pure-white shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="px-5 py-4 bg-[#0f172a] text-white flex items-center justify-between shadow-md border-b border-soft-gray/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange/20 border border-orange/30 flex items-center justify-center text-orange">
                  <HiOutlineSparkles size={20} className="animate-pulse" />
                </div>
                <div>
                  <span className="text-sm font-bold m-0 flex items-center gap-1.5 text-white" style={{ color: '#ffffff' }}>
                    KathaGPT
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="bg-transparent border-none text-white/80 hover:text-white cursor-pointer p-1.5 rounded-lg hover:bg-pure-white/10 transition-colors"
                style={{ color: '#ffffff' }}
              >
                <HiOutlineX size={20} />
              </button>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-light-cream/30 scrollbar-thin scrollbar-thumb-soft-gray scrollbar-track-transparent">
              {messages.map((msg) => {
                const isAI = msg.sender === 'ai';
                return (
                  <div key={msg.id} className={`flex flex-col ${isAI ? 'items-start' : 'items-end'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-xs border transition-all ${
                      isAI 
                        ? 'bg-gradient-to-br from-pure-white to-light-cream border-soft-gray/40 rounded-tl-none text-deep-navy' 
                        : 'bg-gradient-to-br from-orange to-orange-hover text-white border-transparent rounded-tr-none'
                    }`}>
                      {isAI ? (
                        <div className="space-y-1">
                          {renderMessageText(msg.text)}
                        </div>
                      ) : (
                        <p className="text-xs leading-relaxed m-0">{msg.text}</p>
                      )
                    }
                    </div>
                    <span className="text-[9px] text-slate-gray/60 font-semibold mt-0.5 px-1.5">
                      {new Date(msg.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>

                    {/* Suggestions (AI Only) */}
                    {isAI && msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5 max-w-[90%]">
                        {msg.suggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="px-3 py-1.5 bg-pure-white hover:bg-orange/5 text-orange hover:text-orange-hover border border-orange/20 rounded-full text-[10px] font-bold transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1 hover:-translate-y-0.5"
                          >
                            <HiOutlineLightBulb size={12} className="shrink-0" />
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {loading && (
                <div className="flex items-start">
                  <div className="bg-gradient-to-br from-pure-white to-light-cream border border-soft-gray/40 rounded-2xl rounded-tl-none px-4.5 py-3 shadow-xs flex flex-col gap-1.5 min-w-[100px] animate-pulse">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-orange rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-orange rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-orange rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[10px] text-slate-gray/60 font-black tracking-wider uppercase">
                      {lang === 'hi' ? 'सोच रहा हूँ...' : lang === 'te' ? 'ఆలోచిస్తున్నాను...' : 'Thinking...'}
                    </span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-soft-gray bg-pure-white flex flex-col gap-2.5 shadow-lg">
              {isListening && (
                <div className="flex items-center gap-2 px-3.5 py-2 bg-red-give/10 border border-red-give/20 rounded-xl animate-pulse">
                  <span className="w-2.5 h-2.5 bg-red-give rounded-full animate-ping" />
                  <span className="text-[10px] font-black text-red-give tracking-wider uppercase">
                    {speechLang === 'hi-IN' ? 'सुन रहा हूँ... बोलिए' : speechLang === 'te-IN' ? 'వింటున్నాను... మాట్లాడండి' : 'KathaGPT is Listening... Speak Now'}
                  </span>
                </div>
              )}

              {/* Speech Language Selector Pill Row */}
              {isSpeechSupported && (
                <div className="flex items-center justify-between text-[10px] text-slate-gray/70 px-1 select-none">
                  <span className="font-semibold">Speech Language:</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSpeechLangOverride('en-IN')}
                      className={`px-2 py-0.5 rounded-md border font-extrabold cursor-pointer transition-all ${
                        speechLang === 'en-IN' ? 'bg-orange text-white border-orange shadow-xs scale-105' : 'bg-soft-white text-slate-gray border-soft-gray/50 hover:bg-orange/5 hover:text-orange'
                      }`}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpeechLangOverride('hi-IN')}
                      className={`px-2 py-0.5 rounded-md border font-extrabold cursor-pointer transition-all ${
                        speechLang === 'hi-IN' ? 'bg-orange text-white border-orange shadow-xs scale-105' : 'bg-soft-white text-slate-gray border-soft-gray/50 hover:bg-orange/5 hover:text-orange'
                      }`}
                    >
                      हिन्दी
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpeechLangOverride('te-IN')}
                      className={`px-2 py-0.5 rounded-md border font-extrabold cursor-pointer transition-all ${
                        speechLang === 'te-IN' ? 'bg-orange text-white border-orange shadow-xs scale-105' : 'bg-soft-white text-slate-gray border-soft-gray/50 hover:bg-orange/5 hover:text-orange'
                      }`}
                    >
                      తెలుగు
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2.5 w-full">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={isListening ? (lang === 'hi' ? 'बोलिए...' : lang === 'te' ? 'మాట్లాడండి...' : 'Listening...') : "Ask about your shop ledger..."}
                  disabled={loading || isListening}
                  className="flex-1 px-4.5 py-3 bg-light-cream border border-transparent rounded-xl text-xs outline-none focus:bg-pure-white focus:border-orange/50 focus:ring-4 focus:ring-orange/10 transition-all placeholder:text-slate-gray/40 text-deep-navy font-medium"
                />
                
                {isSpeechSupported && (
                  <button
                    onClick={toggleMic}
                    disabled={loading}
                    className={`p-3 rounded-xl border-none cursor-pointer transition-all flex items-center justify-center shadow-xs ${
                      isListening 
                        ? 'bg-red-give text-white animate-pulse' 
                        : 'bg-soft-white hover:bg-orange/10 text-slate-gray hover:text-orange'
                    }`}
                    title={isListening ? "Stop Listening" : "Speech Input (Telugu/Hindi/English)"}
                  >
                    {isListening ? <HiOutlineX size={18} /> : <HiOutlineMicrophone size={18} />}
                  </button>
                )}

                <button
                  onClick={() => handleSendMessage()}
                  disabled={loading || isListening || !inputValue.trim()}
                  className="p-3 bg-orange hover:bg-orange-hover disabled:bg-soft-gray/50 disabled:text-slate-gray/30 text-white rounded-xl border-none cursor-pointer transition-all flex items-center justify-center shadow-md hover:shadow-lg disabled:shadow-none hover:-translate-y-0.5 active:translate-y-0"
                >
                  <HiOutlinePaperAirplane size={18} className="rotate-45" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatAssistant;
