const fs = require('fs');
let content = fs.readFileSync('src/components/settings/settings-sections.ts', 'utf8');

content = content.replace(
  "whatsapp: { id: 'whatsapp',\n  'widget', label: 'WhatsApp', icon: PlugZap, group: 'workspace' },",
  "whatsapp: { id: 'whatsapp', label: 'WhatsApp', icon: PlugZap, group: 'workspace' },\n  widget: { id: 'widget', label: 'Widget', icon: PlugZap, group: 'workspace' },"
);

fs.writeFileSync('src/components/settings/settings-sections.ts', content);
