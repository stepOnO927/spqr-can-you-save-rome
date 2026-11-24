import {claimReward} from './legacy-core.js?v=38';

// An educational reading exercise. The exhibit and its dossier are modern
// interpretations, not surviving objects from Caesar's siege.
export const INQUIRY_STAGES=[
 {title:['What does the account establish?','记载能证明什么？'],text:['Caesar describes a brick tower built by his troops during the siege of Massilia in 49 BCE. Choose the claim the passage actually supports.','凯撒记载其部队在前49年马赛围城期间建造了一座砖塔。请选择这段史料真正支持的说法。'],choices:[
  {label:['The original tower survives intact in a museum','原塔完整保存于博物馆'],result:['The text describes a tower; it does not identify a surviving object.','文字记载了砖塔，但没有指认现存实物。'],score:0},
  {label:['Caesar reports a tower at this particular siege','凯撒记载了这次围城中的一座砖塔'],result:['A specific siege example is supported by the account.','这段记载支持一个具体围城案例。'],score:2},
  {label:['Brick construction was invented in 49 BCE','砖建筑在前49年才发明'],result:['A wartime example cannot establish the invention of brick.','战时案例不能证明砖材的发明年代。'],score:0}
 ]},
 {title:['Who is speaking?','谁在叙述？'],text:['The tower appears in Caesar’s account of operations under his legate Trebonius. How should the source be described?','砖塔见于凯撒对其副将特雷博尼乌斯围城行动的记述。应如何介绍这份史料？'],choices:[
  {label:['A participant-side narrative, useful but politically interested','参战一方的叙述，有价值但带有政治立场'],result:['The campaign account is contemporary and partisan; its limits belong on the label.','这是同时代但带有立场的战役叙述；说明牌应写明其局限。'],score:2},
  {label:['An independent archaeological survey of the tower','对这座砖塔的独立考古测绘'],result:['The linked passage is literary testimony, not an excavation report.','所引段落是文字证言，不是考古报告。'],score:0},
  {label:['A neutral transcript agreed by both armies','交战双方共同认可的中立记录'],result:['Caesar did not present both sides’ agreed record.','凯撒没有提供双方共同认可的记录。'],score:0}
 ]},
 {title:['Write the exhibit label','撰写展品说明'],text:['The Museum displays a newly drawn siege-tower model. Which label keeps the object and source distinct?','博物馆陈列一幅新绘制的攻城塔模型。哪种说明能区分模型与史料？'],choices:[
  {label:['Authentic tower from the siege, exactly as found','围城时的真实砖塔，按出土原貌复原'],result:['The model is modern and no excavated tower is identified here.','模型是现代创作，未指认出土砖塔。'],score:0},
  {label:['No tower existed because the drawing is new','绘图是新作，所以当时没有砖塔'],result:['A modern drawing does not invalidate the written account.','现代绘图不使文字记载失效。'],score:0},
  {label:['Modern interpretation based on Caesar’s partisan account','依据凯撒带有立场的记载所作的现代示意'],result:['This distinguishes the original account from the new artwork.','这区分了原始记载与新绘图。'],score:2}
 ]}
];
export const INQUIRY_REWARD=50;
export const INQUIRY_SOURCE={url:'https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Caesar/Civil_Wars/2A%2A.html',name:['Caesar, Civil Wars 2.8–10','凯撒《内战记》2.8—10']};
const stamp=()=>new Date().toISOString();
export function inquiryScore(answers){return answers.reduce((score,choice,index)=>score+(INQUIRY_STAGES[index]?.choices[choice]?.score||0),0)}
export function beginLibraryInquiry(profile){
 if(!profile.buildings?.includes('library')||profile.libraryInquiry?.status==='active')return {ok:false,reason:'unavailable'};
 profile.libraryInquiry={status:'active',stage:0,answers:[],openedAt:stamp()};
 return {ok:true,record:profile.libraryInquiry};
}
export function answerLibraryInquiry(profile,choice){
 const record=profile.libraryInquiry,stage=INQUIRY_STAGES[record?.stage];
 if(!profile.buildings?.includes('library')||record?.status!=='active'||!stage||!Number.isInteger(choice)||!stage.choices[choice])return {ok:false,reason:'unavailable'};
 record.answers.push(choice);record.stage++;
 if(record.stage<INQUIRY_STAGES.length)return {ok:true,complete:false,record};
 record.status='complete';record.completedAt=stamp();record.score=inquiryScore(record.answers);
 profile.libraryInquiryRuns=(profile.libraryInquiryRuns||0)+1;
 profile.libraryInquiryBest=Math.max(profile.libraryInquiryBest||0,record.score);
 const passed=record.score>=4;
 const awarded=passed&&claimReward(profile,'library:massilia-inquiry',INQUIRY_REWARD);
 record.coinsClaimed=awarded?INQUIRY_REWARD:0;
 if(passed){profile.collectibles||=[];if(!profile.collectibles.includes('massilia-source-dossier'))profile.collectibles.push('massilia-source-dossier')}
 return {ok:true,complete:true,passed,score:record.score,coins:record.coinsClaimed,record};
}
