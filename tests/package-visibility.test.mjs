import assert from 'node:assert/strict';
import test from 'node:test';
import { checkPackageVisibility } from '../scripts/check-package-visibility.mjs';

const options = { owner: 'Abdulhadi13', ownerType: 'User', token: 'test-token' };
const reply = (status, body = {}) => async () => new Response(JSON.stringify(body), { status });

test('uses a direct package lookup instead of listing account packages', async () => {
  const result = await checkPackageVisibility({
    ...options,
    fetchImpl: async (url, request) => {
      assert.equal(url, 'https://api.github.com/users/Abdulhadi13/packages/container/personal-site');
      assert.equal(request.headers.Authorization, 'Bearer test-token');
      return new Response(JSON.stringify({ visibility: 'private' }));
    },
  });
  assert.equal(result, 'private');
});

test('uses the organization endpoint for organization owners', async () => {
  await checkPackageVisibility({
    ...options, owner: 'example-org', ownerType: 'Organization',
    fetchImpl: async (url) => {
      assert.equal(url, 'https://api.github.com/orgs/example-org/packages/container/personal-site');
      return new Response(JSON.stringify({ visibility: 'private' }));
    },
  });
});

test('permits a missing package only before first publication', async () => {
  assert.equal(await checkPackageVisibility({ ...options, allowMissing: true, fetchImpl: reply(404) }), 'missing');
  await assert.rejects(checkPackageVisibility({ ...options, fetchImpl: reply(404) }), /HTTP 404/);
});

for (const status of [400, 401, 403, 429, 500]) {
  test(`HTTP ${status} must fail rather than allow publication`, async () => {
    await assert.rejects(checkPackageVisibility({
      ...options, allowMissing: true, fetchImpl: reply(status),
    }), new RegExp(`HTTP ${status}`));
  });
}

for (const visibility of ['public', 'internal', undefined]) {
  test(`rejects ${visibility ?? 'missing'} visibility`, async () => {
    await assert.rejects(checkPackageVisibility({
      ...options, fetchImpl: reply(200, { visibility }),
    }), /must be private/);
  });
}

test('network failures are not treated as a missing package', async () => {
  await assert.rejects(checkPackageVisibility({
    ...options, allowMissing: true,
    fetchImpl: async () => { throw new Error('Network unavailable'); },
  }), /Network unavailable/);
});
