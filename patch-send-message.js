const fs = require('fs');
let code = fs.readFileSync('src/lib/whatsapp/send-message.ts', 'utf8');

// Find the start of the Meta API block.
// It starts around line 241: `let waMessageId: string | undefined;`
const targetBlock = `  let waMessageId: string | undefined;
  let workingPhone = sanitizedPhone;

  // Closure over the Meta API dispatch.
  const attempt = async (phoneToTry: string) => {`;

const newBlock = `  let waMessageId: string | undefined;
  let workingPhone = sanitizedPhone;

  if (messageType === 'note') {
    // Internal private note: Skip Meta entirely.
    waMessageId = \`note-\${crypto.randomUUID()}\`;
  } else {
    // Closure over the Meta API dispatch.
    const attempt = async (phoneToTry: string) => {`;

code = code.replace(targetBlock, newBlock);

// We need to close the `} else {` block. 
// It ends right before `if (workingPhone !== sanitizedPhone) {`
const endTarget = `  if (workingPhone !== sanitizedPhone) {`;
const endReplacement = `  }

  if (workingPhone !== sanitizedPhone && messageType !== 'note') {`;

code = code.replace(endTarget, endReplacement);

fs.writeFileSync('src/lib/whatsapp/send-message.ts', code);
