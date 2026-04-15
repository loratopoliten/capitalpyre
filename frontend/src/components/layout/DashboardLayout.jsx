import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { selectUser, selectRole, logout } from '../../store/authSlice'
import { selectUnread } from '../../store/notificationsSlice'
import NotificationBell from '../ui/NotificationBell'
import useSocketNotifications from '../../hooks/useSocketNotifications'

// ── Role-based nav config ─────────────────────────────────
const NAV = {
  entrepreneur: [
    { to: '/entrepreneur/dashboard', label: 'Dashboard',      icon: '▦' },
    { to: '/entrepreneur/profile',   label: 'My Profile',     icon: '◈' },
    { to: '/entrepreneur/matches',   label: 'Matches',        icon: '⚡' },
    { to: '/entrepreneur/logbooks',  label: 'Progress Logs',  icon: '◎' },
    { to: '/entrepreneur/messages',  label: 'Messages',       icon: '✉' },
  ],
  sme: [
    { to: '/sme/dashboard', label: 'Dashboard',       icon: '▦' },
    { to: '/sme/profile',   label: 'SME Profile',     icon: '◈' },
    { to: '/sme/crs',       label: 'Readiness Score', icon: '⚡' },
    { to: '/sme/messages',  label: 'Messages',        icon: '✉' },
  ],
  investor: [
    { to: '/investor/dashboard', label: 'Dashboard',  icon: '▦' },
    { to: '/investor/browse',    label: 'Browse',     icon: '◉' },
    { to: '/investor/matches',   label: 'My Matches', icon: '⚡' },
    { to: '/investor/bonds',     label: 'Bond Pools', icon: '◈' },
    { to: '/investor/watchlist', label: 'Watchlist',  icon: '★' },
    { to: '/investor/messages',  label: 'Messages',   icon: '✉' },
  ],
  admin: [
    { to: '/admin/dashboard',  label: 'Dashboard',   icon: '▦' },
    { to: '/admin/users',      label: 'Users',       icon: '◉' },
    { to: '/admin/sme-queue',  label: 'SME Queue',   icon: '⏳' },
    { to: '/admin/bonds',      label: 'Bond Pools',  icon: '◈' },
    { to: '/admin/analytics',  label: 'Analytics',   icon: '▲' },
    { to: '/admin/audit-logs', label: 'Audit Logs',  icon: '◎' },
  ],
}

const ROLE_LABELS = {
  entrepreneur: 'Entrepreneur',
  sme:          'SME Owner',
  investor:     'Investor',
  admin:        'Admin',
}

export default function DashboardLayout() {
  const user     = useSelector(selectUser)
  const role     = useSelector(selectRole)
  const unread   = useSelector(selectUnread)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const navItems = NAV[role] || []

  useSocketNotifications()

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#000D1A]">

      {/* ── Sidebar ─────────────────────────────── */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-pyre-navy border-r border-pyre-gold/10">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-pyre-gold/10">
          <span className="font-display font-bold text-lg tracking-wide text-white">
            CAPITAL <span className="text-pyre-gold">PYRE</span>
          </span>
          <p className="text-[10px] text-pyre-muted mt-0.5 tracking-widest uppercase">
            {ROLE_LABELS[role]}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-pyre-gold/10">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-pyre-blue flex items-center justify-center text-xs font-bold text-white">
              {user?.firstname?.[0]}{user?.lastname?.[0]}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-white truncate">
                {user?.firstname} {user?.lastname}
              </p>
              <p className="text-[10px] text-pyre-muted truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full text-left text-xs text-pyre-muted hover:text-red-400 transition-colors px-1">
            Sign out →
          </button>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="h-14 flex-shrink-0 flex items-center justify-between px-6 bg-pyre-navy/60 border-b border-pyre-gold/10 backdrop-blur-sm">
          <div />
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-pyre-blue flex items-center justify-center text-xs font-bold text-white">
                {user?.firstname?.[0]}
              </div>
              <span className="text-sm text-gray-300">{user?.firstname}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 page-enter">
          <Outlet />
        </main>

      </div>
    </div>
  )
}
