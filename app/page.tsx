'use client'

import { useState, useEffect, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { copyToClipboard } from '@/lib/clipboard'
import { useLyzrAgentEvents } from '@/lib/lyzrAgentEvents'
import { AgentActivityPanel } from '@/components/AgentActivityPanel'
import {
  FiGrid,
  FiEdit,
  FiSearch,
  FiImage,
  FiCopy,
  FiRefreshCw,
  FiDownload,
  FiChevronRight,
  FiClock,
  FiFileText,
  FiTarget,
  FiAlertCircle,
  FiInfo,
  FiActivity,
  FiEye,
  FiSliders,
  FiZap,
  FiList,
  FiBarChart2,
  FiBookOpen,
  FiType,
  FiAlignLeft,
  FiTag,
  FiStar,
  FiArrowRight,
  FiCheck,
  FiLoader,
  FiChevronLeft
} from 'react-icons/fi'

// --------------- CONSTANTS ---------------
const CONTENT_WRITER_AGENT_ID = '6993c1eaa32ee924407711bb'
const SEO_ANALYST_AGENT_ID = '6993c1ea377a30c497e53776'
const VISUAL_DESIGNER_AGENT_ID = '6993c1eaf9e30d409c8625a0'

type ScreenType = 'dashboard' | 'content' | 'seo' | 'graphics'
type ContentTone = 'Professional' | 'Casual' | 'Persuasive' | 'Informative'
type ContentTypeOption = 'Blog Post' | 'Social Caption' | 'Email Campaign' | 'Ad Copy' | 'Landing Page'
type GraphicsFormat = 'Banner' | 'Thumbnail' | 'Social Post' | 'Ad Creative'
type FilterTab = 'All' | 'Content' | 'SEO' | 'Graphics'

// --------------- THEME ---------------
const THEME_VARS: Record<string, string> = {
  '--background': '30 40% 98%',
  '--foreground': '20 40% 10%',
  '--card': '30 40% 96%',
  '--card-foreground': '20 40% 10%',
  '--primary': '24 95% 53%',
  '--primary-foreground': '30 40% 98%',
  '--secondary': '30 35% 92%',
  '--secondary-foreground': '20 40% 15%',
  '--accent': '12 80% 50%',
  '--accent-foreground': '30 40% 98%',
  '--muted': '30 30% 90%',
  '--muted-foreground': '20 25% 45%',
  '--border': '30 35% 88%',
  '--input': '30 30% 80%',
  '--ring': '24 95% 53%',
  '--sidebar-bg': '30 38% 95%',
  '--sidebar-fg': '20 40% 10%',
  '--sidebar-primary': '24 95% 53%',
  '--sidebar-border': '30 35% 88%',
  '--sidebar-accent': '30 35% 90%',
} as Record<string, string>

// --------------- INTERFACES ---------------
interface ContentResult {
  title?: string
  content_type?: string
  content?: string
  word_count?: number
  key_points?: string[]
  meta_description?: string
}

interface KeywordAnalysis {
  primary_keywords?: string[]
  secondary_keywords?: string[]
  keyword_density?: string
  missing_keywords?: string[]
}

interface Readability {
  score?: number
  grade_level?: string
  suggestions?: string[]
}

interface MetaDescription {
  current_evaluation?: string
  suggested_meta?: string
}

interface HeadingStructure {
  evaluation?: string
  suggestions?: string[]
}

interface Recommendation {
  priority?: string
  category?: string
  suggestion?: string
}

interface SEOResult {
  overall_score?: number
  keyword_analysis?: KeywordAnalysis
  readability?: Readability
  meta_description?: MetaDescription
  heading_structure?: HeadingStructure
  recommendations?: Recommendation[]
}

interface DesignResult {
  image_description?: string
  format_type?: string
  style_applied?: string
  design_notes?: string
}

interface ArtifactFile {
  file_url?: string
  name?: string
  format_type?: string
}

interface RecentOutput {
  id: string
  type: 'Content' | 'SEO' | 'Graphics'
  title: string
  timestamp: string
  preview: string
}

// --------------- HELPERS ---------------
function parseResult<T>(raw: unknown): T {
  if (!raw) return {} as T
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T
    } catch {
      return {} as T
    }
  }
  return raw as T
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

function formatTimestamp(): string {
  const now = new Date()
  return now.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {part}
      </strong>
    ) : (
      part
    )
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return (
            <h4 key={i} className="font-semibold text-sm mt-3 mb-1 font-serif" style={{ color: 'hsl(20,40%,10%)' }}>
              {line.slice(4)}
            </h4>
          )
        if (line.startsWith('## '))
          return (
            <h3 key={i} className="font-semibold text-base mt-3 mb-1 font-serif" style={{ color: 'hsl(20,40%,10%)' }}>
              {line.slice(3)}
            </h3>
          )
        if (line.startsWith('# '))
          return (
            <h2 key={i} className="font-bold text-lg mt-4 mb-2 font-serif" style={{ color: 'hsl(20,40%,10%)' }}>
              {line.slice(2)}
            </h2>
          )
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <li key={i} className="ml-4 list-disc text-sm" style={{ lineHeight: '1.6', color: 'hsl(20,40%,10%)' }}>
              {formatInline(line.slice(2))}
            </li>
          )
        if (/^\d+\.\s/.test(line))
          return (
            <li key={i} className="ml-4 list-decimal text-sm" style={{ lineHeight: '1.6', color: 'hsl(20,40%,10%)' }}>
              {formatInline(line.replace(/^\d+\.\s/, ''))}
            </li>
          )
        if (!line.trim()) return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm" style={{ lineHeight: '1.6', color: 'hsl(20,40%,10%)' }}>
            {formatInline(line)}
          </p>
        )
      })}
    </div>
  )
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'hsl(142,76%,36%)'
  if (score >= 40) return 'hsl(45,93%,47%)'
  return 'hsl(0,84%,60%)'
}

function getScoreBgColor(score: number): string {
  if (score >= 70) return 'hsl(142,76%,96%)'
  if (score >= 40) return 'hsl(45,93%,95%)'
  return 'hsl(0,84%,97%)'
}

function getPriorityColor(priority: string): { bg: string; text: string } {
  const p = (priority ?? '').toLowerCase()
  if (p === 'high') return { bg: 'hsl(0,84%,95%)', text: 'hsl(0,84%,45%)' }
  if (p === 'medium') return { bg: 'hsl(45,93%,92%)', text: 'hsl(45,80%,35%)' }
  return { bg: 'hsl(142,76%,94%)', text: 'hsl(142,50%,30%)' }
}

function getTypeBadgeStyle(type: string) {
  switch (type) {
    case 'Content': return { bg: 'hsl(24,95%,94%)', color: 'hsl(24,95%,40%)' }
    case 'SEO': return { bg: 'hsl(12,80%,94%)', color: 'hsl(12,80%,40%)' }
    case 'Graphics': return { bg: 'hsl(262,83%,94%)', color: 'hsl(262,83%,40%)' }
    default: return { bg: 'hsl(30,30%,90%)', color: 'hsl(20,25%,45%)' }
  }
}

