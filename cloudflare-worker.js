// ================================================
// RBF Planning — Cloudflare Worker
// Firebase Cloud Messaging (FCM) V1
// ================================================

const PROJECT_ID    = "rbf-transport";
const CLIENT_EMAIL  = "firebase-adminsdk-fbsvc@rbf-transport.iam.gserviceaccount.com";
const PRIVATE_KEY   = "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC8DU7Cd5ZL6UKk\n2p9jjiLCh/oMswt4XuQcMHhaKKlQDRVgBEZIku1NNByOb8KHr7DkoQMEWTBET57h\nABQVguiOf3cSEUldp2Fb9yDbV8XGCJFGiNkjR1nWoAWrQPsQDTUZtSUR+HhMtMbn\nqpbmqNEuIA9URp9ojXs0FYbuXBcuwVjWl0Tkv4O/EOuKeQbjDQQ8PYb6k5vD4jhs\nLlB7mHOx38pdi1krMXTHVns1BkmO3nNbAA3nMh0PsSv3H4dUfUd/ZbuBDgt+Snav\nIpy+BZFWlqpbglUlHZL0u0Lcx6a4KbAGRPF+MDm4WLPjkOl1TX7sqEmLAs1XJAT8\nzy19OznJAgMBAAECggEAFPZBdUPx/lGTcDTpLNEckXqpe4jpxRKEHZr5j3NA4aop\nBnmeLAYqFZUIKd3OCA9O30K4x19PFg5Es5KtVR3b4SaBlgNUnkVDgQYxz2wf9kyL\nhRqeublWYP+YIi2Czu3p9rej2OD4PUoEHLF9/gWLa7d/KJxxYIIviEVuCQaS6aR1\nWU+p4Irg7ZeciZqNTxjEUfYmV6uxT5iwWQhZuxHdBhn8fByTRvsWKBYW2t1GLrel\nclBAtDhc+BXEXPljEjuvtl8Mx4L0sQE1vLJ/o2k6kl0d59TAq06gpqL3ycDQw+kn\nVZMuF4nJb60yCjsweGMqJTpbHIfd4uQsIJv4ulJ/0QKBgQDwHB4+s8UP4eNJRm1v\nY1HMjAI2NcNI/88szDFAzN9EDL1epUwkTMruvRN1czayCBQ9zBdpv/5hi0guvgxC\n1XbQyNWFhtjvUL7psLixv/+yNbPR6Q3iTz3rRq2E1IytOUntSOPqPUG0pXB9qF8y\nz8Ww0NoLfJ07jPY+Qd3cseNq+wKBgQDIfzz3O4LtnB6ngMV/VOf/2eqQ51FvAxTe\nncSdjnOQdUb2LrOSAURgFSPNJB0F+2UvvhZHM+uYjVT5w0US15BTCZaYVbO5f554\nphjvCXyS+5yEQ6NLieDrAurlEWnv8ECZVxsYKnY37Z9nE+cwDM2Rim4emnbFyksn\nO/2On38TCwKBgEKu/HNbh9oeWPortg7eXYRaSe72RXMLoGUHnJIrk8IZa6pSa/AU\n57MgDbxrsAAHoF99Q+9Zo/NBNF3O6CbTk/juHebEiZEFMtBCBTlQYloC8hrVB8cX\nTNH/wgcG5L7jDzX4LVwLgSkDXVd4oF/DNlsh1byk8iHsxyKJNm2pdchrAoGBAJ6f\nE5OhsIbd0d7BYP7JJLblJ8+2QlXqgTNSbEAeeE1ci2SvNAAaIodFkkp0/MVDzB0G\nbUetywGpJwZmt5odkyAu4MbqXsMuNSjMd8N9pOIAUCbQADv9/ETRzRanPUHHuMPY\nByaKSXcb9tWtCGWaa3RuqYpqt/bpgaWrr4GLrBRbAoGBAJH9B+MY28vTIKgnHs2O\nM50IWegEpr4+JuaUxuBmhlK9D1JzsUYxo/D9ygpPElnRgIAqYXy9BPwOXL/jBZdO\nGmohho1pgyyrmSR0qBIXAA0mZrMRVQN0hVblM6aZLfeFqtzGZoElCCBt52VkD7yC\nKoqNqoBw8Q3mb9bqxoSVH1Zz\n-----END PRIVATE KEY-----\n";

// Generer un JWT pour l'authentification Google
async function getAccessToken() {
  const now   = Math.floor(Date.now() / 1000);
  const claim = {
    iss  : CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud  : "https://oauth2.googleapis.com/token",
    exp  : now + 3600,
    iat  : now
  };

  // Encoder le header et payload JWT
  const header  = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" })).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const payload = btoa(JSON.stringify(claim)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const toSign  = header + '.' + payload;

  // Importer la cle privee RSA
  const keyData = PRIVATE_KEY
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\n/g, '');
  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );

  // Signer
  const encoder   = new TextEncoder();
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, encoder.encode(toSign));
  const sigB64    = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const jwt       = toSign + '.' + sigB64;

  // Echanger le JWT contre un access token
  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method : 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body   : `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  const tokenData = await tokenResp.json();
  return tokenData.access_token;
}

export default {
  async fetch(request) {
    const cors = {
      "Access-Control-Allow-Origin" : "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST")    return new Response("Method not allowed", { status: 405, headers: cors });

    try {
      const body   = await request.json();
      const tokens = body.tokens || [];
      const title  = (body.headings && body.headings.fr) || "RBF Planning";
      const msg    = (body.contents && body.contents.fr) || "Mise a jour du planning";

      if (tokens.length === 0) {
        return new Response(JSON.stringify({ error: "Aucun token" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      }

      // Obtenir le token OAuth2
      const accessToken = await getAccessToken();

      // Envoyer a chaque token FCM
      const results = [];
      for (const token of tokens) {
        const fcmResp = await fetch(
          `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`,
          {
            method : "POST",
            headers: {
              "Content-Type" : "application/json",
              "Authorization": "Bearer " + accessToken
            },
            body: JSON.stringify({
              message: {
                token      : token,
                notification: { title, body: msg },
                webpush    : {
                  notification: {
                    title,
                    body : msg,
                    icon : "https://bastien-rbf.github.io/planning-rbf/icon.png.png",
                    click_action: "https://bastien-rbf.github.io/planning-rbf/"
                  },
                  fcm_options: { link: "https://bastien-rbf.github.io/planning-rbf/" }
                }
              }
            })
          }
        );
        const fcmData = await fcmResp.json();
        console.log("FCM token:", token.substring(0,20), "status:", fcmResp.status, "resp:", JSON.stringify(fcmData));
        results.push({ status: fcmResp.status, data: fcmData });
      }

      return new Response(JSON.stringify({ sent: results.length, results }), {
        status : 200,
        headers: { ...cors, "Content-Type": "application/json" }
      });

    } catch(err) {
      console.error("Worker error:", err.message);
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }
  }
};
