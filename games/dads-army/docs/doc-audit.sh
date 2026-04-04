#!/usr/bin/env bash
# ==========================================================================
# doc-audit.sh — Analyze code changes and report documentation actions needed
#
# Usage:
#   bash docs/doc-audit.sh              # Analyze uncommitted changes
#   bash docs/doc-audit.sh --commit HEAD  # Analyze the last commit
#   bash docs/doc-audit.sh --staged       # Analyze staged changes only
#
# Run from the dads-army/ directory.
# ==========================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DOC_MAP="$SCRIPT_DIR/doc-map.json"

# Colors (safe for Git Bash on Windows)
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

# ---------- Parse arguments ----------
MODE="working"  # working | staged | commit
COMMIT_REF=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --commit) MODE="commit"; COMMIT_REF="${2:-HEAD}"; shift 2 ;;
    --staged) MODE="staged"; shift ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# ---------- Get changed files ----------
cd "$PROJECT_DIR"

case "$MODE" in
  working)
    CHANGED_FILES=$(git diff --name-only 2>/dev/null; git diff --cached --name-only 2>/dev/null; git ls-files --others --exclude-standard 2>/dev/null)
    COMMIT_MSG="(uncommitted changes)"
    DIFF_CONTENT=$(git diff 2>/dev/null; git diff --cached 2>/dev/null)
    ;;
  staged)
    CHANGED_FILES=$(git diff --cached --name-only 2>/dev/null)
    COMMIT_MSG="(staged changes)"
    DIFF_CONTENT=$(git diff --cached 2>/dev/null)
    ;;
  commit)
    CHANGED_FILES=$(git diff-tree --no-commit-id --name-only -r "$COMMIT_REF" 2>/dev/null)
    COMMIT_MSG=$(git log -1 --format="%s" "$COMMIT_REF" 2>/dev/null || echo "")
    DIFF_CONTENT=$(git show "$COMMIT_REF" 2>/dev/null || echo "")
    ;;
esac

# Remove duplicates and filter to dads-army files only
CHANGED_FILES=$(echo "$CHANGED_FILES" | sort -u | grep -v '^$' || true)

if [[ -z "$CHANGED_FILES" ]]; then
  echo -e "${GREEN}No changes detected. Documentation is up to date.${NC}"
  exit 0
fi

# ---------- Mapping logic (no jq dependency) ----------
# We parse doc-map.json with grep/sed for portability on Windows Git Bash

declare -A DOC_REASONS
DOCS_ALREADY_CHANGED=""
NEEDS_BUG=false
NEEDS_TODO=false
NEEDS_ARCH=false

