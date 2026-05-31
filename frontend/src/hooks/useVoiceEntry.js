import { useLanguage } from '../context/LanguageContext';

const useVoiceEntry = () => {
  const { lang } = useLanguage();

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const isSupported = !!SpeechRecognition;

  const startListening = () => {
    return new Promise((resolve, reject) => {
      if (!isSupported) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim();
        const parsed = parseVoiceInput(transcript);
        resolve({ transcript, ...parsed });
      };

      recognition.onerror = (event) => {
        reject(new Error(event.error));
      };

      recognition.onend = () => {};

      recognition.start();
    });
  };

  /**
   * Parse voice input to extract customer name, amount, and type.
   * Supports patterns like:
   * - "Ramesh ko 500 ka udhar"
   * - "Ramesh 500 udhaar"
   * - "500 rupees from Suresh"
   * - "Suresh ne 300 diye" (jama)
   */
  const parseVoiceInput = (text) => {
    const result = { customerName: '', amount: 0, type: 'credit' };
    const lower = text.toLowerCase();

    // Extract amount (find numbers)
    const amountMatch = lower.match(/(\d+(?:\.\d+)?)/);
    if (amountMatch) {
      result.amount = parseFloat(amountMatch[1]);
    }

    // Determine type
    const jamaKeywords = ['jama', 'payment', 'paid', 'received', 'mila', 'diye', 'diya', 'got', 'bhugtan'];
    const udhaarKeywords = ['udhar', 'udhaar', 'credit', 'gave', 'diya udhar', 'liya'];

    if (jamaKeywords.some(k => lower.includes(k))) {
      result.type = 'debit';
    } else if (udhaarKeywords.some(k => lower.includes(k))) {
      result.type = 'credit';
    }

    // Extract name — try patterns
    // "Name ko amount" or "Name amount"
    const hindiPattern = /^(\w+(?:\s+\w+)?)\s+(?:ko|ka|se|ne)\s+\d/i;
    const englishPattern = /(?:from|to)\s+(\w+(?:\s+\w+)?)/i;
    const simplePattern = /^(\w+(?:\s+\w+)?)\s+\d/i;

    let nameMatch = lower.match(hindiPattern) || lower.match(englishPattern) || lower.match(simplePattern);
    if (nameMatch) {
      result.customerName = nameMatch[1].trim();
      // Capitalize first letter
      result.customerName = result.customerName.charAt(0).toUpperCase() + result.customerName.slice(1);
    }

    return result;
  };

  return { isSupported, startListening };
};

export default useVoiceEntry;
