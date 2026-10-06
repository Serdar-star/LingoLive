# LingoLive — React Native (Expo) Uygulaması

**Android + iOS** için gerçek native uygulama. Web arayüzü **tek harf değiştirilmeden**, birebir aynı şekilde çalışır.

| | |
|---|---|
| **Framework** | Expo SDK 57 · React Native 0.86.3 · React 19.2.3 |
| **Mimari** | Native kabuk + paketlenmiş web arayüzü (WebView) |
| **Paket adı** | `com.lingolive.app` (Android & iOS) |
| **Çıktı** | `.apk` / `.aab` (Android) · `.ipa` (iOS) |
| **Durum** | ✅ TypeScript 0 hata · ✅ expo-doctor 21/21 · ✅ Metro bundle testi geçti |

---

## 🎯 Arayüz neden %100 korunuyor?

Uygulamanın **kabuğu gerçek React Native** (`App.tsx` — RN bileşenleri, native izinler, native splash, native geri tuşu). İçindeki ekran ise senin derlenmiş web arayüzünün **ta kendisi**:

```
assets/web/index.html   ← lingolive/dist/index.html (6.5 MB, tek dosya)
```

Yani hiçbir `<div>` → `<View>` çevirisi yok, hiçbir Tailwind sınıfı yeniden yazılmadı, Framer Motion animasyonları aynen çalışıyor, `canvas-confetti` aynen patlıyor, `glass` ve `shadow-glow` efektleri aynen duruyor. **Piksel farkı sıfır.**

Dosya uygulamanın içine gömülü — internet olmadan da arayüz açılır (sadece Supabase/Groq/Zego gibi servisler bağlantı ister).

---

## 🚀 Hızlı başlangıç

```bash
cd LingoLiveNative
npm install
npm start
```

Telefonuna **Expo Go** uygulamasını kur, çıkan QR kodu okut → uygulama anında telefonunda açılır.

> ⚠️ **Not:** Expo Go'da WebView çalışır ama kamera/mikrofon izinleri sınırlıdır. Canlı sesli odaları test etmek için aşağıdaki gerçek build'i al.

---

## 📱 Android — APK almak (3 yol)

### Yol 1: EAS Build ☁️ (en kolay — bilgisayarında Android Studio gerekmez)

```bash
npm install -g eas-cli
eas login                 # ücretsiz Expo hesabı
eas build:configure
npm run build:apk         # telefona kurulabilir .apk
```

Build Expo'nun sunucularında alınır, bitince indirme linki verir. Ücretsiz katmanda ayda sınırlı sayıda build hakkın var.

Mağazaya yüklemek için `.aab`:
```bash
npm run build:aab
```

### Yol 2: Kendi bilgisayarında 💻

Gerekenler: **Android Studio** + **JDK 17**

```bash
npx expo run:android --variant release
```

APK şurada oluşur:
```
android/app/build/outputs/apk/release/app-release.apk
```

### Yol 3: Sadece native projeyi üret

```bash
npm run prebuild          # android/ ve ios/ klasörlerini oluşturur
```
Sonra `android/` klasörünü Android Studio'da açıp normal şekilde build alabilirsin.

---

## 🍎 iOS — IPA almak

> iOS build'i için **Mac + Xcode** gerekir (veya EAS Build ile Mac'siz).

### EAS ile (Mac gerekmez)
```bash
eas build -p ios --profile production
```
Apple Developer hesabı ($99/yıl) gerekir.

### Mac'te yerel olarak
```bash
npx expo run:ios --configuration Release
```

---

## 🔄 Web arayüzünü güncellemek

Web tarafında (`../lingolive`) bir değişiklik yaptıysan:

```bash
npm run sync:web
```

Bu komut otomatik olarak:
1. `../lingolive` klasöründe `vite build` çalıştırır
2. Üretilen `dist/index.html` dosyasını `assets/web/index.html` üzerine kopyalar

Sonra tekrar build al. Web projesi başka bir yerdeyse:
```bash
WEB_DIR=/baska/yol/lingolive npm run sync:web
```

---

## 🧩 Native kabuk ne yapıyor? (`App.tsx`)

Arayüze **hiç dokunmadan** şu native özellikleri ekler:

