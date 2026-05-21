// ================================================
// RBF Planning — Cloudflare Worker
// Web Push natif avec VAPID
// ================================================

// Cle privee VAPID (a generer une seule fois)
// Cette cle correspond a la cle publique : BNSavHKMaOt_jVAWhklw2pWy_dSbM8sSFCbK6xM704tAEj14ptZAOAJlb2q25O33sZFqV5eqjEWTSdnnPBueW58
const VAPID_PRIVATE_KEY = "_oiYBRE4VXVznWsX-UZcE3p-cpd9FgqA2hh5m_i6Bg8";
const VAPID_PUBLIC_KEY  = "BCejATBh5hDLun-J4UrWt9U9VjjCM1uxqvi92X9QyWGsI0ykkwZDsr41hcA7xHUNYAt3r97NaQ3YNQlvMNOZoWc";
const VAPID_SUBJECT     = "mailto:bastien38dominguez@gmail.com";

function base64UrlToUint8Array(base64UrlData) {
    const padding = '='.repeat((4 - base64UrlData.length % 4) % 4);
    const base64 = (base64UrlData + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from(rawData, c => c.charCodeAt(0));
}

async function generateVapidToken(endpoint) {
    const now     = Math.floor(Date.now() / 1000);
    const url     = new URL(endpoint);
    const audience= url.protocol + '//' + url.host;
    const header  = { typ: 'JWT', alg: 'ES256' };
    const payload = { aud: audience, exp: now + 43200, sub: VAPID_SUBJECT };
    const enc     = v => btoa(JSON.stringify(v)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
    const unsigned= enc(header) + '.' + enc(payload);

    const keyData  = base64UrlToUint8Array(VAPID_PRIVATE_KEY);
    const cryptoKey= await crypto.subtle.importKey(
        'raw', keyData, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
    );
    const sig   = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, cryptoKey, new TextEncoder().encode(unsigned));
    const sigB64= btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
    return unsigned + '.' + sigB64;
}

export default {
    async fetch(request) {
        const cors = {
            'Access-Control-Allow-Origin' : '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };
        if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
        if (request.method !== 'POST')    return new Response('Method not allowed', { status: 405, headers: cors });

        try {
            const body         = await request.json();
            const subscriptions= body.subscriptions || [];
            const title        = body.title    || 'RBF Planning';
            const message      = body.message  || 'Mise a jour du planning';

            if (subscriptions.length === 0) {
                return new Response(JSON.stringify({ error: 'Aucun abonne' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
            }

            const payload = JSON.stringify({ title, body: message });
            let sent = 0, errors = 0;

            for (const sub of subscriptions) {
                try {
                    const vapidToken = await generateVapidToken(sub.endpoint);
                    const resp = await fetch(sub.endpoint, {
                        method : 'POST',
                        headers: {
                            'Content-Type'   : 'application/octet-stream',
                            'Authorization'  : 'vapid t=' + vapidToken + ', k=' + VAPID_PUBLIC_KEY,
                            'TTL'            : '86400',
                            'Content-Encoding': 'aes128gcm',
                        },
                        body: new TextEncoder().encode(payload)
                    });
                    console.log('Push to', sub.endpoint.substring(0,50), ':', resp.status);
                    if (resp.status < 300) sent++;
                    else errors++;
                } catch(e) {
                    console.error('Push error:', e.message);
                    errors++;
                }
            }
            return new Response(JSON.stringify({ sent, errors }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
        } catch(err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
        }
    }
};
