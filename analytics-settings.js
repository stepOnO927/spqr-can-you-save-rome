// Public configuration only. Never put API secrets in a static game file.
// Production GA4 stream: SPQR Production Web. Staging stays separate until its own stream exists.
export const analyticsSettings={
 ga4:{production:'G-3VDCWZRJCL',staging:''},
 // Add the exact custom domain here once the Cloudflare hostname is chosen.
 hostnames:{production:[],staging:[]},
 sessionEndpoint:'',
 consentStorageKey:'spqr-analytics-consent-v1'
};
