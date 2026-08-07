export default function Loading() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-7 w-32 bg-muted rounded" />
      <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-8 space-y-4 lg:space-y-0">
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="h-80 bg-muted rounded-2xl" />
      </div>
    </div>
  )
}
