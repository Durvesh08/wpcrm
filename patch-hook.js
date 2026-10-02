const fs = require('fs');
let code = fs.readFileSync('src/hooks/use-broadcast-sending.ts', 'utf8');

// Update PayloadType
code = code.replace(
  /headerMediaUrl\?: string;\n\}/,
  'headerMediaUrl?: string;\n  scheduledAt?: string;\n}'
);

// Update insertion status
code = code.replace(
  /status: 'sending',/,
  "status: payload.scheduledAt ? 'scheduled' : 'sending',\n          scheduled_at: payload.scheduledAt || null,"
);

// Early return if scheduled
const afterInsert = `      if (broadcastError || !broadcast) {
        throw new Error(
          \`Failed to create broadcast: \${broadcastError?.message ?? 'unknown error'}\`,
        );
      }`;

const earlyReturn = `      if (broadcastError || !broadcast) {
        throw new Error(
          \`Failed to create broadcast: \${broadcastError?.message ?? 'unknown error'}\`,
        );
      }

      if (payload.scheduledAt) {
        setProgress(100);
        return broadcast.id;
      }`;

code = code.replace(afterInsert, earlyReturn);

fs.writeFileSync('src/hooks/use-broadcast-sending.ts', code);
