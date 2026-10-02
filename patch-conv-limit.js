const fs = require('fs');
let code = fs.readFileSync('src/components/inbox/conversation-list.tsx', 'utf8');

const target = `.order("last_message_at", { ascending: false });`;
const replacement = `.order("last_message_at", { ascending: false })\n        .limit(100);`;

code = code.replace(target, replacement);

fs.writeFileSync('src/components/inbox/conversation-list.tsx', code);
