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

    //debug:
    console.log("Incoming request:", request.method, request.url);

    // Handle OPTIONS (preflight)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS, POST",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    // Reject anything except POST
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }


    const formData = await request.formData();

    // Honeypot spam trap
    if (formData.get("nickname")) {
      return new Response("OK", { status: 200 });
    }

    const name = formData.get("sender_name") || "No name";
    const email = formData.get("sender_email") || "No email";
    const subject = formData.get("subject") || "No subject";
    const message = formData.get("message") || "No message";

    const textBody = `
Contact Form Submission

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}
    `.trim();

    try {
      console.log("Preparing to send email:", {
        from: "contact@jimothytracker.org",
        to: "mikeliu89@hotmail.com",
        subject,
        textBody
      });

      await env.SEND_EMAIL.send({
        from: "contact@jimothytracker.org",
        to: "mikeliu89@hotmail.com",
        cc: ["emilyli889@gmail.com"],
        bcc: ["mikeliu889@gmail.com"],
        subject: `Contact Form: ${subject}`,
        text: textBody
      });

      console.log("Email sent successfully");
    } catch (err) {
      console.error("Email send failed:", err);
    }


    return new Response(JSON.stringify({ success: true }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS, POST",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });

  }
};
