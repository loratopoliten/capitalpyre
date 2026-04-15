const STAGES = ['intro', 'nda', 'due_diligence', 'term_sheet', 'closed']

const STAGE_LABELS = {
  intro:        'Intro',
  nda:          'NDA',
  due_diligence:'Due Diligence',
  term_sheet:   'Term Sheet',
  closed:       'Closed',
  terminated:   'Terminated',
}

export default function DealTimeline({ currentStage }) {
  if (currentStage === 'terminated') {
    return (
      <div className="flex items-center gap-2 py-3">
        <span className="badge badge-red">Deal Terminated</span>
      </div>
    )
  }

  const currentIdx = STAGES.indexOf(currentStage)

  return (
    <div className="flex items-center gap-0 w-full">
      {STAGES.map((stage, idx) => {
        const done    = idx < currentIdx
        const active  = idx === currentIdx
        const pending = idx > currentIdx

        return (
          <div key={stage} className="flex items-center flex-1">
            {/* Node */}
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                ${done    ? 'bg-pyre-gold border-pyre-gold text-pyre-navy' : ''}
                ${active  ? 'bg-pyre-crimson border-pyre-crimson text-white' : ''}
                ${pending ? 'bg-transparent border-pyre-muted/30 text-pyre-muted' : ''}
              `}>
                {done ? '✓' : idx + 1}
              </div>
              <span className={`text-[10px] mt-1 text-center whitespace-nowrap
                ${active  ? 'text-pyre-gold font-semibold' : ''}
                ${done    ? 'text-gray-300' : ''}
                ${pending ? 'text-pyre-muted' : ''}
              `}>
                {STAGE_LABELS[stage]}
              </span>
            </div>
            {/* Connector */}
            {idx < STAGES.length - 1 && (
              <div className={`h-0.5 flex-1 mb-3.5 ${idx < currentIdx ? 'bg-pyre-gold' : 'bg-pyre-muted/20'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
