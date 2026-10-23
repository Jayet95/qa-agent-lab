import { AfterAll } from '@cucumber/cucumber';
import { join } from 'node:path';
import { LearningCatalog } from './catalog';
import { DYNAMIC_DIR } from './report';

/**
 * One learning catalog per worker process. Learned entries are flushed to
 * reports/dynamic/learned/ when the worker finishes; `npm run catalog -- merge`
 * folds them into dynamic-field-catalog.json.
 */
const LEARN = process.env.LEARN !== '0';
export const workerCatalog = new LearningCatalog();

AfterAll(() => {
  if (LEARN) workerCatalog.flush(join(DYNAMIC_DIR, 'learned'));
});
