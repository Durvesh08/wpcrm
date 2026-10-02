const fs = require('fs');

let bubble = fs.readFileSync('src/components/inbox/message-bubble.tsx', 'utf8');
bubble = bubble.replace(/,\s*,\s*StickyNote/g, ', StickyNote');
bubble = bubble.replace(/Loader2,\n, StickyNote/g, 'Loader2,\n  StickyNote');
fs.writeFileSync('src/components/inbox/message-bubble.tsx', bubble);

let composer = fs.readFileSync('src/components/inbox/message-composer.tsx', 'utf8');
composer = composer.replace(/,\s*,\s*StickyNote/g, ', StickyNote');
fs.writeFileSync('src/components/inbox/message-composer.tsx', composer);
