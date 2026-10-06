/* ──────────────────────────────────────────────────────────
   LingoLive — React Native (Expo) kabuğu
   Web arayüzü TEK HARF değiştirilmeden assets/web/index.html
   içinden yüklenir. Bu dosya sadece native tarafı yönetir:
   splash, güvenli alan, tema rengi, donanım geri tuşu,
   kamera/mikrofon izinleri, çevrimdışı ekranı ve dış linkler.
   ────────────────────────────────────────────────────────── */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import type { WebViewNavigation } from "react-native-webview/lib/WebViewTypes";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Asset } from "expo-asset";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";

SplashScreen.preventAutoHideAsync().catch(() => {});

/* LingoLive tasarım token'larıyla birebir aynı arka plan renkleri
   (src/index.css → :root --bg / .dark --bg) */
const BG_LIGHT = "#F8F9FE";
const BG_DARK = "#0B0B16";
const PRIMARY = "#6C5CE7";

/* Web tarafına enjekte edilen köprü.
   Arayüze DOKUNMAZ — sadece tema değişimini native'e bildirir ve
   WebView içinde istenmeyen zoom/seçim davranışlarını engeller. */
const BRIDGE = `
(function () {
  if (window.__lingoBridge) return;
  window.__lingoBridge = true;

  function send(payload) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(payload)); } catch (e) {}
  }

  function reportTheme() {
    var isDark = document.documentElement.classList.contains("dark");
    send({ type: "theme", dark: isDark });
  }

  function ready() {
    reportTheme();
    new MutationObserver(reportTheme).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    send({ type: "ready" });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ready);
  } else {
    ready();
  }

  // Çift dokunuşla zoom'u kapat (native uygulama hissi için)
  var lastTouch = 0;
  document.addEventListener("touchend", function (e) {
    var now = Date.now();
    if (now - lastTouch <= 300) e.preventDefault();
    lastTouch = now;
  }, { passive: false });

  // Uzun basınca çıkan sistem metin menüsünü input'lar dışında kapat
  document.addEventListener("contextmenu", function (e) {
    var t = e.target;
    var tag = t && t.tagName;
    if (tag !== "INPUT" && tag !== "TEXTAREA" && !(t && t.isContentEditable)) {
      e.preventDefault();
    }
  });

  true;
})();
true;
`;

