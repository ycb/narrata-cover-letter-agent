import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function DemoLauncher(props: { slugOverride?: string } = {}) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { enterDemo, isDemo, demoSlug } = useAuth();
  const resolvedSlug = props.slugOverride || slug || null;

  useEffect(() => {
    if (!resolvedSlug) return;
    if (isDemo && demoSlug === resolvedSlug) {
      navigate('/dashboard/main', { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      await enterDemo(resolvedSlug);
      if (cancelled) return;
      navigate('/dashboard/main', { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, resolvedSlug, enterDemo, isDemo, demoSlug]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="text-sm text-muted-foreground">Launching demo…</div>
      </div>
    </div>
  );
}
