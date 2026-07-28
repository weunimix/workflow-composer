import { writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { parseAgentFile } from './parser.mjs';
import {
  mergeFrontmatter,
  validateOverrides,
  resolveBody,
  verifyMandatoryBlocks,
  formatAgentOutput,
  formatWorkflowOutput,
  generateWorkflowIndex,
} from './rules.mjs';
import { resolveInheritance } from './resolver.mjs';

/**
 * Compile a single template into output.
 * @returns {{ outputPath: string, warnings: string[], name: string }}
 */
export async function compile(targetPath, options) {
  const { libDir, templatesDir, outputDir, targetType } = options;

  const agent = parseAgentFile(targetPath);

  if (!agent.frontmatter.name) {
    throw new Error(`Missing required "name" field: ${targetPath}`);
  }

  if (agent.frontmatter.abstract) {
    throw new Error(`Cannot compile abstract: "${agent.frontmatter.name}"`);
  }

  const chain = await resolveInheritance(agent, libDir, templatesDir);

  const baseChain = chain.slice(0, -1);
  const baseFm = baseChain.length > 0 ? mergeFrontmatter(baseChain, targetType) : {};
  const mergedFm = mergeFrontmatter(chain, targetType);

  const warnings = validateOverrides(
    agent.frontmatter, baseFm,
    agent.frontmatter.overrides, agent.frontmatter.silent_overrides,
  );

  let body;
  try {
    body = resolveBody(chain);
  } catch (err) {
    throw new Error(`Body resolution failed for "${agent.frontmatter.name}": ${err.message}`);
  }

  if (baseChain.length > 0) {
    const mandatoryErrors = verifyMandatoryBlocks(chain[0].body, body);
    if (mandatoryErrors.length > 0) {
      throw new Error(`Mandatory block verification failed:\n${mandatoryErrors.join('\n')}`);
    }
  }

  const output = targetType === 'workflow'
    ? formatWorkflowOutput(mergedFm, body)
    : formatAgentOutput(mergedFm, body);

  const outputPath = resolve(outputDir, `${mergedFm.name}.md`);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, output, 'utf-8');

  return { outputPath, warnings, name: mergedFm.name, trigger: mergedFm.trigger };
}

/**
 * Build all templates in the given directory.
 */
export async function build(options) {
  const { templatesDir, targetType } = options;
  const results = [];

  async function findAndCompile(dir) {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === 'base' || entry.name === 'lib') continue;
        await findAndCompile(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        if (entry.name.startsWith('_')) continue;
        try {
          const result = await compile(fullPath, { ...options, targetType });
          results.push(result);
        } catch (err) {
          results.push({
            outputPath: fullPath, name: basename(fullPath, '.md'),
            warnings: [], error: err.message,
          });
        }
      }
    }
  }

  await findAndCompile(templatesDir);
  return results;
}

/**
 * Full build: workflows first, then agents.
 * Workflows generate _index.md.
 */
export async function buildAll(options) {
  const { templatesDir, workflowsDir, agentsDir, agentsOutputDir, workflowsOutputDir, libDir } = options;

  const allResults = { workflows: [], agents: [] };

  // 1. Build workflows
  if (workflowsDir) {
    const wfOpts = { libDir, templatesDir: workflowsDir, outputDir: workflowsOutputDir, targetType: 'workflow' };
    allResults.workflows = await build(wfOpts);

    // Generate _index.md
    const indexModules = allResults.workflows
      .filter(r => !r.error && r.trigger)
      .map(r => ({ trigger: r.trigger, name: r.name, file: `${r.name}.md` }));

    if (indexModules.length > 0) {
      const indexContent = generateWorkflowIndex(indexModules);
      const indexPath = resolve(workflowsOutputDir, '_index.md');
      mkdirSync(dirname(indexPath), { recursive: true });
      writeFileSync(indexPath, indexContent, 'utf-8');
    }
  }

  // 2. Build agents
  if (agentsDir) {
    const agOpts = { libDir, templatesDir: agentsDir, outputDir: agentsOutputDir, targetType: 'agent' };
    allResults.agents = await build(agOpts);
  }

  return allResults;
}
