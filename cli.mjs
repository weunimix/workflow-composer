#!/usr/bin/env node

/**
 * workflow-composer — OOP compiler for pi workflows and agents.
 *
 * Commands:
 *   build            Compile workflows → .pi/workflows/ + agents → .pi/agents/
 *   build --agents   Compile only agents
 *   init             Initialize project template directories
 *
 * Usage:
 *   workflow-composer build [--project <dir>]
 *   workflow-composer build --agents
 *   workflow-composer init
 */

import { resolve } from 'node:path';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');

function parseArgs(args) {
  const opts = {
    command: 'build',
    projectDir: process.cwd(),
    agentsOnly: false,
    libDir: null,
    workflowsTemplates: null,
    agentsTemplates: null,
    workflowsOutput: null,
    agentsOutput: null,
  };

  let i = 2;
  while (i < args.length) {
    const arg = args[i];
    if (arg === '--project' || arg === '-p') {
      opts.projectDir = resolve(args[++i]);
    } else if (arg === '--agents') {
      opts.agentsOnly = true;
    } else if (arg === '--lib') {
      opts.libDir = resolve(args[++i]);
    } else if (arg === 'init' || arg === 'build' || arg === '--help' || arg === '-h') {
      opts.command = arg;
    } else if (!arg.startsWith('-')) {
      opts.command = arg;
    }
    i++;
  }

  const pkgDir = __dirname;
  if (!opts.libDir) opts.libDir = resolve(pkgDir, 'lib');

  const pt = resolve(opts.projectDir, '.pi', 'agent-templates');
  if (!opts.workflowsTemplates) opts.workflowsTemplates = resolve(pt, 'workflows');
  if (!opts.agentsTemplates) opts.agentsTemplates = resolve(pt, 'agents');
  if (!opts.workflowsOutput) opts.workflowsOutput = resolve(opts.projectDir, '.pi', 'workflows');
  if (!opts.agentsOutput) opts.agentsOutput = resolve(opts.projectDir, '.pi', 'agents');

  return opts;
}

async function cmdBuild(opts) {
  console.log('🔧 workflow-composer build\n');

  const { buildAll } = await import('./src/compiler.mjs');

  if (opts.agentsOnly) {
    console.log(`   mode:  agents only`);
    console.log(`   lib:   ${opts.libDir}`);
    console.log(`   tmpl:  ${opts.agentsTemplates}`);
    console.log(`   out:   ${opts.agentsOutput}\n`);

    if (!existsSync(opts.agentsTemplates)) {
      console.error(`❌ Agent templates not found: ${opts.agentsTemplates}`);
      process.exit(1);
    }

    const results = await buildAll({
      libDir: opts.libDir,
      templatesDir: '',
      workflowsDir: null,
      agentsDir: opts.agentsTemplates,
      agentsOutputDir: opts.agentsOutput,
      workflowsOutputDir: '',
    });

    printResults(results.agents, 'agent');
    return;
  }

  // Full build
  console.log(`   lib:   ${opts.libDir}`);
  console.log(`   wf in: ${opts.workflowsTemplates}`);
  console.log(`   wf out:${opts.workflowsOutput}`);
  console.log(`   ag in: ${opts.agentsTemplates}`);
  console.log(`   ag out:${opts.agentsOutput}\n`);

  const hasWorkflows = existsSync(opts.workflowsTemplates);
  const hasAgents = existsSync(opts.agentsTemplates);

  if (!hasWorkflows && !hasAgents) {
    console.error('❌ No templates found. Run "workflow-composer init" first.');
    process.exit(1);
  }

  const results = await buildAll({
    libDir: opts.libDir,
    templatesDir: '',
    workflowsDir: hasWorkflows ? opts.workflowsTemplates : null,
    agentsDir: hasAgents ? opts.agentsTemplates : null,
    agentsOutputDir: opts.agentsOutput,
    workflowsOutputDir: opts.workflowsOutput,
  });

  if (results.workflows.length > 0) {
    console.log('── Workflows ──');
    printResults(results.workflows, 'workflow');
  }
  if (results.agents.length > 0) {
    console.log('── Agents ──');
    printResults(results.agents, 'agent');
  }

  const total = [...results.workflows, ...results.agents];
  const success = total.filter(r => !r.error).length;
  const failed = total.filter(r => r.error).length;
  console.log(`\n${'━'.repeat(40)}`);
  console.log(`  ${success} compiled, ${failed} failed`);
  console.log(`${'━'.repeat(40)}`);
  process.exit(failed > 0 ? 1 : 0);
}

function printResults(results, label) {
  for (const r of results) {
    if (r.error) {
      console.log(`❌ ${r.name}`);
      console.log(`   ${r.error.split('\n').join('\n   ')}\n`);
    } else {
      console.log(`✅ ${r.name}  →  ${r.outputPath}`);
      for (const w of r.warnings) console.log(`   ${w}`);
    }
  }
}

function cmdInit(opts) {
  const pt = resolve(opts.projectDir, '.pi', 'agent-templates');

  for (const sub of ['workflows', 'agents']) {
    const dir = resolve(pt, sub);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      console.log(`✅ ${dir}`);
    } else {
      console.log(`⚠️  exists: ${dir}`);
    }
  }
}

function cmdHelp() {
  console.log(`
workflow-composer — OOP compiler for pi workflows and agents

Usage:
  workflow-composer <command> [options]

Commands:
  build            Compile workflows → .pi/workflows/ + agents → .pi/agents/
  build --agents   Compile only agents
  init             Initialize .pi/agent-templates/{workflows,agents}/

Options:
  --project, -p    Project root (default: current directory)
  --lib            OOP library directory (default: workflow-composer/lib)

Examples:
  workflow-composer build
  workflow-composer build --agents
  workflow-composer init
`);
}

const opts = parseArgs(process.argv);

(async () => {
  switch (opts.command) {
    case 'build': await cmdBuild(opts); break;
    case 'init': cmdInit(opts); break;
    case '--help': case '-h': cmdHelp(); break;
    default: console.error(`Unknown: ${opts.command}`); cmdHelp(); process.exit(1);
  }
})();
