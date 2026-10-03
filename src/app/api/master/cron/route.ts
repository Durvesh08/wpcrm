import { NextResponse } from 'next/server';
import { GET as automationsCron } from '@/app/api/automations/cron/route';
import { GET as flowsCron } from '@/app/api/flows/cron/route';
import { GET as broadcastsCron } from '@/app/api/broadcasts/cron/route';

export async function GET(request: Request) {
  const results: Record<string, any> = {};

  try {
    const autoRes = await automationsCron(request);
    results.automations = await autoRes.json().catch(() => 'ok');
  } catch (e: any) {
    results.automations = { error: e.message || 'failed' };
  }

  try {
    const flowsRes = await flowsCron(request);
    results.flows = await flowsRes.json().catch(() => 'ok');
  } catch (e: any) {
    results.flows = { error: e.message || 'failed' };
  }

  try {
    const broadcastsRes = await broadcastsCron(request);
    results.broadcasts = await broadcastsRes.json().catch(() => 'ok');
  } catch (e: any) {
    results.broadcasts = { error: e.message || 'failed' };
  }

  return NextResponse.json({ combined: true, results });
}
