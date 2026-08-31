export default {
  // ------------------------------------------
  // FETCH HANDLER — enqueue sighting
  // ------------------------------------------
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://jimothytracker.org",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Only POST allowed", {
        status: 405,
        headers: corsHeaders
      });
    }

    const body = await request.json();
    const dispatch = {
      event_type: "jimothy_sighting",
      client_payload: body
    };

    // ENQUEUE sighting for delayed processing
    await env.DELAYED_PUBLISH_SIGHTING.send(dispatch);

    return new Response(JSON.stringify({ queued: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  },

  // ------------------------------------------
  // QUEUE CONSUMER — runs 6 hours later
  // ------------------------------------------
  async queue(batch, env) {
    for (const msg of batch.messages) {
      const dispatch = msg.body;

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

      console.log("Delayed publish status:", res.status);

      if (!res.ok) {
        console.error("GitHub error:", await res.text());
      }
    }
  }
};
