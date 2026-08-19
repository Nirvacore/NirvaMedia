import Sidebar from "@/components/Sidebar";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTTS } from "@/hooks/useTTS";
import { useVoiceNavigation } from "@/hooks/useVoiceNavigation";
import { executeMorningActions } from "@/lib/api";
import {
  Mic,
  MicOff,
  Sparkles,
  Waves,
  Zap,
  Globe,
  Volume2,
  VolumeX,
  Settings2,
  X,
  Pause,
  Play,
  Radio,
  CircleDot,
  Navigation,
} from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";

type VoiceState = "idle" | "listening" | "processing" | "speaking" | "done" | "continuous" | "navigating";

interface CommandResult {
  input: string;
  output: string;
  timestamp: Date;
  isSpoken: boolean;
  isNavigation?: boolean;
}

// Wake words that trigger command mode
const WAKE_WORDS = [
  "hey nirva",
  "เฮ้ เนอร์ว่า",
  "เฮ้เนอร์ว่า",
  "เฮ เนอวา",
  "เฮ้ นีวา",
  "เฮ้นีวา",
  "hi nirva",
  "nirva",
  "เนอร์ว่า",
  "นีวา",
];

// AI response generator — simulates friendly AI responses
function generateAIResponse(input: string, lang: string): string {
  const lowerInput = input.toLowerCase();

  // Thai responses
  if (lang.startsWith("th")) {
    if (lowerInput.includes("เว็บ") || lowerInput.includes("website"))
      return "ได้เลยค่ะ! กำลังสร้างเว็บไซต์ให้คุณ... ใช้เวลาสักครู่นะคะ จะทำให้สวยที่สุดเลย";
    if (lowerInput.includes("บั๊ก") || lowerInput.includes("bug") || lowerInput.includes("แก้"))
      return "เข้าใจค่ะ กำลังตรวจสอบโค้ดให้... เจอปัญหาแล้วค่ะ กำลังแก้ไขให้เดี๋ยวนี้เลย";
    if (lowerInput.includes("สรุป") || lowerInput.includes("summary"))
      return "ได้ค่ะ กำลังอ่านและสรุปให้... โค้ดนี้เป็นระบบจัดการข้อมูล มีฟังก์ชันหลัก 3 ส่วนค่ะ";
    if (lowerInput.includes("ฐานข้อมูล") || lowerInput.includes("database"))
      return "กำลังออกแบบฐานข้อมูลให้ค่ะ จะสร้างตารางหลักพร้อม index ที่เหมาะสม รอสักครู่นะคะ";
    if (lowerInput.includes("api") || lowerInput.includes("เอพีไอ"))
      return "ได้เลยค่ะ! กำลังเขียน API ให้... จะทำทั้ง endpoint, validation, และ documentation ให้ครบเลยนะคะ";
    if (lowerInput.includes("จัดการให้") || lowerInput.includes("สรุปเช้า"))
      return "ได้ค่ะ! กำลังสรุปงานวันนี้และมอบหมายให้ทีม Agent... ตรวจสอบที่หน้าหลักและ Tasks นะคะ";
    if (lowerInput.includes("หยุด") || lowerInput.includes("stop"))
      return "หยุดฟังแล้วค่ะ เรียกอีกครั้งเมื่อต้องการนะคะ";
    return "รับทราบค่ะ! กำลังทำให้เลย... ถ้ามีอะไรเพิ่มเติมบอกได้ตลอดนะคะ";
  }

  // English responses
  if (lowerInput.includes("website") || lowerInput.includes("web"))
    return "Got it! I'm building your website now. Give me a moment — I'll make it beautiful for you.";
  if (lowerInput.includes("bug") || lowerInput.includes("fix"))
    return "I see the issue! I'm analyzing the code now and fixing it. Should be done in just a moment.";
  if (lowerInput.includes("summar") || lowerInput.includes("explain"))
    return "Let me read through this for you. This code handles data management with three main functions.";
  if (lowerInput.includes("database") || lowerInput.includes("db"))
    return "I'm designing the database schema now. I'll set up the tables with proper indexes and relationships.";
  if (lowerInput.includes("api"))
    return "On it! I'm writing the API with endpoints, validation, and full documentation.";
  if (lowerInput.includes("stop"))
    return "Stopped listening. Call me again when you need me.";
  return "Understood! I'm working on it now. Feel free to ask if you need anything else.";
}

