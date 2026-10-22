/** Runtime configuration, all overridable from the environment / CI. */
export const env = {
  baseUrl: process.env.BASE_URL ?? 'http://localhost:8081',
  /** Planted bugs to switch on in the app, e.g. "limit-check,balance-update". */
  bugs: (process.env.BUGS ?? '').split(',').map((b) => b.trim()).filter(Boolean),
  headed: process.env.HEADED === '1',
  slowMo: Number(process.env.SLOWMO ?? 0),
  /** Default timeout for web-first assertions — we wait for state, never sleep. */
  expectTimeout: Number(process.env.EXPECT_TIMEOUT ?? 6000),
  mobileViewport: process.env.VIEWPORT === 'mobile',
};
