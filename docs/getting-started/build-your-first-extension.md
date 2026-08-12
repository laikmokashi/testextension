# 4. Build your first extension

**What you'll do:** build **s3-guard** — an S3 security posture dashboard — by describing it to
`/duplo-extension` in Claude Code, and load it into the platform you already have running.

**What you need first:** [2. Connect AWS](connect-aws.md) — the `aws-readonly` scope, attached to the
`extension-dev` workspace. The scan on this page reads a real AWS account through that scope, so it is
what makes the dashboard fill with your own buckets instead of nothing.

[3. Connect Kubernetes](connect-kubernetes.md) is **not** needed for this page. Nothing here touches a
cluster. If you skipped it, carry on.

---

## 4.1 What you are building

An **extension** is a first-class resource type. Not a plugin bolted onto a page, and not a script:
the platform gains a new kind of thing it can create, list, show and provision, with its own C#
backend (controller, service, entity, its own REST route and its own database collection), its own
Angular UI loaded into the portal as a remote, and its own provisioning logic. The platform
**hot-loads** it into the running stack — new route, new collection, new UI, no host restart. Once it
is loaded it is indistinguishable from a resource type that shipped with the product.

`s3-guard` is one such resource type, called **S3 Security Scan**. A scan is a thing you create — you
give it a name, an AWS region, the scope to scan with, and optionally a bucket to send access logs to
— and provisioning does the work:

- **The scan.** Using the scope's AWS credentials, it inspects every S3 bucket in that region and
  checks each one against six rules: Block Public Access not fully enabled, a policy or ACL allowing
  public read or public write, default encryption off, versioning off, server access logging off, and
  TLS not enforced. Each rule carries a severity, from Critical down to Low. The results are stored on
  the resource rather than re-read live on every page load, and every run appends a summary snapshot.

- **The dashboard.** The scan's detail page: how many buckets were scanned, how many are clean, how
  many have at least one violation, a count per rule, and a chart of violations over time — which is
  what those snapshots are for. Below it, a table of only the buckets that failed something.

- **The per-bucket detail view.** Click a failing bucket and you get every violation it has, what was
  found, why it matters, and an action plan describing the exact remediation for each one.

