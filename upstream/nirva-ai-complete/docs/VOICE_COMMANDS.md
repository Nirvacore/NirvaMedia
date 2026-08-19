# Voice Commands Reference

> Wake words, navigation commands, and voice interaction patterns for Nirva Dashboard.

Implementation: `client/src/pages/Voice.tsx`, `client/src/hooks/useVoiceNavigation.ts`, `client/src/hooks/useTTS.ts`

---

## Wake Words

Say any of these to activate command mode:

| Wake Word | Language |
|-----------|----------|
| `hey nirva` | English |
| `hi nirva` | English |
| `nirva` | English |
| `เฮ้ เนอร์ว่า` | Thai |
| `เฮ้เนอร์ว่า` | Thai |
| `เฮ เนอวา` | Thai |
| `เฮ้ นีวา` | Thai |
| `เฮ้นีวา` | Thai |
| `เนอร์ว่า` | Thai |
| `นีวา` | Thai |

After the wake word, speak your command. Example:

> "Hey Nirva, open agents"

---

## Voice Navigation

Navigate between pages using natural language. The system matches keywords from your speech to routes.

### Supported Routes

| Route | Page | Example Commands |
|-------|------|------------------|
| `/` | Dashboard | "go home", "หน้าหลัก", "open dashboard" |
| `/voice` | Voice Command | "open voice", "สั่งด้วยเสียง", "voice control" |
| `/mindmap` | Mind Map | "open mind map", "แผนผัง", "show architecture" |
| `/agents` | Agent Directory | "open agents", "ผู้ช่วย AI", "show team" |

### Navigation Intent Keywords

These words signal navigation intent (combined with a route keyword):

| Language | Keywords |
|----------|----------|
| Thai | เปิด, ไป, ไปที่, ไปหน้า, เปลี่ยนหน้า, พาไป, แสดง, ดู, กลับ |
| English | open, go to, go, navigate, show, switch to, take me to, bring me to, view |
| Japanese | 開く, 表示, 移動 |
| Chinese | 打开, 去, 显示, 切换 |
| Korean | 열어, 가, 보여줘, 이동 |
| Vietnamese | mở, đi đến, hiển thị |
| Indonesian | buka, pergi ke, tampilkan |
| Malay | buka, pergi ke, tunjukkan |

### Example Commands

```
"เปิดหน้าผู้ช่วย"          → /agents
"go to dashboard"            → /
"open mind map"              → /mindmap
"แสดงแผนผัง"                 → /mindmap
"take me to voice command"   → /voice
"agents"                     → /agents (strong match)
```

### How Matching Works

1. Speech is transcribed via Web Speech API
2. Wake word is stripped if detected
3. Navigation intent keywords are checked
4. Route keywords are matched against `NAV_ROUTES`
5. If intent + keyword match (or strong direct match), `wouter` navigates
6. Destination name is spoken back via TTS in the current locale

---

## Voice Modes

| Mode | Description | Trigger |
|------|-------------|---------|
| **Idle** | Waiting for input | Default state |
| **Listening** | Microphone active, capturing speech | Tap mic or wake word |
| **Processing** | Analyzing transcript | After speech ends |
| **Speaking** | TTS reading response | After processing |
| **Continuous** | Always-listening mode | Toggle in UI |
| **Navigating** | Route change in progress | Navigation match found |

---

## TTS (Text-to-Speech)

Responses are spoken using the Web Speech Synthesis API.

| Setting | Default | Location |
|---------|---------|----------|
| Enabled | `true` | Settings → Voice / TTS |
| Speed | `1.0` | Settings → Voice / TTS |
| Wake word | `Hey Nirva` | Settings → Voice / TTS |

Controls on Voice page:
- Volume on/off toggle
- Pause/resume speech
- Continuous listening mode

---

## AI Command Responses

Non-navigation commands are processed by `generateAIResponse()` in `Voice.tsx`. Currently simulated — will connect to Ollama in Sprint 1.

### Example Task Commands

| Command (Thai) | Expected Behavior |
|----------------|-------------------|
| "สร้างเว็บไซต์ร้านกาแฟให้หน่อย" | Route to CODE agent |
| "แก้บั๊กในไฟล์ main.py" | Route to CODE agent |
| "สรุปโค้ดนี้เป็นภาษาไทย" | Route to DESK agent |
| "สร้างฐานข้อมูลลูกค้า" | Route to ARCH agent |
| "ช่วยเขียน API สำหรับจองห้อง" | Route to CODE agent |

These examples are shown on the Voice page via i18n `voiceExamples`.

---

## Browser Requirements

| Requirement | Details |
|-------------|---------|
| API | Web Speech API (`SpeechRecognition` + `SpeechSynthesis`) |
| HTTPS | Required in production (browser security policy) |
| Microphone | User must grant permission |
| Supported browsers | Chrome, Edge, Safari (partial), Firefox (limited) |

---

## Adding New Voice Routes

To add voice navigation for a new page (e.g. `/chat`):

1. Add route to `NAV_ROUTES` in `client/src/hooks/useVoiceNavigation.ts`:

```typescript
{
  path: "/chat",
  keywords: [
    "chat", "open chat", "แชท", "เปิดแชท",
    "チャット", "聊天", "채팅",
  ],
}
```

2. Add destination name to `getDestinationName()`:

```typescript
"/chat": {
  th: "แชท",
  en: "Chat",
  ja: "チャット",
  // ...
},
```

3. Update this document with the new route and example commands.

---

## Planned Enhancements

- [ ] Voice navigation for `/chat`, `/tasks`, `/files`, `/terminal`, `/settings`
- [ ] Agent-specific voice commands ("talk to CODE", "ask DESK")
- [ ] Custom wake word configuration (persisted to settings)
- [ ] Offline wake word detection (no cloud dependency)
- [ ] Voice feedback for task completion and errors
