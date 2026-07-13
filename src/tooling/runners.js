import net from 'node:net';
import { spawn } from 'node:child_process';

export function parseSuiteRunnerArgs(argv, { suites, defaultSuite, extraFlags = [] }) {
  const suiteArg = argv.find((arg) => arg.startsWith('--suite='));
  const suite = suiteArg?.slice('--suite='.length) || defaultSuite;
  if (!Object.hasOwn(suites, suite)) {
    throw new Error(`Unknown suite "${suite}". Expected: ${Object.keys(suites).join(', ')}`);
  }
  return {
    suite,
    help: argv.includes('--help') || argv.includes('-h'),
    ...Object.fromEntries(extraFlags.map((flag) => [flag, argv.includes(`--${flag}`)]))
  };
}

export async function findFreePort(preferredPort, host = '127.0.0.1') {
  const tryPort = (port) => new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => resolve(null));
    server.listen({ port, host }, () => {
      const address = server.address();
      const selected = typeof address === 'object' && address ? address.port : port;
      server.close(() => resolve(selected));
    });
  });
  return await tryPort(preferredPort) || await tryPort(0);
}

export function runConfiguredSuite({
  command,
  args,
  cwd,
  env = process.env,
  stdio = 'inherit',
  spawnProcess = spawn,
  onExit = ({ code, signal }) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 1);
  }
}) {
  const child = spawnProcess(command, args, { cwd, env, stdio });
  child.on('exit', (code, signal) => onExit({ code, signal }));
  return child;
}
