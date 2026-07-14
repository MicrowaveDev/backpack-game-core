import { runChildProcess } from './runners.js';

export function runCommand(command, args = [], { logger = console, ...options } = {}) {
  logger.log(`\n$ ${[command, ...args].join(' ')}`);
  return runChildProcess(command, args, options);
}

export async function runCommandSequence(commands, options = {}) {
  const results = [];
  for (const entry of commands) {
    const [command, args = []] = Array.isArray(entry) ? entry : [entry.command, entry.args || []];
    results.push(await runCommand(command, args, options));
  }
  return results;
}
