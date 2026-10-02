const fs = require('fs');

let code = fs.readFileSync('src/components/inbox/message-composer.tsx', 'utf8');

if (!code.includes('import { useQuickReplies }')) {
  code = `import { useQuickReplies } from "@/hooks/use-quick-replies";\n` + code;
}

if (!code.includes('useMemo')) {
  code = code.replace(/import \{([^}]+)\} from "react";/, 'import { $1, useMemo } from "react";');
}

// Ensure useMemo is imported from react if the first replace failed
if (!code.match(/import .*useMemo.* from ['"]react['"]/)) {
  code = code.replace(/import { useState/, 'import { useState, useMemo');
}

code = code.replace(/return replies\.filter\(r => r\.shortcut/g, 'return replies.filter((r: any) => r.shortcut');
code = code.replace(/\{filteredReplies\.map\(\(reply, i\) => \(/g, '{filteredReplies.map((reply: any, i: number) => (');

fs.writeFileSync('src/components/inbox/message-composer.tsx', code);
