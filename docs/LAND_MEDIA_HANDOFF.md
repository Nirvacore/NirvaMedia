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

## Verification

```sh
node --experimental-strip-types --test tests/land-media-handoff.test.mjs
npm test
```

The focused tests exercise actual adapter output, public-source tampering and
private-field rejection, key-order independence, input/output isolation, the
real local CLI, destination protection and oversized-input handling.
