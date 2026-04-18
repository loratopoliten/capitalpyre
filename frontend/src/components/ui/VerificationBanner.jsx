import { useSelector } from 'react-redux'
import { selectUser } from '../../store/authSlice'

export default function VerificationBanner() {
  const user = useSelector(selectUser)
  if (!user || user.is_verified) return null

  return (
    <div className="bg-pyre-gold/10 border border-pyre-gold/30 rounded-lg px-4 py-3 mb-4 flex items-start gap-3">
      <span className="text-pyre-gold text-lg flex-shrink-0 mt-0.5">⚠</span>
      <div>
        <p className="text-sm font-semibold text-pyre-gold">Account pending verification</p>
        <p className="text-xs text-pyre-muted mt-0.5">
          Your account is awaiting KYC verification by our admin team. You can explore the platform,
          but some features will be limited until you're verified. You'll receive an email notification
          once your account is approved.
        </p>
      </div>
    </div>
  )
}
