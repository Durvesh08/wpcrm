const fs = require('fs');
let content = fs.readFileSync('src/app/(dashboard)/settings/page.tsx', 'utf8');

// import
content = content.replace(
  "import { ApiKeysSettings } from '@/components/settings/api-keys-settings';",
  "import { ApiKeysSettings } from '@/components/settings/api-keys-settings';\nimport { PaymentsSettings } from '@/components/settings/payments-settings';"
);

// add to case statement
content = content.replace(
  "case 'api':\n        return <ApiKeysSettings />;",
  "case 'api':\n        return <ApiKeysSettings />;\n      case 'payments':\n        return <PaymentsSettings />;"
);

fs.writeFileSync('src/app/(dashboard)/settings/page.tsx', content);
