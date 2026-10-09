const $ = (id) => document.getElementById(id);
const recipeFields = ['doughWeight', 'loaves', 'hydration', 'starter', 'salt', 'wholeGrain', 'starterHydration'];
const state = { rating: 0, installPrompt: null, mode: 'classic' };
const defaults = {
  classic: { doughWeight: 900, loaves: 1, hydration: 75, starter: 20, salt: 2, wholeGrain: 20, starterHydration: 100 },
  nofuss: { doughWeight: 1648, loaves: 2, hydration: 70, starter: 11.1, salt: 2, wholeGrain: 0, starterHydration: 100 }
};

const num = (id, fallback = 0) => Number($(id).value) || fallback;
const grams = (value) => `${Math.round(value).toLocaleString('en-CA')} g`;
const setGrams = (id, value) => { $(id).innerHTML = `${Math.round(value).toLocaleString('en-CA')} <small>g</small>`; };
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function setCookie(name, value, days = 365) {
  document.cookie = `${name}=${encodeURIComponent(JSON.stringify(value))}; max-age=${days * 86400}; path=/; SameSite=Lax`;
}

function getCookie(name, fallback = null) {
  const match = document.cookie.split('; ').find((item) => item.startsWith(`${name}=`));
  if (!match) return fallback;
  try { return JSON.parse(decodeURIComponent(match.slice(name.length + 1))); } catch { return fallback; }
}

function currentRecipeValues() {
  return Object.fromEntries(recipeFields.map((id) => [id, num(id, defaults[state.mode][id])]));
}

function saveRecipeValues() {
  setCookie(`crumb-recipe-${state.mode}`, currentRecipeValues());
}

function loadRecipeValues(mode) {
  const values = { ...defaults[mode], ...getCookie(`crumb-recipe-${mode}`, {}) };
  recipeFields.forEach((id) => { $(id).value = values[id]; });
}

function saveUiValues() {
  setCookie('crumb-ui', {
    startTime: $('startTime').value,
    roomTemp: num('roomTemp', 21),
    bakeName: $('bakeName').value,
    bakeNotes: $('bakeNotes').value,
    rating: state.rating
  });
}

function calculate() {
  const target = clamp(num('doughWeight', defaults[state.mode].doughWeight), 200, 10000);
  const loaves = clamp(num('loaves', defaults[state.mode].loaves), 1, 12);
  const hydration = clamp(num('hydration', defaults[state.mode].hydration), 55, 100) / 100;
  const starterPct = clamp(num('starter', defaults[state.mode].starter), 5, 40) / 100;
  const saltPct = clamp(num('salt', defaults[state.mode].salt), 1, 3) / 100;
  const starterHydration = clamp(num('starterHydration', 100), 50, 200) / 100;
  const wholeGrain = clamp(num('wholeGrain', 20), 0, 100);

  let flour;
  let water;
  let salt;
  let starter;
  let mixFlour;
  let mixWater;

  if (state.mode === 'nofuss') {
    flour = target / (1 + hydration + starterPct + saltPct);
    water = flour * hydration;
    starter = flour * starterPct;
    salt = flour * saltPct;
    mixFlour = flour;
    mixWater = water;
  } else {
    flour = target / (1 + hydration + saltPct);
    water = flour * hydration;
    salt = flour * saltPct;
    starter = flour * starterPct;
    const starterFlour = starter / (1 + starterHydration);
    const starterWater = starter - starterFlour;
    mixFlour = flour - starterFlour;
    mixWater = water - starterWater;
  }

  const hydrationPercent = hydration * 100;
  const starterPercent = starterPct * 100;
  $('hydrationValue').value = `${hydrationPercent.toFixed(hydrationPercent % 1 ? 1 : 0)}%`;
  $('starterValue').value = `${starterPercent.toFixed(starterPercent % 1 ? 1 : 0)}%`;
  $('saltValue').value = `${(saltPct * 100).toFixed(1)}%`;
  $('loafWeight').textContent = grams(target / loaves);
  $('yieldBadge').textContent = `${loaves} × ${grams(target / loaves)}`;
  $('flourBreakdown').textContent = wholeGrain ? `${100 - wholeGrain}% white · ${wholeGrain}% whole grain` : '100% bread flour';
  $('starterBreakdown').textContent = `${Math.round(starterHydration * 100)}% hydration`;
  $('waterBreakdown').textContent = state.mode === 'nofuss' ? 'Room-temperature water' : 'Total water, including starter';
  setGrams('flourAmount', flour);
  setGrams('waterAmount', water);
  setGrams('starterAmount', starter);
  setGrams('saltAmount', salt);
  $('mixFlour').textContent = grams(mixFlour);
  $('mixWater').textContent = grams(mixWater);
  $('mixStarter').textContent = grams(starter);
  $('mixSalt').textContent = grams(salt);
  buildTimeline();
}

