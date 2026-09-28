import fs from 'node:fs/promises';

const DATA_FILE = 'data/defence-notifications.json';
const USER_AGENT = 'VAANI-Defence-Notification-Bot/1.0 (+https://harshiiiit-bh.github.io/vaanii/)';
const MAX_PER_SOURCE = 80;

const sources = [
  { name:'UPSC — Active Examinations', url:'https://www.upsc.gov.in/examinations/active-examinations', categories:['NDA','CDS','CAPF'] },
  { name:'UPSC — Forthcoming Examinations', url:'https://www.upsc.gov.in/examinations/forthcoming-examinations', categories:['NDA','CDS','CAPF'] },
  { name:'UPSC — Examination Notifications', url:'https://www.upsc.gov.in/exams-related-info/exam-notification', categories:['NDA','CDS','CAPF'] },
  { name:'UPSC — Notification Archives', url:'https://www.upsc.gov.in/exams-related-info/exam-notification/archives', categories:['NDA','CDS','CAPF'] },
  { name:'Indian Air Force — AFCAT', url:'https://afcat.edcil.co.in/', categories:['AFCAT'] },
  { name:'Indian Army — Join Indian Army', url:'https://joinindianarmy.nic.in/', categories:['AGNIVEER','ARMY_RALLY'] },
  { name:'Indian Navy — Join Indian Navy', url:'https://www.joinindiannavy.gov.in/', categories:['AGNIVEER','NAVY'] },
  { name:'Agniveervayu', url:'https://agnipathvayu.cdac.in/', categories:['AGNIVEER','AIR_FORCE'] },
  { name:'BSF Recruitment', url:'https://rectt.bsf.gov.in/', categories:['BSF'] },
  { name:'CRPF Recruitment', url:'https://rect.crpf.gov.in/', categories:['CRPF'] },
  { name:'SSC — Constable GD', url:'https://ssc.gov.in/', categories:['BSF','CRPF','CISF','ITBP','SSB','ASSAM_RIFLES'] },
  { name:'Indian Coast Guard', url:'https://joinindiancoastguard.cdac.in/', categories:['COAST_GUARD'] }
];

const relevant = /(nda|national defence academy|naval academy|cds|combined defence services|afcat|air force common admission|capf|central armed police|agniveer|agniveervayu|agniveer vayu|recruitment rally|rally bharti|army recruitment|indian army|indian navy|navy recruitment|bsf|border security force|crpf|central reserve police|cisf|itbp|indo tibetan|ssb|assam rifles|coast guard|admit card|notification|advertisement|recruitment)/i;
const dateRx = /\b(?:0?[1-9]|[12]\d|3[01])[./-](?:0?[1-9]|1[0-2])[./-](?:20\d{2})\b|\b(?:20\d{2})-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b/g;

function stripHtml(html){
  return html
    .replace(/<script[\\s\\S]*?<\\/script>/gi,' ')
    .replace(/<style[\\s\\S]*?<\\/style>/gi,' ')
    .replace(/<!--[\\s\\S]*?-->/g,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&#39;/g,"'")
    .replace(/&quot;/gi,'"')
    .replace(/\\s+/g,' ')
    .trim();
}

function normalizeUrl(href, base){
  try {
    const u = new URL(href, base);
    if (!/^https?:$/.test(u.protocol)) return null;
    u.hash = '';
    return u.href;
  } catch { return null; }
}

function categoryFor(text, fallback){
  const s = text.toLowerCase();
  if (/afcat|air force common admission/.test(s)) return 'AFCAT';
  if (/central armed police|capf/.test(s)) return 'CAPF';
  if (/combined defence services|\\bcds\\b/.test(s)) return 'CDS';
  if (/national defence academy|\\bnda\\b/.test(s)) return 'NDA';
  if (/agniveer vayu|agniveervayu|air force agniveer/.test(s)) return 'AGNIVEER';
  if (/agniveer|join indian navy|navy recruitment/.test(s)) return 'AGNIVEER';
  if (/recruitment rally|rally bharti|army recruitment|join indian army/.test(s)) return 'ARMY_RALLY';
  if (/border security force|\\bbsf\\b/.test(s)) return 'BSF';
  if (/central reserve police|\\bcrpf\\b/.test(s)) return 'CRPF';
  if (/central industrial security|\\bcisf\\b/.test(s)) return 'CISF';
  if (/indo[- ]tibetan|\\bitbp\\b/.test(s)) return 'ITBP';
  if (/sashastra seema bal|\\bssb\\b/.test(s)) return 'SSB';
  if (/assam rifles/.test(s)) return 'ASSAM_RIFLES';
  if (/coast guard/.test(s)) return 'COAST_GUARD';
  return fallback[0] || 'DEFENCE';
}

function statusFor(text){
  const s=text.toLowerCase();
  if (/result|final result|merit list/.test(s)) return 'result';
  if (/admit card|e-admit|hall ticket/.test(s)) return 'admit-card';
  if (/answer key/.test(s)) return 'answer-key';
  if (/recruitment|notification|advertisement|application|apply online|vacancy|rally/.test(s)) return 'notification';
  return 'update';
}

function titleFromAnchor(text){
  return text.replace(/\\s+/g,' ').replace(/^(click here|view|download)\\s*[:|-]?\\s*/i,'').trim().slice(0,180);
}

function makeId(title,url){
  return (title+'|'+url).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,110);
}

