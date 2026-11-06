import { pathToFileURL } from 'node:url';

// Query one package: account-wide package listing can fail with workflow tokens.
export async function checkPackageVisibility({ owner, ownerType, token, allowMissing = false, fetchImpl = fetch }) {
  if (!owner || !token) throw new Error('Package visibility check requires OWNER and GH_TOKEN.');
  if (!['User', 'Organization'].includes(ownerType)) throw new Error('Unsupported OWNER_TYPE.');
  const namespace = ownerType === 'Organization' ? 'orgs' : 'users';
  const endpoint = `https://api.github.com/${namespace}/${encodeURIComponent(owner)}/packages/container/personal-site`;
  const response = await fetchImpl(endpoint, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 404 && allowMissing) return 'missing';
  if (!response.ok) {
    throw new Error(`Package visibility lookup failed (HTTP ${response.status}). Check package access for this repository; the request was not treated as a missing package.`);
  }
  const { visibility } = await response.json();
  if (visibility !== 'private') {
    throw new Error(`GHCR package must be private; received visibility: ${visibility ?? 'unknown'}.`);
  }
  return 'private';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1 || (args.length === 1 && args[0] !== '--allow-missing')) {
      throw new Error('Usage: node scripts/check-package-visibility.mjs [--allow-missing]');
    }
    const result = await checkPackageVisibility({
      owner: process.env.OWNER,
      ownerType: process.env.OWNER_TYPE,
      token: process.env.GH_TOKEN,
      allowMissing: args[0] === '--allow-missing',
    });
    console.log(result === 'missing'
      ? 'Package is not visible yet; first publication will create a private package. Visibility will be verified after publishing.'
      : 'GHCR package visibility verified: private.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
