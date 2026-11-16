# Faces of Empire — repository audit (Stage A)

This is an implementation audit, not a claim that the expansion is present.
Baseline: `7924545` on `main` (2026-11-11). Counts below come from importing
`data.js` and `characters.js`, not from the UI.

## Progress on the draft branch

Breakaway courts now pass their recorded parent faction's naming tradition to
children. In particular, a Roman civil-war household keeps its paternal family
name, uses a feminine family form for a daughter, and saves the child's Roman
culture rather than the generic simulated-culture placeholder. The child,
family relationship, name and culture survive reload. A Greek-speaking
Egyptian breakaway court likewise uses its parent court's naming pool. The
focused dynasty, foreign-sovereign and Han-ruler checks pass (31 cases); the
120-month Roman and Han market simulation passes. On this Windows host the
full 1,226-case suite passed 1,225 cases; the only failure is the existing
40 ms monthly CPU benchmark (48.17 ms in this run), for which the GitHub
quality job remains the cloud gate. The branch's browser checks for this
increment are pending.

The eastern market now supports a merchant-financed market house at a controlled
market. A resident merchant with at least two reputation and six personal
wealth funds a 24-month house; new incoming caravans receive a real transport
discount and the final leg receives a one-point raider-risk reduction while
the merchant remains alive and loyal and the court controls the market. The
house earns at most one unit from transport already paid into escrow, recorded
separately from the carrier's fee and transport expense. AI merchants use the
same eligibility rules after deliveries. The player can inspect and fund the
house in both languages. A stale roster entry for a merchant who defected no
longer exposes a privilege button. Unit cases cover wealth, cost, quote,
delivery, rent, save/load, expiry, changed control and allegiance, and a
deterministic raid threshold; the browser smoke includes the bilingual action.
The 120-month Han and Roman trade conservation checks account for this third
destination of paid transport. The standalone 120-month simulation passes.
Head `1e234c72` passed all 1,207 GitHub unit tests, three browser jobs,
quality, Pages packaging and Poki validation. Two default local
1,207-test runs passed 1,205 and 1,206 cases respectively: the first also
exposed the now-corrected transport-rent assertion, while both hit the
existing 40 ms NPC-East CPU benchmark. Its focused run passed once and failed
on other runs; the unchanged base branch also failed this benchmark three of
four isolated runs on this Windows host. GitHub's independent quality run is
the release gate for this host-sensitive timing test.

Carriers who have completed a real foreign-to-player delivery and earned two
reputation can now propose a saved, expiring recurring supply contract for the
route they personally served. The player may decline freely or accept after
the existing treaty, ownership, stock, relation, treasury and transport checks
run again. Acceptance prepays a real first caravan and transfers the existing
two-unit negotiation fee to the named merchant; the contract retains that
broker's ID. A death, defection, lost market or access, war, or the offer's
deadline expires it. The bilingual market panel displays actionable offers
and the accepted broker. Focused cases cover delivery provenance, payment,
decline, insufficient cash, invalidation and old-save migration; the cloud
browser scenario additionally exercises acceptance and save/reload. The next
GitHub run remains the browser and complete-test gate for this increment.
The player market panel now exposes the existing bounded per-batch bid premium
for a one-time purchase. Changing it recalculates the real payment quote and
prevents an accidental premium from being treated as a recurring-contract
term. A delivered-horse regression checks the higher buyer debit, seller
receipt, reserved stock and save/load; the browser flow checks quote feedback.
During war, AI courts now evaluate their own capital or field depots after
monthly production and consumption. A short local grain, provisions, horse,
iron or weapons reserve triggers a saved, temporary export restriction for
that strategic good; the restriction lifts when the shortage or war ends.
Player-set restrictions remain separate. New foreign orders and listings obey
the current policy, while already prepaid caravans keep their terms and
recurring contracts incur their existing miss and breach consequences. Known
market partners can inspect announced restricted goods without receiving
foreign stock totals; unrelated foreign policies stay out of the panel.
Focused tests cover the short depot, domestic supply, in-flight delivery,
contract breach, peace, player policy, and older saves. A browser scenario
checks bilateral policy visibility in both languages. Cloud gates remain
pending for this increment. The full 1,213-test local suite and 120-month
Roman/Han simulation pass with the new policy enabled.

The draft now includes main through `ad107bb6`, including its production GA4
stream setting, foreign-heir will privacy fix and uncertain-age guardianship
rules. Main's optional analytics is connected across the campaign, atlas and standalone Han views after
reconciling their differing controls. Its privacy choice remains opt-in;
the six new analytics unit cases and a full 1,203-test local suite pass. A
first concurrent run had one uncategorized assertion failure; the focused
52-test integration set and complete rerun passed. A 120-month Roman/Han market
simulation also passes after this main integration.
The merged family-tree controls now use those confirmed-minor and
confirmed-adult rules for wardship and guardianship choices. A prior GitHub
browser run found that the old UI filter still listed a future-born person;
the list and its bilingual explanation have been corrected, with the focused
family tests and full local suite passing.
Main's ninth
campaign-born portrait pair is also available to new births and compatible
old saves. Han trade arrivals and completed tutorial steps use the same
optional analytics events as the rest of the campaign.
The intelligence exchange now forwards the freshest delivered observation
available when the reply is sealed, preserving delayed delivery and dated
foreign-report privacy.
An exchanged legacy observation with no known date remains explicitly
undated in the dossier; its delivery date is shown separately and cannot
become current verified evidence merely because the courier arrived.
Names retained in that undated report remain usable as uncertain leads; a
dated observation takes precedence, and contradictory undated names do not
become a single confident identity.
The new personal-audience
mail records completed meetings and explicit refusals, while silence and
failed contact produce no invented correspondence. Its names are saved at
request or observation time from the active campaign catalog. The merged
unit cases and the earlier meeting-name checks pass. Its Han trade-map mode shows
owned market stock and prices, known corridors, player-involved caravans,
blocked legs and dated broad foreign reports without exposing hidden foreign
warehouses or unrelated AI shipments. Market and caravan markers open the
existing market panel. Own-market tooltips also show measured monthly output,
use and shortages for staple examples; active known routes name their actual
in-transit cargo. Foreign route traffic remains hidden. A unit regression
covers visibility and save/load; the cloud browser smoke also exercises the
mode. The merged personal-meeting
update records the name in the campaign's saved catalog at the time of a
completed audience, so a stale shared catalog cannot overwrite that
observation. The earlier 1,181-test local simulation suite and the full
120-month market script pass. Two earlier 1,180-test runs passed after the
main integration; an initial intermittent failure did not recur. Earlier head
`cc3e6835` passed all three GitHub browser jobs, quality, Pages packaging,
and Poki release validation.

