import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import type { SupabaseClient } from "@supabase/supabase-js";

let app: App | null = null;

function getFirebaseApp() {
  if (app) return app;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  try {
    const serviceAccount = JSON.parse(raw) as {
      project_id: string;
      client_email: string;
      private_key: string;
    };

    app =
      getApps()[0] ??
      initializeApp({
        credential: cert({
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKey: serviceAccount.private_key,
        }),
      });
    return app;
  } catch (error) {
    console.error("[firebase] invalid FIREBASE_SERVICE_ACCOUNT_JSON", error);
    return null;
  }
}

export async function sendAccountPushNotification(
  db: SupabaseClient,
  params: {
    accountId: string;
    title: string;
    body: string;
    conversationId?: string;
  },
) {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return;

  const { data, error } = await db
    .from("app_push_tokens")
    .select("token")
    .eq("account_id", params.accountId);

  if (error) {
    console.error("[push] failed to load device tokens:", error);
    return;
  }

  const tokens = [...new Set((data ?? []).map((row) => row.token).filter(Boolean))];
  if (tokens.length === 0) return;

  const messaging = getMessaging(firebaseApp);
  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title: params.title,
      body: params.body,
    },
    data: {
      url: params.conversationId
        ? `/inbox?c=${params.conversationId}`
        : "/inbox",
      conversationId: params.conversationId ?? "",
    },
    android: {
      priority: "high",
      notification: {
        channelId: "default",
        sound: "default",
      },
    },
  });

  const invalidTokens = response.responses
    .map((item, index) => ({ item, token: tokens[index] }))
    .filter(({ item }) => {
      const code = item.error?.code;
      return (
        code === "messaging/invalid-registration-token" ||
        code === "messaging/registration-token-not-registered"
      );
    })
    .map(({ token }) => token);

  if (invalidTokens.length > 0) {
    await db.from("app_push_tokens").delete().in("token", invalidTokens);
  }
}
