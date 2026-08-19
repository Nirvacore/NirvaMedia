# Internationalization (i18n) Guide

> How to add and maintain translations in Nirva Dashboard.

Implementation: `client/src/lib/i18n.ts`, `client/src/contexts/LanguageContext.tsx`

---

## Supported Languages

| Code | Language | Native Name | Flag |
|------|----------|-------------|------|
| `th` | Thai | ไทย | 🇹🇭 |
| `en` | English | English | 🇺🇸 |
| `ja` | Japanese | 日本語 | 🇯🇵 |
| `zh` | Chinese | 中文 | 🇨🇳 |
| `ko` | Korean | 한국어 | 🇰🇷 |
| `vi` | Vietnamese | Tiếng Việt | 🇻🇳 |
| `id` | Indonesian | Indonesia | 🇮🇩 |
| `ms` | Malay | Melayu | 🇲🇾 |
| `my` | Burmese | မြန်မာ | 🇲🇲 |
| `km` | Khmer | ខ្មែរ | 🇰🇭 |
| `lo` | Lao | ລາວ | 🇱🇦 |
| `tl` | Filipino | Filipino | 🇵🇭 |
| `es` | Spanish | Español | 🇪🇸 |
| `fr` | French | Français | 🇫🇷 |
| `de` | German | Deutsch | 🇩🇪 |
| `ar` | Arabic | العربية | 🇸🇦 |
| `hi` | Hindi | हिन्दी | 🇮🇳 |

Default locale: **Thai (`th`)**

---

## Architecture

```
LanguageContext
    │
    ├── locale: Locale          (current language code)
    ├── setLocale(code)         (switch language)
    ├── t: Translations         (all translated strings)
    └── localeNames             (display names for picker)
```

- Locale is persisted in `localStorage` key `nirva-locale`
- All translations are defined in `client/src/lib/i18n.ts`
- Components access translations via `useLanguage()` hook

---

## Translation Interface

All translatable strings are defined in the `Translations` interface:

```typescript
export interface Translations {
  // App
  appName: string;
  appTagline: string;
  // Nav
  navDashboard: string;
  navMindMap: string;
  navAgents: string;
  navVoice: string;
  // Dashboard
  dashTitle: string;
  dashDesc: string;
  totalAgents: string;
  selfHosted: string;
  hybrid: string;
  cloud: string;
  sprintProgress: string;
  topAgents: string;
  viewAll: string;
  infrastructure: string;
  // Voice
  voiceTitle: string;
  voiceDesc: string;
  voiceTapToSpeak: string;
  voiceListening: string;
  voiceProcessing: string;
  voiceReady: string;
  voiceExamples: string[];
  voiceHint: string;
  // Agents
  agentsTitle: string;
  agentsDesc: string;
  agentsSearch: string;
  agentsAll: string;
  agentsReady: string;
  // Mind Map
  mindmapTitle: string;
  mindmapDesc: string;
  mindmapHint: string;
  // Theme
  themeLight: string;
  themePastel: string;
  themeDark: string;
  // General
  online: string;
  building: string;
  active: string;
  language: string;
}
```

---

## Usage in Components

```tsx
import { useLanguage } from "@/contexts/LanguageContext";

function MyComponent() {
  const { t, locale, setLocale } = useLanguage();

  return (
    <div>
      <h1>{t.dashTitle}</h1>
      <p>{t.dashDesc}</p>
      <button onClick={() => setLocale("en")}>English</button>
    </div>
  );
}
```

---

## Adding a New Language

### Step 1: Add locale type

In `client/src/lib/i18n.ts`, add the code to the `Locale` union:

```typescript
export type Locale = "th" | "en" | "ja" | ... | "pt";  // add "pt"
```

### Step 2: Create translation object

Add a new const with all keys from the `Translations` interface:

```typescript
const pt: Translations = {
  appName: "NIRVA",
  appTagline: "IA que trabalha para você",
  navDashboard: "Painel",
  navMindMap: "Mapa Mental",
  navAgents: "Agentes IA",
  navVoice: "Comando de Voz",
  dashTitle: "109 Agentes IA Prontos",
  dashDesc: "Gerencie tudo em um só lugar",
  // ... all remaining keys
};
```

### Step 3: Register in translations map

```typescript
const translations: Record<Locale, Translations> = {
  th, en, ja, zh, ko, vi, id, ms, my, km, lo, tl, es, fr, de, ar, hi,
  pt,  // add here
};
```

### Step 4: Add to Sidebar language picker

In `client/src/components/Sidebar.tsx`, add to the `languages` array:

```typescript
{ code: "pt", name: "Português", flag: "🇧🇷" },
```

### Step 5: Add voice navigation keywords (optional)

In `client/src/hooks/useVoiceNavigation.ts`, add keywords for each route:

```typescript
// In NAV_ROUTES keywords for "/":
"início", "painel", "principal",
```

And destination name in `getDestinationName()`:

```typescript
"/": {
  // ...
  pt: "Painel",
},
```

### Step 6: Update this document

Add the new language to the Supported Languages table above.

---

## Adding New Translation Keys

When adding a new UI string:

1. Add the key to the `Translations` interface
2. Add the value to **all 17** locale objects (`th`, `en`, `ja`, ...)
3. Use `t.yourNewKey` in the component

**Never hardcode user-facing strings** in components. Always use `t.*` keys.

### Example: Adding a "Chat" nav label

```typescript
// 1. Interface
navChat: string;

// 2. All locales
// th:
navChat: "แชท",
// en:
navChat: "Chat",
// ja:
navChat: "チャット",
// ... (all 17)

// 3. Component
{ icon: MessageSquare, label: t.navChat, path: "/chat" },
```

---

## Current Coverage Gaps

These UI strings are still hardcoded in English and need i18n keys:

| Page | Hardcoded Strings |
|------|-------------------|
| Sidebar | "Chat", "Tasks", "Files", "Terminal", "Settings", "Navigate" |
| Chat | Page title, input placeholder, agent selector labels |
| Tasks | Status labels, action buttons, page title |
| Files | "Upload", "Download", breadcrumb labels |
| Terminal | Command descriptions, page title |
| Settings | Section labels, form labels, save button |

Priority: add `navChat`, `navTasks`, `navFiles`, `navTerminal`, `navSettings` keys first.

---

## RTL Support (Arabic)

Arabic (`ar`) is included but RTL layout is not yet implemented. To add RTL:

1. Detect `locale === "ar"` in `LanguageContext`
2. Set `document.documentElement.dir = "rtl"`
3. Mirror sidebar to right side
4. Test all pages for layout correctness

---

## Best Practices

| Practice | Reason |
|----------|--------|
| Keep keys semantic (`navDashboard`, not `sidebarItem1`) | Easier to maintain |
| Use full sentences in translations | Different languages have different word order |
| Avoid string concatenation | Use template patterns instead |
| Test with longest language (German) | Catches overflow issues |
| Keep `voiceExamples` culturally relevant | Examples should feel natural per locale |
| Don't translate agent codenames | DESK, CODE, FLOW stay as-is |

---

## File Reference

| File | Purpose |
|------|---------|
| `client/src/lib/i18n.ts` | All translation strings and locale type |
| `client/src/contexts/LanguageContext.tsx` | Provider, hook, localStorage persistence |
| `client/src/components/Sidebar.tsx` | Language picker UI |
| `client/src/hooks/useVoiceNavigation.ts` | Multi-language voice keywords |
