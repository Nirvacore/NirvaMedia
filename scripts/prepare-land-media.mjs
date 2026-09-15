import { openSync, readSync, closeSync, fstatSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { prepareLandMediaDraft } from '../lib/mahasunyata/land-media-handoff.ts';

try {
  const args = process.argv.slice(2);
  if (args.length !== 4 || args[0] !== '--input' || args[2] !== '--output' || !args[1] || !args[3]) {
    throw new Error('Usage: npm run land:prepare -- --input public-packet.json --output new-directory');
  }
  const limit = 128 * 1024;
  const file = openSync(resolve(args[1]), 'r');
  let contents;
  try {
    if (!fstatSync(file).isFile()) throw new Error('Input must be a regular JSON file');
    const buffer = Buffer.alloc(limit + 1);
    let length = 0;
    while (length < buffer.length) {
      const bytes = readSync(file, buffer, length, buffer.length - length, null);
      if (!bytes) break;
      length += bytes;
    }
    if (length > limit) throw new Error('Input exceeds the 128 KiB public packet limit');
    contents = buffer.subarray(0, length).toString('utf8');
  } finally { closeSync(file); }
  let packet;
  try { packet = JSON.parse(contents); } catch { throw new Error('Input must be valid JSON'); }
  const draft = prepareLandMediaDraft(packet);
  const output = resolve(args[3]);
  // Exclusive creation prevents accidental replacement of previous review work.
  mkdirSync(output);
  const write = (name, text) => writeFileSync(join(output, name), text, { flag: 'wx' });
  const { content, source } = draft;
  write('media-draft.json', JSON.stringify(draft, null, 2) + '\n');
  write('narration.txt', content.narration + '\n');
  write('storyboard.md', `# ${content.title}\n\nDraft storyboard — original Land scenes, pending editorial review.\n\nSource: ${source.editorialSource}\n\n## Boundary\n\n${content.boundary}\n\n${content.scenes.map((scene, i) => `## Scene ${i + 1}\n\n${scene}`).join('\n\n')}\n`);
  write('review.md', `# ${content.title}\n\nDRAFT ONLY — not approved, scheduled or published.\n\nCanonical editorial owner: nirva-docs\n\nSource: ${source.editorialSource}\n\nSource commit: ${source.commit}\n\nReviewed source date: ${source.reviewedOn}\n\n## Source context\n\n${content.sourceContext}\n\n## Land interpretation\n\n${content.landInterpretation}\n\n## Boundary\n\n${content.boundary}\n\n## Original Land practice\n\n${content.practice.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n## Reflection prompts (public questions, no personal responses)\n\n${content.questions.map(question => `- ${question}`).join('\n')}\n\n## References\n\n${content.sources.map(item => `- ${item.title}: ${item.url}`).join('\n')}\n\n## Next editorial step\n\nReview meaning, source attribution, permissions for any added assets, accessibility and the final localized artifact. New translations or edits require a separately reviewed draft. This local preparation does not grant publication approval. The trusted review service and social posting integration are not connected by this adapter. No account, provider or billing operation has run.\n`);
  console.log('Prepared 4 local review files. Status: draft; publication remains blocked.');
} catch (error) {
  // Filesystem and parser diagnostics may contain user paths or rejected content.
  const allowed = ['Usage:', 'Input must', 'Input exceeds', 'Only an unchanged'];
  const message = error instanceof Error && allowed.some(prefix => error.message.startsWith(prefix)) ? error.message : 'Unable to read input or create a new output directory';
  console.error(`Land media preparation failed: ${message}`);
  process.exitCode = 1;
}
