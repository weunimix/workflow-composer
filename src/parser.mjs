import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';

export function parseAgentFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  return parseAgentContent(content, filePath);
}

export function parseAgentContent(content, source = '<string>') {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!fmMatch) {
    throw new Error(`No frontmatter found in ${source}. File must start with "---" YAML block.`);
  }

  let frontmatter;
  try {
    frontmatter = parseYaml(fmMatch[1]);
  } catch (err) {
    throw new Error(`Invalid YAML frontmatter in ${source}: ${err.message}`);
  }

  if (!frontmatter || typeof frontmatter !== 'object') {
    throw new Error(`Empty or invalid frontmatter in ${source}`);
  }

  const slots = frontmatter.slots || {};
  const body = fmMatch[2] || '';

  return { frontmatter, body, slots, path: source };
}

export function extractMandatoryBlocks(body) {
  const blocks = [];
  const regex = /<!--\s*mandatory:start\s*-->\r?\n?([\s\S]*?)<!--\s*mandatory:end\s*-->/g;
  let match;
  while ((match = regex.exec(body)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}

export function extractSlotPlaceholders(body) {
  const required = [];
  const optional = [];
  const regex = /\{\{slot:(\w+)(\?)?\}\}/g;
  let match;
  while ((match = regex.exec(body)) !== null) {
    if (match[2] === '?') {
      optional.push(match[1]);
    } else {
      required.push(match[1]);
    }
  }
  return { required, optional };
}

export function extractMixinMarkers(body) {
  const markers = [];
  const regex = /<!--\s*mixin:(\w+)\s*-->/g;
  let match;
  while ((match = regex.exec(body)) !== null) {
    markers.push(match[1]);
  }
  return markers;
}
