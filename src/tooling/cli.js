import path from 'node:path';
import {
  formatScriptDocumentationResult,
  validateScriptDocumentation
} from './commands.js';

const HELP = `Backpack Game Core tooling

Usage:
  backpack-game-core <command> --repo-root <path> [options]

Commands:
  scripts:docs:check  Validate a consumer script manifest and README

Repository options:
  --repo-root <path>     Consumer repository root (required)
  --scripts-root <path>  Scripts directory (default: app/scripts)
  --package-json <path>  Package manifest (default: package.json)
  --manifest <path>      Command manifest (default: app/scripts/command-manifest.json)
  --readme <path>        Script documentation (default: app/scripts/README.md)
`;

function readOption(args, index) {
  const argument = args[index];
  const equals = argument.indexOf('=');
  if (equals !== -1) return { value: argument.slice(equals + 1), nextIndex: index };
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${argument} requires a value`);
  return { value, nextIndex: index + 1 };
}

function parseArgs(argv) {
  const options = {};
  let command = null;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') return { help: true, command, options };
    if (!argument.startsWith('--')) {
      if (command) throw new Error(`Unexpected argument: ${argument}`);
      command = argument;
      continue;
    }
    const name = argument.slice(2).split('=')[0];
    if (!['repo-root', 'scripts-root', 'package-json', 'manifest', 'readme'].includes(name)) {
      throw new Error(`Unknown option: --${name}`);
    }
    const { value, nextIndex } = readOption(argv, index);
    options[name] = value;
    index = nextIndex;
  }
  return { help: false, command, options };
}

function resolveFrom(root, value, fallback) {
  const selected = value || fallback;
  return path.isAbsolute(selected) ? selected : path.resolve(root, selected);
}

export function runToolingCli(argv, {
  cwd = process.cwd(),
  stdout = process.stdout,
  stderr = process.stderr
} = {}) {
  let parsed;
  try {
    parsed = parseArgs(argv);
  } catch (error) {
    stderr.write(`${error.message}\n\n${HELP}`);
    return 2;
  }

  if (parsed.help || !parsed.command) {
    stdout.write(HELP);
    return parsed.help ? 0 : 2;
  }
  if (!parsed.options['repo-root']) {
    stderr.write(`--repo-root is required for ${parsed.command}\n`);
    return 2;
  }

  const repoRoot = path.resolve(cwd, parsed.options['repo-root']);
  if (parsed.command === 'scripts:docs:check') {
    const scriptsRoot = resolveFrom(repoRoot, parsed.options['scripts-root'], 'app/scripts');
    const result = validateScriptDocumentation({
      packageJsonPath: resolveFrom(repoRoot, parsed.options['package-json'], 'package.json'),
      manifestPath: resolveFrom(repoRoot, parsed.options.manifest, 'app/scripts/command-manifest.json'),
      readmePath: resolveFrom(repoRoot, parsed.options.readme, 'app/scripts/README.md'),
      scriptsRoot
    });
    const output = `${formatScriptDocumentationResult(result)}\n`;
    (result.errors.length ? stderr : stdout).write(output);
    return result.errors.length ? 1 : 0;
  }

  stderr.write(`Unknown command: ${parsed.command}\n\n${HELP}`);
  return 2;
}

export { HELP as TOOLING_CLI_HELP };
