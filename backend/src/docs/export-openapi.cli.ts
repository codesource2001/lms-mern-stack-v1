import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import prettier from 'prettier';

import { logger } from '../config/logger.js';
import { openApiDocument } from './openapi.js';

const target = new URL('../../../docs/api/openapi.json', import.meta.url);

async function main(): Promise<void> {
  const json = JSON.stringify(openApiDocument, null, 2);
  const targetPath = fileURLToPath(target);
  const config = await prettier.resolveConfig(targetPath);
  const formatted = await prettier.format(json, {
    filepath: targetPath,
    ...config,
  });

  mkdirSync(new URL('./', target), { recursive: true });
  writeFileSync(target, formatted, 'utf8');

  logger.info(
    { path: targetPath, paths: Object.keys(openApiDocument.paths ?? {}).length },
    'OpenAPI export written',
  );
}

main().catch((error: unknown) => {
  logger.fatal({ err: error }, 'OpenAPI export failed');
  process.exitCode = 1;
});
