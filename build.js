const esbuild = require('esbuild');
const fs = require('fs');

const metablock = `// ==UserScript==
// @name         Hide LinkedIn Posts
// @namespace    http://tampermonkey.net/
// @version      2025-11-30
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
  entryPoints: ['src/main.mjs'],
  bundle: true,
  outfile: 'dist/linkedin_userscript.user.js',
  format: 'iife',
  banner: { js: metablock }
}).catch(() => process.exit(1));
