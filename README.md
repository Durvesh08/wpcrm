# ZOVAIX CRM

ZOVAIX CRM is a WhatsApp-focused sales and support workspace built with Next.js and Supabase.

## What it includes

- Shared inbox
- Contacts and pipelines
- Broadcasts and templates
- Automations and flows
- Team accounts and invites
- AI agents, translation, and knowledge tools
- Android wrapper app via Capacitor

## Local setup

```bash
npm install
npm run dev
```

Create a `.env.local` file before starting the app.

## Required environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `ENCRYPTION_KEY`
- `META_APP_SECRET`
- `NEXT_PUBLIC_APP_LOCALE`

## Android app

```bash
npm run android:sync
npm run android:debug
```

## Deployment

This project deploys well on Vercel. After deployment, add the same environment variables in Vercel Project Settings and redeploy.

## Repository

[Durvesh08/wpcrm](https://github.com/Durvesh08/wpcrm)