# Check each changed file against path rules
while IFS= read -r file; do
  # Strip leading path to get relative to dads-army/
  rel_file="${file#games/dads-army/}"

  # Check if this file IS a doc file (already being updated)
  if [[ "$rel_file" == docs/* ]]; then
    DOCS_ALREADY_CHANGED="$DOCS_ALREADY_CHANGED ${rel_file#docs/}"
    continue
  fi

  # Match against known patterns
  case "$rel_file" in
    src/api/queries.js)
      DOC_REASONS["architecture.md"]+="  - $rel_file changed (query layer)\n"
      DOC_REASONS["setup.md"]+="  - $rel_file changed (may affect setup if new RPCs)\n"
      ;;
    src/api/subscriptions.js)
      DOC_REASONS["architecture.md"]+="  - $rel_file changed (realtime subscriptions)\n"
      ;;
    src/api/supabaseClient.js)
      DOC_REASONS["architecture.md"]+="  - $rel_file changed (client config)\n"
      DOC_REASONS["setup.md"]+="  - $rel_file changed (credentials/config)\n"
      ;;
    src/main.js)
      DOC_REASONS["architecture.md"]+="  - $rel_file changed (bootstrap/scene flow)\n"
      ;;
    src/systems/AuthManager.js)
      DOC_REASONS["architecture.md"]+="  - $rel_file changed (auth/security)\n"
      DOC_REASONS["setup.md"]+="  - $rel_file changed (auth setup)\n"
      ;;
    src/systems/SceneManager.js)
      DOC_REASONS["architecture.md"]+="  - $rel_file changed (scene lifecycle)\n"
      ;;
    src/systems/ResourceCalculator*)
      DOC_REASONS["resources.md"]+="  - $rel_file changed\n"
      ;;
    src/systems/CombatPredictor*)
      DOC_REASONS["combat.md"]+="  - $rel_file changed\n"
      ;;
    src/systems/SupplyChain*)
      DOC_REASONS["supply-lines.md"]+="  - $rel_file changed\n"
      ;;
    src/systems/DepletionTracker*)
      DOC_REASONS["resources.md"]+="  - $rel_file changed (depletion)\n"
      DOC_REASONS["server-lifecycle.md"]+="  - $rel_file changed (depletion timing)\n"
      ;;
    src/config/resourceDefs*) DOC_REASONS["resources.md"]+="  - $rel_file changed\n" ;;
    src/config/buildingDefs*) DOC_REASONS["cities.md"]+="  - $rel_file changed\n" ;;
    src/config/unitDefs*) DOC_REASONS["military.md"]+="  - $rel_file changed\n" ;;
    src/config/researchDefs*) DOC_REASONS["research-tree.md"]+="  - $rel_file changed\n" ;;
    src/config/alignmentDefs*) DOC_REASONS["alignments.md"]+="  - $rel_file changed\n" ;;
    src/config/gameConfig*) DOC_REASONS["server-lifecycle.md"]+="  - $rel_file changed\n" ;;
    src/scenes/*Map*) DOC_REASONS["map.md"]+="  - $rel_file changed\n"; DOC_REASONS["architecture.md"]+="  - $rel_file changed (scene)\n" ;;
    src/scenes/*City*) DOC_REASONS["cities.md"]+="  - $rel_file changed\n"; DOC_REASONS["architecture.md"]+="  - $rel_file changed (scene)\n" ;;
    src/scenes/*Army*) DOC_REASONS["military.md"]+="  - $rel_file changed\n"; DOC_REASONS["architecture.md"]+="  - $rel_file changed (scene)\n" ;;
    src/scenes/*Research*) DOC_REASONS["research-tree.md"]+="  - $rel_file changed\n"; DOC_REASONS["architecture.md"]+="  - $rel_file changed (scene)\n" ;;
    src/scenes/*Diplomacy*) DOC_REASONS["diplomacy.md"]+="  - $rel_file changed\n"; DOC_REASONS["architecture.md"]+="  - $rel_file changed (scene)\n" ;;
    src/scenes/*Intelligence*) DOC_REASONS["intelligence.md"]+="  - $rel_file changed\n"; DOC_REASONS["architecture.md"]+="  - $rel_file changed (scene)\n" ;;
    src/scenes/*) DOC_REASONS["architecture.md"]+="  - $rel_file changed (scene)\n" ;;
    src/map/*) DOC_REASONS["map.md"]+="  - $rel_file changed\n"; DOC_REASONS["architecture.md"]+="  - $rel_file changed (map system)\n" ;;
    src/ui/*) DOC_REASONS["architecture.md"]+="  - $rel_file changed (UI panel)\n" ;;
    sql/*core_tables*) DOC_REASONS["architecture.md"]+="  - $rel_file changed (core schema)\n" ;;
    sql/*map_tables*) DOC_REASONS["architecture.md"]+="  - $rel_file changed\n"; DOC_REASONS["map.md"]+="  - $rel_file changed (map schema)\n" ;;
    sql/*city_tables*) DOC_REASONS["architecture.md"]+="  - $rel_file changed\n"; DOC_REASONS["cities.md"]+="  - $rel_file changed (city schema)\n" ;;
    sql/*military_tables*) DOC_REASONS["architecture.md"]+="  - $rel_file changed\n"; DOC_REASONS["military.md"]+="  - $rel_file changed\n"; DOC_REASONS["combat.md"]+="  - $rel_file changed\n" ;;
    sql/*research_tables*) DOC_REASONS["architecture.md"]+="  - $rel_file changed\n"; DOC_REASONS["research-tree.md"]+="  - $rel_file changed\n" ;;
    sql/*economy_tables*) DOC_REASONS["architecture.md"]+="  - $rel_file changed\n"; DOC_REASONS["economy.md"]+="  - $rel_file changed\n" ;;
    sql/*rls*) DOC_REASONS["architecture.md"]+="  - $rel_file changed (RLS/security)\n" ;;
    sql/*functions*) DOC_REASONS["architecture.md"]+="  - $rel_file changed (game functions)\n" ;;
    sql/*cron*) DOC_REASONS["architecture.md"]+="  - $rel_file changed\n"; DOC_REASONS["server-lifecycle.md"]+="  - $rel_file changed (cron)\n" ;;
    sql/seed_*) DOC_REASONS["setup.md"]+="  - $rel_file changed (seed data)\n" ;;
    index.html) DOC_REASONS["architecture.md"]+="  - $rel_file changed (entry point)\n" ;;
  esac
done <<< "$CHANGED_FILES"

# ---------- Check commit message patterns ----------
MSG_LOWER=$(echo "$COMMIT_MSG" | tr '[:upper:]' '[:lower:]')

if echo "$MSG_LOWER" | grep -qiE 'fix|bug|broken|error|wrong|mismatch|missing'; then
  NEEDS_BUG=true
  DOC_REASONS["bug.md"]+="  - Commit message suggests bug fix: \"$COMMIT_MSG\"\n"
fi

if echo "$MSG_LOWER" | grep -qiE 'add|implement|create|new feature|introduce'; then
  NEEDS_TODO=true
  DOC_REASONS["todo.md"]+="  - Commit message suggests new feature: \"$COMMIT_MSG\"\n"
fi

if echo "$MSG_LOWER" | grep -qiE 'schema|alter|create table|refactor|restructure'; then
  DOC_REASONS["architecture.md"]+="  - Commit message suggests structural change\n"
fi

# ---------- Output report ----------
echo ""
echo -e "${CYAN}=== Documentation Audit Report ===${NC}"
echo -e "Mode: $MODE"
echo -e "Changed files: $(echo "$CHANGED_FILES" | wc -l | tr -d ' ') files"
echo ""

HAS_NEEDS=false
HAS_UPDATED=false

# NEEDS UPDATE
for doc in $(echo "${!DOC_REASONS[@]}" | tr ' ' '\n' | sort -u); do
  # Check if this doc was already modified in the changeset
  if echo "$DOCS_ALREADY_CHANGED" | grep -q "$doc"; then
    continue  # Will show in "already updated" section
  fi
  if [[ ! $HAS_NEEDS == true ]]; then
    echo -e "${RED}NEEDS UPDATE:${NC}"
    HAS_NEEDS=true
  fi
  echo -e "  ${RED}[!]${NC} docs/$doc"
  echo -e "${DOC_REASONS[$doc]}"
done

# ALREADY UPDATED
for doc in $(echo "${!DOC_REASONS[@]}" | tr ' ' '\n' | sort -u); do
  if echo "$DOCS_ALREADY_CHANGED" | grep -q "$doc"; then
    if [[ ! $HAS_UPDATED == true ]]; then
      echo -e "${GREEN}POSSIBLY ALREADY UPDATED:${NC}"
      HAS_UPDATED=true
    fi
    echo -e "  ${GREEN}[~]${NC} docs/$doc — modified in this changeset"
  fi
done

# ALWAYS
echo ""
echo -e "${YELLOW}ALWAYS (end of session):${NC}"
echo -e "  [ ] docs/development-log.md — Add dated entry summarizing work done"

if [[ $HAS_NEEDS == false && $HAS_UPDATED == false ]]; then
  echo ""
  echo -e "${GREEN}No documentation gaps detected for code changes.${NC}"
fi

echo ""
