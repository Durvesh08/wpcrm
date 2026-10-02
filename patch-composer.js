const fs = require('fs');
let code = fs.readFileSync('src/components/inbox/message-composer.tsx', 'utf8');

// Add isInternalNote to props
code = code.replace(
  /onSend: \(text: string, replyToId\?: string\) => void;/,
  'onSend: (text: string, replyToId?: string, isInternalNote?: boolean) => void;'
);

// Add state
code = code.replace(
  /const \[sending, setSending\] = useState\(false\);/,
  'const [sending, setSending] = useState(false);\n  const [isInternalNote, setIsInternalNote] = useState(false);'
);

// Add the toggle button
const targetJSX = `<div className="flex shrink-0 items-center gap-2 pr-4">`;
const toggleJSX = `<div className="flex shrink-0 items-center gap-2 pr-4">
              <button
                type="button"
                onClick={() => setIsInternalNote(!isInternalNote)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
                  isInternalNote 
                    ? "bg-amber-500/15 text-amber-600 border border-amber-500/30 shadow-sm" 
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
                title="Toggle Internal Note"
              >
                <div className={cn("h-2 w-2 rounded-full", isInternalNote ? "bg-amber-500" : "bg-muted-foreground/50")} />
                Note
              </button>`;
code = code.replace(targetJSX, toggleJSX);

// Update handleSend text
code = code.replace(
  /await onSend\(text, replyTo\?.message_id\);/,
  'await onSend(text, replyTo?.message_id, isInternalNote);'
);

// Make the textarea distinct when internal
code = code.replace(
  /className={cn\(/,
  'className={cn(isInternalNote && "bg-amber-500/5 placeholder:text-amber-600/50 text-amber-900 dark:text-amber-100", '
);

// Change the send button icon based on state
code = code.replace(
  /<Send className="h-4.5 w-4.5" \/>/g,
  '{isInternalNote ? <StickyNote className="h-4.5 w-4.5" /> : <Send className="h-4.5 w-4.5" />}'
);

// Need to import StickyNote
if (!code.includes('StickyNote')) {
  code = code.replace(/Send,/g, 'Send, StickyNote,');
}

fs.writeFileSync('src/components/inbox/message-composer.tsx', code);
