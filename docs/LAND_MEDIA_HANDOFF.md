# Land public learning media handoff

NirvaMedia is the media consumer for Mahāśūnyatā Land. The editorial source
remains `nirva-docs`; this adapter does not create semantic concept IDs or alter
the existing canonical registry and localization safeguards.

## Prepare a real local draft

1. Open a Land Inner Space lesson, select Thai or English, and choose
   **Download media packet / ดาวน์โหลดชุดทำสื่อ**. This exports public lesson
   material only. Do not use the separate personal reflection export.
2. From the NirvaMedia repository, run the following with Node 22.13 or later:

   ```sh
   npm run land:prepare -- --input /absolute/path/land-media-emptiness-en.json --output /absolute/path/new-review-directory
   ```

   The destination's parent must exist; the destination itself must be new.
   A ready-to-run public example is also checked in:

   ```sh
   npm run land:prepare -- --input tests/fixtures/land-public-lesson.json --output /tmp/land-media-example
   ```

3. Review the four resulting files: `media-draft.json` (structured source and
   draft status), `review.md` (source context, Land interpretation, boundaries,
   practice and references), `narration.txt` (authored text, no synthesized
   audio), and `storyboard.md` (original Land scenes with source and boundary).

The command reads one explicitly selected local file and writes a new local
directory. It does not contact a model, a server, social accounts or billing;
it does not create D1 records, generate speech, schedule or publish anything.
Every structured result remains `draft` with publication blocked because no
trusted editorial review service is configured.

## Source and privacy validation

