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

/**
 * 파일럿 아이디 자동 생성 — `2026NNNN` (8자리) 순번.
 * 회사 개인정보 방침상 실제 사번/휴대폰번호를 쓰지 않고 앱이 순번을 부여한다.
 * auth.users 이메일(`<아이디>@gep.local`)에서 `2026` + 4자리 패턴만 추려 최댓값 + 1.
 * 모든 값은 문자열로 취급한다 (앞자리 0 보존, 숫자 변환은 비교용 임시로만).
 * 파일럿 규모(수십 명)에서 listUsers 1페이지(perPage 1000)로 충분.
 */
async function nextEmployeeId(supabaseAdmin: ReturnType<typeof createClient>): Promise<string> {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw new Error(error.message)

  let maxSeq = 20260900
  for (const u of data.users) {
    const m = String(u.email ?? '').match(/^(2026\d{4})@gep\.local$/)
    if (m) {
      const n = parseInt(m[1], 10)
      if (n > maxSeq) maxSeq = n
    }
  }
  return String(maxSeq + 1)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // 호출자 확인
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  // 관리자 판정 — public.users.is_admin (구 gep_admin_emails 테이블은 2026-08-15 삭제됨, GEPv30-163)
  const { data: callerProfile } = await supabaseAdmin
    .from('users')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()

  if (!callerProfile?.is_admin) {
    return jsonResponse({ error: 'Forbidden: not admin' }, 403)
  }

  const body = await req.json().catch(() => ({}))

  // 미리보기 모드 — 다음 아이디만 반환하고 생성하지 않음
  if (body?.dryRun === true) {
    try {
      return jsonResponse({ employeeId: await nextEmployeeId(supabaseAdmin) }, 200)
    } catch (err) {
      return jsonResponse({ error: (err as Error).message ?? '아이디 미리보기 실패' }, 500)
    }
  }

  // 입력 — 성명만 받는다. 초기 비밀번호는 자동 생성 아이디와 동일한 8자리 숫자로 설정한다.
  const realName = String(body?.realName ?? '').trim()

  if (!realName) {
    return jsonResponse({ error: '성명을 입력해 주세요.' }, 400)
  }

  // 아이디 자동 생성 (문자열)
  let employeeId: string
  try {
    employeeId = await nextEmployeeId(supabaseAdmin)
  } catch (err) {
    return jsonResponse({ error: (err as Error).message ?? '아이디 생성 실패' }, 500)
  }

  const email = `${employeeId}@gep.local`
  const initialPassword = employeeId

  // Supabase Auth 사용자 생성
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: initialPassword,
    email_confirm: true,
  })

  if (createError || !newUser?.user) {
    const msg = createError?.message ?? '계정 생성 실패'
    const dup = /already been registered|already exists|duplicate/i.test(msg)
    return jsonResponse(
      { error: dup ? '아이디가 중복되었습니다. 잠시 후 다시 시도해 주세요.' : msg },
      dup ? 409 : 400
    )
  }

  // users.phone_number 컬럼은 DB 구조 유지 목적으로 재사용한다.
  // 실제 휴대폰번호가 아니라 관리자 초기화 기준 8자리 숫자다.
  const { error: profileError } = await supabaseAdmin
    .from('users')
    .insert({
      user_id: newUser.user.id,
      real_name: realName,
      phone_number: initialPassword,
      status: 'active',
      approval_status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      is_paused: false,
    })

  if (profileError) {
    // 프로필 실패 시 auth user 롤백
    await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
    return jsonResponse({ error: profileError.message }, 500)
  }

  return jsonResponse({ success: true, employeeId, initialPassword, email, realName }, 200)
})
