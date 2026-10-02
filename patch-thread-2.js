const fs = require('fs');
let code = fs.readFileSync('src/components/inbox/message-thread.tsx', 'utf8');

code = code.replace(
  /body: JSON\.stringify\(\{\n\s*conversation_id: conversation\.id,\n\s*message_type: 'text',\n\s*content_text: text,\n\s*reply_to_message_id: replyToId,\n\s*\}\),/,
  `body: JSON.stringify({
            conversation_id: conversation.id,
            message_type: isInternalNote ? 'note' : 'text',
            content_text: text,
            reply_to_message_id: replyToId,
          }),`
);

fs.writeFileSync('src/components/inbox/message-thread.tsx', code);
