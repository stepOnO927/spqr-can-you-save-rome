import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(process.env.SPQR_STATIC_ROOT||path.dirname(fileURLToPath(import.meta.url)));
const port=Number(process.env.PORT||5173);
const mime={'.jpg':'image/jpeg','.png':'image/png','.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8'};
const publicRoot=new Set([
  "agreement-negotiations.js", "agreements.js", "analytics-core.js", "analytics-settings.js", "analytics.js", "app.js",

  "attack-forecast.js", "battle-plans.js", "campaign-date.js", "character-system.js", "characters.js", "chessboard-ui.js",

  "chessboard.js", "chronicle.js", "civil-war.js", "coalition-negotiations.js", "coalitions.js", "command-appointments.js",

  "conspiracies.js", "control-intelligence.js", "cursus-honorum.js", "data.js", "difficulty.js", "diplomatic-knowledge.js",

  "dynasties.js", "engine.js", "epistulae-personnel.js", "epistulae.js", "experience-ui.js", "experience.css",

  "experience.js", "feather.js", "feature-registry.js", "frontier-response.js", "genealogy-personal-actions.js", "genealogy-ui.js",

  "governance.js", "historical-reference.js", "historical-territories.js", "history-wheels.js", "identity.js", "imperium-focus-data.js",

  "imperium-ui.js", "imperium.css", "index.html", "inspector-diagnostics.js", "inspector-ui.js", "inspector.css",

  "inspector.html", "inventions.js", "land.js", "legacy.js", "legion-designer.js", "mail-reports.js",

  "mail-ui.js", "mail.css", "map.js", "movement-help.js", "movements.js", "multipolar.js",

  "national-focus.js", "national-ideas.js", "office-system.js", "person-knowledge.js", "personal-diplomacy.js", "personal-plans.js",

  "poki-bridge.js", "political-contacts.js", "political-memory.js", "portrait-registry.js", "religion.js", "republican-roads.js",

  "rivers.js", "rome60.js", "safe-storage.js", "save-transfer.css", "save-transfer.js", "scenarios.js",

  "storage-guard.js", "strategic-aid-ui.js", "strategic-planning.js", "strategic-warnings.js", "style.css", "version-ui.js",

  "view-handoff.js", "visibility.js", "warning-ledger.js", "MAP_SOURCES.md", "release.json"
]);
const publicHan=new Set([
  "ambitions.js", "court.js", "data.js", "dependencies.js", "dynasty.js", "east-ui.js",

  "engine.js", "eurasia-data.js", "experience-ui.js", "experience.css", "experience.js", "focus.js",

  "frontier.js", "geography.js", "han-map.css", "index.html", "map.js", "military.js",

  "people.js", "play.css", "play.js", "silk-road.js", "util.js", "world.js"
]);
const publicLab=new Set([
  "authority-view.js", "capture-wait.js", "character-ui.js", "chronicle-ui.js", "cursus-ui.js", "identity-knowledge.js",

  "index.html", "intelligence-summary.js", "invention-ui.js", "lab.css", "lab.js", "leader-layout.js",

  "local-governor-ui.js", "mediation-ui.js", "offices-ui.js", "personnel.js", "poki-style.js", "satisfaction-map.js",

  "security-ui.js", "territory-facts.js", "turn-report.js", "tutorial.js", "SOURCES.md"
]);
const publicVendor=new Set(['vendor/maplibre-gl.js','vendor/maplibre-gl-worker.js','vendor/maplibre-gl.css']);

export function publicPathname(requestUrl){
  const pathname=decodeURIComponent(new URL(requestUrl,'http://localhost').pathname);
  if(pathname==='/')return '/index.html';
  if(pathname==='/han/'||pathname==='/map-lab/')return pathname+'index.html';
  const name=pathname.slice(1);
  if(publicRoot.has(name))return pathname;
  if(name.startsWith('han/')&&publicHan.has(name.slice(4)))return pathname;
  if(name.startsWith('map-lab/')&&publicLab.has(name.slice(8)))return pathname;
  if(publicVendor.has(name))return pathname;
  if(name==='assets/portraits/SOURCES.md')return pathname;
  if(/^assets\/portraits\/[a-z0-9-]+\.(?:jpg|png)$/.test(name))return pathname;
  return null;
}

export function createGameServer(){
  return http.createServer((req,res)=>{
    let pathname;
    try{pathname=publicPathname(req.url)}catch{res.writeHead(400);res.end('Bad request');return}
    if(new URL(req.url,'http://localhost').pathname==='/han'){res.writeHead(308,{Location:'/han/'});res.end();return}
    if(new URL(req.url,'http://localhost').pathname==='/map-lab'){res.writeHead(308,{Location:'/map-lab/'});res.end();return}
    if(!pathname){res.writeHead(404);res.end('Not found');return}
    const target=path.join(root,pathname.slice(1));
    fs.realpath(target,(realErr,realTarget)=>{
      if(realErr||!realTarget.startsWith(root+path.sep)){res.writeHead(404);res.end('Not found');return}
      fs.readFile(realTarget,(err,data)=>{
        if(err){res.writeHead(404);res.end('Not found');return}
        let body=data;
        if(path.extname(realTarget)==='.html'){
          const html=data.toString('utf8').replace(/<script\b[^>]*cloudflareinsights\.com[^>]*>\s*<\/script>/gi,'');
          const marker='<script>window.__SPQR_TEST_MODE={kind:"local_preview"}</script>';
          body=Buffer.from(html.replace(/<head([^>]*)>/i,'<head$1>'+marker));
        }
        res.writeHead(200,{'Content-Type':mime[path.extname(realTarget)]||'application/octet-stream','Cache-Control':'no-cache'});
        res.end(body);
      });
    });
  });
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const server=createGameServer();
  server.listen(port,()=>console.log(`SPQR local: http://localhost:${server.address().port}`));
}
