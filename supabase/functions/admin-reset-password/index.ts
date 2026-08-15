import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401)

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // 호출자 관리자 확인
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return jsonResponse({ error: 'Unauthorized' }, 401)

  const { data: adminRow } = await supabaseAdmin
    .from('gep_admin_emails')
    .select('email')
    .eq('email', (user.email ?? '').toLowerCase())
    .single()
  if (!adminRow) return jsonResponse({ error: 'Forbidden: not admin' }, 403)

  // 요청 파싱
  const { targetUserId } = await req.json()
  if (!targetUserId) return jsonResponse({ error: 'targetUserId 필수' }, 400)

  // users 테이블에서 phone_number 조회
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('phone_number')
    .eq('user_id', targetUserId)
    .single()

  if (profileError || !profile?.phone_number) {
    return jsonResponse({ error: '사용자 정보를 찾을 수 없습니다.' }, 404)
  }

  const newPassword = String(profile.phone_number).slice(-8)
  if (newPassword.length !== 8) {
    return jsonResponse({ error: '전화번호가 올바르지 않아 초기화할 수 없습니다.' }, 400)
  }

  // 비밀번호 초기화
  const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(
    targetUserId,
    { password: newPassword }
  )

  if (resetError) return jsonResponse({ error: resetError.message }, 500)

  return jsonResponse({ success: true, hint: `휴대폰 뒷 8자리(${newPassword})로 초기화됨` }, 200)
})
