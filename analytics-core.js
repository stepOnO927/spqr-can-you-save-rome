// Pure session accounting. All elapsed time comes from a monotonic clock.
export const ANALYTICS_IDLE_MS=60000;

export class SessionMeter{
 constructor({now=()=>performance.now(),idleMs=ANALYTICS_IDLE_MS,visible=true,focused=true}={}){
  this.now=now;this.idleMs=idleMs;this.last=now();this.opened=this.last;
  this.visible=visible;this.focused=focused;this.running=false;this.lastActivity=-Infinity;
  this.pageMs=0;this.foregroundMs=0;this.activeMs=0;this.actions=0;
 }
 flush(){
  const next=Math.max(this.last,Number(this.now())||this.last),elapsed=next-this.last;
  this.pageMs+=elapsed;
  if(this.visible&&this.focused){
   this.foregroundMs+=elapsed;
   if(this.running&&Number.isFinite(this.lastActivity)){
    this.activeMs+=Math.max(0,Math.min(next,this.lastActivity+this.idleMs)-this.last);
   }
  }
  this.last=next;
  return this;
 }
 setForeground(visible,focused){this.flush();this.visible=!!visible;this.focused=!!focused;return this}
 setRunning(running){this.flush();const starting=!!running&&!this.running;this.running=!!running;if(starting)this.lastActivity=this.last;return this}
 touch(){this.flush();if(this.running&&this.visible&&this.focused)this.lastActivity=this.last;return this}
 activity(){this.flush();if(this.running&&this.visible&&this.focused){this.lastActivity=this.last;this.actions++}return this}
 snapshot(){this.flush();return {pageMs:Math.round(this.pageMs),foregroundMs:Math.round(this.foregroundMs),activeMs:Math.round(this.activeMs),actions:this.actions,running:this.running}}
}

export function releaseChannel(hostname,pathname='',poki=false,hostnames={}){
 if(poki)return 'poki';
 if(/^(localhost|127\.0\.0\.1|\[::1\])$/i.test(hostname))return 'local_preview';
 const host=String(hostname||'').toLowerCase();
 if(hostnames.production?.some(name=>String(name).toLowerCase()===host))return 'production';
 if(hostnames.staging?.some(name=>String(name).toLowerCase()===host))return 'staging';
 // The project apex is production; branch and hash subdomains are previews.
 // A future custom domain is added to the exact-match lists above.
 if(/^[a-z0-9-]+\.pages\.dev$/i.test(host))return 'production';
 if(/^[a-z0-9-]+\.[a-z0-9-]+\.pages\.dev$/i.test(host))return 'staging';
 if(hostname==='stepono927.github.io'&&pathname.startsWith('/spqr-public-release-staging/'))return 'staging';
 if(hostname==='stepono927.github.io'&&pathname.startsWith('/spqr-can-you-save-rome/'))return 'production';
 return 'development_preview';
}

export function classifySession({knownTest=false,activeMs=0,actions=0,signals=[]}={}){
 if(knownTest)return {category:'known_development_test',confidence:1,reasons:['explicit_ci_test_mode']};
 const unique=[...new Set(signals.filter(x=>['webdriver','rapid_actions','impossible_event_rate','scripted_timing'].includes(x)))];
 if(unique.length>=2)return {category:'likely_automation',confidence:Math.min(.9,.55+unique.length*.1),reasons:unique};
 if(activeMs>=120000&&actions>=3)return {category:'engaged_gameplay_session',confidence:.7,reasons:['active_time_and_game_actions']};
 return {category:'unknown',confidence:0,reasons:unique};
}

