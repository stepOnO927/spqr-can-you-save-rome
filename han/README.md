# MANDATE OF HEAVEN — 天命：大汉帝国

The first civilization expansion for **SPQR — Can You Save Rome?** A playable Western Han campaign with its own court, succession law, army organizer, frontier diplomacy, Silk Road and focus trees. It runs beside the Roman campaign and does not change it.

- **Start:** main menu → *CIVILIZATION EXPANSIONS — 文明扩展* → *MANDATE OF HEAVEN*, or open `/han/` directly (`npm start`, then <http://localhost:5173/han/>).
- **Saves:** `spqr-han-save-1…3`. Roman saves (`spqr-save-*`) are never read or written by the DLC.
- **Code:** `han/` (data, people, dynasty, court, military, frontier, silk-road, focus, engine, map, ui). Tests: `test/han-*.test.js`.

## The absolute rule

Only a verified member of the Liu imperial clan can hold `orthodox_han_emperor`. The rule is enforced in `han/dynasty.js`:

- **Lineage:** computed only from the agnatic chain of birth records back to Liu Taigong. Historical records are checked against `people.js`; records generated during a campaign carry a seal and are checked against the father's sex, age and survival.
- **One path to the throne:** `crown()` is the only function that sets the orthodox emperor. It accepts only recognised processes: accession, designation, court selection, regency installation, restoration, loyalist proclamation and civil-war settlement. Each needs a minimum level of court recognition.
- **What can never confer orthodoxy:** national focuses, reforms, Mandate value, military victory and save migration.
- **Surname, marriage and adoption:** changing a surname, an imperial grant of the Liu name (赐姓), and marriage never create lineage. Adoption inside the clan is recorded as a legal heirship (为后); adopting an outsider grants nothing.
- **Non-Liu power:** a non-Liu can be regent or de facto ruler, install a puppet, depose one Liu for another, or found a new dynasty. A new dynasty is always recorded as `orthodox:false`. The displaced Liu remains a claimant, and loyalists can restore the Han.
- **Re-validation:** `enforceDynasticInvariants()` re-checks the throne on every tick and on every load. A save edited to place a non-Liu on the throne, forge a Liu father or relabel a dynasty is corrected on load.

The game tracks six statuses: orthodox emperor, disputed Liu claimant, regent, de facto ruler, non-Liu usurper and founder of another dynasty.

## Systems

| System | What it does in play |
| --- | --- |
| **49 BCE bookmark** | Liu Xun (Emperor Xuan) died on 10 January 48 BCE, late in the Huanglong era (黄龙元年, conventionally "49 BCE"). Liu Shi took the throne on 29 January 48 BCE. The campaign opens in February 48 BCE. Two alternate bookmarks are included: *The Grand Marshal's Shadow*, with the fictional Pang Chong, and *The Huaiyang Question*, a disputed accession between Liu Shi and Liu Qin. |
| **Map** | 44 territories drawn as areas: a Voronoi partition of several anchors per territory, clipped to the Natural Earth coastline. Every territory belongs to a Han inspection circuit (十三州刺史部, plus 西域都护府 and 外藩) and to one of 13 military theatres (战区). Borders are drawn by level: territory, circuit, theatre, state. Four map modes: 政区 / 州部 / 战区 / 地形. The terrain layer covers the plateau, 26 ranges, deserts, steppe and marsh, plus 10 lakes, 24 rivers and the Han frontier line. 64 routes typed as road, river, pass, desert, steppe or oasis road connect the territories. Five camera presets; text and lines keep their size at any zoom. Borders are schematic, not surveyed. |
| **Imperial Court 大汉朝廷** | 10 offices with period titles and short glosses: 丞相, 御史大夫, 大司马车骑将军, 前将军光禄勋, 中书令, 大司农, 宗正 (Liu clan only), 西域都护, a Hexi command and 京兆尹. Five factions: 外戚, 儒臣, 中书宦官, 边将, 地方豪强. The emperor's authority is tracked separately from who controls the court. Edicts take months and need faction support; they can stall. |
| **Hidden minds and audits** | Officials have hidden corruption and ambition. Competence becomes visible after a year in office; corruption only through an audit's evidence. A powerful official under audit can obstruct it, and an unfounded accusation makes an enemy. |
| **Ambition** | Non-Liu officials weigh five options: serve, regency, puppet, reform or usurpation. Usurpation needs very high ambition, near-total control and a collapsing Mandate, so controlling a Liu emperor is usually the better strategy. |
| **Succession** | Each court faction backs a candidate. The outcome can be peaceful accession, a regency for a child, a disputed succession that paralyses government, or a dynastic civil war fought by a rival princely court. After a usurpation, loyalists form a separate government and can restore the Han. |
| **Mandate 天命** | A political judgement built from 11 components: administration, succession, court, order, grain, taxation, war record, calamities, corruption, ritual and the response to portents. It never confers orthodoxy. |
| **Disasters** | Floods (mostly on the Yellow River), drought, locusts, earthquakes and frontier supply crises hit real territories. Court factions read each disaster differently. Responses include relief, an edict of self-reproach, dismissing the chancellor by precedent, blaming a faction, or accepting magnates' grain. Unrest leads to reform or suppression, and to rebellion if the Mandate is failing. |
| **Han Army Organizer 汉军编制** | 9 Han components: 材官, 强弩, 弓手, 骑士, 戍卒, 候望, 匠作, 攻城, 转输. Presets: 朝廷野战军, 边郡戍军, 机动骑军, 攻城军, plus custom designs. Recruitment has real costs and requirements (iron, horses, arsenal, frontier). Crossbows counter cavalry. |
| **Steppe and oasis militaries** | Xiongnu components: 控弦骑射, 贵种亲骑, 附庸部落骑. Xiongnu hosts are herd-supplied, withdraw when outmatched, pursue a beaten enemy, and lose subject tribes after defeat. Wusun, Kangju, oasis and Qiang forces have their own components. |
| **Supply and season** | Route type, transport detachments, herds, allied oases and winter all change march time and attrition. |
| **Western Regions** | Each oasis keeps its own ruler. Its standing toward Han and toward the Xiongnu, its autonomy, concern and hostage status all shift. Standing ≥50 opens passage for troops; ≥60 brings tribute and shared intelligence. Oasis rulers decide for themselves: they pay tribute, court Zhizhi, refuse levies or ask for protection. Direct annexation alarms every oasis. |
| **Xiongnu, Wusun, Kangju** | Huhanye is a tributary since 51 BCE and asks for grain. Zhizhi pursues western conquests and courts resentful oases. The two Wusun kunmi weigh the balance between Han and the Xiongnu. Kangju trades and contests the Wusun pastures. |
| **Grand Chessboard reaction** | When Han reinforces the Western Regions, oasis concern rises, Zhizhi offers support, the Wusun reassess, and the Han court debates whether to reassure or press. |
| **Diplomacy** | Nine treaty types: peace, alliance, tributary submission, heqin marriage, hostages, caravans, frontier markets, protection and recognition. Each receiving court decides from its own interests and intelligence. Oasis states can form defensive coalitions. |
| **Fog of war** | Each faction has its own intelligence picture, built from its territory, armies, scouts and the Protectorate. AI decisions read only that picture. |
| **Silk Road 丝绸之路** | Caravans travel hop by hop along the cheapest open path. Each leg needs access, water and security; owners levy tolls and bandits threaten unguarded roads. Beyond Kangju, Parthian (安息) intermediaries carry goods off-map. Rumours of 犁靬 Lijian, the far west, need years to come back. A Han embassy to the far west requires a rumour already heard, 36 months of open road, Kangju's goodwill and money. Han and Rome have no contact at the start. |
| **National focus** | Han tree with branches A–F (36 focuses), plus trees for Huhanye, Zhizhi, both Wusun kunmi, the oases, Dayuan and Kangju. Effects act through real systems: an edict that still needs support, a negotiation the other side can refuse, standing, regional works. The AI uses the same engine. |
| **Endings** | 盛汉, 朝廷分裂, 汉室再兴, 篡位新朝 (labelled not orthodox), 西域雄图 and 汉祚绵延, all decided by game-state conditions. |
| **Achievements** | Eight Han achievements, computed only at official finalization. Each Laurel Coin is paid once per achievement, ever. |
| **Bilingual interface** | Simplified Chinese and English throughout, with Chinese names and titles preserved. |

## Historical sources

- **Primary:** *Hanshu* 汉书 — 卷八 宣帝纪, 卷九 元帝纪, 卷十九 百官公卿表, 卷三十六 楚元王传 (刘向), 卷七十八 萧望之传, 卷九十三 佞幸传 (石显), 卷九十四 匈奴传, 卷九十六 西域传 (incl. 乌孙, 冯嫽), 卷九十七 外戚传. *Shiji* 史记 卷一百二十三 大宛列传. *Zizhi tongjian* 资治通鉴 卷二十七–二十八.
- **Dates checked for this build:**
  - Emperor Xuan d. 10 January 48 BCE; Emperor Yuan enthroned 29 January 48 BCE (Wikipedia, *Emperor Xuan of Han* / *Emperor Yuan of Han*, citing the *Hanshu*).
  - Wusun split into Greater and Lesser Kunmi in 53 BCE; Xingmi 星靡 succeeded Yuanguimi as Greater Kunmi (Wikipedia, *Feng Liao*; *Timeline of the Han dynasty*).
  - Shi Gao, Xiao Wangzhi and Zhou Kan were named regents.
  - Wang Zhengjun was made empress in 48 BCE.
- **Further reading:** Michael Loewe, *Han Yuandi (reigned 48 to 33 BCE) and his advisors*, *Early China* 2013 (court politics under Emperor Yuan).
- **Geography:** Natural Earth (shared with the Roman atlas). Commandery and oasis seats use modern coordinates of the attested seat. Territories are aggregated gameplay units, not exact boundaries.
- **Approximate dates:** births marked *approx.* are estimates. Personal names of the 48 BCE kings of Kangju, Dayuan and the oases are not securely recorded, so those rulers are shown by title.
- **Portraits:** AI-generated artistic reconstructions; see `assets/portraits/SOURCES.md`.

## Acceptance tests

`node --test test/han-*.test.js` runs 40 tests. These are the 38 required acceptance tests plus two extra dynastic tests (generated births and the restoration path).

- **Dynastic (1–10):** Liu Shi's legitimacy; an heir's accession; a disputed succession leading to dynastic war; non-Liu regency; deposing one Liu for another; founding a new dynasty; every route to orthodoxy refused for a non-Liu, including raw state writes, all focus effects, 30 years of AI play and purchased Mandate; surname change; marriage and adoption; four kinds of save tampering.
- **Strategic (11–20):** routes and connectivity; supply and attrition; Han formation rules; Xiongnu withdrawal, pursuit and tribal desertion; autonomous oasis rulers; negotiation; real effects of protectorate standing; trade connectivity; no instant Rome–Han contact; fog of war.
- **Political (21–30):** factions; appointments; ambition without rebellion; restoration; usurper distinct from orthodox Han; focus effects; AI focus choice; unrest leading to reform or rebellion; persistent relationships; history kept separate from simulation.
- **Technical (31–38):** the Roman campaign still works; Roman saves are preserved and rejected by the Han loader; Han save round-trip and determinism; both languages in every panel; map render time; tick time over ten years in each scenario; no button without a handler and no edict without an effect; achievements hidden until finalization and paid once.

The full repository suite (667 tests) passes.

## Save compatibility

- Roman saves and scenarios are unchanged; the Roman engine does not import any DLC module.
- The only changes outside `han/` are:
  - `app.js`: the menu entry;
  - `index.html`: the cache version;
  - `server.mjs`: the `/han/` route and image MIME types.
- Han saves carry `dlc:'mandate-of-heaven'` and `version:'han-1'`. Loading re-derives historical birth records from the static record, then re-validates the throne.

## Performance

- A monthly tick averages about 1–3 ms in Node.
- The map is a single SVG with cached land paths (under 40 ms per render in the test).
- AI planning uses bounded, local searches only.

## Not yet done

- **One world map:** the Mediterranean and Han maps are separate. The far west appears only as off-map Silk Road nodes; there is no single zoomable world map or shared camera between theatres.
- **Map detail:** the map is a vertical slice of 44 territories. It has no county-level detail, no Liaodong, Korea or far south, and no Iranian plateau.
- **Simulation:** births are simulated only for the reigning emperor. Officials are generated for vacant offices rather than through full family dynasties. Weather is seasonal only (winter).
- **Wider play:** Western Regions rulers are shown by title only. The non-Han trees are smaller than the Han tree, and steppe AI is goal-driven but simpler than the court AI.
- **Later bookmarks:** 36 BCE, 9 CE (Xin) and 25 CE are prepared for (the Wang Mang and Liu Xiu facts are recorded) but not built, as the brief required.
