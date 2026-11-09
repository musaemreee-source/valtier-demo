
/* VALTIER local demo: no remote database, authentication or payment processing. */
const extraTabs = {crm:"Müşteriler",catalog:"Hizmetler",stock:"Stok",staff:"Personel",reports:"Raporlar",settings:"Demo ve Yedek"};
for(const [id,label] of Object.entries(extraTabs)){
 const b=document.createElement("button"); b.id="n-"+id;b.textContent=label;b.onclick=()=>tab(id);document.querySelector("nav").append(b);
 const s=document.createElement("section");s.id=id;document.querySelector("main").append(s);
}
document.querySelector(".demo").textContent="TEK SALON • BU TARAYICIYA ÖZEL DEMO";
document.querySelector("header").insertAdjacentHTML("beforeend",'<p class="muted">Veriler bu cihazda saklanır. Gerçek ödeme, otomatik mesaj ve cihazlar arası eşitleme yoktur.</p><a class="contact" href="https://wa.me/905367302596" target="_blank" rel="noopener noreferrer">Salon WhatsApp · +90 536 730 25 96</a>');
const v2key="valtier_demo_v2";
let loadError="";
try{
 const stored=localStorage.getItem(v2key);
 if(stored){const parsed=JSON.parse(stored);if(parsed.version!==2||!Array.isArray(parsed.jobs)||!Array.isArray(parsed.customers)||!Array.isArray(parsed.services)||!Array.isArray(parsed.staff)||!Array.isArray(parsed.stock))throw Error("Geçersiz kayıt");db=parsed;}
}catch(e){loadError="Kayıt okunamadı. Mevcut kayıt üzerine yazılmayacak; yedek indirip kontrol edin.";}
function uid(){return crypto.randomUUID();}
const stamp=()=>new Date().toISOString();
const localDate=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
if(db.version!==2){
 db.version=2;db.customers=[];db.services=services.map((s,i)=>({id:i,name:s[0],price:s[1],duration:s[2],active:true,stockId:"",units:0}));
 db.staff=names.map((name,i)=>({id:i,name,active:true,commission:40}));
 db.stock=[{id:"shampoo",name:"Şampuan (doz)",qty:100,min:10},{id:"blade",name:"Tek kullanımlık jilet",qty:100,min:20},{id:"mask",name:"Bakım maskesi",qty:30,min:5}];
 db.movements=[];db.expenses=[];
 db.jobs.forEach(j=>{
 let c=j.phone&&db.customers.find(c=>c.phone===j.phone);
 if(!c){c={id:uid(),name:j.name,phone:j.phone||"",notes:""};db.customers.push(c);}
 j.customerId=c.id;j.serviceName=services[j.service]?.[0]||"Eski hizmet";j.chair=j.worker;j.commission=40;
 if(j.status==="paid"){j.paidAt=null;j.legacyPayment=true;}
 });
}
db.movements??=[];db.expenses??=[];
let simulation=false, realDb=null;
const originalRender=render;
function syncCatalog(){
 names.splice(0,names.length,...db.staff.map(s=>s.name));
 services.splice(0,services.length,...db.services.map(s=>[s.name,s.price,s.duration]));
 const prev=$("service").value,worker=$("worker").value;
 $("service").innerHTML=db.services.filter(s=>s.active).map(s=>'<option value="'+s.id+'">'+esc(s.name)+' · '+money(s.price)+' · '+s.duration+' dk</option>').join("");
 $("worker").innerHTML=db.staff.filter(s=>s.active).map(s=>'<option value="'+s.id+'">'+esc(s.name)+'</option>').join("");
 if([...$("service").options].some(o=>o.value===prev))$("service").value=prev;
 if([...$("worker").options].some(o=>o.value===worker))$("worker").value=worker;
}
const banner=document.createElement("p");banner.id="notice";banner.setAttribute("role","status");document.querySelector("main").prepend(banner);
function notice(s){banner.textContent=s;}
save=function(){
 if(loadError){notice(loadError);return;}
 if(!simulation){try{localStorage.setItem(v2key,JSON.stringify(db));}catch(e){notice("Kayıt cihazda saklanamadı. Verilerinizi yedek indirin.");}}
 render();
};
const opts=(items,value="id",label="name")=>items.map(x=>'<option value="'+esc(x[value])+'">'+esc(x[label])+'</option>').join("");
const field=(label,id,type="text",value="")=>'<label for="'+id+'">'+label+'</label><input id="'+id+'" type="'+type+'" value="'+esc(value)+'">';
const select=(label,id,options)=>'<label for="'+id+'">'+label+'</label><select id="'+id+'">'+options+'</select>';
const card=(title,body)=>'<div class="card"><h3>'+title+'</h3>'+body+'</div>';
const empty=s=>'<p class="muted">'+s+'</p>';
function number(id,min=0,max=1e9){const raw=$(id).value;const n=Number(raw);if(raw===""||!Number.isFinite(n)||n<min||n>max)throw Error("Geçerli bir sayısal değer girin.");return n;}
function attempt(fn){try{fn();}catch(e){notice(e.message);}}
function customer(name,phone){
 let c=phone&&db.customers.find(c=>c.phone===phone);
 if(!c){c={id:uid(),name,phone,notes:""};db.customers.push(c);}
 return c;
}
function validSlot(worker,date,duration,exclude){
 const start=new Date(date).getTime();if(!Number.isFinite(start))throw Error("Geçerli tarih seçin.");
 if(!db.staff[worker]?.active)throw Error("Personel izinli veya pasif.");
 if(db.jobs.some(j=>j.id!==exclude&&j.worker===worker&&!["cancelled","noshow"].includes(j.status)&&start<new Date(j.date).getTime()+j.duration*60000&&start+duration*60000>new Date(j.date).getTime()))throw Error("Bu berberin seçilen sürede başka randevusu var.");
}
createJob=function(name,phone,service,worker,date,walkin=false){
 const s=db.services[service];if(!s?.active)throw Error("Aktif bir hizmet seçin.");
 if(!name.trim())throw Error("Müşteri adı gereklidir.");
 validSlot(worker,date,s.duration);
 const c=customer(name.trim(),phone.trim());
 const j={id:db.next++,name:c.name,phone:c.phone,customerId:c.id,service,serviceName:s.name,worker,chair:worker,date,price:s.price,duration:s.duration,status:walkin?"arrived":"booked",commission:db.staff[worker].commission,createdAt:stamp(),usage:s.stockId?{id:s.stockId,units:s.units}:null,simulation};
 db.jobs.push(j);save();return j;
};
addBooking=function(){attempt(()=>{
 createJob($("customer").value,$("phone").value,Number($("service").value),Number($("worker").value),$("date").value,$("walkin").checked);
 $("customer").value="";$("phone").value="";tab("reception");notice("Müşteri kaydı ve randevu oluşturuldu.");
});};
$("date").insertAdjacentHTML("afterend",'<label class="check"><input type="checkbox" id="walkin"> Randevusuz müşteri / salonda bekliyor</label>');
$("customer").setAttribute("list","customerNames");$("customer").insertAdjacentHTML("afterend",'<datalist id="customerNames"></datalist>');
$("customer").addEventListener("change",()=>{const c=db.customers.find(c=>c.name===$("customer").value);if(c)$("phone").value=c.phone;});
document.querySelectorAll("label").forEach(l=>{if(!l.htmlFor&&l.nextElementSibling?.id)l.htmlFor=l.nextElementSibling.id;});
change=function(id,status){attempt(()=>{
 const j=db.jobs.find(x=>x.id===id);if(!j)throw Error("Kayıt bulunamadı.");
 const allowed={booked:["arrived","cancelled","noshow"],arrived:["active","cancelled"],active:["finished"]};
 if(!allowed[j.status]?.includes(status))throw Error("Bu durum geçişi yapılamaz.");
 if(status==="active"){
 if(!db.staff[j.worker]?.active)throw Error("Personel izinli. Resepsiyondan yeniden atayın.");
 if(db.jobs.some(x=>x.id!==id&&x.status==="active"&&(x.worker===j.worker||x.chair===j.chair)))throw Error("Berber veya koltuk şu anda dolu.");
 if(j.usage){const stock=db.stock.find(s=>s.id===j.usage.id);if(!stock||stock.qty<j.usage.units)throw Error("Hizmet için stok yetersiz.");
 stock.qty-=j.usage.units;db.movements.push({id:uid(),at:stamp(),stockId:stock.id,qty:-j.usage.units,reason:"#"+j.id+" hizmet tüketimi"});}
 j.startedAt=stamp();
 }
 if(status==="finished")j.finishedAt=stamp();
 j.status=status;save();
});};
function reschedule(id){const j=db.jobs.find(j=>j.id===id);if(!j||!["booked","arrived"].includes(j.status))return;
 openDialog("Randevu düzenle",field("Tarih ve saat","editdate","datetime-local",j.date)+select("Berber","editworker",opts(db.staff.filter(s=>s.active)))+select("Koltuk","editchair",Array.from({length:10},(_,i)=>'<option value="'+i+'">Koltuk '+(i+1)+'</option>').join("")),()=>{
 const worker=Number($("editworker").value);validSlot(worker,$("editdate").value,j.duration,j.id);
 j.date=$("editdate").value;j.worker=worker;j.chair=Number($("editchair").value);j.commission=db.staff[worker].commission;save();
 });$("editworker").value=j.worker;$("editchair").value=j.chair;
}
const dialog=document.createElement("dialog");document.body.append(dialog);
function openDialog(title,body,submit){
 dialog.innerHTML='<form method="dialog"><h2>'+title+'</h2>'+body+'<p class="error" role="alert"></p><div class="actions"><button value="cancel" formnovalidate>Vazgeç</button><button type="button" class="primary" id="dialogSave">Kaydet</button></div></form>';
 $("dialogSave").onclick=()=>{try{submit();dialog.close();}catch(e){dialog.querySelector(".error").textContent=e.message;}};
 dialog.showModal();
}
pay=function(id){const j=db.jobs.find(j=>j.id===id);if(!j||j.status!=="finished")return;
 openDialog("Demo tahsilatı · "+esc(j.name),'<p>Hizmet: '+money(j.price)+'</p>'+field("İndirim (₺)","discount","number",0)+select("Ödeme yöntemi","method",'<option>Nakit</option><option>Kart</option><option>Havale</option>')+'<p class="muted">Yalnızca demo kaydıdır; kartınızdan para çekilmez, mali fiş değildir.</p>',()=>{
 if(j.status!=="finished")throw Error("Bu işlem zaten tahsil edilmiş.");
 j.discount=number("discount",0,j.price);j.total=Math.round((j.price-j.discount)*100)/100;j.method=$("method").value;j.paidAt=stamp();j.status="paid";save();
 });
};
function refund(id){const j=db.jobs.find(j=>j.id===id);if(j?.status!=="paid")return;
 openDialog("Demo iade",field("İade gerekçesi","reason"),()=>{if(!$("reason").value.trim())throw Error("Gerekçe girin.");j.refundReason=$("reason").value.trim();j.status="refunded";j.refundedAt=stamp();save();});
}
const collected=j=>j.total??j.price;
const detail=j=>db.staff[j.worker]?.name+" · "+(j.serviceName||services[j.service]?.[0])+" · "+money(j.price)+" · "+j.date.replace("T"," ");
const oldStatus=jobStatus;jobStatus=s=>({noshow:"Gelmedi",refunded:"İade edildi"})[s]||oldStatus(s);
function jobRows(jobs,actions=()=>""){return jobs.map(j=>item(j.name,detail(j)+" · "+jobStatus(j.status),actions(j))).join("")||empty("Bu listede kayıt yok.");}
function editCustomer(id){
 const c=db.customers.find(c=>c.id===id);
 openDialog("Müşteri kartı",field("Ad soyad","cname","text",c.name)+field("Telefon","cphone","tel",c.phone)+field("Tercihler / not","cnotes","text",c.notes),()=>{
 if(!$("cname").value.trim())throw Error("Ad gerekli.");c.name=$("cname").value.trim();c.phone=$("cphone").value.trim();c.notes=$("cnotes").value.trim();save();});
}
function editService(id){
 const s=db.services[id]||{name:"",price:0,duration:30,active:true,stockId:"",units:0};
 openDialog("Hizmet düzenle",field("Hizmet adı","sname","text",s.name)+field("Ücret (₺)","sprice","number",s.price)+field("Süre (dakika)","sduration","number",s.duration)+select("Tüketilen ürün","sstock",'<option value="">Stok tüketmez</option>'+opts(db.stock))+field("Hizmet başına tüketim","sunits","number",s.units),()=>{
 if(!$("sname").value.trim())throw Error("Hizmet adı gerekli.");
 const stockId=$("sstock").value,units=number("sunits",0);
 if(stockId&&units<=0)throw Error("Tüketim sıfırdan büyük olmalı.");
 const next={...s,id:id??db.services.length,name:$("sname").value.trim(),price:number("sprice"),duration:number("sduration",1,480),stockId,units};
 if(id===undefined)db.services.push(next);else db.services[id]=next;save();
 });$("sstock").value=s.stockId;
}
function toggleService(id){db.services[id].active=!db.services[id].active;save();}
function editStaff(id){
 const s=db.staff[id];
 openDialog("Personel · Koltuk "+(id+1),field("Ad soyad","wname","text",s.name)+field("Prim oranı (%)","wrate","number",s.commission)+select("Çalışma durumu","wactive",'<option value="1">Aktif</option><option value="0">İzinli / pasif</option>'),()=>{
 if(!$("wname").value.trim())throw Error("Ad gerekli.");
 const active=$("wactive").value==="1";
 if(!active&&db.jobs.some(j=>j.worker===id&&j.status==="active"))throw Error("Devam eden hizmeti tamamlayın.");
 s.name=$("wname").value.trim();s.commission=number("wrate",0,100);s.active=active;save();
 });$("wactive").value=s.active?"1":"0";
}
function stockMove(id){
 const s=db.stock.find(s=>s.id===id);
 openDialog("Stok hareketi · "+esc(s.name),field("Miktar (+ giriş / - çıkış)","qty","number",1)+field("Gerekçe","why"),()=>{
 const qty=number("qty",-1e6,1e6);if(!qty||s.qty+qty<0)throw Error("Stok negatif olamaz; sıfır hareket girilemez.");if(!$("why").value.trim())throw Error("Gerekçe gerekli.");
 s.qty+=qty;db.movements.push({id:uid(),at:stamp(),stockId:id,qty,reason:$("why").value.trim()});save();
 });
}
function addStock(){openDialog("Yeni stok",field("Ürün adı","pname")+field("Başlangıç miktarı","pqty","number",0)+field("Kritik seviye","pmin","number",5),()=>{
 if(!$("pname").value.trim())throw Error("Ürün adı gerekli.");db.stock.push({id:uid(),name:$("pname").value.trim(),qty:number("pqty"),min:number("pmin")});save();
});}
function expense(){openDialog("Demo gider kaydı",field("Açıklama","ename")+field("Tutar (₺)","eamount","number",0),()=>{
 if(!$("ename").value.trim())throw Error("Açıklama gerekli.");db.expenses.push({id:uid(),name:$("ename").value.trim(),amount:number("eamount",0.01),at:stamp()});save();
});}
function download(name,data,type="application/json"){const a=document.createElement("a");const url=URL.createObjectURL(new Blob([data],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function backup(){download("valtier-"+new Date().toISOString().slice(0,10)+".json",JSON.stringify(db,null,2));}
function exportReport(){
 const rows=[["İşlem","Müşteri","Hizmet","Durum","Tahsilat","Ödeme zamanı"],...db.jobs.map(j=>[j.id,j.name,j.serviceName,j.status,["paid","refunded"].includes(j.status)?collected(j):0,j.paidAt||""])];
 const cell=v=>'"'+String(v).replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
 download("valtier-rapor.csv","\ufeff"+rows.map(r=>r.map(cell).join(";")).join("\r\n"),"text/csv;charset=utf-8");
}
demo=function(){
 if(simulation){notice("Simülasyon zaten açık.");return;}
 realDb=db;db=JSON.parse(JSON.stringify(db));db.jobs=[];db.customers=[];db.movements=[];db.expenses=[];db.next=1;simulation=true;
 db.staff.forEach(s=>s.active=true);db.stock.forEach(s=>s.qty=Math.max(s.qty,100));
 const activeService=db.services.find(s=>s.active);if(!activeService){db.services[0].active=true;}
 for(let i=0;i<6;i++)createJob(["Ahmet Yılmaz","Murat Demir","Serkan Kaya","Ömer Arslan","Mustafa Çelik","Can Yıldız"][i],"",db.services.find(s=>s.active).id,i,localDate(),i<4);
 change(1,"active");change(2,"active");change(2,"finished");tab("seats");notice("Simülasyon açık. Denemeler normal kayıtlarınıza yazılmaz.");
};
function stopDemo(){if(!simulation)return;db=realDb;realDb=null;simulation=false;render();notice("Simülasyon kapatıldı. Normal kayıtlarınıza dönüldü.");}
function renderCRM(query=""){
 const list=db.customers.filter(c=>(c.name+" "+c.phone).toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")));
 $("crmList").innerHTML=list.map(c=>{
 const history=db.jobs.filter(j=>j.customerId===c.id),paid=history.filter(j=>j.status==="paid");
 return card(esc(c.name),'<p>'+esc(c.phone||"Telefon yok")+' · '+paid.length+' ziyaret · '+money(paid.reduce((a,j)=>a+collected(j),0))+'</p><p>'+esc(c.notes)+'</p>'+btn("Kartı düzenle","editCustomer(\'"+c.id+"\')")+'<details><summary>İşlem geçmişi ('+history.length+')</summary>'+jobRows(history)+'</details>');
 }).join("")||empty("Müşteri bulunamadı.");
}
function dateKey(iso){return iso?new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Istanbul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(iso)):"";}
function report(){
 const from=$("reportFrom").value,to=$("reportTo").value;if(from>to){$("reportBody").textContent="Başlangıç tarihi bitişten sonra olamaz.";return;}
 const inside=d=>d&&dateKey(d)>=from&&dateKey(d)<=to;
 const paid=db.jobs.filter(j=>["paid","refunded"].includes(j.status)&&inside(j.paidAt));
 const refunded=db.jobs.filter(j=>j.status==="refunded"&&inside(j.refundedAt));
 const gross=paid.reduce((a,j)=>a+collected(j),0),returns=refunded.reduce((a,j)=>a+collected(j),0),costs=db.expenses.filter(e=>inside(e.at)).reduce((a,e)=>a+e.amount,0);
 $("reportBody").innerHTML=card("Dönem özeti",'<p>Tahsilat: '+money(gross)+' · İade: '+money(returns)+' · Gider: '+money(costs)+'</p><p>Net kasa hareketi: <b>'+money(gross-returns-costs)+'</b></p><small>Prim, vergi ve maliyetler düşülmüş kâr değildir. Eski sürümün tarihsiz tahsilatları dönem raporuna alınmaz.</small>')+card("Personel performansı",db.staff.map(s=>{
 const jobs=paid.filter(j=>j.worker===s.id),rev=jobs.reduce((a,j)=>a+collected(j),0),refunds=refunded.filter(j=>j.worker===s.id);
 const commission=jobs.reduce((a,j)=>a+collected(j)*(j.commission||0)/100,0)-refunds.reduce((a,j)=>a+collected(j)*(j.commission||0)/100,0);
 return item(s.name,jobs.length+" tahsilat · "+money(rev)+" · Net demo prim "+money(commission));
 }).join(""))+card("Ödeme yöntemleri",["Nakit","Kart","Havale"].map(m=>item(m,money(paid.filter(j=>j.method?.toLowerCase()===m.toLowerCase()).reduce((a,j)=>a+collected(j),0)))).join(""));
}
render=function(){
 syncCatalog();originalRender();
 $("customerNames").innerHTML=db.customers.map(c=>'<option value="'+esc(c.name)+'">').join("");
 $("s5").textContent=money(db.jobs.filter(j=>j.status==="paid").reduce((a,j)=>a+collected(j),0));$("cashsum").textContent=$("s5").textContent;
 $("s1").textContent=db.jobs.filter(j=>j.status==="booked").length;
 $("seatgrid").innerHTML=Array.from({length:10},(_,i)=>{const j=db.jobs.find(j=>j.status==="active"&&j.chair===i);return '<div class="card seat '+(j?"busy":"")+'"><strong>'+String(i+1).padStart(2,"0")+'</strong><span>'+(j?"İşlemde":"Müsait")+'</span><small>'+esc(j?j.name+" · "+db.staff[j.worker].name:"Koltuk hazır")+'</small>'+(j?'<p>'+esc(j.serviceName)+'</p>'+btn("Tamamla","change("+j.id+",\'finished\')"):"")+'</div>';}).join("");
 $("s4").textContent=10-new Set(db.jobs.filter(j=>j.status==="active").map(j=>j.chair)).size;
 $("booklist").innerHTML=jobRows([...db.jobs].sort((a,b)=>a.date.localeCompare(b.date)),j=>["booked","arrived"].includes(j.status)?btn("Düzenle","reschedule("+j.id+")")+btn("İptal","change("+j.id+",\'cancelled\')"):"");
 $("receplist").innerHTML=jobRows(db.jobs.filter(j=>j.status==="booked"),j=>btn("Müşteri geldi","change("+j.id+",\'arrived\')")+btn("Gelmedi","change("+j.id+",\'noshow\')")+btn("Düzenle","reschedule("+j.id+")"));
 $("barberlist").innerHTML=jobRows(db.jobs.filter(j=>["arrived","active"].includes(j.status)),j=>j.status==="arrived"?btn("Başlat","change("+j.id+",\'active\')")+btn("Atamayı düzenle","reschedule("+j.id+")"):btn("Tamamla","change("+j.id+",\'finished\')"));
 $("cashlist").innerHTML=jobRows(db.jobs.filter(j=>j.status==="finished"),j=>btn("Demo tahsilatı","pay("+j.id+")"));
 $("paidlist").innerHTML=jobRows(db.jobs.filter(j=>["paid","refunded"].includes(j.status)),j=>'<span>'+money(collected(j))+' · '+esc(j.method)+'</span>'+(j.status==="paid"?btn("İade","refund("+j.id+")"):""));
 $("crm").innerHTML='<h2>Müşteri ilişkileri</h2>'+field("Ad veya telefon ile ara","crmSearch")+'<div id="crmList"></div>';$("crmSearch").oninput=e=>renderCRM(e.target.value);renderCRM();
 $("catalog").innerHTML='<h2>Hizmetler ve bakım</h2><p class="muted">Fiyat değişiklikleri yeni randevulara uygulanır. Önceden alınan fiyat ve tüketim bilgisi korunur.</p>'+btn("Yeni hizmet","editService()")+db.services.map(s=>item(s.name,money(s.price)+" · "+s.duration+" dk · "+(s.active?"Aktif":"Pasif")+(s.stockId?" · "+s.units+" birim stok tüketimi":""),btn("Düzenle","editService("+s.id+")")+btn(s.active?"Pasife al":"Etkinleştir","toggleService("+s.id+")"))).join("");
 $("staff").innerHTML='<h2>Personel</h2><p class="muted">10 personel profili. Durum ve prim oranı yeni işlemlere uygulanır. Bu ekran erişim yetkilendirmesi değildir.</p>'+db.staff.map(s=>item(s.name,(s.active?"Aktif":"İzinli / pasif")+" · %"+s.commission+" demo prim",btn("Düzenle","editStaff("+s.id+")"))).join("");
 $("stock").innerHTML='<h2>Stok ve tüketim</h2>'+btn("Yeni ürün","addStock()")+db.stock.map(s=>item(s.name,s.qty+" birim · Eşik "+s.min+(s.qty<=s.min?" · KRİTİK STOK":""),btn("Giriş / çıkış","stockMove(\'"+s.id+"\')"))).join("")+card("Hareket geçmişi",db.movements.slice().reverse().map(m=>item(db.stock.find(s=>s.id===m.stockId)?.name||"Ürün",m.qty+" · "+m.reason+" · "+new Date(m.at).toLocaleString("tr-TR"))).join("")||empty("Henüz hareket yok."));
 $("reports").innerHTML='<h2>Raporlar</h2>'+field("Başlangıç","reportFrom","date",dateKey(stamp()))+field("Bitiş","reportTo","date",dateKey(stamp()))+btn("Raporu göster","report()")+btn("Tüm işlemleri CSV indir","exportReport()")+btn("Gider ekle","expense()")+'<div id="reportBody"></div>'+card("Giderler",db.expenses.map(e=>item(e.name,money(e.amount)+" · "+dateKey(e.at))).join("")||empty("Gider yok."));report();
 $("settings").innerHTML='<h2>Demo ve veriler</h2>'+card("Çalışma biçimi",'<p>'+(simulation?"Simülasyon açık: ayrı, geçici örnek veriler.":"Normal demo: yalnızca bu tarayıcıda kayıt.")+'</p><p>GitHub Pages sürümünde sunucu, kullanıcı hesabı, rol güvenliği, otomatik WhatsApp/SMS, gerçek POS veya e-fatura entegrasyonu bulunmaz. Gerçek müşteri bilgileri yerine örnek veriler kullanın.</p>'+btn("Simülasyonu başlat","demo()")+btn("Simülasyondan çık","stopDemo()"))+card("Yerel yedek",'<p>JSON yedek tüm yerel kayıtları içerir. CSV rapor Excel ile açılabilir.</p>'+btn("JSON yedek indir","backup()")+btn("CSV rapor indir","exportReport()"))+card("Salon iletişim",'<a class="contact" href="https://wa.me/905367302596" target="_blank" rel="noopener noreferrer">WhatsApp sohbetini aç</a><p>+90 536 730 25 96 · Mesajı WhatsApp üzerinden siz gönderirsiniz.</p>');
 if(simulation)notice("SİMÜLASYON AÇIK — örnek kayıtlar, normal veriler değişmez.");
 if(loadError)notice(loadError);
};
window.addEventListener("storage",e=>{if(e.key===v2key) {loadError="Başka sekmede kayıt değişti. Çakışmayı önlemek için bu sayfayı yenileyin.";notice(loadError);}});
syncCatalog();render();
