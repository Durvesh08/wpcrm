const fs = require('fs');
let code = fs.readFileSync('src/app/(dashboard)/broadcasts/new/page.tsx', 'utf8');

// Find the component usage and remove duplicate
code = code.replace(/onSend=\{handleSend\}\n              onSend=\{handleSend\}/g, 'onSend={handleSend}');

let matches = code.match(/onSend=\{handleSend\}/g);
if (matches && matches.length > 1) {
  // It probably looks like:
  // <Step4ScheduleSend
  //   name={name}
  //   onSend={handleSend}
  //   ...
  //   onSend={handleSend}
  
  // Just rewrite it manually
  code = code.replace(/<Step4ScheduleSend([^>]+)>/, (match) => {
     let inner = match;
     // remove all onSend={handleSend}
     inner = inner.replace(/onSend=\{handleSend\}\s*/g, '');
     // add one back at the end
     inner = inner.replace(/\/>$/, ' onSend={handleSend} />');
     return inner;
  });
}

fs.writeFileSync('src/app/(dashboard)/broadcasts/new/page.tsx', code);
