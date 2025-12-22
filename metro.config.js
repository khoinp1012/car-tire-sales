const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add template files to the asset extensions
config.resolver.assetExts.push('ods', 'html');

module.exports = config;
