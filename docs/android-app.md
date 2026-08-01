# ZOVAIX Android App

This repo includes a Capacitor Android wrapper for the live CRM.

- App name: `ZOVAIX`
- Package name: `com.adsrahu.crm`
- Live CRM URL: `https://wpcrm-wine.vercel.app`

## Firebase Files

`android/app/google-services.json` is included for the Android Firebase app.

Do not commit Firebase Admin service-account JSON files. The production server
uses this Vercel environment variable instead:

```txt
FIREBASE_SERVICE_ACCOUNT_JSON
```

## Supabase Migration

Run this migration in Supabase before testing push-token registration:

```txt
supabase/migrations/029_mobile_push_tokens.sql
```

## Build Locally

Install Android Studio first. It provides the Android SDK and bundled JDK.

Then run:

```bash
npm run android:sync
npm run android:open
```

From Android Studio you can build/run the app on a connected Android phone.

If Java and Android SDK are available in the terminal, a debug APK can be built:

```bash
npm run android:debug
```

The debug APK will be generated under:

```txt
android/app/build/outputs/apk/debug/
```
