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
and `memorySource: "manual"`. Callers should submit reviewed translations,
but this endpoint does not authenticate a reviewer or establish semantic
approval. In particular, `manual` never approves canonical content.

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


## Canonical localization (Mahāśūnyatā)

Add an optional `canonical` association to translate or either remember request:

```json
{
  "sourceText": "A policy draft",
  "sourceLanguage": "en",
  "targetLanguage": "th",
  "canonical": {
    "concept_id": "MSU-GOV-ROLE-HUMILITY-001",
    "source_concept_version": "0.1.0"
  }
}
```

Both association fields are required together and must select an exact record
from the immutable canonical registry. `locale`, when supplied inside
`canonical`, must match `targetLanguage` (or `language` for campaigns). Only the
existing 21-language NLE registry is supported.

`translation.canonical` contains the association, `locale`, the full immutable
`canonical_source` record (names, meaning, non-meaning, safeguards, version and
concept provenance), and pinned repository/artifact `source_provenance`.
Localized text stays in `translation.text`; it never replaces canonical text.
Identity, provider, memory, unavailable and failed-provider responses preserve
this envelope. Remember responses also persist it as `memory.canonical`.

The envelope always includes:

```json
{
  "semantic_review_status": "pending",
  "external_publish_eligible": false,
  "review_limitation": "configured-human-review-unavailable"
}
```

A client may echo a full envelope, but any supplied field must exactly match the
server-generated envelope. Unknown versions, mismatched/unsupported locales,
removed or altered safeguards, source/provenance tampering, and forged review
fields return HTTP 400. Minimal associations are expanded from the pinned
registry; persisted memory envelopes must be complete and match exactly.

Canonical memory uses the existing exact-match engine with a namespace for
concept ID, version and pinned source commit. Generic memory keys remain
unchanged. A generic/manual memory entry cannot overwrite a canonical entry or
serve as its semantic approval. Matching manual entries remain pending.

## Canonical publication boundary

`POST /api/campaigns` accepts the same optional `canonical` association. Each
created post persists the full envelope, and campaign history returns it. The
existing campaign content remains a curated NLE preview; attaching a concept
does not certify its meaning. The association cannot be edited or removed via
`PATCH /api/posts/[id]`.

For any saved canonical post, `PATCH /api/posts/[id]` rejects transitions to
`approved`, `scheduled` or `published` with HTTP 409 and
`CANONICAL_HUMAN_REVIEW_REQUIRED`. Draft/review/archive workflow remains
available. `POST /api/publish-jobs` resolves a supplied `postId` and checks the
stored association before creating any job or audit event, even if an account
is connected or the client omits the envelope. Unknown post IDs return 404;
a channel must match the saved post. An explicitly canonical standalone job is
also blocked. Generic posts and generic standalone jobs retain the current
queue behavior.

All associated canonical content is conservatively gated, including policy and
governance. Structural envelope preservation is not semantic equivalence. No
trusted human-review service is configured in this MVP, and there is no approval
endpoint or credential toggle that unlocks publishing. Client `approved`,
`reviewerName`, classification flags, and Translation Memory `manual` status
cannot establish trusted review. Future review must bind reviewer authority to
the exact localized content, locale and source version before enabling this
path.

The optional association is an explicit API contract, not a text classifier.
Unassociated generic content is not inferred to be canonical from its prose;
clients must carry `canonical` when creating associated content. This feature
does not retrofit historical generic posts or implement production identity,
reviewer authentication, OAuth, or live external publishing.

Apply `drizzle/0005_sudden_skreet.sql` with the application rollout; old records
receive nullable associations and retain their generic behavior. No production
migration or external publication is performed by the test suite.
