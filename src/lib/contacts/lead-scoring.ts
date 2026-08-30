export type LeadStage =
  | 'new_lead'
  | 'cold'
  | 'warm'
  | 'hot'
  | 'qualified'
  | 'sales_ready'
  | 'customer';

export interface LeadScoringInput {
  requirement?: string | null;
  problem?: string | null;
  desired_outcome?: string | null;
  budget?: string | null;
  timeline?: string | null;
  decision_maker?: string | null;
  next_follow_up_at?: string | null;
  conversation_summary?: string | null;
}

export function stageFromScore(score: number): LeadStage {
  if (score >= 85) return 'sales_ready';
  if (score >= 70) return 'qualified';
  if (score >= 50) return 'hot';
  if (score >= 30) return 'warm';
  if (score >= 10) return 'cold';
  return 'new_lead';
}

export function calculateLeadScore(input: LeadScoringInput) {
  let score = 0;
  const has = (value?: string | null) => Boolean(value?.trim());

  if (has(input.requirement)) score += 18;
  if (has(input.problem)) score += 16;
  if (has(input.desired_outcome)) score += 14;
  if (has(input.budget)) score += 16;
  if (has(input.timeline)) score += 12;
  if (has(input.decision_maker)) score += 10;
  if (has(input.conversation_summary)) score += 8;

  if (input.next_follow_up_at) {
    const next = new Date(input.next_follow_up_at).getTime();
    if (Number.isFinite(next)) {
      score += next >= Date.now() ? 6 : 2;
    }
  }

  const normalized = Math.max(0, Math.min(100, score));
  return {
    score: normalized,
    stage: stageFromScore(normalized),
  };
}
