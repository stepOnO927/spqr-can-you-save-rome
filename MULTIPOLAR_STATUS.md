# Multipolar power struggle: current implementation

The strategic review uses each actor's own resources, frontier control reports, dated sightings, known public wars, stability reports, treaty commitments, leader disposition and political memory. It does not read foreign army strengths, finances or secret plans. A missing sighting is not treated as proof of an undefended frontier. Reviews are bounded to eight candidates and at most one new aggressive decision per twelve months; a newly observed war can trigger an earlier review.

AI can react to a reported third-party war, sometimes pursue an opportunistic war or breach a non-aggression treaty, negotiate aid via existing agreements, support reported claimants and send captive-release letters to other AI courts. The recipient's existing diplomacy rules and resources matter; the supported faction remains autonomous. AI-only tests use the explicit `tick(..., {autoplayPlayer: true})` option; normal gameplay still requires the human player's decision on incoming offers.

The Chessboard's Multipolar Power Network projects reported conflicts, public agreements and dated troop sightings. It does not render foreign strategic plans or unreported secret treaties. Frontier war reports and later reports that a known war ended enter the Chronicle when the observer has contact; old reports may remain stale.

## Validation and limits

Run `node scripts/multipolar-sim.mjs` for six seeds across the ordinary all-AI opening, a passive-Rome game and a fictional regional-tension opening. No additional war or alliance is forced. In the present 24-month sample the ordinary openings did not produce an opportunistic declaration; the pressure opening produced both declarations and non-declarations. This does not establish that all requested chain reactions or diplomacy actions are implemented.

The current implementation does not yet provide a general delayed proposal queue for coordinated attacks, territorial concessions or all forms of neutrality. It does not infer an empty garrison or full supply-line status from missing observations. Wider AI-only diplomacy, event-driven reevaluation of every kind of intelligence, long-run balance, betrayal and mediation chains need further work and validation. Existing save data is retained; plans initialize lazily.

## Scout-based allied warnings

`strategic-warnings.js` lets a court forward a fresh (at most one month old) scout sighting of a hostile force near a friendly court's territory. A friendly court is one with an alliance, a defensive, guarantee, intelligence, military-support or offensive agreement, or a relation of at least 35 with the sender. The threat must be at war with the sender, or the sender must hold a dated report of a war between the threat and the recipient. The sender reads only its own sightings, control reports, diplomatic reports, treaties and relations.

A warning costs the sender 1 treasury, is limited to one letter per court per month and is not repeated for the same army within six months. It travels for half of the existing round-trip courier time (at least one month), may be delayed once or lost, and expires if the parties go to war, the recipient loses its territory or the sighting is more than six months old on arrival. On delivery it is stored as a dated second-hand sighting (`source: 'ally_warning'`) that never replaces a newer first-hand report.

An AI recipient judges the letter from its own nearby forces, its relation with the sender, the sender's credibility and political memory. It may put armies already in the threatened region on a defensive order, or note or dismiss the letter. A warning never declares war, creates or ends an agreement, or forces acceptance. A human recipient receives a bilingual log entry and keeps the decision. The sighted court never learns that it was reported, and the sender does not learn the recipient's decision. No warning, and no sighting, is never evidence of an undefended frontier.

In the ordinary openings no court meets the friendship threshold, so no warnings are sent. `node scripts/multipolar-sim.mjs` adds a fictional allied-frontier opening (Armenia and the Senate friendly, the Senate already at war with a prepared Parthia) in which warnings, delivery and decisions are unforced. Existing saves initialize the queue lazily.
