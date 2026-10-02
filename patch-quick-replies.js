const fs = require('fs');

let code = fs.readFileSync('src/components/inbox/message-composer.tsx', 'utf8');

// Add import
if (!code.includes('useQuickReplies')) {
  code = code.replace(
    /import \{ useRole \} from "@\/hooks\/use-role";/,
    'import { useRole } from "@/hooks/use-role";\nimport { useQuickReplies } from "@/hooks/use-quick-replies";'
  );
}

// Add state to MessageComposer
const stateTarget = /const \[isInternalNote, setIsInternalNote\] = useState\(false\);/;
const stateNew = `const [isInternalNote, setIsInternalNote] = useState(false);
  const { replies } = useQuickReplies();
  const [qrOpen, setQrOpen] = useState(false);
  const [qrQuery, setQrQuery] = useState("");
  const [qrIndex, setQrIndex] = useState(0);
  
  const filteredReplies = useMemo(() => {
    if (!qrQuery) return replies;
    return replies.filter(r => r.shortcut.toLowerCase().includes(qrQuery.toLowerCase()) || r.content.toLowerCase().includes(qrQuery.toLowerCase()));
  }, [replies, qrQuery]);`;
if (!code.includes('useQuickReplies()')) {
  code = code.replace(stateTarget, stateNew);
}

// Update handleChange
const handleChangeTarget = `const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
      adjustHeight();
    },
    [adjustHeight]
  );`;
const handleChangeNew = `const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setText(val);
      adjustHeight();
      
      const slashMatch = val.match(/(?:^|\\s)\\/([a-zA-Z0-9_-]*)$/);
      if (slashMatch) {
        setQrOpen(true);
        setQrQuery(slashMatch[1]);
        setQrIndex(0);
      } else {
        setQrOpen(false);
      }
    },
    [adjustHeight]
  );`;
code = code.replace(handleChangeTarget, handleChangeNew);

// Update handleKeyDown
const handleKeyDownTarget = `const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );`;
const handleKeyDownNew = `const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (qrOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setQrIndex(i => Math.min(i + 1, filteredReplies.length - 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setQrIndex(i => Math.max(i - 1, 0));
          return;
        }
        if (e.key === "Enter" && filteredReplies.length > 0) {
          e.preventDefault();
          const selected = filteredReplies[qrIndex];
          if (selected) {
            setText(prev => prev.replace(/(?:^|\\s)\\/[a-zA-Z0-9_-]*$/, \` \${selected.content} \`).trimStart());
            setQrOpen(false);
          }
          return;
        }
        if (e.key === "Escape") {
          setQrOpen(false);
          return;
        }
      }
      
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend, qrOpen, filteredReplies, qrIndex]
  );`;
code = code.replace(handleKeyDownTarget, handleKeyDownNew);

// Insert Quick Replies dropdown above textarea
const textareaTarget = `<textarea\n            ref={textareaRef}`;
const popoverNew = `{qrOpen && filteredReplies.length > 0 && (
          <div className="absolute bottom-full left-0 z-50 mb-2 w-80 rounded-xl border border-border bg-card p-1 shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2">
            <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Quick Replies</span>
              <span className="opacity-60">Use ↑↓ & Enter</span>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filteredReplies.map((reply, i) => (
                <button
                  key={reply.id}
                  onClick={() => {
                    setText(prev => prev.replace(/(?:^|\\s)\\/[a-zA-Z0-9_-]*$/, \` \${reply.content} \`).trimStart());
                    setQrOpen(false);
                    textareaRef.current?.focus();
                  }}
                  className={cn(
                    "w-full flex flex-col items-start gap-1 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    i === qrIndex ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                  )}
                >
                  <span className="font-semibold text-xs text-primary">/{reply.shortcut}</span>
                  <span className="line-clamp-2 text-xs opacity-80">{reply.content}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <textarea\n            ref={textareaRef}`;
code = code.replace(textareaTarget, popoverNew);

// Make sure relative positioning works for the absolute dropdown
const containerTarget = `<div className="flex w-full flex-col">`;
code = code.replace(containerTarget, `<div className="flex w-full flex-col relative">`);

fs.writeFileSync('src/components/inbox/message-composer.tsx', code);
