// Optional private session store. Deploy only after binding a D1 database and setting secrets.
const events=new Set(['page_view','game_loaded','game_start','campaign_selected','country_selected','difficulty_selected','tutorial_started','tutorial_completed','tutorial_skipped','turn_advanced','army_order_issued','battle_completed','diplomatic_action','official_appointed','trade_completed','game_saved','campaign_victory','campaign_defeat']);
const channels=new Set(['production','staging']);
const token=/^[a-zA-Z0-9_.:-]{0,40}$/;
const integer=(value,max)=>Number.isSafeInteger(value)&&value>=0&&value<=max;
const clean=value=>typeof value==='string'&&token.test(value)?value:'';
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}});
const allowedOrigin=new Set(['https://stepono927.github.io']);
function cors(request){const origin=request.headers.get('Origin');return allowedOrigin.has(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{}}
function classify(record){
  const elapsed=Math.max(1,record.last_seen-record.first_seen);
  const signals=[];
  if(record.actions>0&&record.actions/elapsed>3)signals.push('impossible_action_rate');
  if(record.turns>=30&&elapsed<10000)signals.push('rapid_turns');
  if(signals.length>=2)return {category:'likely_automation',reasons:signals};
  if(record.active_ms>=120000&&record.actions>=3)return {category:'engaged_gameplay_session',reasons:['active_time_and_game_actions']};
  return {category:'unknown',reasons:signals};
}
async function collect(request,env){
  const headers=cors(request),origin=request.headers.get('Origin');
  if(!allowedOrigin.has(origin))return json({error:'origin'},403,headers);
  if(Number(request.headers.get('Content-Length')||0)>8192)return json({error:'size'},413,headers);
  let body;try{body=await request.json()}catch{return json({error:'json'},400,headers)}
  if(!body||typeof body!=='object'||!body.sessionId||!/^[-a-f0-9]{36}$/i.test(body.sessionId)||!channels.has(body.channel)||!integer(body.sequence,1000000)||body.sequence<1||!clean(body.releaseVersion)||typeof body.context!=='object'||!body.context||typeof body.totals!=='object'||!body.totals||!Array.isArray(body.events)||body.events.length>16)return json({error:'payload'},400,headers);
  const t=body.totals;
  if(!integer(t.pageMs,86400000)||!integer(t.foregroundMs,86400000)||!integer(t.activeMs,86400000)||!integer(t.actions,100000)||t.activeMs>t.foregroundMs||t.foregroundMs>t.pageMs||!integer(body.turns,100000))return json({error:'totals'},400,headers);
  const sanitized=[];
  for(const e of body.events){if(!e||!events.has(e.name)||typeof e.params!=='object'||!e.params)return json({error:'event'},400,headers);sanitized.push({name:e.name,campaign:clean(e.params.campaign),civilization:clean(e.params.civilization),difficulty:clean(e.params.difficulty)})}
  const now=Date.now(),current=await env.DB.prepare('SELECT * FROM sessions WHERE id=?').bind(body.sessionId).first();
  if(current&&(body.sequence<=current.last_sequence||now-current.last_seen<1000))return json({ok:true,ignored:true},200,headers);
  const first=current?.first_seen||now;
  // Client clocks are untrusted. Limit claimed durations to the server-observed span.
  const ceiling=now-first+5000;
  const page=Math.max(current?.page_ms||0,Math.min(t.pageMs,ceiling));
  const foreground=Math.max(current?.foreground_ms||0,Math.min(t.foregroundMs,page));
  const active=Math.max(current?.active_ms||0,Math.min(t.activeMs,foreground));
  const record={first_seen:first,last_seen:now,page_ms:page,foreground_ms:foreground,active_ms:active,actions:Math.max(current?.actions||0,t.actions),turns:Math.max(current?.turns||0,body.turns)};
  const classification=classify(record);
  const context=body.context;
  const binds=[body.sessionId,body.channel,clean(body.releaseVersion),first,now,body.sequence,page,foreground,active,record.actions,record.turns,body.gameStarted?1:0,body.tutorialCompleted?1:0,body.ended?1:0,clean(context.campaign),clean(context.civilization),clean(context.difficulty),classification.category,JSON.stringify(classification.reasons)];
  await env.DB.prepare('INSERT INTO sessions(id,channel,version,first_seen,last_seen,last_sequence,page_ms,foreground_ms,active_ms,actions,turns,game_started,tutorial_completed,ended,campaign,civilization,difficulty,classification,reasons) VALUES('+Array(19).fill('?').join(',')+') ON CONFLICT(id) DO UPDATE SET last_seen=excluded.last_seen,last_sequence=excluded.last_sequence,page_ms=excluded.page_ms,foreground_ms=excluded.foreground_ms,active_ms=excluded.active_ms,actions=excluded.actions,turns=excluded.turns,game_started=MAX(sessions.game_started,excluded.game_started),tutorial_completed=MAX(sessions.tutorial_completed,excluded.tutorial_completed),ended=MAX(sessions.ended,excluded.ended),classification=excluded.classification,reasons=excluded.reasons').bind(...binds).run();
  if(sanitized.length)await env.DB.batch(sanitized.map(e=>env.DB.prepare('INSERT INTO events(session_id,received_at,name,campaign,civilization,difficulty) VALUES(?,?,?,?,?,?)').bind(body.sessionId,now,e.name,e.campaign,e.civilization,e.difficulty)));
  return json({ok:true},200,headers);
}
async function dashboard(request,env,html=false){
  const auth=request.headers.get('Authorization')||'';
  let basic='';try{if(auth.startsWith('Basic '))basic=atob(auth.slice(6))}catch{}
  if(!env.ADMIN_TOKEN||!(auth==='Bearer '+env.ADMIN_TOKEN||basic==='admin:'+env.ADMIN_TOKEN))return new Response('Authentication required',{status:401,headers:{'WWW-Authenticate':'Basic realm="SPQR private analytics"','Cache-Control':'no-store'}});
  const url=new URL(request.url),days=Math.min(90,Math.max(1,Number(url.searchParams.get('days'))||7)),since=Date.now()-days*86400000;
  const [totals,channels,classes,eventsByName,recent,countries,difficulties,versions,medianRow,longest]=await Promise.all([
    env.DB.prepare('SELECT COUNT(*) sessions, SUM(game_started) starts, SUM(tutorial_completed) tutorial_completed, SUM(CASE WHEN actions=0 THEN 1 ELSE 0 END) no_gameplay, SUM(CASE WHEN active_ms>=120000 AND actions>=3 THEN 1 ELSE 0 END) engaged, AVG(page_ms) avg_page_ms, AVG(foreground_ms) avg_foreground_ms, AVG(active_ms) avg_active_ms FROM sessions WHERE last_seen>=?').bind(since).first(),
    env.DB.prepare('SELECT channel,COUNT(*) sessions FROM sessions WHERE last_seen>=? GROUP BY channel').bind(since).all(),
    env.DB.prepare('SELECT classification,COUNT(*) sessions FROM sessions WHERE last_seen>=? GROUP BY classification').bind(since).all(),
    env.DB.prepare('SELECT name,COUNT(*) count FROM events WHERE received_at>=? GROUP BY name').bind(since).all(),
    env.DB.prepare('SELECT id,channel,version,first_seen,last_seen,page_ms,foreground_ms,active_ms,actions,turns,game_started,tutorial_completed,classification,reasons FROM sessions WHERE last_seen>=? ORDER BY last_seen DESC LIMIT 100').bind(since).all(),
    env.DB.prepare('SELECT civilization,COUNT(*) count FROM sessions WHERE last_seen>=? AND game_started=1 AND civilization<>? GROUP BY civilization ORDER BY count DESC').bind(since,'').all(),
    env.DB.prepare('SELECT difficulty,COUNT(*) count FROM sessions WHERE last_seen>=? AND game_started=1 AND difficulty<>? GROUP BY difficulty ORDER BY count DESC').bind(since,'').all(),
    env.DB.prepare('SELECT channel,version,COUNT(*) count FROM sessions WHERE last_seen>=? GROUP BY channel,version ORDER BY count DESC').bind(since).all(),
    env.DB.prepare('WITH ranked AS (SELECT active_ms,ROW_NUMBER() OVER (ORDER BY active_ms) rn,COUNT(*) OVER () n FROM sessions WHERE last_seen>=?) SELECT AVG(active_ms) median_active_ms FROM ranked WHERE rn IN ((n+1)/2,(n+2)/2)').bind(since).first(),
    env.DB.prepare('SELECT id,channel,classification,active_ms,actions,turns FROM sessions WHERE last_seen>=? ORDER BY active_ms DESC LIMIT 20').bind(since).all()
  ]);
  const median=medianRow?.median_active_ms||0;
  const report={days,totals:{...totals,median_active_ms:median},channels:channels.results,classification:classes.results,events:eventsByName.results,countries:countries.results,difficulties:difficulties.results,versions:versions.results,longest:longest.results,recent:recent.results};
  if(!html)return json(report);
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const table=(title,rows)=>`<section><h2>${title}</h2><table><tbody>${rows.map(row=>'<tr>'+row.map(cell=>'<td>'+escape(cell)+'</td>').join('')+'</tr>').join('')}</tbody></table></section>`;
  const mins=ms=>(Number(ms||0)/60000).toFixed(1)+' min';
  const summary=table('Sessions / 会话',[
    ['Recorded visits',totals.sessions],['Game starts',totals.starts||0],['Mean active time',mins(totals.avg_active_ms)],['Median active time',mins(median)],['No gameplay',totals.no_gameplay||0],['Tutorial completion rate',totals.starts?Math.round(100*(totals.tutorial_completed||0)/totals.starts)+'%':'—'],['Engaged sessions',totals.engaged||0]
  ]);
  const page='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SPQR private analytics</title><style>body{font:16px/1.5 Georgia,serif;background:#192322;color:#efe2c6;max-width:1100px;margin:auto;padding:20px}h1,h2{color:#f0cf86}section{margin:24px 0}table{border-collapse:collapse;width:100%}td{border-bottom:1px solid #59615b;padding:6px 10px;overflow-wrap:anywhere}td:first-child{font-weight:bold}small{color:#c0b69e}</style><h1>SPQR private analytics</h1><small>Anonymous, opt-in sessions only · Last '+days+' days · Not a human identity count</small>'+summary+table('Classification',classes.results.map(x=>[x.classification,x.sessions]))+table('Build channels',channels.results.map(x=>[x.channel,x.sessions]))+table('Versions',versions.results.map(x=>[x.channel,x.version,x.count]))+table('Countries',countries.results.map(x=>[x.civilization,x.count]))+table('Difficulties',difficulties.results.map(x=>[x.difficulty,x.count]))+table('Gameplay events',eventsByName.results.map(x=>[x.name,x.count]))+table('Longest observed sessions',longest.results.map(x=>[x.id.slice(0,8),x.channel,x.classification,mins(x.active_ms),x.actions+' actions',x.turns+' turns']))+'</html>';
  return new Response(page,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"}});
}
export default {
 async fetch(request,env){const url=new URL(request.url);if(url.pathname==='/api/session'&&request.method==='OPTIONS')return new Response(null,{status:204,headers:{...cors(request),'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});if(url.pathname==='/api/session'&&request.method==='POST')return collect(request,env);if(url.pathname==='/admin/summary'&&request.method==='GET')return dashboard(request,env);if(url.pathname==='/admin'&&request.method==='GET')return dashboard(request,env,true);return json({error:'not_found'},404)},
 async scheduled(_event,env){const before=Date.now()-90*86400000;await env.DB.prepare('DELETE FROM events WHERE received_at<?').bind(before).run();await env.DB.prepare('DELETE FROM sessions WHERE last_seen<?').bind(before).run()}
};

