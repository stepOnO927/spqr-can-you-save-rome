// Public configuration only. Never put API secrets in a static game file.
// Add a real GA4 measurement ID and/or a deployed Worker URL after authorization.
export const analyticsSettings={
 ga4:{production:'',staging:''},
 // Add the exact custom domain here once the Cloudflare hostname is chosen.
 hostnames:{production:[],staging:[]},
 sessionEndpoint:'',
 consentStorageKey:'spqr-analytics-consent-v1'
};

