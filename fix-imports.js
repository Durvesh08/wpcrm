const fs = require('fs');

let bubble = fs.readFileSync('src/components/inbox/message-bubble.tsx', 'utf8');
bubble = bubble.replace(/import { StickyNote, useState/, 'import { useState');
if (!bubble.includes('StickyNote')) {
  bubble = bubble.replace(/import {([^}]+)} from 'lucide-react';/, "import {$1, StickyNote} from 'lucide-react';");
}
fs.writeFileSync('src/components/inbox/message-bubble.tsx', bubble);

let composer = fs.readFileSync('src/components/inbox/message-composer.tsx', 'utf8');
composer = composer.replace(/onSend, StickyNote,/g, 'onSend,');
if (!composer.includes('import { StickyNote')) {
  composer = composer.replace(/import {([^}]+)} from 'lucide-react';/, "import {$1, StickyNote} from 'lucide-react';");
}
fs.writeFileSync('src/components/inbox/message-composer.tsx', composer);
