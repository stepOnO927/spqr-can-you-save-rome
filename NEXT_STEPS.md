# SPQR outstanding work audit

This is an implementation tracker, not a claim that the game has reached a final release. Later user restrictions take precedence over earlier requests: the player remains Roman, the terrain map is retained, and historical uncertainty is explicit.

## Current priorities
- Complete the Phase IX character model: dynamic offices, regencies, more succession arrangements, personal diplomacy and relationships, character travel, illness and injury consequences, and historical uncertainty in every profile.
- Expand intelligence beyond the present report model: document source reliability, keep independently corroborated and conflicting reports visible, improve knowledge-aware AI and map visibility, and distinguish personal meetings from an envoy's audience. Client-side saves are not a secrecy boundary.
- Complete the earlier atlas requirements: deeper operational effects for the existing terrain, military, supply, economy and loyalty views; polished army routes and battle feedback; geographic roads, ports and passes; and sustained performance measurements.
- Reconcile the atlas with the working campaign only when the necessary mechanics and visual acceptance criteria are met; preserve saves and a playable fallback during the transition.
- Complete accessibility, small-screen and Chinese/English coverage; test all systems in both languages and arrange a genuine independent beginner test before calling onboarding validated.
- Research additional 49 BCE interior boundaries and geographic details only where defensible sources exist; preserve the uncertainty documentation and data licenses.

## Verification already present
See map-lab/TESTING.md for tested behavior and limits. Automated tests cover combat, diplomatic conditions, saved missions, conflicting knowledge, illness, joint rule, succession and historical geography. Browser checks are not a substitute for independent usability testing.
# Personal travel and meetings — local work in progress

An independent character can follow a time- and treasury-consuming route through peaceful campaign theaters. The theater positions are scenario assumptions, not verified historical itineraries. A personal audience requires actual co-location at resolution and may be declined or receive no reply. It creates a dated, observer-specific report and a personal trust record only if the meeting happens. Existing letters and envoy audiences remain separate. Old saves are migrated without resetting their state.

Automated engine tests cover travel, save/load, changing access, private knowledge and outcomes. Browser interaction and the public deployment of these changes remain unverified: local loopback network access was unavailable in the current environment. Complete browser testing before publishing. Personal relationships are still rudimentary; offices, regencies, broader succession and the remaining Phase IX requirements need further work.

## Intelligence provenance — local work in progress

An ally now forwards only a report it already holds about a third party. The player may choose the ally; forwarding preserves the original source and observation date, so an old or repeated report is not treated as fresh independent confirmation. Reports from the same court share a source family. Peace decisions use the responder's estimate of the offerer's strength, not its hidden troop total. Personal meetings no longer reveal an unseen illness. Automated tests cover these cases; browser and public deployment verification remain outstanding.

Unknown observations no longer corroborate or contradict definite health claims. An older forwarded report remains visible without replacing a newer leadership report; AI strength estimates likewise use observation date rather than forwarding date. A small offline DOM stub exercises confirmation handlers and immediate treasury refresh, but is not a substitute for testing the real browser, map or layout.

Character dossiers now separate historical biographies, friendly game positions and foreign reports; enemy theater loyalty, unseen movement summaries and exact enemy battle details are hidden in the UI. This is a presentation rule only: local saves contain true simulation state. Legacy casualty messages are redacted when shown. Further visibility and save audits remain necessary.

## Governance and frailty — local work in progress

Temporary incapacity preserves the nominal leader while a qualified Roman officer or royal deputy acts; where a co-ruler is capable they can assume duties. The player can appoint an eligible acting deputy, with a cost for changing the current choice, and an unavailable deputy is replaced automatically. This is not a formal succession or an election to historical office. The separate Mauretanian kingdoms remain distinct. An empty leadership uses an unnamed temporary authority, and disruption costs stability each quarter. Foreign intelligence is not automatically updated. Simulated frailty may arise at an advanced known age, slows journeys and reduces command effectiveness. These are game events, not historical diagnoses. Save migration and engine tests cover the transitions; complex succession, browser verification and deployment remain outstanding.

The player can also designate a possible political successor independently of the acting deputy. A living co-leader stays in place; an unavailable or departed candidate is skipped. This remains a simplified succession rule, not an election, dynastic-law system, or contested usurpation model.

## Court disputes — local work in progress

An Egyptian joint-rule dispute now advances on campaign time and may end in a negotiated return to joint rule or an alternate-history takeover using existing characters. Stability and claimant loyalty affect possible outcomes; foreign observers do not receive automatic updates. Dead claimants are removed, and Mauretania's separate kingdoms are not modeled as a single jointly ruled throne. Report cards explicitly distinguish reported claimants from reported leaders and show source reliability and corroboration. This is a limited court model, not a full civil-war or diplomatic-support system; browser testing and deployment remain outstanding.

Players may now offer support to a claimant identified by their own intelligence. The offer takes four months and can be refused or receive no reply; accepted support alters the simulated Egyptian dispute and worsens court relations. Outdated or false reports remain usable without revealing the true state before a response. This remains a limited court model, not a full civil-war simulation. The previous build passed GitHub browser smoke checks and was deployed; the current change still needs its own browser check and release.

