import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile } from '../api/users';
import { useAuthStore } from '../store/authStore';

export function Settings() {
  const user = useAuthStore(s => s.user);
  const updateUser = useAuthStore(s => s.updateUser);
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [clockEnabled, setClockEnabled] = useState(user?.clockEnabled ?? false);
  const [theme, setTheme] = useState<'dark' | 'light'>(user?.theme ?? 'dark');
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    const updated = await updateProfile({ displayName: displayName || undefined, clockEnabled, theme });
    updateUser(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const toggle = (val: boolean, setter: (v: boolean) => void) => (
    <button
      onClick={() => setter(!val)}
      style={{ padding: '4px 12px', background: val ? '#4f46e5' : '#374151', color: '#fff', border: 'none', borderRadius: 20, cursor: 'pointer', fontSize: 12 }}
    >
      {val ? 'ON' : 'OFF'}
    </button>
  );

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <button onClick={() => navigate('/')}>← Back</button>
        <h2 style={{ margin: 0 }}>Settings</h2>
        <div />
      </div>

      <section style={{ marginBottom: 24 }}>
        <h3 style={{ color: '#888', fontSize: 12, textTransform: 'uppercase', marginBottom: 12 }}>Gameplay</h3>
        <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Clock</span>{toggle(clockEnabled, setClockEnabled)}
          </div>
        </div>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h3 style={{ color: '#888', fontSize: 12, textTransform: 'uppercase', marginBottom: 12 }}>Display</h3>
        <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Theme</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['dark', 'light'] as const).map(t => (
                <button key={t} onClick={() => setTheme(t)}
                  style={{ padding: '4px 12px', background: theme === t ? '#4f46e5' : '#374151', color: '#fff', border: 'none', borderRadius: 20, cursor: 'pointer', fontSize: 12 }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h3 style={{ color: '#888', fontSize: 12, textTransform: 'uppercase', marginBottom: 12 }}>Account</h3>
        <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 16 }}>
          <label style={{ display: 'block', marginBottom: 12 }}>
            Display Name
            <input value={displayName} onChange={e => setDisplayName(e.target.value)}
              style={{ display: 'block', width: '100%', marginTop: 6, padding: 8, background: '#0f0f1a', border: '1px solid #333', borderRadius: 6, color: '#fff' }} />
          </label>
          <div style={{ fontSize: 12, color: '#555' }}>Email: {user?.email}</div>
        </div>
      </section>

      <button onClick={handleSave}
        style={{ width: '100%', padding: 12, background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15, fontWeight: 600 }}>
        {saved ? '✓ Saved' : 'Save Settings'}
      </button>
    </div>
  );
}
