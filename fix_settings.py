import os

with open(r'c:\TOBI PROGRAM\ksk\src\App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if '{/* Settings Tab */}' in line:
        start_idx = i
    if '</main>' in line and start_idx != -1:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    new_settings_code = '''        {/* Settings Tab */}
        {currentTab === 'settings' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="tab-content" style={{ padding: isMobile ? '1rem' : '2rem', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
              <h2 style={{ fontSize: isMobile ? '1.75rem' : '2rem', fontWeight: 700, marginBottom: '2rem', color: 'var(--text-primary)' }}>Settings</h2>

              {isMobile ? (
                <div className="mobile-settings-list">
                  {/* Automation */}
                  <div>
                    <h3 className="settings-section-title">Automations</h3>
                    <p className="settings-section-desc">Configure automatic actions and workflow delays.</p>
                    
                    <div className="settings-card">
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">Auto-Dial Delay</div>
                          <div className="settings-hint">Wait time before initiating the next call.</div>
                        </div>
                        <select
                          className="settings-input"
                          value={appSettings.autoDialDelay}
                          onChange={(e) => {
                            setAppSettings({ ...appSettings, autoDialDelay: parseInt(e.target.value) });
                            showToast('Settings saved!');
                          }}
                        >
                          <option value={1}>1 Second</option>
                          <option value={3}>3 Seconds</option>
                          <option value={5}>5 Seconds</option>
                          <option value={10}>10 Seconds</option>
                        </select>
                      </div>

                      <div className="settings-row">
                        <div>
                          <div className="settings-label">Master Switch</div>
                          <div className="settings-hint">Enable or disable auto-dialing globally.</div>
                        </div>
                        <div 
                          className={`settings-toggle ${autoDialEnabled ? 'on' : 'off'}`}
                          onClick={() => setAutoDialEnabled(!autoDialEnabled)}
                        >
                          <div className="settings-toggle-knob" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Profile */}
                  <div>
                    <h3 className="settings-section-title">Profile</h3>
                    <p className="settings-section-desc">Manage your contact details and communication templates.</p>
                    
                    <div className="settings-card">
                      <div className="settings-row col">
                        <div>
                          <div className="settings-label">Caller ID</div>
                          <div className="settings-hint">The name displayed on outbound messages.</div>
                        </div>
                        <input
                          type="text"
                          className="settings-input"
                          style={{ width: '100%', marginTop: '0.5rem' }}
                          placeholder="E.g. Admissions Office"
                          value={appSettings.callerId}
                          onChange={(e) => setAppSettings({ ...appSettings, callerId: e.target.value })}
                          onBlur={() => showToast('Settings saved!')}
                        />
                      </div>

                      <div className="settings-row col">
                        <div>
                          <div className="settings-label">Response Template</div>
                          <div className="settings-hint">Default message used for WhatsApp and SMS.</div>
                        </div>
                        <textarea
                          className="settings-input settings-textarea"
                          style={{ marginTop: '0.5rem' }}
                          placeholder="Enter template..."
                          value={appSettings.smsTemplate}
                          onChange={(e) => setAppSettings({ ...appSettings, smsTemplate: e.target.value })}
                          onBlur={() => showToast('Settings saved!')}
                        />
                        <div className="settings-hint">
                          Tags: [Name], [Course], [CallerId]
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Security */}
                  <div>
                    <h3 className="settings-section-title">Security</h3>
                    <p className="settings-section-desc">Manage your active session and security preferences.</p>
                    
                    <div className="settings-card">
                      <div className="settings-row col">
                        <div>
                          <div className="settings-label">Active Session</div>
                          <div className="settings-hint">Currently logged in as {loginEmail || 'Agent'}.</div>
                        </div>
                        <button
                          className="btn-signout"
                          style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}
                          onClick={() => {
                            if (window.confirm('Are you sure you want to sign out?')) {
                              setIsAuthenticated(false);
                              localStorage.removeItem('ksk_auth');
                              showToast('Logged out successfully', 'info');
                            }
                          }}
                        >
                          <LogOut size={16} /> Sign Out
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="settings-wrapper">
                  {/* Left Sidebar */}
                  <div className="settings-sidebar">
                    <button className={`settings-nav-btn ${settingsTab === 'automation' ? 'active' : ''}`} onClick={() => setSettingsTab('automation')}>Automations</button>
                    <button className={`settings-nav-btn ${settingsTab === 'profile' ? 'active' : ''}`} onClick={() => setSettingsTab('profile')}>Profile</button>
                    <button className={`settings-nav-btn ${settingsTab === 'display' ? 'active' : ''}`} onClick={() => setSettingsTab('display')}>Display</button>
                    <div style={{ flex: 1 }}></div>
                    <button className={`settings-nav-btn danger ${settingsTab === 'security' ? 'active' : ''}`} onClick={() => setSettingsTab('security')}>Security</button>
                  </div>

                  {/* Right Content */}
                  <div className="settings-content-area">
                    {settingsTab === 'automation' && (
                      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ height: '100%' }}>
                        <h3 className="settings-section-title">Automations</h3>
                        <p className="settings-section-desc">Configure automatic actions and workflow delays.</p>
                        
                        <div className="settings-card">
                          <div className="settings-row">
                            <div>
                              <div className="settings-label">Auto-Dial Delay</div>
                              <div className="settings-hint">Wait time before initiating the next call.</div>
                            </div>
                            <select
                              className="settings-input"
                              value={appSettings.autoDialDelay}
                              onChange={(e) => {
                                setAppSettings({ ...appSettings, autoDialDelay: parseInt(e.target.value) });
                                showToast('Settings saved!');
                              }}
                            >
                              <option value={1}>1 Second</option>
                              <option value={3}>3 Seconds</option>
                              <option value={5}>5 Seconds</option>
                              <option value={10}>10 Seconds</option>
                            </select>
                          </div>

                          <div className="settings-row">
                            <div>
                              <div className="settings-label">Master Switch</div>
                              <div className="settings-hint">Enable or disable auto-dialing globally.</div>
                            </div>
                            <div 
                              className={`settings-toggle ${autoDialEnabled ? 'on' : 'off'}`}
                              onClick={() => setAutoDialEnabled(!autoDialEnabled)}
                            >
                              <div className="settings-toggle-knob" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {settingsTab === 'profile' && (
                      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ height: '100%' }}>
                        <h3 className="settings-section-title">Profile</h3>
                        <p className="settings-section-desc">Manage your contact details and communication templates.</p>
                        
                        <div className="settings-card">
                          <div className="settings-row">
                            <div>
                              <div className="settings-label">Caller ID</div>
                              <div className="settings-hint">The name displayed on outbound messages.</div>
                            </div>
                            <input
                              type="text"
                              className="settings-input"
                              placeholder="E.g. Admissions Office"
                              value={appSettings.callerId}
                              onChange={(e) => setAppSettings({ ...appSettings, callerId: e.target.value })}
                              onBlur={() => showToast('Settings saved!')}
                            />
                          </div>

                          <div className="settings-row col">
                            <div>
                              <div className="settings-label">Response Template</div>
                              <div className="settings-hint">Default message used for WhatsApp and SMS outreach.</div>
                            </div>
                            <textarea
                              className="settings-input settings-textarea"
                              style={{ marginTop: '0.75rem' }}
                              placeholder="Enter template..."
                              value={appSettings.smsTemplate}
                              onChange={(e) => setAppSettings({ ...appSettings, smsTemplate: e.target.value })}
                              onBlur={() => showToast('Settings saved!')}
                            />
                            <div className="settings-hint">
                              Available Tags: [Name], [Course], [CallerId]
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {settingsTab === 'display' && (
                      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ height: '100%' }}>
                        <h3 className="settings-section-title">Display</h3>
                        <p className="settings-section-desc">Customize the visual appearance of your workspace.</p>
                        
                        <div className="settings-card">
                          <div className="settings-row">
                            <div>
                              <div className="settings-label">Interface Theme</div>
                              <div className="settings-hint">Switch between light and dark modes.</div>
                            </div>
                            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                              <button className="btn" style={{ background: 'var(--accent-primary)', color: 'var(--bg-primary)' }}>Dark</button>
                              <button className="btn" style={{ color: 'var(--text-muted)' }} onClick={() => showToast('Light mode restricted by admin.', 'error')}>Light</button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {settingsTab === 'security' && (
                      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ height: '100%' }}>
                        <h3 className="settings-section-title">Security</h3>
                        <p className="settings-section-desc">Manage your active session and security preferences.</p>
                        
                        <div className="settings-card">
                          <div className="settings-row">
                            <div>
                              <div className="settings-label">Active Session</div>
                              <div className="settings-hint">Currently logged in as {loginEmail || 'Agent'}.</div>
                            </div>
                            <button
                              className="btn-signout"
                              onClick={() => {
                                if (window.confirm('Are you sure you want to sign out?')) {
                                  setIsAuthenticated(false);
                                  localStorage.removeItem('ksk_auth');
                                  showToast('Logged out successfully', 'info');
                                }
                              }}
                            >
                              <LogOut size={18} /> Sign Out
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
'''
    new_lines = lines[:start_idx] + [new_settings_code + '\n      </main>\n'] + lines[end_idx+1:]
    with open(r'c:\TOBI PROGRAM\ksk\src\App.tsx', 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("Successfully replaced settings tab.")
else:
    print(f"Could not find markers. start_idx={start_idx}, end_idx={end_idx}")
