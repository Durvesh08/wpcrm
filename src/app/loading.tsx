import { ZovaixLoader } from '@/components/ui/zovaix-loader';

export default function RootLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
      <ZovaixLoader size={72} label="Loading ZOVAIX" />
    </div>
  );
}