// --------------- SAMPLE DATA ---------------
const SAMPLE_CONTENT_RESULT: ContentResult = {
  title: 'The Future of AI in Marketing: 5 Trends Every Brand Should Know',
  content_type: 'Blog Post',
  content: '# The Future of AI in Marketing\n\nArtificial intelligence is transforming how brands connect with their audiences. From personalized content creation to predictive analytics, AI tools are revolutionizing every aspect of digital marketing.\n\n## 1. Hyper-Personalization at Scale\n\nAI enables marketers to deliver **personalized experiences** to millions of users simultaneously. Machine learning algorithms analyze user behavior, preferences, and purchase history to create tailored content.\n\n## 2. Predictive Analytics\n\nBy analyzing historical data, AI can predict **future trends** and consumer behaviors, allowing marketers to stay ahead of the curve.\n\n## 3. Automated Content Creation\n\nAI-powered tools can now generate blog posts, social media captions, and ad copy that resonates with target audiences.\n\n## 4. Voice Search Optimization\n\nWith the rise of voice assistants, optimizing content for **voice search** has become crucial.\n\n## 5. Visual Recognition\n\nAI-powered visual recognition technology helps brands understand how their products appear in user-generated content.',
  word_count: 842,
  key_points: [
    'AI enables hyper-personalization at unprecedented scale',
    'Predictive analytics helps marketers forecast consumer behavior',
    'Automated content creation saves time while maintaining quality',
    'Voice search optimization is increasingly important',
    'Visual recognition technology offers new marketing insights',
  ],
  meta_description: 'Discover the top 5 AI marketing trends transforming how brands connect with audiences. Learn about hyper-personalization, predictive analytics, and more.',
}

const SAMPLE_SEO_RESULT: SEOResult = {
  overall_score: 78,
  keyword_analysis: {
    primary_keywords: ['AI marketing', 'artificial intelligence', 'digital marketing'],
    secondary_keywords: ['personalization', 'predictive analytics', 'content creation', 'voice search'],
    keyword_density: '2.4% - Within optimal range (1-3%)',
    missing_keywords: ['marketing automation', 'ROI', 'conversion rate'],
  },
  readability: {
    score: 72,
    grade_level: 'Grade 8-9 (Good for general audience)',
    suggestions: [
      'Consider shortening some sentences in the introduction',
      'Add more transition words between sections',
      'Break up the third paragraph for better readability',
    ],
  },
  meta_description: {
    current_evaluation: 'Meta description is 156 characters, within the recommended 150-160 range. Includes primary keyword "AI marketing".',
    suggested_meta: 'Explore 5 game-changing AI marketing trends for 2025. From hyper-personalization to predictive analytics, discover how AI is transforming digital marketing.',
  },
  heading_structure: {
    evaluation: 'Good H1-H2 hierarchy. Consider adding H3 subheadings for longer sections.',
    suggestions: [
      'Add an H3 under "Hyper-Personalization" for examples',
      'Include an H2 conclusion section',
      'Ensure all headings contain relevant keywords',
    ],
  },
  recommendations: [
    { priority: 'High', category: 'Keywords', suggestion: 'Add "marketing automation" as a secondary keyword throughout the article' },
    { priority: 'High', category: 'Internal Links', suggestion: 'Add 3-5 internal links to related content on your site' },
    { priority: 'Medium', category: 'Meta Tags', suggestion: 'Update the meta title to include the primary keyword at the beginning' },
    { priority: 'Medium', category: 'Content Length', suggestion: 'Consider expanding the article to 1200+ words for better ranking potential' },
    { priority: 'Low', category: 'Images', suggestion: 'Add alt text with keywords to all images in the article' },
  ],
}

const SAMPLE_RECENT_OUTPUTS: RecentOutput[] = [
  { id: '1', type: 'Content', title: 'AI Marketing Trends Blog Post', timestamp: 'Jan 15, 10:30 AM', preview: 'A comprehensive blog post covering 5 AI marketing trends that are reshaping the industry...' },
  { id: '2', type: 'SEO', title: 'SEO Analysis: Marketing Blog', timestamp: 'Jan 15, 10:45 AM', preview: 'Overall Score: 78/100 - Good keyword usage, needs more internal links and longer content...' },
  { id: '3', type: 'Graphics', title: 'Social Media Banner - AI Theme', timestamp: 'Jan 15, 11:00 AM', preview: 'A vibrant social media banner with gradient background featuring AI and data visuals...' },
  { id: '4', type: 'Content', title: 'Product Launch Email Campaign', timestamp: 'Jan 14, 3:20 PM', preview: 'Engaging email campaign series for the Q1 product launch with A/B test variants...' },
  { id: '5', type: 'Graphics', title: 'Ad Creative - Spring Sale', timestamp: 'Jan 14, 2:10 PM', preview: 'Eye-catching ad creative featuring spring colors and seasonal promotional messaging...' },
]

// --------------- AGENT INFO ---------------
const AGENTS = [
  { id: CONTENT_WRITER_AGENT_ID, name: 'Content Writer', desc: 'Blog posts, social captions, email campaigns, ad copy', icon: FiEdit },
  { id: SEO_ANALYST_AGENT_ID, name: 'SEO Analyst', desc: 'Keyword analysis, readability, meta descriptions, headings', icon: FiSearch },
  { id: VISUAL_DESIGNER_AGENT_ID, name: 'Visual Designer', desc: 'Banners, thumbnails, social posts, ad creatives', icon: FiImage },
]

// --------------- CARD WRAPPER ---------------
const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.75)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderColor: 'rgba(255,255,255,0.18)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
}

const inputStyle: React.CSSProperties = {
  background: 'hsl(30,40%,98%)',
  borderColor: 'hsl(30,35%,88%)',
  color: 'hsl(20,40%,10%)',
}

// --------------- SUB-COMPONENTS ---------------

