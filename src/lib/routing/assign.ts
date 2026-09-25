import type { SupabaseClient } from '@supabase/supabase-js';

export interface AssignOptions {
  accountId: string;
  conversationId: string;
}

/**
 * Assigns a conversation to an agent based on the account's routing configuration.
 */
export async function assignConversation(
  db: SupabaseClient,
  { accountId, conversationId }: AssignOptions
): Promise<void> {
  // 1. Fetch routing config
  const { data: config } = await db
    .from('routing_configs')
    .select('*')
    .eq('account_id', accountId)
    .single();

  if (!config || !config.enabled || config.mode === 'manual') {
    return;
  }

  // 2. Fetch eligible agents (owner, admin, agent)
  const { data: agents } = await db
    .from('profiles')
    .select('user_id, role')
    .eq('account_id', accountId)
    .in('role', ['owner', 'admin', 'agent']);

  if (!agents || agents.length === 0) {
    return;
  }

  let eligibleAgents = agents;

  // 3. Filter by online status if skip_offline is true
  if (config.skip_offline) {
    // member_presence is considered online if status is 'online' and last_seen_at is within threshold
    // Since we don't have a rigid threshold defined in SQL, let's say 2 minutes.
    const { data: presence } = await db
      .from('member_presence')
      .select('user_id, status, last_seen_at')
      .eq('account_id', accountId)
      .eq('status', 'online');

    if (presence) {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const onlineUserIds = presence
        .filter((p: any) => new Date(p.last_seen_at) >= twoMinutesAgo)
        .map((p: any) => p.user_id);

      const onlineAgents = eligibleAgents.filter((a) =>
        onlineUserIds.includes(a.user_id)
      );

      // Fallback to all eligible agents if no one is online?
      // Typically if skip_offline is true and no one is online, we might just not assign it or assign it anyway.
      // Let's not assign if no one is online and skip_offline is true.
      if (onlineAgents.length === 0) {
        return;
      }
      eligibleAgents = onlineAgents;
    } else {
      return;
    }
  }

  let assignedUserId: string | null = null;

  if (config.mode === 'round_robin') {
    // Sort agents to have a deterministic order
    eligibleAgents.sort((a, b) => a.user_id.localeCompare(b.user_id));
    
    let nextIndex = 0;
    if (config.last_assigned_user_id) {
      const lastIndex = eligibleAgents.findIndex(
        (a) => a.user_id === config.last_assigned_user_id
      );
      if (lastIndex !== -1) {
        nextIndex = (lastIndex + 1) % eligibleAgents.length;
      }
    }
    
    assignedUserId = eligibleAgents[nextIndex].user_id;
  } else if (config.mode === 'load_balance') {
    // Fetch current open conversation counts for eligible agents
    const { data: convCounts } = await db
      .from('conversations')
      .select('assignee_id')
      .eq('account_id', accountId)
      .eq('status', 'open')
      .in(
        'assignee_id',
        eligibleAgents.map((a) => a.user_id)
      );

    const counts: Record<string, number> = {};
    eligibleAgents.forEach((a) => {
      counts[a.user_id] = 0;
    });

    if (convCounts) {
      convCounts.forEach((c: any) => {
        if (c.assignee_id && counts[c.assignee_id] !== undefined) {
          counts[c.assignee_id]++;
        }
      });
    }

    // Find agent with min count
    let minCount = Infinity;
    for (const a of eligibleAgents) {
      if (counts[a.user_id] < minCount) {
        minCount = counts[a.user_id];
        assignedUserId = a.user_id;
      }
    }
  }

  if (assignedUserId) {
    // 4. Update conversation
    await db
      .from('conversations')
      .update({ assignee_id: assignedUserId })
      .eq('id', conversationId);

    // 5. Update last_assigned_user_id
    if (config.mode === 'round_robin') {
      await db
        .from('routing_configs')
        .update({ last_assigned_user_id: assignedUserId })
        .eq('id', config.id);
    }
  }
}