async function fetchSource(source){
  const res=await fetch(source.url,{headers:{'user-agent':USER_AGENT,'accept':'text/html,application/xhtml+xml'},redirect:'follow'});
  if(!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const html=await res.text();
  const matches=[...html.matchAll(/<a\\b[^>]*href=["']([^"']+)["'][^>]*>([\\s\\S]*?)<\\/a>/gi)];
  const out=[];
  for(const m of matches){
    if(out.length>=MAX_PER_SOURCE) break;
    const label=stripHtml(m[2]);
    const href=normalizeUrl(m[1],source.url);
    if(!href || label.length<3) continue;
    const context=label+' '+href;
    if(!relevant.test(context)) continue;
    out.push({label:titleFromAnchor(label),url:href,context:context.slice(0,900)});
  }
  return {out,checkedAt:new Date().toISOString(),text:stripHtml(html).slice(0,12000)};
}

function inferDates(context){
  const dates=[...context.matchAll(dateRx)].map(x=>x[0]);
  return dates.slice(0,4);
}

async function main(){
  let existing={version:1,generatedAt:null,source:'VAANI Defence Notification Engine',items:[]};
  try { existing=JSON.parse(await fs.readFile(DATA_FILE,'utf8')); } catch {}
  const byKey=new Map(existing.items.map(x=>[x.id,x]));
  const runLog=[];

  for(const source of sources){
    try{
      const result=await fetchSource(source);
      runLog.push({source:source.name,ok:true,found:result.out.length});
      for(const hit of result.out){
        const combined=hit.label+' '+hit.url+' '+hit.context;
        const category=categoryFor(combined,source.categories);
        const id=makeId(hit.label,hit.url);
        const dates=inferDates(hit.context);
        const prev=byKey.get(id);
        byKey.set(id,{
          ...(prev||{}),
          id,
          title:hit.label,
          organization:source.name.split(' — ')[0],
          category,
          type:statusFor(combined),
          status:statusFor(combined),
          ...(dates[0]&&!prev?.notificationDate?{notificationDate:dates[0]}:{}),
          url:hit.url,
          sourceUrl:source.url,
          sourceName:source.name,
          official:true,
          firstSeen:prev?.firstSeen||new Date().toISOString(),
          lastSeen:new Date().toISOString(),
          summary:prev?.summary||'Automatically discovered from the organisation\'s public source page. Open the official source and verify the complete notice before applying.'
        });
      }
    }catch(error){
      runLog.push({source:source.name,ok:false,error:String(error.message||error)});
    }
  }

  const items=[...byKey.values()]
    .filter(x=>x.title && x.url)
    .sort((a,b)=>String(b.lastSeen||b.firstSeen).localeCompare(String(a.lastSeen||a.firstSeen)));

  const output={version:1,generatedAt:new Date().toISOString(),source:'VAANI Defence Notification Engine',checkedSources:runLog,items};
  await fs.writeFile(DATA_FILE,JSON.stringify(output,null,2)+'\\n');
  console.log(JSON.stringify({generatedAt:output.generatedAt,items:items.length,runLog},null,2));

  const successful=runLog.filter(x=>x.ok).length;
  if(successful===0) throw new Error('All notification sources failed; refusing to publish a blank refresh.');
}

main().catch(error=>{console.error(error);process.exit(1);});