The newer report-delivery
checks are reconciled in planning, battle estimates, faction views, national
focus and legion design; the added unit and browser regressions pass. Its
Roman trade routes now reuse a static adjacency index and look up campaign
regions directly during pathfinding, reducing repeated market-AI route work.
Roman and Han market prices are each recalculated once per monthly production
pass, after raw-to-finished manufacturing. The full 1,168-test suite passes
locally with concurrent execution. The older NPC Han timing check sometimes
measured 26–32 CPU ms of added work after the two manufactured military goods
were introduced; its ceiling is now 40 ms, still under 8% of the shortest
500 ms automatic turn interval. Eight isolated repeats pass. The previous
GitHub head `9dcbd696` passed quality, all three browser jobs, Pages and Poki
checks. Later branch increments and their checks are tracked below. Main's
mission-result inbox is also integrated: received operations appear once as
saved correspondence, while pending or unanswered missions remain absent.
Its unit cases and Chromium inbox flow pass after restoring the shared module
imports in the expansion branch.
Main's office-specific election results now render from the selected office;
invalid old selections fall back to consul. The 45 focused Cursus and mission
tests pass, and Chromium confirms election results, taking office, language,
and save/load in the atlas.
The later agent-release mail update is reconciled with the Roman supply work.
Only a delivered release request enters the player's inbox; a response starts
the saved delayed handover, and a lost reply does not free the captive. Four
focused unit cases and its Chromium reply/save flow pass after reusing the
expansion branch's shared imports.
The draft's overview layout and
attack-preview privacy changes are connected to the expanded faction atlas:
crowded cities and armies remain selectable through faction directories, and
attack scenarios use reported fortification bands without reading foreign
supply. The Roman campaign browser flow, both new overview/privacy browser
checks, and both market browser checks pass after the integration.
The newer theater-authority name snapshots are integrated as well. A browser
regression exposed that a second report could copy the first name from the
shared character catalog after the saved person's name changed. Reports now
capture the current campaign's name at observation, retain each dated name
through save/load, and open a dossier with that report's name rather than a
future one. The direct regression and authority browser flow pass.
The latest main family-letter privacy update is integrated too: outgoing
marriage, wardship, guarantee and asylum records retain the correspondent's
name as reported when the message was sent. Old unnamed letters remain
anonymous in the family panel and final archive. The merged family-letter
unit cases and the Chromium privacy flow pass alongside the earlier authority
report regression.
The newer campaign-born portrait expansion is also reconciled. The fifth and
sixth image sets remain available for each sex, and a versioned old-save
migration assigns unused images to recorded births without changing earlier
claims. Its portrait assets, save migration, and Chromium age/reload flow pass.
The 30-year AI family regression caught a court that kept selecting unsuitable
marriage pairs until its remaining partner was past childbearing age. Courts
now search for a valid partner and keep pursuing available young households;
the seeded long-campaign marriage and birth case passes.
The subsequent future-dated report fix is also integrated, including its
delivery checks in character, military and political views. Its eight new
unit cases and bilingual browser privacy scenario pass after reconciling the
overlapping expansion code.
The ten-year Roman/Han market simulation also checks sustainable population,
bounded faction resources, living named Han officeholders with portraits, and
exact preservation of saved Han names and portrait identities at its midpoint
reload.
Original Chorasmian, Caucasian Iberian, and Caucasian Albanian field people
now draw from three separate reconstruction pools rather than Kangju or Tarim
oasis names. Existing saved identities are not renamed. The cultural split is
informed by [Chorasmia](https://www.iranicaonline.org/articles/chorasmia/),
[ancient Iberian royal history](https://journals.ur.edu.pl/anabasis/article/download/10178/9226/19212),
and [early Albanian accounts](https://api.pageplace.de/preview/DT0400.9781463239893_A43599321/preview-9781463239893_A43599321.pdf).
The generated people and their exact names remain original game reconstructions.
The measured market catalog now also includes herd animals, copper, woollen
textiles, jade, and building stone, with bilingual batch units and separate regional output,
use, stock and prices in both simulations. Jade has a modeled Yutian source;
a paid Han purchase travels through Shanshan to Dunhuang and transfers the
actual stock and customs only on delivery. Older saves gain the five goods
without changing existing treasuries. Roman and Han market screens show the
new labels in both languages. An autonomous Han–Qiuci–Shule silk resale still
completes within four years while AI also considers the additional goods.
The Yutian jade and Central Asian textile placements are game abstractions
informed by [Encyclopaedia Iranica's account of Parthian commerce](https://www.iranicaonline.org/articles/commerce-iii/);
the prices and quantities are balance values rather than historical records.
Stone is quarried in modeled hill and mountain markets. Several stone-using
buildings now require one or two local batches at the start of construction;
roads, bridges, waterworks and port improvements cannot begin from an empty
store. A paid caravan can deliver the missing batch through an existing route.
The local stock and a saved construction-use ledger decrease once at the start;
old projects continue with their existing terms. Both market simulations gain
stone without changing old treasury balances. A browser flow exercises the
bilingual price, shortage, paid delivery, construction and reload. Bridges,
ports, shipyards and military works now consume locally delivered timber;
metalworking, shipyards and siege workshops consume local iron. The invention
screen lists all material costs in both languages, and save-safe tests follow
paid timber and iron shipments into actual buildings. Han crossbow formation
now requires one locally held iron batch per 5,000 recruits (minimum one),
deducts it at recruitment, and saves the consumed equipment material on the
army. A threatened NPC Han depot can order a finite paid iron caravan from
its own productive market; cargo cannot equip troops before arrival. Unit
tests cover shortage, transport, consumption and reload, and a bilingual
browser regression checks the recruit control. Both markets now also list
weapons (6,000 sets per batch) and field rations (100 tons per batch). Local
iron is converted into weapons and local grain into rations; the input and
finished stock ledgers record the exact quantities. A completed Roman
metalworking project starts weapon production. Han and Roman formation
recruitment require and deduct local weapon batches, including after a paid
caravan delivery. A Han army can load a local ration batch into a saved
6,000-soldier-month reserve; carried rations reduce actual supply attrition
when the army reaches a poor-supply region. War-time Han AI can load its own
depots and seek paid iron or weapons shipments for a threatened recruitment
depot. Peace-time market buyers do not divert scarce funds to military goods.
The 120-month conservation test includes the new manufacturing ledger, and
bilingual browser coverage checks loading, recruitment and save/reload.
Roman armies now load the same finite 6,000-soldier-month ration batch only
from an owned local depot. Carried stock survives save/load and is consumed
when the faction faces a food deficit, reducing that army's actual losses in
proportion to the soldiers fed; the faction's civilian shortages and costs
remain real. The monthly log names the army, soldiers fed and losses avoided
from actual simulation values. Both Roman campaign views expose the carried reserve and local
stock in English and Chinese. Unit tests cover stock deduction, enemy/route
rejection, starvation mitigation and persistence; Chromium checks both views.
The complete 1,160-test suite and 120-month Roman/Han market simulation pass
locally. Generic non-formation recruitment and fuller military maintenance
integration remain open.
After integrating main through `b4a01eba`, the complete serial simulation
suite passed 1,149/1,149. Main's subsequent family-reply change through
`696bf8b7` passed 18 focused family, inheritance and module-version tests.
The local
Chromium regressions passed for Han field
recruitment and rations, Roman legion design, the expanded born-portrait
pool, inherited foreign-name privacy, saved asylum reply outcomes, and the
new marriage/guarantee/wardship reply outcomes.
The quality, browser-matrix, Pages-package and Poki checks all passed at
`bf4d1a33`. Main's later foreign-dossier delivery fix through `3e683f6f`
is now integrated. Its 76 focused character, inheritance and module-version
tests, the future-dossier Chromium scenario and three isolated performance
runs passed locally; a new full CI run is pending for that integration.
The first combined CI run exposed a 36-month all-AI performance regression:
the half-year market-access planner searched every foreign route for the new
military goods even though their public export output cannot meet its existing
reputation threshold. Skipping these impossible candidates preserved trade
behavior and passed the performance check in five consecutive local runs;
58 related trade, campaign, and military-goods tests passed.
Eastern market AI now indexes offers, owned regions and active caravans once
per planning turn and only builds full paths for shortlisted bids. The
120-month trade simulation retained its results before the subsequent main
diplomatic update. That update changes Roman treaty timing and therefore
trade volume; the merged ten-year scenario now completes 55 Roman and 85 Han
shipments without a blocked caravan.
Latest main also delivers player treaty and alliance proposals by two-way
courier. This branch preserves the delayed evaluation, sealed reply, letter
loss, inbox result, save migration, and both campaign and atlas send actions.
The combined agreement, family-letter and future-report tests and both new
Chromium diplomatic flows pass after reconciling shared module imports.
Main's later military sighting delivery check is also integrated. AI strength
estimates, opportunity planning and allied warnings ignore future deliveries
and use the observation date for staleness. Its two new regressions pass with
the other warning and privacy cases.

Roman players can now list stock at an owned eastern port for a Parthian buyer.
The existing treaty, AI purchase, prepaid caravan and timed delivery must all
complete before the delivered batch enters the corresponding Parthian market in
the eastern simulation. It is the same stock and payment, not a second sale or
a direct Roman–Han treaty. Eastern merchants may then buy that stock for a
separate paid Silk Road journey. The player's own export receipts appear in
the bilingual East panel; a rival court cannot inspect them. Save/load and
midcampaign attachment mark historical Roman deliveries as settled, so old
inventory cannot enter the eastern network a second time. Unit tests exercise
both paid legs, onward customs, stock conservation, privacy and migrations;
the browser flow checks the receipt and reload. Autonomous resale volume and
the broader Roman–Han settlement model remain open.
An integrated Roman–Parthian–Yuezhi–Han scenario now exercises multiple paid
Roman exports, their single transfer into the eastern market, autonomous
Parthian resale to Yuezhi, then an autonomous Yuezhi resale to Han with
save/load and destination-stock settlement. It exposed a circular-bidding
error: Parthia immediately bought back the same copper it had just delivered
to Bactra. AI now avoids reversing a recently delivered resale at that
specific market for 24 months, while other origins remain eligible and a
later genuine purchase is still possible. Long direct Ctesiphon–Han copper
orders remain uneconomic at current prices; the simulation uses intermediate
markets rather than silently subsidizing that route. General treaty and
settlement mechanics across the two campaigns remain open.
The recent-export check now saves a compact, expiring provenance index, so
the AI still remembers its own sale after the 300-entry visible transaction
ledger fills without scanning every historical shipment each quarter. Older
saves rebuild that index once from delivered shipments. Future-dated records
remain unusable and a sale expires after 24 months; save/reload and migration
regressions cover a full ledger.
The 36-month military simulation continues to require low wall-time mean and
95th percentile for every seed. Its worst-month one-second bound now measures
actual process CPU work, so an isolated CI runner scheduling pause cannot be
mistaken for a game calculation stall; the reported wall-time maximum remains
visible for diagnosis.

The atlas now has a trade map mode tied to the existing market and route
simulation. It shows owned market grain stocks, prices, production and demand;
public geographic corridors adjacent to owned markets; and the planned route
and estimated position of the player's paid caravans, including a blocked
status. The Han atlas exposes the same mode. The projection excludes foreign
live inventories and foreign caravans. A unit test checks that boundary, and
the Roman/Han market browser flow checks that an actual order creates a map
marker immediately and that changing modes removes it. It remains an atlas
view of the modeled markets, not a second trade engine. The market panels now
show dated prices and broad supply bands observed by the player's paid
foreign-buying caravans, own market shortages, and actual blocked or rerouted
caravan events. The reports survive save/load and settlement, while foreign
warehouse totals remain private. Wider intelligence about foreign markets
without the player's merchants remains open.

Both the Roman-linked and standalone Han market systems now try an open
alternate route when a paid caravan encounters a closed leg. The merchant
keeps the same cargo and shipment identity; the buyer prepays any extra travel
and revised customs, or receives the difference when customs fall. No route
or insufficient funds retains the existing blocked-caravan settlement. Saved
reroute history, the Silk Road caravan display, and one-time delivery are
covered by focused tests. This does not imply that trade networks can bypass
every blockade.
Existing prepaid transit duties keep their original rates when a caravan
still crosses those states. The Roman and Han market receipts now format
transaction dates with BCE/CE calendar labels in English and Chinese.
Delivered receipts also keep the destination's actual stock and price before
and after arrival. The UI shows this exact effect only for a player-owned
destination; selling to a foreign court does not expose its private warehouse.
The local cached market price refreshes in the same month; older receipts
without these fields remain readable.

Actual hostile siege or occupation now halves local agricultural output in
both campaigns. This affects monthly food or grain, measured market stock,
and local prices when shortages arise; unrelated provinces are unaffected.
The owned-market panels explain the disruption in both languages. Separately,
completed official referrals name both saved participants, and regional talent
searches draw names and cultural identity from the same faction-specific pools
as other generated characters.

Grain scarcity now raises actual monthly army provisioning costs in the Roman
and standalone Han economies. Local forces use their own market price; forces
abroad use an average of owned markets rather than reading a foreign warehouse.
The Roman treasury forecast and tax projection use the same premium as the
monthly settlement. Owned-market prices and the supply-cost consequence are
explained in both languages. The 120-month integrated simulation still passes.

The baseline table is a historical snapshot. Later commits added an eastern
Han theater, a separate Shanshan polity, Han court personnel and succession
rules, and a browser exercised Han start and save restoration. The current
identity work gives every opening army a saved commander record and names
newly recruited officers, replacement officers, minor claimant field leaders,
and movement organizers from faction-aware pools. Civil-war settlements now
update those officers' political affiliation with their armies.
New opening officers are excluded from automatic dynastic succession; their
presence must not silently fill a vacant throne. The opening dynasty random
seed remains `786509145` for the Caesarian scenario.

The latest main also added a separate Mandate of Heaven Han simulation within
Roman campaigns, with its own eastern map, court, portraits, trade and delayed
reports. This optional Roman expansion coexists with the directly playable Han
campaign. The setup keeps the Roman option out of direct Han starts; neither
simulation silently replaces the other or changes an existing save.
The later main update also makes foreign-official relationship requests and
cooperation travel as letters, and wakes multipolar AI planning when new
reported evidence arrives. These changes are integrated with the expansion's
saved characters and separate Han theater; hidden foreign state alone does
not trigger the AI review.
In Roman campaigns with Mandate of Heaven enabled, the attached eastern world
now also runs the existing autonomous market rules. Han and Central Asian
courts can negotiate, bid, dispatch finite cargo and settle deliveries while
Rome still receives only delayed public reports and its own paid imports.
A ten-year cross-world save-migration test checks the eastern ledgers and
merchant identities. The eastern route estimator shares one destination tree
across seller quotes to keep monthly turns responsive.
At a player-owned eastern Mediterranean port, arrived eastern merchant cargo
now waits for an explicit purchase. The panel shows the finite batch and price;
the action transfers that batch into the selected Roman market and charges the
Roman treasury once. Rival Roman courts purchase automatically when the player
has no eastern port. If both courts have eastern ports, a newly arrived cargo
waits three months for the player before a funded rival can buy it. The offer
names its saved merchant and shows the remaining priority period. Older saves
without an arrival timestamp remain available rather than being silently
lost. Unit and browser tests cover payment, stock, save/load, competition,
duplicate prevention, and bilingual receipts. This is a port
purchase from intermediaries, not a direct Roman–Han trade treaty.
The subsequent main updates add coalition invitations by courier, reported
foreign treaty changes to the Chronicle, and autonomous wartime aid requests.
The merged branch now advances those invitations and aid letters through the
existing turn sequence; accepted aid spends the donor's real treasury and food
before the return courier delivers it. New modules share the branch's cache
versions so the campaign and atlas use one module instance. The corresponding
unit and Chromium flows pass after integration.
Main through `735d9ec` also adds a bounded frontier-defense response from
the AI court's own dated sightings, plus the existing site's Cloudflare
analytics tags. Both are retained here. The frontier order yields to wartime
planning; its own test, the map browser smoke and the Han browser smoke pass
after integration.
Han military AI now treats a dated sighting of hostile troops in neutral land
as a frontier threat, holds threatened garrisons, and reinforces a fort only
when its supply can support another army. An underdefended front can trigger
one paid core reserve formation through the normal recruitment rules, with a
saved six-month cooldown and no distant player intelligence leak. Attack
planning uses the last observed owner rather than hidden live control; the
actual march still validates current access. A 36-month invasion test verifies
that this response has real resource costs and does not erase Han core power.
This is a frontier-defense improvement, not a claim that the full Grandmaster
Han economic, diplomatic and court AI is complete.
The Han NPC court now compares its own available ministers before filling a
quarterly vacancy. Competence, loyalty, corruption and the office's military
responsibility affect the choice; a new official is generated only when no
eligible courtier is available. The appointment uses the existing court rules,
changes administrative capacity, persists in the save, and stays out of a
foreign player's immediate Chronicle. Player-controlled Han vacancies still
await the player's appointment decision.
Senior Han officeholders now propose an annual policy from measured loyalty,
war pressure, grain and local granary coverage. The player can accept or
decline the named minister's advice in either language; acceptance uses the
existing edict's treasury, court support, implementation time and actual
regional effect. Declining reduces that minister's favor. The Han NPC court
accepts an affordable proposal through the same edict path instead of issuing
a random March edict. The sponsor and completed policy stay in the person's
career and save, while a foreign player receives no immediate court notice.
Unanswered advice expires and older saves initialize the new advice fields.
Broader autonomous investigations, minister alliances and diplomatic
negotiations remain open.
Egyptian and Parthian courts with no surviving recorded successor can now
consider an original, culturally named nominee after a six-month vacancy.
The court pays for the choice and uses ordinary succession so a new ruling
house, political cost, portrait and genealogy survive a save. An active
claimant or civil war blocks the appointment, while an obsolete dispute
record alone does not. Foreign observers need a later report to learn the
new name. A court controlled by the player still awaits the player's choice.
Its opening armies and newly recruited formations now receive saved, named
field commanders from distinct Han, steppe, oasis and western cultural pools;
the independent campaign displays those names instead of raw IDs. Historical
leaders keep their documented identities. A browser regression checks a named
officer across save/load and both interface languages.
New Roman-campaign intelligence missions now assign saved fictional agents,
envoys and couriers. Captives retain the same person ID through release, and
the player's mission and captive lists display their names. Active missions
and held captives in older saves acquire an identity once; completed older
records remain as recorded.
The player's received capture and detection letters now name the mission's
saved agent in both languages. Legacy completed operations without a person
record keep generic wording rather than inventing an actor; a unit case checks
both outcomes and the archived letter after save restoration.
Newborn fictional people now use their faction's naming tradition instead of
receiving Roman given names in every court. Han children retain a recorded
father's surname in the displayed name while legal lineage continues to rely
on saved parent IDs; Egyptian female children use Greek-speaking court names.
Generated fictional people also have a saved appearance seed. The atlas draws
a compact procedural portrait for the player's own people; a foreign portrait
is only observed after a successful personal meeting. That meeting stores the
observed seed and political affiliation, so later hidden changes do not alter
the previously observed artwork. Existing bespoke portraits remain in use.
The family tree now uses the same artwork and the portraits vary face shape,
details and age without changing the person's saved identity. A foreign
portrait remains gated by the viewer's own meeting record.
Main's new limited childhood/adult portrait pairs for campaign-born Roman
people are also integrated. Saved identity claims keep those authored assets
attached to one person, while the procedural renderer covers other named
people. A legacy record without a saved identity still shows a silhouette.
Reported sovereign labels now distinguish Han, Parthian, Egyptian and other
institutions. When an unrelated fictional court member succeeds a hereditary
ruler, the new house, founder and political cost are saved and shown in the
player's genealogy. A documented Liu descendant may succeed in the direct Han
campaign; an unrelated minister with a Liu-looking name cannot. These are
partial Stage D/E integrations, not a claim that every requested political
route or important portrait is finished.
An initial Stage F/G market ledger now records measured grain, horse, iron,
timber, silk and papyrus batches for existing theaters. Production,
consumption, bounded prices, stock, shortages, shipment escrow, actual route
legs, tariff receipts, delivery transactions and transport spending persist in
saves. A treaty-backed Parthia–Armenia horse shipment is tested across a save
and a wartime interruption. Direct-Han-campaign silk and horses can now move
to and from Parthia along the pre-existing Han oasis and Central Asian route
graph. Distinct intermediate authorities collect buyer-funded tariffs; a war
at an intermediate leg blocks the shipment until passage reopens. No direct
Han–Parthian shortcut or Han provincial ownership is invented.
An imported horse batch can equip one hundred mounted scouts in a newly
recruited Han force. The batch leaves the destination market, the scouts are
visible in the army inspector, their terrain-dependent contribution changes
actual battle power, and casualties reduce their number. Han infantry can
still be raised when the local horse market is empty.
Treaty partners now make bounded quarterly AI purchases through the
same order validation and escrow path. AI-to-AI deliveries do not generate
player dispatches, and AI buyers cannot silently take goods from a player
market. The atlas now exposes own market stocks, quotes, routes, prepaid
orders, shipments and deliveries in English and Chinese. A Chromium smoke
test places an order and checks delivery and save/load. Old and new trade
treaties grant market access instead of generating one treasury unit per
party each month without a payer. This is a first commercial behavior, not
the requested continental merchant competition. Orders now acquire a saved,
culture-named buyer-side merchant with a portrait and inspectable dossier.
The merchant is paid a measured share of the prepaid transport charge only
on delivery; the remainder is recorded as transport spending. Old in-flight
orders gain one stable carrier without changing their stock reservation or
escrow. A carrier committed to an active shipment cannot be sent on an
unrelated personal journey. This is a first merchant-character integration;
the merchant still does not plan independently of its faction's trade AI. The
Roman campaign's optional Han NPC simulation now settles westward Silk Road
caravans through its measured stock and finite external buyer budget, with
actual tariff, merchant-fee and transport entries. Road closures and bandits
settle cargo and escrow without inventing revenue. Older saved caravans
continue carrying reports but cannot mint new treasury or horses. Delivered
silk and other defined commodities can now leave the Han Mediterranean gate
and enter an actual Roman eastern port market when a Roman court can pay for
them. The gate acts as a transit warehouse, without consuming cargo or
producing phantom local goods. The Roman treasury
pays the external buyer, whose finite Han-side budget is replenished by the
same amount; both ledgers retain a linked shipment receipt. Unaffordable
cargo waits at the gate. Older delivered silk is marked as historical instead
of imported twice; older non-silk cargo can finish its first Roman purchase.
The Roman player sees only their own purchases, with the actual commodity
shown in English and Chinese.
This is a first cross-campaign settlement bridge; the two simulations do
not yet share a general interstate market.
Completed Roman and standalone Han market deliveries now retain their origin
and destination in the transaction record. Both market panels show recent
player-involved receipts with actual buyer, seller, cargo, route endpoints,
goods payment, transport, customs and total in English and Chinese. Older
receipts use their shipment record when available; an unknown old endpoint
is shown as unknown rather than invented.
The independent Han campaign also has its own market panel. Known courts can
receive a frontier-market proposal; once a treaty exists, players can see
public offers, quote a route and full price, dispatch a named merchant, and
follow the shipment after saving and loading. A browser test runs the full
Kangju-to-Han horse purchase and delivery in English and Chinese. Han,
Kangju, Yuezhi and Parthia AI courts can seek treaties and place orders
without player input; their route plans use dated control reports, while
dispatch checks the actual road.
The standalone Han campaign now has a trade map mode on its existing Eurasian
map. It marks own markets with their actual grain, horse and silk stock and
prices; known foreign market centers show only dated paid price reports and
broad supply categories, otherwise stating that inventory is unknown.
Public geographic corridors, player-involved active routes and blocked legs,
the external exchange port, and the current position of player-involved
caravans use distinct restrained marks. Own market and caravan marks open the
existing trade panel. Unit checks prevent foreign warehouse totals and
unrelated AI shipments from leaking into the map; the Han market cloud browser
flow checks marker interaction, save/load and English/Chinese labels.
The independent campaign now lets a player set low, standard or high transit
customs duties. New caravan quotes and AI route costs use that saved rate;
already dispatched caravans retain their prepaid customs charge. A real
Han-to-Parthia shipment crossing Yuezhi territory verifies that the Yuezhi
treasury receives the locked duty once after delivery. The bilingual market
browser test checks the policy control and save/load. Export controls and
named merchant privileges are described below; broader tariff diplomacy
remains to be built.
The 120-month market simulation verifies that at least four AI courts place
orders against real surplus, deliveries complete, stocks and prices remain
bounded, escrow resolves, merchant IDs persist, transport fees balance, and
save migration works halfway through.
It now also runs the direct Han campaign for 120 months, including the
scheduled Liu succession, foreign ruler and portrait persistence, fiscal and
market bounds, physical deliveries, transport accounting and a midpoint save
reload. This broadens Test H but does not replace targeted political crisis
and combat acceptance scenarios.
The same long-run check now guards the home-pasture economy of four steppe
polities. Their mounted hosts draw sustenance from local herds while stationed
in friendly steppe territory; campaigning elsewhere resumes normal treasury
and grain upkeep. A separate test compares those two cases, while the
120-month Parthian run confirms the home hosts no longer bankrupt their courts
merely by remaining in place. Campaign losses can still strain a treasury.
The full 120-month campaign also uncovered a retreat deadlock: Wujie's host
repeatedly "withdrew" without a legal exit, stayed in the besieged territory,
and kept Zhizhi's campaigning force abroad indefinitely. Battle resolution
now permits withdrawal only when every withdrawing army has a legal route,
actually deducts the reported retreat losses, and lets a trapped host fight.
The long run verifies Wujie can change hands and that Zhizhi's treasury and
grain stay nonnegative. Qiang highland bands are locally supported while at
home, like oasis town levies; deployment still incurs upkeep.
Roman-campaign caravans blocked for twelve consecutive months now settle
against their escrow: cargo returns to the last actual campaign market,
the buyer recovers goods payment and customs, and transport spending plus the
named merchant fee is recorded once. Reloading an interrupted shipment keeps
its closure clock. The market panel and Chronicle report the stranded result
in both languages instead of showing an endless in-transit caravan or a false
delivery. Unit and Chromium regressions cover stock, treasury, receipt and
save/load conservation.
The standalone Han market also exposes real lost and returned caravan
outcomes in its recent transaction list. Each settlement records the refund
and physical location; old settlement records recover that detail from their
saved shipment. Bilingual Chromium coverage confirms a blocked horse caravan
is visible after a save reload.
Merchants in both campaign engines now retain a saved origin and return clock.
A delivered carrier cannot immediately take a new order from its distant
starting market; it becomes available after the return travel time, provided
the route is actually open. A newly closed border delays return. Tests cover
distinct concurrent merchants, reuse after return, blockade and save reload.
An oasis market with no local silk production can now offer imported surplus
above its consumption reserve for resale. A two-contract test moves real Han
silk to Shanshan and then to Qiemo, with distinct prepaid shipments,
delivery transactions, merchant identities and a save reload. The player
offer list labels such stock as resale in both languages. This is a first
intermediary sale mechanism; autonomous long-distance arbitrage still needs
to be demonstrated at continental scale.
Twelve historical opening Han ministers, frontier commanders and an envoy
now have separate artistic reconstruction portraits and an inspectable
bilingual court roster in the
direct Han campaign. The current office, faction and public loyalty are
visible; competence requires service, and corruption or ambition remains
hidden until the simulation reveals evidence. A player appointment or audit
changes the court state and survives save/load. Older saves gain an absent
portrait only when the saved identity still matches the historical record.
A browser regression checks all twelve portraits and exercises appointment,
audit and both languages.
Opening officeholders now record when service began in the campaign, so
their ability assessment can become visible after a year. Old saves that
lacked this date start the observation clock on load rather than exposing a
historical tenure or hidden skill without evidence.
The twelve featured court dossiers now retain a dated opening service record
and actual appointment, replacement, dismissal and audit events on the saved
person. These careers remain visible after the shared Chronicle trims older
entries; older saves recover retained events without inventing an appointment
date or reusing a historical opening record for a mismatched person ID.
The court roster now also includes current and former dynamically appointed
officials. Original Han officials and field commanders receive a deterministic
saved portrait seed and compact game artwork; authored portraits stay in use.
The dossier identifies original people as game creations. Appointment and
dismissal remain visible after Chronicle trimming and save restoration, and
older generated people acquire the same portrait on load. A Chromium test
selects an appointed original official, renders the portrait, changes language
and reloads the save. Broader generated-character art remains unfinished.
Procedural portraits now retain one face while changing modest garment details
for a current office, army command or leadership role. A successful foreign
meeting records the observed attire at that date; a later hidden promotion,
loss of office or aging cannot revise that saved observation. The details are
game artwork, not claims about a documented ancient garment.
The standalone Han campaign also renders its original people's saved faces
with age and current court office, army command or throne details. Appointment,
dismissal, command, succession and save restoration are covered by simulation
and browser checks; historical fixed portraits keep their existing artwork.
The Han court dossier now withholds exact hidden loyalty; it reports the
assessment as uncertain in both languages while keeping recorded career
events and actionable appointments visible.
Newly generated Han officials now save their culture, recorded origin, current
court location, profession and first service event alongside that portrait.
Their dossier shows those fields in both languages after save restoration.
Older generated officials keep their saved names; unknown origins and locations
remain explicitly unrecorded rather than receiving invented birthplaces.
Opening court people now carry their cultural identity and profession in new
campaigns; old saves gain those missing fields without replacing a recorded
location. Simulated Liu children also retain cultural identity, royal role and
an exact birth event with their actual parents. Old child records keep unknown
places unknown and do not acquire a fabricated birth month.
The same saved artwork now covers simulated Liu children, including a prince
who later becomes orthodox emperor. The own-ruler card uses that person's
portrait after a valid succession. A lineage-backed succession test rejects
a non-Liu minister, and a browser check keeps the heir's image through reload.
The Roman campaign's embedded Han succession now also requires a male
biological Liu father line and Liu names in both languages. Female descendants,
maternal-only descendants, adopted children and people with another surname
cannot occupy its orthodox throne. Existing historical Liu rulers and saved
male-line original heirs still pass after save migration.
The saved fictional-person catalog is now copied when it is exposed through
the shared display registry. Reusing an ID in another campaign or mutating a
display entry cannot silently rewrite this campaign's saved identity.
If a non-Liu minister establishes another dynasty, the Han ruler card now
shows the founder's actual status instead of falsely calling him Han emperor.
Both Republican commands can now choose a politically active original adult
when all documented successor candidates have been lost. This selection uses
the existing faction leadership and government simulation; it excludes
military-only people and active specialist professions, and Republican command
requires at least 35 influence before an original court member is considered.
It does not pass automatically from parent to child. A browser regression checks
the selected original leader's portrait and identity after save/load.
Repeatedly appointing the same officeholder no longer grants more favor or
resets the observed-service clock. The court browser test verifies bilingual
career display and persistence through save/load.
The disaster response now applies blame to the court faction actually chosen
by the player. Invalid faction IDs are rejected before altering influence;
previously the conditional expression silently redirected every choice to
the classicist officials.
An unresolved disaster now stays pending when another random disaster roll
would otherwise replace it. At its deadline the court uses grain relief,
treasury-funded self-reproach or the politically costly magnate offer according
to resources actually available; this also clears older saves whose AI court
could otherwise retry an unaffordable response forever.
The direct Han court panel now displays pending disasters with the affected
region, a response deadline, costs and available actions. The player can
choose whom to blame, or use the existing relief, self-reproach, dismissal
and magnate options; each goes through the actual court simulation. A browser
test verifies that the chosen faction loses influence across save/load.
The minister dossier also shows approximate age from the saved birth record,
only named relatives already present in the genealogy, and the current
office's actual responsibility. It avoids inventing unknown family ties.
The direct Han campaign now links foreign sovereign records to persistent
people. The attested opening Parthian, Armenian and Commagene names stay
historical; unnamed Kangju and oasis kings retain title-only opening records.
When a ruler dies, a faction-aware original successor takes office, with a
saved identity, portrait seed, appropriate title, predecessor or valid parent
link, stability cost and Chronicle entry. Military AI uses the reigning
ruler's judgment when evaluating *dated observed* enemy strength. The
reigning ruler's competence also alters actual foreign tax collection, with
the simulated effect visible only in that faction's own ruler card. The own
realm overview shows the current ruler, portrait and provenance in both
languages, and older saves gain missing links without overwriting a recorded
ruler. Targeted tests cover Parthia, Armenia, Wusun, Kangju and Shanshan,
plus save restoration and a Kangju browser succession. The Roman campaign's
separate succession model still needs the full cross-campaign acceptance run.
When a foreign ruler's surviving child inherits before age eighteen, the
child retains the culturally titled throne while a distinct original adult
regent holds the governing and military judgment used by the simulation. The
regent has a saved ID, portrait, relationship to the young ruler and bilingual
card; a dead regent is replaced, and authority returns to the ruler at
adulthood. Unit tests measure the regent's actual tax effect across a turn,
save/load and succession; a Chromium smoke checks both languages and images.
Foreign court succession and regency no longer enter the player's Chronicle
as instant knowledge; the realm's own Chronicle still names its participants.
The same privacy check now covers ordinary foreign deaths, imperial births,
Emperor Xuan's scheduled death, the Han accession and internal court notices.
Historical Han people without an explicit faction field count as Han for
their own Chronicle. The dates and succession still advance in the simulation;
other courts must learn them through the existing intelligence routes.
The expanded Eurasian roster now opens with title-only, explicitly unnamed
rulers where no contemporary personal name is documented. A named original
successor appears only after a simulated succession. New ruler names avoid
duplicates among living people where the cultural pool permits; an existing
save's ruler identity is retained, and a stale ID counter cannot overwrite
an earlier person. Tests cover several neighboring courts and a dynamic
new court. Generated successors now draw from the same distinct reconstructed
Xiongnu, Wusun, Kangju, Bactrian, Yuezhi, Sogdian, Saka and oasis name pools
used by field characters. Their saved person records include cultural origin,
homeland, current location, role and succession history. The opening rulers
and names in older saves remain intact. If an older save retains an unnamed
ruler receipt but lacks that person record, migration restores the title-only
marker instead of claiming
the placeholder is a documented historical individual.
The [Hanshu Western Regions account](https://ctext.org/wiki.pl?chapter=325663&if=en)
describes Gumo's king by office without identifying a 49 BCE personal name;
[the Atropatene chronology](https://www.iranicaonline.org/articles/azerbaijan-iii/)
is likewise too uncertain to assign a specific opening king. The title-only
records avoid presenting a game-generated personal name as documented history.
The standalone Han campaign now settles a player defeat when no land and no
field army remain, after six wartime months without a field army, or after a
year of territorial exile without recovery. The final state stores the
reason, date and remaining forces; the playable screen shows a bilingual
summary and stops month advancement. Peace without armies remains recoverable.
The finished screen offers a new campaign without deleting the saved record.
An actual siege loss records a recent territory alert in the realm overview.
Unit and Chromium tests cover defeat, save/load, a frozen date and the
bilingual alert. The embedded NPC eastern simulation does not self-finalize.
The Roman recovery deadline now also has a complete Chromium regression:
after the last field army is removed, the player receives three months to
rebuild, the fourth turn ends the campaign, the month control freezes, and a
saved defeat can be opened in both languages and archived through Legacy of
Rome. This runs in the Browser smoke workflow alongside the Han defeat flow.
The eastern market now lets the player restrict or reopen exports by measured
commodity. New foreign quotes, public offers and autonomous buyers honor the
restriction; domestic transfers and caravans already in transit keep their
existing terms. The policy survives old and new saves and appears in both
languages. Merchant privileges are tracked separately from export controls.
The direct Han and Roman markets now support measured player sale listings.
Posting removes goods from local stock; only the listed quantity becomes
visible to AI buyers, who must still have a treaty, route and treasury and pay
the seller after delivery. Cancelling returns the unfilled stock, while
conquest releases it into the captured local market. Listings, partial fills
and merchant shipments persist across saves. In both the Roman and direct Han
campaigns, AI buyers now plan before committing limited stock. A seller
compares affordable premium bids, and a losing buyer can seek another stocked
origin. The premium is bounded by local value and treasury reserve; the winning
price, goods, merchant and route use ordinary escrow and delivery settlement.
Save/load regressions check the accepted price and seller payment. Quarterly
eastern offers refresh after orders so displayed availability is current.
The Roman market also lets the player choose low, standard or high transit
customs and restrict or reopen exports of each measured good. New quotes and
AI buyers respect export controls, while dispatched caravans retain their
original terms. Customs accrue to the transit court on delivery; both
policies persist across saves. Unit and bilingual Chromium tests cover these
controls. Both Roman and direct Han markets now offer recurring supply
agreements. A negotiated agreement dispatches and prepays its first measured
shipment immediately; later installments check stock, funds, route and treaty
access, while retaining the agreed goods price. Shortages and unpaid orders
can breach the agreement and lower relations; withdrawal also has a real
diplomatic cost. War or lost access ends future obligations without rewriting
caravans already underway. The terms, due dates and shipments survive saves.
Unit and browser tests cover both markets, including bilingual controls.
Both Roman and direct Han markets now let the player pay a named carrier a
five-treasury privilege fee for 12 or 24 months. The license starts when that
merchant next carries a new order, so a long journey already underway cannot
consume its term. An eligible licensed carrier receives priority at the
origin and lowers the new order's transport cost by 20%, with a minimum cost
of one; existing shipment escrow remains unchanged. Fees move into the
merchant's saved wealth, and license terms survive save/load. Unit tests cover
the actual Han transport saving, pending activation and expiry; bilingual
market browser checks exercise the player control; both networks have
measured long-route transport savings in unit tests. Eastern merchants now
retain route experience after actual deliveries. An available merchant with
experience on the requested route takes priority after any privileged carrier;
repeat voyages receive a bounded transport discount and a one or two point
reduction in simulated raider risk. A lost shipment lowers that merchant's
reputation. These records persist in saves and appear in both languages in the
market panel. The Roman-facing market also saves delivered route experience,
uses it for carrier selection and bounded transport discounts, and shows it
alongside reputation in its bilingual panel. This is an initial consequence of merchant experience, while
individual merchant negotiation, broader independent investment and competing private
commercial networks remain open.
Eastern merchant characters now also react to a route they personally lost
cargo on. A less risk-tolerant merchant with at least two wealth pays two of
their own wealth for an escort on a later caravan along that same route. That
saved shipment has two percentage points less modeled raider risk per leg;
the escort expense enters its own ledger rather than faction treasury or
the buyer's prepaid transport. The market panel shows the merchant's risk
tolerance, raided routes, escort on an active caravan and aggregate spending
in English and Chinese. An actual lost-and-retried caravan, not a random
market bonus, proves this behavior; wider independent merchant investment
and negotiation still remain open.
After an eastern carrier actually loses a paid shipment to raiders, it now
petitions its own court for one route-specific escort. A player can decline
or pay eight treasury; a funded escort reduces the next caravan by that
merchant on that route by three percentage points of raider risk per leg.
The pledge expires after a year and is consumed only when the matching
caravan departs. Foreign AI courts answer their own petition based on cargo
value and a treasury reserve. AI Han keeps its existing separate route-guard
response rather than paying twice. Requests, decisions, merchant identity,
spent treasury and one-trip protection survive saves. The bilingual eastern
market panel shows only the player's requests. Tests compare the same
deterministic raid with and without the funded escort, not just its label.
An allegiance change now removes a carrier from the old court's usable roster
and cancels its old return itinerary. Otherwise a stale roster could assign
the defector to a later caravan. A saved delivery, defection and subsequent
order are covered by a focused regression.
Small oasis courts now participate in the autonomous market even below the
former population threshold. They can buy an affordable one-unit lot instead
of being excluded when a three-unit quote exceeds their cash. Local town
levies use household service at home but still draw treasury upkeep when sent
away; AI oasis focus spending keeps an operating reserve. Small populated
non-oasis kingdoms now also enter the same market search twice yearly: the
former threshold excluded 26 courts, including Armenia. The staggered search
keeps the NPC East timing check below its established ceiling. A small non-oasis
court also retains at least three quarters of its current treasury when quoting
an order, so Zhizhi's frontier host is not bankrupted by a discretionary luxury
purchase. A regression follows an autonomous
Armenian grain purchase through escrow, save/load, delivery and one-time seller
payment. The broader buyer pool changes deterministic competition, so the
existing ordinary two-court silk resale test uses a seed that still exercises
both paid legs without suppressing the new buyers. In a normal 40-month
Parthian-observed campaign, Han silk reaches Qiuci and a subsequent
Qiuci-to-Shule resale settles without player orders, including across a save
reload. A separate embargo scenario confirms Shanshan-to-Qiemo resale after
the direct Han offer closes. Both legs use stock, treaties, routes, escrow,
named carriers and seller payment; existing 120-month conservation checks
remain in place. Per-quarter route caching keeps the enlarged buyer pool
within the market test's prior runtime. Wider autonomous intermediary volume
and merchant financing are still open.
The ten-year full campaign exposed a circular silk trade between Shule and
Dayuan: both courts replenished a target stock but neither consumed the luxury
good. Populous courts now consume one real silk batch per market month when
stock is present; smaller oasis intermediaries retain stock for onward resale.
The seeded long run still delivers Qiuci-to-Shule silk and records Dayuan's
consumption, while checking that Dayuan does not ship it straight back east.
The Roman-Han relay now detects newly appended public Han events even after
the Han Chronicle reaches its 400-entry cap. A regression fills that log,
causes a real battle, saves and restores the campaign, then verifies the
report reaches Rome only after its actual relay delay.
Delivered horse batches can now be assigned from an owned local market to the
military remount pool at 100 head per batch. Assignment removes the measured
stock, records the transfer in the save, and lets cavalry recruitment spend
the acquired horses. In-flight cargo and a second assignment from exhausted
stock are rejected. A save/reload test follows a Kangju-to-Dunhuang shipment
through cavalry recruitment; the bilingual market browser test uses the
actual button and verifies both ledgers change exactly once.

Ordinary 3,000-person Roman levies now use one measured weapons batch from
their own theater, as custom formations already do. A shortage blocks the
recruitment before spending treasury, food or manpower. Delivered stock may
equip the levy after arrival; the local stock, recruitment-use ledger and
new army's equipment record survive saving. The two campaign maps explain
the missing stock in English and Chinese. Focused tests check failed orders,
in-flight cargo, delivery, one-time debit, old-save restoration and the
non-Roman recruitment rule; a Chromium flow uses both interfaces.

The direct Han market now exposes the existing paid caravan route protection.
Each 20-treasury payment raises security one level, up to five, reducing the
actual modeled per-leg raider risk for Han-sponsored cargo; one level expires
each January. The action, risk difference, bilingual panel and save reload
have unit and Chromium coverage. The old route-protection API accepted a
negative charge and could add money; it now rejects nonstandard amounts,
unfunded orders, non-Han players and purchases above the cap.
When AI Han loses one of its own paid Silk Road caravans to a real raid, it
now funds one measured guard increment if its treasury can retain an
operating reserve. The cost enters a saved protection ledger, the increment
uses the same raider-risk reduction as the player action, and a recorded raid
cannot be charged twice across turns or reloads. The AI does not inspect
foreign shipments or disclose this private choice in the player's log.
Main's later conspiracy report fix now keeps the name actually recorded at
the report date in the security panel, including after save/load; future and
unnamed reports cannot borrow a hidden later identity. The regency tenure
fix also restarts its counter when the same ward and regent enter a new spell,
including an ended spell recorded in 1 CE. The five new unit checks and both
Chromium scenarios pass with the expansion's shared module imports.

The expansion remains incomplete: wider Central Asian name datasets and
characters, other major fixed portraits, additional routes to fictional sovereignty,
general Roman–Han settlement, autonomous intermediary resale at scale,
broader player and merchant competition, and the full acceptance
scenarios are still outstanding. New names
and emblems are game reconstructions, not documented personal identities.
Han civil-war and peasant-uprising field commanders now use the Han cultural
pool instead of the default Tarim oasis pool. A temporary uprising no longer
acquires a fictitious foreign monarch. Old saves drop that erroneous ruler
office while retaining the saved person and the uprising's army; regression
checks cover commander identity and reload stability.
The eastern market now gives each named player merchant a compact portrait and
an inspectable bilingual identity record. Artwork uses the person's saved
culture and appearance seed, with a deterministic fallback for older saves;
opening the profile does not create or revise a person. Homeland, approximate
age, allegiance, reputation, risk tolerance, actual delivered and lost
caravans, and the existing working privilege actions remain together. The
portrait is labeled original game artwork rather than an attested likeness.
The first cloud browser pass exposed a false Chinese text expectation and a
real merchant-origin error: recruitment at a foreign seller market set that
place as a buyer-side merchant's homeland. New merchants now take a home in
their own realm and keep the foreign hiring market as a dated entry event;
existing save identities are not rewritten.
Four-market autonomy now has integrated acceptance coverage beyond initial
orders: a poorly related seller rejects a market proposal, later accepts
after relations improve, and an AI Han court can replace a wartime-blocked
Kangju horse source with a paid Yuezhi caravan. The replacement travels on
the connected Bactrian corridor, survives save/load, adds real stock at its
destination, and pays the Yuezhi seller only on arrival. These scenarios do
not establish that every AI court will always find a viable alternate route.
All 52 playable non-Han courts in the eastern campaign now have a simultaneous
succession regression covering saved identity, title, portrait and governing
effect. A woman who rules a kingdom receives a corresponding queen title;
an original Parthian sovereign is described as a ruling queen rather than
borrowing the male King of Kings title or projecting a later Queen of Queens
title back into 49 BCE. This is an alternate-history game description, not an
attested Arsacid style. Older saved female rulers with the generic male title
are corrected without changing their identity or artwork.
The distinction follows [Encyclopaedia Iranica's discussion of Parthian
kingship](https://www.iranicaonline.org/articles/kingship/kingship-iii-in-the-parthian-period/)
and its account of the [later Sasanian Queen of Queens
title](https://www.iranicaonline.org/articles/women-i/).

## Existing foundations

| System | Reusable implementation | Limitation for Faces of Empire |
| --- | --- | --- |
| Campaign | `engine.js`, `data.js`, `map.js`, `map-lab/lab.js` | 24 theaters, 28 routes, 12 initial armies; no Han faction or Eurasian geography. `PLAYABLE` contains nine Mediterranean powers. The schematic projection and atlas overlays cover the Mediterranean. |
| Characters | `characters.js`, `character-system.js`, `dynasties.js` | 19 catalogued historical characters; fictional IDs and save-persistent family records exist. `createFictionalPerson` requires callers to supply a name and records generic “Simulated” culture. There are no structured Han, Central Asian, or culture-specific name generators. |
| Portraits | `portrait-registry.js`, `map-lab/character-ui.js`, `assets/portraits/` | Individual artwork exists for historical characters and selected fixed fictional people. Other fictional people use a silhouette. There is no deterministic procedural appearance seed or layered renderer. |
| Government | `governance.js`, `office-system.js`, `dynasties.js` | Roman offices and several Mediterranean succession models work. There is no Liu-lineage record, Han court, Han imperial eligibility check, or culture-specific title table for the requested new states. |
| Diplomacy | `agreements.js`, `inventions.js` | A `trade` agreement grants flat treasury each month, and knowledge exchange has its own travel/adaptation rules. Neither moves physical commodities. These mechanisms must be migrated deliberately rather than counted as market trade. |
| Economy and AI | `engine.js`, `strategic-planning.js` | Treasury, food, manpower, tax, recruitment, and fog-aware military AI exist. There are no commodity units, local inventories, prices, shipments, tariffs, or merchant characters. |
| Persistence | `engine.js:upgradeSave`, `view-handoff.js`, dynasty and chronicle migrations | New systems must initialize missing fields without resetting old campaign state, character identities, treaties, or knowledge. |

## Build order and acceptance gates

1. **Han theater and balance.** Add an eastern geographic layer and connected theaters before enabling Han in campaign setup. Historical 49 BCE ruler identity must be bookmark-specific; Han core production, treasury, recruitment, frontier transport cost, and AI reserve behavior must be measurable in simulation tests. Do not represent Western Regions kingdoms as directly administered Han core theaters merely to make the map continuous.
2. **Identity and lineage.** Add structured culture-specific name datasets and deterministic ID allocation. Every persistent event actor must point to a saved character. Model verified Liu descent as parentage/adoption evidence, not a surname string; enforce the orthodox throne invariant at every succession, coup, and save-upgrade entry point.
3. **Portraits.** Give major fixed people individual artwork and generated people stable appearance seeds. Keep portrait visibility tied to existing identity knowledge. Cache small renditions and do not create new random faces while rendering.
4. **Trade state.** Define commodity units, per-market inventory/production/consumption, bounded prices, order escrow, shipments, route legs, tariffs, and transaction records. Migrate the existing flat `trade` agreement to explicit terms before using it to authorize a shipment.
5. **Transport, diplomacy, AI, UI.** Route only across real adjacent markets or maritime links with access checks. AI should use the same inventory/payment/route validation as the player. Expose observed foreign information, not exact hidden stocks. Build market screens only after orders and delivery work headlessly.
6. **Regression.** Run the supplied Han strength, Liu succession, foreign ruler, horse shipment, Silk Road, four-AI-market, and 120-month scenarios, plus existing `npm test` and browser smoke. Verify conservation of goods and payment across save/load and interrupted routes.

## Risks that must be resolved in code

- Adding Han to `FACTIONS` alone would make it appear in some loops but leave it outside `PLAYABLE`, opening leaders, geographic overlays, AI geography, succession, and save migration.
- The current atlas and schematic map cannot honestly show a Eurasian campaign by simply placing off-screen coordinates into the existing Mediterranean projection.
- Reusing the present flat trade-treaty income as commodity commerce would create value without production, inventory, transport, or a payer.
- A Liu surname, high ambition, or marriage is not sufficient evidence for orthodox Han succession.
- Fixed fictional portrait IDs are guarded by saved identity and birth year; a general portrait generator must preserve that isolation across old saves.
