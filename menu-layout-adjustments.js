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

      /* The outgoing category can lose .is-active before its sticky range ends.
         Keep its mask active whenever content is physically passing underneath. */
      .menu-group__heading.is-overlapping {
        z-index: 8;
        opacity: 1 !important;
      }

      .menu-group__heading.is-overlapping::before {
        bottom: -58px;
        opacity: 1 !important;
        background: linear-gradient(
          180deg,
          #000 0%,
          rgba(0, 0, 0, .99) 46%,
          rgba(0, 0, 0, .92) 62%,
          rgba(0, 0, 0, .68) 78%,
          rgba(0, 0, 0, .28) 91%,
          rgba(0, 0, 0, 0) 100%
        );
      }
    }
  `;
  document.head.append(style);
})();
