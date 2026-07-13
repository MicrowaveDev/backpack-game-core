import fs from 'node:fs';
import path from 'node:path';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function validateScriptDocumentation({
  packageJsonPath,
  manifestPath,
  readmePath,
  scriptsRoot = path.dirname(manifestPath),
  aliasBudgets = {}
}) {
  const packageJson = readJson(packageJsonPath);
  const manifest = readJson(manifestPath);
  const readme = fs.readFileSync(readmePath, 'utf8');
  const errors = [];
  const packageCommands = new Set(Object.keys(packageJson.scripts || {}));
  const documentedCommands = new Set();
  const directoryIds = new Set();

  for (const directory of manifest.directories || []) {
    if (!directory.id || directoryIds.has(directory.id)) {
      errors.push(`Invalid or duplicate script directory: ${directory.id || '<missing>'}`);
      continue;
    }
    directoryIds.add(directory.id);
    if (!directory.purpose || typeof directory.entryPoints !== 'boolean') {
      errors.push(`Script directory needs purpose and entryPoints: ${directory.id}`);
    }
    if (!fs.existsSync(path.join(scriptsRoot, directory.id))) {
      errors.push(`Manifest script directory does not exist: ${directory.id}`);
    }
  }

  const actualDirectories = fs.readdirSync(scriptsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  for (const directory of actualDirectories) {
    if (!directoryIds.has(directory)) errors.push(`Unclassified script directory: ${directory}`);
  }
  for (const entry of fs.readdirSync(scriptsRoot, { withFileTypes: true })) {
    if (entry.isFile() && /\.(?:js|sh)$/.test(entry.name)) {
      errors.push(`Executable script must be grouped, not stored at the scripts root: ${entry.name}`);
    }
  }

  for (const family of manifest.families || []) {
    if (!readme.includes(`<!-- command-family:${family.id} -->`)) {
      errors.push(`README is missing command family ${family.id}`);
    }
    for (const command of family.commands || []) {
      if (documentedCommands.has(command)) errors.push(`Command is classified twice: ${command}`);
      documentedCommands.add(command);
    }
  }

  for (const alias of manifest.compatibilityAliases || []) {
    documentedCommands.add(alias.name);
    if (!alias.replacement || !alias.removeAfter) {
      errors.push(`Compatibility alias needs replacement and removeAfter: ${alias.name}`);
    }
  }

  for (const command of packageCommands) {
    if (!documentedCommands.has(command)) errors.push(`Unclassified package command: ${command}`);
  }
  for (const command of documentedCommands) {
    if (!packageCommands.has(command)) errors.push(`Manifest command does not exist: ${command}`);
  }

  for (const [command, value] of Object.entries(packageJson.scripts || {})) {
    for (const match of value.matchAll(/app\/scripts\/([^\s"']+\.(?:js|sh))/g)) {
      const relativePath = match[1];
      const [directory] = relativePath.split('/');
      const directoryEntry = manifest.directories?.find((entry) => entry.id === directory);
      if (!directoryEntry) errors.push(`Package command uses unclassified script path: ${command} -> ${relativePath}`);
      else if (!directoryEntry.entryPoints) errors.push(`Package command invokes internal script module: ${command} -> ${relativePath}`);
      if (!fs.existsSync(path.join(scriptsRoot, relativePath))) {
        errors.push(`Package command script does not exist: ${command} -> ${relativePath}`);
      }
    }
  }

  for (const command of [...readme.matchAll(/npm run ([a-zA-Z0-9:_-]+)/g)].map((match) => match[1])) {
    if (!packageCommands.has(command)) errors.push(`README uses unknown command: ${command}`);
  }

  const budgets = {
    ...(manifest.aliasBudgets || {}),
    ...(manifest.homeFieldAliasLimit == null ? {} : { 'game:home-field:': manifest.homeFieldAliasLimit }),
    ...aliasBudgets
  };
  const aliasCounts = {};
  for (const [prefix, limit] of Object.entries(budgets)) {
    const count = [...packageCommands].filter((command) => command.startsWith(prefix)).length;
    aliasCounts[prefix] = count;
    if (count > limit) errors.push(`Aliases with prefix ${prefix} exceed limit: ${count} > ${limit}`);
  }

  for (const match of readme.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^(https?:|mailto:)/.test(target)) continue;
    if (!fs.existsSync(path.resolve(scriptsRoot, target))) errors.push(`README link does not exist: ${target}`);
  }

  return {
    errors,
    commandCount: packageCommands.size,
    familyCount: manifest.families?.length || 0,
    directoryCount: directoryIds.size,
    aliasCounts
  };
}

export function formatScriptDocumentationResult(result) {
  if (result.errors.length) return result.errors.map((error) => `- ${error}`).join('\n');
  const budgetSummary = Object.entries(result.aliasCounts)
    .map(([prefix, count]) => `${count} ${prefix} aliases`)
    .join(', ');
  return `Script documentation OK: ${result.commandCount} commands in ${result.familyCount} families and ${result.directoryCount} directories${budgetSummary ? `, ${budgetSummary}` : ''}.`;
}
