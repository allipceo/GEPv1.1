import { supabase } from '../lib/supabase'

export async function resetCountingBaseline(authState, options = {}) {
  const targetUserId = options.targetUserId ?? authState.userId
  const actorUserId = authState.userId
  const isSelfReset = targetUserId === actorUserId
  const actorType = isSelfReset ? 'self' : 'operator'

  if (!actorUserId || !targetUserId) {
    return { success: false, error: 'missing_user' }
  }

  if (!isSelfReset && authState.isAdmin !== true) {
    return { success: false, error: 'operator_permission_required' }
  }

  const newBaselineAt = new Date().toISOString()

  if (isSelfReset) {
    // 본인 초기화 — SECURITY DEFINER RPC (users_self_update 정책 없이도 안전하게 본인 행만 갱신)
    const { error } = await supabase.rpc('reset_counting_baseline', {
      p_reason: options.reason ?? null,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, resetBaselineAt: newBaselineAt }
  }

  // 관리자가 타인 초기화 — 직접 UPDATE (users_admin_update 정책, 이번 정리 대상 아님)
  const previousBaselineAt = options.previousBaselineAt ?? null

  const { error: updateError } = await supabase
    .from('users')
    .update({ reset_baseline_at: newBaselineAt })
    .eq('user_id', targetUserId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  const { error: eventError } = await supabase
    .from('reset_events')
    .insert({
      user_id: targetUserId,
      actor_user_id: actorUserId,
      actor_type: actorType,
      reset_scope: 'all',
      previous_baseline_at: previousBaselineAt,
      new_baseline_at: newBaselineAt,
      reason: options.reason ?? null,
    })

  if (eventError) {
    console.warn('[GEP] reset_events insert failed:', eventError.message)
  }

  return { success: true, resetBaselineAt: newBaselineAt }
}
