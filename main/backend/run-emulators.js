// `npm run emulators` entry point — the Firestore/Auth emulators need a
// real JDK (21+) on PATH, which this machine's system Java (8) doesn't
// satisfy and firebase-tools no longer supports. Rather than requiring a
// system-wide Java install, a portable JDK lives at ../../.tools (see
// docs/BACKEND_LOCAL_SETUP.md) — this wrapper puts it on PATH just for the
// emulator process, so a plain system Java 8 install elsewhere is untouched.
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const portableJdkBin = path.resolve(__dirname, '../../.tools/jdk-21.0.12+8/bin');
const env = { ...process.env };

if (fs.existsSync(portableJdkBin)) {
  env.JAVA_HOME = path.resolve(__dirname, '../../.tools/jdk-21.0.12+8');
  env.PATH = `${portableJdkBin}${path.delimiter}${process.env.PATH}`;
} else {
  console.log('[emulators] Portable JDK not found at .tools/ — falling back to system Java (needs 21+).');
}

const result = spawnSync('npx', ['firebase', 'emulators:start', '--project', 'fute-portal-dev'], {
  stdio: 'inherit',
  env,
  shell: true,
});
process.exit(result.status ?? 1);
