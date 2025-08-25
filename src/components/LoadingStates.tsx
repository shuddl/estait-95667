export function ChatLoading() {
  return (
    <div className="flex items-center gap-2 p-3">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      <span className="text-sm text-white/60">AI is thinking...</span>
    </div>
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden animate-pulse">
      <div className="h-48 bg-white/10" />
      <div className="p-4 space-y-3">
        <div className="h-6 bg-white/10 rounded w-3/4" />
        <div className="h-4 bg-white/10 rounded w-1/2" />
        <div className="flex gap-2">
          <div className="h-8 bg-white/10 rounded flex-1" />
          <div className="h-8 bg-white/10 rounded flex-1" />
          <div className="h-8 bg-white/10 rounded flex-1" />
        </div>
      </div>
    </div>
  );
}

export function FullPageLoading() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block">
          <div className="flex gap-1 mb-4">
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
        <p className="text-white/60">Loading Estait...</p>
      </div>
    </div>
  );
}