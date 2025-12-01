const esbuild = require('esbuild');
const fs = require('fs');
const { execSync } = require('child_process');

const gitHash = execSync('git rev-parse --short HEAD').toString().trim();

// Prefix with the current date:
// YYMMDD-hash
const date = new Date();
const year = date.getFullYear().toString().slice(-2);
const month = String(date.getMonth() + 1).padStart(2, '0');
const day = String(date.getDate()).padStart(2, '0');
const yymmdd = `${year}${month}${day}`;
const version = `${yymmdd}-${gitHash}`;

const metablock = `// ==UserScript== 
// @name         Hide LinkedIn Posts
// @namespace    http://tampermonkey.net/
// @version      ${version}
// @description  Hide LinkedIn posts and other elements matching regex patterns
// @author       Danny Spencer
// @match        https://www.linkedin.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// ==/UserScript==

`;

esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'dist/linkedin_userscript.user.js',
  format: 'iife',
  banner: { js: metablock }
}).catch(() => process.exit(1));
