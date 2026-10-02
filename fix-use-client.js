const fs = require('fs');

function ensureUseClientFirst(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  if (code.includes('"use client";') && !code.startsWith('"use client";') && !code.startsWith("'use client';")) {
    // Remove all instances of "use client";
    code = code.replace(/"use client";/g, '');
    code = code.replace(/'use client';/g, '');
    // Prepend it to the top
    code = '"use client";\n' + code.trim();
    fs.writeFileSync(filePath, code);
  }
}

ensureUseClientFirst('src/components/inbox/message-composer.tsx');
