// Public configuration only. Never put API secrets in a static game file.
// Production GA4 stream: SPQR Production Web. Staging stays separate until its own stream exists.
export const analyticsSettings={
 ga4:{production:'G-3VDCWZRJCL',staging:''},
 // The Pages apex is the new production hostname; the review branch remains staging.
 // Add a custom domain here only after the approved cutover.
 hostnames:{production:['spqr-can-you-save-rome.pages.dev'],staging:['codex-world-kings-clean-revi.spqr-can-you-save-rome.pages.dev']},
 sessionEndpoint:'',
 consentStorageKey:'spqr-analytics-consent-v1'
};
