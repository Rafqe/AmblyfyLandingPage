import { createClient } from 'jsr:@supabase/supabase-js@^2';
Deno.serve(async (req)=>{
  try {
    // Get the URL parameters
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const type = url.searchParams.get('type');
    const redirectTo = url.searchParams.get('redirect_to') || '/';
    if (!token || type !== 'email_confirmation') {
      return new Response(JSON.stringify({
        error: 'Invalid confirmation link parameters'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // Create a Supabase client with the service role key
    // This bypasses RLS and allows confirming the user without auth
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    // Verify the email using the token
    const { error } = await supabaseAdmin.auth.verifyOtp({
      token_hash: token,
      type: 'email_confirmation'
    });
    if (error) {
      console.error('Verification error:', error);
      return new Response(JSON.stringify({
        error: 'Failed to verify email: ' + error.message
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // Successful verification, redirect to the app
    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectTo
      }
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({
      error: 'An unexpected error occurred'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
