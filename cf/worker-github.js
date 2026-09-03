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

// ---------------------------------------------------------
// Strict validator for jimothy sightings
// ---------------------------------------------------------
function validateSighting(body) {
  // Must be a plain object
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Body must be a JSON object" };
  }

  // Dangerous keys (prototype pollution vectors)
  const dangerous = ["constructor", "prototype", "__proto__"];
  for (const key of dangerous) {
    if (key in body) {
      return { ok: false, error: `Key '${key}' is not allowed` };
    }
  }

  // Required keys
  const requiredKeys = ["lat", "lng", "timestamp", "note"];

  // Reject unknown keys
  for (const key of Object.keys(body)) {
    if (!requiredKeys.includes(key)) {
      return { ok: false, error: `Unknown key '${key}'` };
    }
  }

  // Validate lat
  if (typeof body.lat !== "number" || Number.isNaN(body.lat)) {
    return { ok: false, error: "lat must be a number" };
  }

  // Validate lng
  if (typeof body.lng !== "number" || Number.isNaN(body.lng)) {
    return { ok: false, error: "lng must be a number" };
  }

  // Validate timestamp
  if (typeof body.timestamp !== "string") {
    return { ok: false, error: "timestamp must be a string" };
  }
  if (isNaN(Date.parse(body.timestamp))) {
    return { ok: false, error: "timestamp must be a valid ISO date string" };
  }

  // Validate note
  if (typeof body.note !== "string") {
    return { ok: false, error: "note must be a string" };
  }

  // Reject nested objects or arrays inside any field
  for (const key of requiredKeys) {
    const val = body[key];
    if (typeof val === "object" && val !== null) {
      return { ok: false, error: `Field '${key}' cannot be an object or array` };
    }
  }

  return { ok: true };
}


// ---------------------------------------------------------
// Main Worker
// ---------------------------------------------------------
export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://jimothytracker.org",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    try {
      // OPTIONS — CORS preflight
      if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
      }

      // Only allow POST
      if (request.method !== "POST") {
        /*
        return new Response("NOT allowed", {
          status: 405,
          headers: corsHeaders
        });
      }
      if (request.method === "GET") { */
        return new Response(
          JSON.stringify({
            status: "alive",
            worker: "monitor",
            task: "tracking"
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders
            }
          }
        );
      }
      // Parse JSON body safely
      let body;
      try {
        body = await request.json();
      } catch (err) {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        });
      }

      // Validate JSON payload
      const validation = validateSighting(body);
      if (!validation.ok) {
        return new Response(JSON.stringify({ error: validation.error }), {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        });
      }

      // Build dispatch payload
      const dispatch = {
        event_type: "jimothy_sighting",
        client_payload: body
      };

      // Log environment + payload
      console.log("GH_OWNER:", env.GH_OWNER);
      console.log("GH_REPO:", env.GH_REPO);
      console.log("GH_TOKEN exists:", !!env.GH_TOKEN);
      console.log("Dispatch payload:", JSON.stringify(dispatch));

      // Trigger GitHub Action
      const res = await fetch(
        `https://api.github.com/repos/${env.GH_OWNER}/${env.GH_REPO}/dispatches`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${env.GH_TOKEN}`,
            "Accept": "application/vnd.github+json",
            "User-Agent": "jimothy-tracker-worker"
          },
          body: JSON.stringify(dispatch)
        }
      );

      console.log("GitHub response status:", res.status);
      console.log("GitHub response text:", await res.text());

      if (!res.ok) {
        return new Response("GitHub error", {
          status: 500,
          headers: corsHeaders
        });
      }

      // Success
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
