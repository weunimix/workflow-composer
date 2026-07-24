import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

export async function resolveInheritance(agent, libDir, templatesDir) {
  const chain = [agent];
  let current = agent;
  const visited = new Set([agent.path]);

  while (current.frontmatter.extends) {
    const basePath = resolveBasePath(
      current.frontmatter.extends,
      libDir,
      templatesDir,
      current.path
    );

    if (!existsSync(basePath)) {
      throw new Error(
        `Base not found: "${current.frontmatter.extends}"\n` +
        `  searched: ${basePath}\n  from: ${current.path}`
      );
    }

    if (visited.has(basePath)) {
      throw new Error(
        `Circular inheritance: ${[...visited, basePath].join(' → ')}`
      );
    }
    visited.add(basePath);

    const { parseAgentFile } = await import('./parser.mjs');
    const base = parseAgentFile(basePath);
    chain.unshift(base);
    current = base;
  }

  return chain;
}

function resolveBasePath(extendsPath, libDir, templatesDir, childPath) {
  const normalized = extendsPath.endsWith('.md') ? extendsPath : `${extendsPath}.md`;

  const relativeToChild = resolve(dirname(childPath), normalized);
  if (existsSync(relativeToChild)) return relativeToChild;

  const inTemplates = resolve(templatesDir, normalized);
  if (existsSync(inTemplates)) return inTemplates;

  const inLib = resolve(libDir, normalized);
  return inLib;
}