- **The Remediate button.** Each violation on that page is a checkbox, ticked by default. **Remediate**
  applies the fix for the ticked ones, re-scans that bucket, and updates its result. Read [4.4](#44-give-it-the-specification)
  before you press it.

There can be several scans — one per region, re-run over time — so they are listed under their own
**S3 Guard** group in the left navigation.

You do not write any of this by hand. `/duplo-extension` interviews you, plans it, and builds it.

## 4.2 Open Claude Code in the dev kit

Leave the browser tab open; you come back to it in [4.6](#46-see-it-in-the-portal).

1. In a terminal or in VS Code, go to the directory you cloned on
   [1. Install and sign in](install.md#11-clone-the-dev-kit).

   ```bash
   cd my-extension
   ```

2. Start Claude Code **in that directory**.

   That matters. Claude Code picks up the `.claude/` directory in this repo, and that directory is the
   only reason `/duplo-extension` exists — it is defined in
   [`.claude/commands/duplo-extension.md`](../../.claude/commands/duplo-extension.md), and it hands off
   to the `duplo-extension-dev` skill, which reads the authoring guides in
   [`.claude/skills/duplo-extension-dev/reference/`](../../.claude/skills/duplo-extension-dev/reference)
   as it builds. Started anywhere else, Claude Code knows nothing about this dev kit and the command is
   not there.

## 4.3 Run `/duplo-extension`

```
/duplo-extension
```

Before it asks you anything, it probes the platform: it reads `DUPLO_TARGET` from `.env` and checks
whether the local stack answers, along with any remote platform you have configured. Then it asks
where to build:

> Use the local dev-kit platform, or a remote one?

Choose **local**. That is the stack you brought up on page 1 and connected AWS to on page 2, and it is
the target the `scripts/` in this repo read from `.env` as well.

If it reports that the local stack is **down**, `./run.sh` is not running. Start it in another terminal,
then run the command again.

## 4.4 Give it the specification

With the target settled, the command asks what you want to build. The question arrives as a set of
options with **Other** at the bottom. Pick **Other** — the offered options are starting points, and you
are supplying the whole requirement — then paste the block below into the free-text box.

Paste it whole rather than inventing something of your own. Written out this way it settles nearly
everything the intake would otherwise draw out of you one question at a time — the resource shape, the
provisioning mode, where it lands in the navigation, how results are stored — so the command can go
almost straight to a plan.

```text
Build an extension called s3-guard: a security posture dashboard for S3 buckets.

Use the AWS scope attached to the dev workspace for testing — if the scope name I give you
doesn't exist, just use the one that's there, don't stop to ask. Note that Remediate needs S3
write permissions: with read-only credentials scanning works fine and every Remediate comes
back AccessDenied. That's the expected result, not a bug to chase.

One resource type, "S3 Security Scan". The spec is a name, an AWS region, the scope to scan
with, and an optional log target bucket. Provisioning uses the scope's AWS credentials to
inspect every S3 bucket in that region and check it against these rules:

  - Block Public Access is not fully enabled
  - the bucket policy or ACL allows public read or public write
  - default encryption is off
  - versioning is off
  - server access logging is off
  - TLS is not enforced (no aws:SecureTransport deny in the policy)

Severity per rule: public read/write are Critical, Block Public Access and TLS are High,
encryption is Medium, versioning and logging are Low.

This is deterministic work — do it in a background worker, not an agent skill.

The result records, per bucket, which rules it fails. Store the results on the resource rather
than rescanning live on every page load, and have each run append a summary snapshot so the
dashboard can show progress over time.

Put it in a new top-level nav group called "S3 Guard".

There can be several scans (one per region, re-run over time), so the nav lists the scans and
each scan's detail page is the dashboard: total buckets scanned, how many are clean, how many
have at least one violation, a count per rule, and a chart of violations over time. Below that,
a table of only the buckets that failed something — bucket name, region, number of violations,
worst severity.

Clicking a bucket opens a detail view for that bucket showing every violation with what was
found and why it matters, and an action plan describing the exact remediation for each one.
Each violation is a checkbox, all ticked by default, and there is a Remediate button. Remediate
applies the fix for only the ticked violations, then re-scans that bucket and updates its result.

Server access logging can't be turned on without a destination bucket. If the log target bucket
is set, remediate it; if it's blank, still report the violation but disable its checkbox and say
why. Don't auto-create a log bucket.

Use chart.js for the charts. Build the frontend on whatever stack the current dev-kit template
ships — don't carry one over from an older dev-kit.

Deleting a scan tears nothing down, and never reverts a remediation.

Keep it to this one resource type. Do not add a parent-child hierarchy.
```

> **Remediate will not work, and that is the expected result.** The IAM user you created on
> [page 2](connect-aws.md#21-create-an-iam-user-and-access-key) has `ReadOnlyAccess`. The scan reads
> every bucket's configuration, so the dashboard, the per-bucket detail, the violations and the action
> plans all work — but nothing that credential holds can change a bucket, so pressing **Remediate**
> returns `AccessDenied`. That is not a bug and there is nothing to chase. To make **Remediate** work,
> give that IAM user write access to the buckets you want to fix, or attach a second, more privileged
> scope and scan with that one instead. Read-only is the safer default for a machine you have just set
> up, which is why page 2 chose it.

## 4.5 Approve the plan

Claude Code does not start building from the paste. It works through the rest of its intake first:

1. **It confirms the name.** It proposes `s3-guard` back to you and says what that name drives — the
   extension id, the resource type, the REST route under `extensions/`, and the name of the UI remote.
   Confirm it or change it.

2. **It confirms the scope.** It lists the scopes the `extension-dev` workspace actually has and asks
   which to test with. `aws-readonly` from page 2 is the one you want; the specification already tells
   it to take whatever AWS scope is there rather than stopping to ask.

3. **It asks anything still genuinely ambiguous.** The specification is detailed enough that this
   should be short, and it may be nothing at all.

4. **Then it presents one plan.** Not a plan per file — one, covering the whole build: a table of spec
   fields, a table of result fields, a walkthrough of the UI (where it lands in the left nav, the
   create form, the list, the detail view), the files it will create under `extensions/s3-guard/`, and
   the exact build and deploy commands it intends to run.

Read that plan; it is your one chance to change the shape before anything is written. Then approve it
**once**. Approving covers the whole build, which is the point — the alternative is a permission prompt
for every `dotnet`, `npm` and `curl` along the way.

From there it runs unattended: scaffold the extension into `extensions/s3-guard/`, pin the host's SDK
version, compile the C# backend, install and build the Angular remote, package it all into
`extensions/s3-guard/dist/extension.zip`, and push that bundle into the running platform, which
hot-loads it. Those last two steps are the same two commands you would run by hand:

```bash
./scripts/build-extension.sh  extensions/s3-guard
./scripts/deploy-extension.sh extensions/s3-guard/dist/extension.zip
```

Their flags are in the [CLI reference](../cli-reference.md). If the build fails to reach the host SDK,
that symptom is in [troubleshooting.md](../troubleshooting.md#extensions).

## 4.6 See it in the portal

1. Go back to the browser and **reload the tab**. The left navigation is built when the portal loads,
   so a tab that was open through the deploy will not show the new group until you do.

2. **S3 Guard** is now a top-level group in the left nav, alongside the built-in sections, with your
   scans listed under it.

3. Create a scan. Fill in the name and the AWS region you want to look at, select the `aws-readonly`
   scope, and leave the log target bucket blank unless you have a bucket to send access logs to.

4. Provisioning runs the scan in the background. When it completes, open the scan and its detail page
   is the dashboard: the totals, the per-rule counts, the chart, and the table of buckets that failed
   something. Click one of those buckets for its violations and its action plan.

Nothing is scanned until you create a scan — an empty **S3 Guard** group straight after the deploy is
the extension working, not failing.

That is the whole loop, and it is the loop for anything else you build: describe it, approve one plan,
and it is a first-class part of the platform.

**Next:** [6. Where to next](where-to-next.md)

> **5. Use the Terraform extension — coming soon.** A walkthrough of the real, shipping Terraform
> extension is in progress and will be added here.
