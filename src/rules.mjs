// ── Field classification ──

/**
 * Scalar fields: child overwrites parent.
 */
const SCALAR_FIELDS_AGENT = new Set([
  'name', 'description', 'context', 'systemPromptMode',
  'inheritProjectContext', 'inheritSkills', 'thinking',
  'defaultContext', 'defaultProgress', 'maxExecutionTimeMs',
  'output', 'acceptanceRole', 'abstract', 'extends',
]);

const SCALAR_FIELDS_WORKFLOW = new Set([
  'name', 'trigger', 'description', 'abstract', 'extends',
]);

/**
 * List fields: child appends to parent (deduplicated).
 */
const LIST_FIELDS_AGENT = new Set([
  'tools', 'mixins', 'skills', 'skillPath', 'fallbackModels',
]);

const LIST_FIELDS_WORKFLOW = new Set([
  'mixins',
]);

/**
 * OOP fields consumed by compiler, removed from output.
 */
const OOP_FIELDS = new Set([
  'abstract', 'extends', 'mixins', 'slots', 'overrides', 'silent_overrides',
]);

// ── Frontmatter merging ──

export function mergeFrontmatter(chain, targetType = 'agent') {
  const scalarFields = targetType === 'workflow' ? SCALAR_FIELDS_WORKFLOW : SCALAR_FIELDS_AGENT;
  const listFields = targetType === 'workflow' ? LIST_FIELDS_WORKFLOW : LIST_FIELDS_AGENT;

  const merged = {};

  for (const agent of chain) {
    for (const [key, value] of Object.entries(agent.frontmatter)) {
      if (scalarFields.has(key)) {
        merged[key] = value;
      } else if (listFields.has(key)) {
        const parentItems = parseList(merged[key]);
        const childItems = parseList(value);
        const combined = [...parentItems];
        for (const item of childItems) {
          if (!combined.includes(item)) combined.push(item);
        }
        merged[key] = combined.join(', ');
      } else {
        merged[key] = value;
      }
    }
  }

  for (const field of OOP_FIELDS) {
    delete merged[field];
  }

  return merged;
}

function parseList(value) {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map(v => v.trim()).filter(Boolean);
  return [String(value).trim()].filter(Boolean);
}

// ── Override validation ──

export function validateOverrides(childFm, baseFm, overrides = [], silentOverrides = []) {
  const warnings = [];
  const allDeclared = new Set([...overrides, ...silentOverrides]);

  for (const field of overrides) {
    if (jsonEqual(childFm[field], baseFm[field])) {
      warnings.push(`⚠️  "${field}" declared as override but unchanged from base`);
    }
  }

  for (const [key, childVal] of Object.entries(childFm)) {
    if (OOP_FIELDS.has(key)) continue;
    if (allDeclared.has(key)) continue;
    if (key === 'name' || key === 'trigger') continue;
    if (!jsonEqual(childVal, baseFm[key])) {
      warnings.push(`⚠️  "${key}" changed from base but not declared in overrides or silent_overrides`);
    }
  }

  return warnings;
}

function jsonEqual(a, b) {
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

// ── Body resolution ──

export function resolveBody(chain) {
  const allSlots = {};
  for (const agent of chain) {
    Object.assign(allSlots, agent.slots);
  }

  let body = chain[0].body;

  body = body.replace(/\{\{slot:(\w+)(\?)?\}\}/g, (match, name, optional) => {
    if (allSlots[name] !== undefined) {
      return allSlots[name];
    }
    if (optional) {
      return '';
    }
    throw new Error(
      `Required slot "{{slot:${name}}}" not filled.\n` +
      `  Add "slots: { ${name}: ... }" to frontmatter.`
    );
  });

  body = body.replace(/\n{3,}/g, '\n\n');

  const childBody = chain[chain.length - 1].body;
  if (childBody && childBody.trim()) {
    body = body.trimEnd() + '\n\n' + childBody.trim();
  }

  return body.trim() + '\n';
}

// ── Mandatory block verification ──

export function verifyMandatoryBlocks(baseBody, resolvedBody) {
  const errors = [];
  const regex = /<!--\s*mandatory:start\s*-->\r?\n?([\s\S]*?)<!--\s*mandatory:end\s*-->/g;
  let match;
  let index = 0;
  while ((match = regex.exec(baseBody)) !== null) {
    index++;
    const blockContent = match[1].trim();
    if (!resolvedBody.includes(blockContent)) {
      errors.push(`Mandatory block #${index} missing in output: "${blockContent.substring(0, 80)}..."`);
    }
  }
  return errors;
}

// ── Output formatting ──

export function formatAgentOutput(frontmatter, body) {
  const lines = ['---'];
  const fieldOrder = [
    'name', 'description', 'tools', 'context',
    'systemPromptMode', 'inheritProjectContext', 'inheritSkills',
  ];
  const ordered = [...fieldOrder.filter(f => frontmatter[f] !== undefined)];
  for (const key of Object.keys(frontmatter)) {
    if (!ordered.includes(key)) ordered.push(key);
  }

  for (const key of ordered) {
    const value = frontmatter[key];
    if (value === undefined || value === null || value === '') continue;
    lines.push(formatYamlLine(key, value));
  }

  lines.push('---');
  lines.push('');
  return lines.join('\n') + body;
}

export function formatWorkflowOutput(frontmatter, body) {
  const lines = ['---'];
  const fieldOrder = ['name', 'trigger', 'description'];
  const ordered = [...fieldOrder.filter(f => frontmatter[f] !== undefined)];
  for (const key of Object.keys(frontmatter)) {
    if (!ordered.includes(key)) ordered.push(key);
  }

  for (const key of ordered) {
    const value = frontmatter[key];
    if (value === undefined || value === null || value === '') continue;
    lines.push(formatYamlLine(key, value));
  }

  lines.push('---');
  lines.push('');
  return lines.join('\n') + body;
}

function formatYamlLine(key, value) {
  if (typeof value === 'string' && value.includes('\n')) {
    return `${key}: |\n${value.split('\n').map(l => `  ${l}`).join('\n')}`;
  }
  if (value === true || value === false) return `${key}: ${value}`;
  if (typeof value === 'number') return `${key}: ${value}`;
  if (typeof value === 'string') {
    if (value === 'true' || value === 'false' || value === 'null' ||
        /^[\d.+-]+$/.test(value) ||
        value.startsWith(' ') || value.endsWith(' ') ||
        value.startsWith('{') || value.startsWith('[')) {
      return `${key}: "${value.replace(/"/g, '\\"')}"`;
    }
    return `${key}: ${value}`;
  }
  return `${key}: ${JSON.stringify(value)}`;
}

// ── Index generation ──

export function generateWorkflowIndex(modules) {
  let index = '# 工作流模块注册表\n\n';
  index += '> 自动生成于 workflow-composer build。用于 `/workflow` 命令的关键词匹配。\n\n';
  index += '| 触发关键词 | 模块名 | 文件 |\n';
  index += '|-----------|--------|------|\n';

  for (const mod of modules) {
    index += `| ${mod.trigger} | ${mod.name} | ${mod.file} |\n`;
  }

  index += '\n## 使用方式\n\n';
  index += '在 `/workflow` 命令中引用关键词时，AI 将以对应模块文件的完整内容内联替换关键词位置。\n';

  return index;
}
