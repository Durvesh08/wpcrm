const fs = require('fs');
let content = fs.readFileSync('src/components/settings/settings-sections.ts', 'utf8');

// add payments to SETTINGS_SECTIONS
content = content.replace("'api',", "'api',\n  'payments',");

// add CreditCard to lucide-react imports
content = content.replace("Coins,", "Coins,\n  CreditCard,");

// add payments to SECTION_META
content = content.replace(
  "api: { id: 'api', label: 'API keys', icon: KeyRound, group: 'workspace' },",
  "api: { id: 'api', label: 'API keys', icon: KeyRound, group: 'workspace' },\n  payments: { id: 'payments', label: 'Payments', icon: CreditCard, group: 'workspace' },"
);

fs.writeFileSync('src/components/settings/settings-sections.ts', content);