The supported source is [nirva-docs Inner Space at
b45b2334548785fd727141c8d0950bb51514aefa](https://github.com/Nirvacore/nirva-docs/blob/b45b2334548785fd727141c8d0950bb51514aefa/docs/mahasunyata-land-inner-space.md).
`lib/mahasunyata/vendor/land-media-provenance.json` records that document's
SHA-256, the document-attested dataset digest, and all six public lesson hashes.
The lesson hash format recursively sorts object keys while retaining array
order, then hashes the UTF-8 JSON. Formatting or JSON property order may vary.

The input must match the exact source URL, source review date, envelope version,
`editorial-handoff-not-published` kind, Thai/English language and explicit
`containsPrivateNotes: false`. Full lesson content and narration must match the
reviewed public content. Unknown top-level or nested fields, changed source
text, private reflection fields, extra instructions and approval flags are
rejected. Errors do not echo input. Files over 128 KiB are rejected before
parsing. Output validation occurs before its directory is created.

This is stricter than relying on a caller's privacy flag. A personal note
inserted into an otherwise permitted text field also fails the public-content
hash or exact narration comparison. Updates and new translations require a
new reviewed source pin; the adapter never fetches a moving branch or accepts
an arbitrary URL. Historical source revisions are not silently accepted.

The provenance pins editorial content, not permission to redistribute another
party's books, video, recordings or voice output. Added media needs its own
rights review. In particular, the corrected source revision no longer offers
downloadable Apple System Voice narration. This command produces text only.

## Active product boundary

The current Campaign Studio has no lesson-packet importer. Its generic brief
generation produces curated promotional previews, so it cannot preserve this
lesson through an existing import route. This small consumer lives beside the
active `lib/mahasunyata` adapters and prepares an editorial handoff for media
work. It is not a new app or a claim that Studio has imported the files.

Future Studio ingestion must persist the precise lesson source and translated
artifact, keep source context distinct from the Land lens, and obtain trusted
human review before publishing. Existing canonical publication guards remain
unchanged. Model calls, media rendering, additional languages and connected
social posting are separate integrations; none is enabled by this command.

## Contributor access proposal — not an entitlement

The founder has proposed free or subsidized usage for people who voluntarily
help produce useful learning media. No allowance, reward, billing policy or
benefit is granted by this adapter. Before introducing access, calculate real
provider, storage, delivery and review costs; define a capped pilot budget and
publish plain eligibility and appeal terms. Participation and beliefs must not
be ranked with moral points, social scores or tokens. Declining contribution
must not affect a person's worth or spiritual standing. Cross-project cost
sharing belongs in an explicit funding agreement, not hidden cross-subsidy or
automatic publication.

The canonical [shared project economics policy](https://github.com/Nirvacore/nirva-docs/blob/3ce2139e24dc3cf6cfbabf1fa9c9c025b77fa692/docs/nirva-project-economics.md)
owns the funding boundary. This adapter does not calculate prices or grant
free allowances.

## Global language readiness

Each prepared `media-draft.json` now contains `localeReadiness` for its current
language and `localizationTargets` for the existing 21-language Nirva registry.
The reusable implementation is `lib/mahasunyata/learning-locale-readiness.ts`.
It consumes the canonical [global learning language policy](https://github.com/Nirvacore/nirva-docs/blob/3ce2139e24dc3cf6cfbabf1fa9c9c025b77fa692/docs/nirva-global-learning-language-policy.md),
separately from the unchanged lesson-source commit.

- Thai and English have curated public lesson text. A native-language reviewer
  has not been verified by this service; these are not native-reviewed claims.
- Other registry entries describe candidate language capabilities, not
  translated learning content. Chinese, Spanish, Hindi and Arabic are initial
  expansion candidates under the policy, not completed releases.
- Writing-system metadata comes from the existing registry. Arabic and Hebrew
  carry `rtl`; this is layout direction, not evidence of linguistic quality.
- Script text, voice and timed captions have separate statuses. The lesson
  handoff has no generated voice or timed caption artifact. The separate Land
  introduction's captions do not make every lesson caption-ready.
- A translation descriptor may identify the exact source commit, lesson ID and
  translated-content SHA-256. It is caller-declared draft metadata, not proof
  that an artifact exists or has been reviewed. Private text, extra fields and
  client claims of review or publication approval are rejected.

All locales keep `externalPublishEligible: false`. There is no trusted native
review service. Its future evidence must bind the exact source revision,
target locale and artifact digest to a verified reviewer identity and native
language competence, a dated outcome, and checks for meaning, natural tone,
source-versus-Land attribution and local cultural context. Narration also
needs pronunciation and redistribution-rights review; captions need timing
and accessibility review. Caller-provided names or checkboxes cannot unlock
the existing canonical publishing restrictions.

This readiness contract performs no translation or speech call. The existing
provider adapter and Translation Memory are unchanged. Provider-wide token
budgets, actual usage accounting and incomplete-output handling remain a
separate integration; this change does not claim those costs are measured.

## Verification

```sh
node --experimental-strip-types --test tests/land-media-handoff.test.mjs tests/learning-locale-readiness.test.mjs
npm test
```

The focused tests exercise actual adapter output, public-source tampering and
private-field rejection, key-order independence, input/output isolation, the
real local CLI, destination protection and oversized-input handling.

## Making-amends guide companion · v0.1.0 · 2026-09-15

The same local command now accepts the separately pinned `making-amends`
guide. Use the checked-in public example:

```sh
npm run land:prepare -- --input tests/fixtures/land-public-guide.json --output /tmp/land-making-amends-review
```

For English, copy this packet to a new file and change only `language` from
`th` to `en`. The destination must be new. The packet is a fixture of public
editorial material, not a personal confession or a Community draft export.

The guide uses `editorial-guide-handoff-not-published` and the distinct result
format `nirva-media-guide-draft/v1`, with `guideId`, rather than adding a seventh
Inner Space lesson. `vendor/land-guide-provenance.json` pins the canonical
[guide at docs commit12f97f05cd2dd3ac889ce4f2fcead5d08608afce](https://github.com/Nirvacore/nirva-docs/blob/12f97f05cd2dd3ac889ce4f2fcead5d08608afce/docs/mahasunyata-land-making-amends.md),
its original export/document digests and sorted-JSON guide hash.

The adapter preserves three lenses (plain, thinking and Buddhist), sources,
three fictional story steps, practice, the short boundary and full adult note.
Narration is an assembly of existing title, summary, story steps and boundaries;
it is text for review, not generated audio. All six exact apology templates
remain `draft-needs-native-review` in structured output and the review document;
they are not inserted into narration. Selecting TH/EN does not grant native
review, voice or caption readiness. Other narration locales are rejected even
when an illustrative template exists for that language.

Complete content hashing rejects extra fields, personal text substituted into
allowed fields, changed sources, removed boundaries and forged approvals before
creating an output directory. Existing six-lesson behavior remains unchanged.
The four files are local only; there is no Studio ingestion, provider request,
account operation, publication or website deployment in this integration.
Provider calls are zero; machine work and human review still have costs.
Machine/power/subscription/review allocations are not measured or priced by this
command, so no funded quota or full-cost claim follows from it.

Infrastructure reference: [nirva-ops](https://github.com/Nirvacore/nirva-ops).
Core integration reference: [nirvacore-v1](https://github.com/Nirvacore/nirvacore-v1).
