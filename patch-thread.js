const fs = require('fs');
let code = fs.readFileSync('src/components/inbox/message-thread.tsx', 'utf8');

// Update handleSend signature
code = code.replace(
  /async \(text: string, replyToId\?: string\) => \{/,
  'async (text: string, replyToId?: string, isInternalNote?: boolean) => {'
);

// Update optimistic message
code = code.replace(
  /content_type: 'text',/,
  "content_type: isInternalNote ? 'note' : 'text',"
);

// Update payload to backend
code = code.replace(
  /body: JSON\.stringify\(\{\n\s*text,\n\s*replyToId,\n\s*\}\),/,
  'body: JSON.stringify({\n          text,\n          replyToId,\n          isInternalNote,\n        }),'
);

// Need to render the 'note' type differently in the thread? 
// No, the rendering is inside message-bubble.tsx! We will patch message-bubble.tsx.

fs.writeFileSync('src/components/inbox/message-thread.tsx', code);
