"""Exercise deployment transitions with a fake Docker CLI; no VPS required."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
DIGEST_A = 'sha256:' + 'a' * 64
DIGEST_B = 'sha256:' + 'b' * 64
REPO = 'ghcr.io/owner/personal-site'

FAKE_DOCKER = '''#!/usr/bin/env python3
import os, pathlib, sys
args = sys.argv[1:]
root = pathlib.Path(os.environ['FAKE_ROOT'])
with (root / 'calls').open('a') as out: out.write(' '.join(args) + '\\n')
if args[0] == 'inspect':
    print('healthy')
    sys.exit(0)
envfile = pathlib.Path(args[args.index('--env-file') + 1])
reference = envfile.read_text().splitlines()[0].split('=', 1)[1]
if 'pull' in args and os.environ.get('FAIL_PULL') == 'yes': sys.exit(1)
if 'up' in args:
    (root / 'active').write_text(reference)
    if reference == os.environ.get('FAIL_REFERENCE'): sys.exit(1)
if 'down' in args: (root / 'active').unlink(missing_ok=True)
if 'ps' in args: print('container-id')
'''


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'bin').mkdir()
        docker = self.root / 'bin/docker'
        docker.write_text(FAKE_DOCKER)
        docker.chmod(0o755)
        (self.root / 'config.env').write_text(f'IMAGE_REPOSITORY={REPO}\nPROXY_NETWORK=proxy\n')
        (self.root / 'compose.yml').write_text('')
        self.script = self.root / 'deploy.sh'
        self.script.write_text((ROOT / 'deploy/deploy.sh').read_text().replace(
            'SITE_DIR=/opt/personal-site', f'SITE_DIR={self.root}'))
        self.env = dict(os.environ, PATH=f'{self.root}/bin:' + os.environ['PATH'], FAKE_ROOT=str(self.root))

    def run_deploy(self, *args, **env):
        return subprocess.run(['bash', str(self.script), *args], env=dict(self.env, **env),
                              capture_output=True, text=True, timeout=10)

    def deploy(self, digest=DIGEST_A, run='1'):
        result = self.run_deploy('deploy', digest, run)
        self.assertEqual(result.returncode, 0, result.stderr)

    def current(self):
        return (self.root / 'state/current.env').read_text()

    def test_initial_and_successful_replacement(self):
        self.deploy()
        self.deploy(DIGEST_B, '2')
        self.assertIn(DIGEST_B, self.current())
        self.assertIn(DIGEST_A, (self.root / 'state/previous.env').read_text())
        self.assertFalse((self.root / 'state/pending').exists())

    def test_stale_run_is_rejected_before_docker_changes(self):
        self.deploy(DIGEST_B, '2')
        calls = (self.root / 'calls').read_text()
        result = self.run_deploy('deploy', DIGEST_A, '1')
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(calls, (self.root / 'calls').read_text())
        self.assertIn(DIGEST_B, self.current())

    def test_failed_pull_preserves_release_and_watermark(self):
        self.deploy()
        result = self.run_deploy('deploy', DIGEST_B, '2', FAIL_PULL='yes')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(DIGEST_A, self.current())
        self.assertEqual((self.root / 'state/highest-run').read_text().strip(), '1')

    def test_failed_replacement_restores_running_release(self):
        self.deploy()
        result = self.run_deploy('deploy', DIGEST_B, '2', FAIL_REFERENCE=f'{REPO}@{DIGEST_B}')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(DIGEST_A, self.current())
        self.assertIn(DIGEST_A, (self.root / 'active').read_text())
        self.assertEqual((self.root / 'state/highest-run').read_text().strip(), '2')
        self.assertFalse((self.root / 'state/pending').exists())

    def test_failed_first_release_stops_container(self):
        result = self.run_deploy('deploy', DIGEST_A, '1', FAIL_REFERENCE=f'{REPO}@{DIGEST_A}')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.root / 'active').exists())
        self.assertFalse((self.root / 'state/current.env').exists())

    def test_manual_rollback_preserves_stale_run_protection(self):
        self.deploy()
        self.deploy(DIGEST_B, '2')
        result = self.run_deploy('rollback')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn(DIGEST_A, self.current())
        self.assertIn(DIGEST_B, (self.root / 'state/previous.env').read_text())
        self.assertEqual((self.root / 'state/highest-run').read_text().strip(), '2')

    def test_rollback_without_previous_release_fails(self):
        self.assertNotEqual(self.run_deploy('rollback').returncode, 0)

    def test_interrupted_replacement_is_recovered(self):
        self.deploy()
        (self.root / 'state/pending').touch()
        (self.root / 'active').write_text(f'{REPO}@{DIGEST_B}')
        result = self.run_deploy('deploy', DIGEST_B, '2', FAIL_PULL='yes')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(DIGEST_A, (self.root / 'active').read_text())
        self.assertFalse((self.root / 'state/pending').exists())

    def test_malformed_input_is_rejected(self):
        for args in [('deploy', 'latest', '1'), ('deploy', DIGEST_A, '01'),
                     ('deploy', DIGEST_A, '1;id'), ('deploy', DIGEST_A, '1', 'extra')]:
            with self.subTest(args=args):
                self.assertNotEqual(self.run_deploy(*args).returncode, 0)
        self.assertFalse((self.root / 'calls').exists())

    def test_ssh_forced_command_rejects_shell_injection(self):
        for command in ['', 'bash', f'deploy {DIGEST_A} 1; id', f'deploy {DIGEST_A} 1 extra']:
            result = subprocess.run(['bash', str(ROOT / 'deploy/ssh-entrypoint.sh')],
                                    env=dict(self.env, SSH_ORIGINAL_COMMAND=command),
                                    capture_output=True, timeout=10)
            self.assertEqual(result.returncode, 64)


if __name__ == '__main__':
    unittest.main()
