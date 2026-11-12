import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The declaration bundler moves a single-line member comment onto the end of
 * the previous member, which detaches it from the property it documents.
 * Fail when a built declaration file contains a comment in that position.
 */
const displacedComment = /[;,{]\s*\/\*\*/;
const declarationFile = /\.d\.[cm]ts$/;

function declarationFiles(directory) {
  return readdirSync(directory, {
    withFileTypes: true,
  }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return declarationFiles(path);
    }

    return declarationFile.test(entry.name) ? [path] : [];
  });
}

const packages = readdirSync('packages', {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => join('packages', entry.name, 'dist'));
const failures = [];
let checked = 0;

for (const dist of packages) {
  let files;

  try {
    files = declarationFiles(dist);
  } catch {
    continue;
  }

  for (const file of files) {
    checked += 1;
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, index) => {
        if (displacedComment.test(line)) {
          failures.push(`${file}:${index + 1}`);
        }
      });
  }
}

if (checked === 0) {
  throw new Error('No built declaration files found. Run the build first.');
}

if (failures.length > 0) {
  throw new Error(
    `Member comments were detached from their properties. Write them in block form:\n${failures.join('\n')}`,
  );
}

process.stdout.write(`Declaration comments ok in ${checked} files.\n`);
