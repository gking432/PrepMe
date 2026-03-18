'use client'

import { useState } from 'react'
import { Lock, Briefcase, Users, Crown, ChevronDown, ChevronUp, Zap } from 'lucide-react'

interface LockedStageTeasersProps {
  onUnlock: (stage: string) => void
  score?: number
}

const STAGE_DATA = [
  {
    id: 'hiring_manager',
    label: 'Hiring Manager Interview',
    price: '$4.99',
    icon: Briefcase,
    tagline: 'Your biggest unlock.',
    description: 'This is where most candidates get eliminated. Your future boss is deciding if you can do the actual job — and if they want to work with you for the next 3 years.',
    whatWeAssess: [
      'Technical depth — can you handle the real complexity of this role?',
      'How you tell the story of your career, not just list your jobs',
      'Whether your answers are specific or suspiciously generic',
      'Alignment between what they need and what you\'ve actually done',
    ],
    sampleQuestion: '"Walk me through a time you had to make a difficult decision with incomplete information. What did you do and how did it turn out?"',
    sampleFeedback: 'Your answer would be evaluated on specificity, structure, and whether your outcome was credible. Most candidates are too vague here.',
    color: {
      gradient: 'from-indigo-500 to-purple-600',
      light: 'bg-indigo-50',
      border: 'border-indigo-200',
      text: 'text-indigo-700',
      badge: 'bg-indigo-100 text-indigo-700',
      button: 'bg-indigo-600 hover:bg-indigo-700',
      blur: 'from-indigo-50',
    },
  },
  {
    id: 'culture_fit',
    label: 'Culture Fit Interview',
    price: '$3.99',
    icon: Users,
    tagline: 'The one that surprises people.',
    description: 'Candidates underestimate this round. It feels casual. It isn\'t. Your potential teammates are deciding whether they want to spend 40 hours a week with you.',
    whatWeAssess: [
      'Whether your values actually align with this company\'s culture',
      'How you handle conflict, ambiguity, and working styles',
      'Team contribution signals — do you pull weight or create work?',
      'Authenticity — are you performing, or are you actually this person?',
    ],
    sampleQuestion: '"Tell me about a time you disagreed with a teammate\'s approach. How did you handle it?"',
    sampleFeedback: 'This question tests emotional intelligence. A strong answer acknowledges the other person\'s perspective before explaining your own.',
    color: {
      gradient: 'from-emerald-500 to-teal-600',
      light: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      badge: 'bg-emerald-100 text-emerald-700',
      button: 'bg-emerald-600 hover:bg-emerald-700',
      blur: 'from-emerald-50',
    },
  },
  {
    id: 'final',
    label: 'Final Round Interview',
    price: '$5.99',
    icon: Crown,
    tagline: 'The offer is on the table.',
    description: 'You\'ve made it to the final. Now it\'s an executive evaluating whether to put you in front of clients, board members, or senior leadership. The bar is different here.',
    whatWeAssess: [
      'Executive presence — do you communicate like someone at this level?',
      'Strategic thinking — do you understand the business, not just the role?',
      'Composure under pressure and with curveball questions',
      'Your 30-60-90 day narrative — what you\'d actually do on day one',
    ],
    sampleQuestion: '"If you joined tomorrow, what would you focus on in your first 30 days and why?"',
    sampleFeedback: 'Most candidates default to "listen and learn." Strong candidates show they\'ve already thought about the priorities and can articulate a credible day-one plan.',
    color: {
      gradient: 'from-amber-500 to-orange-600',
      light: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      badge: 'bg-amber-100 text-amber-700',
      button: 'bg-amber-600 hover:bg-amber-700',
      blur: 'from-amber-50',
    },
  },
]

function StageTeaserCard({ stage, onUnlock }: { stage: typeof STAGE_DATA[0]; onUnlock: (stage: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = stage.icon

  return (
    <div className={`rounded-2xl border ${stage.color.border} overflow-hidden bg-white`}>
      {/* Header */}
      <div className={`bg-gradient-to-r ${stage.color.gradient} p-5 text-white`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Next Stage</span>
                <span className={`text-xs font-bold px-2 py-0.5 bg-white/20 rounded-full`}>{stage.price}</span>
              </div>
              <h3 className="font-bold text-lg leading-tight">{stage.label}</h3>
            </div>
          </div>
          <Lock className="w-5 h-5 opacity-70 shrink-0 mt-1" />
        </div>
        <p className="mt-3 text-white/90 text-sm font-medium">{stage.tagline}</p>
      </div>

      {/* Preview content */}
      <div className="p-5">
        <p className="text-sm text-gray-600 leading-relaxed mb-4">{stage.description}</p>

        {/* What we assess — always visible, teaser style */}
        <div className={`${stage.color.light} rounded-xl p-4 mb-4`}>
          <div className="flex items-center gap-2 mb-3">
            <Zap className={`w-4 h-4 ${stage.color.text}`} />
            <span className={`text-xs font-bold uppercase tracking-wider ${stage.color.text}`}>What gets assessed</span>
          </div>
          <ul className="space-y-2">
            {stage.whatWeAssess.slice(0, expanded ? undefined : 2).map((item, i) => (
              <li key={i} className={`text-sm flex items-start gap-2 ${stage.color.text}`}>
                <span className="mt-0.5 shrink-0">→</span>
                <span>{item}</span>
              </li>
            ))}
            {!expanded && stage.whatWeAssess.length > 2 && (
              <li className={`text-sm ${stage.color.text} opacity-50`}>
                + {stage.whatWeAssess.length - 2} more areas...
              </li>
            )}
          </ul>
        </div>

        {/* Sample Q&A teaser — blurred */}
        {expanded && (
          <div className="mb-4">
            <div className={`text-xs font-bold uppercase tracking-wider ${stage.color.text} mb-2`}>Sample question you'd face</div>
            <div className="relative rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50">
                <p className="text-sm text-gray-700 italic leading-relaxed">{stage.sampleQuestion}</p>
              </div>
              <div className="p-4 border-t border-gray-100 relative">
                <p className="text-sm text-gray-500 leading-relaxed blur-[3px] select-none pointer-events-none">
                  {stage.sampleFeedback}
                </p>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${stage.color.badge}`}>
                    Unlock to see the full breakdown
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expand / collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold ${stage.color.text} hover:opacity-70 transition-opacity mb-4`}
        >
          {expanded ? (
            <><ChevronUp className="w-3.5 h-3.5" />Show less</>
          ) : (
            <><ChevronDown className="w-3.5 h-3.5" />See what's inside</>
          )}
        </button>

        {/* CTA */}
        <button
          onClick={() => onUnlock(stage.id)}
          className={`w-full py-3 rounded-xl text-white font-bold text-sm transition-colors ${stage.color.button}`}
        >
          Unlock {stage.label} — {stage.price}
        </button>
      </div>
    </div>
  )
}

export default function LockedStageTeasers({ onUnlock, score }: LockedStageTeasersProps) {
  return (
    <div className="mt-8">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900">
          {score && score >= 6
            ? "You're ready for the next round."
            : "The full interview process is waiting."}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {score && score >= 6
            ? "Most candidates stop here. The ones who get offers keep going."
            : "One interview won't get you the offer. Here's what's next."}
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {STAGE_DATA.map(stage => (
          <StageTeaserCard key={stage.id} stage={stage} onUnlock={onUnlock} />
        ))}
      </div>
    </div>
  )
}
