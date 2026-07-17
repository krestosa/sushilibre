import { setupBookingCtaSheen } from './features/booking-cta-sheen';
import { setupBookingDockLayout } from './features/booking-dock-layout';
import { setupCountdown } from './features/countdown';
import { setupPieceViewer } from './features/piece-viewer';
import { setupEfficientSmoothScroll } from './features/smooth-scroll';
import { setupTapSearchGuard } from './features/tap-search-guard';
import { setupVideoLoop } from './features/video-loop';
import { createRuntimeContext } from './shared/runtime';

const runtime = createRuntimeContext();
setupCountdown();
setupBookingDockLayout();
setupBookingCtaSheen(runtime);
setupPieceViewer();
setupTapSearchGuard();
setupEfficientSmoothScroll(runtime);
setupVideoLoop(runtime);
