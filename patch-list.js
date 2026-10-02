const fs = require('fs');
let content = fs.readFileSync('src/components/inbox/conversation-list.tsx', 'utf8');

// 1. Remove Stale types and badges
content = content.replace(/type StaleLevel[\s\S]*?};\n/g, "");

// 2. Remove "stale" and "hot" from filters
content = content.replace(/type InboxFilter = ConversationStatus \| "all" \| "unread" \| "hot" \| "stale";/g, 'type InboxFilter = ConversationStatus | "all" | "unread";');
content = content.replace(/\s*\{ label: "🔥 Hot Leads", value: "hot" \},\n/g, "");
content = content.replace(/\s*\{ label: "🔴 Stale", value: "stale" \},\n/g, "");

// 3. Remove filter logic
content = content.replace(/\} else if \(filter === "hot"\) \{[\s\S]*?\} else if \(filter === "stale"\) \{[\s\S]*?\} else if \(/g, "} else if (");

// 4. Remove stale badge rendering
content = content.replace(/const badge = STALE_BADGE\[getStaleLevel\(conversation\)\];\n/g, "");
content = content.replace(/\{\s*badge && \(\s*<div[\s\S]*?\{badge\.label\}\s*<\/div>\s*\)\s*\}/g, "");

fs.writeFileSync('src/components/inbox/conversation-list.tsx', content);
