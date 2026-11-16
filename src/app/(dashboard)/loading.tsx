import { ZovaixLoader } from '@/components/ui/zovaix-loader';

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      <ZovaixLoader size={64} label="Loading Workspace" />
    </div>
  );
}
