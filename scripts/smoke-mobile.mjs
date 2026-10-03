import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root=process.cwd();
const mime={'.css':'text/css; charset=utf-8','.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url||'/', 'http://127.0.0.1');
    const requested=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
    const file=path.resolve(root,'.'+requested);
    const rel=path.relative(root,file);
    if(rel.startsWith('..')||path.isAbsolute(rel)){res.writeHead(403).end();return;}
    const body=await readFile(file);
    res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(body);
  }catch{res.writeHead(404).end('Not found');}
});
let browser=null,context=null;
try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();
  const base='http://127.0.0.1:'+address.port+'/';
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block'});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.stack||e.message));

  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#gate-stage-start',{state:'visible',timeout:15000});
  await page.evaluate(()=>{generateCode=()=> '390844';});
  await page.locator('#cadetName').fill('Mobile Glitch Smoke');
  await page.locator('#gateBtn').click();
  await page.waitForSelector('#gate-stage-showcode',{state:'visible',timeout:15000});
  await page.evaluate(()=>{State.serviceForce=null;});
  await page.locator('#gate-stage-showcode .gate-btn').click();
  await page.waitForSelector('#serviceForcePicker[data-mode="onboarding"]',{state:'visible',timeout:15000});
  await page.locator('#serviceForcePicker .service-force-option[data-force="army"]').click();
  await page.waitForFunction(()=>document.getElementById('gate')?.classList.contains('hide'),null,{timeout:15000});

  await page.waitForFunction(()=>(
    document.getElementById('viTour')?.classList.contains('open') ||
    document.getElementById('vaaniMentor')?.classList.contains('open') ||
    (typeof State!=='undefined' && window.VAANI_LATEST_FEATURE_RELEASE?.version && State.infoTourVersion===window.VAANI_LATEST_FEATURE_RELEASE.version)
  ),null,{timeout:8000});
  if(await page.locator('#viTour.open').count()||await page.locator('#vaaniMentor.open').count()){
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.getElementById('viTour')?.classList.contains('open')&&!document.getElementById('vaaniMentor')?.classList.contains('open'),null,{timeout:5000});
  }

  const overflow=async label=>{
    const m=await page.evaluate(()=>({w:document.documentElement.clientWidth,sw:document.documentElement.scrollWidth}));
    assert.ok(m.sw<=m.w+1,label+' introduced horizontal overflow: '+JSON.stringify(m));
  };

  assert.equal(await page.locator('#bottomNav button').count(),5,'Mobile primary nav must contain five buttons');
  assert.equal(await page.locator('#quickNavBtn').evaluate(el=>getComputedStyle(el).display),'none','Legacy quick-nav must stay out of the mobile surface');
  assert.equal(await page.locator('#bottomNav button').filter({hasText:'More'}).count(),1,'More button is missing');

  // Verify the current dashboard command rooms.
  assert.ok(await page.locator('#mobileRoomSwitcher').count(),'Dashboard room switcher is missing');
  assert.ok(await page.locator('#mobileRoomSwitcher .mrs-tab').count()>=4,'Dashboard command rooms are incomplete');
  await page.locator('#mobileRoomSwitcher .mrs-tab').filter({hasText:'Progress'}).click();
  await page.waitForTimeout(100);
  assert.equal(await page.locator('#view-dashboard .vd-roadmap').evaluate(el=>el.closest('.card')?.classList.contains('mobile-room-hidden')),false,'Progress room did not expose roadmap');
  await page.locator('#mobileRoomSwitcher .mrs-tab').filter({hasText:'Practice'}).click();
  await page.waitForTimeout(100);
  assert.equal(await page.locator('#view-dashboard [aria-label="XP Arcade"]').evaluate(el=>el.classList.contains('mobile-room-hidden')),false,'Practice room did not expose XP Arcade');
  await page.locator('#mobileRoomSwitcher .mrs-tab').filter({hasText:'Mission'}).click();

  // More menu: modern grid must render and direct navigation must work.
  const openMore=async()=>{if(await page.locator('#moreSheet.show').count())await page.evaluate(()=>closeMoreSheet());await page.locator('#bottomNav button').filter({hasText:'More'}).click();await page.waitForSelector('#moreSheet.show');};
  const go=async(label,view)=>{
    await openMore();
    const modern=page.locator('#sheetBody .mobile-more-item').filter({hasText:label}).first();
    if(await modern.count()) await modern.click(); else await page.locator('#sheetBody .sheet-menu-item').filter({hasText:label}).click();
    await page.waitForFunction(v=>document.getElementById('view-'+v)?.classList.contains('active'),view);
    await overflow(label);
  };

  await go('Grammar','grammar');
  await assert.ok?.catch?.(()=>{}); // no-op to keep the test readable in old Node/Playwright runners
  await go('90-Day Vocab','vocab90');
  assert.ok(await page.locator('#mobileRoomSwitcher .mrs-tab').count()>=2,'Vocab90 mobile rooms were not built');
  await go('PYQ Vault','pyq');
  await go('Arena','games');
  await go('Profile','profile');
  await go('Leaderboard','leaderboard');
  await go('Notifications','notifications');
  await go('Book Reading','books');
  await go('VAANI Guide','info');

  assert.deepEqual(errors,[],'Mobile smoke found page errors: '+errors.join('\n'));
  console.log('Mobile smoke passed: command rooms, More navigation, no overflow and page-error checks.');
}finally{
  await context?.close();
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
