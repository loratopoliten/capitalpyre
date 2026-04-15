import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useEffect } from 'react'
import { selectUser } from './store/authSlice'
import { connectSocket, disconnectSocket } from './utils/socket'

// Public pages
import Landing       from './pages/Landing'
import Login         from './pages/Login'
import Register      from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword  from './pages/ResetPassword'

// Shared layout
import DashboardLayout from './components/layout/DashboardLayout'

// Entrepreneur pages
import EntDashboard  from './pages/entrepreneur/Dashboard'
import EntProfile    from './pages/entrepreneur/Profile'
import EntMatches    from './pages/entrepreneur/Matches'
import EntLogbooks   from './pages/entrepreneur/Logbooks'

// SME pages
import SmeDashboard  from './pages/sme/Dashboard'
import SmeProfile    from './pages/sme/Profile'
import SmeCRS        from './pages/sme/CRSReport'

// Investor pages
import InvDashboard  from './pages/investor/Dashboard'
import InvBrowse     from './pages/investor/Browse'
import InvMatches    from './pages/investor/Matches'
import InvBonds      from './pages/investor/Bonds'
import InvWatchlist  from './pages/investor/Watchlist'

// Admin pages
import AdminDashboard from './pages/admin/Dashboard'
import AdminUsers     from './pages/admin/Users'
import AdminSMEQueue  from './pages/admin/SMEQueue'
import AdminBonds     from './pages/admin/Bonds'
import AdminAnalytics from './pages/admin/Analytics'
import AdminAuditLogs from './pages/admin/AuditLogs'

// Shared pages
import DealRoom      from './pages/shared/DealRoom'
import Messages      from './pages/shared/Messages'
import Notifications from './pages/shared/Notifications'
import NotFound      from './pages/NotFound'

// ── Guards ────────────────────────────────────────────────
const RequireAuth = ({ children, roles }) => {
  const user = useSelector(selectUser)
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return children
}

const RedirectIfAuth = ({ children }) => {
  const user = useSelector(selectUser)
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

// ── Role → dashboard redirect ─────────────────────────────
const DashboardRedirect = () => {
  const user = useSelector(selectUser)
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={`/${user.role}/dashboard`} replace />
}

export default function App() {
  const user = useSelector(selectUser)

  // Connect / disconnect Socket.IO with auth state
  useEffect(() => {
    if (user) connectSocket(user.id)
    else disconnectSocket()
  }, [user])

  return (
    <BrowserRouter>
      <Routes>

        {/* ── Public ─────────────────────────────── */}
        <Route path="/" element={<Landing />} />
        <Route path="/login"    element={<RedirectIfAuth><Login /></RedirectIfAuth>} />
        <Route path="/register" element={<RedirectIfAuth><Register /></RedirectIfAuth>} />
        <Route path="/forgot-password" element={<RedirectIfAuth><ForgotPassword /></RedirectIfAuth>} />
        <Route path="/reset-password"  element={<RedirectIfAuth><ResetPassword /></RedirectIfAuth>} />

        {/* ── Dashboard redirect ──────────────────── */}
        <Route path="/dashboard" element={<RequireAuth><DashboardRedirect /></RequireAuth>} />

        {/* ── Entrepreneur ────────────────────────── */}
        <Route path="/entrepreneur" element={<RequireAuth roles={['entrepreneur']}><DashboardLayout /></RequireAuth>}>
          <Route path="dashboard" element={<EntDashboard />} />
          <Route path="profile"   element={<EntProfile />} />
          <Route path="matches"   element={<EntMatches />} />
          <Route path="logbooks"  element={<EntLogbooks />} />
          <Route path="deals/:id" element={<DealRoom />} />
          <Route path="messages"  element={<Messages />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>

        {/* ── SME ─────────────────────────────────── */}
        <Route path="/sme" element={<RequireAuth roles={['sme']}><DashboardLayout /></RequireAuth>}>
          <Route path="dashboard" element={<SmeDashboard />} />
          <Route path="profile"   element={<SmeProfile />} />
          <Route path="crs"       element={<SmeCRS />} />
          <Route path="deals/:id" element={<DealRoom />} />
          <Route path="messages"  element={<Messages />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>

        {/* ── Investor ────────────────────────────── */}
        <Route path="/investor" element={<RequireAuth roles={['investor']}><DashboardLayout /></RequireAuth>}>
          <Route path="dashboard" element={<InvDashboard />} />
          <Route path="browse"    element={<InvBrowse />} />
          <Route path="matches"   element={<InvMatches />} />
          <Route path="bonds"     element={<InvBonds />} />
          <Route path="watchlist" element={<InvWatchlist />} />
          <Route path="deals/:id" element={<DealRoom />} />
          <Route path="messages"  element={<Messages />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>

        {/* ── Admin ───────────────────────────────── */}
        <Route path="/admin" element={<RequireAuth roles={['admin']}><DashboardLayout /></RequireAuth>}>
          <Route path="dashboard"  element={<AdminDashboard />} />
          <Route path="users"      element={<AdminUsers />} />
          <Route path="sme-queue"  element={<AdminSMEQueue />} />
          <Route path="bonds"      element={<AdminBonds />} />
          <Route path="analytics"  element={<AdminAnalytics />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />
        </Route>

        {/* ── 404 ─────────────────────────────────── */}
        <Route path="*" element={<NotFound />} />

      </Routes>
    </BrowserRouter>
  )
}
