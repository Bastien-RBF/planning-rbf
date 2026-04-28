// ================================================
// RBF Planning — Cloudflare Worker
// Proxy OneSignal — Nouvelle API (os_v2_app_* keys)
// ================================================

const OS_REST_KEY = "os_v2_app_k3ekcejaqjcbto7wuwaare25xug6jwtb6dfe565shkv42b247vulmedbouya42vqsjczwmpomre2vaq7t72qbbgzctc2vj5i2l2piui";
const OS_APP_ID   = "56c8a111-2082-4419-bbf6-a58008935dbd";

export default {
  async fetch(request) {

    const corsHeaders = {
      "Access-Control-Allow-Origin" : "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    try {
      const body = await request.json();

      if (!body.contents) {
        return new Response(JSON.stringify({ error: "Parametres manquants" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const payload = {
        app_id  : OS_APP_ID,
        contents: body.contents,
        headings: body.headings || body.contents,
        url     : body.url || "https://bastien-rbf.github.io/planning-rbf/",
      };

      if (body.filters) {
        payload.filters = body.filters;
      } else {
        payload.included_segments = ["All"];
      }

      // Nouvelle API OneSignal avec os_v2_app_* keys
      // Endpoint : api.onesignal.com (pas onesignal.com)
      // Header   : Authorization: Key XXX (avec K majuscule)
      const response = await fetch("https://api.onesignal.com/notifications", {
        method : "POST",
        headers: {
          "Content-Type" : "application/json",
          "Authorization": "Key " + OS_REST_KEY
        },
        body: JSON.stringify(payload)
      });

      const text = await response.text();
      console.log("OneSignal status:", response.status, "body:", text);

      return new Response(text, {
        status : response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (err) {
      console.error("Worker error:", err.message);
      return new Response(JSON.stringify({ error: err.message }), {
        status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