function applyMode(mode, persistCurrent = true) {
  if (persistCurrent) saveRecipeValues();
  state.mode = mode;
  setCookie('crumb-mode', mode);
  loadRecipeValues(mode);
  document.querySelectorAll('.recipe-modes button').forEach((button) => button.classList.toggle('active', button.dataset.mode === mode));
  const noFuss = mode === 'nofuss';
  $('formulaName').textContent = noFuss ? 'Max’s overnight no-fuss loaf' : 'Ottawa country loaf';
  $('modeDescription').textContent = noFuss
    ? 'Your PDF method: mix everything before bed, leave it alone overnight, shape, and bake in the morning.'
    : 'A flexible country loaf with strength-building folds and a cold proof.';
  $('mathNote').textContent = noFuss
    ? 'This mode follows the PDF’s additive recipe math. At the original size: 900 g flour, 630 g water, 100 g starter, and 18 g salt.'
    : 'Flour and water shown are totals. The mix instructions below subtract what is already in your starter.';
  $('watchLabel').textContent = noFuss ? 'NO-FUSS CHECKPOINT' : 'THE DOUGH DECIDES';
  calculate();
}

function localDateTimeValue(date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function nextQuarterHour() {
  const date = new Date();
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  return date;
}

function formatTime(date) {
  return new Intl.DateTimeFormat('en-CA', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/Toronto' }).format(date);
}

function timelineItem(date, title, copy, duration) {
  return `<li><time datetime="${date.toISOString()}">${formatTime(date)}</time><span class="dot"></span><div><h3>${title}</h3><p>${copy}</p></div><span class="duration">${duration}</span></li>`;
}

function isDuringSleep(date) {
  const hour = Number(new Intl.DateTimeFormat('en-CA', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/Toronto' }).format(date));
  return hour >= 22 || hour < 7;
}

function updateSleepStatus(events, passiveTitles = []) {
  const conflicts = events.filter(([date, title]) => isDuringSleep(date) && !passiveTitles.includes(title));
  $('sleepStrip').classList.toggle('warning', conflicts.length > 0);
  $('sleepStatus').textContent = conflicts.length
    ? `${conflicts.map(([, title]) => title).join(', ')} currently lands between 10 PM and 7 AM.`
    : 'Active steps stay outside your sleep window.';
}

function classicBulkHours() {
  const temp = clamp(num('roomTemp', 21), 15, 32);
  const starter = clamp(num('starter', 20), 5, 40);
  return clamp(4.5 * Math.pow(1.10, 24 - temp) * Math.pow(20 / starter, 0.45), 2.5, 12);
}

function noFussOvernightHours() {
  const temp = clamp(num('roomTemp', 21), 15, 32);
  const starter = clamp(num('starter', 11.1), 5, 40);
  return clamp(10 * Math.pow(1.10, 20 - temp) * Math.pow(11.1 / starter, 0.45), 6, 15);
}

function nextLocalTime(hour, minute = 0) {
  const target = new Date();
  target.setHours(hour, minute, 0, 0);
  if (target <= new Date()) target.setDate(target.getDate() + 1);
  return target;
}

function fitScheduleToSleep(showMessage = true) {
  let start;
  if (state.mode === 'nofuss') {
    const wake = nextLocalTime(7);
    start = new Date(wake.getTime() - noFussOvernightHours() * 3600000);
    if (isDuringSleep(start)) {
      start = new Date(wake);
      start.setDate(start.getDate() - 1);
      start.setHours(21, 30, 0, 0);
      const desiredHours = (wake - start) / 3600000;
      const temp = clamp(num('roomTemp', 21), 15, 32);
      const recommendedStarter = 11.1 * Math.pow((10 * Math.pow(1.10, 20 - temp)) / desiredHours, 1 / .45);
      $('starter').value = clamp(recommendedStarter, 5, 40).toFixed(1);
      saveRecipeValues();
    }
  } else {
    const coldProof = nextLocalTime(21, 30);
    start = new Date(coldProof.getTime() - (classicBulkHours() + .5) * 3600000);
  }
  $('startTime').value = localDateTimeValue(start);
  saveUiValues();
  calculate();
  if (showMessage) toast(state.mode === 'nofuss' ? 'Timed to check the dough at 7 AM' : 'Timed to refrigerate before 10 PM');
}

function buildTimeline() {
  if (!$('startTime').value) return;
  const start = new Date($('startTime').value);
  const temp = clamp(num('roomTemp', 21), 15, 32);
  const starter = clamp(num('starter', 20), 5, 40);

  if (state.mode === 'nofuss') {
    const overnightHours = noFussOvernightHours();
    const morning = new Date(start.getTime() + overnightHours * 3600000);
    const bake = new Date(morning.getTime() + 60 * 60000);
    const uncover = new Date(bake.getTime() + 20 * 60000);
    const cool = new Date(uncover.getTime() + 25 * 60000);
    const events = [
      [start, 'Mix everything', 'Combine flour, room-temperature water, active starter, and salt until no dry flour remains. Cover tightly.', 'A few minutes'],
      [morning, 'Check & shape', 'Look for roughly doubled, bubbly dough. Fold edges inward, flip, and drag gently to build tension.', `~${overnightHours.toFixed(1)} h`],
      [morning, 'Rest & preheat', 'Place seam-side up in a floured banneton. Preheat the covered Dutch oven to 260°C.', 'About 1 h'],
      [bake, 'Bake covered', 'Tip onto parchment, score once, lower into the Dutch oven, and cover.', '260°C · 20 min'],
      [uncover, 'Finish uncovered', 'Remove the lid, reduce the oven, and bake until deeply browned.', '230°C · 25 min'],
      [cool, 'Cool completely', 'Aim for 96–98°C internally, then cool on a rack before slicing.', 'At least 1 h']
    ];
    $('timeline').innerHTML = events.map((event) => timelineItem(...event)).join('');
    updateSleepStatus(events);
    const condition = temp < 18 ? 'Your kitchen is colder than the PDF’s 20°C target, so fermentation may exceed its 8–12 hour window.'
      : temp > 23 ? 'Your kitchen is warmer than the PDF’s target; check early to avoid a bubbly, slack, over-proofed dough.'
      : 'The PDF calls for roughly doubled dough with bubbles on the surface after 8–12 hours.';
    $('fermentationAdvice').textContent = `${condition} If it is very bubbly and slack in the morning, shape and bake without an extra rest.`;
    return;
  }

  const bulkHours = classicBulkHours();
  const foldGap = Math.min(.75, bulkHours / 6);
  const shapeAt = new Date(start.getTime() + bulkHours * 3600000);
  const fridgeAt = new Date(shapeAt.getTime() + .5 * 3600000);
  const bakeAt = new Date(fridgeAt.getTime() + 14 * 3600000);
  const events = [
    [start, 'Mix & rest', 'Combine flour and water; hold back the salt and starter.', '30 min'],
    [new Date(start.getTime() + .5 * 3600000), 'Add starter & salt', 'Mix until cohesive. The dough should feel elastic, not smooth.', '10 min'],
    [new Date(start.getTime() + (0.5 + foldGap) * 3600000), 'First fold', 'Stretch-and-fold or coil-fold with wet hands.', '2 min'],
    [new Date(start.getTime() + (0.5 + foldGap * 2) * 3600000), 'Second fold', 'Build strength gently; stop if the dough resists.', '2 min'],
    [shapeAt, 'Shape', 'End bulk by the dough signs, then pre-shape and shape.', `~${bulkHours.toFixed(1)} h bulk`],
    [fridgeAt, 'Cold proof', 'Cover and refrigerate. A cold Ottawa garage is not a calibrated fridge.', '12–16 h'],
    [bakeAt, 'Bake', 'Bake straight from the fridge in a thoroughly heated oven.', 'Suggested']
  ];
  $('timeline').innerHTML = events.map((event) => timelineItem(...event)).join('');
  updateSleepStatus(events, ['Cold proof']);
  const pace = temp <= 19 ? 'a slow, steady bulk' : temp >= 25 ? 'a quick-moving bulk' : 'an unhurried bulk';
  const rise = temp >= 25 ? '30–40%' : temp <= 19 ? '60–75%' : '50–60%';
  $('fermentationAdvice').textContent = `At ${temp}°C, expect ${pace}. Look for a ${rise} rise, a domed edge, and a gentle wobble before shaping.`;
}

function currentSeason() {
  const month = new Date().getMonth();
  if (month <= 1 || month === 11) return ['WINTER', 19, 'Ottawa kitchens often run cool', 'winter'];
  if (month <= 4) return ['SPRING', 21, 'A steady indoor starting point', 'spring'];
  if (month <= 7) return ['SUMMER', 25, 'Fermentation moves quickly', 'summer'];
  return ['FALL', 21, 'Typical indoor starting point', 'fall'];
}

function setSeasonDisplay() {
  const season = currentSeason();
  $('seasonName').textContent = season[0];
  $('seasonTemp').textContent = `${season[1]}°C`;
  $('seasonNote').textContent = season[2];
  document.querySelectorAll('.preset-group button').forEach((button) => button.classList.toggle('active', button.dataset.season === season[3]));
}

function weatherAdvice(humidity) {
  if (humidity < 40) return 'Dry outdoor air can make dough skin over quickly indoors. Keep the bowl and banneton tightly covered.';
  if (humidity > 75) return 'Humid outdoor air usually means slower surface drying. Use dough cues—not the clock—before shaping.';
  return 'Moderate outdoor humidity today. Keep the dough covered; measured kitchen temperature still drives the timing estimate.';
}

function renderWeather(observation, cached = false) {
  $('weatherTemp').textContent = `${Math.round(observation.temp)}°C`;
  $('weatherHumidity').textContent = `${Math.round(observation.humidity)}% RH`;
  const observed = new Intl.DateTimeFormat('en-CA', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Toronto' }).format(new Date(observation.date));
  const dewPoint = Number.isFinite(observation.dewPoint) ? `dew point ${Math.round(observation.dewPoint)}°C · ` : '';
  $('weatherDetails').textContent = `${observation.station} · ${dewPoint}${observed}${cached ? ' · saved' : ''}`;
  $('weatherAdvice').textContent = weatherAdvice(observation.humidity);
}

async function loadWeather() {
  const button = $('refreshWeather');
  button.classList.add('loading');
  button.disabled = true;
  try {
    const now = new Date();
    const since = new Date(now.getTime() - 48 * 3600000);
    const params = new URLSearchParams({
      f: 'json', bbox: '-75.90,45.20,-75.45,45.55', datetime: `${since.toISOString()}/${now.toISOString()}`, limit: '100', sortby: '-UTC_DATE'
    });
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    const response = await fetch(`https://api.weather.gc.ca/collections/climate-hourly/items?${params}`, { cache: 'no-store', signal: controller.signal });
    window.clearTimeout(timeout);
    if (!response.ok) throw new Error(`Weather response ${response.status}`);
    const data = await response.json();
    const observations = (data.features || []).map((feature) => feature.properties).filter((item) =>
      Number.isFinite(Number(item.TEMP)) && Number.isFinite(Number(item.RELATIVE_HUMIDITY)) && item.UTC_DATE
    ).sort((a, b) => new Date(b.UTC_DATE) - new Date(a.UTC_DATE));
    const reading = observations.find((item) => /OTTAWA/i.test(item.STATION_NAME || '')) || observations[0];
    if (!reading) throw new Error('No recent Ottawa observations');
    const observation = {
      temp: Number(reading.TEMP), humidity: Number(reading.RELATIVE_HUMIDITY),
      dewPoint: reading.DEW_POINT_TEMP == null ? null : Number(reading.DEW_POINT_TEMP),
      date: reading.UTC_DATE, station: String(reading.STATION_NAME || 'Ottawa').replace(/ INTL A$/i, ' Airport')
    };
    setCookie('crumb-weather', observation, 2);
    renderWeather(observation);
  } catch (error) {
    const cached = getCookie('crumb-weather');
    if (cached) renderWeather(cached, true);
    else {
      $('weatherDetails').textContent = navigator.onLine ? 'Environment Canada is temporarily unavailable.' : 'Offline — connect to refresh Ottawa weather.';
      $('weatherAdvice').textContent = 'Use your measured kitchen temperature for the fermentation estimate.';
    }
  } finally {
    button.classList.remove('loading');
    button.disabled = false;
  }
}

const storage = {
  get() { try { return JSON.parse(localStorage.getItem('crumb-bakes') || '[]'); } catch { return []; } },
  set(bakes) { localStorage.setItem('crumb-bakes', JSON.stringify(bakes)); }
};

function renderBakes() {
  const bakes = storage.get();
  $('bakeNumber').textContent = String(bakes.length + 1).padStart(2, '0');
  $('clearBakes').classList.toggle('hidden', !bakes.length);
  if (!bakes.length) {
    $('bakeList').innerHTML = '<div class="empty-state"><strong>Your next loaf starts here.</strong>Save a bake and its notes will appear in this journal.</div>';
    return;
  }
  $('bakeList').innerHTML = bakes.slice(0, 6).map((bake) => {
    const date = new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Toronto' }).format(new Date(bake.date));
    return `<article class="bake-entry"><time>${date}</time><div><h3>${escapeHTML(bake.name)}</h3><p>${escapeHTML(bake.notes || 'No notes for this bake.')}</p></div><div class="meta">${bake.rating ? `${bake.rating}/5 · ` : ''}${bake.weight} g · ${bake.hydration}% · ${bake.mode === 'nofuss' ? 'no-fuss' : 'classic'}</div></article>`;
  }).join('');
}

function escapeHTML(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  window.setTimeout(() => $('toast').classList.remove('show'), 2200);
}

recipeFields.forEach((id) => $(id).addEventListener('input', () => { calculate(); saveRecipeValues(); }));
['roomTemp', 'startTime', 'bakeName', 'bakeNotes'].forEach((id) => $(id).addEventListener('input', () => {
  if (id === 'roomTemp' || id === 'startTime') buildTimeline();
  saveUiValues();
}));
document.querySelectorAll('.recipe-modes button').forEach((button) => button.addEventListener('click', () => applyMode(button.dataset.mode)));
document.querySelectorAll('.preset-group button').forEach((button) => button.addEventListener('click', () => {
  $('roomTemp').value = button.dataset.temp;
  document.querySelectorAll('.preset-group button').forEach((item) => item.classList.toggle('active', item === button));
  buildTimeline(); saveUiValues();
}));
document.querySelectorAll('#ratingButtons button').forEach((button) => button.addEventListener('click', () => {
  state.rating = Number(button.dataset.rating);
  document.querySelectorAll('#ratingButtons button').forEach((item) => item.classList.toggle('active', Number(item.dataset.rating) <= state.rating));
  saveUiValues();
}));

$('journalForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const bakes = storage.get();
  bakes.unshift({
    id: Date.now(), date: new Date().toISOString(), name: $('bakeName').value.trim() || 'Untitled loaf', notes: $('bakeNotes').value.trim(), rating: state.rating,
    weight: num('doughWeight', 900), hydration: num('hydration', 75), starter: num('starter', 20), salt: num('salt', 2), mode: state.mode
  });
  storage.set(bakes.slice(0, 50));
  $('bakeNotes').value = '';
  state.rating = 0;
  document.querySelectorAll('#ratingButtons button').forEach((item) => item.classList.remove('active'));
  saveUiValues(); renderBakes(); toast('Bake saved on this device');
});

$('clearBakes').addEventListener('click', () => {
  if (window.confirm('Clear every saved bake from this device?')) { storage.set([]); renderBakes(); toast('Bake journal cleared'); }
});
$('refreshWeather').addEventListener('click', loadWeather);
$('fitSleep').addEventListener('click', () => fitScheduleToSleep());

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault(); state.installPrompt = event; $('installButton').classList.remove('hidden');
});
$('installButton').addEventListener('click', async () => {
  if (!state.installPrompt) return;
  state.installPrompt.prompt(); await state.installPrompt.userChoice; state.installPrompt = null; $('installButton').classList.add('hidden');
});

function updateNetwork() {
  $('networkStatus').innerHTML = navigator.onLine ? '<i></i> Private &amp; local' : '<i></i> Offline &amp; ready';
}
window.addEventListener('online', () => { updateNetwork(); loadWeather(); });
window.addEventListener('offline', updateNetwork);

const savedUi = getCookie('crumb-ui', {});
$('startTime').value = savedUi.startTime || '';
$('roomTemp').value = savedUi.roomTemp || currentSeason()[1];
$('bakeName').value = savedUi.bakeName || 'Saturday country loaf';
$('bakeNotes').value = savedUi.bakeNotes || '';
state.rating = Number(savedUi.rating) || 0;
document.querySelectorAll('#ratingButtons button').forEach((item) => item.classList.toggle('active', Number(item.dataset.rating) <= state.rating));
$('currentYear').textContent = new Date().getFullYear();
setSeasonDisplay();
const initialMode = getCookie('crumb-mode', 'classic');
applyMode(initialMode === 'nofuss' ? 'nofuss' : 'classic', false);
if (!savedUi.startTime) fitScheduleToSleep(false);
renderBakes(); updateNetwork();
const cachedWeather = getCookie('crumb-weather');
if (cachedWeather) renderWeather(cachedWeather, true);
loadWeather();

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