// Check if text contains a wake word
function detectWakeWord(text: string): { detected: boolean; command: string } {
  const lowerText = text.toLowerCase().trim();

  for (const wake of WAKE_WORDS) {
    const wakeIndex = lowerText.indexOf(wake);
    if (wakeIndex !== -1) {
      // Extract command after wake word
      const afterWake = text.slice(wakeIndex + wake.length).trim();
      return { detected: true, command: afterWake };
    }
  }
  return { detected: false, command: "" };
}

export default function Voice() {
  const { t, speechLocale, locale } = useLanguage();
  const [state, setState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [results, setResults] = useState<CommandResult[]>([]);
  const [isSupported, setIsSupported] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [ttsRate, setTtsRate] = useState(0.9);
  const [ttsPitch, setTtsPitch] = useState(1.1);
  const [continuousMode, setContinuousMode] = useState(false);
  const [wakeWordDetected, setWakeWordDetected] = useState(false);
  const [continuousTranscript, setContinuousTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");
  const continuousModeRef = useRef(false);
  const isProcessingRef = useRef(false);

  const tts = useTTS({
    rate: ttsRate,
    pitch: ttsPitch,
    lang: speechLocale,
  });

  const { tryNavigate } = useVoiceNavigation();

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  // Keep refs in sync
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    continuousModeRef.current = continuousMode;
  }, [continuousMode]);

  const processCommand = useCallback(
    (input: string) => {
      if (!input.trim() || isProcessingRef.current) return;
      isProcessingRef.current = true;

      // ===== VOICE NAVIGATION CHECK =====
      const navResult = tryNavigate(input);
      if (navResult.navigated) {
        setState("navigating");
        const navResponse = locale === "th"
          ? `กำลังพาไปที่ ${navResult.destination} ค่ะ`
          : `Navigating to ${navResult.destination}`;

        const newResult: CommandResult = {
          input,
          output: navResponse,
          timestamp: new Date(),
          isSpoken: ttsEnabled,
          isNavigation: true,
        };
        setResults((prev) => [newResult, ...prev]);

        if (ttsEnabled && tts.isSupported) {
          tts.speak(navResponse);
        }

        // Reset state after navigation
        setTimeout(() => {
          isProcessingRef.current = false;
          setState("idle");
        }, 1500);
        return;
      }
      // ===== END VOICE NAVIGATION =====

      // ===== MORNING "จัดการให้" =====
      if (/จัดการให้|handle it|morning briefing|สรุปเช้า/i.test(input)) {
        setState("processing");
        executeMorningActions()
          .then((result) => {
            const response = result.messageTh;
            const newResult: CommandResult = {
              input,
              output: response,
              timestamp: new Date(),
              isSpoken: ttsEnabled,
            };
            setResults((prev) => [newResult, ...prev]);
            if (ttsEnabled && tts.isSupported) {
              setState("speaking");
              tts.speak(response);
              const checkSpeaking = setInterval(() => {
                if (!window.speechSynthesis.speaking) {
                  clearInterval(checkSpeaking);
                  isProcessingRef.current = false;
                  setState(continuousModeRef.current ? "continuous" : "done");
                  if (continuousModeRef.current) startContinuousListening();
                  else setTimeout(() => setState("idle"), 1500);
                }
              }, 200);
            } else {
              isProcessingRef.current = false;
              setState("done");
              setTimeout(() => setState("idle"), 2000);
            }
          })
          .catch(() => {
            isProcessingRef.current = false;
            setState("idle");
          });
        return;
      }
      // ===== END MORNING =====

      setState("processing");
      setWakeWordDetected(false);

      const thinkTime = 800 + Math.random() * 1200;
      setTimeout(() => {
        const response = generateAIResponse(input, speechLocale);
        const newResult: CommandResult = {
          input,
          output: response,
          timestamp: new Date(),
          isSpoken: ttsEnabled,
        };
        setResults((prev) => [newResult, ...prev]);

        if (ttsEnabled && tts.isSupported) {
          setState("speaking");
          tts.speak(response);
          const checkSpeaking = setInterval(() => {
            if (!window.speechSynthesis.speaking) {
              clearInterval(checkSpeaking);
              isProcessingRef.current = false;
              // If continuous mode is on, go back to listening
              if (continuousModeRef.current) {
                setState("continuous");
                startContinuousListening();
              } else {
                setState("done");
                setTimeout(() => setState("idle"), 1500);
              }
            }
          }, 200);
        } else {
          isProcessingRef.current = false;
          if (continuousModeRef.current) {
            setState("continuous");
            setTimeout(() => startContinuousListening(), 500);
          } else {
            setState("done");
            setTimeout(() => setState("idle"), 2000);
          }
        }
      }, thinkTime);
    },
    [speechLocale, ttsEnabled, tts, tryNavigate, locale]
  );

  // === CONTINUOUS LISTENING MODE ===
  const startContinuousListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition || isProcessingRef.current) return;

    // Stop any existing recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }

    const recognition = new SpeechRecognition();
    recognition.lang = speechLocale;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (!isProcessingRef.current) {
        setState("continuous");
      }
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const currentText = finalTranscript || interimTranscript;
      setContinuousTranscript(currentText);

      // Check for wake word in final transcript
      if (finalTranscript) {
        const { detected, command } = detectWakeWord(finalTranscript);
        if (detected) {
          setWakeWordDetected(true);
          setContinuousTranscript("");

          // If there's a command after the wake word, process it
          if (command.trim()) {
            setTranscript(command);
            recognition.stop();
            processCommand(command);
          } else {
            // Wake word detected but no command yet — switch to active listening
            setTranscript("");
            recognition.stop();
            startActiveListening();
          }
        }
      }
    };

    recognition.onend = () => {
      // Auto-restart if still in continuous mode and not processing
      if (continuousModeRef.current && !isProcessingRef.current) {
        setTimeout(() => {
          if (continuousModeRef.current && !isProcessingRef.current) {
            startContinuousListening();
          }
        }, 300);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech" || event.error === "aborted") {
        // Auto-restart on no-speech in continuous mode
        if (continuousModeRef.current && !isProcessingRef.current) {
          setTimeout(() => {
            if (continuousModeRef.current && !isProcessingRef.current) {
              startContinuousListening();
            }
          }, 500);
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [speechLocale, processCommand]);

  // Active listening after wake word (captures the actual command)
  const startActiveListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    tts.stop();

    // Play a subtle "listening" chime via TTS
    if (ttsEnabled && tts.isSupported) {
      const ack = locale === "th" ? "ค่ะ" : "Yes?";
      tts.speak(ack);
    }

    // Wait for ack to finish, then start listening
    const startAfterAck = () => {
      const recognition = new SpeechRecognition();
      recognition.lang = speechLocale;
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setState("listening");
        setTranscript("");
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          finalTranscript += event.results[i][0].transcript;
        }
        setTranscript(finalTranscript);
      };

      recognition.onend = () => {
        const currentTranscript = transcriptRef.current;
        if (currentTranscript.trim()) {
          processCommand(currentTranscript);
        } else if (continuousModeRef.current) {
          setState("continuous");
          startContinuousListening();
        } else {
          setState("idle");
        }
      };

      recognition.onerror = () => {
        if (continuousModeRef.current) {
          setState("continuous");
          startContinuousListening();
        } else {
          setState("idle");
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    };

    // Small delay to let acknowledgment finish
    setTimeout(startAfterAck, 600);
  }, [speechLocale, processCommand, tts, ttsEnabled, locale, startContinuousListening]);

  // Toggle continuous mode
  const toggleContinuousMode = useCallback(() => {
    if (continuousMode) {
      // Turn off
      setContinuousMode(false);
      continuousModeRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      setState("idle");
      setContinuousTranscript("");
      setWakeWordDetected(false);
    } else {
      // Turn on
      setContinuousMode(true);
      continuousModeRef.current = true;
      tts.stop();
      startContinuousListening();
    }
  }, [continuousMode, startContinuousListening, tts]);

  // === SINGLE COMMAND MODE (original) ===
  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    tts.stop();

    const recognition = new SpeechRecognition();
    recognition.lang = speechLocale;
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setState("listening");
      setTranscript("");
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        finalTranscript += event.results[i][0].transcript;
      }
      setTranscript(finalTranscript);
    };

    recognition.onend = () => {
      const currentTranscript = transcriptRef.current;
      if (currentTranscript.trim()) {
        processCommand(currentTranscript);
      } else {
        setState("idle");
      }
    };

    recognition.onerror = () => {
      setState("idle");
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [speechLocale, processCommand, tts]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const handleMicClick = () => {
    if (continuousMode) {
      // In continuous mode, mic click toggles off
      toggleContinuousMode();
      return;
    }
    if (state === "listening") {
      stopListening();
    } else if (state === "idle" || state === "done") {
      startListening();
    } else if (state === "speaking") {
      tts.stop();
      setState("idle");
    }
  };

  const handleExampleClick = (example: string) => {
    const cleanText = example.replace(/"/g, "").replace(/「/g, "").replace(/」/g, "");
    setTranscript(cleanText);
    processCommand(cleanText);
  };

  const replayResponse = (text: string) => {
    if (tts.isSupported) {
      tts.speak(text);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      tts.stop();
    };
  }, []);

  const stateLabel: Record<VoiceState, string> = {
    idle: t.voiceReady,
    listening: t.voiceListening,
    processing: t.voiceProcessing,
    speaking: locale === "th" ? "กำลังพูด..." : "Speaking...",
    done: "✓",
    continuous: locale === "th" ? "กำลังฟัง... พูดว่า 'Hey Nirva'" : "Listening... say 'Hey Nirva'",
    navigating: locale === "th" ? "กำลังนำทาง..." : "Navigating...",
  };

  const stateColor: Record<VoiceState, string> = {
    idle: "bg-primary",
    listening: "bg-red-500 animate-pulse",
    processing: "bg-amber-500 animate-pulse",
    speaking: "bg-blue-500 animate-pulse",
    done: "bg-primary",
    continuous: "bg-emerald-500 animate-pulse",
    navigating: "bg-violet-500 animate-pulse",
  };

  // Navigation examples for voice nav
  const navExamples = locale === "th"
    ? [
        "\"เปิดหน้าผู้ช่วย AI\"",
        "\"ไปหน้าแผนผัง\"",
        "\"กลับหน้าหลัก\"",
        "\"เปิด Mind Map\"",
      ]
    : [
        "\"Open AI Agents\"",
        "\"Go to Mind Map\"",
        "\"Back to Dashboard\"",
        "\"Show Voice Command\"",
      ];

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 ml-[72px] flex flex-col items-center justify-center relative overflow-hidden">
        {/* Void Space Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className={`absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-[120px] animate-pulse transition-colors duration-1000 ${
            state === "navigating" ? "bg-violet-500/5" : continuousMode ? "bg-emerald-500/5" : "bg-primary/3"
          }`} />
          <div
            className={`absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px] transition-colors duration-1000 ${
              state === "navigating" ? "bg-violet-500/3" : continuousMode ? "bg-emerald-500/3" : "bg-primary/5"
            }`}
            style={{ animationDelay: "1s", animationDuration: "4s" }}
          />
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border transition-colors duration-1000 ${
            state === "navigating" ? "border-violet-500/10" : continuousMode ? "border-emerald-500/10" : "border-primary/5"
          }`} />
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border transition-colors duration-1000 ${
            state === "navigating" ? "border-violet-500/15" : continuousMode ? "border-emerald-500/15" : "border-primary/3"
          }`} />
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border transition-colors duration-1000 ${
            state === "navigating" ? "border-violet-500/10" : continuousMode ? "border-emerald-500/10" : "border-primary/5"
          }`} />
        </div>

        {/* Top Controls */}
        <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
          {/* Continuous Mode Toggle */}
          <button
            onClick={toggleContinuousMode}
            className={`p-2.5 rounded-xl backdrop-blur border transition-all duration-300 flex items-center gap-2 ${
              continuousMode
                ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                : "bg-card/80 border-border text-muted-foreground hover:border-emerald-400/30 hover:text-emerald-600"
            }`}
            title={continuousMode
              ? (locale === "th" ? "ปิดโหมดฟังต่อเนื่อง" : "Disable continuous listening")
              : (locale === "th" ? "เปิดโหมดฟังต่อเนื่อง" : "Enable continuous listening")
            }
          >
            {continuousMode ? <Radio className="w-5 h-5" /> : <CircleDot className="w-5 h-5" />}
            <span className="text-xs font-medium hidden sm:inline">
              {continuousMode
                ? (locale === "th" ? "Hey Nirva: เปิด" : "Hey Nirva: ON")
                : (locale === "th" ? "Hey Nirva" : "Hey Nirva")
              }
            </span>
          </button>

          {/* TTS Toggle */}
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className={`p-2.5 rounded-xl backdrop-blur border transition-all duration-200 ${
              ttsEnabled
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-card/80 border-border text-muted-foreground hover:border-primary/30"
            }`}
            title={ttsEnabled ? "เสียงตอบกลับ: เปิด" : "เสียงตอบกลับ: ปิด"}
          >
            {ttsEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2.5 rounded-xl bg-card/80 backdrop-blur border border-border hover:border-primary/30 transition-all duration-200"
          >
            <Settings2 className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="absolute top-16 right-6 z-30 w-80 bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">
                {locale === "th" ? "ตั้งค่าเสียง" : "Voice Settings"}
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Continuous Mode Info */}
            <div className="py-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {locale === "th" ? "ฟังต่อเนื่อง" : "Continuous Listening"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {locale === "th" ? "พูด 'Hey Nirva' เพื่อสั่งงาน" : "Say 'Hey Nirva' to command"}
                  </p>
                </div>
                <button
                  onClick={toggleContinuousMode}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                    continuousMode ? "bg-emerald-500" : "bg-muted"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                      continuousMode ? "translate-x-[22px]" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Voice Navigation Info */}
            <div className="py-3 border-b border-border">
              <div className="flex items-center gap-2 mb-1">
                <Navigation className="w-4 h-4 text-violet-500" />
                <p className="text-sm font-medium text-foreground">
                  {locale === "th" ? "นำทางด้วยเสียง" : "Voice Navigation"}
                </p>
              </div>
              <p className="text-xs text-muted-foreground pl-6">
                {locale === "th"
                  ? "พูด 'เปิดหน้า...' หรือ 'ไปที่...' เพื่อเปลี่ยนหน้า"
                  : "Say 'open...' or 'go to...' to navigate pages"}
              </p>
              <div className="mt-2 pl-6 flex flex-wrap gap-1.5">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200">
                  {locale === "th" ? "หน้าหลัก" : "Dashboard"}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200">
                  {locale === "th" ? "ผู้ช่วย AI" : "Agents"}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200">
                  {locale === "th" ? "แผนผัง" : "Mind Map"}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200">
                  {locale === "th" ? "เสียง" : "Voice"}
                </span>
              </div>
            </div>

            {/* TTS Enable Toggle */}
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {locale === "th" ? "เสียงตอบกลับ" : "Voice Response"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {locale === "th" ? "ให้ AI พูดตอบกลับ" : "Let AI speak responses"}
                </p>
              </div>
              <button
                onClick={() => setTtsEnabled(!ttsEnabled)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                  ttsEnabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                    ttsEnabled ? "translate-x-[22px]" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Speaking Rate */}
            <div className="py-3 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-foreground">
                  {locale === "th" ? "ความเร็ว" : "Speed"}
                </p>
                <span className="text-xs text-muted-foreground font-mono">{ttsRate.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={ttsRate}
                onChange={(e) => setTtsRate(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md"
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">{locale === "th" ? "ช้า" : "Slow"}</span>
                <span className="text-[10px] text-muted-foreground">{locale === "th" ? "เร็ว" : "Fast"}</span>
              </div>
            </div>

            {/* Pitch */}
            <div className="py-3 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-foreground">
                  {locale === "th" ? "ระดับเสียง" : "Pitch"}
                </p>
                <span className="text-xs text-muted-foreground font-mono">{ttsPitch.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.8"
                step="0.1"
                value={ttsPitch}
                onChange={(e) => setTtsPitch(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md"
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">{locale === "th" ? "ทุ้ม" : "Low"}</span>
                <span className="text-[10px] text-muted-foreground">{locale === "th" ? "แหลม" : "High"}</span>
              </div>
            </div>

            {/* Voice Selection */}
            {tts.voices.length > 0 && (
              <div className="py-3">
                <p className="text-sm font-medium text-foreground mb-2">
                  {locale === "th" ? "เลือกเสียง" : "Voice"}
                </p>
                <select
                  value={tts.currentVoice?.name || ""}
                  onChange={(e) => tts.setVoice(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {tts.voices
                    .filter((v) => v.lang.startsWith(speechLocale.split("-")[0]))
                    .map((voice) => (
                      <option key={voice.name} value={voice.name}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))}
                  <optgroup label={locale === "th" ? "เสียงอื่นๆ" : "Other voices"}>
                    {tts.voices
                      .filter((v) => !v.lang.startsWith(speechLocale.split("-")[0]))
                      .slice(0, 10)
                      .map((voice) => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang})
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>
            )}

            {/* Test Button */}
            <button
              onClick={() => {
                const testText =
                  locale === "th"
                    ? "สวัสดีค่ะ ฉันคือ Nirva AI พร้อมช่วยคุณทำงานค่ะ"
                    : "Hello! I'm Nirva AI, ready to help you work.";
                tts.speak(testText);
              }}
              className="w-full mt-3 px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
            >
              {locale === "th" ? "🔊 ทดสอบเสียง" : "🔊 Test Voice"}
            </button>
          </div>
        )}

        {/* Main Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl">
          {/* Status Label */}
          <div className="mb-8 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${stateColor[state]}`} />
            <span className="text-sm font-medium text-muted-foreground tracking-wide">
              {stateLabel[state]}
            </span>
            {ttsEnabled && (
              <span className="text-xs text-primary/60 flex items-center gap-1">
                <Volume2 className="w-3 h-3" />
              </span>
            )}
          </div>

          {/* Giant Mic Button */}
          <button
            onClick={handleMicClick}
            disabled={state === "processing" || state === "navigating" || !isSupported}
            className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] mb-8 ${
              state === "navigating"
                ? "bg-violet-500/10 border-2 border-violet-400 shadow-[0_0_60px_rgba(139,92,246,0.3)] scale-105"
                : state === "continuous"
                ? "bg-emerald-500/10 border-2 border-emerald-400 shadow-[0_0_60px_rgba(16,185,129,0.2)] scale-105"
                : state === "listening"
                ? "bg-red-500/10 border-2 border-red-400 shadow-[0_0_60px_rgba(239,68,68,0.3)] scale-110"
                : state === "processing"
                ? "bg-amber-500/10 border-2 border-amber-400 scale-95"
                : state === "speaking"
                ? "bg-blue-500/10 border-2 border-blue-400 shadow-[0_0_60px_rgba(59,130,246,0.3)] scale-105"
                : "bg-primary/5 border-2 border-primary/30 hover:border-primary hover:bg-primary/10 hover:scale-105 hover:shadow-[0_0_40px_rgba(var(--primary-rgb),0.2)] active:scale-95"
            }`}
          >
            {/* Navigating animation */}
            {state === "navigating" && (
              <>
                <div className="absolute inset-0 rounded-full border border-violet-400/50 animate-ping" style={{ animationDuration: "1s" }} />
                <div className="absolute inset-[-16px] rounded-full border border-violet-400/20 animate-ping" style={{ animationDelay: "0.3s", animationDuration: "1s" }} />
              </>
            )}
            {/* Continuous mode breathing rings */}
            {state === "continuous" && (
              <>
                <div className="absolute inset-0 rounded-full border border-emerald-400/30 animate-ping" style={{ animationDuration: "3s" }} />
                <div className="absolute inset-[-16px] rounded-full border border-emerald-400/15 animate-ping" style={{ animationDelay: "1s", animationDuration: "3s" }} />
                <div className="absolute inset-[-32px] rounded-full border border-emerald-400/10 animate-ping" style={{ animationDelay: "2s", animationDuration: "3s" }} />
              </>
            )}
            {/* Ripple rings when listening */}
            {state === "listening" && (
              <>
                <div className="absolute inset-0 rounded-full border border-red-400/50 animate-ping" />
                <div className="absolute inset-[-16px] rounded-full border border-red-400/20 animate-ping" style={{ animationDelay: "0.5s" }} />
              </>
            )}
            {/* Sound waves when speaking */}
            {state === "speaking" && (
              <>
                <div className="absolute inset-0 rounded-full border border-blue-400/50 animate-ping" style={{ animationDuration: "1.5s" }} />
                <div className="absolute inset-[-16px] rounded-full border border-blue-400/20 animate-ping" style={{ animationDelay: "0.3s", animationDuration: "1.5s" }} />
              </>
            )}
            {/* Wake word flash */}
            {wakeWordDetected && (
              <div className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping" style={{ animationDuration: "0.5s" }} />
            )}

            {state === "navigating" ? (
              <Navigation className="w-12 h-12 text-violet-500" />
            ) : state === "continuous" ? (
              <Radio className="w-12 h-12 text-emerald-500" />
            ) : state === "listening" ? (
              <MicOff className="w-12 h-12 text-red-500" />
            ) : state === "processing" ? (
              <Sparkles className="w-12 h-12 text-amber-500 animate-spin" style={{ animationDuration: "3s" }} />
            ) : state === "speaking" ? (
              <Volume2 className="w-12 h-12 text-blue-500" />
            ) : (
              <Mic className="w-12 h-12 text-primary" />
            )}
          </button>

          {/* Main Label */}
          <p className="text-lg font-semibold text-foreground mb-2">
            {state === "navigating"
              ? (locale === "th" ? "กำลังนำทาง..." : "Navigating...")
              : state === "continuous"
              ? (locale === "th" ? "กำลังฟังอยู่... พูดว่า 'Hey Nirva'" : "Always listening... say 'Hey Nirva'")
              : state === "listening"
              ? t.voiceListening
              : state === "speaking"
              ? (locale === "th" ? "AI กำลังพูดตอบ..." : "AI is speaking...")
              : continuousMode
              ? (locale === "th" ? "โหมดฟังต่อเนื่อง" : "Continuous Mode")
              : t.voiceTapToSpeak}
          </p>
          <p className="text-sm text-muted-foreground mb-2">
            {continuousMode
              ? (locale === "th"
                ? "ไม่ต้องกดปุ่ม — แค่พูด 'Hey Nirva' แล้วสั่งงานได้เลย"
                : "No button needed — just say 'Hey Nirva' and give your command")
              : t.voiceDesc}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <Globe className="w-3.5 h-3.5" />
            <span>{t.voiceHint}</span>
          </div>

          {/* Voice Navigation Hint */}
          <div className="mt-3 flex items-center gap-1.5 text-xs text-violet-500/70">
            <Navigation className="w-3.5 h-3.5" />
            <span>
              {locale === "th"
                ? "พูด 'เปิดหน้า...' เพื่อนำทางด้วยเสียง"
                : "Say 'open...' or 'go to...' for voice navigation"}
            </span>
          </div>

          {/* Continuous Mode Indicator */}
          {continuousMode && continuousTranscript && (
            <div className="mt-6 px-5 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 max-w-lg w-full">
              <div className="flex items-center gap-2 mb-1">
                <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                <span className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider">
                  {locale === "th" ? "กำลังฟัง" : "Hearing"}
                </span>
              </div>
              <p className="text-sm text-emerald-800 font-medium">{continuousTranscript}</p>
            </div>
          )}

          {/* Live Transcript (active command) */}
          {transcript && (state === "listening" || state === "processing") && (
            <div className="mt-6 px-6 py-4 rounded-2xl bg-card border border-border max-w-lg w-full">
              <div className="flex items-center gap-2 mb-2">
                <Waves className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-xs font-medium text-primary uppercase tracking-wider">
                  {locale === "th" ? "คำสั่ง" : "Command"}
                </span>
              </div>
              <p className="text-base text-foreground font-medium leading-relaxed">{transcript}</p>
            </div>
          )}

          {/* Example Commands — split into Voice Nav + AI Commands */}
          {(state === "idle" || state === "continuous") && results.length === 0 && (
            <div className="mt-10 w-full max-w-lg">
              {/* Navigation Examples */}
              <div className="mb-6">
                <p className="text-xs text-violet-500 uppercase tracking-wider mb-3 font-medium flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5" />
                  {locale === "th" ? "นำทางด้วยเสียง" : "Voice Navigation"}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {navExamples.map((example, i) => (
                    <div
                      key={i}
                      className="px-3 py-2.5 rounded-xl bg-violet-50/50 border border-violet-200/50 text-xs text-violet-700 hover:text-violet-900 hover:border-violet-300 hover:bg-violet-50 transition-all duration-200 cursor-pointer"
                      onClick={() => handleExampleClick(example)}
                    >
                      <div className="flex items-center gap-2">
                        <Navigation className="w-3 h-3 text-violet-400 flex-shrink-0" />
                        <span>{example.replace(/"/g, "")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Command Examples */}
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-medium flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                {continuousMode
                  ? (locale === "th" ? "สั่งงาน AI" : "AI Commands")
                  : (locale === "th" ? "ลองพูดแบบนี้" : "Try saying")}
              </p>
              <div className="grid gap-2">
                {continuousMode ? (
                  <>
                    <div className="px-4 py-3 rounded-xl bg-emerald-50/50 border border-emerald-200/50 text-sm text-emerald-700">
                      <div className="flex items-center gap-3">
                        <Radio className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span>"{locale === "th" ? "เฮ้ Nirva สร้างเว็บไซต์ร้านกาแฟให้หน่อย" : "Hey Nirva, build me a coffee shop website"}"</span>
                      </div>
                    </div>
                    <div className="px-4 py-3 rounded-xl bg-emerald-50/50 border border-emerald-200/50 text-sm text-emerald-700">
                      <div className="flex items-center gap-3">
                        <Radio className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span>"{locale === "th" ? "เฮ้ Nirva แก้บั๊กในไฟล์ main.py" : "Hey Nirva, fix the bug in main.py"}"</span>
                      </div>
                    </div>
                  </>
                ) : (
                  t.voiceExamples.slice(0, 3).map((example, i) => (
                    <div
                      key={i}
                      className="px-4 py-3 rounded-xl bg-card/60 border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:border-primary/20 hover:bg-primary/3 transition-all duration-200 cursor-pointer"
                      onClick={() => handleExampleClick(example)}
                    >
                      <div className="flex items-center gap-3">
                        <Zap className="w-4 h-4 text-primary/60 flex-shrink-0" />
                        <span>{example}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Command History with Replay */}
          {results.length > 0 && (
            <div className="mt-8 w-full max-w-lg space-y-3">
              {results.slice(0, 5).map((result, i) => (
                <div key={i} className={`px-5 py-4 rounded-xl border text-left ${
                  result.isNavigation
                    ? "bg-violet-50/50 border-violet-200"
                    : "bg-card border-border"
                }`}>
                  {/* User Input */}
                  <div className="flex items-center gap-2 mb-2">
                    {result.isNavigation ? (
                      <Navigation className="w-3.5 h-3.5 text-violet-500" />
                    ) : (
                      <Mic className="w-3.5 h-3.5 text-primary" />
                    )}
                    <span className="text-sm font-medium text-foreground">{result.input}</span>
                  </div>
                  {/* AI Response */}
                  <div className="flex items-start gap-2 pl-5">
                    <div className="flex-1">
                      <p className={`text-sm leading-relaxed ${
                        result.isNavigation ? "text-violet-600" : "text-muted-foreground"
                      }`}>{result.output}</p>
                    </div>
                    {/* Replay Button */}
                    <button
                      onClick={() => replayResponse(result.output)}
                      className="flex-shrink-0 p-1.5 rounded-lg hover:bg-primary/10 transition-colors group"
                      title={locale === "th" ? "เล่นเสียงอีกครั้ง" : "Replay voice"}
                    >
                      {tts.isSpeaking ? (
                        <Pause className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <Play className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                      )}
                    </button>
                  </div>
                  {/* Timestamp */}
                  <div className="flex items-center gap-2 mt-2 pl-5">
                    <span className="text-[10px] text-muted-foreground/60">
                      {result.timestamp.toLocaleTimeString()}
                    </span>
                    {result.isNavigation && (
                      <span className="text-[10px] text-violet-500 flex items-center gap-0.5">
                        <Navigation className="w-2.5 h-2.5" /> navigated
                      </span>
                    )}
                    {result.isSpoken && !result.isNavigation && (
                      <span className="text-[10px] text-primary/60 flex items-center gap-0.5">
                        <Volume2 className="w-2.5 h-2.5" /> spoken
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Not Supported Warning */}
          {!isSupported && (
            <div className="mt-6 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
              {locale === "th"
                ? "⚠️ เบราว์เซอร์นี้ไม่รองรับ Speech Recognition — กรุณาใช้ Chrome หรือ Edge"
                : "⚠️ This browser doesn't support Speech Recognition — please use Chrome or Edge"}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
