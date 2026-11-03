import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronRight, Clock3,
  Eye, EyeOff, Fingerprint, KeyRound, LayoutDashboard, LockKeyhole, LogOut,
  Menu, RefreshCw, Shield, ShieldCheck, Smartphone, Sparkles, Trash2, UserRound,
  X, AlertCircle, LoaderCircle, MonitorSmartphone
} from 'lucide-react';
import { api, ApiError, type User, type Session } from './api';

type AuthContext = { user: User | null; reload: () => Promise<void>; clear: () => void };
const phonePattern = /^\+[1-9][0-9]{7,14}$/;
const passwordPattern = /^(?=.{12,128}$)(?=.*[A-Za-z])(?=.*\d).*$/;
const formatDate = (v: string | null) => v ? new Date(v).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';
function getError(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }

function Logo({ light = false }: { light?: boolean }) {
  return <Link to="/" className={`brand ${light ? 'brand-light' : ''}`} aria-label="AuthLab home">
    <span className="brand-mark"><Fingerprint size={24} strokeWidth={2.3} /></span>
    <span>auth<span className="brand-accent">lab</span><span className="brand-dot">.</span></span>
  </Link>;
}
function Spinner() { return <LoaderCircle size={18} className="spin" />; }
function Alert({ message, success = false }: { message: string; success?: boolean }) {
  return <div className={`alert ${success ? 'alert-success' : 'alert-error'}`} role="status">
    {success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}<span>{message}</span>
  </div>;
}
function Field({ label, value, onChange, placeholder, type = 'text', autoComplete, required = true, hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; autoComplete?: string; required?: boolean; hint?: string;
}) {
  const [visible, setVisible] = useState(false);
  const password = type === 'password';
  return <label className="field">
    <span className="field-label">{label}</span>
    <span className="input-wrap">
      <input required={required} value={value} onChange={e => onChange(e.target.value)}
        type={password && visible ? 'text' : type} placeholder={placeholder} autoComplete={autoComplete}
        minLength={password ? 12 : undefined} maxLength={password ? 128 : undefined} />
      {password && <button className="input-icon" type="button" onClick={() => setVisible(v => !v)} aria-label={visible ? 'Hide password' : 'Show password'}>
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>}
    </span>
    {hint && <span className="field-hint">{hint}</span>}
  </label>;
}
function Submit({ children, busy, icon = true }: { children: ReactNode; busy: boolean; icon?: boolean }) {
  return <button className="btn btn-primary btn-full" disabled={busy} type="submit">
    {busy ? <Spinner /> : <>{children}{icon && <ArrowRight size={17} />}</>}
  </button>;
}
function AuthFrame({ eyebrow, title, description, children, footer }: {
  eyebrow: string; title: string; description: string; children: ReactNode; footer?: ReactNode;
}) {
  return <div className="auth-layout">
    <div className="auth-side">
      <Logo light />
      <div className="auth-art">
        <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
        <div className="art-icon"><ShieldCheck size={65} strokeWidth={1.25} /></div>
        <div className="art-card art-card-top"><span className="art-mini"><Check size={15} /></span><span>Identity verified<br /><small>Secure and protected</small></span></div>
        <div className="art-card art-card-bottom"><span className="pulse-dot" /> Encrypted sessions</div>
      </div>
      <div className="auth-side-copy"><span className="eyebrow light-eyebrow"><Sparkles size={14} /> YOUR SECURITY, SIMPLIFIED</span>
        <h2>A safer space for<br />everything you do.</h2>
        <p>Simple authentication, reliable protection, and complete control over your account.</p>
      </div>
      <div className="auth-side-bottom"><span>© {new Date().getFullYear()} AuthLab</span><span>Built with security in mind</span></div>
    </div>
    <main className="auth-main">
      <div className="mobile-logo"><Logo /></div>
      <div className="auth-card">
        <div className="eyebrow"><span className="eyebrow-line" />{eyebrow}</div>
        <h1>{title}</h1><p className="auth-description">{description}</p>
        {children}
        {footer && <div className="form-footer">{footer}</div>}
      </div>
      <p className="auth-legal">Protected by secure, HttpOnly cookie authentication.</p>
    </main>
  </div>;
}
function Login({ auth }: { auth: AuthContext }) {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setBusy(true);
    try { await api.login(mobile.trim(), password); await auth.reload(); navigate('/app', { replace: true }); }
    catch (e) { setError(getError(e)); } finally { setBusy(false); }
  }
  return <AuthFrame eyebrow="WELCOME BACK" title="Sign in to your account" description="Good to see you again. Enter your details to continue."
    footer={<>New to AuthLab? <Link to="/register">Create an account <ArrowRight size={14} /></Link></>}>
    <form onSubmit={submit} className="form-stack">
      {error && <Alert message={error} />}
      <Field label="Mobile number" value={mobile} onChange={setMobile} placeholder="+919876543210" autoComplete="tel" />
      <div className="password-heading"><span>Password</span><Link to="/forgot-password">Forgot password?</Link></div>
      <Field label="" value={password} onChange={setPassword} type="password" placeholder="Enter your password" autoComplete="current-password" />
      <Submit busy={busy}>Sign in</Submit>
    </form>
  </AuthFrame>;
}
function Register() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(''); const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault(); setError('');
    if (!phonePattern.test(mobile.trim())) return setError('Use an international mobile number such as +919876543210.');
    if (!passwordPattern.test(password)) return setError('Use 12–128 characters with letters and numbers.');
    setBusy(true);
    try {
      await api.register({ displayName: displayName.trim(), mobile: mobile.trim(), password });
      navigate('/verify-mobile', { state: { mobile: mobile.trim(), fromRegister: true } });
    }
    catch (e) { setError(getError(e)); } finally { setBusy(false); }
  }
  return <AuthFrame eyebrow="GET STARTED" title="Create your account" description="A few details, and you're on your way to a more secure experience."
    footer={<>Already have an account? <Link to="/login">Sign in <ArrowRight size={14} /></Link></>}>
    <form onSubmit={submit} className="form-stack">
      {error && <Alert message={error} />}
      <Field label="Full name" value={displayName} onChange={setDisplayName} placeholder="Your full name" autoComplete="name" />
      <Field label="Mobile number" value={mobile} onChange={setMobile} placeholder="+919876543210" autoComplete="tel" hint="Include your country code (e.g. +91)." />
      <Field label="Password" value={password} onChange={setPassword} type="password" placeholder="Create a strong password" autoComplete="new-password" hint="At least 12 characters, including letters and numbers." />
      <Submit busy={busy}>Create account</Submit>
    </form>
    <p className="form-note"><Shield size={15} /> Your password is never stored in plain text.</p>
  </AuthFrame>;
}
function VerifyMobile() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobile, setMobile] = useState((location.state as { mobile?: string } | null)?.mobile ?? '');
  const [code, setCode] = useState(''); const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false); const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function verify(e: FormEvent) {
    e.preventDefault(); setError(''); setNotice(''); setBusy(true);
    try { await api.verifyMobile(mobile.trim(), code.trim()); navigate('/login', { state: { verified: true } }); }
    catch (e) { setError(getError(e)); } finally { setBusy(false); }
  }
  async function resend() {
    setError(''); setNotice(''); setResending(true);
    try { const response = await api.resendOtp(mobile.trim()); setNotice(response.message + ' Check your SMS or the backend terminal in development.'); }
    catch (e) { setError(getError(e)); } finally { setResending(false); }
  }
  return <AuthFrame eyebrow="ONE MORE STEP" title="Verify your mobile" description="Enter the 6-digit verification code for your mobile number."
    footer={<Link to="/login"><ArrowLeft size={14} /> Back to sign in</Link>}>
    <form onSubmit={verify} className="form-stack">
      {error && <Alert message={error} />}{notice && <Alert message={notice} success />}
      <Field label="Mobile number" value={mobile} onChange={setMobile} placeholder="+919876543210" autoComplete="tel" />
      <Field label="Verification code" value={code} onChange={v => setCode(v.replace(/\D/g, '').slice(0, 6))} placeholder="000000" autoComplete="one-time-code" />
      <Submit busy={busy}>Verify mobile</Submit>
      <button disabled={resending || !phonePattern.test(mobile.trim())} className="text-button" type="button" onClick={resend}>
        {resending ? <Spinner /> : <RefreshCw size={15} />} Resend verification code
      </button>
    </form>
  </AuthFrame>;
}
function ForgotPassword() {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setBusy(true);
    try { await api.forgotPassword(mobile.trim()); navigate('/reset-password', { state: { mobile: mobile.trim() } }); }
    catch (e) { setError(getError(e)); } finally { setBusy(false); }
  }
  return <AuthFrame eyebrow="ACCOUNT RECOVERY" title="Forgot your password?" description="No worries. We'll help you verify your identity and reset it."
    footer={<Link to="/login"><ArrowLeft size={14} /> Back to sign in</Link>}>
    <form onSubmit={submit} className="form-stack">
      {error && <Alert message={error} />}
      <Field label="Registered mobile number" value={mobile} onChange={setMobile} placeholder="+919876543210" autoComplete="tel" />
      <Submit busy={busy}>Request reset code</Submit>
    </form>
  </AuthFrame>;
}
function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobile, setMobile] = useState((location.state as { mobile?: string } | null)?.mobile ?? '');
  const [code, setCode] = useState(''); const [token, setToken] = useState('');
  const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      if (!token) {
        const data = await api.verifyResetOtp(mobile.trim(), code.trim());
        setToken(data.resetToken); setNotice('Code verified. Set a new password below.');
      } else {
        if (!passwordPattern.test(password)) throw new Error('Use 12–128 characters including letters and numbers.');
        await api.resetPassword(token, password);
        navigate('/login', { replace: true });
      }
    } catch (e) { setError(getError(e)); } finally { setBusy(false); }
  }
  return <AuthFrame eyebrow="ACCOUNT RECOVERY" title={token ? 'Choose a new password' : 'Verify reset code'}
    description={token ? 'Create a new password to secure your account.' : 'Enter the code sent to your registered mobile number.'}
    footer={<Link to="/login"><ArrowLeft size={14} /> Back to sign in</Link>}>
    <form onSubmit={submit} className="form-stack">
      {error && <Alert message={error} />}{notice && <Alert message={notice} success />}
      {!token ? <>
        <Field label="Mobile number" value={mobile} onChange={setMobile} placeholder="+919876543210" />
        <Field label="Six-digit code" value={code} onChange={v => setCode(v.replace(/\D/g, '').slice(0, 6))} placeholder="000000" autoComplete="one-time-code" />
        <Submit busy={busy}>Verify code</Submit>
        <button type="button" className="text-button" onClick={async () => { try { await api.forgotPassword(mobile.trim()); setNotice('If the account is eligible, a new code was requested.'); setError(''); } catch (e) { setError(getError(e)); } }}>Request another code</button>
      </> : <>
        <Field label="New password" value={password} onChange={setPassword} type="password" placeholder="Enter a strong password" autoComplete="new-password" hint="12–128 characters, including letters and numbers." />
        <Submit busy={busy}>Reset password</Submit>
      </>}
    </form>
  </AuthFrame>;
}
function SectionHead({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="section-head"><div className="eyebrow"><span className="eyebrow-line" />{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>;
}
function Panel({ children, title, subtitle, icon }: { children: ReactNode; title: string; subtitle?: string; icon?: ReactNode }) {
  return <section className="panel">
    <div className="panel-heading"><div className="panel-title-group">{icon && <span className="panel-icon">{icon}</span>}<div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div></div></div>
    <div className="panel-content">{children}</div>
  </section>;
}
function Dashboard({ user }: { user: User }) {
  return <>
    <SectionHead eyebrow="OVERVIEW" title={`Hello, ${user.displayName.split(' ')[0]} 👋`} description="Here's a quick look at your account security and status." />
    <div className="welcome-banner"><div className="welcome-copy"><div className="banner-tag"><ShieldCheck size={14} /> YOUR ACCOUNT</div>
      <h2>Security looks good on you.</h2><p>Stay in control of your account, update details and manage your active sessions.</p>
      <Link to="/app/security" className="banner-link">Review security <ArrowRight size={17} /></Link></div><div className="banner-shield"><ShieldCheck size={100} strokeWidth={1} /></div>
    </div>
    <div className="stat-grid">
      <div className="stat-card"><span className="stat-icon green"><CheckCircle2 size={23} /></span><div><span className="stat-label">Mobile verification</span><h3>{user.mobileVerified ? 'Verified' : 'Not verified'}</h3></div></div>
      <div className="stat-card"><span className="stat-icon purple"><LockKeyhole size={23} /></span><div><span className="stat-label">Authentication</span><h3>Session active</h3></div></div>
      <div className="stat-card"><span className="stat-icon blue"><Smartphone size={23} /></span><div><span className="stat-label">Registered mobile</span><h3 className="stat-mobile">{user.mobile}</h3></div></div>
    </div>
    <div className="two-col">
      <Panel title="Your profile" subtitle="Your account at a glance" icon={<UserRound size={20} />}>
        <div className="profile-identity"><span className="avatar-large">{user.displayName.slice(0, 1).toUpperCase()}</span><div><strong>{user.displayName}</strong><span>AuthLab member</span></div></div>
        <div className="data-row"><span>Mobile number</span><strong>{user.mobile}</strong></div>
        <div className="data-row"><span>Account status</span><span className="mini-success"><Check size={13} /> Active</span></div>
        <Link className="panel-text-link" to="/app/profile">View account settings <ChevronRight size={16} /></Link>
      </Panel>
      <Panel title="Security checklist" subtitle="Good habits keep your account safer" icon={<Shield size={20} />}>
        <div className="check-line"><CheckCircle2 size={20} /><span>Mobile verification {user.mobileVerified ? 'complete' : 'pending'}</span></div>
        <div className="check-line"><CheckCircle2 size={20} /><span>Protected by HttpOnly session cookies</span></div>
        <div className="check-line"><CheckCircle2 size={20} /><span>Password stored as a secure hash</span></div>
        <Link className="panel-text-link" to="/app/sessions">Manage your sessions <ChevronRight size={16} /></Link>
      </Panel>
    </div>
  </>;
}
function Profile({ user, auth }: { user: User; auth: AuthContext }) {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState(''); const [newPassword, setNewPassword] = useState('');
  const [mobilePassword, setMobilePassword] = useState(''); const [newMobile, setNewMobile] = useState('');
  const [code, setCode] = useState(''); const [pendingMobile, setPendingMobile] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  async function changePassword(e: FormEvent) {
    e.preventDefault(); setError(''); setNotice(''); setBusy(true);
    try { await api.changePassword(currentPassword, newPassword); auth.clear(); navigate('/login', { replace: true }); }
    catch (e) { setError(getError(e)); } finally { setBusy(false); }
  }
  async function requestMobile(e: FormEvent) {
    e.preventDefault(); setError(''); setNotice(''); setBusy(true);
    try { await api.requestMobileChange(mobilePassword, newMobile.trim()); setPendingMobile(true); setNotice('Verification requested. Check the new number (or development terminal).'); }
    catch (e) { setError(getError(e)); } finally { setBusy(false); }
  }
  async function confirmMobile(e: FormEvent) {
    e.preventDefault(); setError(''); setNotice(''); setBusy(true);
    try { await api.confirmMobileChange(newMobile.trim(), code); auth.clear(); navigate('/login', { replace: true }); }
    catch (e) { setError(getError(e)); } finally { setBusy(false); }
  }
  return <>
    <SectionHead eyebrow="YOUR ACCOUNT" title="Profile & settings" description="Update your credentials and keep your personal information current." />
    <div className="panel profile-card"><div className="profile-hero"><span className="avatar-large big">{user.displayName.charAt(0).toUpperCase()}</span><div><h2>{user.displayName}</h2><p>{user.mobile}</p><span className="mini-success"><Check size={13} /> {user.mobileVerified ? 'Verified account' : 'Pending verification'}</span></div></div></div>
    {error && <Alert message={error} />} {notice && <Alert message={notice} success />}
    <div className="two-col">
      <Panel title="Change password" subtitle="Choose a password you haven't used before" icon={<KeyRound size={20} />}>
        <form onSubmit={changePassword} className="form-stack compact">
          <Field label="Current password" type="password" value={currentPassword} onChange={setCurrentPassword} placeholder="Current password" autoComplete="current-password" />
          <Field label="New password" type="password" value={newPassword} onChange={setNewPassword} placeholder="New strong password" autoComplete="new-password" hint="At least 12 characters with letters and numbers." />
          <button className="btn btn-dark" type="submit" disabled={busy || !passwordPattern.test(newPassword)}>{busy ? <Spinner /> : <><LockKeyhole size={16} /> Update password</>}</button>
        </form>
      </Panel>
      <Panel title="Change mobile number" subtitle="Confirm your new number with a verification code" icon={<Smartphone size={20} />}>
        {!pendingMobile ? <form onSubmit={requestMobile} className="form-stack compact">
          <Field label="Current password" type="password" value={mobilePassword} onChange={setMobilePassword} placeholder="Current password" autoComplete="current-password" />
          <Field label="New mobile number" value={newMobile} onChange={setNewMobile} placeholder="+919876543211" />
          <button className="btn btn-dark" type="submit" disabled={busy || !phonePattern.test(newMobile.trim())}>{busy ? <Spinner /> : <><Smartphone size={16} /> Send verification code</>}</button>
        </form> : <form onSubmit={confirmMobile} className="form-stack compact">
          <p className="inside-note">Enter the code for <strong>{newMobile}</strong>.</p>
          <Field label="Verification code" value={code} onChange={v => setCode(v.replace(/\D/g, '').slice(0, 6))} placeholder="000000" autoComplete="one-time-code" />
          <button className="btn btn-dark" type="submit" disabled={busy || code.length !== 6}>{busy ? <Spinner /> : <><Check size={16} /> Confirm mobile change</>}</button>
          <button type="button" className="text-button" onClick={() => { setPendingMobile(false); setCode(''); }}>Change mobile number</button>
        </form>}
      </Panel>
    </div>
    <div className="note-card"><ShieldCheck size={19} /><span>Changing your password or mobile number signs you out of existing sessions. You'll need to log in again.</span></div>
  </>;
}
function Sessions({ auth }: { auth: AuthContext }) {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]); const [busy, setBusy] = useState(false);
  const [revoking, setRevoking] = useState(''); const [error, setError] = useState('');
  const load = useCallback(async () => {
    setBusy(true); setError(''); try { const data = await api.sessions(); setSessions(data.sessions); }
    catch (e) { setError(getError(e)); } finally { setBusy(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function revoke(id: string, current: boolean) {
    if (!window.confirm(current ? 'Sign out this device?' : 'Revoke this session?')) return;
    setError(''); setRevoking(id);
    try { await api.revokeSession(id); if (current) { auth.clear(); navigate('/login', { replace: true }); } else { await load(); } }
    catch (e) { setError(getError(e)); } finally { setRevoking(''); }
  }
  return <>
    <SectionHead eyebrow="ACCOUNT SECURITY" title="Active sessions" description="See where your account is signed in and remove sessions you don't recognize." />
    {error && <Alert message={error} />}
    <Panel title="Your devices" subtitle="Sessions that are active and haven't expired" icon={<MonitorSmartphone size={20} />}>
      <div className="session-toolbar"><span>{sessions.length} active session{sessions.length === 1 ? '' : 's'}</span><button className="btn btn-outline btn-small" onClick={() => void load()} disabled={busy}><RefreshCw size={15} className={busy ? 'spin' : ''} /> Refresh</button></div>
      {busy && !sessions.length ? <div className="empty-state"><Spinner /> Loading sessions…</div> : sessions.length ? sessions.map(s => <div className="session-item" key={s.id}>
        <span className="device-icon"><MonitorSmartphone size={23} /></span>
        <div className="session-details"><strong>Browser session {s.current && <span className="current-badge">This device</span>}</strong>
          <p>{s.user_agent || 'Unknown device'}</p><span><Clock3 size={13} /> Created {formatDate(s.created_at)} · Expires {formatDate(s.expires_at)}</span></div>
        <button className="btn btn-outline btn-small danger" disabled={!!revoking} onClick={() => void revoke(s.id, s.current)}>
          {revoking === s.id ? <Spinner /> : <Trash2 size={15} />}<span>Revoke</span>
        </button>
      </div>) : <div className="empty-state">No active sessions found.</div>}
    </Panel>
    <div className="note-card"><Shield size={19} /><span>If you notice an unfamiliar session, revoke it and change your password.</span></div>
  </>;
}
function AppShell({ auth }: { auth: AuthContext }) {
  const navigate = useNavigate(); const [menu, setMenu] = useState(false); const [signingOut, setSigningOut] = useState(false);
  const user = auth.user!;
  async function signOut() {
    setSigningOut(true);
    try { await api.logout(); auth.clear(); navigate('/login', { replace: true }); }
    catch (e) { window.alert(getError(e)); } finally { setSigningOut(false); }
  }
  const menuItems = [
    { to: '/app', text: 'Overview', icon: <LayoutDashboard size={19} />, end: true },
    { to: '/app/profile', text: 'Profile & settings', icon: <UserRound size={19} />, end: false },
    { to: '/app/sessions', text: 'Active sessions', icon: <MonitorSmartphone size={19} />, end: false },
  ];
  return <div className="dashboard-layout">
    {menu && <button className="mobile-shade" aria-label="Close menu" onClick={() => setMenu(false)} />}
    <aside className={`sidebar ${menu ? 'sidebar-open' : ''}`}>
      <div className="sidebar-top"><Logo /><button className="mobile-close" onClick={() => setMenu(false)} aria-label="Close menu"><X size={20} /></button></div>
      <div className="sidebar-section-label">WORKSPACE</div>
      <nav className="side-links">{menuItems.map(item => <NavLink key={item.to} end={item.end} to={item.to} onClick={() => setMenu(false)} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
        {item.icon}<span>{item.text}</span>{item.to === '/app' ? null : <ChevronRight className="side-chevron" size={16} />}</NavLink>)}</nav>
    </aside>
    <main className="workspace"><header className="topbar"><button className="menu-button" onClick={() => setMenu(true)} aria-label="Open navigation"><Menu size={22} /></button>
      <div className="topbar-breadcrumb">Workspace <ChevronRight size={14} /> <strong>AuthLab</strong></div>
      <div className="topbar-right"><span className="topbar-status"><span /> System ready</span><span className="avatar-small top-avatar">{user.displayName.charAt(0).toUpperCase()}</span></div>
    </header>
      <div className="workspace-content"><Routes>
        <Route index element={<Dashboard user={user} />} />
        <Route path="profile" element={<Profile user={user} auth={auth} />} />
        <Route path="security" element={<Navigate to="/app/profile" replace />} />
        <Route path="sessions" element={<Sessions auth={auth} />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes><footer className="workspace-footer"><span>© {new Date().getFullYear()} AuthLab</span><span><Activity size={14} /> Secure authentication dashboard</span></footer></div>
    </main>
  </div>;
}
export default function App() {
  const [user, setUser] = useState<User | null>(null); const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    try { const result = await api.me(); setUser(result.user); }
    catch (e) { if (e instanceof ApiError && e.status === 401) setUser(null); else throw e; }
  }, []);
  useEffect(() => { void reload().catch(() => setUser(null)).finally(() => setLoading(false)); }, [reload]);
  const auth: AuthContext = { user, reload, clear: () => setUser(null) };
  if (loading) return <div className="loading-screen"><Logo /><Spinner /><span>Preparing your workspace…</span></div>;
  return <Routes>
    <Route path="/" element={<Navigate to={user ? '/app' : '/login'} replace />} />
    <Route path="/login" element={user ? <Navigate to="/app" replace /> : <Login auth={auth} />} />
    <Route path="/register" element={user ? <Navigate to="/app" replace /> : <Register />} />
    <Route path="/verify-mobile" element={<VerifyMobile />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/app/*" element={user ? <AppShell auth={auth} /> : <Navigate to="/login" replace />} />
    <Route path="*" element={<Navigate to={user ? '/app' : '/login'} replace />} />
  </Routes>;
}
