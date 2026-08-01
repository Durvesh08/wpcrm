"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

export function PushRegistration() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let mounted = true;

    async function register() {
      try {
        const permission = await PushNotifications.requestPermissions();
        if (permission.receive !== "granted") return;

        await PushNotifications.register();

        const registration = await PushNotifications.addListener(
          "registration",
          async (token) => {
            if (!mounted) return;
            await fetch("/api/mobile/push-token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token: token.value,
                platform: Capacitor.getPlatform(),
              }),
            }).catch(() => undefined);
          },
        );

        const registrationError = await PushNotifications.addListener(
          "registrationError",
          (error) => {
            console.error("[push] registration error", error);
          },
        );

        const action = await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (event) => {
            const url = event.notification.data?.url;
            if (typeof url === "string" && url.startsWith("/")) {
              window.location.href = url;
            } else {
              window.location.href = "/inbox";
            }
          },
        );

        return () => {
          void registration.remove();
          void registrationError.remove();
          void action.remove();
        };
      } catch (error) {
        console.error("[push] setup failed", error);
      }
    }

    let cleanup: (() => void) | undefined;
    void register().then((fn) => {
      cleanup = fn;
    });

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, []);

  return null;
}
