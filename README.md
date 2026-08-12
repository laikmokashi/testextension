# DuploCloud Extension Developer Kit

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/duplocloud/devkit?label=release)](https://github.com/duplocloud/devkit/releases)

> **Separate terms govern part of this repository.** The container images and the DuploCloud UI
> library are licensed pursuant to the [TERMS](TERMS.md), not the Apache Software License 2.0
> (as described in the [LICENSE](LICENSE) file). Those TERMS include an agreement to arbitrate
> and a class action waiver.

Run the DuploCloud AI HelpDesk platform on your laptop from published images — then build your own
**AI App** against it. Each AI App you write ships a backend, a UI, and its own provisioning, and
hot-loads into the running platform with no restart.

![The DuploCloud platform running locally, with the New Extension form filled in](docs/images/devkit-new-extension.png)

That is the real platform, on `localhost:4210`, after `./run.sh` — sidebar, workspace selector, and all.
The form above is Extension Studio: describe the resource you want, and an agent builds the backend, the
UI, and the provisioning skill, then hot-loads it into the running platform.

## Why you'd want it

- **A whole platform, locally.** Five containers, one command.
- **Your own resource types.** Not plugins bolted on the side — they get a REST API, a portal UI, and a
  provisioning workflow, exactly like the built-in types.
- **Hot-load, no restart.** Build, deploy, and the new type is live in the UI seconds later.
- **AI-guided authoring.** `/duplo-extension` in Claude Code scaffolds and builds an AI App from a
  plain-language requirement.

## Quick start

You need **Docker with Compose v2**, **Python 3** (`python3` on your `PATH` — `run.sh` and the scripts
under `scripts/` use it to edit `.env` and to read JSON API responses), and **an LLM key** — Anthropic,
Azure, or AWS Bedrock. `./run.sh` checks for Docker and Python before it does anything else and tells you
what is missing.

```bash
git clone https://github.com/duplocloud/devkit my-extension && cd my-extension
./run.sh
```

First run asks for an admin **email** — use your **work address**, personal domains (gmail.com, …) are not
accepted — and DuploCloud emails you a **verification link**. Click it and the run continues on its own, then
asks for a **password** and an **LLM provider** and brings the stack up, registering your chosen provider's
model as the **System default LLM**, so the ticket LLM picker works whichever provider you picked. Sign in at
**<http://localhost:4210>**.

That is the platform up. To make it *do* something, pick one:

→ **[Quickstart](docs/quickstart.md)** — connect an AWS account: a read-only access key, then a
provider, a credential, and a scope. You end up able to ask the agent real questions about that
account — "list all S3 buckets" — and get real answers back.

→ **[Getting started](docs/getting-started/README.md)** — the full path, one page at a time: adopting the
repo, connecting AWS and Kubernetes, and authoring and deploying your first AI App.

> **Running on EC2? No keys needed.** Before asking for a key, `./run.sh` checks whether this host is an EC2
> instance whose IAM role can actually invoke Bedrock — it makes a real (1-token) Converse call, then checks
> that containers can reach IMDS too. If the role works, the provider menu gains a third option that uses it
> directly, storing **no** credentials in `.env`: `./run.sh --model bedrock-instance-role` (or pick 3 at the
> prompt). Run the check on its own with `./scripts/detect-bedrock.sh` — it needs only `python3` and `curl`
> (no AWS CLI, no boto3). If the role works on the host but a container is **proven** unable to reach IMDS,
> the option is withheld: that's the IMDSv2 hop limit, so raise it with
> `aws ec2 modify-instance-metadata-options --instance-id <id> --http-put-response-hop-limit 2`. If the
> container check merely couldn't run (Docker not installed yet, daemon down, `busybox` unpullable) the
> option is still offered, flagged as unverified.

## What you get

| | |
| --- | --- |
| `docker-compose.yml` | The platform from published images — mongo, studio, agent, ui, xterm |
| `.env` / `.env.example` | Image tags, auth, LLM credentials, and the build target |
| `run.sh` `stop.sh` `logs.sh` | Lifecycle |
| `scripts/` | Build, deploy, register, and upgrade |
| `samples/` | Worked reference extensions |
| `.claude/` | The `/duplo-extension` authoring command, its skill, and 16 reference guides |
| `extensions/terraform/` | The real, shipping **Terraform extension** — source, fetched once by `run.sh`, disconnected from git and yours to modify |
| `extensions/<name>/` | **Yours** (subject to our and any third party's rights in the underlying software and technology upon which they are built). The one thing an upgrade never touches |

## Documentation

| Page | What it covers |
| --- | --- |
| [Getting started](docs/getting-started/README.md) | Prerequisites, adopting the repo, and your first extension |
| [Architecture](docs/architecture.md) | How the services fit together and how hot-loading works |
| [Configuration](docs/configuration.md) | Every `.env` variable, its default, and its effect |
| [CLI reference](docs/cli-reference.md) | `run.sh`, `stop.sh`, `logs.sh`, and every script — flags and behavior |
| [Upgrading](docs/upgrading.md) | Taking framework updates without losing your work |
| [Troubleshooting](docs/troubleshooting.md) | Symptoms, causes, and fixes |
| [FAQ](docs/faq.md) | Licensing, data, and platform support |

The full [documentation index](docs/README.md) has everything, including the extension-authoring reference
guides.

## License and use

- **The dev-kit source is open source.** Everything DuploCloud authored here — `run.sh`,
  `scripts/`, `samples/`, `docker-compose.yml`, `nginx/`, `.claude/` — is
  [Apache-2.0](LICENSE). Clone it, modify it, redistribute it. That's the point.
- **The container images are not.** The `quay.io/duplocloud/*` images this kit runs are
  proprietary, licensed separately under [TERMS.md](TERMS.md), and **may not be modified**.
- **The vendored UI library is not, either.** The tarball every sample installs from the repo-root
  `packages/` is the compiled DuploCloud platform UI library
  (`@duplocloud-internal/ng-common-lib`) — proprietary DuploCloud IP, **not open source**,
  and **not covered by the Apache License** despite living under `samples/`. You may build
  your extensions against it and ship the parts your build bundles into a compiled
  extension; you may not republish, repackage, or modify it. See [TERMS.md](TERMS.md)
  and the `NOTICE` beside each tarball.
- **This kit is for local development only.** As more fully described in the
  [TERMS](TERMS.md), the closed source materials are provided for non-production use only.
- **Going to production?** Contact **sales@duplocloud.net** for a production license.
- **Your extensions are yours.** DuploCloud claims no rights in anything you write under
  `extensions/`. See [NOTICE](NOTICE) for the full breakdown.

## Policies

| Document | What it covers |
| --- | --- |
| [LICENSE](LICENSE) | **Apache-2.0** — the dev-kit source DuploCloud authored (`run.sh`, `scripts/`, `samples/`, `docker-compose.yml`, `nginx/`, `.claude/`). Use, modify, and redistribute freely. Does **not** cover the vendored library tarballs under `packages/` or `**/frontend/vendor/`. |
| [NOTICE](NOTICE) | The boundary: what Apache-2.0 covers, what it doesn't (the container images and the vendored UI library), and the third-party images. Apache-2.0 §4(d) requires you to keep it in any redistribution. |
| [TERMS.md](TERMS.md) | The proprietary pieces that are *not* Apache-licensed: the **`quay.io/duplocloud/*` container images** (local development only, **no modification**, production requires a separate license) and the **vendored `@duplocloud-internal/ng-common-lib` tarball** (build against it and ship what your build bundles — nothing else). Also confirms you own your extensions. |
| [SECURITY.md](SECURITY.md) | Reporting a vulnerability. **Email `ai-reporting@duplocloud.net` — don't open a public issue.** |
| [PRIVACY.md](PRIVACY.md) | The usage metrics the UI sends, tied to your sign-in email — what is collected, what is not, and how to opt out at install (`./run.sh --no-metrics`) or afterwards (`DUPLO_USAGE_METRICS=0`, re-run). |
| [CONTRIBUTING.md](CONTRIBUTING.md) | PRs improving the *framework* are welcome. Your own extensions stay in your repo and don't belong upstream. |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Contributor Covenant 2.1 — the behaviour expected in issues and pull requests here, and what happens when it isn't met. Report a problem to `ai-reporting@duplocloud.net`. |
| [SUPPORT.md](SUPPORT.md) | Where to get help and what to expect: **GitHub Issues, best effort, no SLA.** Also what belongs somewhere else. |

See [License and use](#license-and-use) above for the short version, or
**sales@duplocloud.net** for a production license.
