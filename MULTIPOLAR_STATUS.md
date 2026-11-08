# Multipolar power struggle: current implementation

The strategic review uses each actor's own resources, frontier control reports, dated sightings, known public wars, stability reports, treaty commitments, leader disposition and political memory. It does not read foreign army strengths, finances or secret plans. A missing sighting is not treated as proof of an undefended frontier. Reviews are bounded to eight candidates and at most one new aggressive decision per twelve months; a newly observed war can trigger an earlier review.

AI can react to a reported third-party war, sometimes pursue an opportunistic war or breach a non-aggression treaty, negotiate aid via existing agreements, support reported claimants and send captive-release letters to other AI courts. The recipient's existing diplomacy rules and resources matter; the supported faction remains autonomous. AI-only tests use the explicit `tick(..., {autoplayPlayer: true})` option; normal gameplay still requires the human player's decision on incoming offers.

The Chessboard's Multipolar Power Network projects reported conflicts, public agreements and dated troop sightings. It does not render foreign strategic plans or unreported secret treaties. Frontier war reports and later reports that a known war ended enter the Chronicle when the observer has contact; old reports may remain stale.

## Validation and limits

Run `node scripts/multipolar-sim.mjs` for six seeds across the ordinary all-AI opening, a passive-Rome game and a fictional regional-tension opening. No additional war or alliance is forced. In the present 24-month sample the ordinary openings did not produce an opportunistic declaration; the pressure opening produced both declarations and non-declarations. This does not establish that all requested chain reactions or diplomacy actions are implemented.

The current implementation does not yet provide a general delayed proposal queue for coordinated attacks, territorial concessions, invasion warnings or all forms of neutrality. It does not infer an empty garrison or full supply-line status from missing observations. Wider AI-only diplomacy, event-driven reevaluation of every kind of intelligence, long-run balance, betrayal and mediation chains need further work and validation. Existing save data is retained; plans initialize lazily.
