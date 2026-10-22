#!/usr/bin/env bash
# Create the GitHub repository and push this checkout to it.
#
# Needs a GitHub credential that can create repositories: either an
# authenticated `gh` (`gh auth login`) or GH_TOKEN in the environment.
set -euo pipefail

OWNER="${OWNER:-HuasionWu}"
NAME="${NAME:-dsh-ascii-sharks}"
VISIBILITY="${VISIBILITY:-public}"

cd "$(dirname "$0")/.."

if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin "git@github.com:${OWNER}/${NAME}.git"
fi

if gh repo view "${OWNER}/${NAME}" >/dev/null 2>&1; then
  echo "repository ${OWNER}/${NAME} already exists; pushing"
  git push -u origin HEAD
else
  gh repo create "${OWNER}/${NAME}" \
    --"${VISIBILITY}" \
    --description "ASCII sharks and schooling fish swimming behind the DeepSeek Harness conversation column." \
    --source . \
    --remote origin \
    --push
fi

echo "done: https://github.com/${OWNER}/${NAME}"
