import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const packageJson = JSON.parse(await readFile(join(repoRoot, 'package.json'), 'utf8'));
const packageLock = JSON.parse(await readFile(join(repoRoot, 'package-lock.json'), 'utf8'));
const gitignore = await readFile(join(repoRoot, '.gitignore'), 'utf8');
const envExample = await readFile(join(repoRoot, '.env.example'), 'utf8');
const readme = await readFile(join(repoRoot, 'README.md'), 'utf8');
const supabaseSource = await readFile(join(repoRoot, 'src', 'lib', 'supabase.ts'), 'utf8');
const authContextSource = await readFile(join(repoRoot, 'src', 'contexts', 'AuthContext.tsx'), 'utf8');
const edgeFunctionSource = await readFile(join(repoRoot, 'supabase', 'functions', 'update-account', 'index.ts'), 'utf8');

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (['.git', 'node_modules', 'dist'].includes(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(path));
    } else {
      files.push(path);
    }
  }
  return files;
}

test('TC-CB-325 TD083 TV083 TA017 service role key is absent from frontend source', async () => {
  const sourceFiles = (await listFiles(join(repoRoot, 'src'))).filter(file => /\.(ts|tsx|css)$/.test(file));
  const combined = (await Promise.all(sourceFiles.map(file => readFile(file, 'utf8')))).join('\n');
  assert.doesNotMatch(combined, /SUPABASE_SERVICE_ROLE_KEY|service_role/i);
});

test('TC-CB-326 TD083 TV083 TA017 .env is git-ignored and example env exposes only VITE public values', () => {
  assert.match(gitignore, /^\.env$/m);
  assert.match(envExample, /^VITE_SUPABASE_URL=/m);
  assert.match(envExample, /^VITE_SUPABASE_ANON_KEY=/m);
  assert.doesNotMatch(envExample, /SUPABASE_SERVICE_ROLE_KEY|service_role/i);
});

test('TC-CB-327 TD083 TV083 TA017 service role key usage is isolated to Edge Function server code and documentation', async () => {
  const files = await listFiles(repoRoot);
  const hits = [];
  for (const file of files) {
    if (!/\.(ts|tsx|js|mjs|json|md|sql|env\.example)$/.test(file)) continue;
    const text = await readFile(file, 'utf8');
    if (/SUPABASE_SERVICE_ROLE_KEY|service_role/i.test(text)) hits.push(relative(repoRoot, file).replaceAll('\\', '/'));
  }
  const disallowedHits = hits.filter(file =>
    !file.endsWith('.md') &&
    !file.startsWith('tests/') &&
    file !== 'supabase/functions/update-account/index.ts'
  );
  assert.deepEqual(disallowedHits, []);
});

