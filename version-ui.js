// Visible beta provenance on all three campaign entrances.
const style=document.createElement('style');
style.textContent=[
  '.spqr-version{position:fixed;left:10px;bottom:10px;z-index:9000;border:1px solid #a68e60;background:#1b2525e8;color:#ecdcb7;padding:5px 9px;font:12px Georgia,"SPQR CJK",serif;letter-spacing:.03em;cursor:pointer;box-shadow:0 2px 10px #0007}',
  '.spqr-version:focus-visible,.spqr-release-close:focus-visible,.spqr-release-privacy:focus-visible{outline:2px solid #f3cf7b;outline-offset:2px}',
  '.spqr-release-dialog{max-width:min(560px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;border:1px solid #a68e60;background:#192322;color:#efe2c6;padding:24px;box-shadow:0 8px 32px #0009;font:15px/1.5 Georgia,"SPQR CJK",serif}',
  '.spqr-release-dialog::backdrop{background:#080d0dc9}',
  '.spqr-release-dialog h2{margin:0 0 12px;color:#f0cf86}',
  '.spqr-release-dialog p{margin:7px 0;overflow-wrap:anywhere}',
  '.spqr-release-dialog ul{padding-left:22px}',
  '.spqr-release-close,.spqr-release-privacy{float:right;border:1px solid #a68e60;background:#2b3734;color:#efe2c6;padding:4px 9px;cursor:pointer}'
].join('\n');
document.head.append(style);
const badge=document.createElement('button');
badge.type='button';
badge.className='spqr-version';
badge.setAttribute('aria-haspopup','dialog');
const dialog=document.createElement('dialog');
dialog.className='spqr-release-dialog';
document.body.append(badge,dialog);
let release={channel:'development',gameVersion:'0.1.0',buildStatus:'development',changes:[]};
const root=/\/(?:map-lab|han)\/(?:index\.html)?$/.test(location.pathname)?'../':'./';
function chinese(){return document.documentElement.lang.toLowerCase().startsWith('zh')}
function label(en,zh){return chinese()?zh:en}
function value(name){return typeof release[name]==='string'?release[name]:''}
function draw(){
  const beta=value('channel')==='beta';
  const version=value('version')||value('gameVersion')||'0.1.0';
  badge.textContent=(beta?'β ':'')+'v'+version;
  badge.title=label('Version and release notes','版本与更新记录');
  badge.setAttribute('aria-label',badge.title);
}
badge.addEventListener('click',()=>{
  dialog.replaceChildren();
  const close=document.createElement('button');close.type='button';close.className='spqr-release-close';close.textContent=label('Close','关闭');close.addEventListener('click',()=>dialog.close());
  const title=document.createElement('h2');title.textContent=label('SPQR release notes','SPQR 更新记录');
  const version=document.createElement('p');version.textContent=label('Version: ','版本：')+(value('version')||value('gameVersion')||'0.1.0');
  const channel=document.createElement('p');channel.textContent=label('Channel: ','发布渠道：')+(value('channel')||'development');
  const status=document.createElement('p');status.textContent=label('Status: ','状态：')+(value('buildStatus')||'development');
  dialog.append(close,title,version,channel,status);
  const privacy=document.createElement('button');privacy.type='button';privacy.className='spqr-release-privacy';privacy.textContent=label('Privacy settings','隐私设置');privacy.addEventListener('click',()=>{dialog.close();window.dispatchEvent(new Event('spqr:privacy'))});dialog.append(privacy);
  if(value('sourceCommit')){const commit=document.createElement('p');commit.textContent=label('Source: ','源码：')+value('sourceCommit').slice(0,12);dialog.append(commit)}
  if(value('deployedAt')){const date=document.createElement('p');date.textContent=label('Published: ','发布时间：')+value('deployedAt');dialog.append(date)}
  const changes=Array.isArray(release.changes)?release.changes:[];
  if(changes.length){const heading=document.createElement('h3');heading.textContent=label('Latest changes','最近更新');const list=document.createElement('ul');for(const item of changes.slice(0,12)){const row=document.createElement('li');row.textContent=typeof item==='string'?item:(item&&typeof item==='object'?(chinese()?item.zh||item.en:item.en||item.zh)||'':'');if(row.textContent)list.append(row)}dialog.append(heading,list)}
  else{const empty=document.createElement('p');empty.textContent=label('Release notes will appear with a published beta.','公测版本发布后，这里会显示更新记录。');dialog.append(empty)}
  if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
});
draw();
new MutationObserver(draw).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
fetch(new URL(root+'release.json',location.href),{cache:'no-store'}).then(response=>{if(!response.ok)throw Error('Release metadata unavailable');return response.json()}).then(data=>{if(data&&typeof data==='object'){release=data;draw()}}).catch(()=>{});
