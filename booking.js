"use strict";
const catalog=[
["Saç Kesimi",500,30,"Klasik veya modern; tarzınıza uygun kesim.","cut"],
["Sakal Tıraşı",250,20,"Sakalınıza özenli şekillendirme ve son dokunuş.","beard"],
["Saç + Sakal",700,50,"Birbirini tamamlayan, bütünlüklü bir görünüm.","cut"],
["Saç Yıkama",150,15,"Saçınız için ferah bir başlangıç.","care"],
["Saç Boyama",900,60,"Renk değişimi ve yenilenme.","care"],
["Cilt Bakımı",650,45,"Kendinize ayırdığınız bir bakım molası.","care"],
["Kaş Düzenleme",200,15,"Görünümünüzü tamamlayan küçük bir detay.","care"],
["Burun/Kulak Tüy Temizliği",200,15,"Detaylarda özenli bakım.","care"],
["Ağda Bakımı",350,30,"Pürüzsüz bir görünüm için bakım.","care"],
["Manikür",500,40,"Elleriniz için düzenli bakım.","care"],
["Pedikür",650,50,"Ayaklarınız için bakım zamanı.","care"],
["Damat Tıraşı",1800,90,"Özel gününüze özel bir hazırlık.","beard"],
["VIP Bakım Paketi",2500,120,"Kapsamlı bakım; paket içeriğini salonla netleştirin.","care"]
];
const el=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(n);
const selected=new Set();let currentStep=0;
function today(){return new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Istanbul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
function clearError(){el("formError").textContent="";document.querySelectorAll('[aria-invalid="true"]').forEach(e=>e.removeAttribute("aria-invalid"));}
function error(message,id){el("formError").textContent=message;if(id){el(id).setAttribute("aria-invalid","true");el(id).focus();}else el("formError").focus();return false;}
function phone(){return el("guestPhone").value.replace(/[\s()+.\-]/g,"");}
function validate(step){
 if(step===0&&!selected.size)return error("Devam etmek için en az bir hizmet seçin.");
 if(step===1){
  const day=el("day").value,time=el("time").value;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||day<today())return error("Bugün veya ileri bir tarih seçin.","day");
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return error("Tercih ettiğiniz saati seçin.","time");
  const when=new Date(day+"T"+time+":00+03:00").getTime();
  if(!Number.isFinite(when)||when<=Date.now())return error("Geçmiş bir saat seçilemez. Daha ileri bir zaman belirtin.","time");
 }
 if(step===2){
  if(el("guestName").value.trim().length<2)return error("Adınızı soyadınızı girin.","guestName");
  if(!/^\d{10,15}$/.test(phone()))return error("Telefon numaranızı alan koduyla birlikte kontrol edin.","guestPhone");
 }
 return true;
}
function summary(){
 el("chosenServices").replaceChildren();
 if(!selected.size){const p=document.createElement("p");p.className="summary-empty";p.textContent="Seçtiğiniz hizmetler burada görünecek.";el("chosenServices").append(p);}
 let total=0,duration=0;
 for(const id of selected){const s=catalog[id];total+=s[1];duration+=s[2];const row=document.createElement("div");row.className="summary-service";const name=document.createElement("span"),cost=document.createElement("span");name.textContent=s[0];cost.textContent=money(s[1]);row.append(name,cost);el("chosenServices").append(row);}
 el("priceTotal").textContent=selected.size?money(total):"—";el("durationTotal").textContent=selected.size?duration+" dk":"—";
 el("stepHint").textContent=selected.size?selected.size+" hizmet · "+duration+" dk":"Hizmetinizi seçerek başlayın";
}
function requestData(){return {name:el("guestName").value.trim(),phone:el("guestPhone").value.trim(),day:el("day").value,time:el("time").value,barber:el("barber").value||"Fark etmez",note:el("guestNote").value.trim(),services:[...selected].map(id=>catalog[id])};}
function review(){
 const data=requestData(),total=data.services.reduce((a,s)=>a+s[1],0),duration=data.services.reduce((a,s)=>a+s[2],0);
 const date=new Intl.DateTimeFormat("tr-TR",{dateStyle:"long",timeZone:"Europe/Istanbul"}).format(new Date(data.day+"T12:00:00+03:00"));
 const pairs=[["Hizmetler",data.services.map(s=>s[0]).join(", ")],["Tercih edilen zaman",date+" · "+data.time+" (Türkiye saati)"],["Berber",data.barber],["Ad soyad",data.name],["Telefon",data.phone],["Örnek ücret / süre",money(total)+" · "+duration+" dk"]];
 if(data.note)pairs.push(["Not",data.note]);
 el("review").replaceChildren();for(const [label,value] of pairs){const row=document.createElement("div"),small=document.createElement("small"),b=document.createElement("span");small.textContent=label;b.textContent=value;row.append(small,b);el("review").append(row);}
 const message=["Merhaba VALTIER, randevu talebim var.","","Ad soyad: "+data.name,"Telefon: "+data.phone,"Hizmetler: "+data.services.map(s=>s[0]).join(", "),"Tercih edilen gün: "+date,"Tercih edilen saat: "+data.time+" (Türkiye saati)","Berber tercihi: "+data.barber,"Tanıtımda görülen örnek toplam: "+money(total),"Tahmini süre: "+duration+" dk",data.note?"Not: "+data.note:"","","Müsaitliği ve güncel ücreti teyit eder misiniz? Randevumun salon onayıyla kesinleşeceğini biliyorum."].filter(x=>x!==undefined).join("\n");
 el("sendWhatsApp").href="https://wa.me/905367302596?text="+encodeURIComponent(message);
}
function showStep(step){
 currentStep=step;clearError();document.querySelectorAll(".step").forEach((s,i)=>{s.hidden=i!==step;});
 document.querySelectorAll(".steps li").forEach((s,i)=>{s.classList.toggle("done",i<step);if(i===step)s.setAttribute("aria-current","step");else s.removeAttribute("aria-current");});
 el("backButton").hidden=step===0;el("nextButton").hidden=step===3;el("stepHint").hidden=step===3;
 if(step===3)review();
 document.querySelector('[data-step="'+step+'"] h2').focus({preventScroll:true});
}
el("day").min=today();
const icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="m12 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3z"/></svg>';
catalog.forEach((s,id)=>{const label=document.createElement("label");label.className="service-choice";label.innerHTML='<input type="checkbox" value="'+id+'"><span class="service-icon">'+icon+'</span><span class="service-info"><b>'+s[0]+'</b><small>'+s[3]+'</small><span>'+s[2]+' dk</span></span><span class="service-price">'+money(s[1])+'<span class="checkmark">✓</span></span>';
 label.querySelector("input").addEventListener("change",e=>{if(e.target.checked)selected.add(id);else selected.delete(id);label.classList.toggle("selected",e.target.checked);clearError();summary();});el("serviceOptions").append(label);});
el("bookingForm").addEventListener("submit",e=>{e.preventDefault();clearError();if(currentStep<3&&validate(currentStep))showStep(currentStep+1);});
el("backButton").addEventListener("click",()=>showStep(Math.max(0,currentStep-1)));
el("sendWhatsApp").addEventListener("click",e=>{for(let i=0;i<3;i++){if(!validate(i)){e.preventDefault();const message=el("formError").textContent;showStep(i);error(message);return;}}review();});
summary();
