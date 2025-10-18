const fs = require('fs');
const path = require('path');

function copyFile(relativePath) {
  const source = path.resolve(__dirname, '..', 'src', relativePath);
  const destination = path.resolve(__dirname, '..', 'dist', relativePath);

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

try {
  copyFile('config/models.json');
  console.log('[build] Copied config/models.json to dist');
} catch (error) {
  console.error('[build] Failed to copy config/models.json:', error);
  process.exit(1);
}
