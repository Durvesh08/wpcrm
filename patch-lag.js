const fs = require('fs');
let code = fs.readFileSync('src/components/inbox/message-thread.tsx', 'utf8');

const oldQuery = `.from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });`;

const newQuery = `.from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(100);`;

code = code.replace(oldQuery, newQuery);

const oldSet = `onMessagesLoadedRef.current(data ?? []);`;
const newSet = `onMessagesLoadedRef.current((data ?? []).reverse());`;

code = code.replace(oldSet, newSet);

fs.writeFileSync('src/components/inbox/message-thread.tsx', code);
