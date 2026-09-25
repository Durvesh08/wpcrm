import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // unauthenticated read

export async function GET(
  request: Request,
  context: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await context.params;

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: config, error } = await supabase
    .from('widget_configs')
    .select('*')
    .eq('account_id', accountId)
    .single();

  if (error || !config || !config.enabled) {
    return new NextResponse('/* Widget disabled or not found */', {
      headers: { 'Content-Type': 'application/javascript' },
    });
  }

  const {
    greeting_text,
    prefilled_message,
    position,
    primary_color,
    show_on_mobile,
  } = config;

  const redirectUrl = new URL(
    `/api/widget/${accountId}/redirect`,
    request.url
  ).toString();

  const scriptContent = `
(function() {
  if (!${show_on_mobile} && window.innerWidth <= 768) return;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  ${
    position === 'bottom-left'
      ? 'container.style.left = "20px";'
      : 'container.style.right = "20px";'
  }
  container.style.zIndex = '999999';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  ${
    position === 'bottom-left'
      ? 'container.style.alignItems = "flex-start";'
      : 'container.style.alignItems = "flex-end";'
  }
  container.style.fontFamily = 'system-ui, -apple-system, sans-serif';

  const greeting = document.createElement('div');
  greeting.innerText = ${JSON.stringify(greeting_text || '')};
  greeting.style.backgroundColor = 'white';
  greeting.style.color = '#333';
  greeting.style.padding = '12px 16px';
  greeting.style.borderRadius = '8px';
  greeting.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  greeting.style.marginBottom = '12px';
  greeting.style.fontSize = '14px';
  greeting.style.display = 'none';
  greeting.style.whiteSpace = 'pre-wrap';
  
  const button = document.createElement('a');
  button.href = ${JSON.stringify(redirectUrl)} + (${JSON.stringify(prefilled_message)} ? "?text=" + encodeURIComponent(${JSON.stringify(prefilled_message)}) : "");
  button.target = "_blank";
  button.rel = "noopener noreferrer";
  button.style.backgroundColor = ${JSON.stringify(primary_color || '#25D366')};
  button.style.width = '60px';
  button.style.height = '60px';
  button.style.borderRadius = '50%';
  button.style.display = 'flex';
  button.style.justifyContent = 'center';
  button.style.alignItems = 'center';
  button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  button.style.cursor = 'pointer';
  button.style.textDecoration = 'none';
  
  // WhatsApp Icon SVG
  button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="white" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.383-.043c.108-.116.477-.547.606-.702.13-.153.255-.118.41-.043s.983.462 1.151.546c.168.084.281.127.323.196.043.069.043.4-.101.805z"/></svg>';
  
  if (${JSON.stringify(greeting_text)}) {
    button.onmouseover = function() { greeting.style.display = 'block'; };
    button.onmouseout = function() { greeting.style.display = 'none'; };
  }

  if (${JSON.stringify(greeting_text)}) {
    container.appendChild(greeting);
  }
  container.appendChild(button);
  document.body.appendChild(container);
  
  if (${JSON.stringify(greeting_text)}) {
    setTimeout(() => { greeting.style.display = 'block'; }, 1000);
    setTimeout(() => { greeting.style.display = 'none'; }, 6000);
  }
})();
`;

  return new NextResponse(scriptContent.trim(), {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
