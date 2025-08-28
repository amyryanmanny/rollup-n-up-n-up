import type { Environment, Plugin } from "ventojs/src/environment.js";
import type { Token } from "ventojs/src/tokenizer.js";

export default function (): Plugin {
  return (env: Environment) => {
    env.tags.push(mark);
    env.tags.push(hoist);
  };
}

function formatMarker(val: string): string {
  return `"__MARK_${val}"`;
}

function mark(
  env: Environment,
  code: string,
  outputVar: string,
  tokens: Token[],
): string | undefined {
  if (!code.startsWith("mark ")) {
    return;
  }

  const markerName = code.replace(/^mark\s+/, "");
  const marker = env.compileFilters(
    tokens,
    formatMarker(markerName),
    env.options.autoescape,
  );

  return `${outputVar} += ${marker};`;
}

function hoist(
  env: Environment,
  code: string,
  outputVar: string,
  tokens: Token[],
): string | undefined {
  if (!code.startsWith("hoist ")) {
    return;
  }

  const match = code.match(/^hoist\s+([\w]+)\s*=\s*([\s\S]+)$/);

  if (!match) {
    throw new Error(`Invalid hoist tag: ${code}`);
  }

  const [, markerName, variable] = match;
  const marker = env.compileFilters(
    tokens,
    formatMarker(markerName!),
    env.options.autoescape,
  );
  const val = env.compileFilters(tokens, variable!, env.options.autoescape);

  return `${outputVar} = ${outputVar}.replace(${marker}, ${val});`;
}
