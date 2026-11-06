# Deployment runbook

This site builds static HTML into a private GHCR image. GitHub Actions publishes
on `main`; once configured, SSH triggers a restricted VPS deployment. Nginx Proxy
Manager (NPM) owns public ports 80/443 and TLS. The site has no published VPS ports.

## Everyday development

1. Create a branch: `git switch -c feat/about-page`.
2. Run `npm ci` and `npm run dev`; edit content and code locally.
3. Run `npm run build`, then `npm run preview`; check English, Arabic, mobile,
   language switching, and themes.
4. Push the branch and open a pull request. Require **Build and validate** on
   `main` through repository branch protection/rulesets where available.
5. Merge after checks pass. Release validates, smoke-tests an image, publishes
   AMD64/ARM64 images, and deploys the resulting immutable manifest digest.

Use separate pull requests for dependency and deployment configuration changes.
Changes to installed VPS scripts, Compose configuration, or proxy settings need a
reviewed manual install on the VPS; the deployment key can only select images.
Actions are pinned to commit SHAs; update those pins with dependency maintenance.

## 1. GitHub setup

Create a **private** `personal-site` repository in your GitHub account, attach it
as `origin`, and push `main`. The repository name matters: the restricted VPS
script only accepts `ghcr.io/<owner>/personal-site`.

Leave repository variable `DEPLOY_ENABLED` unset during setup. The first push
builds and publishes the image but skips the deploy job. Check the Release run
and package settings: the `personal-site` GHCR package must be **private**, with
the source repository granted Actions access. The workflow also checks package
visibility before deployment. Configure Actions with read/write packages access
through its workflow permissions; no publish PAT is required.

If your real domain differs from `example.cloud`, change `site` in
`astro.config.mjs` before publishing and use that domain throughout this runbook.

## 2. Prepare the VPS

Prerequisites: Linux, Bash, Docker Engine, Docker Compose v2 supporting
`up --wait --wait-timeout`, `flock`, `sudo`, SSH, and your existing NPM installation.
Use an administrator connection for setup; the restricted CI key cannot do this.

Copy the repository's `deploy/` directory to the VPS using your normal admin
account, then run these commands **from that copied directory**:

```sh
sudo install -d -o root -g root -m 700 /opt/personal-site
sudo install -o root -g root -m 600 compose.yml /opt/personal-site/compose.yml
sudo install -o root -g root -m 600 config.env.example /opt/personal-site/config.env
sudo install -o root -g root -m 755 deploy.sh /usr/local/sbin/personal-site-deploy
sudo install -o root -g root -m 755 ssh-entrypoint.sh /usr/local/bin/personal-site-ssh
sudoedit /opt/personal-site/config.env
```

Set `IMAGE_REPOSITORY` to your lowercase GHCR repository name and `PROXY_NETWORK`
to the existing shared network name. If none exists, create a network:

```sh
sudo docker network create proxy
```

Attach NPM to this external network in its existing Compose file, **retaining its
current networks**, then apply that stack's configuration during an appropriate
maintenance window. The site Compose configuration joins the same network.
Do not run a second proxy stack or reassign NPM's public ports.

Create a dedicated SSH user named `site-deploy` with a home directory and a Bash
shell. Do not grant Docker group membership or general sudo access. As an admin,
use `sudo visudo -f /etc/sudoers.d/personal-site` to install:

```sudoers
site-deploy ALL=(root) NOPASSWD: /usr/local/sbin/personal-site-deploy
```

The root-owned script validates arguments, fixes the deployment directory and
repository, and keeps a deployment lock. The deploy user must not own or be able
to modify `/opt/personal-site`, its parent, either installed script, or sudoers.

Generate a dedicated Ed25519 key on your trusted workstation. Put its private key
in GitHub's `DEPLOY_SSH_KEY` secret; install only the public key on the VPS. In
`~site-deploy/.ssh/authorized_keys`, prefix its single-line public key with:

```text
restrict,command="/usr/local/bin/personal-site-ssh" ssh-ed25519 YOUR_PUBLIC_KEY
```

Set `.ssh` to mode 700 and `authorized_keys` to 600, owned by `site-deploy`.
This key cannot open a shell, forward ports, copy files, or change server config.

## 3. Authenticate the VPS to GHCR

Create a GitHub PAT **classic** with `read:packages` only, using an account with
read access to the private package. Authorize organization SSO if applicable.
Log Docker in as root because the deploy command runs as root:

```sh
sudo docker login ghcr.io -u YOUR_GITHUB_USERNAME
```

Enter the token at the password prompt. Do not put it in Git, a command argument,
the frontend, or Actions logs. Protect root's Docker credential file or use a
credential helper. The VPS does not need repository access or a publishing token.

