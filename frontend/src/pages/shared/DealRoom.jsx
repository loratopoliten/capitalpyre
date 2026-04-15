import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import api from '../../utils/api'
import { selectUser, selectRole } from '../../store/authSlice'
import DealTimeline from '../../components/ui/DealTimeline'
import RatingForm from '../../components/ui/RatingForm'

const STAGES    = ['intro','nda','due_diligence','term_sheet','closed','terminated']
const DOC_TYPES = ['nda','term_sheet','financial_statement','pitch_deck','legal','other']

const STAGE_DEADLINES = { intro: 5, nda: 7, due_diligence: 14, term_sheet: 10 }

export default function DealRoom() {
  const { id }   = useParams()
  const user     = useSelector(selectUser)
  const role     = useSelector(selectRole)
  const qc       = useQueryClient()
  const fileRef  = useRef()
  const [docType,    setDocType]    = useState('nda')
  const [stageNote,  setStageNote]  = useState('')
  const [showRating, setShowRating] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['deal', id],
    queryFn: () => api.get(`/deals/${id}`).then(r => r.data.data),
  })

  const advanceStage = useMutation({
    mutationFn: ({ stage }) => api.patch(`/deals/${id}/stage`, { stage, stage_notes: stageNote }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deal', id] }); setStageNote('') },
  })

  const closeInactive = useMutation({
    mutationFn: () => api.patch(`/deals/${id}/close-inactive`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deal', id] }),
  })

  const uploadDoc = useMutation({
    mutationFn: (fd) => api.post(`/deals/${id}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deal', id] }),
  })

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const fd = new FormData()
    fd.append('document', file)
    fd.append('doc_type', docType)
    uploadDoc.mutate(fd)
    e.target.value = ''
  }

  if (isLoading) return <p className="text-pyre-muted text-sm">Loading deal room…</p>
  if (!data)     return <p className="text-pyre-muted text-sm">Deal not found.</p>

  const nextStage  = STAGES[STAGES.indexOf(data.stage) + 1]
  const canAdvance = nextStage && data.stage !== 'closed' && data.stage !== 'terminated'

  // Deadline status
  const isOverdue = data.deadline_at && new Date(data.deadline_at) < new Date()
  const daysLeft  = data.deadline_at
    ? Math.ceil((new Date(data.deadline_at) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="space-y-6 page-enter max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="section-title">Deal Room</h1>
          <p className="section-sub">Deal #{data.id} · {data.target_type} · {data.deal_type || 'equity'}</p>
        </div>
        <div className="flex items-center gap-2">
          {data.amount && (
            <div className="card-sm text-right py-2">
              <p className="text-xs text-pyre-muted">Deal size</p>
              <p className="font-display font-bold text-pyre-gold text-sm">
                BWP {Number(data.amount).toLocaleString()}
              </p>
            </div>
          )}
          <button onClick={() => setShowRating(true)} className="btn-ghost text-xs">
            Rate this interaction
          </button>
        </div>
      </div>

      {/* Deadline warning */}
      {data.deadline_at && data.stage !== 'closed' && data.stage !== 'terminated' && (
        <div className={`card py-3 px-4 ${isOverdue ? 'border-red-500/40 bg-red-900/10' : daysLeft <= 2 ? 'border-pyre-gold/40 bg-pyre-gold/5' : 'border-pyre-gold/10'}`}>
          <p className={`text-xs font-semibold ${isOverdue ? 'text-red-400' : daysLeft <= 2 ? 'text-pyre-gold' : 'text-pyre-muted'}`}>
            {isOverdue
              ? `Stage deadline passed ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''} ago — action required`
              : daysLeft === 0 ? 'Stage deadline is today'
              : `Stage deadline: ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`}
          </p>
          <p className="text-[10px] text-pyre-muted mt-0.5">
            {isOverdue
              ? 'Deals with no activity for 14 days past deadline are auto-closed.'
              : `Expected next action: advance to ${nextStage?.replace('_', ' ') || 'closure'} by ${new Date(data.deadline_at).toLocaleDateString()}`}
          </p>
          {isOverdue && (
            <button
              onClick={() => closeInactive.mutate()}
              disabled={closeInactive.isPending}
              className="text-xs text-red-400 hover:underline mt-1"
            >
              Close this deal →
            </button>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="card">
        <p className="text-sm font-semibold text-white mb-5">Deal Progress</p>
        <DealTimeline currentStage={data.stage} />

        {canAdvance && (
          <div className="mt-6 pt-4 border-t border-pyre-gold/10 space-y-3">
            <input
              value={stageNote}
              onChange={e => setStageNote(e.target.value)}
              className="input text-sm"
              placeholder={`Note when advancing to ${nextStage?.replace('_', ' ')} (optional)`}
            />
            <div className="flex gap-2">
              <button
                onClick={() => advanceStage.mutate({ stage: nextStage })}
                disabled={advanceStage.isPending}
                className="btn-primary text-xs"
              >
                {advanceStage.isPending ? 'Advancing…' : `Advance to ${nextStage?.replace('_', ' ')} →`}
              </button>
              {nextStage !== 'closed' && (
                <button
                  onClick={() => advanceStage.mutate({ stage: 'terminated' })}
                  className="btn-ghost text-xs text-red-400 hover:text-red-300"
                >
                  Terminate deal
                </button>
              )}
            </div>
            {STAGE_DEADLINES[nextStage] && (
              <p className="text-[10px] text-pyre-muted">
                Advancing to {nextStage.replace('_',' ')} sets a {STAGE_DEADLINES[nextStage]}-day deadline for this stage.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between border-b border-pyre-gold/10 pb-3">
          <p className="text-sm font-semibold text-white">Documents ({data.documents?.length || 0})</p>
          <div className="flex items-center gap-2">
            <select value={docType} onChange={e => setDocType(e.target.value)} className="input text-xs py-1.5 w-36">
              {DOC_TYPES.map(d => <option key={d} value={d}>{d.replace('_', ' ')}</option>)}
            </select>
            <button onClick={() => fileRef.current?.click()} disabled={uploadDoc.isPending} className="btn-secondary text-xs py-1.5">
              {uploadDoc.isPending ? 'Uploading…' : '+ Upload'}
            </button>
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.docx,.xlsx" onChange={handleFileUpload} />
          </div>
        </div>
        {!data.documents?.length ? (
          <p className="text-xs text-pyre-muted">No documents yet. Upload your NDA to get started.</p>
        ) : (
          <div className="space-y-2">
            {data.documents.map(doc => (
              <div key={doc.id} className="flex items-center justify-between py-2 border-b border-pyre-gold/5 text-xs">
                <div>
                  <span className="badge badge-blue mr-2">{doc.doc_type.replace('_', ' ')}</span>
                  <span className="text-white">{doc.filename}</span>
                </div>
                <div className="text-right text-pyre-muted">
                  <p>{doc.firstname} {doc.lastname}</p>
                  <p>{new Date(doc.uploaded_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deal event log */}
      {data.events?.length > 0 && (
        <div className="card space-y-2">
          <p className="text-sm font-semibold text-white border-b border-pyre-gold/10 pb-3">Activity Log</p>
          {data.events.map(ev => (
            <div key={ev.id} className="flex items-start gap-3 py-2 border-b border-pyre-gold/5 text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-pyre-muted mt-1.5 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-white capitalize">{ev.event_type.replace(/_/g, ' ')}</span>
                {ev.stage_from && ev.stage_to && (
                  <span className="text-pyre-muted ml-1">
                    {ev.stage_from.replace('_',' ')} → {ev.stage_to.replace('_',' ')}
                  </span>
                )}
                {ev.firstname && <span className="text-pyre-muted ml-1">by {ev.firstname} {ev.lastname}</span>}
              </div>
              <span className="text-pyre-muted flex-shrink-0">{new Date(ev.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Logbooks */}
      {data.logbooks?.length > 0 && (
        <div className="card space-y-3">
          <p className="text-sm font-semibold text-white border-b border-pyre-gold/10 pb-3">
            Progress Logbooks ({data.logbooks.length})
          </p>
          {data.logbooks.map(lb => (
            <div key={lb.id} className="card-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="badge badge-gold">Week {lb.week_number}</span>
                <span className="text-xs text-pyre-muted">{new Date(lb.submitted_at).toLocaleDateString()}</span>
              </div>
              <p className="text-xs text-pyre-muted mt-1">{lb.activities}</p>
            </div>
          ))}
        </div>
      )}

      {/* Rating modal */}
      {showRating && (
        <RatingForm
          matchId={data.match_id}
          role={role}
          onClose={() => setShowRating(false)}
        />
      )}
    </div>
  )
}
