import { NextResponse } from "next/server";

import { getCurrentAccount, toErrorResponse } from "@/lib/auth/account";

const MAX_TOKEN_LEN = 4096;
const MAX_PLATFORM_LEN = 32;

export async function POST(request: Request) {
  try {
    const ctx = await getCurrentAccount();
    const body = (await request.json().catch(() => null)) as
      | { token?: unknown; platform?: unknown }
      | null;

    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const platform =
      typeof body?.platform === "string"
        ? body.platform.trim().slice(0, MAX_PLATFORM_LEN)
        : "android";

    if (!token || token.length > MAX_TOKEN_LEN) {
      return NextResponse.json(
        { error: "Valid token is required" },
        { status: 400 },
      );
    }

    const { error } = await ctx.supabase.from("app_push_tokens").upsert(
      {
        account_id: ctx.accountId,
        user_id: ctx.userId,
        token,
        platform: platform || "android",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    );

    if (error) {
      console.error("[push-token] save error:", error);
      return NextResponse.json(
        { error: "Failed to save push token" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
