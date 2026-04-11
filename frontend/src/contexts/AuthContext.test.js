import { describe, expect, it } from 'vitest';
import { mapAuthErrorToCuratedMessage } from './AuthContext';

describe('auth error curation mapping', () => {
  it('maps tenant mismatch contract to curated isolation copy', () => {
    const mapped = mapAuthErrorToCuratedMessage({
      user_message_key: 'auth.tenant_mismatch',
      support_code: 'LOGIN-HOST_HINT_MISMATCH',
    });

    expect(mapped).toEqual({
      message: 'Aquest compte pertany a un altre shelter. Inicia sessió des del subdomini correcte.',
      messageKey: 'auth.tenant_mismatch',
      supportCode: 'LOGIN-HOST_HINT_MISMATCH',
    });
  });

  it('never returns raw backend detail text as user-facing message', () => {
    const mapped = mapAuthErrorToCuratedMessage({
      detail: 'Traceback: SQL timeout at auth/login',
      user_message_key: 'unknown.raw.detail',
      support_code: 'LOGIN-UNKNOWN',
    });

    expect(mapped.message).toBe('Credencials incorrectes o entitat no trobada');
    expect(mapped.message).not.toContain('Traceback');
  });
});
