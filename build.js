const esbuild = require('esbuild');
const fs = require('fs');
const { execSync } = require('child_process');

let version;

if (process.argv[2]) {
    // Use the first argument as version if provided
    version = process.argv[2];
} else {
    // Prefix with the current date:
    // YYMMDD-hash
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const yymmdd = `${year}${month}${day}`;

    const gitHash = execSync('git rev-parse --short HEAD').toString().trim();

    version = `${yymmdd}-${gitHash}`;
}

const metablock = `// ==UserScript== 
// @name         LinkedIn Post Hider
// @namespace    http://tampermonkey.net/
// @version      ${version}
// @description  Hide LinkedIn posts and other elements matching regex patterns
// @author       Danny Spencer
// @match        https://www.linkedin.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @updateURL    https://github.com/nukep/linkedin-post-hider/releases/latest/download/linkedin_post_hider.user.js
// @downloadURL  https://github.com/nukep/linkedin-post-hider/releases/latest/download/linkedin_post_hider.user.js
// @run-at       document-start
// ==/UserScript==

`;

esbuild.build({
    entryPoints: ['src/main.ts'],
    bundle: true,
    outfile: 'dist/linkedin_post_hider.user.js',
    format: 'iife',
    banner: { js: metablock }
}).catch(() => process.exit(1));
