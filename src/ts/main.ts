import './application';
import './dock-reveal';
import './menu-bootstrap';
import { setupFinalCtaCopyGuard } from './features/final-cta-copy-guard';
import { setupFinalCtaReveal } from './features/final-cta-reveal';
import { setupMenuDepth } from './features/menu-depth';
import { setupMobileHeroFollowV2 } from './features/mobile-hero-follow-v2';
import { setupScrollMarquee } from './features/scroll-marquee-boosted';

setupMobileHeroFollowV2();
setupMenuDepth();
setupScrollMarquee();
setupFinalCtaCopyGuard();
setupFinalCtaReveal();
