import { createClient } from "jsr:@supabase/supabase-js@^2";
// This Edge Function handles the email verification process
// Export a specific config to make this function public (no auth required)
export const config = {
  path: "/verify-email",
  auth: {
    authorized: () => true, // This makes the function public
  },
};
Deno.serve(async (req) => {
  try {
    // Get the URL and extract parameters
    const url = new URL(req.url);
    // The token is typically in the hash fragment which isn't accessible server-side
    // So we need to handle this differently depending on how Supabase sends the token
    // Option 1: If token is in query parameters
    const token = url.searchParams.get("token");
    const type = url.searchParams.get("type");
    // Option 2: If using a custom flow where token is in the path
    // const pathParts = url.pathname.split('/')
    // const token = pathParts[pathParts.length - 1]
    // Redirect URL after verification (customize this)
    const redirectTo = url.searchParams.get("redirect_to") || "/";
    // Log only in development
    if (Deno.env.get("NODE_ENV") === "development") {
      console.log("Verification request received:", {
        token: token ? "present" : "missing",
        type,
      });
    }
    if (!token) {
      console.error("No token provided");
      return new Response("Missing verification token", {
        status: 400,
      });
    }
    // Create a Supabase client with the service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );
    // Verify the user's email
    const { data, error } = await supabaseAdmin.auth.verifyOtp({
      token_hash: token,
      type: type || "email_confirmation",
    });
    if (error) {
      console.error("Verification error:", error);
      return new Response(`Error verifying email: ${error.message}`, {
        status: 400,
        headers: {
          "Content-Type": "text/plain",
        },
      });
    }
    console.log("Email verified successfully:", data);
    // Redirect to the success page
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${redirectTo}?verified=true`,
      },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response("An unexpected error occurred during verification", {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
});
