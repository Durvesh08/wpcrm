const fs = require('fs');
let code = fs.readFileSync('src/app/api/whatsapp/broadcast/route.ts', 'utf8');

const oldAuth = `    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }`;

const newAuth = `    const cronSecret = request.headers.get('x-cron-secret');
    const isCron = cronSecret === process.env.AUTOMATION_CRON_SECRET;
    
    let user;
    if (!isCron) {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      user = authUser;
    } else {
      // Mock user for cron to satisfy type constraints downstream
      user = { id: 'cron-user' };
    }`;

code = code.replace(oldAuth, newAuth);

// Since user is mocked for cron, we don't want checkRateLimit to block cron, 
// though 'broadcast:cron-user' works fine unless we spam it.
// We also need accountId. Where does accountId come from?
// The body contains `account_id`? No!
// We need to bypass the profile check if cron, and get account_id from the body!
const oldAccountCheck = `    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .maybeSingle()
    const accountId = profile?.account_id as string | undefined
    if (!accountId) {
      return NextResponse.json(
        { error: 'Your profile is not linked to an account.' },
        { status: 403 },
      )
    }`;

const newAccountCheck = `    
    const body = await request.json();
    let accountId = body.account_id;

    if (!isCron) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .maybeSingle()
      accountId = profile?.account_id as string | undefined
      if (!accountId) {
        return NextResponse.json(
          { error: 'Your profile is not linked to an account.' },
          { status: 403 },
        )
      }
    } else if (!accountId) {
      return NextResponse.json({ error: 'account_id required for cron' }, { status: 400 });
    }`;

code = code.replace(oldAccountCheck, newAccountCheck);

// And we must remove the first `const body = await request.json()` from lower down!
const oldBodyParse = `    const body = await request.json()
    const {
      recipients: newRecipients,`;

const newBodyParse = `    const {
      recipients: newRecipients,`;

code = code.replace(oldBodyParse, newBodyParse);

fs.writeFileSync('src/app/api/whatsapp/broadcast/route.ts', code);
