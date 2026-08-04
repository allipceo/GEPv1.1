export function canCountAttempts(authState = {}) {
  const {
    authStatus,
    userId,
    approvalStatus,
    status,
    isPaused,
    isAdmin,
  } = authState

  if (authStatus !== 'authenticated') return false
  if (!userId) return false
  if (status && status !== 'active') return false
  if (isPaused) return false

  return isAdmin === true || approvalStatus === 'approved'
}

export function getCountingBlockReason(authState = {}) {
  if (authState.authStatus !== 'authenticated') return 'not_authenticated'
  if (!authState.userId) return 'missing_user'
  if (authState.status && authState.status !== 'active') return 'inactive_user'
  if (authState.isPaused) return 'paused_user'
  if (authState.isAdmin === true || authState.approvalStatus === 'approved') return null
  return 'not_approved'
}
