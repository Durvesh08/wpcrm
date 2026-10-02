const fs = require('fs');
let code = fs.readFileSync('src/app/(dashboard)/broadcasts/new/page.tsx', 'utf8');

code = code.replace(
  /async function handleSend\(\) \{/,
  'async function handleSend(scheduledAt?: string) {'
);

code = code.replace(
  /headerMediaUrl,\n      \}\);/,
  'headerMediaUrl,\n        scheduledAt,\n      });'
);

code = code.replace(
  /<Step4ScheduleSend\n              name=\{name\}/,
  '<Step4ScheduleSend\n              name={name}\n              onSend={handleSend}'
);

// We need to ensure we don't accidentally double-pass onSend
code = code.replace(
  /onSend=\{handleSend\}\n              onSend=\{handleSend\}/,
  'onSend={handleSend}'
);

fs.writeFileSync('src/app/(dashboard)/broadcasts/new/page.tsx', code);
