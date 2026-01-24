type MixpanelClient = {
  init: (token: string, config?: Record<string, unknown>) => void;
  track: (eventName: string, properties?: Record<string, unknown>) => void;
  people?: {
    set: (props: Record<string, unknown>) => void;
  };
  __SV?: number;
};

const MP_DOM_TRACKING_FLAG = '__mixpanel_dom_tracking_bound__';

const shouldInitializeMixpanel = (): boolean => {
  if (import.meta.env.VITE_ENABLE_MIXPANEL === 'true') {
    return true;
  }
  if (import.meta.env.VITE_ENABLE_MIXPANEL === 'false') {
    return false;
  }
  return import.meta.env.PROD;
};

const installSnippet = (token: string): void => {
  const w = window as unknown as { mixpanel?: MixpanelClient & any };
  if (w.mixpanel && w.mixpanel.__SV) {
    return;
  }

  (function (e: Document, c: any) {
    if (!c.__SV) {
      let l;
      let h;
      (window as any).mixpanel = c;
      c._i = [];
      c.init = function (q: string, r: Record<string, unknown>, f?: string) {
        function t(d: any, a: string) {
          const g = a.split('.');
          if (g.length === 2) {
            d = d[g[0]];
            a = g[1];
          }
          d[a] = function () {
            d.push([a].concat(Array.prototype.slice.call(arguments, 0)));
          };
        }
        let b = c;
        if (typeof f !== 'undefined') {
          b = c[f] = [];
        } else {
          f = 'mixpanel';
        }
        b.people = b.people || [];
        b.toString = function (d: number) {
          let a = 'mixpanel';
          if (f !== 'mixpanel') {
            a += `.${f}`;
          }
          if (!d) {
            a += ' (stub)';
          }
          return a;
        };
        b.people.toString = function () {
          return b.toString(1) + '.people (stub)';
        };
        l =
          'disable time_event track track_pageview track_links track_forms track_with_groups add_group set_group remove_group register register_once alias unregister identify name_tag set_config reset opt_in_tracking opt_out_tracking has_opted_in_tracking has_opted_out_tracking clear_opt_in_out_tracking start_batch_senders start_session_recording stop_session_recording people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user people.remove'.split(
            ' '
          );
        for (h = 0; h < l.length; h++) t(b, l[h]);
        const n = 'set set_once union unset remove delete'.split(' ');
        b.get_group = function () {
          function d(p: string) {
            a[p] = function () {
              b.push([g, [p].concat(Array.prototype.slice.call(arguments, 0))]);
            };
          }
          const a: Record<string, unknown> = {};
          const g = ['get_group'].concat(Array.prototype.slice.call(arguments, 0));
          for (let m = 0; m < n.length; m++) d(n[m]);
          return a;
        };
        c._i.push([q, r, f]);
      };
      c.__SV = 1.2;
      const k = e.createElement('script');
      k.type = 'text/javascript';
      k.async = true;
      k.src =
        typeof (window as any).MIXPANEL_CUSTOM_LIB_URL !== 'undefined'
          ? (window as any).MIXPANEL_CUSTOM_LIB_URL
          : e.location.protocol === 'file:' &&
            '//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js'.match(/^\/\//)
          ? 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js'
          : '//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js';
      const s = e.getElementsByTagName('script')[0];
      s.parentNode?.insertBefore(k, s);
    }
  })(document, w.mixpanel || []);

  const recordSessionsPercent = Number(import.meta.env.VITE_MIXPANEL_RECORD_SESSIONS_PERCENT ?? 100);
  (window as any).mixpanel.init(token, {
    autocapture: true,
    track_pageview: true,
    record_sessions_percent: Number.isNaN(recordSessionsPercent) ? 100 : recordSessionsPercent,
  });
};

const bindMixpanelDomTracking = (): void => {
  const w = window as unknown as { [key: string]: unknown; mixpanel?: MixpanelClient };
  if (w[MP_DOM_TRACKING_FLAG]) {
    return;
  }
  w[MP_DOM_TRACKING_FLAG] = true;

  const parseProps = (raw: string | undefined) => {
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch (error) {
      console.warn('Mixpanel data-mp-props JSON parse failed:', error);
      return undefined;
    }
  };

  const findTrackingTarget = (target: EventTarget | null): HTMLElement | null => {
    if (!target) return null;
    if (target instanceof HTMLElement) {
      return target.closest('[data-mp-event]');
    }
    return null;
  };

  document.addEventListener(
    'click',
    (event) => {
      const target = findTrackingTarget(event.target);
      if (!target) return;

      const eventName = target.dataset.mpEvent;
      if (!eventName) return;

      const props = parseProps(target.dataset.mpProps) ?? {};
      (window as any).mixpanel?.track(eventName, {
        ...props,
        page_url: window.location.href,
        page_path: window.location.pathname,
      });
    },
    true,
  );
};

export const initializeMixpanel = (): void => {
  if (!shouldInitializeMixpanel()) return;

  const token = import.meta.env.VITE_MIXPANEL_TOKEN as string | undefined;
  if (!token) {
    console.warn('Mixpanel enabled but VITE_MIXPANEL_TOKEN is missing; skipping initialization.');
    return;
  }

  installSnippet(token);
  bindMixpanelDomTracking();
  console.log('Mixpanel initialized');
};
