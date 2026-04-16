import { Skeleton } from '@/components/ui/skeleton';

export function PlayerCardSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
          <Skeleton className="h-2 w-full rounded-none" />
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="w-12 h-12 rounded-full shrink-0" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-3 w-24 mb-2" />
                <Skeleton className="h-5 w-36 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1 pt-3 border-t border-border/50">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="text-center">
                  <Skeleton className="h-7 w-10 mx-auto mb-1" />
                  <Skeleton className="h-2 w-6 mx-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
