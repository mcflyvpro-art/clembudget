export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 w-24 bg-muted rounded-xl" />
        ))}
      </div>
      <div className="h-4 w-48 bg-muted rounded" />
      <div className="bg-muted rounded-2xl h-8 w-full" />
      <div className="h-[280px] bg-muted rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted rounded-xl" />
        ))}
      </div>
    </div>
  )
}
