import './application';
import './dock-reveal';
import './menu-bootstrap';
import './menu-motion';
import { setupFinalCtaReveal } from './features/final-cta-reveal';
import { setupMobileHeroFollow } from './features/mobile-hero-follow';
import { setupEfficientSmoothScroll } from './features/smooth-scroll';
import { setupScrollMarquee } from './features/scroll-marquee-boosted';

setupEfficientSmoothScroll();
setupMobileHeroFollow();
setupScrollMarquee();
setupFinalCtaReveal();
