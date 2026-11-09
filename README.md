# VALTIER — Tek salon yönetim demosu

GitHub Pages üzerinde derleme gerektirmeden çalışan Türkçe uygulama. index.html, app.js ve enhancements.css aynı klasörde tutulmalıdır.

## İş akışı
Randevu oluştur → Resepsiyonda karşıla → Berber hizmeti başlat/tamamla → Kasada demo tahsilatı. Tarih/personel/koltuk yeniden ataması, iptal ve gelmedi durumları desteklenir. Dolu koltuk veya personel, randevu çakışması ve yetersiz stok engellenir.

## Modüller
- 10 koltuk; 10 düzenlenebilir personel profili, aktif/izinli durumu ve yeni işlemlerde prim oranı.
- 13 başlangıç hizmeti: saç, sakal, yıkama, boya, cilt bakımı, kaş, burun/kulak, ağda, manikür, pedikür, damat ve VIP bakım. Yeni hizmet, fiyat, süre ve stok tüketimi düzenlenebilir.
- Telefon eşleşmesiyle müşteri kartı, notlar, ziyaret ve harcama geçmişi.
- Stok giriş/çıkış, kritik seviye, bir kez hizmet tüketimi ve hareket geçmişi.
- İndirim, nakit/kart/havale demo tahsilatı, gerekçeli tam iade ve giderler.
- Tarih aralığına göre tahsilat, iade, gider, ödeme yöntemi ve personel prim raporu. Raporlar Europe/Istanbul tarihini kullanır; net kasa hareketi muhasebe kârı değildir.
- Ayrı geçici simülasyon: normal kayıtlar değişmez; çıkışta veya yenilemede normal verilere dönülür.
- JSON yedek indirme ve CSV dışa aktarma. JSON geri yükleme arayüzü bu sürümde yoktur.
- Salon WhatsApp: +90 536 730 25 96. Kullanıcı sohbeti açıp mesajı kendisi gönderir.
- Mobil uyumlu yerleşim, etiketli alanlar ve odak göstergeleri.

## Demo sınırları
Veriler sadece bu tarayıcının localStorage alanındadır. Örnek veri kullanın. Sunucu, oturum açma, rol güvenliği, cihazlar arası eşitleme, otomatik WhatsApp/SMS, gerçek ödeme/POS veya e-fatura bulunmaz. Randevu saatleri cihazın yerel saatine göre yorumlanır.

Eski valtier_demo_v1 verileri silinmez. İlk yeni kayıt işleminde yeni yapı valtier_demo_v2 anahtarına yazılır. Eski tahsilatlarda ödeme zamanı olmadığı için dönem raporuna dahil edilmez. İade tüketilmiş malzemeyi stoka geri eklemez. Fiyat, süre, prim ve tüketim bilgileri rezervasyon anında sabitlenir.

## Test ve yayın
Node.js 22+ ile npm install ve npm test. Testler jsdom üzerinde açılış, 10 koltuk, randevu çakışması, uçtan uca işlem, indirim, tekrar ödeme, CRM, dolu personel, stok tüketimi/yetersizliği, iade, simülasyon izolasyonu, 12 ekran, yeniden yükleme ve eski veri aktarımını kapsar. Görsel tarayıcı testi yerine geçmez.

GitHub Pages mevcut main / kök klasör ayarıyla çalışır. Node paketleri sadece test içindir. Üretimde dış CDN bağımlılığı yoktur.
