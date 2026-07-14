import { spawn } from 'node:child_process';

export function runCommand(command, args = [], { cwd, env = process.env, stdio = 'inherit', spawnProcess = spawn, shell = process.platform === 'win32', logger = console } = {}) {
  return new Promise((resolve, reject) => {
    logger.log(`\n$ ${[command, ...args].join(' ')}`);
    const child = spawnProcess(command, args, { cwd, env, stdio, shell });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) resolve({ code, signal });
      else reject(new Error(`${command} ${args.join(' ')} failed${signal ? ` with signal ${signal}` : ` with code ${code}`}`));
    });
  });
}

export async function runCommandSequence(commands, options = {}) {
  const results = [];
  for (const entry of commands) {
    const [command, args = []] = Array.isArray(entry) ? entry : [entry.command, entry.args || []];
    results.push(await runCommand(command, args, options));
  }
  return results;
}
