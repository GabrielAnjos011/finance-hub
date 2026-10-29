import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
const env = { ...process.env };
if (process.platform === 'win32') {
  const portable = resolve('.tools/java');
  if (!env.JAVA_HOME && existsSync(portable)) {
    const folder = readdirSync(portable).find((name) =>
      existsSync(join(portable, name, 'bin/java.exe')),
    );
    if (folder) env.JAVA_HOME = join(portable, folder);
  }
  if (env.JAVA_HOME) env.PATH = join(env.JAVA_HOME, 'bin') + ';' + env.PATH;
  const sockets = resolve('.tools');
  mkdirSync(sockets, { recursive: true });
  env.JAVA_TOOL_OPTIONS =
    (env.JAVA_TOOL_OPTIONS || '') + ' -Djdk.net.unixdomain.tmpdir="' + sockets + '"';
}
const result = spawnSync(
  process.execPath,
  [
    'node_modules/firebase-tools/lib/bin/firebase.js',
    'emulators:exec',
    '--only',
    'auth,firestore',
    '--project',
    'demo-finance-hub',
    '"' + process.execPath + '" node_modules/vitest/vitest.mjs run --config vitest.rules.config.js',
  ],
  { env, stdio: 'inherit' },
);
process.exit(result.status ?? 1);
