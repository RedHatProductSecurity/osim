import { execSync } from 'child_process';
import { writeFile } from 'fs';
import path from 'path';

function recordVersion() {
  const commitSha = execSync('git rev-parse --short HEAD').toString().trim();
  const version = execSync(`git show -s --format=%ci ${commitSha}`).toString().trim();

  writeFile(
    path.resolve('./public/version.json'),
    `{ "version": "${version} (${commitSha})"}`,
    (error) =>
      error ? console.error('Error writing version.json', error) : 'Updated version.json',
  );
}
export const recordVersionPlugin = () => ({
  name: 'update-version',
  handleHotUpdate: async () => {
    recordVersion();
  },
});
