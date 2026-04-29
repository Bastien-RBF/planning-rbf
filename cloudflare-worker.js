export default {
  async fetch(request) {
    const cors = {
      "Access-Control-Allow-Origin" : "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });
    try {
      const body = await request.json();
      const payload = {
        app_id           : "56c8a111-2082-4419-bbf6-a58008935dbd",
        contents         : body.contents || { fr: "Mise a jour planning", en: "Planning update" },
        headings         : body.headings || { fr: "RBF Planning", en: "RBF Planning" },
        url              : "https://bastien-rbf.github.io/planning-rbf/",
        included_segments: ["All"],
        chrome_web_icon  : "https://bastien-rbf.github.io/planning-rbf/icon.png.png",
      };
      // Combinaison testee et validee depuis la console : api.onesignal.com + Key
      const resp = await fetch("https://api.onesignal.com/notifications", {
        method : "POST",
        headers: {
          "Content-Type" : "application/json",
          "Authorization": "Key os_v2_app_k3ekcejaqjcbto7wuwaare25xxscswdi2nxe2ouuiesbiaa4xd6k442u3bp2kkrxbucnkoyxsb6uiuryvdclvnz5sjfhps2t3fmnzti"
        },
        body: JSON.stringify(payload)
      });
      const text = await resp.text();
      console.log("OneSignal:", resp.status, text);
      return new Response(text, { status: resp.status, headers: { ...cors, "Content-Type": "application/json" } });
    } catch(err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }
  }
};
