import { query, queryAll } from '../shared/dom';

const DESKTOP_PREVIEW_QUERY = '(min-width: 721px) and (hover: hover) and (pointer: fine)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const GRID_COLUMNS = 14;
const GRID_ROWS = 10;
const SPRING_STIFFNESS = 108;
const SPRING_DAMPING = 18.5;
const MAX_FRAME_DELTA = 1 / 30;
const MAX_WARP_SPEED = 1_650;
const MAX_ROTATION_DEG = 2.2;
const CURSOR_OFFSET_X = 30;
const CURSOR_OFFSET_Y = 20;
const EDGE_GUTTER = 14;

interface PreviewRenderer {
  setImage: (image: HTMLImageElement) => void;
  render: (motionX: number, motionY: number) => void;
}

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(Math.max(value, minimum), maximum);

const compileShader = (
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null => {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;

  gl.deleteShader(shader);
  return null;
};

const createWebGlRenderer = (canvas: HTMLCanvasElement): PreviewRenderer | null => {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: true,
    premultipliedAlpha: true,
    powerPreference: 'high-performance'
  });
  if (!gl) return null;

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, `
    attribute vec2 aPosition;
    attribute vec2 aUv;
    uniform vec2 uMotion;
    varying vec2 vUv;

    void main() {
      vec2 position = aPosition;
      float speed = min(length(uMotion), 1.0);

      if (speed > 0.0001) {
        vec2 direction = normalize(uMotion);
        vec2 tangent = vec2(-direction.y, direction.x);
        float along = dot(position, direction);
        float across = dot(position, tangent);
        float edgeCenter = pow(max(0.0, 1.0 - across * across), 1.55);
        float leading = smoothstep(-0.08, 1.0, along);
        float trailing = smoothstep(0.08, 1.0, -along);

        // The leading edge gains a restrained belly while the trailing edge
        // caves inward. Corners stretch only a few pixels at normal velocity.
        position += direction * speed * edgeCenter * (
          0.074 * leading + 0.041 * trailing
        );
        position += tangent * across * speed * (0.011 + 0.007 * abs(along));
        position *= 1.0 + speed * 0.007;
      }

      gl_Position = vec4(position, 0.0, 1.0);
      vUv = aUv;
    }
  `);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, `
    precision mediump float;
    uniform sampler2D uTexture;
    uniform vec2 uUvScale;
    uniform vec2 uUvOffset;
    varying vec2 vUv;

    void main() {
      vec2 uv = uUvOffset + vUv * uUvScale;
      gl_FragColor = texture2D(uTexture, uv);
    }
  `);

  if (!vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  const positionLocation = gl.getAttribLocation(program, 'aPosition');
  const uvLocation = gl.getAttribLocation(program, 'aUv');
  const motionLocation = gl.getUniformLocation(program, 'uMotion');
  const textureLocation = gl.getUniformLocation(program, 'uTexture');
  const uvScaleLocation = gl.getUniformLocation(program, 'uUvScale');
  const uvOffsetLocation = gl.getUniformLocation(program, 'uUvOffset');
  if (
    positionLocation < 0
    || uvLocation < 0
    || !motionLocation
    || !textureLocation
    || !uvScaleLocation
    || !uvOffsetLocation
  ) return null;

  const vertices: number[] = [];
  for (let row = 0; row <= GRID_ROWS; row += 1) {
    const v = row / GRID_ROWS;
    const y = 1 - v * 2;
    for (let column = 0; column <= GRID_COLUMNS; column += 1) {
      const u = column / GRID_COLUMNS;
      const x = u * 2 - 1;
      vertices.push(x, y, u, v);
    }
  }

  const indices: number[] = [];
  const rowWidth = GRID_COLUMNS + 1;
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let column = 0; column < GRID_COLUMNS; column += 1) {
      const topLeft = row * rowWidth + column;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + rowWidth;
      const bottomRight = bottomLeft + 1;
      indices.push(
        topLeft,
        bottomLeft,
        topRight,
        topRight,
        bottomLeft,
        bottomRight
      );
    }
  }

  const vertexBuffer = gl.createBuffer();
  const indexBuffer = gl.createBuffer();
  const texture = gl.createTexture();
  if (!vertexBuffer || !indexBuffer || !texture) return null;

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

  gl.useProgram(program);
  gl.enableVertexAttribArray(positionLocation);
  gl.enableVertexAttribArray(uvLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
  gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 16, 8);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(textureLocation, 0);

  let uvScaleX = 1;
  let uvScaleY = 1;
  let uvOffsetX = 0;
  let uvOffsetY = 0;

  const resize = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
  };

  return {
    setImage(image): void {
      resize();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image
      );

      const imageAspect = image.naturalWidth / Math.max(1, image.naturalHeight);
      const previewAspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
      uvScaleX = 1;
      uvScaleY = 1;
      uvOffsetX = 0;
      uvOffsetY = 0;

      if (imageAspect > previewAspect) {
        uvScaleX = previewAspect / imageAspect;
        uvOffsetX = (1 - uvScaleX) * 0.5;
      } else if (imageAspect < previewAspect) {
        uvScaleY = imageAspect / previewAspect;
        uvOffsetY = (1 - uvScaleY) * 0.5;
      }
    },
    render(motionX, motionY): void {
      resize();
      gl.useProgram(program);
      gl.uniform2f(motionLocation, motionX, -motionY);
      gl.uniform2f(uvScaleLocation, uvScaleX, uvScaleY);
      gl.uniform2f(uvOffsetLocation, uvOffsetX, uvOffsetY);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    }
  };
};

