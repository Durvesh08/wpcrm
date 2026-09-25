const fs = require('fs');
let content = fs.readFileSync('src/components/inbox/payment-link-dialog.tsx', 'utf8');

content = content.replace(
  '<DialogTrigger asChild>\n        {children}\n      </DialogTrigger>',
  '<DialogTrigger render={children as React.ReactElement} />'
);

fs.writeFileSync('src/components/inbox/payment-link-dialog.tsx', content);
