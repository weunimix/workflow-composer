# workflow-composer

OOP template compiler for pi workflows and agents. Build modular, composable workflow functions with `extends` / `slots` / `mandatory` blocks.

## Install

```bash
pi install git:github.com/mmw-devs/workflow-composer@v0.1.0
```

For private org access, configure SSH keys first:
```bash
git config --global url."git@github.com:".insteadOf "https://github.com/"
```

## Commands

```bash
workflow-composer build            # compile workflows + agents
workflow-composer build --agents   # compile agents only
workflow-composer init             # initialize template directories
```

## Quick Start

```bash
cd your-pi-project
workflow-composer init
# creates .pi/agent-templates/workflows/ and agents/

# Create template, then compile:
workflow-composer build
# outputs to .pi/workflows/ + _index.md
```

## Template Syntax

```yaml
---
name: my-workflow
trigger: 关键词          # for /workflow command detection
extends: workflows/_workflow
slots:
  module_title: ...
  steps: |
    ### 1. ...
    ### 2. ...
overrides: [name, trigger]
---
```

See `spec/template-spec.md` for full syntax.
