import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

export const useSpeechToText = (options = {}) => {
  const { lang = 'en-IN', onResult, onInterimResult, onEnd } = options;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  
  const recognitionRef = useRef(null);

  // Avoid stale closures in event listeners
  const onResultRef = useRef(onResult);
  const onInterimResultRef = useRef(onInterimResult);
  const onEndRef = useRef(onEnd);

  // Keep refs always up-to-date
  useEffect(() => {
    onResultRef.current = onResult;
    onInterimResultRef.current = onInterimResult;
    onEndRef.current = onEnd;
  });

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Web Speech API is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setError(event.error);
      setIsListening(false);
      
      let msg = '';
      if (event.error === 'not-allowed') {
        msg = 'Microphone permission denied. Please allow mic access in your browser.';
      } else if (event.error === 'no-speech') {
        msg = 'No speech detected. Please speak clearly into your mic.';
      } else if (event.error === 'network') {
        msg = 'Speech recognition network error. Please check your connection.';
      }
      if (msg) {
        toast.error(msg);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (onEndRef.current) onEndRef.current();
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const text = finalTranscript || interimTranscript;
      setTranscript(text);

      if (finalTranscript) {
        if (onResultRef.current) onResultRef.current(finalTranscript);
      } else if (interimTranscript) {
        if (onInterimResultRef.current) onInterimResultRef.current(interimTranscript);
      }
    };

    recognitionRef.current = recognition;
  }, [lang]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        setTranscript('');
        recognitionRef.current.start();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    isSupported: !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  };
};
