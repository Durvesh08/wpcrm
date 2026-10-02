const fs = require('fs');
let code = fs.readFileSync('src/lib/whatsapp/send-message.ts', 'utf8');

// 1. Add 'note' to valid types
code = code.replace(
  /export const VALID_MESSAGE_TYPES = \[/,
  "export const VALID_MESSAGE_TYPES = [\n  'note',"
);

// 2. Bypass Meta
const targetLoop = `  try {
    const variants = phoneVariants(sanitizedPhone);
    let lastError: unknown = null;

    for (const variant of variants) {
      try {
        waMessageId = await attempt(variant);
        workingPhone = variant;
        lastError = null;
        break;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!isRecipientNotAllowedError(message)) {
          throw err;
        }
        lastError = err;
        console.warn(
          \`[send-message] variant "\${variant}" rejected by Meta, trying next…\`
        );
      }
    }

    if (lastError) throw lastError;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown Meta API error';
    console.error('[send-message] Meta send failed for all variants:', message);
    throw new SendMessageError('meta_error', \`Meta API error: \${message}\`, 502);
  }`;

const newLoop = `  if (messageType === 'note') {
    waMessageId = \`note-\${crypto.randomUUID()}\`;
  } else {
    try {
      const variants = phoneVariants(sanitizedPhone);
      let lastError: unknown = null;

      for (const variant of variants) {
        try {
          waMessageId = await attempt(variant);
          workingPhone = variant;
          lastError = null;
          break;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (!isRecipientNotAllowedError(message)) {
            throw err;
          }
          lastError = err;
          console.warn(
            \`[send-message] variant "\${variant}" rejected by Meta, trying next…\`
          );
        }
      }

      if (lastError) throw lastError;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unknown Meta API error';
      console.error('[send-message] Meta send failed for all variants:', message);
      throw new SendMessageError('meta_error', \`Meta API error: \${message}\`, 502);
    }
  }`;

code = code.replace(targetLoop, newLoop);

fs.writeFileSync('src/lib/whatsapp/send-message.ts', code);
