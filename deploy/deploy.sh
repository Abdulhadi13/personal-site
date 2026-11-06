#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
SITE_DIR=/opt/personal-site
cd "$SITE_DIR"
# This directory, its config, scripts, and state must be root-owned.
# shellcheck source=/dev/null
source ./config.env
[[ ${IMAGE_REPOSITORY:-} =~ ^ghcr\.io/[a-z0-9][a-z0-9._-]*/personal-site$ ]] || { echo 'Invalid IMAGE_REPOSITORY' >&2; exit 64; }
[[ ${PROXY_NETWORK:-} =~ ^[a-zA-Z0-9][a-zA-Z0-9_.-]*$ ]] || { echo 'Invalid PROXY_NETWORK' >&2; exit 64; }
mkdir -p state
exec 9>state/deploy.lock
flock -x 9

compose() {
    env -u IMAGE_REFERENCE -u PROXY_NETWORK docker compose --project-directory "$SITE_DIR" \
        --env-file "$1" -f compose.yml "${@:2}"
}
healthy() {
    local id status attempt
    id=$(compose "$1" ps -aq site)
    [[ -n $id ]] || return 1
    for ((attempt=0; attempt<30; attempt++)); do
        status=$(docker inspect --format '{{.State.Health.Status}}' "$id" 2>/dev/null) || return 1
        [[ $status == healthy ]] && return 0
        [[ $status == unhealthy ]] && return 1
        sleep 2
    done
    return 1
}
write_release() {
    printf 'IMAGE_REFERENCE=%s\nPROXY_NETWORK=%s\n' "$1" "$PROXY_NETWORK" > "$2"
}
valid_release() {
    local reference network extra
    [[ -f $1 ]] || return 1
    { read -r reference; read -r network; read -r extra || true; } < "$1"
    [[ $reference == "IMAGE_REFERENCE=$IMAGE_REPOSITORY@sha256:"* &&
        ${reference##*@} =~ ^sha256:[a-f0-9]{64}$ &&
        $network == "PROXY_NETWORK=$PROXY_NETWORK" && -z $extra ]]
}
# Recover an interrupted replacement before starting another one.
if [[ -f state/pending ]]; then
    if valid_release state/current.env; then
        compose state/current.env up -d --wait --wait-timeout 90
        healthy state/current.env
    else
        compose state/candidate.env down
    fi
    rm -f state/pending
fi

mode=${1:-}
case "$mode" in
    deploy)
        [[ $# == 3 && $2 =~ ^sha256:[a-f0-9]{64}$ && $3 =~ ^[1-9][0-9]{0,9}$ ]] || exit 64
        sequence=$3
        highest=0
        if [[ -f state/highest-run ]]; then
            read -r highest < state/highest-run
            [[ $highest =~ ^[0-9]{1,10}$ ]] || exit 65
        fi
        (( sequence >= highest )) || { echo 'Refusing stale deployment' >&2; exit 65; }
        write_release "$IMAGE_REPOSITORY@$2" state/candidate.env
        ;;
    rollback)
        [[ $# == 1 ]] || exit 64
        valid_release state/previous.env || { echo 'No valid previous release' >&2; exit 66; }
        cp state/previous.env state/candidate.env
        ;;
    *) echo 'Usage: personal-site-deploy deploy sha256:DIGEST RUN_NUMBER | rollback' >&2; exit 64 ;;
esac

# A failed pull must leave the running release untouched.
compose state/candidate.env pull site
if [[ $mode == deploy ]]; then
    printf '%s\n' "$sequence" > state/highest-run.tmp
    mv state/highest-run.tmp state/highest-run
fi
restore_on_failure() {
    local result=$?
    trap - EXIT INT TERM
    if [[ -f state/pending ]]; then
        echo 'Replacement failed; restoring previous running release.' >&2
        if valid_release state/current.env; then
            if compose state/current.env up -d --wait --wait-timeout 90 && healthy state/current.env; then
                rm -f state/pending
            else
                echo 'RESTORE FAILED: inspect Docker and retry on the VPS.' >&2
            fi
        else
            if compose state/candidate.env down; then rm -f state/pending; fi
        fi
        (( result != 0 )) || result=1
    fi
    exit "$result"
}
trap restore_on_failure EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
: > state/pending
compose state/candidate.env up -d --wait --wait-timeout 90
healthy state/candidate.env
if [[ -f state/current.env ]]; then
    cp state/current.env state/previous.env.tmp
    mv state/previous.env.tmp state/previous.env
fi
mv state/candidate.env state/current.env
rm -f state/pending
trap - EXIT INT TERM
printf 'Release active: %s\n' "$(head -n 1 state/current.env)"
