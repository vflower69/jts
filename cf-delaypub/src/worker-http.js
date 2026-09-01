export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://jimothytracker.org",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    // ---------------------------------------------------------
    // GET — Health check (prevents Error 1105 on browser visits)
    // ---------------------------------------------------------
    if (request.method === "GET") {
      return new Response(
        JSON.stringify({
          status: "alive",
          worker: "jt-github-delayed (HTTP)",
          queue_binding: "DELAYED_PUBLISH_SIGHTING"
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }

    // ---------------------------------------------------------
    // OPTIONS — CORS preflight
    // ---------------------------------------------------------
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // ---------------------------------------------------------
    // Reject all non‑POST methods
    // ---------------------------------------------------------
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Only POST allowed" }), {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }

    // ---------------------------------------------------------
    // Parse POST body
    // ---------------------------------------------------------
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

    const dispatch = {
      event_type: "jimothy_sighting",
      client_payload: body
    };

    // ---------------------------------------------------------
    // Enqueue into delayed queue
    // ---------------------------------------------------------
    try {
      await env.DELAYED_PUBLISH_SIGHTING.send(dispatch);
    } catch (err) {
      return new Response(JSON.stringify({ error: "Queue send failed", details: err.message }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }

    // ---------------------------------------------------------
    // Success
    // ---------------------------------------------------------
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
};
