#!/usr/bin/env bash
set -euo pipefail
# Root-owned forced command. Never evaluate client-supplied shell text.
if [[ ${SSH_ORIGINAL_COMMAND:-} =~ ^deploy\ (sha256:[a-f0-9]{64})\ ([1-9][0-9]{0,9})$ ]]; then
    exec sudo -n /usr/local/sbin/personal-site-deploy deploy "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}"
fi
printf 'Only a deployment digest and run number are accepted.\n' >&2
exit 64
