const fs = require('fs');

let bubble = fs.readFileSync('src/components/inbox/message-bubble.tsx', 'utf8');
if (!bubble.includes("StickyNote} from 'lucide-react'")) {
  bubble = bubble.replace(/import {([^}]+)} from 'lucide-react';/, "import {$1, StickyNote} from 'lucide-react';");
}
fs.writeFileSync('src/components/inbox/message-bubble.tsx', bubble);

let composer = fs.readFileSync('src/components/inbox/message-composer.tsx', 'utf8');
if (!composer.includes("StickyNote} from 'lucide-react'")) {
  composer = composer.replace(/import {([^}]+)} from 'lucide-react';/, "import {$1, StickyNote} from 'lucide-react';");
}
fs.writeFileSync('src/components/inbox/message-composer.tsx', composer);
