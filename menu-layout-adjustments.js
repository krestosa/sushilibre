(() => {
  const style = document.createElement('style');
  style.dataset.menuLayoutAdjustments = '';
  style.textContent = `
    .menu-section__intro h2 {
      font-size: clamp(42px, 5.6vw, 88px) !important;
      line-height: .84;
      letter-spacing: -.065em;
    }

    .menu-group + .menu-group {
      margin-top: 5vh !important;
    }

    @media (max-width: 980px) {
      .menu-section__intro h2 {
        font-size: clamp(40px, 6.2vw, 62px) !important;
      }
    }

    @media (max-width: 720px) {
      .menu-section__intro h2 {
        font-size: clamp(38px, 12vw, 54px) !important;
      }

      .menu-group + .menu-group {
        margin-top: 5vh !important;
      }
    }
  `;
  document.head.append(style);
})();
