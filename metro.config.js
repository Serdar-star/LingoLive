// Learn more: https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// LingoLive web arayüzü tek bir index.html olarak paketleniyor.
// Metro'nun .html dosyasını "asset" olarak görmesi gerekiyor.
config.resolver.assetExts = [...config.resolver.assetExts, "html"];
config.resolver.sourceExts = config.resolver.sourceExts.filter((e) => e !== "html");

module.exports = config;