export const setupPieceCursorPreview = (): void => {
  const menuRoot = query<HTMLElement>('[data-menu-root]');
  const pieceItems = queryAll<HTMLElement>('[data-piece-item]', menuRoot ?? undefined);
  if (!menuRoot || !pieceItems.length) return;

  const desktopPreview = window.matchMedia(DESKTOP_PREVIEW_QUERY);
  const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
  const preview = document.createElement('div');
  preview.className = 'piece-cursor-preview';
  preview.setAttribute('aria-hidden', 'true');

  const canvas = document.createElement('canvas');
  canvas.className = 'piece-cursor-preview__canvas';
  const fallbackImage = document.createElement('img');
  fallbackImage.className = 'piece-cursor-preview__fallback';
  fallbackImage.alt = '';
  fallbackImage.decoding = 'async';
  preview.append(canvas, fallbackImage);
  document.body.append(preview);

  const renderer = createWebGlRenderer(canvas);
  if (!renderer) preview.classList.add('is-fallback');

  const imageCache = new Map<string, HTMLImageElement>();
  let activeItem: HTMLElement | null = null;
  let activeSource = '';
  let sourceGeneration = 0;
  let frameId = 0;
  let lastFrameTime = 0;
  let pointerX = window.innerWidth * 0.5;
  let pointerY = window.innerHeight * 0.5;
  let targetX = pointerX;
  let targetY = pointerY;
  let currentX = pointerX;
  let currentY = pointerY;
  let velocityX = 0;
  let velocityY = 0;
  let warpX = 0;
  let warpY = 0;
  let previewWidth = 320;
  let previewHeight = 240;
  let hasPosition = false;

  const measurePreview = (): void => {
    const bounds = preview.getBoundingClientRect();
    if (bounds.width > 0) previewWidth = bounds.width;
    if (bounds.height > 0) previewHeight = bounds.height;
  };

  const getCachedImage = (source: string): HTMLImageElement => {
    const existing = imageCache.get(source);
    if (existing) return existing;

    const next = new Image();
    next.decoding = 'async';
    next.fetchPriority = 'low';
    next.src = source;
    imageCache.set(source, next);
    return next;
  };

  const commitImage = (source: string, image: HTMLImageElement, generation: number): void => {
    if (
      generation !== sourceGeneration
      || source !== activeSource
      || !image.naturalWidth
      || !image.naturalHeight
    ) return;

    if (renderer) renderer.setImage(image);
    else fallbackImage.src = source;
    preview.classList.add('is-ready');
  };

  const selectSource = (source: string): void => {
    if (source === activeSource && preview.classList.contains('is-ready')) return;

    activeSource = source;
    preview.classList.remove('is-ready');
    const generation = ++sourceGeneration;
    const image = getCachedImage(source);

    if (image.complete && image.naturalWidth > 0) {
      commitImage(source, image, generation);
      return;
    }

    image.addEventListener('load', () => commitImage(source, image, generation), { once: true });
    image.addEventListener('error', () => {
      if (generation === sourceGeneration) preview.classList.remove('is-ready');
    }, { once: true });
  };

  const updateTarget = (clientX: number, clientY: number): void => {
    pointerX = clientX;
    pointerY = clientY;
    const halfWidth = previewWidth * 0.5;
    const halfHeight = previewHeight * 0.5;
    targetX = clamp(
      clientX + CURSOR_OFFSET_X,
      halfWidth + EDGE_GUTTER,
      Math.max(halfWidth + EDGE_GUTTER, window.innerWidth - halfWidth - EDGE_GUTTER)
    );
    targetY = clamp(
      clientY + CURSOR_OFFSET_Y,
      halfHeight + EDGE_GUTTER,
      Math.max(halfHeight + EDGE_GUTTER, window.innerHeight - halfHeight - EDGE_GUTTER)
    );

    if (!hasPosition) {
      currentX = targetX;
      currentY = targetY;
      hasPosition = true;
    }
  };

  const shouldKeepAnimating = (): boolean => (
    Math.abs(targetX - currentX) > 0.15
    || Math.abs(targetY - currentY) > 0.15
    || Math.abs(velocityX) > 1
    || Math.abs(velocityY) > 1
    || Math.abs(warpX) > 0.002
    || Math.abs(warpY) > 0.002
  );

  const runFrame = (time: number): void => {
    frameId = 0;
    const elapsed = lastFrameTime ? (time - lastFrameTime) / 1_000 : 1 / 60;
    const delta = clamp(elapsed, 1 / 240, MAX_FRAME_DELTA);
    lastFrameTime = time;

    if (reducedMotion.matches) {
      currentX = targetX;
      currentY = targetY;
      velocityX = 0;
      velocityY = 0;
      warpX = 0;
      warpY = 0;
    } else {
      const accelerationX = (targetX - currentX) * SPRING_STIFFNESS - velocityX * SPRING_DAMPING;
      const accelerationY = (targetY - currentY) * SPRING_STIFFNESS - velocityY * SPRING_DAMPING;
      velocityX += accelerationX * delta;
      velocityY += accelerationY * delta;
      currentX += velocityX * delta;
      currentY += velocityY * delta;

      const nextWarpX = clamp(velocityX / MAX_WARP_SPEED, -1, 1);
      const nextWarpY = clamp(velocityY / MAX_WARP_SPEED, -1, 1);
      const warpBlend = 1 - Math.exp(-delta * 9.5);
      warpX += (nextWarpX - warpX) * warpBlend;
      warpY += (nextWarpY - warpY) * warpBlend;
    }

    const speed = Math.hypot(velocityX, velocityY);
    const rotation = reducedMotion.matches
      ? 0
      : clamp(velocityX / 390, -MAX_ROTATION_DEG, MAX_ROTATION_DEG);
    const scale = reducedMotion.matches
      ? 1
      : 1 + Math.min(speed / MAX_WARP_SPEED, 1) * 0.009;

    preview.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`;
    renderer?.render(warpX, warpY);

    if (shouldKeepAnimating()) frameId = window.requestAnimationFrame(runFrame);
    else lastFrameTime = 0;
  };

  const ensureAnimation = (): void => {
    if (frameId) return;
    frameId = window.requestAnimationFrame(runFrame);
  };

  const showItem = (item: HTMLElement, event: PointerEvent): void => {
    if (!desktopPreview.matches) return;
    const source = item.dataset.pieceImage?.trim();
    if (!source) return;

    activeItem = item;
    selectSource(source);
    updateTarget(event.clientX, event.clientY);
    preview.classList.add('is-visible');
    ensureAnimation();
  };

  const hidePreview = (): void => {
    activeItem = null;
    preview.classList.remove('is-visible');
    warpX *= 0.72;
    warpY *= 0.72;
    ensureAnimation();
  };

  const resolveItem = (target: EventTarget | null): HTMLElement | null => {
    if (!(target instanceof Element)) return null;
    return target.closest<HTMLElement>('[data-piece-item]');
  };

  menuRoot.addEventListener('pointerover', (event) => {
    const item = resolveItem(event.target);
    if (!item || item === activeItem) return;
    showItem(item, event);
  }, { passive: true });

  menuRoot.addEventListener('pointermove', (event) => {
    if (!desktopPreview.matches) return;
    const item = resolveItem(event.target);
    if (!item) return;
    if (item !== activeItem) showItem(item, event);
    else {
      updateTarget(event.clientX, event.clientY);
      ensureAnimation();
    }
  }, { passive: true });

  menuRoot.addEventListener('pointerout', (event) => {
    const item = resolveItem(event.target);
    if (!item || item !== activeItem) return;
    const related = event.relatedTarget;
    if (related instanceof Node && item.contains(related)) return;
    hidePreview();
  }, { passive: true });

  menuRoot.addEventListener('pointerleave', hidePreview, { passive: true });

  const syncPreviewMode = (): void => {
    if (desktopPreview.matches) {
      measurePreview();
      return;
    }
    hidePreview();
  };

  desktopPreview.addEventListener('change', syncPreviewMode);
  reducedMotion.addEventListener('change', ensureAnimation);
  window.addEventListener('resize', () => {
    measurePreview();
    if (hasPosition) updateTarget(pointerX, pointerY);
    ensureAnimation();
  }, { passive: true });

  window.requestAnimationFrame(measurePreview);
};
