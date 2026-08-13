import './application';
import './dock-reveal';
import './menu-bootstrap';
import './menu-motion';
import { setupPieceCursorEntryMotion } from './features/piece-cursor-entry-motion';
import { setupScrollMarquee } from './features/scroll-marquee-boosted';

setupPieceCursorEntryMotion();
setupScrollMarquee();
