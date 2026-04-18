import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'
import api from '../../utils/api'
import { updateUser } from '../../store/authSlice'

export default function AdminProfile() {
  const qc = useQueryClient()
  const dispatch = useDispatch()
  const { register, handleSubmit, reset, formState: { isDirty, errors } } = useForm()

  const { data: user, isLoading } = useQuery({
    queryKey: ['admin-profile'],
    queryFn: () => api.get('/users/me').then(r => r.data.data),
  })

  useEffect(() => { if (user) reset(user) }, [user, reset])

  const save = useMutation({
    mutationFn: (data) => api.patch('/users/me', data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-profile'] })
      dispatch(updateUser({ firstname: vars.firstname, lastname: vars.lastname }))
    },
  })

  if (isLoading) return <p className="text-pyre-muted text-sm">Loading profile…</p>

  return (
    <div className="space-y-6 page-enter max-w-xl">
      <div>
        <h1 className="section-title">Admin Profile</h1>
        <p className="section-sub">Update your administrator account details.</p>
      </div>

      <div className="card">
        {/* Avatar / role badge */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-pyre-gold/10">
          <div className="w-16 h-16 rounded-full bg-pyre-gold/20 flex items-center justify-center">
            <span className="text-2xl font-bold text-pyre-gold">
              {user?.firstname?.[0]}{user?.lastname?.[0]}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{user?.firstname} {user?.lastname}</p>
            <p className="text-xs text-pyre-muted">{user?.email}</p>
            <span className="badge badge-red mt-1">Admin</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(d => save.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">First name</label>
              <input {...register('firstname', { required: true })} className="input" />
            </div>
            <div className="form-group">
              <label className="label">Last name</label>
              <input {...register('lastname', { required: true })} className="input" />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Email address</label>
            <input value={user?.email || ''} disabled className="input opacity-50 cursor-not-allowed" />
            <p className="text-[10px] text-pyre-muted mt-1">Email cannot be changed.</p>
          </div>

          <div className="form-group">
            <label className="label">Phone</label>
            <input {...register('phone')} className="input" placeholder="+267 7X XXX XXXX" />
          </div>

          <div className="form-group">
            <label className="label">Nationality</label>
            <input {...register('nationality')} className="input" placeholder="Motswana" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={save.isPending || !isDirty} className="btn-primary">
              {save.isPending ? 'Saving…' : 'Save changes'}
            </button>
            {save.isSuccess && <span className="text-xs text-green-400 self-center">Saved ✓</span>}
            {save.isError && <span className="text-xs text-red-400 self-center">Save failed.</span>}
          </div>
        </form>
      </div>

      <div className="card border-red-500/20">
        <p className="text-sm font-semibold text-white mb-1">Change password</p>
        <p className="text-xs text-pyre-muted mb-3">Use the forgot password flow to reset your admin password.</p>
        <a href="/forgot-password" className="btn-ghost text-xs inline-block">
          Reset password →
        </a>
      </div>
    </div>
  )
}
