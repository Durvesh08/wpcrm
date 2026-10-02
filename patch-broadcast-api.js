const fs = require('fs');
let code = fs.readFileSync('src/app/api/whatsapp/broadcast/route.ts', 'utf8');

// Allow cron bypass for auth
const authBlock = `    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }`;

const newAuthBlock = `    // Allow cron/admin bypass
    const cronSecret = request.headers.get('x-cron-secret');
    const isCron = cronSecret && cronSecret === process.env.AUTOMATION_CRON_SECRET;
    
    let userId;
    
    if (!isCron) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      userId = user.id;
    }`;

code = code.replace(authBlock, newAuthBlock);

// Then replace user.id with userId
code = code.replace(/user\.id/g, 'userId');

fs.writeFileSync('src/app/api/whatsapp/broadcast/route.ts', code);
