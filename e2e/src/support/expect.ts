import { expect as baseExpect } from '@playwright/test';
import { env } from './env';

/** Web-first assertions with the suite-wide timeout (configurable per env). */
export const expect = baseExpect.configure({ timeout: env.expectTimeout });
