// >>> FILE PageHeader START
export default function PageHeader({ subtitle, actions, children }) {
  return (
    <div
      className="sticky top-0 z-20 -mx-6 lg:-mx-8 px-6 lg:px-8 py-3 mb-4"
      style={{ background: 'rgba(248,250,252,0.95)', backdropFilter: 'blur(6px)', borderBottom: '1px solid #e5e7eb' }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          {subtitle && (
            <p className="text-sm text-gray-500 truncate">{subtitle}</p>
          )}
          {children}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-wrap">{actions}</div>
        )}
      </div>
    </div>
  )
}
// <<< FILE PageHeader END
