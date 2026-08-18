export default function WorkPreview({ layout }) {
  return (
    <div className="relative aspect-[4/3] rounded-3xl border border-divider bg-surface overflow-hidden p-5 sm:p-6 shadow-sm">
      <div className="flex items-center gap-1.5 mb-5">
        <span className="h-2.5 w-2.5 rounded-full bg-primary/50" />
        <span className="h-2.5 w-2.5 rounded-full bg-primary/30" />
        <span className="h-2.5 w-2.5 rounded-full bg-primary/15" />
        <span className="ml-3 h-5 flex-1 max-w-[55%] rounded-full bg-background border border-divider" />
      </div>
      {layout === 'grid' ? (
        <div className="space-y-4">
          <div className="h-5 w-3/4 rounded bg-primary/25" />
          <div className="h-2.5 w-5/6 rounded bg-divider" />
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="aspect-square rounded-xl bg-background border border-divider" />
            <div className="aspect-square rounded-xl bg-background border border-divider" />
            <div className="aspect-square rounded-xl bg-background border border-divider" />
          </div>
          <div className="h-8 w-32 rounded-full bg-primary mt-2" />
        </div>
      ) : (
        <div className="space-y-3.5">
          <div className="h-5 w-2/3 rounded bg-primary/25" />
          <div className="h-2.5 w-full rounded bg-divider" />
          <div className="h-2.5 w-5/6 rounded bg-divider" />
          <div className="flex gap-3 pt-2">
            <div className="h-16 flex-1 rounded-xl bg-background border border-divider" />
            <div className="h-16 flex-1 rounded-xl bg-background border border-divider" />
          </div>
          <div className="h-8 w-32 rounded-full bg-primary mt-2" />
        </div>
      )}
    </div>
  )
}
