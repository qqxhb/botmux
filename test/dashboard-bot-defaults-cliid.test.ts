import { describe, expect, it } from 'vitest';
import { botDeleteApiPath, displayCliId, renderBotAgentSection, renderBotDeleteSection } from '../src/dashboard/web/bot-defaults.js';

describe('bot defaults cli label', () => {
  it('prefers /api/bots cliId before session fallback', () => {
    expect(displayCliId({ larkAppId: 'cli_traex', cliId: 'traex' }, 'codex')).toBe('traex');
    expect(displayCliId({ larkAppId: 'cli_traex' }, 'codex')).toBe('codex');
    expect(displayCliId({ larkAppId: 'cli_traex', cliId: '' }, '')).toBe('');
  });

  it('renders an editable CLI and model section from /api/bots values', () => {
    const html = renderBotAgentSection(
      { larkAppId: 'cli_traex', cliId: 'traex', model: 'glm-5.1' },
      'codex',
    );
    expect(html).toContain('data-input="agentCliId"');
    expect(html).toContain('<option value="traex" selected>');
    expect(html).toContain('data-input="agentModel"');
    expect(html).toContain('value="glm-5.1"');
    expect(html).toContain('data-action="save-agent"');
  });

  it('renders a danger-zone delete action', () => {
    const html = renderBotDeleteSection();
    expect(html).toContain('bd-danger-zone');
    expect(html).toContain('data-action="delete-bot"');
    expect(html).toContain('data-delete-bot-status');
  });

  it('builds the bot delete API path with encoded app id', () => {
    expect(botDeleteApiPath('cli_app')).toBe('/api/bots/cli_app');
    expect(botDeleteApiPath('app/with/slash')).toBe('/api/bots/app%2Fwith%2Fslash');
  });
});
