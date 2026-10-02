const fs = require('fs');
let code = fs.readFileSync('src/components/inbox/message-bubble.tsx', 'utf8');

// 1. Define isInternalNote
code = code.replace(
  /const time = format\(new Date\(message\.created_at\), 'HH:mm'\);/,
  `const time = format(new Date(message.created_at), 'HH:mm');
  const isInternalNote = message.content_type === 'note';`
);

// 2. Modify background classes
code = code.replace(
  /isAgent\n\s*\? 'bg-primary text-primary-foreground rounded-br-md'\n\s*: 'bg-muted text-foreground rounded-bl-md'/,
  `isInternalNote
            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 border border-amber-200 dark:border-amber-700/50 rounded-2xl shadow-sm'
            : isAgent
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted text-foreground rounded-bl-md'`
);

// 3. Render note content
// Where is content rendered?
// Let's add a note indicator icon.
code = code.replace(
  /\{message\.content_type === 'text' && \(/,
  `{isInternalNote && (
        <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold uppercase tracking-wider opacity-60">
          <StickyNote className="h-3 w-3" /> Internal Note
        </div>
      )}
      {(message.content_type === 'text' || message.content_type === 'note') && (`
);

// We need to import StickyNote
if (!code.includes('StickyNote')) {
  code = code.replace(/import {/, "import { StickyNote,");
}

fs.writeFileSync('src/components/inbox/message-bubble.tsx', code);
