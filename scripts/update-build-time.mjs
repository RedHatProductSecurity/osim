import { writeFile } from 'fs';
import path from 'path';

writeFile(
  path.resolve('./public/last-build-time.json'),
  `{ "osimLastBuildTime": "${Date.now()}"}`,
  (error) => (error ? console.error('Error updating build time', error) : 'Updated build time'),
);
