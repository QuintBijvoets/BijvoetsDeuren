(() => {
  const root = document.querySelector('[data-door-designer]');
  if (!root) return;

  const DOOR_WIDTH = 1000;
  const DOOR_HEIGHT = 2200;
  const MIN_GLASS = 120;
  const EDGE = 60;

  const surface = root.querySelector('[data-door-surface]');
  const glassLayer = root.querySelector('[data-glass-layer]');
  const stage = root.querySelector('[data-stage]');
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
  const summaryGlass = root.querySelector('[data-summary-glass]');
  const summaryHardware = root.querySelector('[data-summary-hardware]');
  const summaryHinges = root.querySelector('[data-summary-hinges]');
  const viewLabel = root.querySelector('[data-view-label]');
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
    pane.height = clamp(roundToTen(pane.height), MIN_GLASS, DOOR_HEIGHT - (EDGE * 2));
    pane.x = clamp(roundToTen(pane.x), EDGE, DOOR_WIDTH - EDGE - pane.width);
    pane.y = clamp(roundToTen(pane.y), EDGE, DOOR_HEIGHT - EDGE - pane.height);
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

    const limit = axis === 'x' ? DOOR_WIDTH : DOOR_HEIGHT;
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

  function mapDoorPoint(x, y) {
    const u = x / DOOR_WIDTH;
    const v = y / DOOR_HEIGHT;
    const topLeft = { x: 238, y: 112 };
    const topRight = { x: 690, y: 162 };
    const bottomLeft = { x: 214, y: 918 };
    const bottomRight = { x: 718, y: 884 };
    const top = {
      x: topLeft.x + ((topRight.x - topLeft.x) * u),
      y: topLeft.y + ((topRight.y - topLeft.y) * u),
    };
    const bottom = {
      x: bottomLeft.x + ((bottomRight.x - bottomLeft.x) * u),
      y: bottomLeft.y + ((bottomRight.y - bottomLeft.y) * u),
    };
    return {
      x: top.x + ((bottom.x - top.x) * v),
      y: top.y + ((bottom.y - top.y) * v),
    };
  }

  function mappedRect(x, y, width, height) {
    return [
      mapDoorPoint(x, y),
      mapDoorPoint(x + width, y),
      mapDoorPoint(x + width, y + height),
      mapDoorPoint(x, y + height),
    ];
  }

  function finishGradient(context, finish, x1, x2) {
    const palettes = {
      steel: ['#727d86', '#f4f7f8', '#8f9aa2'],
      aluminium: ['#7b858d', '#d3d8dc', '#9099a0'],
      black: ['#050708', '#33383c', '#080a0b'],
      brass: ['#775617', '#f1d783', '#9a7225'],
      chrome: ['#65727c', '#ffffff', '#7f8d97'],
      nickel: ['#746f67', '#d7d0c5', '#8a857c'],
      galvanized: ['#7c8588', '#c7ced0', '#8d9698'],
    };
    const colors = palettes[finish] || palettes.steel;
    const gradient = context.createLinearGradient(x1, 0, x2, 0);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(.5, colors[1]);
    gradient.addColorStop(1, colors[2]);
    return gradient;
  }

  function drawGlassPane(context, pane) {
    const points = mappedRect(pane.x, pane.y, pane.width, pane.height);
    polygon(context, points);
    const glassGradients = {
      clear: ['rgba(202,235,249,.92)', 'rgba(74,143,179,.72)'],
      frosted: ['rgba(250,253,253,.98)', 'rgba(188,211,220,.96)'],
      frostedBorder: ['rgba(211,240,250,.95)', 'rgba(78,151,184,.8)'],
      smoke: ['rgba(98,116,126,.93)', 'rgba(24,45,58,.96)'],
      bronze: ['rgba(204,165,111,.9)', 'rgba(87,61,35,.96)'],
      reeded: ['rgba(229,244,248,.96)', 'rgba(118,175,195,.88)'],
    };
    const colors = glassGradients[state.glassTint] || glassGradients.clear;
    const gradient = context.createLinearGradient(points[0].x, points[0].y, points[2].x, points[2].y);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(1, colors[1]);
    context.fillStyle = gradient;
    context.fill();

    context.save();
    polygon(context, points);
    context.clip();
    if (state.glassTint === 'frostedBorder') {
      const inset = Math.min(80, pane.width * .16, pane.height * .16);
      const inner = mappedRect(pane.x + inset, pane.y + inset, pane.width - (inset * 2), pane.height - (inset * 2));
      polygon(context, inner);
      context.fillStyle = 'rgba(242,247,247,.96)';
      context.fill();
    }
    if (state.glassTint === 'reeded') {
      context.strokeStyle = 'rgba(255,255,255,.45)';
      context.lineWidth = 3;
      for (let x = pane.x + 25; x < pane.x + pane.width; x += 55) {
        const top = mapDoorPoint(x, pane.y);
        const bottom = mapDoorPoint(x, pane.y + pane.height);
        context.beginPath();
        context.moveTo(top.x, top.y);
        context.lineTo(bottom.x, bottom.y);
        context.stroke();
      }
    }
    const reflectionStart = mapDoorPoint(pane.x + (pane.width * .12), pane.y);
    const reflectionEnd = mapDoorPoint(pane.x + (pane.width * .48), pane.y + pane.height);
    context.strokeStyle = 'rgba(255,255,255,.34)';
    context.lineWidth = Math.max(5, pane.width / 55);
    context.beginPath();
    context.moveTo(reflectionStart.x, reflectionStart.y);
    context.lineTo(reflectionEnd.x, reflectionEnd.y);
    context.stroke();
    context.restore();

    polygon(context, points);
    context.lineWidth = state.beadStyle === 'steel' ? 5 : state.beadStyle === 'classic' ? 12 : 8;
    context.strokeStyle = state.beadStyle === 'steel' ? '#65747e' : '#edf1f2';
    context.stroke();
    if (state.beadStyle === 'classic') {
      polygon(context, mappedRect(pane.x + 20, pane.y + 20, pane.width - 40, pane.height - 40));
      context.lineWidth = 3;
      context.strokeStyle = 'rgba(70,87,96,.5)';
      context.stroke();
    }
  }

  function drawHardware3d(context) {
    const center = getHardwareCenter();
    const point = mapDoorPoint(center, 1110);
    context.fillStyle = finishGradient(context, state.hardwareFinish, point.x - 30, point.x + 35);
    context.strokeStyle = 'rgba(19,31,39,.55)';
    context.lineWidth = 3;
    if (state.hardwareType === 'bar') {
      const top = mapDoorPoint(center, 650);
      const bottom = mapDoorPoint(center, 1580);
      context.lineWidth = 13;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(top.x, top.y);
      context.lineTo(bottom.x, bottom.y);
      context.strokeStyle = 'rgba(22,30,34,.42)';
      context.stroke();
      context.lineWidth = 9;
      context.strokeStyle = finishGradient(context, state.hardwareFinish, top.x - 8, top.x + 10);
      context.stroke();
      context.lineCap = 'butt';
    } else if (state.hardwareType === 'knob') {
      const radial = context.createRadialGradient(point.x - 7, point.y - 8, 3, point.x, point.y, 22);
      radial.addColorStop(0, '#ffffff');
      radial.addColorStop(.35, state.hardwareFinish === 'brass' ? '#dfbd5e' : '#aeb8be');
      radial.addColorStop(1, state.hardwareFinish === 'black' ? '#080a0c' : '#3d4a52');
      context.beginPath();
      context.arc(point.x, point.y, 22, 0, Math.PI * 2);
      context.fillStyle = radial;
      context.fill();
    } else {
      context.fillRect(point.x - 7, point.y - 15, 14, 31);
      const end = mapDoorPoint(center + 180, 1110);
      context.lineWidth = 13;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(point.x, point.y);
      context.lineTo(end.x, end.y);
      context.strokeStyle = finishGradient(context, state.hardwareFinish, point.x, end.x);
      context.stroke();
      context.lineCap = 'butt';
    }
  }

  function drawHinges3d(context) {
    if (state.hingeStyle === 'concealed') return;
    const count = Number.parseInt(state.hingeCount, 10);
    const x = state.hingeSide === 'left' ? 12 : 988;
    for (let index = 0; index < count; index += 1) {
      const y = 350 + ((1500 / Math.max(count - 1, 1)) * index);
      const point = mapDoorPoint(x, y);
      const outward = state.hingeSide === 'left' ? -1 : 1;
      context.fillStyle = finishGradient(context, state.hingeFinish, point.x - 15, point.x + 15);
      context.fillRect(point.x + (outward * 3) - 8, point.y - 17, 16, 34);
      if (state.hingeStyle === 'ball' || state.hingeStyle === 'vase') {
        context.beginPath();
        context.arc(point.x + (outward * 3), point.y - 19, state.hingeStyle === 'vase' ? 7 : 5, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  function renderRealisticCanvas() {
    const context = renderContext;
    context.clearRect(0, 0, renderCanvas.width, renderCanvas.height);

    const wall = context.createLinearGradient(0, 0, 900, 700);
    wall.addColorStop(0, '#f7f4ee');
    wall.addColorStop(.55, '#e4e1db');
    wall.addColorStop(1, '#c9d0d2');
    context.fillStyle = wall;
    context.fillRect(0, 0, 900, 760);
    const floor = context.createLinearGradient(0, 730, 0, 1000);
    floor.addColorStop(0, '#b6afa4');
    floor.addColorStop(1, '#665f58');
    context.fillStyle = floor;
    context.fillRect(0, 760, 900, 240);
    context.fillStyle = 'rgba(15,28,39,.22)';
    context.beginPath();
    context.ellipse(470, 905, 310, 55, -.04, 0, Math.PI * 2);
    context.fill();

    const front = mappedRect(0, 0, DOOR_WIDTH, DOOR_HEIGHT);
    const depth = [front[1], { x: front[1].x + 35, y: front[1].y - 16 }, { x: front[2].x + 38, y: front[2].y - 8 }, front[2]];
    polygon(context, depth);
    context.fillStyle = '#082d58';
    context.fill();

    polygon(context, front);
    const doorColors = {
      grey: ['#a0aab2', '#d6dde1', '#8b969e'],
      white: ['#dcdfdd', '#ffffff', '#c4c9c7'],
      anthracite: ['#161d22', '#4c565c', '#171e23'],
      custom: ['#672936', '#b75c6a', '#57232e'],
    };
    const colors = doorColors[state.doorFinish] || doorColors.grey;
    const doorGradient = context.createLinearGradient(front[0].x, 0, front[1].x, 0);
    doorGradient.addColorStop(0, colors[0]);
    doorGradient.addColorStop(.55, colors[1]);
    doorGradient.addColorStop(1, colors[2]);
    context.fillStyle = doorGradient;
    context.fill();
    context.lineWidth = 22;
    context.strokeStyle = '#f4f5f3';
    context.stroke();
    context.lineWidth = 2;
    context.strokeStyle = 'rgba(9,40,73,.45)';
    context.stroke();

    state.panes.forEach((pane) => drawGlassPane(context, pane));
    drawHinges3d(context);
    drawHardware3d(context);

    context.save();
    context.fillStyle = 'rgba(5,42,81,.88)';
    context.font = '800 20px system-ui, sans-serif';
    context.letterSpacing = '4px';
    context.fillText('BIJVOETS', 52, 948);
    context.fillStyle = '#e30619';
    context.fillRect(52, 960, 122, 5);
    context.restore();

    if (state.hingeSecurity === 'claw') {
      context.fillStyle = '#063b7a';
      context.fillRect(670, 925, 180, 44);
      context.fillStyle = '#ffffff';
      context.font = '800 13px system-ui, sans-serif';
      context.fillText('DIEVENKLAUW', 687, 945);
      context.fillStyle = '#ff3948';
      context.font = '700 11px system-ui, sans-serif';
      context.fillText('AANBEVOLEN', 701, 960);
    }
  }

  function updateDimensions() {
    const pane = selectedPane();
    dimensions.disabled = !pane;
    dimensions.querySelectorAll('[data-dimension]').forEach((input) => {
      input.value = pane ? String(pane[input.dataset.dimension]) : '';
    });
  }

  function calculatePrice() {
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
    return Math.round(1495 + doorPrices[state.doorFinish] + hardwarePrices[state.hardwareType] + finishPrices[state.hardwareFinish]
      + hingeStylePrices[state.hingeStyle] + hingeFinishPrices[state.hingeFinish] + securityPrice + hingeCountPrice + glassTotal);
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
      `Glas: ${labels.glassTint[state.glassTint]}`,
      `Glaslat: ${labels.beadStyle[state.beadStyle]}`,
      paneSizes,
      `Beslag: ${labels.hardwareType[state.hardwareType]} in ${labels.hardwareFinish[state.hardwareFinish]}`,
      `Scharnieren: ${state.hingeCount}× ${labels.hingeStyle[state.hingeStyle]} in ${labels.hingeFinish[state.hingeFinish]}`,
      `Beveiliging: ${labels.hingeSecurity[state.hingeSecurity]}`,
      `Draairichting en zijde: ${labels.swingDirection[state.swingDirection]}, scharnieren ${labels.hingeSide[state.hingeSide].toLowerCase()}`,
      `Fictieve prijsindicatie: ${price.format(calculatePrice())}`,
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
    summaryDoor.textContent = labels.doorFinish[state.doorFinish];
    summaryGlass.textContent = paneDescription;
    summaryHardware.textContent = `${labels.hardwareType[state.hardwareType]} · ${labels.hardwareFinish[state.hardwareFinish]}`;
    summaryHinges.textContent = `${labels.hingeStyle[state.hingeStyle]} · ${labels.hingeFinish[state.hingeFinish]} · ${state.hingeSecurity === 'claw' ? 'dievenklauw' : 'zonder klauw'}`;
    priceElement.textContent = price.format(calculatePrice());
    hingeAdvice.textContent = state.swingDirection === 'outward'
      ? 'Advies: bij een naar buiten draaiende deur zijn geïntegreerde dievenklauwen belangrijk, omdat de scharnierzijde buiten bereikbaar is.'
      : 'Advies: dievenklauwen bieden extra zekerheid. Bij een naar binnen draaiende deur zitten de scharnieren normaal gesproken al aan de binnenzijde.';
    hingeAdvice.classList.toggle('is-warning', state.swingDirection === 'outward' && state.hingeSecurity === 'standard');
  }

  function render() {
    surface.dataset.finish = state.doorFinish;
    stage.dataset.view = state.view;
    renderPanes();
    renderHardware();
    renderHinges();
    renderRealisticCanvas();
    updateDimensions();
    updateSummary();
    root.querySelectorAll('[data-view]').forEach((button) => {
      const active = button.dataset.view === state.view;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    viewLabel.textContent = state.view === '3d' ? 'Perspectiefweergave' : 'Vooraanzicht';
    stageInstruction.textContent = state.view === '3d'
      ? 'Realistische preview van je actuele keuzes. De gedeelde PNG gebruikt precies deze weergave.'
      : 'Sleep een glasvak om het te verplaatsen. Sleep de hoek om het formaat te wijzigen.';
  }

  function setPreset(name) {
    if (name === 'drievak') {
      state.panes = [createPane(140, 210, 410, 430), createPane(140, 810, 410, 430), createPane(140, 1410, 410, 430)];
      state.hardwareType = 'lever';
    } else if (name === 'glasstrook') {
      state.panes = [createPane(110, 110, 320, 1980)];
      state.hardwareType = 'bar';
    } else {
      state.panes = [];
      state.hardwareType = 'bar';
    }
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
      ? 'Sleep nu op de deur om een nieuw glasvak te tekenen. Loslaten maakt het vak definitief.'
      : 'Selecteer ‘Teken glasvak’ en sleep een rechthoek op de deur. De rode hulplijnen helpen met uitlijnen.';
  }

  function getRenderDataUrl() {
    renderRealisticCanvas();
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
      state[key] = control.type === 'checkbox' ? control.checked : control.value;
      render();
    });
  });

  root.querySelectorAll('[data-preset]').forEach((button) => button.addEventListener('click', () => setPreset(button.dataset.preset)));
  root.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => {
    state.view = button.dataset.view === '3d' ? '3d' : '2d';
    render();
  }));

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
    const gap = Math.max(40, (DOOR_HEIGHT - (margin * 2) - totalHeight) / (ordered.length - 1));
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

