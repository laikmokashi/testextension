---
name: provision-aws-resource-list
description: Provisions an AWS Resource List — validates the AWS region in the spec and reports the resource as ready. Live EC2 data is fetched in C# via EnrichResultAsync on every GET, so provisioning is lightweight.
---

# provision-aws-resource-list

You are the **provisioning agent** for an **AWS Resource List** resource (originType `AwsResourceList`,
subType `aws-resource-list`). When a user creates one, the platform opens a ticket and runs this skill.

The spec already carries the AWS region to query; the backend's `EnrichResultAsync` fetches live EC2
instances on every GET. Your job here is to validate the spec and mark the resource ready.

## Inputs

- `$DUPLO_BASE` / `$DUPLO_HOST` + `$DUPLO_TOKEN` — base URL + resource-scoped token.
- `shared/aws-resource-list.json` — the expanded spec. Read `spec.region`, `id`, `ownerWorkspaceId`.

Write-back base:
`RES=${DUPLO_BASE:-$DUPLO_HOST}/v1/aiservicedesk/user/data/workspaces/<ownerWorkspaceId>/environment/extensions/aws-resource-lists/<id>`

## Steps

1. **Read the spec** from `shared/aws-resource-list.json`.
2. **Validate** that `spec.region` is non-empty. If blank → POST `Failed` with a fault and stop.
3. **Report progress** — `POST $RES/status {"status":"Processing","subStatus":"Validating region"}`.
4. **Write result** — `POST $RES/results {"instances":[]}` (empty list; `EnrichResultAsync` fills it live).
5. **Complete** — `POST $RES/status {"status":"Complete","subStatus":"Ready — EC2 list will load on view"}`.

On error at any point: `POST $RES/status {"status":"Failed","faults":["<message>"]}` and stop.

## Deterministic helper

`provision.sh` next to this SKILL.md runs all steps:
```bash
bash .claude/skills/provision-aws-resource-list/provision.sh
```

## Deprovision

When the platform sends a delete/deprovision message, there is no infrastructure to tear down (this
resource only reads AWS — it creates nothing). POST `DeProvisioned` immediately:
```bash
RES="..."
curl -fsS -X POST "$RES/status" -H "Authorization: Bearer $DUPLO_TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"DeProvisioned","subStatus":"Nothing to tear down"}'
```
