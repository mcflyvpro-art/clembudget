export default function Loading() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-7 w-32 bg-muted rounded" />
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 w-24 bg-muted rounded-full" />
        ))}
      </div>
      <div className="h-28 bg-muted rounded-xl" />
    </div>
  )
}
