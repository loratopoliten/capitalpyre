import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import api from '../../utils/api'

export default function EntLogbooks() {
  const qc = useQueryClient()
  const [selectedDeal, setSelectedDeal] = useState('')
  const { register, handleSubmit, reset } = useForm()

  const { data: deals = [] } = useQuery({
    queryKey: ['deals'],
    queryFn: () => api.get('/deals').then(r => r.data.data),
  })

  const { data: logbooks = [] } = useQuery({
    queryKey: ['logbooks', selectedDeal],
    queryFn: () => api.get(`/logbooks?deal_id=${selectedDeal}`).then(r => r.data.data),
    enabled: !!selectedDeal,
  })

  const submit = useMutation({
    mutationFn: (data) => api.post('/logbooks', { ...data, deal_id: selectedDeal }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['logbooks', selectedDeal] })
      reset()
    },
  })

  const activeDeal = deals.find(d => d.id === parseInt(selectedDeal))

  return (
    <div className="space-y-6 page-enter max-w-3xl">
      <div>
        <h1 className="section-title">Progress Logbooks</h1>
        <p className="section-sub">Keep your investor updated with weekly progress entries.</p>
      </div>

      {/* Deal selector */}
      <div className="form-group">
        <label className="label">Select deal</label>
        <select
          value={selectedDeal}
          onChange={e => setSelectedDeal(e.target.value)}
          className="input max-w-xs"
        >
          <option value="">Choose a deal…</option>
          {deals.map(d => (
            <option key={d.id} value={d.id}>
              Deal #{d.id} — {d.stage}
            </option>
          ))}
        </select>
      </div>

      {selectedDeal && (
        <>
          {/* Submit new logbook */}
          <div className="card">
            <p className="text-sm font-semibold text-white mb-4">Submit Weekly Log</p>
            <form onSubmit={handleSubmit(d => submit.mutate(d))} className="space-y-4">
              <div className="form-group">
                <label className="label">Week number</label>
                <input {...register('week_number', { required: true })} type="number" min="1" max="52" className="input max-w-xs" />
              </div>
              <div className="form-group">
                <label className="label">Activities this week *</label>
                <textarea {...register('activities', { required: true })} rows={3} className="input" placeholder="What did you work on?" />
              </div>
              <div className="form-group">
                <label className="label">Milestones achieved</label>
                <textarea {...register('milestones')} rows={2} className="input" placeholder="Any goals hit this week?" />
              </div>
              <div className="form-group">
                <label className="label">Challenges faced</label>
                <textarea {...register('challenges')} rows={2} className="input" placeholder="What blocked you?" />
              </div>
              <div className="form-group">
                <label className="label">Next steps</label>
                <textarea {...register('next_steps')} rows={2} className="input" placeholder="What's the plan for next week?" />
              </div>
              <button type="submit" disabled={submit.isPending} className="btn-primary">
                {submit.isPending ? 'Submitting…' : 'Submit logbook'}
              </button>
              {submit.isSuccess && <span className="text-xs text-green-400 ml-3">Submitted ✓</span>}
            </form>
          </div>

          {/* Past logbooks */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-white">Past Entries ({logbooks.length})</p>
            {logbooks.length === 0 ? (
              <p className="text-pyre-muted text-sm">No entries yet for this deal.</p>
            ) : (
              logbooks.map(lb => (
                <div key={lb.id} className="card-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="badge badge-gold">Week {lb.week_number}</span>
                    <span className="text-xs text-pyre-muted">{new Date(lb.submitted_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-white mb-1 font-medium">Activities</p>
                  <p className="text-xs text-pyre-muted">{lb.activities}</p>
                  {lb.milestones && <>
                    <p className="text-sm text-white mt-2 mb-1 font-medium">Milestones</p>
                    <p className="text-xs text-pyre-muted">{lb.milestones}</p>
                  </>}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
