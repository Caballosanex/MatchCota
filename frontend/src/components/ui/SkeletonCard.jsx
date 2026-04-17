export default function SkeletonCard() {
    return (
        <div className="h-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm shadow-slate-200/70 backdrop-blur-sm animate-pulse flex flex-col">
            <div className="h-48 w-full shrink-0 bg-slate-200/90"></div>
            <div className="flex flex-grow flex-col justify-between p-4">
                <div>
                    <div className="mb-2 h-6 w-2/3 rounded bg-slate-200/90"></div>
                    <div className="h-4 w-1/2 rounded bg-slate-200/90"></div>
                </div>
                <div className="mt-4">
                    <div className="h-8 w-full rounded-xl bg-slate-200/90"></div>
                </div>
            </div>
        </div>
    );
}
