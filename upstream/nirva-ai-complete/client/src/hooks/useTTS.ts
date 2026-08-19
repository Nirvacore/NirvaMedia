import { useState, useEffect, useCallback, useRef } from "react";

export interface TTSOptions {
  rate?: number; // 0.5 - 2.0 (default 0.9 for friendly pace)
  pitch?: number; // 0.5 - 2.0 (default 1.1 for warm tone)
  volume?: number; // 0 - 1 (default 1)
  voiceName?: string; // preferred voice name
  lang?: string; // BCP 47 language tag
}

export interface TTSState {
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  currentVoice: SpeechSynthesisVoice | null;
}

export function useTTS(options: TTSOptions = {}) {
  const {
    rate = 0.9,
    pitch = 1.1,
    volume = 1,
    voiceName,
    lang = "th-TH",
  } = options;

  const [state, setState] = useState<TTSState>({
    isSpeaking: false,
    isPaused: false,
    isSupported: typeof window !== "undefined" && "speechSynthesis" in window,
    voices: [],
    currentVoice: null,
  });

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load available voices
  useEffect(() => {
    if (!state.isSupported) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        // Find best voice: prefer specified name, then language match, then default
        let selectedVoice: SpeechSynthesisVoice | null = null;

        if (voiceName) {
          selectedVoice = availableVoices.find((v) => v.name === voiceName) || null;
        }

        if (!selectedVoice) {
          // Try to find a female/friendly voice in the target language
          const langVoices = availableVoices.filter((v) =>
            v.lang.startsWith(lang.split("-")[0])
          );
          // Prefer voices with "female", "woman", or soft-sounding names
          const friendlyVoice = langVoices.find(
            (v) =>
              v.name.toLowerCase().includes("female") ||
              v.name.toLowerCase().includes("woman") ||
              v.name.toLowerCase().includes("samantha") ||
              v.name.toLowerCase().includes("karen") ||
              v.name.toLowerCase().includes("kanya") ||
              v.name.toLowerCase().includes("google")
          );
          selectedVoice = friendlyVoice || langVoices[0] || availableVoices[0];
        }

        setState((prev) => ({
          ...prev,
          voices: availableVoices,
          currentVoice: selectedVoice,
        }));
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [state.isSupported, voiceName, lang]);

  // Speak text
  const speak = useCallback(
    (text: string) => {
      if (!state.isSupported || !text.trim()) return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;
      utterance.lang = lang;

      if (state.currentVoice) {
        utterance.voice = state.currentVoice;
      }

      utterance.onstart = () => {
        setState((prev) => ({ ...prev, isSpeaking: true, isPaused: false }));
      };

      utterance.onend = () => {
        setState((prev) => ({ ...prev, isSpeaking: false, isPaused: false }));
      };

      utterance.onerror = () => {
        setState((prev) => ({ ...prev, isSpeaking: false, isPaused: false }));
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [state.isSupported, state.currentVoice, rate, pitch, volume, lang]
  );

  // Pause speech
  const pause = useCallback(() => {
    if (state.isSupported && state.isSpeaking) {
      window.speechSynthesis.pause();
      setState((prev) => ({ ...prev, isPaused: true }));
    }
  }, [state.isSupported, state.isSpeaking]);

  // Resume speech
  const resume = useCallback(() => {
    if (state.isSupported && state.isPaused) {
      window.speechSynthesis.resume();
      setState((prev) => ({ ...prev, isPaused: false }));
    }
  }, [state.isSupported, state.isPaused]);

  // Stop speech
  const stop = useCallback(() => {
    if (state.isSupported) {
      window.speechSynthesis.cancel();
      setState((prev) => ({ ...prev, isSpeaking: false, isPaused: false }));
    }
  }, [state.isSupported]);

  // Set voice by name
  const setVoice = useCallback(
    (name: string) => {
      const voice = state.voices.find((v) => v.name === name) || null;
      setState((prev) => ({ ...prev, currentVoice: voice }));
    },
    [state.voices]
  );

  return {
    ...state,
    speak,
    pause,
    resume,
    stop,
    setVoice,
  };
}
