/**
 * Interactive Prompt Utilities - User prompts for sandbox fallback
 */

import * as readline from 'node:readline';
import type { DockerPreflightResult, SandboxFallbackChoice } from '../types/index.js';
import { formatDockerPreflightResults } from './docker.js';

/**
 * Prompt user for sandbox fallback choice when Docker is unavailable
 */
export async function promptSandboxFallback(dockerResult: DockerPreflightResult): Promise<SandboxFallbackChoice> {
  console.log('\n' + formatDockerPreflightResults(dockerResult));
  console.log('\nDocker sandbox mode is not available.');
  console.log('');
  console.log('Options:');
  console.log('  [c] Continue without sandbox (runs Claude directly on your system)');
  console.log('  [e] Exit');
  console.log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const askQuestion = () => {
      rl.question('Choose an option [c/e]: ', (answer) => {
        const choice = answer.toLowerCase().trim();

        if (choice === 'c' || choice === 'continue') {
          rl.close();
          resolve('continue-without-sandbox');
        } else if (choice === 'e' || choice === 'exit' || choice === 'q' || choice === 'quit') {
          rl.close();
          resolve('exit');
        } else {
          console.log('Invalid choice. Please enter "c" to continue or "e" to exit.');
          askQuestion();
        }
      });
    };

    askQuestion();
  });
}

export const prompt = {
  promptSandboxFallback,
};

export default prompt;
