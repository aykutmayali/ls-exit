# ls-exit

> **Lemon Squeezy 31 Mart 2027'de ödeme işlemeyi tamamen durduruyor.**  
> `ls-exit`, kod tabanınızdaki tüm Lemon Squeezy bağımlılıklarını tarayan, geçiş sürecinde çift-sağlayıcı (dual-run) çalıştırmanıza yardım eden ve eski lisans anahtarlarını kapanıştan sonra da doğrulamaya devam eden sıfır-bağımlılıklı açık kaynak (MIT) araç setidir.

🇬🇧 [English README](./README.md)

## Neden `ls-exit`?

- Lemon Squeezy **16 Kasım 2026**'da yeni mağaza kayıtlarını kapattı ve **31 Mart 2027**'de (uzatma olmadan) ödeme işlemeyi durduracak.
- Önerilen Stripe Managed Payments **Türkiye'yi desteklenen ülkeler listesinde bulundurmuyor** ve hizmet satışlarını, lisans anahtarlarını, PayPal'ı ve affiliate sistemini kapsamıyor.
- Güvenli geçiş için koddaki tüm checkout linklerini, `lemon.js` overlay'lerini, `X-Signature` webhook doğrulamalarını, SDK çağrılarını ve `/v1/licenses/*` uç noktalarını bulmak; ardından geçiş süresince iki sağlayıcıyı paralel çalıştırmak gerekir.

## Neler İçerir?

1. **Çok Dilli CLI Tarayıcı (`npx ls-exit scan .`)**
   - **JS/TS, Python, PHP, C#/.NET, Ruby, HTML/Vue/Svelte/Astro ve `.env`/config dosyalarını** tarar.
   - Lisans anahtarı çağrılarını (`CRITICAL`), webhook olay adlarını ve `X-Signature` / `X-Event-Name` kontrollerini, `api.lemonsqueezy.com/v1` isteklerini, SDK import'larını, `lemon.js` script'lerini, sabit checkout/billing URL'lerini ve `LEMONSQUEEZY_*` ortam değişkenlerini raporlar.
   - `dosya:satır`, tahmini efor (saat) ve hedef sağlayıcıya (`polar`, `paddle`, `creem`, `dodo`, `generic`) özel göç ipuçlarıyla **Markdown** veya **JSON** çıktı üretir.
2. **GitHub Action (`action.yml`)**
   - CI/CD içinde çalışır, Job Summary'ye rapor yazar ve isteğe bağlı olarak `--fail-on critical` ile PR'ları kontrol eder.
3. **Sağlayıcıdan Bağımsız TypeScript Billing Adapter (`src/adapter/`)**
   - `BillingProvider` arayüzü ve `PolarBillingProvider` (Standard Webhooks `webhook-id`/`webhook-timestamp`/`webhook-signature` HMAC-SHA256 doğrulaması + Checkout ve Customer Portal API).
   - `DualProviderRouter`: Yeni satışları Polar'a yönlendirirken, mevcut Lemon Squeezy abonelerinin `X-Signature` webhook'larını ve müşteri portalı linklerini kesintisiz yönetir.
4. **Eski Lisans Anahtarı Uyumluluk Sunucusu (`LegacyLicenseCompatService`)**
   - Lemon Squeezy'nin `POST /v1/licenses/validate`, `/activate` ve `/deactivate` JSON formatıyla birebir uyumlu endpoint sağlar.
   - Lemon Squeezy'den dışa aktarılan lisans anahtarlarını (JSON/CSV) yükler ve yeni anahtarlar için opsiyonel olarak Polar'a (`/v1/customer-portal/license-keys/validate`) yönlendirir — böylece kullanıcı cihazlarındaki masaüstü uygulama ve eklentiler 31 Mart 2027 sonrası bozulmaz.

## Hızlı Başlangıç

```bash
# Projeyi tara ve Polar'a göre Markdown raporu üret
npx ls-exit scan . --target polar

# JSON rapor üret ve kritik bulgu varsa exit code 1 döndür
npx ls-exit scan . --format json --out ls-exit-report.json --fail-on critical
```

### Kaynaktan çalıştırma ve testler

```bash
npm install
npm test
node dist/src/cli.js scan ./fixtures/nextjs-saas --target polar
```

### Örnek Next.js App Router rotaları

[`examples/nextjs-app-router/`](./examples/nextjs-app-router/) klasöründe webhook ve lisans doğrulama route örnekleri yer alır.

## Profesyonel göç desteği

**Aykut Mayalı** (İstanbul, TR/EN) tarafından geliştirilmiştir. Sabit fiyatlı kod denetimi, çift-sağlayıcı geçiş ve lisans uyumluluk kurulumu için: [aykutmayali.github.io/launch-audit](https://aykutmayali.github.io/launch-audit/).

## Lisans

MIT © 2026 Aykut Mayali
