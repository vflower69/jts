/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
  async fetch(request, env) {

    // --- CORS headers reused everywhere ---
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://jimothytracker.org",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    // --- 1. Handle OPTIONS preflight immediately ---
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // --- 2. OPTIONAL: Block bot probes for suspicious paths ---
    const url = new URL(request.url);
    const badPaths = [
      ".env", ".dotenv", ".env.yarn", "api_keys.txt",
      "settings_local.py", "aws.php", "public/sitemap.xml"
    ];

    for (const bad of badPaths) {
      if (url.pathname.includes(bad)) {
        return new Response("Not found", {
          status: 404,
          headers: corsHeaders
        });
      }
    }

    // --- 3. Only allow the root path (optional but strong protection) ---
    if (url.pathname !== "/") {
      return new Response("Not found", {
        status: 404,
        headers: corsHeaders
      });
    }

    // --- 4. Safe KV logic with try/catch ---
    try {
      const key = "site_visits";

      let count = await env.JIMOTHYTRACKER_VISIT_COUNTER.get(key);
      count = count ? parseInt(count) : 0;

      const newCount = count + 1;

      // KV write may fail due to rolling window limits → catch it
      await env.JIMOTHYTRACKER_VISIT_COUNTER.put(key, newCount.toString());

      return new Response(JSON.stringify({ value: newCount }), {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });

    } catch (err) {
      // Always return CORS headers so your frontend never breaks
      return new Response(JSON.stringify({
        error: "KV error",
        detail: err.message
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
  }
};
