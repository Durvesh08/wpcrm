const fs = require('fs');
let code = fs.readFileSync('src/components/pipelines/deal-card.tsx', 'utf8');

// Add Flame icon
if (!code.includes('Flame')) {
  code = code.replace(/import \{ ([^}]+) \} from "lucide-react";/, 'import { $1, Flame } from "lucide-react";');
}

// Add logic inside DealCard
const target = `  const contactLabel = deal.contact?.name || deal.contact?.phone || "No contact";`;
const newLogic = `  const contactLabel = deal.contact?.name || deal.contact?.phone || "No contact";
  
  const daysIdle = deal.updated_at ? Math.floor((Date.now() - new Date(deal.updated_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const isRotting = daysIdle > 7; // Rotting threshold: 7 days
`;
code = code.replace(target, newLogic);

// Add visual cue
const bgTarget = `className={\`group relative w-full cursor-pointer rounded-xl border border-border/50 bg-muted/70 pl-4 pr-3 py-3 text-left shadow-sm transition-all \${`;
const bgNew = `className={\`group relative w-full cursor-pointer rounded-xl border pl-4 pr-3 py-3 text-left shadow-sm transition-all \${isRotting ? 'border-rose-500/30 bg-rose-500/10' : 'border-border/50 bg-muted/70'} \${`;
code = code.replace(bgTarget, bgNew);

// Add Flame indicator to the header
const headerTarget = `        <h4 className="flex-1 text-sm font-semibold leading-snug text-foreground break-words">
          {deal.title}
        </h4>`;
const headerNew = `        <h4 className="flex-1 text-sm font-semibold leading-snug text-foreground break-words flex items-start justify-between gap-1">
          <span>{deal.title}</span>
          {isRotting && (
            <span className="flex items-center gap-1 text-[10px] text-rose-500 font-bold px-1.5 py-0.5 bg-rose-500/20 rounded shrink-0" title={\`Idle for \${daysIdle} days\`}>
              <Flame className="h-3 w-3" /> \${daysIdle}d
            </span>
          )}
        </h4>`;
code = code.replace(headerTarget, headerNew);

fs.writeFileSync('src/components/pipelines/deal-card.tsx', code);
