import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const edgePath = join(repoRoot, 'supabase', 'functions', 'update-account', 'index.ts');
const authContextPath = join(repoRoot, 'src', 'contexts', 'AuthContext.tsx');

const edgeSource = await readFile(edgePath, 'utf8');
const authContextSource = await readFile(authContextPath, 'utf8');
const flatEdge = edgeSource.replace(/\s+/g, ' ');

test('TC-CB-301 TD005 TV005 TA001 R001/R015 update-account requires Authorization header before admin update', () => {
  assert.match(edgeSource, /const authHeader = req\.headers\.get\("Authorization"\)/);
  assert.match(edgeSource, /if \(!authHeader\)/);
  assert.match(edgeSource, /return jsonResponse\(\{ error: "Unauthorized" \}, 401\)/);
});

test('TC-CB-302 TD005 TV005 TA001 R001/R015 update-account verifies Bearer token through anon client getUser', () => {
  assert.match(edgeSource, /createClient\(\s*Deno\.env\.get\("SUPABASE_URL"\)!,\s*Deno\.env\.get\("SUPABASE_ANON_KEY"\)!/);
  assert.match(edgeSource, /global:\s*\{\s*headers:\s*\{\s*Authorization:\s*authHeader\s*\}\s*\}/);
  assert.match(edgeSource, /anonClient\.auth\.getUser\(\)/);
});

test('TC-CB-303 TD005 TV005 TA001 R001/R015 update-account updates only getUser returned user.id', () => {
  assert.match(edgeSource, /adminClient\.auth\.admin\.updateUserById\(user\.id,\s*updates\)/);
  assert.doesNotMatch(edgeSource, /body\.user_id|body\.id|params\.id/);
});

test('TC-CB-333 TD085 TV085 TA017 R001/R015 update-account handles OPTIONS with CORS headers', () => {
  assert.match(edgeSource, /Access-Control-Allow-Origin": "\*"/);
  assert.match(edgeSource, /Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey"/);
  assert.match(flatEdge, /if \(req\.method === "OPTIONS"\) \{ return new Response\(null, \{ status: 200, headers: corsHeaders \}\); \}/);
});

test('TC-CB-334 TD085 TV085 TA017 R001/R015 authentication failure returns generic Unauthorized 401', () => {
  const unauthorizedResponses = edgeSource.match(/jsonResponse\(\{ error: "Unauthorized" \}, 401\)/g) ?? [];
  assert.ok(unauthorizedResponses.length >= 2);
});

test('TC-CB-335 TD085 TV085 TA017 R001/R015 invalid account update input returns controlled 400 errors before admin update', () => {
  assert.match(edgeSource, /const emailPattern = \/\^\[\^\\s@]\+\@\[\^\\s@]\+\\\.\[\^\\s@]\+\$\/;/);
  assert.match(edgeSource, /Invalid email format/);
  assert.match(edgeSource, /Password must be at least 6 characters/);
  assert.match(edgeSource, /No update fields provided/);
  assert.ok(edgeSource.indexOf('Invalid email format') < edgeSource.indexOf('updateUserById(user.id, updates)'));
  assert.ok(edgeSource.indexOf('No update fields provided') < edgeSource.indexOf('updateUserById(user.id, updates)'));
});

test('TC-CB-336 TD085 TV085 TA017 R001/R015 admin API failure returns HTTP 400 JSON response', () => {
  assert.match(edgeSource, /if \(error\)/);
  assert.match(edgeSource, /return jsonResponse\(\{ error: error\.message \}, 400\)/);
  assert.match(edgeSource, /"Content-Type": "application\/json"/);
});

test('TC-CB-337 TD085 TV085 TA017 R001/R015 Edge Function source never serializes service role key in responses', () => {
  const responseBodies = edgeSource.match(/JSON\.stringify\([^)]+\)/g) ?? [];
  assert.ok(responseBodies.length > 0);
  assert.equal(responseBodies.some(body => /SUPABASE_SERVICE_ROLE_KEY|service_role/i.test(body)), false);
});

test('TC-CB-345 TD093 TV093 TA018 R001/R015 missing Authorization is rejected before request body is used', () => {
  assert.ok(edgeSource.indexOf('if (!authHeader)') < edgeSource.indexOf('body = await req.json()'));
  assert.ok(edgeSource.indexOf('if (!authHeader)') < edgeSource.indexOf('SUPABASE_SERVICE_ROLE_KEY'));
});

test('TC-CB-346 TD093 TV093 TA018 R001/R015 invalid token is rejected when getUser returns error or no user', () => {
  assert.match(edgeSource, /if \(userError \|\| !user\)/);
  assert.match(edgeSource, /return jsonResponse\(\{ error: "Unauthorized" \}, 401\)/);
});

test('TC-CB-347 TD093 TV093 TA018 R001/R015 valid token owner id is the only admin update target', () => {
  assert.match(edgeSource, /const \{ data: \{ user \}, error: userError \} = await anonClient\.auth\.getUser\(\)/);
  assert.match(edgeSource, /updateUserById\(user\.id,\s*updates\)/);
});

test('TC-CB-348 TD093 TV093 TA018 R001/R015 client sends current session access token as Bearer and does not send service role key', () => {
  assert.match(authContextSource, /supabase\.auth\.getSession\(\)/);
  assert.match(authContextSource, /'Authorization': `Bearer \$\{session\?\.access_token \?\? ''\}`/);
  assert.doesNotMatch(authContextSource, /SUPABASE_SERVICE_ROLE_KEY|service_role/i);
});
