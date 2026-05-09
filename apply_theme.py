import os

filepath = r'c:\TOBI PROGRAM\ksk\src\App.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update initial state
old_state = '''    return {
      autoDialDelay: 3,
      callerId: 'Admissions Dept',
      smsTemplate: 'Hi [Name], this is [CallerId]. We noticed you are interested in [Course]. Do you have a few minutes to talk?'
    };'''
new_state = '''    return {
      autoDialDelay: 3,
      callerId: 'Admissions Dept',
      smsTemplate: 'Hi [Name], this is [CallerId]. We noticed you are interested in [Course]. Do you have a few minutes to talk?',
      theme: 'dark'
    };'''
content = content.replace(old_state, new_state)

# 2. Add useEffect for theme
if 'document.body.className' not in content:
    theme_effect = '''  useEffect(() => { localStorage.setItem('ksk_settings', JSON.stringify(appSettings)); }, [appSettings]);

  useEffect(() => {
    document.body.className = appSettings.theme === 'light' ? 'light-theme' : '';
  }, [appSettings.theme]);
'''
    content = content.replace('''  useEffect(() => { localStorage.setItem('ksk_settings', JSON.stringify(appSettings)); }, [appSettings]);''', theme_effect)

# 3. Update the Display tab (Desktop)
old_display_desktop = '''                            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                              <button className="btn" style={{ background: 'var(--accent-primary)', color: 'var(--bg-primary)' }}>Dark</button>
                              <button className="btn" style={{ color: 'var(--text-muted)' }} onClick={() => showToast('Light mode restricted by admin.', 'error')}>Light</button>
                            </div>'''

new_display_desktop = '''                            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                              <button className="btn" style={{ background: appSettings.theme !== 'light' ? 'var(--accent-primary)' : 'transparent', color: appSettings.theme !== 'light' ? 'var(--bg-primary)' : 'var(--text-muted)' }} onClick={() => setAppSettings({ ...appSettings, theme: 'dark' })}>Dark</button>
                              <button className="btn" style={{ background: appSettings.theme === 'light' ? '#ffffff' : 'transparent', color: appSettings.theme === 'light' ? '#1a1a1a' : 'var(--text-muted)' }} onClick={() => setAppSettings({ ...appSettings, theme: 'light' })}>Light</button>
                            </div>'''
content = content.replace(old_display_desktop, new_display_desktop)

# 4. Use the new color. Let's make the "Add Contact" button in sidebar use the new Copper color (.btn-tertiary)
old_add_btn = '''        <button className="btn btn-primary w-full shadow-lg" onClick={openAddContactModal}>
          <UserPlus size={18} /> Add Contact
        </button>'''
new_add_btn = '''        <button className="btn btn-tertiary w-full shadow-lg" onClick={openAddContactModal}>
          <UserPlus size={18} /> Add Contact
        </button>'''
content = content.replace(old_add_btn, new_add_btn)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
