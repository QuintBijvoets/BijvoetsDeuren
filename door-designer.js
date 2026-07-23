(() => {
  const root = document.querySelector('[data-door-designer]');
  if (!root) return;

  const DOOR_WIDTH = 1000;
  const DOOR_HEIGHT = 2200;
  const MIN_GLASS = 120;
  const EDGE = 60;
  const WELDORPEL_TOP = 2020;
  const WELDORPEL_HEIGHT = 86;
  const WELDORPEL_CLEARANCE = 70;
  const GLASS_BOTTOM_LIMIT = WELDORPEL_TOP - WELDORPEL_CLEARANCE;

  const surface = root.querySelector('[data-door-surface]');
  const glassLayer = root.querySelector('[data-glass-layer]');
  const hardware = root.querySelector('[data-hardware]');
  const hinges = root.querySelector('[data-hinges]');
  const renderCanvas = root.querySelector('[data-render-canvas]');
  const renderContext = renderCanvas.getContext('2d');
  const guideX = root.querySelector('[data-guide-x]');
  const guideY = root.querySelector('[data-guide-y]');
  const help = root.querySelector('[data-designer-help]');
  const dimensions = root.querySelector('[data-dimensions]');
  const priceElement = root.querySelector('[data-total-price]');
  const whatsappButton = root.querySelector('[data-designer-whatsapp]');
  const downloadButton = root.querySelector('[data-download-render]');
  const shareStatus = root.querySelector('[data-share-status]');
  const hingeAdvice = root.querySelector('[data-hinge-advice]');
  const summaryDoor = root.querySelector('[data-summary-door]');
  const summarySize = root.querySelector('[data-summary-size]');
  const summaryGlass = root.querySelector('[data-summary-glass]');
  const summaryHardware = root.querySelector('[data-summary-hardware]');
  const summaryLock = root.querySelector('[data-summary-lock]');
  const summaryHinges = root.querySelector('[data-summary-hinges]');
  const doorPreview = root.querySelector('[data-door-preview]');
  const stageInstruction = root.querySelector('[data-stage-instruction]');

  const labels = {
    doorFinish: { grey: 'Grijze grondverf', white: 'Witte grondverf', anthracite: 'Antraciet afgelakt', custom: 'Kleur naar keuze' },
    glassTint: {
      clear: 'HR++ helder veiligheidsglas',
      frosted: 'HR++ melkglas',
      frostedBorder: 'HR++ melkglas met heldere rand',
      smoke: 'HR++ rookglas',
      bronze: 'HR++ bronsglas',
      reeded: 'HR++ ribbelglas',
    },
    beadStyle: { modern: 'Moderne vlakke glaslat', classic: 'Klassieke glaslat', steel: 'Slanke aluminium glaslat' },
    hardwareType: { bar: 'Stang', knob: 'Knop', lever: 'Kruk' },
    hardwareFinish: { steel: 'RVS', aluminium: 'Aluminium', black: 'Zwart', brass: 'Messing' },
    hingeStyle: { flat: 'Platkop', ball: 'Bolkop', vase: 'Vaasknop', paumelle: 'Paumelle', concealed: 'Onzichtbaar' },
    hingeFinish: { steel: 'RVS', brass: 'Messing', black: 'Zwart', chrome: 'Chroom', nickel: 'Mat nikkel', galvanized: 'Verzinkt staal' },
    hingeSecurity: { claw: 'Met geïntegreerde dievenklauw', standard: 'Zonder dievenklauw' },
    swingDirection: { inward: 'Naar binnen', outward: 'Naar buiten' },
    hingeSide: { left: 'Links', right: 'Rechts' },
  };

  const state = {
    doorMaterial: 'aluplex',
    doorHeightCm: '220',
    doorThickness: '40',
    lockingSystem: 'threePoint',
    doorFinish: 'grey',
    glassTint: 'clear',
    beadStyle: 'modern',
    hardwareType: 'bar',
    hardwareFinish: 'steel',
    hingeStyle: 'flat',
    hingeFinish: 'steel',
    hingeSecurity: 'claw',
    hingeCount: '4',
    swingDirection: 'inward',
    hingeSide: 'left',
    snap: true,
    view: '2d',
    openAngle: 32,
    cameraSide: 'outside',
    panes: [],
    selectedId: null,
    drawMode: false,
    interaction: null,
    nextId: 1,
  };

  const price = new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const roundToTen = (value) => Math.round(value / 10) * 10;
  const selectedPane = () => state.panes.find((pane) => pane.id === state.selectedId) || null;

  function createPane(x, y, width, height) {
    const pane = {
      id: state.nextId,
      x: roundToTen(x),
      y: roundToTen(y),
      width: roundToTen(width),
      height: roundToTen(height),
    };
    state.nextId += 1;
    return pane;
  }

  function normalizePane(pane) {
    pane.width = clamp(roundToTen(pane.width), MIN_GLASS, DOOR_WIDTH - (EDGE * 2));
    pane.height = clamp(roundToTen(pane.height), MIN_GLASS, GLASS_BOTTOM_LIMIT - EDGE);
    pane.x = clamp(roundToTen(pane.x), EDGE, DOOR_WIDTH - EDGE - pane.width);
    pane.y = clamp(roundToTen(pane.y), EDGE, GLASS_BOTTOM_LIMIT - pane.height);
  }

  function closestSnap(value, candidates) {
    let result = roundToTen(value);
    let distance = 18;
    candidates.forEach((candidate) => {
      const candidateDistance = Math.abs(value - candidate);
      if (candidateDistance < distance) {
        result = candidate;
        distance = candidateDistance;
      }
    });
    return { value: result, snapped: distance < 18 };
  }

  function snapPosition(value, axis, size, ignoreId) {
    if (!state.snap) return { value: roundToTen(value), snapped: false };

    const limit = axis === 'x' ? DOOR_WIDTH : GLASS_BOTTOM_LIMIT;
    const candidates = [EDGE, 80, 100, 110, 120, (limit - size) / 2, limit - size - 120, limit - size - 110, limit - size - 100, limit - size - 80, limit - size - EDGE];
    state.panes.filter((pane) => pane.id !== ignoreId).forEach((pane) => {
      const start = axis === 'x' ? pane.x : pane.y;
      const paneSize = axis === 'x' ? pane.width : pane.height;
      candidates.push(start, start + paneSize - size, start + (paneSize - size) / 2, start + paneSize + 40);
    });
    return closestSnap(value, candidates);
  }

  function doorPoint(event) {
    const rect = surface.getBoundingClientRect();
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * DOOR_WIDTH, 0, DOOR_WIDTH),
      y: clamp(((event.clientY - rect.top) / rect.height) * DOOR_HEIGHT, 0, DOOR_HEIGHT),
    };
  }

  function showGuides(xSnap, ySnap, pane) {
    guideX.classList.toggle('is-visible', Boolean(xSnap));
    guideY.classList.toggle('is-visible', Boolean(ySnap));
    if (xSnap) guideX.style.left = `${((pane.x + (pane.width / 2)) / DOOR_WIDTH) * 100}%`;
    if (ySnap) guideY.style.top = `${((pane.y + (pane.height / 2)) / DOOR_HEIGHT) * 100}%`;
  }

  function hideGuides() {
    guideX.classList.remove('is-visible');
    guideY.classList.remove('is-visible');
  }

  function renderPanes() {
    const fragment = document.createDocumentFragment();
    state.panes.forEach((pane, index) => {
      const element = document.createElement('div');
      element.className = `glass-pane glass-${state.glassTint} bead-${state.beadStyle}`;
      if (pane.id === state.selectedId) element.classList.add('is-selected');
      element.dataset.paneId = String(pane.id);
      element.tabIndex = 0;
      element.setAttribute('role', 'button');
      element.setAttribute('aria-label', `Glasvak ${index + 1}, ${pane.width} bij ${pane.height} millimeter`);
      element.style.left = `${(pane.x / DOOR_WIDTH) * 100}%`;
      element.style.top = `${(pane.y / DOOR_HEIGHT) * 100}%`;
      element.style.width = `${(pane.width / DOOR_WIDTH) * 100}%`;
      element.style.height = `${(pane.height / DOOR_HEIGHT) * 100}%`;

      const number = document.createElement('span');
      number.className = 'glass-pane-number';
      number.textContent = String(index + 1).padStart(2, '0');
      const resize = document.createElement('span');
      resize.className = 'glass-resize';
      resize.setAttribute('aria-hidden', 'true');
      element.append(number, resize);
      fragment.append(element);
    });
    glassLayer.replaceChildren(fragment);
  }

  function getHardwareCenter() {
    const paneRight = state.panes.length ? Math.max(...state.panes.map((pane) => pane.x + pane.width)) : 520;
    const availableStart = clamp(paneRight + 40, 480, 760);
    return clamp((availableStart + (DOOR_WIDTH - 90)) / 2, 660, 860);
  }

  function renderHardware() {
    hardware.className = `door-hardware hardware-${state.hardwareType} finish-${state.hardwareFinish}`;
    hardware.style.left = `${(getHardwareCenter() / DOOR_WIDTH) * 100}%`;
  }

  function renderHinges() {
    const fragment = document.createDocumentFragment();
    const count = Number.parseInt(state.hingeCount, 10);
    for (let index = 0; index < count; index += 1) {
      const hinge = document.createElement('span');
      hinge.className = `door-hinge hinge-${state.hingeStyle} hinge-finish-${state.hingeFinish}`;
      hinge.style.top = `${16 + ((68 / Math.max(count - 1, 1)) * index)}%`;
      fragment.append(hinge);
    }
    hinges.className = `door-hinges hinge-side-${state.hingeSide}`;
    hinges.replaceChildren(fragment);
  }

  function polygon(context, points) {
    context.beginPath();
    points.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.closePath();
  }

  const DOOR_WIDTH_METERS = 1;
  let activeCamera = null;

  function selectedDoorHeightCm() {
    return clamp(Number.parseInt(state.doorHeightCm, 10) || 220, 180, 250);
  }

  function selectedDoorHeightMeters() {
    return selectedDoorHeightCm() / 100;
  }

  function selectedDoorThicknessMeters() {
    return state.doorThickness === '54' ? .054 : .04;
  }

  function subtractVector(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  }

  function crossVector(a, b) {
    return {
      x: (a.y * b.z) - (a.z * b.y),
      y: (a.z * b.x) - (a.x * b.z),
      z: (a.x * b.y) - (a.y * b.x),
    };
  }

  function dotVector(a, b) {
    return (a.x * b.x) + (a.y * b.y) + (a.z * b.z);
  }

  function normalizeVector(vector) {
    const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
    return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
  }

  function createCamera() {
    const doorHeight = selectedDoorHeightMeters();
    const position = state.cameraSide === 'inside'
      ? { x: -2.45, y: doorHeight * .62, z: -4.35 }
      : { x: 2.55, y: doorHeight * .6, z: 4.55 };
    const target = { x: 0, y: doorHeight * .49, z: -.04 };
    const forward = normalizeVector(subtractVector(target, position));
    const right = normalizeVector(crossVector(forward, { x: 0, y: 1, z: 0 }));
    const up = normalizeVector(crossVector(right, forward));
    return { position, forward, right, up, focalLength: 1220 };
  }

  function projectPoint(point) {
    const relative = subtractVector(point, activeCamera.position);
    const depth = dotVector(relative, activeCamera.forward);
    const scale = activeCamera.focalLength / Math.max(depth, .1);
    return {
      x: (renderCanvas.width / 2) + (dotVector(relative, activeCamera.right) * scale),
      y: (renderCanvas.height * .54) - (dotVector(relative, activeCamera.up) * scale),
      depth,
      scale,
    };
  }

  function cameraDepth(point) {
    return dotVector(subtractVector(point, activeCamera.position), activeCamera.forward);
  }

  function projectedPolygon(points) {
    return points.map(projectPoint);
  }

  function worldRectangle(x1, y1, x2, y2, z) {
    return [
      { x: x1, y: y2, z },
      { x: x2, y: y2, z },
      { x: x2, y: y1, z },
      { x: x1, y: y1, z },
    ];
  }

  function fillProjectedFace(context, points, colors, stroke = null, lineWidth = 1) {
    const projected = projectedPolygon(points);
    polygon(context, projected);
    const gradient = context.createLinearGradient(projected[0].x, projected[0].y, projected[2].x, projected[2].y);
    colors.forEach((color, index) => gradient.addColorStop(index / Math.max(colors.length - 1, 1), color));
    context.fillStyle = gradient;
    context.fill();
    if (stroke) {
      context.lineWidth = lineWidth;
      context.strokeStyle = stroke;
      context.stroke();
    }
    return projected;
  }

  function finishGradient(context, finish, x1, x2) {
    const palettes = {
      steel: ['#667279', '#f7f9f8', '#7d888e'],
      aluminium: ['#778087', '#d9ddde', '#848d92'],
      black: ['#030506', '#343a3d', '#07090a'],
      brass: ['#68480e', '#f2d16f', '#8b641a'],
      chrome: ['#5d6971', '#ffffff', '#77838a'],
      nickel: ['#706a61', '#d8d1c5', '#817b72'],
      galvanized: ['#747d80', '#cbd1d1', '#858e90'],
    };
    const colors = palettes[finish] || palettes.steel;
    const gradient = context.createLinearGradient(x1, 0, x2, 0);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(.48, colors[1]);
    gradient.addColorStop(1, colors[2]);
    return gradient;
  }

  function getDoorColors() {
    const palettes = {
      grey: ['#aeb1b0', '#bec0be', '#b5b7b6', '#a4a7a6'],
      white: ['#e4e5e1', '#f0f0ec', '#e9e9e5', '#d8dad6'],
      anthracite: ['#343b3f', '#454c50', '#3c4347', '#2f363a'],
      custom: ['#823946', '#944551', '#8b3f4b', '#74303c'],
    };
    return palettes[state.doorFinish] || palettes.grey;
  }

  function doorAngleRadians() {
    const hingeDirection = state.hingeSide === 'left' ? 1 : -1;
    const swingDirection = state.swingDirection === 'inward' ? 1 : -1;
    return (Number(state.openAngle) * Math.PI / 180) * hingeDirection * swingDirection;
  }

  function doorWorldPoint(distanceFromHinge, y, z = 0) {
    const angle = doorAngleRadians();
    const hingeX = state.hingeSide === 'left' ? -.5 : .5;
    const localX = state.hingeSide === 'left' ? distanceFromHinge : -distanceFromHinge;
    return {
      x: hingeX + (localX * Math.cos(angle)) + (z * Math.sin(angle)),
      y,
      z: .035 - (localX * Math.sin(angle)) + (z * Math.cos(angle)),
    };
  }

  function doorSurfacePoint(xMillimeters, yMillimeters, z = 0) {
    const physicalX = xMillimeters / DOOR_WIDTH;
    const distanceFromHinge = state.hingeSide === 'left' ? physicalX : DOOR_WIDTH_METERS - physicalX;
    const normalizedY = yMillimeters / DOOR_HEIGHT;
    return doorWorldPoint(distanceFromHinge, selectedDoorHeightMeters() * (1 - normalizedY), z);
  }

  function drawEnvironment(context) {
    const wall = context.createLinearGradient(0, 0, renderCanvas.width, renderCanvas.height * .7);
    wall.addColorStop(0, state.cameraSide === 'inside' ? '#eeece7' : '#f0ede7');
    wall.addColorStop(1, state.cameraSide === 'inside' ? '#d9d7d1' : '#dedbd4');
    context.fillStyle = wall;
    context.fillRect(0, 0, renderCanvas.width, renderCanvas.height);

    const floorTop = renderCanvas.height * .69;
    const floor = context.createLinearGradient(0, floorTop, 0, renderCanvas.height);
    floor.addColorStop(0, state.cameraSide === 'inside' ? '#b3afa8' : '#bbb7b0');
    floor.addColorStop(1, state.cameraSide === 'inside' ? '#85827d' : '#8d8983');
    context.fillStyle = floor;
    context.fillRect(0, floorTop, renderCanvas.width, renderCanvas.height - floorTop);

    context.save();
    context.globalAlpha = .11;
    for (let index = 0; index < 8; index += 1) {
      context.fillStyle = '#4f5658';
      context.fillRect(0, floorTop + (index * 29), renderCanvas.width, 1);
    }
    context.restore();
  }

  function drawFrame(context) {
    const doorHeight = selectedDoorHeightMeters();
    const openingTop = doorHeight + .06;
    const frameTop = doorHeight + .16;
    const opening = worldRectangle(-.535, .07, .535, openingTop, -.1);
    fillProjectedFace(context, opening, ['#111a20', '#27333a', '#080d10']);

    const recessLeft = [
      { x: -.535, y: .07, z: .04 },
      { x: -.535, y: openingTop, z: .04 },
      { x: -.535, y: openingTop, z: -.12 },
      { x: -.535, y: .07, z: -.12 },
    ];
    const recessRight = recessLeft.map((point) => ({ ...point, x: .535 }));
    fillProjectedFace(context, recessLeft, ['#b9b8b3', '#e7e4dd', '#878b89'], 'rgba(50,57,59,.55)');
    fillProjectedFace(context, recessRight, ['#888d8b', '#e5e2db', '#b0b1ad'], 'rgba(50,57,59,.55)');

    const frameColor = state.cameraSide === 'inside'
      ? ['#d2d0ca', '#fbfaf6', '#b5b7b4']
      : ['#c7c6c0', '#fffef8', '#afb2b0'];
    fillProjectedFace(context, worldRectangle(-.65, .02, -.535, frameTop, .055), frameColor, 'rgba(54,61,63,.48)', 1.4);
    fillProjectedFace(context, worldRectangle(.535, .02, .65, frameTop, .055), frameColor, 'rgba(54,61,63,.48)', 1.4);
    fillProjectedFace(context, worldRectangle(-.535, openingTop, .535, frameTop, .055), frameColor, 'rgba(54,61,63,.48)', 1.4);

    const gasketColor = ['#101719', '#343d3f', '#090d0e'];
    fillProjectedFace(context, worldRectangle(-.544, .08, -.518, openingTop + .01, .068), gasketColor);
    fillProjectedFace(context, worldRectangle(.518, .08, .544, openingTop + .01, .068), gasketColor);
    fillProjectedFace(context, worldRectangle(-.52, openingTop - .025, .52, openingTop + .005, .068), gasketColor);

    const threshold = [
      { x: -.66, y: .015, z: .18 },
      { x: .66, y: .015, z: .18 },
      { x: .66, y: .015, z: -.18 },
      { x: -.66, y: .015, z: -.18 },
    ];
    const thresholdProjected = fillProjectedFace(context, threshold, ['#d4d4ce', '#7f8482', '#343838'], '#3d4445', 1.3);
    context.save();
    polygon(context, thresholdProjected);
    context.clip();
    context.globalAlpha = .32;
    for (let index = 0; index < 7; index += 1) {
      context.fillStyle = index % 2 ? '#ffffff' : '#1d2426';
      context.fillRect(0, thresholdProjected[0].y + (index * 3), renderCanvas.width, 1);
    }
    context.restore();
  }

  function drawDoorShadow(context) {
    const hinge = projectPoint(doorWorldPoint(0, .015, 0));
    const latchFront = projectPoint(doorWorldPoint(1, .015, 0));
    const latchBack = projectPoint(doorWorldPoint(1, .015, -selectedDoorThicknessMeters()));
    const hingeBack = projectPoint(doorWorldPoint(0, .015, -selectedDoorThicknessMeters()));
    context.save();
    context.filter = 'blur(15px)';
    context.globalAlpha = .32;
    polygon(context, [
      { x: hinge.x + 10, y: hinge.y + 8 },
      { x: latchFront.x + 58, y: latchFront.y + 28 },
      { x: latchBack.x + 50, y: latchBack.y + 37 },
      { x: hingeBack.x + 7, y: hingeBack.y + 15 },
    ]);
    context.fillStyle = '#071018';
    context.fill();
    context.restore();
  }

  function drawWoodGrain(context, z) {
    context.save();
    const face = projectedPolygon([
      doorSurfacePoint(0, 0, z),
      doorSurfacePoint(DOOR_WIDTH, 0, z),
      doorSurfacePoint(DOOR_WIDTH, DOOR_HEIGHT, z),
      doorSurfacePoint(0, DOOR_HEIGHT, z),
    ]);
    polygon(context, face);
    context.clip();
    for (let index = 0; index <= 42; index += 1) {
      const x = (index / 42) * DOOR_WIDTH;
      const top = projectPoint(doorSurfacePoint(x, 0, z + (z === 0 ? .001 : -.001)));
      const bottom = projectPoint(doorSurfacePoint(x + (Math.sin(index * 1.7) * 7), DOOR_HEIGHT, z + (z === 0 ? .001 : -.001)));
      context.strokeStyle = index % 4 === 0 ? 'rgba(255,255,255,.042)' : 'rgba(25,36,43,.026)';
      context.lineWidth = index % 5 === 0 ? 1 : .55;
      context.beginPath();
      context.moveTo(top.x, top.y);
      context.bezierCurveTo(
        top.x + (Math.sin(index * .9) * 5),
        top.y + ((bottom.y - top.y) * .34),
        bottom.x - (Math.cos(index * 1.2) * 4),
        top.y + ((bottom.y - top.y) * .69),
        bottom.x,
        bottom.y,
      );
      context.stroke();
    }
    context.restore();
  }

  function glassColors() {
    const palettes = {
      clear: ['rgba(205,230,237,.9)', 'rgba(51,92,108,.94)'],
      frosted: ['rgba(247,248,244,.98)', 'rgba(183,197,199,.98)'],
      frostedBorder: ['rgba(210,234,239,.96)', 'rgba(65,107,122,.95)'],
      smoke: ['rgba(92,103,106,.96)', 'rgba(18,29,32,.99)'],
      bronze: ['rgba(184,145,94,.96)', 'rgba(66,47,29,.99)'],
      reeded: ['rgba(224,237,238,.98)', 'rgba(98,139,148,.96)'],
    };
    return palettes[state.glassTint] || palettes.clear;
  }

  function drawGlassOnDoor(context, pane, z, backFace = false) {
    const points = projectedPolygon([
      doorSurfacePoint(pane.x, pane.y, z),
      doorSurfacePoint(pane.x + pane.width, pane.y, z),
      doorSurfacePoint(pane.x + pane.width, pane.y + pane.height, z),
      doorSurfacePoint(pane.x, pane.y + pane.height, z),
    ]);
    polygon(context, points);
    const colors = glassColors();
    const gradient = context.createLinearGradient(points[0].x, points[0].y, points[2].x, points[2].y);
    gradient.addColorStop(0, backFace ? colors[1] : colors[0]);
    gradient.addColorStop(.52, backFace ? colors[0] : colors[1]);
    gradient.addColorStop(1, colors[0]);
    context.fillStyle = gradient;
    context.fill();

    context.save();
    polygon(context, points);
    context.clip();
    if (state.glassTint !== 'frosted') {
      context.globalAlpha = state.glassTint === 'smoke' ? .2 : .38;
      context.fillStyle = '#f5fdff';
      context.beginPath();
      context.moveTo(points[0].x - 20, points[0].y + 18);
      context.lineTo(points[0].x + ((points[1].x - points[0].x) * .43), points[0].y - 8);
      context.lineTo(points[2].x - ((points[2].x - points[3].x) * .18), points[2].y - 46);
      context.lineTo(points[3].x - 12, points[3].y - 12);
      context.closePath();
      context.fill();
      context.globalAlpha = 1;
    }
    if (state.glassTint === 'reeded') {
      context.strokeStyle = 'rgba(255,255,255,.52)';
      context.lineWidth = 1.4;
      for (let offset = 25; offset < pane.width; offset += 45) {
        const top = projectPoint(doorSurfacePoint(pane.x + offset, pane.y, z));
        const bottom = projectPoint(doorSurfacePoint(pane.x + offset, pane.y + pane.height, z));
        context.beginPath();
        context.moveTo(top.x, top.y);
        context.lineTo(bottom.x, bottom.y);
        context.stroke();
      }
    }
    context.restore();

    const beadColor = state.beadStyle === 'steel'
      ? '#626d72'
      : state.doorFinish === 'anthracite' ? '#343c40' : '#f1f0eb';
    polygon(context, points);
    context.shadowColor = 'rgba(5,12,16,.5)';
    context.shadowBlur = 7;
    context.shadowOffsetY = 3;
    context.strokeStyle = beadColor;
    context.lineWidth = state.beadStyle === 'steel' ? 5 : state.beadStyle === 'classic' ? 12 : 8;
    context.stroke();
    context.shadowColor = 'transparent';

    if (state.beadStyle === 'classic' || state.glassTint === 'frostedBorder') {
      const inset = state.glassTint === 'frostedBorder' ? Math.min(76, pane.width * .15, pane.height * .15) : 22;
      const inner = projectedPolygon([
        doorSurfacePoint(pane.x + inset, pane.y + inset, z + (z === 0 ? .001 : -.001)),
        doorSurfacePoint(pane.x + pane.width - inset, pane.y + inset, z + (z === 0 ? .001 : -.001)),
        doorSurfacePoint(pane.x + pane.width - inset, pane.y + pane.height - inset, z + (z === 0 ? .001 : -.001)),
        doorSurfacePoint(pane.x + inset, pane.y + pane.height - inset, z + (z === 0 ? .001 : -.001)),
      ]);
      polygon(context, inner);
      context.lineWidth = state.glassTint === 'frostedBorder' ? 3 : 2;
      context.strokeStyle = state.glassTint === 'frostedBorder' ? 'rgba(241,246,244,.86)' : 'rgba(77,88,92,.52)';
      context.stroke();
    }
  }

  function drawWeatherbarOnDoor(context) {
    const points = projectedPolygon([
      doorSurfacePoint(45, WELDORPEL_TOP, .018),
      doorSurfacePoint(955, WELDORPEL_TOP, .018),
      doorSurfacePoint(955, WELDORPEL_TOP + WELDORPEL_HEIGHT, .038),
      doorSurfacePoint(45, WELDORPEL_TOP + WELDORPEL_HEIGHT, .038),
    ]);
    context.save();
    polygon(context, points);
    context.shadowColor = 'rgba(0,0,0,.58)';
    context.shadowBlur = 12;
    context.shadowOffsetY = 8;
    context.fillStyle = getDoorColors()[2];
    context.fill();
    context.restore();

    polygon(context, points);
    const gradient = context.createLinearGradient(points[0].x, points[0].y, points[3].x, points[3].y);
    const colors = getDoorColors();
    gradient.addColorStop(0, colors[1]);
    gradient.addColorStop(.3, colors[2]);
    gradient.addColorStop(.72, colors[3]);
    gradient.addColorStop(1, '#252d31');
    context.fillStyle = gradient;
    context.fill();
    context.lineWidth = 1.3;
    context.strokeStyle = 'rgba(23,33,37,.58)';
    context.stroke();

    const dripStart = projectPoint(doorSurfacePoint(85, WELDORPEL_TOP + WELDORPEL_HEIGHT, .041));
    const dripEnd = projectPoint(doorSurfacePoint(915, WELDORPEL_TOP + WELDORPEL_HEIGHT, .041));
    context.lineCap = 'round';
    context.lineWidth = 3.5;
    context.strokeStyle = 'rgba(14,20,22,.78)';
    context.beginPath();
    context.moveTo(dripStart.x, dripStart.y + 2);
    context.lineTo(dripEnd.x, dripEnd.y + 2);
    context.stroke();
    context.lineCap = 'butt';
  }

  function drawHardwareOnDoor(context, backFace = false) {
    const hardwareX = getHardwareCenter();
    const z = backFace ? -selectedDoorThicknessMeters() - .014 : .022;
    const center = projectPoint(doorSurfacePoint(hardwareX, 1110, z));
    const finish = finishGradient(context, state.hardwareFinish, center.x - 22, center.x + 26);

    if (backFace) {
      const leverEnd = projectPoint(doorSurfacePoint(hardwareX + (state.hingeSide === 'left' ? 145 : -145), 1110, z));
      context.lineCap = 'round';
      context.lineWidth = 10;
      context.strokeStyle = finish;
      context.beginPath();
      context.moveTo(center.x, center.y);
      context.lineTo(leverEnd.x, leverEnd.y);
      context.stroke();
      context.lineCap = 'butt';
      return;
    }

    if (state.hardwareType === 'bar') {
      const top = projectPoint(doorSurfacePoint(hardwareX, 625, z));
      const bottom = projectPoint(doorSurfacePoint(hardwareX, 1590, z));
      context.lineCap = 'round';
      context.lineWidth = 15;
      context.strokeStyle = 'rgba(12,20,24,.38)';
      context.beginPath();
      context.moveTo(top.x + 3, top.y + 4);
      context.lineTo(bottom.x + 3, bottom.y + 4);
      context.stroke();
      context.lineWidth = 10;
      context.strokeStyle = finish;
      context.beginPath();
      context.moveTo(top.x, top.y);
      context.lineTo(bottom.x, bottom.y);
      context.stroke();
      [top, bottom].forEach((mount) => {
        context.beginPath();
        context.arc(mount.x, mount.y, 8, 0, Math.PI * 2);
        context.fillStyle = finishGradient(context, state.hardwareFinish, mount.x - 8, mount.x + 8);
        context.fill();
      });
      context.lineCap = 'butt';
    } else if (state.hardwareType === 'knob') {
      const radial = context.createRadialGradient(center.x - 7, center.y - 8, 2, center.x, center.y, 21);
      radial.addColorStop(0, '#fff');
      radial.addColorStop(.38, state.hardwareFinish === 'brass' ? '#e1bd5b' : '#b8c0c4');
      radial.addColorStop(1, state.hardwareFinish === 'black' ? '#080a0b' : '#39454b');
      context.beginPath();
      context.arc(center.x, center.y, 21, 0, Math.PI * 2);
      context.fillStyle = radial;
      context.fill();
    } else {
      const leverEnd = projectPoint(doorSurfacePoint(hardwareX + (state.hingeSide === 'left' ? 175 : -175), 1110, z));
      context.lineCap = 'round';
      context.lineWidth = 12;
      context.strokeStyle = finish;
      context.beginPath();
      context.moveTo(center.x, center.y);
      context.lineTo(leverEnd.x, leverEnd.y);
      context.stroke();
      context.lineCap = 'butt';
    }

    const cylinder = projectPoint(doorSurfacePoint(hardwareX, 1245, z));
    context.beginPath();
    context.arc(cylinder.x, cylinder.y, 9, 0, Math.PI * 2);
    context.fillStyle = finishGradient(context, state.hardwareFinish, cylinder.x - 9, cylinder.x + 9);
    context.fill();
    context.lineWidth = 1.5;
    context.strokeStyle = 'rgba(18,27,32,.66)';
    context.stroke();
  }

  function drawDoorFront(context) {
    const points = [
      doorSurfacePoint(0, 0, 0),
      doorSurfacePoint(DOOR_WIDTH, 0, 0),
      doorSurfacePoint(DOOR_WIDTH, DOOR_HEIGHT, 0),
      doorSurfacePoint(0, DOOR_HEIGHT, 0),
    ];
    const projected = projectedPolygon(points);
    context.save();
    polygon(context, projected);
    context.shadowColor = 'rgba(0,0,0,.5)';
    context.shadowBlur = 18;
    context.shadowOffsetX = 9;
    context.shadowOffsetY = 10;
    context.fillStyle = getDoorColors()[2];
    context.fill();
    context.restore();

    polygon(context, projected);
    const colors = getDoorColors();
    const gradient = context.createLinearGradient(projected[0].x, projected[0].y, projected[3].x, projected[3].y);
    gradient.addColorStop(0, colors[1]);
    gradient.addColorStop(.5, colors[2]);
    gradient.addColorStop(1, colors[0]);
    context.fillStyle = gradient;
    context.fill();
    drawWoodGrain(context, 0);

    polygon(context, projected);
    context.lineWidth = 2.2;
    context.strokeStyle = 'rgba(23,34,40,.74)';
    context.stroke();
    state.panes.forEach((pane) => drawGlassOnDoor(context, pane, .006));
    drawWeatherbarOnDoor(context);
    drawHardwareOnDoor(context);
  }

  function drawDoorBack(context) {
    const points = [
      doorSurfacePoint(0, 0, -selectedDoorThicknessMeters()),
      doorSurfacePoint(DOOR_WIDTH, 0, -selectedDoorThicknessMeters()),
      doorSurfacePoint(DOOR_WIDTH, DOOR_HEIGHT, -selectedDoorThicknessMeters()),
      doorSurfacePoint(0, DOOR_HEIGHT, -selectedDoorThicknessMeters()),
    ];
    const projected = projectedPolygon(points);
    polygon(context, projected);
    const colors = getDoorColors();
    const gradient = context.createLinearGradient(projected[0].x, projected[0].y, projected[3].x, projected[3].y);
    gradient.addColorStop(0, colors[1]);
    gradient.addColorStop(.55, colors[2]);
    gradient.addColorStop(1, colors[0]);
    context.fillStyle = gradient;
    context.fill();
    drawWoodGrain(context, -selectedDoorThicknessMeters());
    polygon(context, projected);
    context.lineWidth = 2;
    context.strokeStyle = 'rgba(20,30,35,.72)';
    context.stroke();
    state.panes.forEach((pane) => drawGlassOnDoor(context, pane, -selectedDoorThicknessMeters() - .004, true));
    drawHardwareOnDoor(context, true);
  }

  function drawDoorEdge(context, points, latchEdge = false) {
    const projected = fillProjectedFace(context, points, ['#6f777b', '#d1d1cc', '#8a9194', '#545d61'], 'rgba(26,35,39,.7)', 1.4);
    context.save();
    polygon(context, projected);
    context.clip();
    context.globalAlpha = .22;
    for (let index = 0; index < 9; index += 1) {
      context.fillStyle = index % 2 ? '#fff' : '#27343a';
      context.fillRect(0, projected[0].y + (index * 14), renderCanvas.width, 1);
    }
    context.restore();

    if (!latchEdge) return;
    const plate = [
      doorWorldPoint(1, .74, -.008),
      doorWorldPoint(1, .74, -selectedDoorThicknessMeters() + .008),
      doorWorldPoint(1, 1.46, -selectedDoorThicknessMeters() + .008),
      doorWorldPoint(1, 1.46, -.008),
    ];
    const plateProjected = projectedPolygon(plate);
    polygon(context, plateProjected);
    context.fillStyle = finishGradient(context, 'steel', plateProjected[0].x, plateProjected[1].x);
    context.fill();
    context.lineWidth = 1;
    context.strokeStyle = 'rgba(27,35,39,.66)';
    context.stroke();

    const latch = projectPoint(doorWorldPoint(1.002, 1.08, -selectedDoorThicknessMeters() * .5));
    context.beginPath();
    context.arc(latch.x, latch.y, 5, 0, Math.PI * 2);
    context.fillStyle = '#5d676b';
    context.fill();
  }

  function drawDoorLeaf(context) {
    const front = [
      doorWorldPoint(0, selectedDoorHeightMeters(), 0),
      doorWorldPoint(1, selectedDoorHeightMeters(), 0),
      doorWorldPoint(1, 0, 0),
      doorWorldPoint(0, 0, 0),
    ];
    const back = [
      doorWorldPoint(0, selectedDoorHeightMeters(), -selectedDoorThicknessMeters()),
      doorWorldPoint(1, selectedDoorHeightMeters(), -selectedDoorThicknessMeters()),
      doorWorldPoint(1, 0, -selectedDoorThicknessMeters()),
      doorWorldPoint(0, 0, -selectedDoorThicknessMeters()),
    ];
    const hingeEdge = [front[0], front[3], back[3], back[0]];
    const latchEdge = [front[1], back[1], back[2], front[2]];
    const topEdge = [front[0], back[0], back[1], front[1]];
    const bottomEdge = [front[3], front[2], back[2], back[3]];
    const faces = [
      { points: front, draw: () => drawDoorFront(context) },
      { points: back, draw: () => drawDoorBack(context) },
      { points: hingeEdge, draw: () => drawDoorEdge(context, hingeEdge) },
      { points: latchEdge, draw: () => drawDoorEdge(context, latchEdge, true) },
      { points: topEdge, draw: () => drawDoorEdge(context, topEdge) },
      { points: bottomEdge, draw: () => drawDoorEdge(context, bottomEdge) },
    ];
    faces
      .sort((a, b) => {
        const depthA = a.points.reduce((sum, point) => sum + cameraDepth(point), 0) / a.points.length;
        const depthB = b.points.reduce((sum, point) => sum + cameraDepth(point), 0) / b.points.length;
        return depthB - depthA;
      })
      .forEach((face) => face.draw());
  }

  function drawHingesInScene(context) {
    if (state.hingeStyle === 'concealed') return;
    const count = Number.parseInt(state.hingeCount, 10);
    const doorHeight = selectedDoorHeightMeters();
    for (let index = 0; index < count; index += 1) {
      const y = (doorHeight * .16) + (((doorHeight * .68) / Math.max(count - 1, 1)) * index);
      const bottom = projectPoint(doorWorldPoint(0, y - .055, -selectedDoorThicknessMeters() * .52));
      const top = projectPoint(doorWorldPoint(0, y + .055, -selectedDoorThicknessMeters() * .52));
      context.lineCap = 'round';
      context.lineWidth = state.hingeStyle === 'paumelle' ? 12 : 10;
      context.strokeStyle = finishGradient(context, state.hingeFinish, bottom.x - 8, bottom.x + 8);
      context.beginPath();
      context.moveTo(bottom.x, bottom.y);
      context.lineTo(top.x, top.y);
      context.stroke();
      if (state.hingeStyle === 'ball' || state.hingeStyle === 'vase') {
        context.beginPath();
        context.arc(top.x, top.y - 3, state.hingeStyle === 'vase' ? 6 : 4.5, 0, Math.PI * 2);
        context.fillStyle = finishGradient(context, state.hingeFinish, top.x - 7, top.x + 7);
        context.fill();
      }
      context.lineCap = 'butt';
    }

    if (state.hingeSecurity === 'claw' && Number(state.openAngle) > 9) {
      [doorHeight * .36, doorHeight * .66].forEach((y) => {
        const start = projectPoint(doorWorldPoint(0, y, -selectedDoorThicknessMeters() * .5));
        const end = projectPoint({
          x: state.hingeSide === 'left' ? -.545 : .545,
          y,
          z: -.015,
        });
        context.lineCap = 'round';
        context.lineWidth = 5;
        context.strokeStyle = finishGradient(context, state.hingeFinish, start.x, end.x);
        context.beginPath();
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.stroke();
        context.lineCap = 'butt';
      });
    }
  }

  function renderExportCanvas() {
    const context = renderContext;
    context.clearRect(0, 0, renderCanvas.width, renderCanvas.height);
    context.fillStyle = '#f2f6fa';
    context.fillRect(0, 0, renderCanvas.width, renderCanvas.height);

    context.fillStyle = '#063b7a';
    context.font = '800 24px Arial, sans-serif';
    context.fillText('BIJVOETS DEUREN · DEURONTWERP', 42, 48);
    context.fillStyle = '#e30619';
    context.fillRect(42, 60, 310, 5);

    const doorHeightPixels = 825;
    const doorWidthPixels = doorHeightPixels * (100 / selectedDoorHeightCm());
    const doorX = (renderCanvas.width - doorWidthPixels) / 2;
    const doorY = 92;
    const frame = 18;

    context.fillStyle = '#f6f5f1';
    context.fillRect(doorX - frame, doorY - frame, doorWidthPixels + (frame * 2), doorHeightPixels + (frame * 2));
    context.strokeStyle = '#79858c';
    context.lineWidth = 2;
    context.strokeRect(doorX - frame, doorY - frame, doorWidthPixels + (frame * 2), doorHeightPixels + (frame * 2));

    context.fillStyle = getDoorColors()[2];
    context.fillRect(doorX, doorY, doorWidthPixels, doorHeightPixels);
    context.strokeStyle = 'rgba(31,42,47,.7)';
    context.lineWidth = 2;
    context.strokeRect(doorX, doorY, doorWidthPixels, doorHeightPixels);

    context.save();
    context.beginPath();
    context.rect(doorX, doorY, doorWidthPixels, doorHeightPixels);
    context.clip();
    for (let index = 1; index < 28; index += 1) {
      const grainX = doorX + ((doorWidthPixels / 28) * index);
      context.strokeStyle = index % 4 === 0 ? 'rgba(255,255,255,.09)' : 'rgba(38,47,51,.04)';
      context.lineWidth = .75;
      context.beginPath();
      context.moveTo(grainX, doorY);
      context.lineTo(grainX + (Math.sin(index) * 2), doorY + doorHeightPixels);
      context.stroke();
    }
    context.restore();

    const scaleX = doorWidthPixels / DOOR_WIDTH;
    const scaleY = doorHeightPixels / DOOR_HEIGHT;
    const glassFills = {
      clear: '#a8cbd8',
      frosted: '#dce4e4',
      frostedBorder: '#b8d4dc',
      smoke: '#53636a',
      bronze: '#9a7650',
      reeded: '#b8d3d6',
    };
    state.panes.forEach((pane) => {
      const x = doorX + (pane.x * scaleX);
      const y = doorY + (pane.y * scaleY);
      const width = pane.width * scaleX;
      const height = pane.height * scaleY;
      context.fillStyle = glassFills[state.glassTint] || glassFills.clear;
      context.fillRect(x, y, width, height);
      context.strokeStyle = state.beadStyle === 'steel' ? '#59666d' : '#eef0ed';
      context.lineWidth = state.beadStyle === 'steel' ? 5 : state.beadStyle === 'classic' ? 10 : 7;
      context.strokeRect(x, y, width, height);
      context.lineWidth = 1.5;
      context.strokeStyle = 'rgba(42,60,69,.62)';
      context.strokeRect(x + 7, y + 7, Math.max(1, width - 14), Math.max(1, height - 14));
    });

    const weatherbarY = doorY + (WELDORPEL_TOP * scaleY);
    const weatherbarX = doorX + (45 * scaleX);
    const weatherbarWidth = 910 * scaleX;
    const weatherbarHeight = Math.max(12, WELDORPEL_HEIGHT * scaleY);
    context.fillStyle = getDoorColors()[0];
    context.fillRect(weatherbarX, weatherbarY, weatherbarWidth, weatherbarHeight);
    context.strokeStyle = '#5b666b';
    context.lineWidth = 1.5;
    context.strokeRect(weatherbarX, weatherbarY, weatherbarWidth, weatherbarHeight);
    context.fillStyle = '#374247';
    context.fillRect(weatherbarX + 8, weatherbarY + weatherbarHeight - 3, weatherbarWidth - 16, 2);

    const hardwareX = doorX + (getHardwareCenter() * scaleX);
    const hardwareColor = {
      steel: '#b5bdc1',
      aluminium: '#9ea8ad',
      black: '#161c20',
      brass: '#b7953e',
    }[state.hardwareFinish] || '#b5bdc1';
    context.strokeStyle = hardwareColor;
    context.fillStyle = hardwareColor;
    if (state.hardwareType === 'bar') {
      context.lineWidth = 10;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(hardwareX, doorY + (625 * scaleY));
      context.lineTo(hardwareX, doorY + (1590 * scaleY));
      context.stroke();
      context.lineCap = 'butt';
    } else if (state.hardwareType === 'knob') {
      context.beginPath();
      context.arc(hardwareX, doorY + (1110 * scaleY), 17, 0, Math.PI * 2);
      context.fill();
    } else {
      const handleY = doorY + (1110 * scaleY);
      context.fillRect(hardwareX - 5, handleY - 8, Math.min(72, doorWidthPixels * .22), 12);
    }

    const hingeColor = {
      steel: '#aab3b7',
      brass: '#b7953e',
      black: '#171c1f',
      chrome: '#cbd0d2',
      nickel: '#aaa49b',
      galvanized: '#9fa8aa',
    }[state.hingeFinish] || '#aab3b7';
    const hingeX = state.hingeSide === 'left' ? doorX - 5 : doorX + doorWidthPixels - 6;
    const hingeCount = Number.parseInt(state.hingeCount, 10);
    context.fillStyle = hingeColor;
    for (let index = 0; index < hingeCount; index += 1) {
      const hingeY = doorY + (doorHeightPixels * (.16 + ((.68 / Math.max(hingeCount - 1, 1)) * index)));
      context.fillRect(hingeX, hingeY - 13, 11, 26);
    }

    context.fillStyle = '#717978';
    context.fillRect(doorX - frame - 8, doorY + doorHeightPixels + frame - 2, doorWidthPixels + (frame * 2) + 16, 11);

    context.fillStyle = '#163e68';
    context.font = '800 20px Arial, sans-serif';
    context.fillText(`Aluplex · ${selectedDoorHeightCm()} cm · ${state.doorThickness} mm`, 42, 1018);
    context.fillStyle = '#e30619';
    context.font = '800 25px Arial, sans-serif';
    context.textAlign = 'right';
    context.fillText(`${price.format(calculatePrice())} incl. btw en montage`, renderCanvas.width - 42, 1018);
    context.textAlign = 'left';
  }

  function updateDimensions() {
    const pane = selectedPane();
    dimensions.disabled = !pane;
    dimensions.querySelectorAll('[data-dimension]').forEach((input) => {
      input.value = pane ? String(pane[input.dataset.dimension]) : '';
    });
  }

  function calculatePrice() {
    const height = selectedDoorHeightCm();
    const platePrice = height <= 200 ? 1000 : height <= 210 ? 1100 : 1200;
    const thicknessPremium = state.doorThickness === '54' ? 100 : 0;
    const projectAndInstallationBase = 1350;
    const threePointLockPrice = 425;
    const doorPrices = { grey: 0, white: 0, anthracite: 195, custom: 325 };
    const hardwarePrices = { bar: 295, knob: 165, lever: 145 };
    const finishPrices = { steel: 0, aluminium: 0, black: 45, brass: 125 };
    const beadPrices = { modern: 35, classic: 65, steel: 85 };
    const glassPrices = { clear: 0, frosted: 95, frostedBorder: 165, smoke: 140, bronze: 150, reeded: 175 };
    const hingeStylePrices = { flat: 0, ball: 85, vase: 110, paumelle: 70, concealed: 240 };
    const hingeFinishPrices = { steel: 0, brass: 135, black: 85, chrome: 75, nickel: 95, galvanized: 0 };
    const securityPrice = state.hingeSecurity === 'claw' ? 185 : 0;
    const hingeCountPrice = state.hingeCount === '4' ? 45 : 0;
    const glassTotal = state.panes.reduce((total, pane) => {
      const area = (pane.width * pane.height) / 1000000;
      return total + 175 + (area * 240) + beadPrices[state.beadStyle] + glassPrices[state.glassTint];
    }, 0);
    const totalExcludingVat = projectAndInstallationBase + platePrice + thicknessPremium + threePointLockPrice
      + doorPrices[state.doorFinish] + hardwarePrices[state.hardwareType] + finishPrices[state.hardwareFinish]
      + hingeStylePrices[state.hingeStyle] + hingeFinishPrices[state.hingeFinish] + securityPrice + hingeCountPrice + glassTotal;
    return Math.round(totalExcludingVat * 1.21);
  }

  function buildDesignMessage() {
    const paneSizes = state.panes.length
      ? state.panes.map((pane, index) => `Glasvak ${index + 1}: ${pane.width} × ${pane.height} mm`).join('\n')
      : 'Geen glasvakken';
    return [
      'Hallo Bijvoets Deuren, ik wil graag dit deurontwerp bespreken.',
      'Ik stuur ook de gegenereerde afbeelding van mijn ontwerp mee.',
      '',
      `Deur: ${labels.doorFinish[state.doorFinish]}`,
      'Materiaal: Aluplex',
      `Afmetingen deurblad: ${selectedDoorHeightCm()} cm hoog × ${state.doorThickness} mm dik`,
      `Glas: ${labels.glassTint[state.glassTint]}`,
      `Glaslat: ${labels.beadStyle[state.beadStyle]}`,
      paneSizes,
      `Beslag: ${labels.hardwareType[state.hardwareType]} in ${labels.hardwareFinish[state.hardwareFinish]}`,
      'Sluiting: driepuntsluiting, standaard inclusief montage',
      'Weldorpel: standaard aan de buitenzijde, met waterafvoer en druipgroef',
      'Valdorpel: standaard ingefreesd, tegen tocht en geluid onder de deur',
      `Scharnieren: ${state.hingeCount}× ${labels.hingeStyle[state.hingeStyle]} in ${labels.hingeFinish[state.hingeFinish]}`,
      `Beveiliging: ${labels.hingeSecurity[state.hingeSecurity]}`,
      `Draairichting en zijde: ${labels.swingDirection[state.swingDirection]}, scharnieren ${labels.hingeSide[state.hingeSide].toLowerCase()}`,
      `Globale prijs inclusief btw en montage: ${price.format(calculatePrice())}`,
      '',
      'Ik begrijp dat maatvoering, glasopbouw en definitieve prijs nog gecontroleerd worden.',
    ].join('\n');
  }

  function getWhatsappUrl() {
    const url = new URL('https://wa.me/31638569988');
    url.searchParams.set('text', buildDesignMessage());
    return url.toString();
  }

  function updateSummary() {
    const paneDescription = state.panes.length === 0
      ? 'Geen glasvakken'
      : `${state.panes.length} ${state.panes.length === 1 ? 'glasvak' : 'glasvakken'} · ${labels.glassTint[state.glassTint]}`;
    summaryDoor.textContent = `${labels.doorFinish[state.doorFinish]} · weldorpel + valdorpel`;
    summarySize.textContent = `Aluplex · ${selectedDoorHeightCm()} cm · ${state.doorThickness} mm`;
    summaryGlass.textContent = paneDescription;
    summaryHardware.textContent = `${labels.hardwareType[state.hardwareType]} · ${labels.hardwareFinish[state.hardwareFinish]}`;
    summaryLock.textContent = 'Driepuntsluiting · incl. montage';
    summaryHinges.textContent = `${labels.hingeStyle[state.hingeStyle]} · ${labels.hingeFinish[state.hingeFinish]} · ${state.hingeSecurity === 'claw' ? 'dievenklauw' : 'zonder klauw'}`;
    priceElement.textContent = price.format(calculatePrice());
    hingeAdvice.textContent = state.swingDirection === 'outward'
      ? 'Advies: bij een naar buiten draaiende deur zijn geïntegreerde dievenklauwen belangrijk, omdat de scharnierzijde buiten bereikbaar is.'
      : 'Advies: dievenklauwen bieden extra zekerheid. Bij een naar binnen draaiende deur zitten de scharnieren normaal gesproken al aan de binnenzijde.';
    hingeAdvice.classList.toggle('is-warning', state.swingDirection === 'outward' && state.hingeSecurity === 'standard');
  }

  function render() {
    surface.dataset.finish = state.doorFinish;
    doorPreview.style.aspectRatio = `${DOOR_WIDTH} / ${selectedDoorHeightCm() * 10}`;
    renderPanes();
    renderHardware();
    renderHinges();
    updateDimensions();
    updateSummary();
    stageInstruction.textContent = 'Sleep een glasvak om het te verplaatsen. De onderste weldorpelzone blijft automatisch vrij.';
  }

  function setPreset(name) {
    if (name === 'drievak') {
      state.panes = [createPane(140, 210, 410, 430), createPane(140, 810, 410, 430), createPane(140, 1410, 410, 430)];
      state.hardwareType = 'lever';
    } else if (name === 'glasstrook') {
      state.panes = [createPane(110, 110, 320, 1740)];
      state.hardwareType = 'bar';
    } else {
      state.panes = [];
      state.hardwareType = 'bar';
    }
    state.panes.forEach(normalizePane);
    state.selectedId = state.panes[0]?.id || null;
    root.querySelectorAll('[data-preset]').forEach((button) => {
      const active = button.dataset.preset === name;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const hardwareSelect = root.querySelector('[data-setting="hardwareType"]');
    hardwareSelect.value = state.hardwareType;
    render();
  }

  function selectPane(id) {
    state.selectedId = id;
    render();
  }

  function setDrawMode(active) {
    state.drawMode = active;
    root.classList.toggle('is-drawing', active);
    const button = root.querySelector('[data-action="draw"]');
    button.classList.toggle('is-active', active);
    button.textContent = active ? 'Sleep op de deur…' : 'Teken glasvak';
    help.textContent = active
      ? 'Sleep nu op de deur om een nieuw glasvak te tekenen. De zone van de weldorpel blijft geblokkeerd.'
      : 'Selecteer ‘Teken glasvak’ en sleep een rechthoek. Hulplijnen én de weldorpelzone bewaken de uitlijning.';
  }

  function getRenderDataUrl() {
    renderExportCanvas();
    return renderCanvas.toDataURL('image/png');
  }

  function downloadRender(dataUrl = getRenderDataUrl()) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'bijvoets-deurontwerp.png';
    link.rel = 'noopener';
    document.body.append(link);
    link.click();
    link.remove();
  }

  function dataUrlToFile(dataUrl) {
    const parts = dataUrl.split(',');
    const bytes = window.atob(parts[1]);
    const buffer = new Uint8Array(bytes.length);
    for (let index = 0; index < bytes.length; index += 1) buffer[index] = bytes.charCodeAt(index);
    return new File([buffer], 'bijvoets-deurontwerp.png', { type: 'image/png' });
  }

  downloadButton.addEventListener('click', () => {
    downloadRender();
    shareStatus.textContent = 'De deurafbeelding is gedownload als PNG.';
  });

  whatsappButton.addEventListener('click', async () => {
    const dataUrl = getRenderDataUrl();
    const file = dataUrlToFile(dataUrl);
    const shareData = {
      title: 'Mijn Bijvoets deurontwerp',
      text: buildDesignMessage(),
      files: [file],
    };

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share(shareData);
        shareStatus.textContent = 'Het ontwerp en de deurafbeelding zijn klaar om te delen.';
      } catch (error) {
        if (error.name !== 'AbortError') {
          downloadRender(dataUrl);
          shareStatus.textContent = 'Delen lukte niet. De afbeelding is daarom gedownload.';
        }
      }
      return;
    }

    downloadRender(dataUrl);
    shareStatus.textContent = 'De afbeelding is gedownload. Voeg bijvoets-deurontwerp.png toe aan het WhatsApp-gesprek.';
    const whatsappWindow = window.open(getWhatsappUrl(), '_blank', 'noopener,noreferrer');
    if (!whatsappWindow) shareStatus.textContent += ' Sta pop-ups toe of open WhatsApp opnieuw via deze knop.';
  });

  root.querySelectorAll('[data-setting]').forEach((control) => {
    control.addEventListener('change', () => {
      const key = control.dataset.setting;
      if (key === 'doorHeightCm') {
        const height = clamp(Number.parseInt(control.value, 10) || 220, 180, 250);
        state[key] = String(height);
        control.value = String(height);
      } else {
        state[key] = control.type === 'checkbox' ? control.checked : control.value;
      }
      render();
    });
  });

  root.querySelectorAll('[data-preset]').forEach((button) => button.addEventListener('click', () => setPreset(button.dataset.preset)));
  root.querySelector('[data-action="draw"]').addEventListener('click', () => setDrawMode(!state.drawMode));
  root.querySelector('[data-action="duplicate"]').addEventListener('click', () => {
    const pane = selectedPane();
    if (!pane) {
      state.panes.push(createPane(170, 260, 360, 440));
    } else {
      const copy = createPane(pane.x + 50, pane.y + 80, pane.width, pane.height);
      normalizePane(copy);
      state.panes.push(copy);
      state.selectedId = copy.id;
    }
    render();
  });
  root.querySelector('[data-action="delete"]').addEventListener('click', () => {
    if (!state.selectedId) return;
    state.panes = state.panes.filter((pane) => pane.id !== state.selectedId);
    state.selectedId = state.panes[0]?.id || null;
    render();
  });
  root.querySelector('[data-action="align"]').addEventListener('click', () => {
    const pane = selectedPane();
    if (!pane || state.panes.length < 2) return;
    state.panes.forEach((item) => {
      item.x = pane.x;
      item.width = pane.width;
      normalizePane(item);
    });
    render();
  });
  root.querySelector('[data-action="distribute"]').addEventListener('click', () => {
    if (state.panes.length < 2) return;
    const ordered = [...state.panes].sort((a, b) => a.y - b.y);
    const margin = 110;
    const totalHeight = ordered.reduce((sum, pane) => sum + pane.height, 0);
    const gap = Math.max(40, (GLASS_BOTTOM_LIMIT - (margin * 2) - totalHeight) / (ordered.length - 1));
    let y = margin;
    ordered.forEach((pane) => {
      pane.y = y;
      y += pane.height + gap;
      normalizePane(pane);
    });
    render();
  });

  dimensions.querySelectorAll('[data-dimension]').forEach((input) => input.addEventListener('change', () => {
    const pane = selectedPane();
    if (!pane) return;
    const nextValue = Number.parseInt(input.value, 10);
    if (Number.isFinite(nextValue)) pane[input.dataset.dimension] = nextValue;
    normalizePane(pane);
    render();
  }));

  surface.addEventListener('pointerdown', (event) => {
    const paneElement = event.target.closest('.glass-pane');
    const point = doorPoint(event);

    if (state.drawMode && !paneElement) {
      const pane = createPane(point.x, point.y, MIN_GLASS, MIN_GLASS);
      state.panes.push(pane);
      state.selectedId = pane.id;
      state.interaction = { mode: 'draw', id: pane.id, startX: point.x, startY: point.y };
      surface.setPointerCapture(event.pointerId);
      render();
      event.preventDefault();
      return;
    }

    if (!paneElement) return;
    const id = Number.parseInt(paneElement.dataset.paneId, 10);
    const pane = state.panes.find((item) => item.id === id);
    if (!pane) return;
    state.selectedId = id;
    state.interaction = {
      mode: event.target.classList.contains('glass-resize') ? 'resize' : 'move',
      id,
      offsetX: point.x - pane.x,
      offsetY: point.y - pane.y,
      startX: point.x,
      startY: point.y,
      startWidth: pane.width,
      startHeight: pane.height,
    };
    surface.setPointerCapture(event.pointerId);
    render();
    event.preventDefault();
  });

  surface.addEventListener('pointermove', (event) => {
    if (!state.interaction) return;
    const pane = state.panes.find((item) => item.id === state.interaction.id);
    if (!pane) return;
    const point = doorPoint(event);
    let xSnap = false;
    let ySnap = false;

    if (state.interaction.mode === 'move') {
      const x = snapPosition(point.x - state.interaction.offsetX, 'x', pane.width, pane.id);
      const y = snapPosition(point.y - state.interaction.offsetY, 'y', pane.height, pane.id);
      pane.x = x.value;
      pane.y = y.value;
      xSnap = x.snapped;
      ySnap = y.snapped;
    } else if (state.interaction.mode === 'resize') {
      pane.width = point.x - pane.x;
      pane.height = point.y - pane.y;
    } else {
      pane.x = Math.min(state.interaction.startX, point.x);
      pane.y = Math.min(state.interaction.startY, point.y);
      pane.width = Math.abs(point.x - state.interaction.startX);
      pane.height = Math.abs(point.y - state.interaction.startY);
    }
    normalizePane(pane);
    render();
    showGuides(xSnap, ySnap, pane);
    event.preventDefault();
  });

  const finishInteraction = (event) => {
    if (!state.interaction) return;
    const wasDrawing = state.interaction.mode === 'draw';
    state.interaction = null;
    hideGuides();
    if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
    if (wasDrawing) setDrawMode(false);
    render();
  };
  surface.addEventListener('pointerup', finishInteraction);
  surface.addEventListener('pointercancel', finishInteraction);

  glassLayer.addEventListener('keydown', (event) => {
    const paneElement = event.target.closest('.glass-pane');
    if (!paneElement) return;
    const pane = state.panes.find((item) => item.id === Number.parseInt(paneElement.dataset.paneId, 10));
    if (!pane) return;
    const amount = event.shiftKey ? 50 : 10;
    if (event.key === 'ArrowLeft') pane.x -= amount;
    else if (event.key === 'ArrowRight') pane.x += amount;
    else if (event.key === 'ArrowUp') pane.y -= amount;
    else if (event.key === 'ArrowDown') pane.y += amount;
    else if (event.key === 'Delete' || event.key === 'Backspace') {
      state.panes = state.panes.filter((item) => item.id !== pane.id);
      state.selectedId = state.panes[0]?.id || null;
      render();
      event.preventDefault();
      return;
    } else return;
    state.selectedId = pane.id;
    normalizePane(pane);
    render();
    root.querySelector(`[data-pane-id="${pane.id}"]`)?.focus();
    event.preventDefault();
  });

  setPreset('vlak');
})();
