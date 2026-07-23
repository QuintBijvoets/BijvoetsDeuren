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
  const guideX = root.querySelector('[data-guide-x]');
  const guideY = root.querySelector('[data-guide-y]');
  const help = root.querySelector('[data-designer-help]');
  const dimensions = root.querySelector('[data-dimensions]');
  const priceElement = root.querySelector('[data-total-price]');
  const whatsappLink = root.querySelector('[data-designer-whatsapp]');
  const summaryDoor = root.querySelector('[data-summary-door]');
  const summaryGlass = root.querySelector('[data-summary-glass]');
  const summaryHardware = root.querySelector('[data-summary-hardware]');
  const viewLabel = root.querySelector('[data-view-label]');

  const labels = {
    doorFinish: { grey: 'Grijze grondverf', white: 'Witte grondverf', anthracite: 'Antraciet afgelakt', custom: 'Kleur naar keuze' },
    glassTint: { clear: 'Helder glas', frosted: 'Mat glas', smoke: 'Rookglas', bronze: 'Brons glas' },
    beadStyle: { modern: 'Moderne vlakke glaslat', classic: 'Klassieke glaslat', steel: 'Slanke aluminium glaslat' },
    hardwareType: { bar: 'Stang', knob: 'Knop', lever: 'Kruk' },
    hardwareFinish: { steel: 'RVS', aluminium: 'Aluminium', black: 'Zwart', brass: 'Messing' },
  };

  const state = {
    doorFinish: 'grey',
    glassTint: 'clear',
    beadStyle: 'modern',
    hardwareType: 'bar',
    hardwareFinish: 'steel',
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

  function renderHardware() {
    hardware.className = `door-hardware hardware-${state.hardwareType} finish-${state.hardwareFinish}`;
    const paneRight = state.panes.length ? Math.max(...state.panes.map((pane) => pane.x + pane.width)) : 520;
    const availableStart = clamp(paneRight + 40, 480, 760);
    const hardwareCenter = clamp((availableStart + (DOOR_WIDTH - 90)) / 2, 660, 860);
    hardware.style.left = `${(hardwareCenter / DOOR_WIDTH) * 100}%`;
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
    const glassTotal = state.panes.reduce((total, pane) => {
      const area = (pane.width * pane.height) / 1000000;
      return total + 175 + (area * 240) + beadPrices[state.beadStyle];
    }, 0);
    return Math.round(1495 + doorPrices[state.doorFinish] + hardwarePrices[state.hardwareType] + finishPrices[state.hardwareFinish] + glassTotal);
  }

  function updateSummary() {
    const paneDescription = state.panes.length === 0
      ? 'Geen glasvakken'
      : `${state.panes.length} ${state.panes.length === 1 ? 'glasvak' : 'glasvakken'} · ${labels.glassTint[state.glassTint]}`;
    summaryDoor.textContent = labels.doorFinish[state.doorFinish];
    summaryGlass.textContent = paneDescription;
    summaryHardware.textContent = `${labels.hardwareType[state.hardwareType]} · ${labels.hardwareFinish[state.hardwareFinish]}`;
    priceElement.textContent = price.format(calculatePrice());

    const paneSizes = state.panes.length
      ? state.panes.map((pane, index) => `Glasvak ${index + 1}: ${pane.width} × ${pane.height} mm`).join('\n')
      : 'Geen glasvakken';
    const message = [
      'Hallo Bijvoets Deuren, ik wil graag dit deurontwerp bespreken.',
      '',
      `Deur: ${labels.doorFinish[state.doorFinish]}`,
      `Glas: ${labels.glassTint[state.glassTint]}`,
      `Glaslat: ${labels.beadStyle[state.beadStyle]}`,
      paneSizes,
      `Beslag: ${labels.hardwareType[state.hardwareType]} in ${labels.hardwareFinish[state.hardwareFinish]}`,
      `Fictieve prijsindicatie: ${price.format(calculatePrice())}`,
      '',
      'Ik begrijp dat maatvoering en definitieve prijs nog gecontroleerd worden.',
    ].join('\n');
    const url = new URL('https://wa.me/31638569988');
    url.searchParams.set('text', message);
    whatsappLink.href = url.toString();
  }

  function render() {
    surface.dataset.finish = state.doorFinish;
    stage.dataset.view = state.view;
    renderPanes();
    renderHardware();
    updateDimensions();
    updateSummary();
    root.querySelectorAll('[data-view]').forEach((button) => {
      const active = button.dataset.view === state.view;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    viewLabel.textContent = state.view === '3d' ? 'Perspectiefweergave' : 'Vooraanzicht';
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
