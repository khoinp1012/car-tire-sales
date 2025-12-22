const { withAndroidManifest } = require('@expo/config-plugins');

function withBluetoothPermissions(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;

    // Remove existing Bluetooth permissions to avoid duplicates
    if (androidManifest.manifest['uses-permission']) {
      androidManifest.manifest['uses-permission'] = androidManifest.manifest['uses-permission'].filter(
        (permission) => {
          const name = permission.$['android:name'];
          return !name.includes('BLUETOOTH') && !name.includes('ACCESS_COARSE_LOCATION') && !name.includes('ACCESS_FINE_LOCATION');
        }
      );
    }

    // Ensure uses-permission array exists
    if (!androidManifest.manifest['uses-permission']) {
      androidManifest.manifest['uses-permission'] = [];
    }

    // Add properly configured Bluetooth permissions for Android 12+
    const bluetoothPermissions = [
      {
        $: {
          'android:name': 'android.permission.BLUETOOTH',
          'android:maxSdkVersion': '30'
        }
      },
      {
        $: {
          'android:name': 'android.permission.BLUETOOTH_ADMIN',
          'android:maxSdkVersion': '30'
        }
      },
      {
        $: {
          'android:name': 'android.permission.BLUETOOTH_CONNECT',
          'android:usesPermissionFlags': 'neverForLocation'
        }
      },
      {
        $: {
          'android:name': 'android.permission.BLUETOOTH_SCAN',
          'android:usesPermissionFlags': 'neverForLocation'
        }
      },
      {
        $: {
          'android:name': 'android.permission.BLUETOOTH_ADVERTISE'
        }
      },
      {
        $: {
          'android:name': 'android.permission.ACCESS_COARSE_LOCATION',
          'android:maxSdkVersion': '30'
        }
      },
      {
        $: {
          'android:name': 'android.permission.ACCESS_FINE_LOCATION',
          'android:maxSdkVersion': '30'
        }
      }
    ];

    // Add the permissions
    androidManifest.manifest['uses-permission'].push(...bluetoothPermissions);

    console.log('[BLUETOOTH PLUGIN] Added Bluetooth permissions with proper attributes');
    return config;
  });
}

module.exports = withBluetoothPermissions;
