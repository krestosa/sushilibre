import './application';
import './dock-reveal';
import './menu-bootstrap';
import './menu-motion';
import { setupFinalCtaReveal } from './features/final-cta-reveal';
import { setupMobileHeroFollowV2 } from './features/mobile-hero-follow-v2';
import { setupEfficientSmoothScroll } from './features/smooth-scroll';
import { setupScrollMarquee } from './features/scroll-marquee-boosted';

setupEfficientSmoothScroll();
setupMobileHeroFollowV2();
setupScrollMarquee();
setupFinalCtaReveal();
