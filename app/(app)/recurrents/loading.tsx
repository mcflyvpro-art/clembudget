export default function Loading() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-7 w-40 bg-muted rounded" />
      <div className="space-y-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-muted rounded-xl" />
        ))}
      </div>
    </div>
  )
}