## 4. Bootstrap the site and proxy

Find the multi-platform `sha256:...` digest and workflow run number in the
successful Release workflow summary.
Use both values for the first deployment:

```sh
sudo /usr/local/sbin/personal-site-deploy deploy sha256:YOUR_64_HEX_DIGEST RUN_NUMBER
```

The site now has the Docker DNS alias `personal-site` on the proxy network.
Configure an NPM Proxy Host:

| Setting | Value |
| --- | --- |
| Domain Names | `example.cloud` |
| Scheme | `http` |
| Forward Hostname / IP | `personal-site` |
| Forward Port | `80` |
| Cache Assets | Off; the application supplies cache headers |
| SSL Certificate | Request a Let's Encrypt certificate |
| Force SSL | On |

Set an apex DNS A record to the VPS public IPv4 address. Add AAAA only if IPv6
routing and firewall access work. Make ports 80/443 reachable for NPM and its
certificate challenge. Preserve unrelated DNS records. No `www` alias is set up.
Verify HTTPS and certificate renewal in NPM.

NPM must resolve the service alias after container replacements. If the public
check returns 502 after a healthy replacement, inspect the proxy's upstream DNS
behavior and reload the affected proxy configuration; check this during bootstrap.

## 5. Enable automatic deployment

Create a GitHub environment named `production`. No manual approval is needed for
the automatic workflow. Configure these environment secrets:

| Secret | Value |
| --- | --- |
| `DEPLOY_HOST` | VPS hostname or IP |
| `DEPLOY_PORT` | SSH port; defaults to 22 |
| `DEPLOY_USER` | `site-deploy` |
| `DEPLOY_SSH_KEY` | Dedicated private deployment key |
| `DEPLOY_KNOWN_HOSTS` | Verified SSH known-hosts line, including `[host]:port` for a nonstandard port |

Obtain the server host-key fingerprint through your trusted VPS console/admin
connection. Compare it before recording the known-hosts line; do not trust an
unverified `ssh-keyscan` result alone. Actions enforces strict host-key checking.

Set repository variables:

| Variable | Value |
| --- | --- |
| `SITE_URL` | `https://example.cloud` (or your actual HTTPS origin) |
| `DEPLOY_ENABLED` | `true`, only after bootstrap succeeds |

Push your next reviewed change to `main` (or rerun the latest Release workflow).
Confirm the public `/release.txt` equals that commit's full SHA. Then inspect all
eight routes, assets, and themes in a browser. Reboot the VPS once during setup
and confirm Docker/NPM restart and HTTPS work.

## Rollback and failures

On the VPS using your administrator account:

```sh
sudo /usr/local/sbin/personal-site-deploy rollback
```

Rollback swaps the current and previous known-good release; it does not lower the
highest accepted Actions run number. Deployments with a lower run number are
rejected. A failed pull leaves the running release alone. A failed replacement
restores the previous image automatically; a failed first deployment stops the
unsuccessful container. An interrupted replacement is recovered before the next
request. If recovery fails, the pending marker is retained for investigation.

A failed public HTTPS check fails Actions and requires investigation of DNS,
TLS, NPM, and the release. Container failures trigger automatic rollback; the
public check deliberately does not guess whether to roll back a healthy container.
Use the administrator rollback above when needed. Brief interruption during
container replacement is expected.

Keep the Release workflow name/file and its run counter stable. If migrating to
a new workflow or repository, reconcile `/opt/personal-site/state/highest-run`
under administrator control; do not reset it as part of routine deployments.

## Maintenance and troubleshooting

- Enable GitHub Actions failure notifications. Use an external HTTPS uptime check
  if continuous availability alerts are wanted; none is provisioned here.
- Check Actions logs, then run `sudo docker ps --filter label=com.docker.compose.project=personal-site`
  and inspect the affected container's logs/health. NPM logs identify TLS/proxy errors.
- Root-owned `state/current.env`, `state/previous.env`, and `state/highest-run`
  record deployment state. Avoid printing credential files while debugging.
- Renew the read-only PAT before expiry and repeat root's `docker login`. Rotate
  the SSH key by adding the new restricted public key, updating the secret,
  verifying deployment, then removing the old key. Update pinned host keys only
  after independently verifying a legitimate host-key change.
- Keep both current and previous image digests in GHCR and on the VPS. Periodically
  remove older unused images after checking those two references; do not run
  indiscriminate image pruning or delete rollback versions from GHCR.
- Back up NPM configuration/certificates and root-owned deployment config/state.
  Site content is reproducible from Git and image digests; no database is used.

References: [Astro Docker recipe](https://docs.astro.build/en/recipes/docker/),
[GHCR authentication](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry),
[NPM shared Docker networks](https://nginxproxymanager.com/advanced-config/).
