/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

/* Default Hello World! code
export default {
  async fetch(request, env, ctx) {
    // You can view your logs in the Observability dashboard
    console.info({ message: 'Hello World Worker received a request!' }); 
    return new Response('Hello World!');
  }
};
*/

export default {
  async fetch(request, env) {
    // ------------------------------
    // CORS HEADERS
    // ------------------------------
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://jimothytracker.org",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    try {
      // Handle preflight OPTIONS request
      if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
      }

      // Only allow POST
      if (request.method !== "POST") {
        return new Response("Only POST allowed", {
          status: 405,
          headers: corsHeaders
        });
      }

      // ------------------------------
      // PARSE REQUEST BODY
      // ------------------------------
      const body = await request.json();
      const dispatch = {
        event_type: "jimothy_sighting",
        client_payload: body
      };

      // LOG ENV VARS + PAYLOAD
      console.log("GH_OWNER:", env.GH_OWNER);
      console.log("GH_REPO:", env.GH_REPO);
      console.log("GH_TOKEN exists:", !!env.GH_TOKEN);
      console.log("Dispatch payload:", JSON.stringify(dispatch));

      // ------------------------------
      // TRIGGER GITHUB ACTION
      // ------------------------------
      const res = await fetch(
        `https://api.github.com/repos/${env.GH_OWNER}/${env.GH_REPO}/dispatches`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${env.GH_TOKEN}`,
            "Accept": "application/vnd.github+json",
            "User-Agent": "jimothy-tracker-worker" //required by GitHub
          },
          body: JSON.stringify(dispatch)
        }
      );

      // LOG GITHUB RESPONSE
      console.log("GitHub response status:", res.status);
      console.log("GitHub response text:", await res.text());

      if (!res.ok) {
        const text = await res.text();
        return new Response("GitHub error: " + text, {
          status: 500,
          headers: corsHeaders
        });
      }

      // ------------------------------
      // SUCCESS RESPONSE
      // ------------------------------
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    } catch (err) {
      console.error("Worker crashed:", err);
      return new Response("Internal error", {
        status: 500,
        headers: corsHeaders
      });
    }
  }
};
