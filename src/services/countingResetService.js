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
