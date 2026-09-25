const fs = require('fs');
let content = fs.readFileSync('src/components/inbox/message-composer.tsx', 'utf8');

// Imports
content = content.replace(
  'import { ReplyQuote } from "./reply-quote";',
  'import { ReplyQuote } from "./reply-quote";\nimport { PaymentLinkDialog } from "./payment-link-dialog";\nimport { CreditCard } from "lucide-react";'
);

// add payment button to toolbar before `<textarea`
content = content.replace(
  '          <textarea',
  `          <PaymentLinkDialog
            conversationId={conversationId}
            onLinkCreated={(url) => {
              setText((prev) => (prev ? prev + "\\n\\n" + url : url));
              textareaRef.current?.focus();
            }}
          >
            <GatedButton
              variant="ghost"
              size="sm"
              canAct={!readOnly}
              gateReason="send messages"
              title={readOnly ? undefined : "Create payment link"}
              className="h-9 w-9 shrink-0 p-0 text-muted-foreground hover:text-primary"
            >
              <CreditCard className="h-4 w-4" />
            </GatedButton>
          </PaymentLinkDialog>

          <textarea`
);

fs.writeFileSync('src/components/inbox/message-composer.tsx', content);
