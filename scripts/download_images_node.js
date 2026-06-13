import fs from 'fs';
import https from 'https';

function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadImage(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: ${res.statusCode}`));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function run() {
  try {
    await downloadImage('https://upload.wikimedia.org/wikipedia/commons/4/4e/Nemesis_-_Gheorghe_Tattarescu.jpg', 'public/lore/nemesis_myth.jpg');
    console.log('Downloaded myth image');
    await downloadImage('https://upload.wikimedia.org/wikipedia/en/e/eb/Nemesis_%28Resident_Evil%29.png', 'public/lore/nemesis_re.png');
    console.log('Downloaded re image');
  } catch (err) {
    console.error(err);
  }
}

run();