| Özellik | Açıklama |
|---|---|
| 🎨 **Native splash** | Uygulama ikonu + marka rengiyle açılış ekranı; arayüz hazır olunca kaybolur |
| 🌓 **Tema senkronu** | Web'de dark mode'a geçince status bar ve güvenli alan rengi de native tarafta değişir (`MutationObserver` köprüsü) |
| 📱 **Güvenli alan** | Çentik / dynamic island / alt gesture bar otomatik hesaplanır (`SafeAreaView`) — web'deki eksik safe-area sorunu native tarafta çözüldü |
| ⬅️ **Donanım geri tuşu** | Android'de geri tuşu uygulamadan atmaz, WebView geçmişinde geri gider |
| 🎤 **Kamera + mikrofon** | Açılışta runtime izni istenir; canlı sesli/görüntülü odalar (ZegoCloud) çalışır |
| 🔗 **Dış linkler** | Uygulama içinde tıklanan `http(s)` linkleri sistem tarayıcısında açılır, uygulamadan çıkmaz |
| 🚫 **Native his** | Çift dokunuşla zoom, aşırı kaydırma (overscroll), sistem metin menüsü kapatıldı |
| 💥 **Çökme kurtarma** | WebView render süreci ölürse otomatik yeniden yüklenir |
| ⚠️ **Hata ekranı** | Paket okunamazsa Türkçe "Tekrar dene" ekranı gösterilir |

---

## 📂 Proje yapısı

```
LingoLiveNative/
├── App.tsx                    ← Native kabuk (tek dosya, ~290 satır)
├── index.ts                   ← Giriş noktası
├── app.json                   ← Uygulama adı, ikon, izinler, bundle ID
├── eas.json                   ← Build profilleri (apk / aab / ios)
├── metro.config.js            ← .html dosyasını asset olarak tanıtır
├── tsconfig.json
├── types/assets.d.ts          ← .html import tipi
├── scripts/
│   └── sync-web.mjs           ← Web build'i native pakete kopyalar
└── assets/
    ├── icon.png                       (1024×1024 uygulama ikonu)
    ├── splash-icon.png                (açılış ekranı logosu)
    ├── android-icon-foreground.png    (adaptive icon ön plan)
    ├── android-icon-background.png    (adaptive icon arka plan)
    ├── android-icon-monochrome.png    (Android 13+ temalı ikon)
    ├── favicon.png
    └── web/
        └── index.html                 ← 6.5 MB — TÜM LingoLive arayüzü
```

---

## 🔐 Mağazaya yüklemeden önce

1. **API anahtarları** — `.env` dosyasındaki anahtarlar web build'inin içine gömülü. Supabase, Groq, Turso ve Zego anahtarlarını **yenile** ve yalnızca `anon`/public anahtarları kullan. Supabase'te **Row Level Security** açık olmalı.
2. **Sürüm numarası** — `app.json` içinde `version`, `ios.buildNumber`, `android.versionCode` değerlerini her yüklemede artır.
3. **Gizlilik politikası** — hem Play Store hem App Store zorunlu tutuyor (uygulamada şu an sadece toast gösteriliyor, gerçek sayfa gerekli).
4. **İzin açıklamaları** — `app.json` içindeki `NSCameraUsageDescription` / `NSMicrophoneUsageDescription` metinlerini kendi dilinde yaz; Apple bunları inceliyor.
5. **Apple hesabı** — $99/yıl · **Google Play** — tek seferlik $25.

---

## ❓ Sık karşılaşılan sorunlar

**Beyaz ekran açılıyor**
```bash
npx expo start -c        # Metro önbelleğini temizle
```
`assets/web/index.html` dosyasının var olduğundan emin ol (`npm run sync:web`).

**"Unable to resolve ./assets/web/index.html"**
`metro.config.js` içindeki `assetExts` ayarı silinmiş olabilir; dosyayı kontrol et ve `-c` ile yeniden başlat.

**Mikrofon çalışmıyor**
Expo Go'da sınırlı. `npx expo run:android` ile gerçek build al.

**Build çok yavaş**
Web arayüzü tek dosya olarak 6.5 MB. İstersen `lingolive/vite.config.ts` içinden `viteSingleFile()` eklentisini çıkarıp parçalı build'e geçebilirsin (o durumda `sync-web.mjs` tüm `dist/` klasörünü kopyalayacak şekilde güncellenmeli).
