# Lemon Squeezy Kapanıyor: Türkiye'den Hangi Ödeme Altyapısına Geçmeli? (2026–2027 Geçiş Rehberi)

**Yazar:** Aykut Mayalı · **Son güncelleme:** 22 Kasım 2026  
**Açık kaynak tarayıcı ve adapter (`ls-exit`, MIT):** https://github.com/aykutmayali/ls-exit

> **Uyarı:** Bu yazı teknik ve operasyonel bilgileri resmi dokümanlardan derler; vergi, şirket türü (şahıs/limited/ABD LLC) veya muhasebe tavsiyesi değildir. Vergi yükümlülüklerinizi mutlaka kendi mali müşavirinizle netleştirin.

---

## Özet: Ne Oldu, Tarihler Neler?

16 Kasım 2026'da Lemon Squeezy kurucusu JR Farr, platformun kapatılacağını [resmen duyurdu](https://www.lemonsqueezy.com/blog/saying-goodbye-to-lemon-squeezy):

- **16 Kasım 2026:** Yeni mağaza kayıtları kapandı.
- **2 Aralık 2026:** Stripe Managed Payments göç aracı açılıyor (yalnızca uygun ülkeler için).
- **Ocak 2027 ortası:** Lemon Squeezy'nin önerdiği en geç başlangıç (göç süreci 4–8 hafta sürüyor).
- **31 Mart 2027:** Tüm ödeme işleme ve abonelik yenilemeleri **uzatma olmadan** duruyor. Otomatik yönlendirme (redirect) yok.

### Türkiye Neden Ayrı Bir Plan Yapmak Zorunda?

Lemon Squeezy'nin yönlendirdiği **Stripe Managed Payments**:
1. **Türkiye'yi desteklenen işletme ülkeleri listesinde bulundurmuyor** ([resmi uygunluk sayfası](https://docs.stripe.com/payments/managed-payments/eligibility)).
2. **Danışmanlık, geliştirme, tasarım, koçluk gibi hizmetleri yasaklıyor.**
3. **Lisans anahtarı yönetimi, dosya barındırma, PayPal ve affiliate** içermiyor.

Bu yüzden Türkiye'deki SaaS, dijital ürün ve eklenti satıcıları başka bir **Merchant of Record (MoR)** platformuna geçmek zorunda.

---

## Türkiye'den Kullanılabilen Ödeme Altyapıları (Resmi Doküman Doğrulaması)

| Sağlayıcı | MoR mu? | TR Satıcı | Komisyon | TR'ye Payout | Lisans Anahtarı | LS Abonelik Göçü | Hizmet Satışı |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Paddle (Billing)** | Evet | Evet | %5 + $0,50 | Aylık (min $100), Wire ($15 SWIFT olabilir) / Payoneer | Yok (webhook ile kendin üret) | Var (assisted kart göçü) | Yasak |
| **Polar (polar.sh)** | Evet | Evet (Stripe Express) | Starter %5+50¢ · Pro $20/ay %3,8+40¢ (+%1,5 non-US kart) | Stripe Express transferi | Var (yerleşik; eski LS anahtarı taşıma araştırılıyor) | LS ile görüşmede (PayPal yok) | Yasak |
| **Creem (creem.io)** | Evet | Evet (özel domain şart) | %3,9 + $0,40 (LS'ye ilk ay %0) | Ayın 1 & 15'i, yerel banka (7 USD/EUR veya %1) | Var (eski LS anahtarları taşınmaz) | Kısmen (destekten teyit et) | Restricted (sıkı inceleme) |
| **Dodo Payments** | Evet | Evet (TR kimlik şart) | %4 + $0,40 (+%1,5 ulusl. +%0,5 abonelik) | Ayda 2 kez ($1.000 üstü ücretsiz, altı $5) | Var (yerleşik) | Var (`cus_...` export + CSV) | Yasak |
| **Gumroad** | Evet | Evet (TRY banka) | %10 + $0,50 + kart (%2,9+30¢) | Salı günleri, min $100 | Var | Yok (yeniden satın alma) | Sınırlı (teknik destek/web tasarım yasak) |
| **iyzico / PayTR** | **Hayır (PSP)** | Evet (şirket) | iyzico %4,29+0,25 TL (+eklentiler); PayTR teklifle | TR banka (TL) | Yok | Yok | Evet |

---

## Hangisini Seçmeli?

1. **Aktif aboneliğin + PayPal ihtiyacın varsa:** **Paddle** (lisans anahtarı varsa kendi sunucunda tut).
2. **SaaS / AI / DevTool + düşük başlangıç + modern API + yeni lisans anahtarı:** **Polar** (Pro plan ~$1.379/ay ciroda kendini amorti ediyor) veya **Dodo Payments** (`cus_...` abonelik taşıma rehberi hazır).
3. **Tek seferlik dijital ürün / eklenti + affiliate:** **Creem** (ancak özel domain + Gizlilik/Şartlar/destek e-postası olmadan onay vermez).
4. **Ürünleştirilmiş hizmet (tasarım/yazılım/danışmanlık paketi):** MoR'ların neredeyse tamamı bunu kısıtlıyor veya kapatıyor. Türkiye ve fatura uyumu için **iyzico / PayTR** veya mali müşavirinizle yurt dışı şirket seçeneklerini değerlendirin.

---

## Teknik Geçişte Unutulan 4 Kritik Detay

1. **PayPal abonelikleri taşınmaz:** LS'deki PayPal aboneleri hiçbir sağlayıcıya kart gibi devredilemez. Yenileme tarihine göre e-posta + tekrar ödeme (re-subscribe) akışı kurmanız gerekir.
2. **Eski lisans anahtarlarını kırmayın:** Masaüstü uygulama veya eklenti sattıysanız, kullanıcı cihazındaki `api.lemonsqueezy.com/v1/licenses/validate` çağrısı 31 Mart'ta hata verecek. Çözüm: LS'deki tüm anahtarları şimdiden export edip kendi uyumluluk endpoint'inizden doğrulamak ve güncelleme yayınlamak.
3. **Çift-sağlayıcı (dual-run) dönemi:** Yeni müşterileri yeni MoR'a alırken, mevcut LS aboneleri için LS webhook'unu ve LS müşteri portalı linkini 31 Mart'a kadar canlı tutun. Kullanıcı tablonuzda `billing_provider` alanı tutun.
4. **Otomatik kod taraması ile başlayın:** Koddaki tüm LS izlerini (JS/TS, Python, PHP, C#, Ruby) çıkarmak için açık kaynak **`ls-exit`** aracını kullanabilirsiniz:

```bash
npx ls-exit scan . --target polar
```

Repo: https://github.com/aykutmayali/ls-exit

---

## Yardım Gerekirse

Türkiye'den SaaS ve dijital ürün ekipleri için sabit fiyatlı **Göç Denetimi** ve **Anahtar Teslim Geçiş** hizmeti sunuyorum. Kendi kodunuzu tarayıp `ls-exit` çıktısıyla veya mağaza yapınızla ulaşırsanız hızlıca değerlendirebiliriz.
