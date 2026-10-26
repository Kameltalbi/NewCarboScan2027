import React, { useEffect, useLayoutEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { verifierConfig as c } from '@cbam-verifier';
import { VerifierLink } from './VerifierLink';
const BANNER_KEY = 'carboscan_cbam_banner_until';
const SLIDE_KEY = 'carboscan_cbam_slide_until';
const isPublic = (path: string) => path !== c.path && !/^\/(app|auth|superadmin|admin|onboarding|checkout|payment|carbo-start|preview)(\/|$)/.test(path);
const isCbam = (path: string) => path === '/cbam' || /^\/blog\/[^/]*(cbam|macf)[^/]*$/i.test(path);
function dismissed(key: string) { try { const until = Number(localStorage.getItem(key)); return Number.isFinite(until) && until > Date.now(); } catch { return false; } }
function remember(key: string) { try { localStorage.setItem(key, String(Date.now() + c.promotions.retentionDays * 86400000)); } catch { /* Dismissal still applies to this page when storage is unavailable. */ } }
export function CbamPromotions() {
  const { pathname: routePath } = useLocation();
  const pathname = routePath.replace(/\/+$/, '') || '/';
  const [banner, setBanner] = useState(() => document.documentElement.dataset.cbamBanner !== 'hidden');
  const [slideAllowed, setSlideAllowed] = useState(false);
  const [slideVisible, setSlideVisible] = useState(false);
  useLayoutEffect(() => {
    const showBanner = isPublic(pathname) && !dismissed(BANNER_KEY);
    const allowSlide = isPublic(pathname) && isCbam(pathname) && !dismissed(SLIDE_KEY);
    document.documentElement.dataset.cbamBanner = showBanner ? 'visible' : 'hidden';
    document.documentElement.dataset.cbamSlide = allowSlide ? 'eligible' : 'hidden';
    setBanner(showBanner); setSlideAllowed(allowSlide); setSlideVisible(false);
  }, [pathname]);
  useEffect(() => {
    if (!slideAllowed) return;
    const desktop = window.matchMedia('(min-width: 1024px)');
    let frame = 0;
    const check = () => {
      frame = 0;
      const remaining = document.documentElement.scrollHeight - window.innerHeight;
      const dialogVisible = [...document.querySelectorAll('[role="dialog"]')].some(node => node.getClientRects().length > 0);
      setSlideVisible(desktop.matches && remaining > 0 && window.scrollY / remaining >= 0.5 && !dialogVisible);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(check); };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    desktop.addEventListener('change', schedule);
    check();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); desktop.removeEventListener('change', schedule); };
  }, [slideAllowed, pathname]);
  return <>
    {banner && isPublic(pathname) && <aside className="cbam-announcement" aria-label={c.intro.badge}>
      <VerifierLink placement="banner" className="cbam-announcement-link">{c.promotions.banner}</VerifierLink>
      <button type="button" className="cbam-announcement-close" aria-label={c.promotions.closeBanner} onClick={() => { remember(BANNER_KEY); setBanner(false); document.documentElement.dataset.cbamBanner = 'hidden'; }}><X size={18} /></button>
    </aside>}
    {slideAllowed && slideVisible && <aside className="cbam-slideout rounded-xl border border-primary/20 bg-card p-5 shadow-lg" aria-label={c.promotions.slideTitle}>
      <button type="button" className="absolute right-2 top-2 rounded p-2 text-muted-foreground hover:bg-muted" aria-label={c.promotions.closeSlide} onClick={() => { remember(SLIDE_KEY); setSlideAllowed(false); setSlideVisible(false); document.documentElement.dataset.cbamSlide = 'hidden'; }}><X size={18} /></button>
      <h2 className="pr-5 text-lg font-bold text-foreground">{c.promotions.slideTitle}</h2><p className="mt-3 text-sm text-muted-foreground">{c.promotions.slideText}</p>
      <VerifierLink placement="slideout" className="mt-4 inline-flex w-full justify-center rounded bg-primary px-3 py-3 text-center text-sm font-semibold text-primary-foreground" />
    </aside>}
  </>;
}
