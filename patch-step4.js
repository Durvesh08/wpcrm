const fs = require('fs');
let code = fs.readFileSync('src/components/broadcasts/step4-schedule-send.tsx', 'utf8');

// Add imports
if (!code.includes('Calendar')) {
  code = code.replace(
    /import \{ ArrowLeft, Send, Loader2, Users, Save \} from 'lucide-react';/,
    "import { ArrowLeft, Send, Loader2, Users, Save, Calendar, Clock } from 'lucide-react';\nimport { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';"
  );
}

// Add state for scheduling
if (!code.includes('isScheduled')) {
  code = code.replace(
    /const \[loadingReach, setLoadingReach\] = useState\(true\);/,
    `const [loadingReach, setLoadingReach] = useState(true);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");`
  );
}

// Add UI for scheduling
const scheduleUI = `
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Schedule Broadcast</h3>
              <p className="text-sm text-muted-foreground">Send immediately or pick a date/time.</p>
            </div>
          </div>
          
          <div className="mt-5 flex flex-col gap-4 sm:flex-row">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="radio" checked={!isScheduled} onChange={() => setIsScheduled(false)} className="accent-primary" />
              Send Immediately
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="radio" checked={isScheduled} onChange={() => setIsScheduled(true)} className="accent-primary" />
              Schedule for Later
            </label>
          </div>
          
          {isScheduled && (
            <div className="mt-4 grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Date</label>
                <Input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Time (Local)</label>
                <Input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} />
              </div>
            </div>
          )}
        </div>
`;

code = code.replace(
  /        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">\s*<div className="flex items-center gap-3">/,
  scheduleUI + '\n        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">\n          <div className="flex items-center gap-3">'
);

// Modify onSend call to pass the date
code = code.replace(
  /onSend\(\);\n                \}\}/g,
  `if (isScheduled && (!scheduleDate || !scheduleTime)) {
                    alert("Please select a valid date and time.");
                    return;
                  }
                  const isoString = isScheduled ? new Date(\`\${scheduleDate}T\${scheduleTime}\`).toISOString() : undefined;
                  onSend(isoString);
                }}`
);

// Update props
code = code.replace(/onSend: \(\) => void;/, 'onSend: (scheduledAt?: string) => void;');

fs.writeFileSync('src/components/broadcasts/step4-schedule-send.tsx', code);
