// Declared behavior and evidence targets. Status is computed from executed tests,
// never inferred from the existence of a module or menu.
export const FEATURE_STATUSES=Object.freeze(['PASS','FAIL','PARTIAL','UNREACHABLE','NOT IMPLEMENTED','NOT TESTED','BLOCKED']);
export const FEATURES=Object.freeze([
  {
    "id": "military",
    "name": "Military / 军事",
    "owner": "engine.js",
    "dependencies": [
      "data.js",
      "character-system.js"
    ],
    "ui": "main: Military / atlas: armies",
    "actions": [
      "recruit",
      "previewMarch",
      "moveArmy",
      "tick"
    ],
    "stateChanges": [
      "army men",
      "orders",
      "owner",
      "battle report"
    ],
    "tests": [
      "test/military-commands.test.js",
      "tools/browser-smoke.mjs"
    ],
    "saveLoad": true,
    "scenarios": "Roman; scenario variants",
    "production": "Public campaign",
    "limitations": [],
    "status": "NOT TESTED"
  },
  {
    "id": "diplomacy",
    "name": "Diplomacy / 外交",
    "owner": "engine.js",
    "dependencies": [
      "agreements.js",
      "diplomatic-knowledge.js"
    ],
    "ui": "Government and Factions",
    "actions": [
      "diplomacy",
      "proposeAgreement",
      "replyToLetter"
    ],
    "stateChanges": [
      "relations",
      "treaties",
      "chronicle"
    ],
    "tests": [
      "test/diplomatic-chronicle.test.js",
      "tools/diplomatic-chronicle-smoke.mjs"
    ],
    "saveLoad": true,
    "scenarios": "Roman; foreign actors",
    "production": "Public campaign",
    "limitations": [],
    "status": "NOT TESTED"
  },
  {
    "id": "government",
    "name": "Government / 政府",
    "owner": "governance.js",
    "dependencies": [
      "office-system.js",
      "cursus-honorum.js"
    ],
    "ui": "Government",
    "actions": [
      "appoint",
      "advanceGovernments"
    ],
    "stateChanges": [
      "office holders",
      "obedience",
      "political history"
    ],
    "tests": [
      "test/governance.test.js",
      "tools/cursus-deep-smoke.mjs"
    ],
    "saveLoad": true,
    "scenarios": "Roman",
    "production": "Public campaign",
    "limitations": [],
    "status": "NOT TESTED"
  },
  {
    "id": "elections",
    "name": "Elections / 选举",
    "owner": "cursus-honorum.js",
    "dependencies": [
      "governance.js"
    ],
    "ui": "Government > careers",
    "actions": [
      "advanceCursus"
    ],
    "stateChanges": [
      "candidates",
      "office transitions"
    ],
    "tests": [
      "test/cursus-honorum.test.js",
      "tools/cursus-smoke.mjs"
    ],
    "saveLoad": true,
    "scenarios": "Roman",
    "production": "Public campaign",
    "limitations": [],
    "status": "NOT TESTED"
  },
  {
    "id": "characters",
    "name": "Characters / 人物",
    "owner": "character-system.js",
    "dependencies": [
      "characters.js",
      "dynasties.js"
    ],
    "ui": "Government, army inspection",
    "actions": [
      "advanceCharacters",
      "appointCommander"
    ],
    "stateChanges": [
      "identity",
      "relationships",
      "health"
    ],
    "tests": [
      "test/character-ui.test.js",
      "tools/chronicle-person-smoke.mjs"
    ],
    "saveLoad": true,
    "scenarios": "Roman",
    "production": "Public campaign",
    "limitations": [],
    "status": "NOT TESTED"
  },
  {
    "id": "dynasties",
    "name": "Dynasties / 王朝",
    "owner": "dynasties.js",
    "dependencies": [
      "characters.js",
      "governance.js"
    ],
    "ui": "Government > succession",
    "actions": [
      "decideDisputedHeir"
    ],
    "stateChanges": [
      "succession",
      "family records"
    ],
    "tests": [
      "test/dynasties.test.js",
      "tools/health-succession-smoke.mjs"
    ],
    "saveLoad": true,
    "scenarios": "Roman",
    "production": "Public campaign",
    "limitations": [],
    "status": "NOT TESTED"
  },
  {
    "id": "economy",
    "name": "Economy / 经济",
    "owner": "engine.js",
    "dependencies": [
      "data.js"
    ],
    "ui": "Resource bar and tax policy",
    "actions": [
      "forecastEconomy",
      "setTax",
      "tick"
    ],
    "stateChanges": [
      "treasury",
      "food",
      "manpower",
      "loyalty"
    ],
    "tests": [
      "test/recovery.test.js",
      "tools/systems-smoke.mjs"
    ],
    "saveLoad": true,
    "scenarios": "Roman",
    "production": "Public campaign",
    "limitations": [],
    "status": "NOT TESTED"
  },
  {
    "id": "trade",
    "name": "Trade / 贸易",
    "owner": "han/silk-road.js",
    "dependencies": [
      "han/engine.js"
    ],
    "ui": "Han > Silk Road",
    "actions": [
      "advanceSilk"
    ],
    "stateChanges": [
      "inventory",
      "treasury",
      "trade routes"
    ],
    "tests": [
      "test/han-technical.test.js",
      "tools/trade-intelligence-smoke.mjs"
    ],
    "saveLoad": true,
    "scenarios": "Han",
    "production": "Public campaign",
    "limitations": [],
    "status": "NOT TESTED"
  },
  {
    "id": "research",
    "name": "Research / 科技",
    "owner": "inventions.js",
    "dependencies": [
      "engine.js"
    ],
    "ui": "Inventions",
    "actions": [
      "startResearch",
      "equipIdea"
    ],
    "stateChanges": [
      "research progress",
      "modifiers"
    ],
    "tests": [
      "test/inventions.test.js",
      "tools/imperium-smoke.mjs"
    ],
    "saveLoad": true,
    "scenarios": "Roman",
    "production": "Public campaign",
    "limitations": [],
    "status": "NOT TESTED"
  },
  {
    "id": "focus",
    "name": "National focus / 国策",
    "owner": "imperium-ui.js",
    "dependencies": [
      "engine.js"
    ],
    "ui": "National Strategy",
    "actions": [
      "focusPanel"
    ],
    "stateChanges": [
      "focus state",
      "modifiers"
    ],
    "tests": [
      "test/national-ideas.test.js",
      "tools/imperium-smoke.mjs"
    ],
    "saveLoad": true,
    "scenarios": "Roman",
    "production": "Public campaign",
    "limitations": [],
    "status": "NOT TESTED"
  },
  {
    "id": "map",
    "name": "Map / 地图",
    "owner": "map-lab/lab.js",
    "dependencies": [
      "data.js",
      "historical-territories.js"
    ],
    "ui": "Campaign map; terrain atlas",
    "actions": [
      "select region",
      "select army"
    ],
    "stateChanges": [
      "selection",
      "mode overlay",
      "ownership"
    ],
    "tests": [
      "test/map-foundation.test.js",
      "tools/merge-map-switch-smoke.mjs"
    ],
    "saveLoad": true,
    "scenarios": "Roman",
    "production": "Public campaign",
    "limitations": [],
    "status": "NOT TESTED"
  },
  {
    "id": "espionage",
    "name": "Intelligence / 情报",
    "owner": "character-system.js",
    "dependencies": [
      "visibility.js",
      "control-intelligence.js"
    ],
    "ui": "Faction and military panels",
    "actions": [
      "sendInquiry",
      "observeArmies"
    ],
    "stateChanges": [
      "reports",
      "confidence",
      "sightings"
    ],
    "tests": [
      "test/visibility.test.js",
      "tools/intelligence-partners-smoke.mjs"
    ],
    "saveLoad": true,
    "scenarios": "Roman",
    "production": "Public campaign",
    "limitations": [],
    "status": "NOT TESTED"
  },
  {
    "id": "mailbox",
    "name": "Mailbox / 来信",
    "owner": "epistulae.js",
    "dependencies": [
      "mail-ui.js"
    ],
    "ui": "Mailbox",
    "actions": [
      "replyToLetter",
      "markRead"
    ],
    "stateChanges": [
      "letters",
      "responses",
      "chronicle"
    ],
    "tests": [
      "test/epistulae.test.js",
      "tools/mail-privacy-smoke.mjs"
    ],
    "saveLoad": true,
    "scenarios": "Roman",
    "production": "Public campaign",
    "limitations": [],
    "status": "NOT TESTED"
  },
  {
    "id": "chronicle",
    "name": "Chronicle / 编年史",
    "owner": "chronicle.js",
    "dependencies": [
      "map-lab/chronicle-ui.js"
    ],
    "ui": "Chronicle",
    "actions": [
      "initializeChronicle",
      "syncChronicleDispatches"
    ],
    "stateChanges": [
      "entries",
      "annual reports"
    ],
    "tests": [
      "test/chronicle.test.js",
      "tools/chronicle-person-smoke.mjs"
    ],
    "saveLoad": true,
    "scenarios": "Roman",
    "production": "Public campaign",
    "limitations": [],
    "status": "NOT TESTED"
  },
  {
    "id": "construction",
    "name": "Construction / 建造",
    "owner": "engine.js",
    "dependencies": [
      "data.js"
    ],
    "ui": "Territory actions",
    "actions": [
      "queueConstruction",
      "tick"
    ],
    "stateChanges": [
      "queue",
      "buildings",
      "resources"
    ],
    "tests": [
      "test/map-foundation.test.js",
      "tools/construction-smoke.mjs"
    ],
    "saveLoad": true,
    "scenarios": "Roman",
    "production": "Public campaign",
    "limitations": [],
    "status": "NOT TESTED"
  },
  {
    "id": "han",
    "name": "Han campaign / 汉朝战役",
    "owner": "han/engine.js",
    "dependencies": [
      "han/dynasty.js",
      "han/court.js"
    ],
    "ui": "Han campaign",
    "actions": [
      "newHanGame",
      "tick"
    ],
    "stateChanges": [
      "court",
      "frontier",
      "resources"
    ],
    "tests": [
      "test/han-dynasty.test.js",
      "tools/han-court-smoke.mjs"
    ],
    "saveLoad": true,
    "scenarios": "Han",
    "production": "Public campaign",
    "limitations": [],
    "status": "NOT TESTED"
  },
  {
    "id": "central-asia",
    "name": "Central Asia / 中亚",
    "owner": "han/engine.js",
    "dependencies": [
      "han/eurasia-data.js",
      "han/frontier.js"
    ],
    "ui": "Han world map",
    "actions": [
      "advanceFrontier",
      "tick"
    ],
    "stateChanges": [
      "wars",
      "relations",
      "territories"
    ],
    "tests": [
      "test/han-strategic.test.js",
      "tools/han-court-smoke.mjs"
    ],
    "saveLoad": true,
    "scenarios": "Han",
    "production": "Public campaign",
    "limitations": [],
    "status": "NOT TESTED"
  },
  {
    "id": "achievements",
    "name": "Legacy / 罗马遗产",
    "owner": "legacy.js",
    "dependencies": [
      "chronicle.js"
    ],
    "ui": "Legacy of Rome",
    "actions": [
      "finalizeCampaign"
    ],
    "stateChanges": [
      "archive",
      "major outcomes"
    ],
    "tests": [
      "test/chessboard-achievements.test.js",
      "tools/legacy-identity-smoke.mjs"
    ],
    "saveLoad": true,
    "scenarios": "Roman",
    "production": "Public campaign",
    "limitations": [],
    "status": "NOT TESTED"
  },
  {
    "id": "tutorial",
    "name": "Tutorial / 教学",
    "owner": "map-lab/tutorial.js",
    "dependencies": [
      "experience.js"
    ],
    "ui": "Campaign start; atlas guide",
    "actions": [
      "createTutorial",
      "recordExperience"
    ],
    "stateChanges": [
      "guided progress"
    ],
    "tests": [
      "test/tutorial-progress.test.js",
      "tools/onboarding-smoke.mjs"
    ],
    "saveLoad": true,
    "scenarios": "Roman",
    "production": "Public campaign",
    "limitations": [],
    "status": "NOT TESTED"
  },
  {
    "id": "poki",
    "name": "Poki integration / 平台接入",
    "owner": "poki-bridge.js",
    "dependencies": [
      "scripts/build-poki.mjs"
    ],
    "ui": "Poki package only",
    "actions": [
      "SDK lifecycle",
      "offline atlas"
    ],
    "stateChanges": [
      "event stream",
      "clean package"
    ],
    "tests": [
      "tools/poki-build-smoke.mjs"
    ],
    "saveLoad": true,
    "scenarios": "Poki package",
    "production": "Poki package",
    "limitations": [
      "Requires validated offline package and platform Inspector review"
    ],
    "status": "NOT TESTED"
  }
]);
export function featureStatus(feature,results={}){
 const observed=feature.tests.map(test=>results[test]).filter(Boolean);
 if(!observed.length)return 'NOT TESTED';
 if(observed.some(result=>result.status==='FAIL'))return 'FAIL';
 if(observed.some(result=>result.status==='BLOCKED'))return 'BLOCKED';
 if(observed.length<feature.tests.length)return 'PARTIAL';
 if(observed.some(result=>result.status!=='PASS'))return 'PARTIAL';
 return 'PASS';
}
