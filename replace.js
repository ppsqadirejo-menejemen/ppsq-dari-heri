const fs = require('fs');
const path = require('path');

const appTsxPath = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

// Add imports
if (!content.includes("import { fetchWithCache, postWithOfflineQueue, getOfflineQueue } from './lib/offlineSync';")) {
  content = content.replace(
    "import axios from 'axios';",
    "import axios from 'axios';\nimport { fetchWithCache, postWithOfflineQueue, getOfflineQueue } from './lib/offlineSync';"
  );
}

// Replace axios.get with fetchWithCache
content = content.replace(/axios\.get/g, 'fetchWithCache');

// Replace axios.post with postWithOfflineQueue
content = content.replace(/axios\.post/g, 'postWithOfflineQueue');

fs.writeFileSync(appTsxPath, content, 'utf8');
console.log('Replaced axios calls in App.tsx');
