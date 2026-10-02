const fs = require('fs');
let code = fs.readFileSync('src/components/inbox/contact-sidebar.tsx', 'utf8');

// Replace DropdownMenuTrigger asChild
code = code.replace(/<DropdownMenuTrigger asChild>/g, '<DropdownMenuTrigger>');

// Replace DropdownMenuItem asChild
code = code.replace(/<DropdownMenuItem asChild>([\s\S]*?)<\/DropdownMenuItem>/g, '<DropdownMenuItem onClick={() => { window.location.href = `/contacts/${contact.id}` }}>\n                    <UserPlus className="mr-2 h-4 w-4" />\n                    Full Contact Page\n                </DropdownMenuItem>');

// Replace PopoverTrigger asChild
code = code.replace(/<PopoverTrigger asChild>/g, '<PopoverTrigger>');

fs.writeFileSync('src/components/inbox/contact-sidebar.tsx', code);
