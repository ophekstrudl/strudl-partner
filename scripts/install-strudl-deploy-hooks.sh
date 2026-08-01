#!/usr/bin/env bash
# One-shot setup so this clone passes the Vercel Hobby-plan deploy gate.
#
# - Sets the local commit author to ophek.strudl@gmail.com (so Vercel accepts
#   pushes from this clone for auto-deploy).
# - Points git at the repo-tracked hooks in .githooks/.
# - Optionally records the real contributor for a Co-authored-by trailer.
#
# Usage:
#   ./scripts/install-strudl-deploy-hooks.sh
#   ./scripts/install-strudl-deploy-hooks.sh "Yoav Barney" yoav.barney@gmail.com

set -euo pipefail

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Run this from inside the repo." >&2
  exit 1
fi

OWNER_NAME="Ophek"
OWNER_EMAIL="ophek.strudl@gmail.com"

echo "Setting local commit identity to $OWNER_NAME <$OWNER_EMAIL>..."
git config user.name  "$OWNER_NAME"
git config user.email "$OWNER_EMAIL"

echo "Pointing hooks at .githooks/..."
git config core.hooksPath .githooks
chmod +x .githooks/prepare-commit-msg 2>/dev/null || true

CONTRIB_NAME="${1:-}"
CONTRIB_EMAIL="${2:-}"

if [ -z "$CONTRIB_NAME" ]; then
  read -r -p "Contributor name for Co-authored-by trailer (blank to skip): " CONTRIB_NAME
fi
if [ -n "$CONTRIB_NAME" ] && [ -z "$CONTRIB_EMAIL" ]; then
  read -r -p "Contributor email: " CONTRIB_EMAIL
fi

if [ -n "$CONTRIB_NAME" ] && [ -n "$CONTRIB_EMAIL" ]; then
  git config strudl.contributorName  "$CONTRIB_NAME"
  git config strudl.contributorEmail "$CONTRIB_EMAIL"
  echo "Future commits will include: Co-authored-by: $CONTRIB_NAME <$CONTRIB_EMAIL>"
else
  git config --unset strudl.contributorName  2>/dev/null || true
  git config --unset strudl.contributorEmail 2>/dev/null || true
  echo "No contributor trailer configured — commits will be authored as $OWNER_NAME only."
fi

echo
echo "Verifying:"
echo "  user.name               = $(git config user.name)"
echo "  user.email              = $(git config user.email)"
echo "  core.hooksPath          = $(git config core.hooksPath)"
echo "  strudl.contributorName  = $(git config strudl.contributorName  2>/dev/null || echo '(unset)')"
echo "  strudl.contributorEmail = $(git config strudl.contributorEmail 2>/dev/null || echo '(unset)')"
echo
echo "Done."
