const fs = require('fs');
let content = fs.readFileSync('src/components/settings/routing-settings.tsx', 'utf8');

content = content.replace(
  'onValueChange={(v) => setMode(v)}',
  "onValueChange={(v) => setMode(v || 'round_robin')}"
);

fs.writeFileSync('src/components/settings/routing-settings.tsx', content);
