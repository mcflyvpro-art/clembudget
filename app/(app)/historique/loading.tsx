export default function Loading() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-7 w-32 bg-muted rounded" />
      <div className="space-y-1.5">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-[52px] bg-muted rounded-xl" />
        ))}
      </div>
    </div>
  )
}
