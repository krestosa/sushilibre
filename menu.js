(() => {
  const menuRoot = document.querySelector('[data-menu-root]');
  const menuHeading = document.querySelector('[data-menu-heading]');
  const menuGroups = document.querySelector('[data-menu-groups]');
  const menuStatus = document.querySelector('[data-menu-status]');
  const embeddedData = document.querySelector('#menu-data');

  if (!menuRoot || !menuHeading || !menuGroups || !menuStatus) return;

  const style = document.createElement('style');
  style.dataset.menuStyles = '';
  style.textContent = `
    .menu-section {
      position: relative;
      isolation: isolate;
      min-height: 100svh;
      background: #000;
      color: var(--white);
      --menu-background-image: url("assets/menu_bg.png");
    }

    .menu-section__background {
      position: sticky;
      z-index: 0;
      top: 0;
      width: 100%;
      height: 100svh;
      margin-bottom: -100svh;
      overflow: hidden;
      background-image: var(--menu-background-image);
      background-repeat: no-repeat;
      background-position: center center;
      background-size: cover;
      pointer-events: none;
    }

    .menu-section__background::before,
    .menu-section__background::after {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .menu-section__background::before {
      background:
        linear-gradient(
          180deg,
          #000 0%,
          rgba(0, 0, 0, .93) 9%,
          rgba(0, 0, 0, .59) 24%,
          rgba(0, 0, 0, .20) 39%,
          rgba(0, 0, 0, 0) 52%
        ),
        linear-gradient(
          90deg,
          rgba(0, 0, 0, .78) 0%,
          rgba(0, 0, 0, .46) 47%,
          rgba(0, 0, 0, .66) 100%
        ),
        rgba(0, 0, 0, .18);
    }

    .menu-section__background::after {
      opacity: .12;
      background-image:
        radial-gradient(circle, rgba(255, 255, 255, .10) 0 .42px, transparent .56px),
        radial-gradient(circle, rgba(0, 0, 0, .18) 0 .42px, transparent .58px);
      background-position: 0 0, 1.5px 1.5px;
      background-size: 3px 3px;
      mix-blend-mode: soft-light;
    }

    .menu-section__shell {
      position: relative;
      z-index: 2;
      width: min(1500px, calc(100% - clamp(48px, 6vw, 128px)));
      margin: 0 auto;
      padding: clamp(18vh, 22vh, 26vh) 0 calc(var(--dock-height) + 18vh);
    }

    .menu-section__intro {
      min-height: 35vh;
      display: flex;
      align-items: flex-start;
    }

    .menu-section__intro h2 {
      margin: 0;
      color: #fff;
      font-size: clamp(92px, 12.2vw, 228px);
      font-weight: 500;
      line-height: .76;
      letter-spacing: -.075em;
      text-transform: uppercase;
      text-shadow:
        0 0 3px rgba(255, 255, 255, .58),
        0 0 18px rgba(255, 255, 255, .15);
    }

    .menu-section__groups {
      position: relative;
    }

    .menu-group {
      position: relative;
      display: grid;
      grid-template-columns: minmax(280px, .9fr) minmax(430px, 1fr);
      column-gap: clamp(56px, 9vw, 164px);
      min-height: 94vh;
      padding: 10vh 0 16vh;
      scroll-margin-top: 8vh;
    }

    .menu-group + .menu-group {
      margin-top: 10vh;
    }

    .menu-group__heading {
      position: sticky;
      top: 14vh;
      align-self: start;
      margin: 0;
      opacity: .36;
      transform: translate3d(0, 12px, 0);
      transition: opacity 260ms ease-out, transform 320ms var(--ease-out);
    }

    .menu-group.is-active .menu-group__heading {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }

    .menu-group__title-line {
      display: flex;
      align-items: baseline;
      gap: clamp(14px, 1.3vw, 28px);
      white-space: nowrap;
    }

    .menu-group__title {
      color: #fff;
      font-size: clamp(72px, 8.35vw, 158px);
      font-weight: 500;
      line-height: .78;
      letter-spacing: -.072em;
      text-transform: uppercase;
      text-shadow:
        0 0 3px rgba(255, 255, 255, .55),
        0 0 15px rgba(255, 255, 255, .13);
    }

    .menu-group__quantity {
      color: rgba(255, 255, 255, .82);
      font-size: clamp(20px, 2.15vw, 42px);
      font-weight: 500;
      line-height: 1;
      letter-spacing: -.055em;
      text-transform: uppercase;
    }

    .menu-group__items {
      min-width: 0;
      padding-top: 1vh;
    }

    .menu-item {
      padding: 0 0 clamp(28px, 4vh, 52px);
      margin: 0 0 clamp(28px, 4vh, 52px);
      border-bottom: 1px solid rgba(255, 255, 255, .44);
    }

    .menu-item:last-child {
      margin-bottom: 0;
    }

    .menu-item__name {
      margin: 0;
      color: #fff;
      font-size: clamp(24px, 2vw, 38px);
      font-weight: 500;
      line-height: 1;
      letter-spacing: -.045em;
      text-transform: uppercase;
    }

    .menu-item__description {
      max-width: 34ch;
      margin: clamp(12px, 1.25vh, 18px) 0 0;
      color: var(--orange);
      font-size: clamp(16px, 1.4vw, 27px);
      font-weight: 400;
      line-height: 1.18;
      letter-spacing: -.03em;
      text-transform: uppercase;
    }

    .menu-section__status {
      margin: 0;
      padding: 12vh 0 20vh;
      color: rgba(255, 255, 255, .66);
      font-size: 13px;
      font-weight: 600;
      letter-spacing: .08em;
      text-transform: uppercase;
    }

    .menu-section__status[hidden] {
      display: none;
    }

    @media (max-width: 980px) {
      .menu-section__shell {
        width: calc(100% - 48px);
      }

      .menu-group {
        grid-template-columns: minmax(220px, .78fr) minmax(360px, 1fr);
        column-gap: clamp(36px, 6vw, 72px);
      }

      .menu-group__title {
        font-size: clamp(62px, 9vw, 104px);
      }
    }

    @media (max-width: 720px) {
      .menu-section__background {
        background-position: 58% center;
      }

      .menu-section__background::before {
        background:
          linear-gradient(
            180deg,
            #000 0%,
            rgba(0, 0, 0, .93) 10%,
            rgba(0, 0, 0, .59) 26%,
            rgba(0, 0, 0, .20) 42%,
            rgba(0, 0, 0, 0) 56%
          ),
          rgba(0, 0, 0, .54);
      }

      .menu-section__shell {
        width: calc(100% - 32px);
        padding-top: 17vh;
        padding-bottom: calc(var(--dock-height) + 20vh);
      }

      .menu-section__intro {
        min-height: 28vh;
      }

      .menu-section__intro h2 {
        font-size: 23vw;
      }

      .menu-group {
        display: block;
        min-height: auto;
        padding: 12vh 0 18vh;
      }

      .menu-group + .menu-group {
        margin-top: 10vh;
      }

      .menu-group__heading {
        z-index: 4;
        top: 0;
        padding: 20px 0 34px;
        background: linear-gradient(
          180deg,
          rgba(0, 0, 0, .96) 0%,
          rgba(0, 0, 0, .84) 60%,
          rgba(0, 0, 0, 0) 100%
        );
        opacity: .62;
      }

      .menu-group__title-line {
        gap: 10px;
      }

      .menu-group__title {
        font-size: clamp(58px, 17vw, 86px);
      }

      .menu-group__quantity {
        font-size: clamp(16px, 5vw, 24px);
      }

      .menu-group__items {
        padding-top: 7vh;
      }

      .menu-item {
        padding-bottom: 30px;
        margin-bottom: 30px;
      }

      .menu-item__name {
        font-size: clamp(23px, 6.2vw, 31px);
      }

      .menu-item__description {
        max-width: none;
        font-size: clamp(15px, 4.25vw, 20px);
        line-height: 1.22;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .menu-group__heading {
        transition: none;
        transform: none;
      }
    }
  `;
  document.head.append(style);

  const createTextElement = (tag, className, value) => {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = value;
    return element;
  };

  const readEmbeddedData = () => {
    if (!embeddedData?.textContent) return null;

    try {
      return JSON.parse(embeddedData.textContent);
    } catch (error) {
      console.error('Embedded menu JSON is invalid.', error);
      return null;
    }
  };

  const loadMenuData = async () => {
    const fallback = readEmbeddedData();
    const canRequestFile = ['http:', 'https:'].includes(window.location.protocol);

    if (!canRequestFile || typeof window.fetch !== 'function') {
      if (fallback) return fallback;
      throw new Error('No menu data source is available.');
    }

    try {
      const response = await window.fetch('menu.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error(`Menu request failed with ${response.status}.`);
      return await response.json();
    } catch (error) {
      if (fallback) return fallback;
      throw error;
    }
  };

  const setMenuBackground = (requestedPath) => {
    const candidates = Array.from(new Set([
      requestedPath,
      'assets/menu_bg.png',
      'menu_bg.png'
    ].filter(Boolean)));

    const tryCandidate = (index) => {
      if (index >= candidates.length) return;

      const path = candidates[index];
      const image = new Image();
      image.onload = () => {
        const safePath = path.replace(/["\\]/g, '\\$&');
        menuRoot.style.setProperty('--menu-background-image', `url("${safePath}")`);
      };
      image.onerror = () => tryCandidate(index + 1);
      image.src = path;
    };

    tryCandidate(0);
  };

  const renderMenu = (data) => {
    if (!data || typeof data.title !== 'string' || !Array.isArray(data.sections)) {
      throw new TypeError('Invalid menu data.');
    }

    menuHeading.textContent = data.title;
    setMenuBackground(data.background);
    menuGroups.replaceChildren();

    const fragment = document.createDocumentFragment();

    data.sections.forEach((section, sectionIndex) => {
      if (!section || !Array.isArray(section.items)) return;

      const group = document.createElement('article');
      group.className = 'menu-group';
      group.id = `menu-${section.id || sectionIndex + 1}`;
      group.dataset.menuGroup = section.id || String(sectionIndex + 1);

      const heading = document.createElement('h3');
      heading.className = 'menu-group__heading';

      const titleLine = document.createElement('span');
      titleLine.className = 'menu-group__title-line';
      titleLine.append(createTextElement('span', 'menu-group__title', section.title || ''));

      if (section.quantity) {
        titleLine.append(createTextElement('span', 'menu-group__quantity', section.quantity));
      }

      heading.append(titleLine);

      const items = document.createElement('div');
      items.className = 'menu-group__items';

      section.items.forEach((entry) => {
        if (!entry || typeof entry.name !== 'string') return;

        const item = document.createElement('article');
        item.className = 'menu-item';
        item.append(createTextElement('h4', 'menu-item__name', entry.name));

        if (entry.description) {
          item.append(createTextElement('p', 'menu-item__description', entry.description));
        }

        items.append(item);
      });

      group.append(heading, items);
      fragment.append(group);
    });

    menuGroups.append(fragment);
    menuStatus.hidden = true;

    const groups = Array.from(menuGroups.querySelectorAll('[data-menu-group]'));
    if (!groups.length) return;

    groups[0].classList.add('is-active');
    menuRoot.dataset.activeMenu = groups[0].dataset.menuGroup;

    if (!('IntersectionObserver' in window)) return;

    const visibility = new Map(groups.map((group) => [group, 0]));

    const updateActiveGroup = () => {
      let activeGroup = groups[0];
      let activeRatio = -1;

      visibility.forEach((ratio, group) => {
        if (ratio > activeRatio) {
          activeRatio = ratio;
          activeGroup = group;
        }
      });

      groups.forEach((group) => {
        group.classList.toggle('is-active', group === activeGroup);
      });
      menuRoot.dataset.activeMenu = activeGroup.dataset.menuGroup;
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        visibility.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
      });
      updateActiveGroup();
    }, {
      rootMargin: '-18% 0px -42% 0px',
      threshold: [0, .12, .25, .4, .6, .8]
    });

    groups.forEach((group) => observer.observe(group));
  };

  loadMenuData()
    .then(renderMenu)
    .catch((error) => {
      menuStatus.textContent = 'NO SE PUDO CARGAR EL MENÚ.';
      console.error(error);
    });
})();
