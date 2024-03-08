/* eslint-disable */
const { execSync } = require('child_process'); 
const { writeFile } = require( 'fs'); 
const path = require('path');

const commitSha = execSync('git rev-parse --short HEAD').toString().trim();
const version = execSync(`git show -s --format=%ci ${commitSha}`).toString().trim();

writeFile(path.resolve('./public/version.json'), `{ "version": "${version} (${commitSha})"}`, console.log);
