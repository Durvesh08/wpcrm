const fs = require('fs');
let content = fs.readFileSync('src/components/inbox/conversation-list.tsx', 'utf8');

// Remove "hot" from the mapped array
content = content.replace(/\(\["all", "unread", "hot"\] as const\)/g, '(["all", "unread"] as const)');

// Remove the badge rendering block
const badgeRegex = /\{\(\(\) => \{\s*return badge \? \([\s\S]*?\) : null;\s*\}\)\(\)\}/g;
content = content.replace(badgeRegex, '');

fs.writeFileSync('src/components/inbox/conversation-list.tsx', content);
