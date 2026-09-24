#!/usr/bin/env bash
set -euo pipefail

SPEC_FILE="shared/aws-resource-list.json"

WORKSPACE_ID=$(jq -r '.ownerWorkspaceId' "$SPEC_FILE")
ID=$(jq -r '.id' "$SPEC_FILE")
REGION=$(jq -r '.spec.region // ""' "$SPEC_FILE")

BASE="${DUPLO_BASE:-$DUPLO_HOST}"
RES="$BASE/v1/aiservicedesk/user/data/workspaces/$WORKSPACE_ID/environment/extensions/aws-resource-lists/$ID"
auth=(-H "Authorization: Bearer $DUPLO_TOKEN" -H "Content-Type: application/json")

# Check for deprovision
MESSAGE="${DUPLO_AGENT_MESSAGE:-}"
if printf '%s' "$MESSAGE" | grep -qi "deprovision\|tear down\|delete"; then
  curl -fsS -X POST "$RES/status" "${auth[@]}" \
    -d '{"status":"DeProvisioned","subStatus":"Nothing to tear down"}'
  echo "Deprovisioned."
  exit 0
fi

# Validate region
if [ -z "$REGION" ]; then
  curl -fsS -X POST "$RES/status" "${auth[@]}" \
    -d '{"status":"Failed","faults":["spec.region is required"]}'
  echo "Failed: region is empty." >&2
  exit 1
fi

# 1. Progress
curl -fsS -X POST "$RES/status" "${auth[@]}" \
  -d "$(jq -nc --arg r "$REGION" '{"status":"Processing","subStatus":("Validating region "+$r)}')"

# 2. Write initial result (EnrichResultAsync fills live instances on every GET)
curl -fsS -X POST "$RES/results" "${auth[@]}" \
  -d '{"instances":[]}'

# 3. Complete
curl -fsS -X POST "$RES/status" "${auth[@]}" \
  -d '{"status":"Complete","subStatus":"Ready — EC2 list will load on view"}'

echo "Done: AWS Resource List ready for region $REGION"
