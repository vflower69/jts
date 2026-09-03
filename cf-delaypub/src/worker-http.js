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

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://jimothytracker.org",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    // ---------------------------------------------------------
    // GET — Health check
    // ---------------------------------------------------------
    if (request.method === "GET") {
      return new Response(
        JSON.stringify({
          status: "alive",
          worker: "delayed",
          queue_binding: "DELAYED"
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

    // ---------------------------------------------------------
    // Strict validation
    // ---------------------------------------------------------
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

    // ---------------------------------------------------------
    // Build dispatch payload
    // ---------------------------------------------------------
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
      return new Response(
        JSON.stringify({ error: "Queue send failed", details: err.message }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
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
