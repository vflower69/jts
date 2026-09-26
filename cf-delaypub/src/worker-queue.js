export default {
  async queue(batch, env) {
    for (const msg of batch.messages) {
      const dispatch = msg.body;

      try {
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
          const text = await res.text();
          console.error("GitHub error:", text);
          return new Response("GitHub write failed", { status: 500 });
        }

      } catch (err) {
        console.error("Queue consumer exception:", err);
        return new Response("Queue consumer exception", { status: 500 });
      }
    }
console.log(`Processed ${batch.messages.length} messages`);
    return new Response("ok", { status: 200 });
  }
};
