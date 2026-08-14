import './application';
import './dock-reveal';
import './menu-bootstrap';
import './menu-motion';
import { setupFinalCtaCopyGuard } from './features/final-cta-copy-guard';
import { setupFinalCtaReveal } from './features/final-cta-reveal';
import { setupIosDockSmoothing } from './features/ios-dock-smoothing';
import { setupMenuDepth } from './features/menu-depth';
import { setupMobileHeroFollowV2 } from './features/mobile-hero-follow-v2';
import { setupEfficientSmoothScroll } from './features/smooth-scroll';
import { setupScrollMarquee } from './features/scroll-marquee-boosted';

setupEfficientSmoothScroll();
setupMobileHeroFollowV2();
setupIosDockSmoothing();
setupMenuDepth();
setupScrollMarquee();
setupFinalCtaCopyGuard();
setupFinalCtaReveal();
