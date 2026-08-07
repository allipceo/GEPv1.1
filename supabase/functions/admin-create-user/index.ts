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
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  // 관리자 인증 확인
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // 호출자가 관리자인지 확인
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  // gep_admin_emails 확인 (gep_is_admin()과 동일하게 대소문자 무시 비교)
  const { data: adminRow } = await supabaseAdmin
    .from('gep_admin_emails')
    .select('email')
    .eq('email', (user.email ?? '').toLowerCase())
    .single()

  if (!adminRow) {
    return jsonResponse({ error: 'Forbidden: not admin' }, 403)
  }

  // 요청 본문 파싱
  const { employeeId, realName, phone } = await req.json()

  if (!employeeId || !realName || !phone) {
    return jsonResponse({ error: '사번, 실명, 휴대폰 필수' }, 400)
  }

  const normalizedEmployeeId = String(employeeId).trim()
  const normalizedPhone = String(phone).replace(/\D/g, '')

  if (!/^\d{6,}$/.test(normalizedEmployeeId)) {
    return jsonResponse({ error: '사번은 숫자 6자리 이상이어야 합니다.' }, 400)
  }

  if (normalizedPhone.length < 8) {
    return jsonResponse({ error: '휴대폰 번호가 올바르지 않습니다.' }, 400)
  }

  // 이메일 및 비밀번호 생성
  const email = `${normalizedEmployeeId}@gep.local`
  const password = normalizedPhone.slice(-8) // 끝 8자리

  // Supabase Auth에 사용자 생성
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // 이메일 확인 생략
  })

  if (createError || !newUser?.user) {
    return jsonResponse({ error: createError?.message ?? '계정 생성 실패' }, 400)
  }

  // users 테이블에 프로필 생성
  const { error: profileError } = await supabaseAdmin
    .from('users')
    .insert({
      user_id: newUser.user.id,
      real_name: realName,
      phone_number: normalizedPhone,
      status: 'active',
      approval_status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      is_paused: false,
    })

  if (profileError) {
    // auth user는 생성됐으나 profile 실패 → auth user 삭제 후 에러 반환
    await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
    return jsonResponse({ error: profileError.message }, 500)
  }

  return jsonResponse({ success: true, email, employeeId: normalizedEmployeeId }, 200)
})
