# Translation Memory API

Nirva Media uses a workspace-scoped D1 Translation Memory before calling any
external translation provider. It never fabricates a translation when no
memory entry or configured provider is available.

## Runtime configuration

- `OPENAI_API_KEY` — server-side secret that enables the OpenAI Responses
  provider adapter. Never send this value in an API request or browser bundle.
- `OPENAI_TRANSLATION_MODEL` — optional model override. The adapter defaults to
  `gpt-5-mini`.

Without `OPENAI_API_KEY`, memory lookup and manually remembered translations
continue to work. A cache miss returns HTTP 503 with
`TRANSLATION_PROVIDER_UNAVAILABLE` and no translated text.

Provider requests use `store: false`. The product still needs customer
identity, workspace administration, data-retention controls, and production
secret provisioning before general customer rollout.

## Translate

`POST /api/translations`

```json
{
  "sourceText": "สวัสดี",
  "sourceLanguage": "th",
  "targetLanguage": "en"
}
```

Successful responses use one of these explicit sources:

```json
{
  "translation": {
    "text": "Hello",
    "source": "memory",
    "status": "translated",
    "cached": true
  }
}
```

- `memory` — an exact workspace Translation Memory match.
- `provider` — the configured provider returned a translation; the result is
  persisted automatically for future exact matches.
- `identity` — source and target language are identical.
- `unavailable` — no translated text exists. The response is HTTP 503 when the
  credential is absent or HTTP 502 when the configured provider fails.

The exact-match key is SHA-256 of source language, target language, and trimmed
source text. It is not semantic or fuzzy matching.

## Remember a reviewed translation

Preferred Studio contract: `PUT /api/translations`

The dedicated `POST /api/translations/remember` endpoint accepts the same body
and remains available for integrations that prefer an explicit action route.

```json
{
  "sourceText": "สวัสดี",
  "translatedText": "Hello",
  "sourceLanguage": "th",
  "targetLanguage": "en"
}
```

This inserts or replaces the exact workspace memory entry and marks its stored
source as `manual`. Its UI-facing translation result uses `source: "memory"`
and `memorySource: "manual"`. Only reviewed or approved translations should
use this endpoint.

## List Translation Memory

`GET /api/translations?limit=50&sourceLanguage=th&targetLanguage=en`

The response contains recent active memory entries and the provider's current
credential status. `limit` is constrained to 1–100. Language filters are
optional.

## Product entitlement

All three operations require the active Workspace solution to include the
`language-engine` module. The current product still uses the fixed
`nirva-workspace` identity until customer identity and multi-workspace
administration are implemented.
