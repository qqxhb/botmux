import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, statSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let dir: string; let cfg: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'cfgstore-'));
  cfg = join(dir, 'bots.json');
  process.env.BOTS_CONFIG = cfg;
  vi.resetModules();
});
afterEach(() => {
  delete process.env.BOTS_CONFIG;
  rmSync(dir, { recursive: true, force: true });
});

async function freshStore() {
  const registry = await import('../src/bot-registry.js');
  const store = await import('../src/services/config-store.js');
  return { registry, store };
}

function writeConfig(raw: any[] = [{ larkAppId: 'a1', allowedUsers: ['ou_x'] }]) {
  writeFileSync(cfg, JSON.stringify(raw, null, 2), { mode: 0o600 });
}

function readConfig(): any[] {
  return JSON.parse(readFileSync(cfg, 'utf-8'));
}

describe('config-store', () => {
  it('writeRawConfigAtomic keeps file 0o600', async () => {
    writeConfig();
    const { store } = await freshStore();
    const raw = await store.readRawConfig(cfg);
    raw[0].allowedUsers.push('ou_y');
    await store.writeRawConfigAtomic(cfg, raw);
    expect(statSync(cfg).mode & 0o777).toBe(0o600);
    expect((await store.readRawConfig(cfg))[0].allowedUsers).toEqual(['ou_x', 'ou_y']);
  });

  it('findEntryIndex matches by larkAppId', async () => {
    writeConfig();
    const { store } = await freshStore();
    expect(store.findEntryIndex(await store.readRawConfig(cfg), 'a1')).toBe(0);
    expect(store.findEntryIndex(await store.readRawConfig(cfg), 'nope')).toBe(-1);
  });

  it('deleteBotEntry removes only the requested bot with atomic private write', async () => {
    writeConfig([
      { larkAppId: 'a1', larkAppSecret: 's1', cliId: 'codex' },
      { larkAppId: 'a2', larkAppSecret: 's2', cliId: 'claude-code' },
    ]);
    const { registry, store } = await freshStore();
    registry.loadBotConfigs();

    await expect(store.deleteBotEntry('a1')).resolves.toEqual({ ok: true, removed: true });

    expect(readConfig()).toEqual([{ larkAppId: 'a2', larkAppSecret: 's2', cliId: 'claude-code' }]);
    expect(statSync(cfg).mode & 0o777).toBe(0o600);
  });

  it('deleteBotEntry reports missing bot and leaves config unchanged', async () => {
    writeConfig([{ larkAppId: 'a1', larkAppSecret: 's1', cliId: 'codex' }]);
    const { registry, store } = await freshStore();
    registry.loadBotConfigs();

    await expect(store.deleteBotEntry('missing')).resolves.toEqual({ ok: false, reason: 'bot_not_in_config' });

    expect(readConfig()).toEqual([{ larkAppId: 'a1', larkAppSecret: 's1', cliId: 'codex' }]);
  });
});
