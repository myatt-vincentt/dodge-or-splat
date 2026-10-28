#!/usr/bin/env bash
# Refuses a release tag that is not bare semver or whose commit is not on main or
# on a hotfix/* branch (cut from the released tag, carrying cherry-picks of fixes
# already on main). Needs full history (checkout fetch-depth: 0) for the ancestry check.
set -euo pipefail

tag="${1:?usage: tag-guard.sh <tag>}"

if ! [[ "$tag" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]]; then
  echo "::error::tags are bare semver (1.2.3), not v1.2.3; got '${tag}'"
  exit 1
fi

git fetch --no-tags origin '+refs/heads/main:refs/remotes/origin/main' '+refs/heads/hotfix/*:refs/remotes/origin/hotfix/*'
sha="$(git rev-list -n1 "refs/tags/${tag}")"
for b in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin/main 'refs/remotes/origin/hotfix/*'); do
  if git merge-base --is-ancestor "$sha" "$b"; then
    echo "tag ${tag} is bare semver and on ${b} (${sha})"
    exit 0
  fi
done

echo "::error::release tag ${tag} is not on main or on a hotfix/* branch (${sha})"
exit 1
