#!/usr/bin/env node
/**
 * Standalone SFTP connectivity test for Liderpapel.
 *
 * Usage:
 *   npm run test:sftp:liderpapel          # normal mode (full cipher list)
 *   npm run test:sftp:liderpapel -- --aes  # AES-only mode (no chacha20)
 *
 * Requires env vars: LIDERPAPEL_SFTP_HOST, LIDERPAPEL_SFTP_USER,
 *   LIDERPAPEL_SFTP_PASSWORD (optional: LIDERPAPEL_SFTP_PORT, LIDERPAPEL_SFTP_PATH)
 *
 * Exit codes: 0 = success, 1 = failure
 */

import crypto from "node:crypto";
import SftpClient from "ssh2-sftp-client";

const HOST = process.env.LIDERPAPEL_SFTP_HOST ?? "sftp.liderpapel.com";
const PORT = parseInt(process.env.LIDERPAPEL_SFTP_PORT ?? "22", 10);
const USER = process.env.LIDERPAPEL_SFTP_USER;
const PASS = process.env.LIDERPAPEL_SFTP_PASSWORD;
const PATH = process.env.LIDERPAPEL_SFTP_PATH ?? "/";
const aesOnly = process.argv.includes("--aes");

if (!USER || !PASS) {
  console.error("LIDERPAPEL_SFTP_USER and LIDERPAPEL_SFTP_PASSWORD are required");
  process.exit(1);
}

// ─── Runtime info ───
console.log("--- Runtime ---");
console.log(`Node: ${process.version}`);
console.log(`Platform: ${process.platform} ${process.arch}`);
console.log(`Available ciphers (crypto.getCiphers): ${crypto.getCiphers().length}`);
console.log(`Has chacha20: ${crypto.getCiphers().some(c => c.startsWith("chacha20"))}`);
console.log(`Has aes-256-ctr: ${crypto.getCiphers().includes("aes-256-ctr")}`);
console.log(`Has aes-256-gcm: ${crypto.getCiphers().includes("aes-256-gcm")}`);
console.log(`Has aes-256-cbc: ${crypto.getCiphers().includes("aes-256-cbc")}`);
console.log();

// ─── Cipher config ───
const DEFAULT_CIPHERS = [
  "aes256-ctr", "aes192-ctr", "aes128-ctr",
  "aes256-gcm@openssh.com", "aes128-gcm@openssh.com",
  "aes256-cbc", "aes128-cbc",
];

const FULL_CIPHERS = [
  "chacha20-poly1305@openssh.com",
  ...DEFAULT_CIPHERS,
];

const ciphers = aesOnly ? DEFAULT_CIPHERS : FULL_CIPHERS;
console.log(`--- Mode: ${aesOnly ? "AES-only" : "normal (full)"} ---`);
console.log(`Ciphers: ${ciphers.join(", ")}`);
console.log();

// ─── Connect ───
const sftp = new SftpClient();

const config = {
  host: HOST,
  port: PORT,
  username: USER,
  password: PASS,
  readyTimeout: 10000,
  algorithms: {
    cipher: ciphers,
    hmac: ["hmac-sha2-256", "hmac-sha2-512", "hmac-sha1"],
  },
  debug: process.argv.includes("--debug")
    ? (msg) => console.log(`[ssh2] ${msg}`)
    : undefined,
};

try {
  console.log(`Connecting to ${HOST}:${PORT}...`);
  const start = Date.now();
  await sftp.connect(config);
  console.log(`Connected in ${Date.now() - start}ms`);

  console.log(`Listing ${PATH}...`);
  const files = await sftp.list(PATH);
  console.log(`Found ${files.length} file(s):`);
  for (const f of files.slice(0, 20)) {
    const size = (f.size / 1024).toFixed(1);
    console.log(`  ${f.type === "d" ? "DIR " : "FILE"} ${f.name} (${size} KB)`);
  }
  if (files.length > 20) console.log(`  ... and ${files.length - 20} more`);

  await sftp.end();
  console.log("\nSUCCESS");
  process.exit(0);
} catch (err) {
  console.error(`\nFAILED: ${err.message}`);

  // Classify
  const msg = err.message;
  if (/unsupported algorithm/i.test(msg)) {
    console.error("Classification: runtime_cipher_unsupported");
    console.error("The runtime does not support one of the configured ciphers.");
  } else if (/no matching.*cipher/i.test(msg)) {
    console.error("Classification: no_common_cipher");
    console.error("Server and client have no cipher in common.");
  } else if (/authentication.*fail/i.test(msg)) {
    console.error("Classification: auth_failed");
  } else if (/timeout/i.test(msg)) {
    console.error("Classification: timeout");
  } else if (/ENOTFOUND|ECONNREFUSED/i.test(msg)) {
    console.error("Classification: network_error");
  }

  try { await sftp.end(); } catch { /* ignore */ }
  process.exit(1);
}
