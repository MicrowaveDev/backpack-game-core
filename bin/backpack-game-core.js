#!/usr/bin/env node

import { runToolingCli } from '../src/tooling/cli.js';

process.exitCode = runToolingCli(process.argv.slice(2));
