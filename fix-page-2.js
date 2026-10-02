const fs = require('fs');
let code = fs.readFileSync('src/app/(dashboard)/broadcasts/new/page.tsx', 'utf8');

if (!code.includes('onSend={handleSend}')) {
  code = code.replace(/name=\{name\}/, 'name={name}\n              onSend={handleSend}');
}
fs.writeFileSync('src/app/(dashboard)/broadcasts/new/page.tsx', code);
