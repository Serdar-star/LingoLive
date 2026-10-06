# LingoLive — Android Studio ile APK alma rehberi

Proje **hazır**. `android/` klasörü üretildi, arayüz pakete kopyalandı, izinler tanımlı.
Aşağıdaki adımları sırayla uygula.

---

## 0. Önce bunlar kurulu olmalı

| gereksinim | sürüm | not |
|---|---|---|
| **Android Studio** | Ladybug veya yenisi | [developer.android.com/studio](https://developer.android.com/studio) |
| **JDK 17** | 17 (18/21 değil) | Android Studio ile birlikte gelir — ayrıca kurmana gerek yok |
| **Node.js** | 18 veya 20 | `node -v` ile kontrol et |
| **Android SDK 35** | Platform 35 + Build-Tools 35 | Android Studio → SDK Manager'dan kur |

> ⚠️ **JDK sürümü en sık yapılan hata.** React Native 0.86 JDK 17 ister. Bilgisayarında JDK 11 varsa Gradle patlar.
> Android Studio → **Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK** → `jbr-17` (Android Studio'nun kendi JDK'sı) seç.

---

## 1. Projeyi indir ve bağımlılıkları kur

Çalışma alanından `LingoLiveNative` klasörünün tamamını indir, sonra:

```bash
cd LingoLiveNative
npm install
```

---

## 2. Web arayüzünü pakete senkronla

Uygulamanın içeriği tek bir `index.html` olarak WebView'de çalışıyor. Bu dosya **mutlaka** güncel olmalı:

```bash
npm run sync:web
```

Bu komut `../lingolive` klasöründe `vite build` çalıştırıp çıkan dosyayı `assets/web/index.html` içine kopyalar.
Web projesi başka bir yerdeyse:

```bash
WEB_DIR=/tam/yol/lingolive npm run sync:web
```

**Kontrol et:** `assets/web/index.html` ~1,2 MB olmalı. Boşsa uygulama **beyaz ekran** açar.

> 🔑 **Turso anahtarları burada gömülüyor.** `lingolive/.env` dosyasındaki `VITE_TURSO_DATABASE_URL` ve `VITE_TURSO_AUTH_TOKEN` değerleri `vite build` sırasında HTML'in içine yazılıyor. `.env` eksikse uygulama açılır ama içerik gelmez.

---

## 3. Android Studio'da aç

Android Studio → **Open** → **`LingoLiveNative/android`** klasörünü seç.

> ❗ Kök klasörü (`LingoLiveNative`) değil, **`android` alt klasörünü** aç. Kökü açarsan Gradle projeyi tanımaz.

İlk açılışta Gradle sync otomatik başlar (ilk seferde 5–15 dakika, bağımlılıkları indiriyor). Alt barda "Gradle sync finished" yazmasını bekle.

`local.properties` dosyasını Android Studio kendi oluşturur. Oluşturmazsa elle ekle:

```properties
sdk.dir=/Users/KULLANICI/Library/Android/sdk        # macOS
sdk.dir=C\:\\Users\\KULLANICI\\AppData\\Local\\Android\\Sdk   # Windows
```

---

## 4. Test APK'sı al (imzasız, hemen kurulur)

Menüden: **Build → Build Bundle(s) / APK(s) → Build APK(s)**

Bittiğinde sağ altta "locate" linki çıkar. Dosya burada:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Terminalden de alabilirsin:

```bash
cd android
./gradlew assembleDebug          # macOS / Linux
gradlew.bat assembleDebug        # Windows
```

Bu APK'yı telefona atıp kurabilirsin (Ayarlar → Bilinmeyen kaynaklara izin ver).

---

## 5. Yayın APK'sı al (imzalı — Play Store veya dağıtım için)

### 5.1 Kendi anahtarını üret

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 \
  -keystore lingolive-release.keystore \
  -alias lingolive \
  -keyalg RSA -keysize 2048 -validity 10000
```

Sorulan parolayı **kaybetme** — kaybedersen uygulamayı bir daha güncelleyemezsin.

### 5.2 Parolaları gradle.properties'e yaz

`android/gradle.properties` dosyasının sonuna ekle:

```properties
LINGOLIVE_UPLOAD_STORE_FILE=lingolive-release.keystore
LINGOLIVE_UPLOAD_KEY_ALIAS=lingolive
LINGOLIVE_UPLOAD_STORE_PASSWORD=senin_parolan
LINGOLIVE_UPLOAD_KEY_PASSWORD=senin_parolan
```

> Bu dosyayı git'e **ekleme**. `.gitignore`'a `gradle.properties` satırını koy.

### 5.3 build.gradle'a imza bloğunu ekle

`android/app/build.gradle` içinde `signingConfigs { debug { … } }` bloğunun **altına** ekle:

```gradle
        release {
            if (project.hasProperty('LINGOLIVE_UPLOAD_STORE_FILE')) {
                storeFile file(LINGOLIVE_UPLOAD_STORE_FILE)
                storePassword LINGOLIVE_UPLOAD_STORE_PASSWORD
                keyAlias LINGOLIVE_UPLOAD_KEY_ALIAS
                keyPassword LINGOLIVE_UPLOAD_KEY_PASSWORD
            }
        }
```

Sonra `buildTypes { release { … } }` içindeki şu satırı:

```gradle
            signingConfig signingConfigs.debug      // ← bunu
```

şununla değiştir:

```gradle
            signingConfig signingConfigs.release    // ← bununla
```

### 5.4 Derle

```bash
cd android
./gradlew assembleRelease        # APK  → app/build/outputs/apk/release/app-release.apk
./gradlew bundleRelease          # AAB  → app/build/outputs/bundle/release/app-release.aab
```

Play Store **AAB** ister, elden dağıtım için **APK** kullan.

---

## 6. Sürüm numarasını değiştirme

İki yerde:

**`app.json`** (Expo tarafı):
```json
"version": "1.0.1",
"android": { "versionCode": 2 }
```

Sonra `npx expo prebuild --platform android` ile `android/` klasörünü tazele — ya da doğrudan
**`android/app/build.gradle`** içinde:
```gradle
versionCode 2
versionName "1.0.1"
```

---

## 7. Sık karşılaşılan hatalar

| hata | sebep | çözüm |
|---|---|---|
| **Beyaz/boş ekran** | `assets/web/index.html` yok veya boş | `npm run sync:web` çalıştır, dosya boyutunu kontrol et |
| **İçerik gelmiyor, ders yok** | `.env`'deki Turso anahtarları derlemeye girmemiş | `lingolive/.env` dolu olmalı, sonra `npm run sync:web` |
| `Unsupported class file major version` | JDK 17 değil | Gradle JDK'yı `jbr-17` yap |
| `SDK location not found` | `local.properties` yok | SDK yolunu elle yaz (adım 3) |
| `Could not find com.facebook.react...` | Gradle sync yarım kalmış | **File → Invalidate Caches / Restart** |
| `Duplicate class` / tuhaf derleme hataları | eski çıktı | `cd android && ./gradlew clean` |
| Mikrofon/kamera çalışmıyor | izin verilmemiş | Uygulama ilk açılışta izin ister; reddettiysen Ayarlar'dan aç |
| `expo prebuild` sonrası değişikliklerim gitti | `--clean` android/ klasörünü siler | `android/` içinde elle yaptığın değişiklikleri (imza bloğu) tekrar ekle |

---

## 8. Alternatif: Android Studio'suz, bulutta derleme (EAS)

Bilgisayarına hiçbir şey kurmak istemiyorsan:

```bash
npm install -g eas-cli
eas login                      # ücretsiz Expo hesabı
npm run build:apk              # → APK, indirme linki verir
npm run build:aab              # → Play Store için AAB
```

İmzalama anahtarını EAS senin için üretir ve saklar. Ücretsiz katmanda kuyruk bekleme süresi olabilir.

---

## 9. Mimari — ne nasıl çalışıyor

```
LingoLiveNative/
├── App.tsx                 React Native kabuğu — WebView'i açar, izinleri yönetir
├── assets/web/index.html   ← lingolive'dan derlenen arayüz (1,2 MB, tek dosya)
├── android/                ← Android Studio projesi (expo prebuild üretti)
│   ├── app/build.gradle    paket adı, sürüm, imza ayarları
│   └── gradlew             komut satırından derleme
└── scripts/sync-web.mjs    web'i derleyip assets/web'e kopyalar
```

- Arayüz **tek harfi değişmeden** WebView içinde çalışıyor — bu yüzden tasarım birebir aynı.
- Ders içeriği **Turso'dan** geliyor, ilk açılışta internet gerekiyor; sonra IndexedDB'den çevrimdışı çalışıyor.
- Paket adı: `com.lingolive.app` · minSdk ve targetSdk Expo 57 varsayılanları.
- Tanımlı izinler: İNTERNET, AĞ DURUMU, KAMERA, MİKROFON, SES AYARLARI, TİTREŞİM, UYANIK TUTMA.

---

## Özet — en kısa yol

```bash
cd LingoLiveNative
npm install
npm run sync:web
# Android Studio → Open → LingoLiveNative/android
# Gradle sync bitsin
# Build → Build Bundle(s)/APK(s) → Build APK(s)
# → android/app/build/outputs/apk/debug/app-debug.apk
```
