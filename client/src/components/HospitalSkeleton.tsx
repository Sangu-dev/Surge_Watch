import type { FC } from 'react';

export const HospitalSkeleton: FC = () => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs space-y-4 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-4 bg-slate-200 rounded w-1/4" />
        <div className="h-4 bg-slate-200 rounded w-1/5" />
      </div>

      <div className="space-y-2">
        <div className="h-6 bg-slate-200 rounded w-3/4" />
        <div className="h-3 bg-slate-200 rounded w-1/2" />
      </div>

      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
        <div className="h-4 bg-slate-200 rounded w-1/2" />
        <div className="h-4 bg-slate-200 rounded w-1/2" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="h-14 bg-slate-100 rounded-lg" />
        <div className="h-14 bg-slate-100 rounded-lg" />
        <div className="h-14 bg-slate-100 rounded-lg" />
      </div>

      <div className="flex gap-2 pt-2 border-t border-slate-100">
        <div className="h-9 bg-slate-200 rounded-lg flex-1" />
        <div className="h-9 bg-slate-200 rounded-lg w-24" />
      </div>
    </div>
  );
};
