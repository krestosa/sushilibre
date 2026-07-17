import { setupBookingCtaSheen } from './features/booking-cta-sheen';
import { setupBookingDockLayout } from './features/booking-dock-layout';
import { setupCountdown } from './features/countdown';
import { setupEfficientSmoothScroll } from './features/smooth-scroll';
import { setupVideoLoop } from './features/video-loop';
import { createRuntimeContext } from './shared/runtime';

const runtime = createRuntimeContext();
setupCountdown();
setupBookingDockLayout();
setupBookingCtaSheen(runtime);
setupEfficientSmoothScroll(runtime);
setupVideoLoop(runtime);
