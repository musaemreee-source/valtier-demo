const fs = require('node:fs');
const assert = require('node:assert/strict');
let JSDOM;
try { ({JSDOM}=require('jsdom')); } catch { ({JSDOM}=require('../test-tools/node_modules/jsdom')); }
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const app=fs.readFileSync(__dirname+'/app.js','utf8');
function boot(seed={}) {
 const dom=new JSDOM(html,{url:'https://example.test/valtier-demo/',runScripts:'dangerously',beforeParse(w){
  w.alert=()=>{};w.confirm=()=>true;
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
  w.HTMLDialogElement.prototype.close=function(){this.open=false};
  for(const [k,v] of Object.entries(seed))w.localStorage.setItem(k,JSON.stringify(v));
 }});
 dom.window.eval(app);return dom;
}
const dom=boot(),w=dom.window,run=s=>w.eval(s),get=id=>w.document.getElementById(id);
assert.equal(get('seatgrid').children.length,10);
run(`createJob('Test','05550000000',0,0,'2027-01-01T10:00')`);
assert.throws(()=>run(`createJob('Çakışma','',0,0,'2027-01-01T10:15')`));
run(`change(1,'arrived');change(1,'active');change(1,'finished');pay(1)`);
get('discount').value=50;get('method').value='Kart';get('dialogSave').click();
let stored=JSON.parse(w.localStorage.getItem('valtier_demo_v2'));
assert.equal(stored.jobs[0].status,'paid');assert.equal(stored.jobs[0].total,450);
run('pay(1)');assert.equal(JSON.parse(w.localStorage.getItem('valtier_demo_v2')).jobs.length,1);
run(`createJob('Test','05550000000',0,1,'2027-01-01T11:00')`);
assert.equal(JSON.parse(w.localStorage.getItem('valtier_demo_v2')).customers.length,1);
run(`change(2,'arrived');change(2,'active');createJob('Diğer','',0,1,'2027-01-01T12:00');change(3,'arrived');change(3,'active')`);
stored=JSON.parse(w.localStorage.getItem('valtier_demo_v2'));
assert.equal(stored.jobs[2].status,'arrived');assert.match(get('notice').textContent,/dolu/);
run(`editService(0)`);get('sstock').value='blade';get('sunits').value=2;get('dialogSave').click();
run(`createJob('Stok','',0,2,'2027-01-01T13:00');change(4,'arrived');change(4,'active')`);
stored=JSON.parse(w.localStorage.getItem('valtier_demo_v2'));assert.equal(stored.stock.find(x=>x.id==='blade').qty,98);
run(`change(4,'active')`);assert.equal(JSON.parse(w.localStorage.getItem('valtier_demo_v2')).stock.find(x=>x.id==='blade').qty,98);
run(`stockMove('blade')`);get('qty').value=-98;get('why').value='Test çıkış';get('dialogSave').click();
run(`createJob('Stok yetersiz','',0,3,'2027-01-01T13:00');change(5,'arrived');change(5,'active')`);
assert.equal(JSON.parse(w.localStorage.getItem('valtier_demo_v2')).jobs[4].status,'arrived');
assert.match(get('notice').textContent,/stok yetersiz/);
run('refund(1)');get('reason').value='Test iade';get('dialogSave').click();
assert.equal(JSON.parse(w.localStorage.getItem('valtier_demo_v2')).jobs[0].status,'refunded');
const before=w.localStorage.getItem('valtier_demo_v2');run('demo()');assert.equal(w.localStorage.getItem('valtier_demo_v2'),before);run('stopDemo()');assert.equal(w.localStorage.getItem('valtier_demo_v2'),before);
for(const t of ['home','seats','booking','reception','barber','cash','crm','catalog','stock','staff','reports','settings']){run(`tab('${t}')`);assert.ok(get(t).classList.contains('show'));}
const restored=boot({'valtier_demo_v2':JSON.parse(before)});assert.equal(restored.window.document.getElementById('seatgrid').children.length,10);
const legacy=boot({'valtier_demo_v1':{jobs:[{id:1,name:'Eski müşteri',phone:'',service:0,worker:0,date:'2026-11-01T10:00',price:500,duration:30,status:'paid',method:'Kart'}],next:2}});
legacy.window.eval('save()');assert.equal(JSON.parse(legacy.window.localStorage.getItem('valtier_demo_v2')).jobs[0].legacyPayment,true);
assert.ok(w.document.querySelector('a[href="https://wa.me/905367302596"]'));
dom.window.close();restored.window.close();legacy.window.close();
console.log('PASS: 10 chairs, booking conflicts, complete workflow, discounts, double payment, CRM matching, busy barber, stock consumption, insufficient stock, refund, isolated simulation, 12 screens, reload, v1 migration, WhatsApp.');