test('TC-CB-328 TD083 TV083 TA017 client auth requests send bearer token but never service role material', () => {
  assert.match(authContextSource, /Authorization': `Bearer \$\{session\?\.access_token \?\? ''\}`/);
  assert.doesNotMatch(authContextSource, /SUPABASE_SERVICE_ROLE_KEY|service_role/i);
});

test('TC-CB-338 TD086 TV086 TA017 npm audit target is lockfile-pinned with npm lockfile v3', () => {
  assert.equal(packageLock.lockfileVersion, 3);
  assert.equal(packageLock.name, packageJson.name);
  assert.equal(packageLock.packages[''].version, packageJson.version);
});

test('TC-CB-339 TD086 TV086 TA017 dependency manifests do not contain audit bypass configuration', async () => {
  const npmrcFiles = (await listFiles(repoRoot)).filter(file => file.endsWith('.npmrc'));
  assert.equal(npmrcFiles.length, 0);
  assert.doesNotMatch(JSON.stringify(packageJson), /audit\s*=\s*false|audit-level\s*=\s*none/i);
});

test('TC-CB-340 TD086 TV086 TA017 package declares bounded runtime and testable dependency sets for audit judgment', () => {
  assert.match(packageJson.engines.node, /\^20\.19\.0|>=22\.12\.0/);
  assert.match(packageJson.engines.npm, />=10/);
  assert.ok(Object.keys(packageJson.dependencies).length > 0);
  assert.ok(Object.keys(packageJson.devDependencies).length > 0);
});

test('TC-CB-349 TD065 TV065 TA012 package declares supported Node/npm engines', () => {
  assert.match(packageJson.engines.node, /\^20\.19\.0 \|\| >=22\.12\.0/);
  assert.equal(packageJson.engines.npm, '>=10');
});

test('TC-CB-350 TD065 TV065 TA012 dependency installation is reproducible from package-lock', () => {
  assert.equal(packageLock.packages[''].name, packageJson.name);
  assert.deepEqual(packageLock.packages[''].dependencies, packageJson.dependencies);
  assert.deepEqual(packageLock.packages[''].devDependencies, packageJson.devDependencies);
});

test('TC-CB-351 TD065 TV065 TA012 build and typecheck scripts are explicit and non-interactive', () => {
  assert.equal(packageJson.scripts.build, 'vite build');
  assert.equal(packageJson.scripts.typecheck, 'tsc --noEmit -p tsconfig.app.json');
});

test('TC-CB-352 TD065 TV065 TA012 lint script is explicit and covers the repository', () => {
  assert.equal(packageJson.scripts.lint, 'eslint .');
});

test('TC-CB-353 TD066 TV066 TA012 missing Supabase URL is diagnosed before createClient without echoing values', () => {
  assert.match(supabaseSource, /export function getSupabaseConfig\(env: SupabaseEnv\): SupabaseConfig/);
  assert.match(supabaseSource, /if \(!url\)[\s\S]*VITE_SUPABASE_URL is required/);
  assert.match(supabaseSource, /const supabaseConfig = getSupabaseConfig\(import\.meta\.env\)/);
  assert.match(supabaseSource, /createClient<Database>\(supabaseConfig\.url, supabaseConfig\.anonKey\)/);
});

test('TC-CB-354 TD066 TV066 TA012 invalid Supabase URL is diagnosed without logging the invalid value', () => {
  assert.match(supabaseSource, /new URL\(url\)/);
  assert.match(supabaseSource, /VITE_SUPABASE_URL must be a valid http or https URL/);
  assert.match(supabaseSource, /!\['http:', 'https:'\]\.includes\(parsedUrl\.protocol\)/);
  assert.doesNotMatch(supabaseSource, /console\.(log|warn|error|info)|throw configurationError\([^)]*\$\{|throw new Error\([^)]*\$\{/);
});

test('TC-CB-355 TD066 TV066 TA012 missing Supabase anon key is diagnosed before client creation', () => {
  assert.match(supabaseSource, /const anonKey = env\.VITE_SUPABASE_ANON_KEY\?\.trim\(\)/);
  assert.match(supabaseSource, /if \(!anonKey\)[\s\S]*VITE_SUPABASE_ANON_KEY is required/);
  assert.ok(supabaseSource.indexOf('if (!anonKey)') < supabaseSource.indexOf('return { url, anonKey }'));
});

test('TC-CB-356 TD066 TV066 TA012 Supabase configuration diagnostics never include secret or runtime values', () => {
  const diagnosticMessages = [...supabaseSource.matchAll(/configurationError\('([^']+)'\)/g)].map(match => match[1]);
  assert.deepEqual(diagnosticMessages, [
    'VITE_SUPABASE_URL is required',
    'VITE_SUPABASE_URL must be a valid http or https URL',
    'VITE_SUPABASE_ANON_KEY is required',
  ]);
  assert.equal(diagnosticMessages.some(message => /your-anon-key|eyJ|service_role|SUPABASE_SERVICE_ROLE_KEY/i.test(message)), false);
  assert.doesNotMatch(supabaseSource, /JSON\.stringify\(env\)|Object\.entries\(env\)|VITE_SUPABASE_ANON_KEY.*\$\{/);
});

test('TC-CB-357 TD067 TV067 TA012 code and React test scripts are declared for normal successful completion', () => {
  assert.equal(packageJson.scripts['test:code'], 'node --test tests/code/*.test.mjs');
  assert.equal(packageJson.scripts['test:react'], 'vitest run --config vitest.config.ts');
});

test('TC-CB-358 TD067 TV067 TA012 test process is configured to exit non-zero on code-test assertion failure', () => {
  assert.match(packageJson.scripts['test:code'], /^node --test /);
  assert.doesNotMatch(packageJson.scripts['test:code'], /\|\|\s*true|--passWithNoTests/);
});

test('TC-CB-359 TD067 TV067 TA012 rerunnable local test commands avoid dedicated Supabase dependency', () => {
  assert.doesNotMatch(packageJson.scripts['test:code'], /supabase\s+(start|db|functions)/i);
  assert.doesNotMatch(packageJson.scripts['test:react'], /supabase\s+(start|db|functions)/i);
  assert.doesNotMatch(supabaseSource + edgeFunctionSource + readme, /専用Supabase/i);
});
