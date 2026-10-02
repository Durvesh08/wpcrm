#!/bin/bash
set -e

echo "1. Creating vercel.json..."
cat << 'JSON' > vercel.json
{
  "crons": [
    {
      "path": "/api/automations/cron",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/flows/cron",
      "schedule": "*/5 * * * *"
    }
  ]
}
JSON

echo "2. Fixing NEXT_PUBLIC_APP_URL..."
sed -i.bak 's/NEXT_PUBLIC_APP_URL/NEXT_PUBLIC_SITE_URL/g' src/app/api/payments/create-link/route.ts
sed -i.bak 's/NEXT_PUBLIC_APP_URL/NEXT_PUBLIC_SITE_URL/g' src/app/api/ai/transcribe/route.ts

echo "3. Adding maxDuration to long-running routes..."
# Insert at line 2 or after imports
sed -i.bak '/^import /b; /maxDuration/d; 1a\
export const maxDuration = 60;
' src/app/api/whatsapp/broadcast/route.ts

sed -i.bak '/^import /b; /maxDuration/d; 1a\
export const maxDuration = 60;
' src/app/api/automations/cron/route.ts

sed -i.bak '/^import /b; /maxDuration/d; 1a\
export const maxDuration = 60;
' src/app/api/whatsapp/templates/sync/route.ts

echo "Done."
