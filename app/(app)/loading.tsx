export default function Loading() {
  return (
    <div className="animate-pulse lg:grid lg:grid-cols-[1fr_380px] lg:gap-8 lg:items-start">
      <div>
        <div className="mb-6 lg:hidden">
          <div className="h-4 w-24 bg-muted rounded mb-2" />
          <div className="h-9 w-36 bg-muted rounded" />
        </div>
        <div className="hidden lg:block mb-6">
          <div className="h-7 w-52 bg-muted rounded" />
        </div>
        <div className="space-y-5">
          {[0, 1, 2].map((g) => (
            <div key={g}>
              <div className="h-3.5 w-20 bg-muted rounded mb-2" />
              <div className="space-y-1.5">
                {[0, 1].map((i) => (
                  <div key={i} className="h-[52px] bg-muted rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="hidden lg:block">
        <div className="h-96 bg-muted rounded-2xl" />
      </div>
    </div>
  )
}