export default function App() {
  const webRef = useRef<WebView>(null);
  const [sourceUri, setSourceUri] = useState<string | null>(null);
  const [baseDir, setBaseDir] = useState<string | undefined>(undefined);
  const [dark, setDark] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const canGoBack = useRef(false);

  /* ─── 1. Paketlenmiş web arayüzünü diskten çöz ─── */
  const prepare = useCallback(async () => {
    try {
      setFailed(false);
      const asset = Asset.fromModule(require("./assets/web/index.html"));
      if (!asset.localUri) await asset.downloadAsync();
      const uri = asset.localUri ?? asset.uri;
      setSourceUri(uri);
      setBaseDir(uri.substring(0, uri.lastIndexOf("/")));
    } catch (e) {
      console.warn("LingoLive web bundle load failed", e);
      setFailed(true);
      SplashScreen.hideAsync().catch(() => {});
    }
  }, []);

  useEffect(() => {
    prepare();
  }, [prepare]);

  /* ─── 2. Android'de mikrofon/kamera izinlerini önceden iste ───
     (canlı sesli odalar ve telaffuz pratiği için) */
  useEffect(() => {
    if (Platform.OS !== "android") return;
    PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      PermissionsAndroid.PERMISSIONS.CAMERA,
    ]).catch(() => {});
  }, []);

  /* ─── 3. Kök arka plan rengini temaya göre ayarla ─── */
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(dark ? BG_DARK : BG_LIGHT).catch(() => {});
  }, [dark]);

  /* ─── 4. Android donanım geri tuşu → WebView geçmişi ─── */
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack.current && webRef.current) {
        webRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  /* ─── 5. Web tarafından gelen mesajlar ─── */
  const onMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg?.type === "theme") setDark(Boolean(msg.dark));
    } catch {
      /* uygulamanın kendi mesajları — yoksay */
    }
  }, []);

  /* ─── 6. Dış linkleri sistem tarayıcısında aç ─── */
  const onShouldStartLoad = useCallback((req: WebViewNavigation) => {
    const url = req.url;
    if (!url) return false;
    if (url.startsWith("file://") || url.startsWith("about:") || url.startsWith("data:")) {
      return true;
    }
    if (/^https?:\/\//i.test(url) && req.navigationType === "click") {
      Linking.openURL(url).catch(() => {});
      return false;
    }
    if (/^(mailto|tel|sms|intent):/i.test(url)) {
      Linking.openURL(url).catch(() => {});
      return false;
    }
    return true;
  }, []);

  const onLoadEnd = useCallback(() => {
    setLoaded(true);
    setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 120);
  }, []);

  const bg = dark ? BG_DARK : BG_LIGHT;

  /* ─── Hata ekranı (native) ─── */
  if (failed) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.fill, styles.center, { backgroundColor: bg }]}>
          <StatusBar style={dark ? "light" : "dark"} />
          <View style={styles.logo} />
          <Text style={[styles.title, { color: dark ? "#F2F2FA" : "#17162B" }]}>
            LingoLive başlatılamadı
          </Text>
          <Text style={[styles.sub, { color: dark ? "#A3A8C0" : "#5C6474" }]}>
            Uygulama paketi okunamadı. Lütfen tekrar dene.
          </Text>
          <TouchableOpacity style={styles.retry} onPress={prepare} activeOpacity={0.85}>
            <Text style={styles.retryText}>Tekrar dene</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.fill, { backgroundColor: bg }]} edges={["top", "bottom"]}>
        <StatusBar style={dark ? "light" : "dark"} />

        {sourceUri && (
          <WebView
            ref={webRef}
            source={{ uri: sourceUri }}
            originWhitelist={["*"]}
            style={[styles.fill, { backgroundColor: bg }]}
            containerStyle={{ backgroundColor: bg }}
            /* --- arayüzün birebir korunması için --- */
            scalesPageToFit={false}
            textZoom={100}
            bounces={false}
            overScrollMode="never"
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            automaticallyAdjustContentInsets={false}
            contentInsetAdjustmentBehavior="never"
            /* --- yerel dosya + depolama erişimi --- */
            javaScriptEnabled
            domStorageEnabled
            cacheEnabled
            thirdPartyCookiesEnabled
            sharedCookiesEnabled
            allowFileAccess
            allowFileAccessFromFileURLs
            allowUniversalAccessFromFileURLs
            allowingReadAccessToURL={baseDir}
            /* --- canlı ses/görüntü odaları --- */
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            mediaCapturePermissionGrantType="grant"
            allowsProtectedMedia
            /* --- davranış --- */
            setSupportMultipleWindows={false}
            injectedJavaScriptBeforeContentLoaded={BRIDGE}
            onMessage={onMessage}
            onLoadEnd={onLoadEnd}
            onShouldStartLoadWithRequest={onShouldStartLoad}
            onNavigationStateChange={(nav) => {
              canGoBack.current = nav.canGoBack;
            }}
            onRenderProcessGone={() => webRef.current?.reload()}
            onContentProcessDidTerminate={() => webRef.current?.reload()}
            renderError={() => <View style={[styles.fill, { backgroundColor: bg }]} />}
          />
        )}

        {!loaded && (
          <View style={[styles.loader, { backgroundColor: bg }]} pointerEvents="none">
            <ActivityIndicator size="large" color={PRIMARY} />
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", padding: 32 },
  loader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: 64, height: 64, borderRadius: 18, backgroundColor: PRIMARY, marginBottom: 20 },
  title: { fontSize: 19, fontWeight: "700", textAlign: "center" },
  sub: { marginTop: 8, fontSize: 14, lineHeight: 20, textAlign: "center" },
  retry: {
    marginTop: 24,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 999,
    backgroundColor: PRIMARY,
  },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