function Sidebar({ activeScreen, onNavigate, collapsed, onToggle }: {
  activeScreen: ScreenType
  onNavigate: (screen: ScreenType) => void
  collapsed: boolean
  onToggle: () => void
}) {
  const navItems: { key: ScreenType; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: FiGrid },
    { key: 'content', label: 'Content Studio', icon: FiEdit },
    { key: 'seo', label: 'SEO Analyzer', icon: FiSearch },
    { key: 'graphics', label: 'Graphics Studio', icon: FiImage },
  ]

  return (
    <aside
      className="flex flex-col border-r transition-all duration-300 shrink-0"
      style={{
        width: collapsed ? '64px' : '240px',
        background: 'hsl(30,38%,95%)',
        borderColor: 'hsl(30,35%,88%)',
      }}
    >
      {/* Logo Area */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'hsl(30,35%,88%)' }}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'hsl(24,95%,53%)' }}>
              <FiZap size={16} color="hsl(30,40%,98%)" />
            </div>
            <span className="font-serif font-bold text-sm" style={{ color: 'hsl(20,40%,10%)', letterSpacing: '-0.01em' }}>MCC</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto" style={{ background: 'hsl(24,95%,53%)' }}>
            <FiZap size={16} color="hsl(30,40%,98%)" />
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <div className="px-3 pt-3">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center p-1.5 rounded-lg transition-colors duration-200 hover:opacity-80"
          style={{ background: 'hsl(30,35%,90%)', color: 'hsl(20,40%,10%)' }}
        >
          {collapsed ? <FiChevronRight size={14} /> : <FiChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 mt-1">
        {navItems.map((item) => {
          const isActive = activeScreen === item.key
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left"
              style={{
                background: isActive ? 'hsl(24,95%,53%)' : 'transparent',
                color: isActive ? 'hsl(30,40%,98%)' : 'hsl(20,25%,45%)',
                fontWeight: isActive ? 500 : 400,
                fontSize: '13px',
                letterSpacing: '-0.01em',
              }}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Bottom Agent Status */}
      {!collapsed && (
        <div className="p-3 border-t" style={{ borderColor: 'hsl(30,35%,88%)' }}>
          <div className="p-3 rounded-xl" style={{ background: 'hsl(30,35%,90%)' }}>
            <p className="text-xs font-medium mb-2" style={{ color: 'hsl(20,40%,10%)' }}>Powered by</p>
            <div className="space-y-1.5">
              {AGENTS.map((a) => (
                <div key={a.id} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'hsl(142,76%,46%)' }} />
                  <span className="text-xs" style={{ color: 'hsl(20,25%,45%)' }}>{a.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

function DashboardScreen({ recentOutputs, sampleMode, onNavigate, onFilterChange, activeFilter }: {
  recentOutputs: RecentOutput[]
  sampleMode: boolean
  onNavigate: (screen: ScreenType) => void
  onFilterChange: (filter: FilterTab) => void
  activeFilter: FilterTab
}) {
  const displayOutputs = sampleMode && recentOutputs.length === 0 ? SAMPLE_RECENT_OUTPUTS : recentOutputs
  const filteredOutputs = activeFilter === 'All' ? displayOutputs : displayOutputs.filter((o) => o.type === activeFilter)
  const filters: FilterTab[] = ['All', 'Content', 'SEO', 'Graphics']

  const quickActions = [
    {
      screen: 'content' as ScreenType,
      icon: FiEdit,
      title: 'Content Studio',
      desc: 'Create blog posts, social captions, email campaigns, and ad copy with AI assistance.',
      color: 'hsl(24,95%,53%)',
      bgColor: 'hsl(24,95%,96%)',
    },
    {
      screen: 'seo' as ScreenType,
      icon: FiSearch,
      title: 'SEO Analyzer',
      desc: 'Analyze content for keywords, readability, meta descriptions, and get optimization recommendations.',
      color: 'hsl(12,80%,50%)',
      bgColor: 'hsl(12,80%,96%)',
    },
    {
      screen: 'graphics' as ScreenType,
      icon: FiImage,
      title: 'Graphics Studio',
      desc: 'Generate marketing visuals including banners, thumbnails, social posts, and ad creatives.',
      color: 'hsl(262,83%,58%)',
      bgColor: 'hsl(262,83%,96%)',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-bold mb-1" style={{ color: 'hsl(20,40%,10%)', letterSpacing: '-0.02em' }}>
          Marketing Command Center
        </h1>
        <p className="text-sm" style={{ color: 'hsl(20,25%,45%)', lineHeight: '1.6' }}>
          Create content, analyze SEO, and generate visuals -- all powered by AI agents working together.
        </p>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickActions.map((qa) => (
          <button
            key={qa.screen}
            onClick={() => onNavigate(qa.screen)}
            className="text-left p-5 rounded-2xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group"
            style={cardStyle}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: qa.bgColor }}>
              <qa.icon size={20} color={qa.color} />
            </div>
            <h3 className="font-serif font-semibold text-sm mb-1" style={{ color: 'hsl(20,40%,10%)' }}>{qa.title}</h3>
            <p className="text-xs mb-3" style={{ color: 'hsl(20,25%,45%)', lineHeight: '1.6' }}>{qa.desc}</p>
            <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: qa.color }}>
              Open Studio <FiArrowRight size={12} className="transition-transform duration-200 group-hover:translate-x-1" />
            </span>
          </button>
        ))}
      </div>

      {/* Recent Outputs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif font-semibold text-base" style={{ color: 'hsl(20,40%,10%)' }}>Recent Outputs</h2>
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'hsl(30,30%,90%)' }}>
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => onFilterChange(f)}
                className="px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200"
                style={{
                  background: activeFilter === f ? 'white' : 'transparent',
                  color: activeFilter === f ? 'hsl(20,40%,10%)' : 'hsl(20,25%,45%)',
                  boxShadow: activeFilter === f ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {filteredOutputs.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border" style={{ background: 'rgba(255,255,255,0.75)', borderColor: 'hsl(30,35%,88%)' }}>
            <FiFileText size={32} className="mx-auto mb-3 opacity-30" style={{ color: 'hsl(20,25%,45%)' }} />
            <p className="text-sm font-medium mb-1" style={{ color: 'hsl(20,40%,10%)' }}>No outputs yet</p>
            <p className="text-xs" style={{ color: 'hsl(20,25%,45%)' }}>
              Start creating content, analyzing SEO, or generating graphics to see your work here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredOutputs.map((item) => {
              const badge = getTypeBadgeStyle(item.type)
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-4 rounded-xl border transition-all duration-200 hover:shadow-md cursor-default"
                  style={cardStyle}
                >
                  <span
                    className="px-2 py-0.5 rounded-md text-xs font-medium shrink-0 mt-0.5"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    {item.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate" style={{ color: 'hsl(20,40%,10%)' }}>{item.title}</h4>
                    <p className="text-xs truncate mt-0.5" style={{ color: 'hsl(20,25%,45%)', lineHeight: '1.6' }}>{item.preview}</p>
                  </div>
                  <span className="text-xs shrink-0 flex items-center gap-1 whitespace-nowrap" style={{ color: 'hsl(20,25%,45%)' }}>
                    <FiClock size={11} />
                    {item.timestamp}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function ContentStudioScreen({ sampleMode, onAddOutput, setActiveAgentId }: {
  sampleMode: boolean
  onAddOutput: (output: RecentOutput) => void
  setActiveAgentId: (id: string | null) => void
}) {
  const [topic, setTopic] = useState('')
  const [contentType, setContentType] = useState<ContentTypeOption>('Blog Post')
  const [audience, setAudience] = useState('')
  const [tone, setTone] = useState<ContentTone>('Professional')
  const [wordCount, setWordCount] = useState(800)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ContentResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const displayResult = sampleMode && !result ? SAMPLE_CONTENT_RESULT : result
  const contentTypes: ContentTypeOption[] = ['Blog Post', 'Social Caption', 'Email Campaign', 'Ad Copy', 'Landing Page']
  const tones: ContentTone[] = ['Professional', 'Casual', 'Persuasive', 'Informative']

  const handleGenerate = async () => {
    if (!topic.trim()) return
    setLoading(true)
    setError(null)
    setActiveAgentId(CONTENT_WRITER_AGENT_ID)

    const message = `Write a ${contentType} about "${topic.trim()}". Target audience: ${audience.trim() || 'General audience'}. Tone: ${tone}. Target word count: approximately ${wordCount} words. Please provide a structured response with title, content, word count, key points, and meta description.`

    try {
      const res = await callAIAgent(message, CONTENT_WRITER_AGENT_ID)
      if (res.success) {
        const parsed = parseResult<ContentResult>(res?.response?.result)
        setResult(parsed)
        onAddOutput({
          id: generateId(),
          type: 'Content',
          title: parsed?.title ?? topic,
          timestamp: formatTimestamp(),
          preview: (parsed?.content ?? '').substring(0, 120) + '...',
        })
      } else {
        setError(res?.error ?? 'Failed to generate content. Please try again.')
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
      setActiveAgentId(null)
    }
  }

  const handleCopy = async () => {
    const text = displayResult?.content ?? ''
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleRegenerate = () => {
    if (topic.trim()) handleGenerate()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-serif font-bold mb-1" style={{ color: 'hsl(20,40%,10%)', letterSpacing: '-0.02em' }}>
          Content Studio
        </h1>
        <p className="text-sm" style={{ color: 'hsl(20,25%,45%)' }}>Generate marketing content using AI -- from blog posts to ad copy.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Form */}
        <div className="p-5 rounded-2xl border" style={cardStyle}>
          <h2 className="font-serif font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: 'hsl(20,40%,10%)' }}>
            <FiSliders size={14} /> Configuration
          </h2>

          <div className="space-y-4">
            {/* Topic */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(20,40%,10%)' }}>Topic *</label>
              <input
                type="text"
                placeholder="e.g., The Future of AI in Marketing"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-orange-300"
                style={inputStyle}
              />
            </div>

            {/* Content Type */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(20,40%,10%)' }}>Content Type</label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value as ContentTypeOption)}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all duration-200"
                style={inputStyle}
              >
                {contentTypes.map((ct) => (
                  <option key={ct} value={ct}>{ct}</option>
                ))}
              </select>
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(20,40%,10%)' }}>Target Audience</label>
              <input
                type="text"
                placeholder="e.g., Marketing professionals, 25-45"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-orange-300"
                style={inputStyle}
              />
            </div>

            {/* Tone */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'hsl(20,40%,10%)' }}>Tone</label>
              <div className="flex flex-wrap gap-2">
                {tones.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 border"
                    style={{
                      background: tone === t ? 'hsl(24,95%,53%)' : 'hsl(30,40%,98%)',
                      color: tone === t ? 'hsl(30,40%,98%)' : 'hsl(20,25%,45%)',
                      borderColor: tone === t ? 'hsl(24,95%,53%)' : 'hsl(30,35%,88%)',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Word Count Slider */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(20,40%,10%)' }}>
                Word Count: <span style={{ color: 'hsl(24,95%,53%)' }}>{wordCount}</span>
              </label>
              <input
                type="range"
                min={100}
                max={3000}
                step={50}
                value={wordCount}
                onChange={(e) => setWordCount(Number(e.target.value))}
                className="w-full accent-orange-500"
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: 'hsl(20,25%,45%)' }}>
                <span>100</span>
                <span>3000</span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl text-xs" style={{ background: 'hsl(0,84%,97%)', color: 'hsl(0,84%,45%)' }}>
                <FiAlertCircle size={14} />
                {error}
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
              className="w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
              style={{ background: 'hsl(24,95%,53%)', color: 'hsl(30,40%,98%)' }}
            >
              {loading ? (
                <><FiLoader size={14} className="animate-spin" /> Generating...</>
              ) : (
                <><FiEdit size={14} /> Generate Content</>
              )}
            </button>
          </div>
        </div>

        {/* Output Panel */}
        <div className="p-5 rounded-2xl border" style={cardStyle}>
          <h2 className="font-serif font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: 'hsl(20,40%,10%)' }}>
            <FiFileText size={14} /> Output
          </h2>

          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-6 rounded-lg w-3/4" style={{ background: 'hsl(30,30%,90%)' }} />
              <div className="h-4 rounded-lg w-1/4" style={{ background: 'hsl(30,30%,90%)' }} />
              <div className="space-y-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <div key={n} className="h-3 rounded-lg" style={{ background: 'hsl(30,30%,90%)', width: `${60 + (n * 5) % 40}%` }} />
                ))}
              </div>
              <div className="flex gap-2">
                <div className="h-8 rounded-lg w-20" style={{ background: 'hsl(30,30%,90%)' }} />
                <div className="h-8 rounded-lg w-24" style={{ background: 'hsl(30,30%,90%)' }} />
              </div>
            </div>
          ) : displayResult ? (
            <div className="space-y-4 overflow-y-auto" style={{ maxHeight: '600px' }}>
              {/* Title & Type Badge */}
              <div>
                <h3 className="font-serif font-bold text-lg mb-1.5" style={{ color: 'hsl(20,40%,10%)' }}>
                  {displayResult?.title ?? 'Untitled'}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: 'hsl(24,95%,94%)', color: 'hsl(24,95%,40%)' }}>
                    {displayResult?.content_type ?? 'Content'}
                  </span>
                  <span className="text-xs flex items-center gap-1" style={{ color: 'hsl(20,25%,45%)' }}>
                    <FiAlignLeft size={11} />
                    {displayResult?.word_count ?? 0} words
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 rounded-xl border" style={{ background: 'hsl(30,40%,98%)', borderColor: 'hsl(30,35%,88%)' }}>
                {renderMarkdown(displayResult?.content ?? '')}
              </div>

              {/* Key Points */}
              {Array.isArray(displayResult?.key_points) && displayResult.key_points.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium mb-2 flex items-center gap-1" style={{ color: 'hsl(20,40%,10%)' }}>
                    <FiStar size={12} style={{ color: 'hsl(24,95%,53%)' }} /> Key Points
                  </h4>
                  <ul className="space-y-1.5">
                    {displayResult.key_points.map((kp, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'hsl(20,25%,45%)', lineHeight: '1.6' }}>
                        <FiCheck size={12} className="mt-0.5 shrink-0" style={{ color: 'hsl(142,76%,46%)' }} />
                        {kp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Meta Description */}
              {displayResult?.meta_description && (
                <div className="p-3 rounded-xl border" style={{ background: 'hsl(30,35%,92%)', borderColor: 'hsl(30,35%,88%)' }}>
                  <h4 className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: 'hsl(20,40%,10%)' }}>
                    <FiTag size={12} /> Meta Description
                  </h4>
                  <p className="text-xs" style={{ color: 'hsl(20,25%,45%)', lineHeight: '1.6' }}>{displayResult.meta_description}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200 flex items-center gap-1.5 hover:shadow-sm"
                  style={{ background: 'hsl(30,40%,98%)', borderColor: 'hsl(30,35%,88%)', color: 'hsl(20,40%,10%)' }}
                >
                  {copied ? <><FiCheck size={12} /> Copied</> : <><FiCopy size={12} /> Copy</>}
                </button>
                <button
                  onClick={handleRegenerate}
                  disabled={loading || !topic.trim()}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50 hover:shadow-sm"
                  style={{ background: 'hsl(30,40%,98%)', borderColor: 'hsl(30,35%,88%)', color: 'hsl(20,40%,10%)' }}
                >
                  <FiRefreshCw size={12} /> Regenerate
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <FiEdit size={32} className="mx-auto mb-3 opacity-30" style={{ color: 'hsl(20,25%,45%)' }} />
              <p className="text-sm font-medium mb-1" style={{ color: 'hsl(20,40%,10%)' }}>Ready to create</p>
              <p className="text-xs" style={{ color: 'hsl(20,25%,45%)' }}>Fill in the form and click Generate Content to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SEOAnalyzerScreen({ sampleMode, onAddOutput, setActiveAgentId }: {
  sampleMode: boolean
  onAddOutput: (output: RecentOutput) => void
  setActiveAgentId: (id: string | null) => void
}) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SEOResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedMeta, setCopiedMeta] = useState(false)

  const displayResult = sampleMode && !result ? SAMPLE_SEO_RESULT : result
  const charCount = content.length

  const handleAnalyze = async () => {
    if (!content.trim()) return
    setLoading(true)
    setError(null)
    setActiveAgentId(SEO_ANALYST_AGENT_ID)

    const message = `Analyze the following content for SEO. Provide overall score, keyword analysis (primary keywords, secondary keywords, keyword density, missing keywords), readability (score, grade level, suggestions), meta description evaluation, heading structure evaluation, and recommendations with priority levels.\n\nContent:\n${content.trim()}`

    try {
      const res = await callAIAgent(message, SEO_ANALYST_AGENT_ID)
      if (res.success) {
        const parsed = parseResult<SEOResult>(res?.response?.result)
        setResult(parsed)
        onAddOutput({
          id: generateId(),
          type: 'SEO',
          title: `SEO Analysis - Score: ${parsed?.overall_score ?? 'N/A'}`,
          timestamp: formatTimestamp(),
          preview: `Overall Score: ${parsed?.overall_score ?? 'N/A'}/100. ${(Array.isArray(parsed?.recommendations) ? parsed.recommendations.length : 0)} recommendations.`,
        })
      } else {
        setError(res?.error ?? 'Failed to analyze content. Please try again.')
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
      setActiveAgentId(null)
    }
  }

  const handleCopyMeta = async () => {
    const meta = displayResult?.meta_description?.suggested_meta ?? ''
    if (meta) {
      const ok = await copyToClipboard(meta)
      if (ok) {
        setCopiedMeta(true)
        setTimeout(() => setCopiedMeta(false), 2000)
      }
    }
  }

  const overallScore = displayResult?.overall_score ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-serif font-bold mb-1" style={{ color: 'hsl(20,40%,10%)', letterSpacing: '-0.02em' }}>
          SEO Analyzer
        </h1>
        <p className="text-sm" style={{ color: 'hsl(20,25%,45%)' }}>Paste your content to get a comprehensive SEO analysis with actionable recommendations.</p>
      </div>

      {/* Input Section */}
      <div className="p-5 rounded-2xl border" style={cardStyle}>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium" style={{ color: 'hsl(20,40%,10%)' }}>Content to Analyze</label>
          <span className="text-xs tabular-nums" style={{ color: 'hsl(20,25%,45%)' }}>{charCount.toLocaleString()} characters</span>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste your blog post, landing page, or marketing content here..."
          rows={8}
          className="w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none transition-all duration-200 focus:ring-2 focus:ring-orange-300"
          style={{ ...inputStyle, lineHeight: '1.6' }}
        />

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl text-xs mt-3" style={{ background: 'hsl(0,84%,97%)', color: 'hsl(0,84%,45%)' }}>
            <FiAlertCircle size={14} />
            {error}
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={loading || !content.trim()}
          className="mt-3 w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
          style={{ background: 'hsl(12,80%,50%)', color: 'hsl(30,40%,98%)' }}
        >
          {loading ? (
            <><FiLoader size={14} className="animate-spin" /> Analyzing...</>
          ) : (
            <><FiSearch size={14} /> Analyze SEO</>
          )}
        </button>
      </div>

      {/* Results Section */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="p-5 rounded-2xl border" style={{ background: 'hsl(30,40%,96%)', borderColor: 'hsl(30,35%,88%)' }}>
              <div className="h-4 rounded w-1/3 mb-3" style={{ background: 'hsl(30,30%,90%)' }} />
              <div className="space-y-2">
                <div className="h-3 rounded w-full" style={{ background: 'hsl(30,30%,90%)' }} />
                <div className="h-3 rounded w-2/3" style={{ background: 'hsl(30,30%,90%)' }} />
              </div>
            </div>
          ))}
        </div>
      ) : displayResult ? (
        <div className="space-y-4">
          {/* Overall Score */}
          <div className="p-5 rounded-2xl border flex items-center gap-4" style={cardStyle}>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center font-serif font-bold text-2xl shrink-0"
              style={{ background: getScoreBgColor(overallScore), color: getScoreColor(overallScore) }}
            >
              {overallScore}
            </div>
            <div className="flex-1">
              <h3 className="font-serif font-semibold text-sm" style={{ color: 'hsl(20,40%,10%)' }}>Overall SEO Score</h3>
              <p className="text-xs mt-0.5" style={{ color: 'hsl(20,25%,45%)' }}>
                {overallScore >= 70 ? 'Good - Your content is well-optimized for search engines' : overallScore >= 40 ? 'Needs Improvement - Follow the recommendations below to boost your score' : 'Poor - Significant optimization is needed to improve search visibility'}
              </p>
            </div>
            <div
              className="px-3 py-1 rounded-xl text-xs font-medium shrink-0"
              style={{ background: getScoreBgColor(overallScore), color: getScoreColor(overallScore) }}
            >
              {overallScore >= 70 ? 'Good' : overallScore >= 40 ? 'Fair' : 'Poor'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Keyword Analysis */}
            <div className="p-5 rounded-2xl border" style={cardStyle}>
              <h3 className="font-serif font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: 'hsl(20,40%,10%)' }}>
                <FiTarget size={14} style={{ color: 'hsl(24,95%,53%)' }} /> Keyword Analysis
              </h3>
              <div className="space-y-3">
                {/* Primary Keywords */}
                <div>
                  <p className="text-xs font-medium mb-1.5" style={{ color: 'hsl(20,25%,45%)' }}>Primary Keywords</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.isArray(displayResult?.keyword_analysis?.primary_keywords) && displayResult.keyword_analysis.primary_keywords.map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: 'hsl(24,95%,94%)', color: 'hsl(24,95%,40%)' }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Secondary Keywords */}
                <div>
                  <p className="text-xs font-medium mb-1.5" style={{ color: 'hsl(20,25%,45%)' }}>Secondary Keywords</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.isArray(displayResult?.keyword_analysis?.secondary_keywords) && displayResult.keyword_analysis.secondary_keywords.map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md text-xs" style={{ background: 'hsl(30,35%,92%)', color: 'hsl(20,40%,15%)' }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Keyword Density */}
                <div>
                  <p className="text-xs font-medium mb-0.5" style={{ color: 'hsl(20,25%,45%)' }}>Keyword Density</p>
                  <p className="text-xs" style={{ color: 'hsl(20,40%,10%)', lineHeight: '1.6' }}>
                    {displayResult?.keyword_analysis?.keyword_density ?? 'N/A'}
                  </p>
                </div>
                {/* Missing Keywords */}
                {Array.isArray(displayResult?.keyword_analysis?.missing_keywords) && (displayResult.keyword_analysis.missing_keywords.length > 0) && (
                  <div>
                    <p className="text-xs font-medium mb-1.5" style={{ color: 'hsl(0,84%,45%)' }}>Missing Keywords</p>
                    <div className="flex flex-wrap gap-1.5">
                      {displayResult.keyword_analysis.missing_keywords.map((kw, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md text-xs" style={{ background: 'hsl(0,84%,97%)', color: 'hsl(0,84%,45%)' }}>
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Readability */}
            <div className="p-5 rounded-2xl border" style={cardStyle}>
              <h3 className="font-serif font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: 'hsl(20,40%,10%)' }}>
                <FiBookOpen size={14} style={{ color: 'hsl(24,95%,53%)' }} /> Readability
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-serif font-bold text-lg shrink-0"
                    style={{ background: getScoreBgColor(displayResult?.readability?.score ?? 0), color: getScoreColor(displayResult?.readability?.score ?? 0) }}
                  >
                    {displayResult?.readability?.score ?? 0}
                  </div>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'hsl(20,40%,10%)' }}>Readability Score</p>
                    <p className="text-xs" style={{ color: 'hsl(20,25%,45%)' }}>{displayResult?.readability?.grade_level ?? 'N/A'}</p>
                  </div>
                </div>
                {Array.isArray(displayResult?.readability?.suggestions) && displayResult.readability.suggestions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-1.5" style={{ color: 'hsl(20,25%,45%)' }}>Suggestions</p>
                    <ul className="space-y-1.5">
                      {displayResult.readability.suggestions.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'hsl(20,40%,10%)', lineHeight: '1.6' }}>
                          <FiInfo size={11} className="mt-0.5 shrink-0" style={{ color: 'hsl(24,95%,53%)' }} />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Meta Description */}
            <div className="p-5 rounded-2xl border" style={cardStyle}>
              <h3 className="font-serif font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: 'hsl(20,40%,10%)' }}>
                <FiTag size={14} style={{ color: 'hsl(24,95%,53%)' }} /> Meta Description
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'hsl(20,25%,45%)' }}>Current Evaluation</p>
                  <p className="text-xs" style={{ color: 'hsl(20,40%,10%)', lineHeight: '1.6' }}>
                    {displayResult?.meta_description?.current_evaluation ?? 'N/A'}
                  </p>
                </div>
                {displayResult?.meta_description?.suggested_meta && (
                  <div className="p-3 rounded-xl border" style={{ background: 'hsl(142,76%,96%)', borderColor: 'hsl(142,50%,85%)' }}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium" style={{ color: 'hsl(142,50%,30%)' }}>Suggested Meta</p>
                      <button
                        onClick={handleCopyMeta}
                        className="text-xs flex items-center gap-1 transition-colors hover:opacity-70"
                        style={{ color: 'hsl(142,50%,30%)' }}
                      >
                        {copiedMeta ? <><FiCheck size={10} /> Copied</> : <><FiCopy size={10} /> Copy</>}
                      </button>
                    </div>
                    <p className="text-xs" style={{ color: 'hsl(20,40%,10%)', lineHeight: '1.6' }}>
                      {displayResult.meta_description.suggested_meta}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Heading Structure */}
            <div className="p-5 rounded-2xl border" style={cardStyle}>
              <h3 className="font-serif font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: 'hsl(20,40%,10%)' }}>
                <FiType size={14} style={{ color: 'hsl(24,95%,53%)' }} /> Heading Structure
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: 'hsl(20,25%,45%)' }}>Evaluation</p>
                  <p className="text-xs" style={{ color: 'hsl(20,40%,10%)', lineHeight: '1.6' }}>
                    {displayResult?.heading_structure?.evaluation ?? 'N/A'}
                  </p>
                </div>
                {Array.isArray(displayResult?.heading_structure?.suggestions) && displayResult.heading_structure.suggestions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-1.5" style={{ color: 'hsl(20,25%,45%)' }}>Suggestions</p>
                    <ul className="space-y-1.5">
                      {displayResult.heading_structure.suggestions.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'hsl(20,40%,10%)', lineHeight: '1.6' }}>
                          <FiAlignLeft size={11} className="mt-0.5 shrink-0" style={{ color: 'hsl(24,95%,53%)' }} />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {Array.isArray(displayResult?.recommendations) && displayResult.recommendations.length > 0 && (
            <div className="p-5 rounded-2xl border" style={cardStyle}>
              <h3 className="font-serif font-semibold text-sm mb-3 flex items-center gap-2" style={{ color: 'hsl(20,40%,10%)' }}>
                <FiList size={14} style={{ color: 'hsl(24,95%,53%)' }} /> Recommendations ({displayResult.recommendations.length})
              </h3>
              <div className="space-y-2">
                {displayResult.recommendations.map((rec, i) => {
                  const pc = getPriorityColor(rec?.priority ?? '')
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 hover:shadow-sm"
                      style={{ background: 'hsl(30,40%,98%)', borderColor: 'hsl(30,35%,88%)' }}
                    >
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium shrink-0 mt-0.5" style={{ background: pc.bg, color: pc.text }}>
                        {rec?.priority ?? 'N/A'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium" style={{ color: 'hsl(20,40%,10%)' }}>{rec?.category ?? ''}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'hsl(20,25%,45%)', lineHeight: '1.6' }}>{rec?.suggestion ?? ''}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-16 rounded-2xl border" style={{ background: 'rgba(255,255,255,0.75)', borderColor: 'hsl(30,35%,88%)' }}>
          <FiBarChart2 size={32} className="mx-auto mb-3 opacity-30" style={{ color: 'hsl(20,25%,45%)' }} />
          <p className="text-sm font-medium mb-1" style={{ color: 'hsl(20,40%,10%)' }}>No analysis yet</p>
          <p className="text-xs" style={{ color: 'hsl(20,25%,45%)' }}>Paste your content above and click Analyze SEO to get started.</p>
        </div>
      )}
    </div>
  )
}

function GraphicsStudioScreen({ sampleMode, onAddOutput, setActiveAgentId }: {
  sampleMode: boolean
  onAddOutput: (output: RecentOutput) => void
  setActiveAgentId: (id: string | null) => void
}) {
  const [description, setDescription] = useState('')
  const [format, setFormat] = useState<GraphicsFormat>('Banner')
  const [styleNotes, setStyleNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [designResult, setDesignResult] = useState<DesignResult | null>(null)
  const [images, setImages] = useState<ArtifactFile[]>([])
  const [error, setError] = useState<string | null>(null)

  const formats: GraphicsFormat[] = ['Banner', 'Thumbnail', 'Social Post', 'Ad Creative']

  const handleGenerate = async () => {
    if (!description.trim()) return
    setLoading(true)
    setError(null)
    setActiveAgentId(VISUAL_DESIGNER_AGENT_ID)

    const message = `Create a ${format} graphic with the following description: ${description.trim()}. ${styleNotes.trim() ? `Style notes: ${styleNotes.trim()}.` : ''} Format type: ${format}. Please provide image_description, format_type, style_applied, and design_notes.`

    try {
      const res = await callAIAgent(message, VISUAL_DESIGNER_AGENT_ID)
      if (res.success) {
        const parsed = parseResult<DesignResult>(res?.response?.result)
        setDesignResult(parsed)

        const artifactFiles = Array.isArray(res?.module_outputs?.artifact_files)
          ? res.module_outputs!.artifact_files
          : []
        setImages(artifactFiles as ArtifactFile[])

        onAddOutput({
          id: generateId(),
          type: 'Graphics',
          title: (parsed?.image_description ?? '').substring(0, 60) || `${format} Graphic`,
          timestamp: formatTimestamp(),
          preview: (parsed?.design_notes ?? '').substring(0, 120) || `Generated ${format} with custom style`,
        })
      } else {
        setError(res?.error ?? 'Failed to generate graphic. Please try again.')
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
      setActiveAgentId(null)
    }
  }

  const handleRegenerate = () => {
    if (description.trim()) handleGenerate()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-serif font-bold mb-1" style={{ color: 'hsl(20,40%,10%)', letterSpacing: '-0.02em' }}>
          Graphics Studio
        </h1>
        <p className="text-sm" style={{ color: 'hsl(20,25%,45%)' }}>Generate marketing visuals with AI -- from banners to ad creatives.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration */}
        <div className="p-5 rounded-2xl border" style={cardStyle}>
          <h2 className="font-serif font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: 'hsl(20,40%,10%)' }}>
            <FiSliders size={14} /> Configuration
          </h2>

          <div className="space-y-4">
            {/* Description */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(20,40%,10%)' }}>Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the visual you want to create, e.g., A modern tech banner with gradient background showing AI and marketing concepts..."
                rows={4}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none transition-all duration-200 focus:ring-2 focus:ring-orange-300"
                style={{ ...inputStyle, lineHeight: '1.6' }}
              />
            </div>

            {/* Format */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'hsl(20,40%,10%)' }}>Format</label>
              <div className="flex flex-wrap gap-2">
                {formats.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 border"
                    style={{
                      background: format === f ? 'hsl(24,95%,53%)' : 'hsl(30,40%,98%)',
                      color: format === f ? 'hsl(30,40%,98%)' : 'hsl(20,25%,45%)',
                      borderColor: format === f ? 'hsl(24,95%,53%)' : 'hsl(30,35%,88%)',
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Style Notes */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(20,40%,10%)' }}>Style Notes (optional)</label>
              <input
                type="text"
                placeholder="e.g., Minimalist, warm colors, corporate style"
                value={styleNotes}
                onChange={(e) => setStyleNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all duration-200 focus:ring-2 focus:ring-orange-300"
                style={inputStyle}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl text-xs" style={{ background: 'hsl(0,84%,97%)', color: 'hsl(0,84%,45%)' }}>
                <FiAlertCircle size={14} />
                {error}
              </div>
            )}

            {/* Generate */}
            <button
              onClick={handleGenerate}
              disabled={loading || !description.trim()}
              className="w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
              style={{ background: 'hsl(24,95%,53%)', color: 'hsl(30,40%,98%)' }}
            >
              {loading ? (
                <><FiLoader size={14} className="animate-spin" /> Generating...</>
              ) : (
                <><FiImage size={14} /> Generate Graphic</>
              )}
            </button>
          </div>
        </div>

        {/* Preview Gallery */}
        <div className="p-5 rounded-2xl border" style={cardStyle}>
          <h2 className="font-serif font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: 'hsl(20,40%,10%)' }}>
            <FiEye size={14} /> Preview Gallery
          </h2>

          {loading ? (
            <div className="space-y-4">
              <div className="animate-pulse rounded-xl aspect-video" style={{ background: 'hsl(30,30%,90%)' }} />
              <div className="flex items-center gap-3 animate-pulse">
                <div className="h-4 rounded w-1/3" style={{ background: 'hsl(30,30%,90%)' }} />
                <div className="h-4 rounded w-1/4" style={{ background: 'hsl(30,30%,90%)' }} />
              </div>
              <div className="space-y-2 animate-pulse">
                <div className="h-3 rounded w-full" style={{ background: 'hsl(30,30%,90%)' }} />
                <div className="h-3 rounded w-2/3" style={{ background: 'hsl(30,30%,90%)' }} />
              </div>
            </div>
          ) : images.length > 0 || designResult ? (
            <div className="space-y-4 overflow-y-auto" style={{ maxHeight: '600px' }}>
              {/* Generated Images */}
              {images.length > 0 && (
                <div className="space-y-3">
                  {images.map((img, i) => (
                    <div key={i} className="space-y-2">
                      <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'hsl(30,35%,88%)' }}>
                        <img
                          src={img?.file_url ?? ''}
                          alt={img?.name ?? `Generated graphic ${i + 1}`}
                          className="w-full h-auto object-contain"
                          style={{ maxHeight: '400px', background: 'hsl(30,40%,96%)' }}
                        />
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={img?.file_url ?? '#'}
                          download={img?.name ?? 'graphic'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200 flex items-center gap-1.5 no-underline hover:shadow-sm"
                          style={{ background: 'hsl(30,40%,98%)', borderColor: 'hsl(30,35%,88%)', color: 'hsl(20,40%,10%)' }}
                        >
                          <FiDownload size={12} /> Download
                        </a>
                        <button
                          onClick={handleRegenerate}
                          disabled={loading || !description.trim()}
                          className="px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50 hover:shadow-sm"
                          style={{ background: 'hsl(30,40%,98%)', borderColor: 'hsl(30,35%,88%)', color: 'hsl(20,40%,10%)' }}
                        >
                          <FiRefreshCw size={12} /> Regenerate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Design Details */}
              {designResult && (
                <div className="space-y-3 pt-2">
                  {designResult?.image_description && (
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: 'hsl(20,25%,45%)' }}>Image Description</p>
                      <p className="text-xs" style={{ color: 'hsl(20,40%,10%)', lineHeight: '1.6' }}>
                        {designResult.image_description}
                      </p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {designResult?.format_type && (
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: 'hsl(24,95%,94%)', color: 'hsl(24,95%,40%)' }}>
                        {designResult.format_type}
                      </span>
                    )}
                    {designResult?.style_applied && (
                      <span className="px-2 py-0.5 rounded-md text-xs" style={{ background: 'hsl(30,35%,92%)', color: 'hsl(20,40%,15%)' }}>
                        {designResult.style_applied}
                      </span>
                    )}
                  </div>
                  {designResult?.design_notes && (
                    <div className="p-3 rounded-xl border" style={{ background: 'hsl(30,40%,98%)', borderColor: 'hsl(30,35%,88%)' }}>
                      <p className="text-xs font-medium mb-1" style={{ color: 'hsl(20,25%,45%)' }}>Design Notes</p>
                      <div className="text-xs" style={{ color: 'hsl(20,40%,10%)', lineHeight: '1.6' }}>
                        {renderMarkdown(designResult.design_notes)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Regenerate when no images but has design data */}
              {images.length === 0 && designResult && (
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleRegenerate}
                    disabled={loading || !description.trim()}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50 hover:shadow-sm"
                    style={{ background: 'hsl(30,40%,98%)', borderColor: 'hsl(30,35%,88%)', color: 'hsl(20,40%,10%)' }}
                  >
                    <FiRefreshCw size={12} /> Regenerate
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16">
              <FiImage size={32} className="mx-auto mb-3 opacity-30" style={{ color: 'hsl(20,25%,45%)' }} />
              <p className="text-sm font-medium mb-1" style={{ color: 'hsl(20,40%,10%)' }}>No graphics yet</p>
              <p className="text-xs" style={{ color: 'hsl(20,25%,45%)' }}>Describe your visual and click Generate Graphic to create one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// --------------- MAIN PAGE ---------------
export default function Page() {
  const [activeScreen, setActiveScreen] = useState<ScreenType>('dashboard')
  const [recentOutputs, setRecentOutputs] = useState<RecentOutput[]>([])
  const [sampleMode, setSampleMode] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All')
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [showActivityPanel, setShowActivityPanel] = useState(false)

  // Agent activity monitoring
  const agentActivity = useLyzrAgentEvents(sessionId)

  // Initialize session ID on mount
  useEffect(() => {
    const sid = `mcc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    setSessionId(sid)
  }, [])

  const handleAddOutput = useCallback((output: RecentOutput) => {
    setRecentOutputs((prev) => [output, ...prev].slice(0, 50))
  }, [])

  const handleNavigate = useCallback((screen: ScreenType) => {
    setActiveScreen(screen)
  }, [])

  const activeAgentInfo = AGENTS.find((a) => a.id === activeAgentId)

  return (
    <div
      className="flex h-screen overflow-hidden font-sans"
      style={{
        ...THEME_VARS,
        background: 'linear-gradient(135deg, hsl(30,50%,97%) 0%, hsl(20,45%,95%) 35%, hsl(40,40%,96%) 70%, hsl(15,35%,97%) 100%)',
        color: 'hsl(20,40%,10%)',
        letterSpacing: '-0.01em',
        lineHeight: '1.6',
      } as React.CSSProperties}
    >
      {/* Sidebar */}
      <Sidebar
        activeScreen={activeScreen}
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((p) => !p)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header
          className="flex items-center justify-between px-6 py-3 border-b shrink-0"
          style={{
            background: 'rgba(255,255,255,0.75)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderColor: 'hsl(30,35%,88%)',
          }}
        >
          {/* Left: Active Agent Indicator */}
          <div className="flex items-center gap-3">
            {activeAgentId && activeAgentInfo ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-xl" style={{ background: 'hsl(24,95%,96%)' }}>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'hsl(24,95%,53%)' }} />
                <span className="text-xs font-medium" style={{ color: 'hsl(24,95%,40%)' }}>
                  {activeAgentInfo.name} working...
                </span>
              </div>
            ) : (
              <span className="text-xs" style={{ color: 'hsl(20,25%,45%)' }}>
                {activeScreen === 'dashboard' ? 'Dashboard' : activeScreen === 'content' ? 'Content Studio' : activeScreen === 'seo' ? 'SEO Analyzer' : 'Graphics Studio'}
              </span>
            )}
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-3">
            {/* Agent Activity Toggle */}
            <button
              onClick={() => setShowActivityPanel((p) => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200"
              style={{
                background: showActivityPanel ? 'hsl(24,95%,53%)' : 'hsl(30,40%,98%)',
                color: showActivityPanel ? 'hsl(30,40%,98%)' : 'hsl(20,25%,45%)',
                borderColor: showActivityPanel ? 'hsl(24,95%,53%)' : 'hsl(30,35%,88%)',
              }}
            >
              <FiActivity size={12} />
              Activity
              {agentActivity.isConnected && (
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: showActivityPanel ? 'hsl(30,40%,98%)' : 'hsl(142,76%,46%)' }} />
              )}
            </button>

            {/* Sample Data Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'hsl(20,25%,45%)' }}>Sample Data</span>
              <button
                onClick={() => setSampleMode((p) => !p)}
                className="relative w-9 h-5 rounded-full transition-all duration-200"
                style={{ background: sampleMode ? 'hsl(24,95%,53%)' : 'hsl(30,30%,80%)' }}
                aria-label="Toggle sample data"
              >
                <div
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200"
                  style={{ left: sampleMode ? '18px' : '2px' }}
                />
              </button>
            </div>
          </div>
        </header>

        {/* Content + Activity Panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-6">
            {activeScreen === 'dashboard' && (
              <DashboardScreen
                recentOutputs={recentOutputs}
                sampleMode={sampleMode}
                onNavigate={handleNavigate}
                onFilterChange={setActiveFilter}
                activeFilter={activeFilter}
              />
            )}
            {activeScreen === 'content' && (
              <ContentStudioScreen
                sampleMode={sampleMode}
                onAddOutput={handleAddOutput}
                setActiveAgentId={setActiveAgentId}
              />
            )}
            {activeScreen === 'seo' && (
              <SEOAnalyzerScreen
                sampleMode={sampleMode}
                onAddOutput={handleAddOutput}
                setActiveAgentId={setActiveAgentId}
              />
            )}
            {activeScreen === 'graphics' && (
              <GraphicsStudioScreen
                sampleMode={sampleMode}
                onAddOutput={handleAddOutput}
                setActiveAgentId={setActiveAgentId}
              />
            )}
          </main>

          {/* Agent Activity Panel */}
          {showActivityPanel && (
            <aside className="w-80 border-l shrink-0 overflow-hidden" style={{ borderColor: 'hsl(30,35%,88%)' }}>
              <AgentActivityPanel
                isConnected={agentActivity.isConnected}
                events={agentActivity.events}
                thinkingEvents={agentActivity.thinkingEvents}
                lastThinkingMessage={agentActivity.lastThinkingMessage}
                activeAgentId={agentActivity.activeAgentId}
                activeAgentName={agentActivity.activeAgentName}
                isProcessing={agentActivity.isProcessing}
                className="h-full rounded-none border-0"
              />
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}
