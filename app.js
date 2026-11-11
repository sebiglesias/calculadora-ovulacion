// Calculadora de Ovulación, Días Fértiles y Calendario Menstrual
(function() {
  'use strict';

  const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // State
  let state = {
    fum: '', // YYYY-MM-DD
    cycleLength: 28, // days
    lutealPhase: 14 // days
  };

  function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  function formatDateLong(date) {
    return `${date.getDate()} de ${MONTH_NAMES[date.getMonth()]} de ${date.getFullYear()}`;
  }

  function formatDateShort(date) {
    return `${date.getDate()} ${MONTH_NAMES[date.getMonth()].slice(0, 3)}`;
  }

  function formatRange(startDate, endDate) {
    if (startDate.getMonth() === endDate.getMonth()) {
      return `${startDate.getDate()} al ${endDate.getDate()} de ${MONTH_NAMES[startDate.getMonth()]}`;
    }
    return `${startDate.getDate()} de ${MONTH_NAMES[startDate.getMonth()].slice(0, 3)} al ${endDate.getDate()} de ${MONTH_NAMES[endDate.getMonth()].slice(0, 3)}`;
  }

  function toDateObj(isoStr) {
    const [y, m, d] = isoStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function calculateCycles(baseDate, length, luteal, count = 3) {
    const cycles = [];
    let curFum = new Date(baseDate);

    for (let i = 0; i < count; i++) {
      const ovulation = addDays(curFum, length - luteal);
      const fertileStart = addDays(ovulation, -5);
      const fertileEnd = ovulation;
      const nextPeriod = addDays(curFum, length);
      const testDate = addDays(ovulation, 14);
      const fpp = addDays(ovulation, 266); // 38 weeks post conception

      cycles.push({
        cycleIndex: i + 1,
        fum: new Date(curFum),
        ovulation,
        fertileStart,
        fertileEnd,
        nextPeriod,
        testDate,
        fpp
      });

      curFum = nextPeriod;
    }

    return cycles;
  }

  function renderCalendar(cycle) {
    const calGrid = document.getElementById('cal-days-grid');
    const calMonthTitle = document.getElementById('cal-month-title');
    calGrid.innerHTML = '';

    // Month of ovulation
    const targetMonth = cycle.ovulation.getMonth();
    const targetYear = cycle.ovulation.getFullYear();
    calMonthTitle.textContent = `${MONTH_NAMES[targetMonth]} ${targetYear}`;

    const firstDayIndex = new Date(targetYear, targetMonth, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

    // Leading empty cells
    for (let i = 0; i < firstDayIndex; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'cal-day-cell empty';
      calGrid.appendChild(emptyCell);
    }

    const fumTime = cycle.fum.getTime();
    const periodEnd = addDays(cycle.fum, 4).getTime();
    const fertileStartTime = cycle.fertileStart.getTime();
    const ovulationTime = cycle.ovulation.getTime();
    const testDateTime = cycle.testDate.getTime();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(targetYear, targetMonth, day);
      const time = date.getTime();
      const cell = document.createElement('div');
      cell.className = 'cal-day-cell';
      cell.textContent = day;

      if (time === ovulationTime) {
        cell.classList.add('ovulation');
        cell.title = 'Día de Ovulación pico';
      } else if (time >= fertileStartTime && time <= ovulationTime) {
        cell.classList.add('fertile');
        cell.title = 'Ventana Fértil';
      } else if (time >= fumTime && time <= periodEnd) {
        cell.classList.add('period');
        cell.title = 'Menstruación';
      } else if (time === testDateTime) {
        cell.classList.add('test-day');
        cell.title = 'Test de Embarazo sugerido';
      }

      calGrid.appendChild(cell);
    }
  }

  function renderNextCycles(cycles) {
    const container = document.getElementById('next-cycles-container');
    container.innerHTML = '';

    cycles.forEach((c, idx) => {
      const card = document.createElement('div');
      card.className = 'cycle-card';
      card.innerHTML = `
        <h4>Ciclo ${idx === 0 ? 'Actual' : idx + 1}</h4>
        <p>🌸 <strong>Fértil:</strong> ${formatRange(c.fertileStart, c.fertileEnd)}</p>
        <p>🎯 <strong>Ovulación:</strong> ${formatDateShort(c.ovulation)}</p>
        <p>🩸 <strong>Próximo período:</strong> ${formatDateShort(c.nextPeriod)}</p>
      `;
      container.appendChild(card);
    });
  }

  function recalculate() {
    if (!state.fum) return;
    const fumDate = toDateObj(state.fum);
    const cycles = calculateCycles(fumDate, state.cycleLength, state.lutealPhase, 3);
    const current = cycles[0];

    // Hero box
    document.getElementById('hero-fertile-range').textContent = formatRange(current.fertileStart, current.fertileEnd);
    document.getElementById('hero-peak-day').textContent = `🎯 Ovulación Pico: ${formatDateLong(current.ovulation)}`;
    document.getElementById('res-next-period').textContent = formatDateLong(current.nextPeriod);
    document.getElementById('res-test-date').textContent = formatDateLong(current.testDate);
    document.getElementById('res-fpp').textContent = formatDateLong(current.fpp);

    // Calendar
    renderCalendar(current);

    // Next 3 cycles
    renderNextCycles(cycles);

    // Save
    localStorage.setItem('calc_ovulacion_state', JSON.stringify(state));
  }

  function init() {
    const fumInput = document.getElementById('input-fum');
    const cycleInput = document.getElementById('cycle-length-val');
    const btnMinus = document.getElementById('btn-cycle-minus');
    const btnPlus = document.getElementById('btn-cycle-plus');

    // Default FUM to 10 days ago if empty
    const defaultDate = addDays(new Date(), -10);
    state.fum = defaultDate.toISOString().split('T')[0];

    // Restore from storage
    const saved = localStorage.getItem('calc_ovulacion_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed };
      } catch (e) {}
    }

    fumInput.value = state.fum;
    cycleInput.textContent = `${state.cycleLength} días`;

    fumInput.addEventListener('change', (e) => {
      state.fum = e.target.value;
      recalculate();
    });

    btnMinus.addEventListener('click', () => {
      if (state.cycleLength > 21) {
        state.cycleLength--;
        cycleInput.textContent = `${state.cycleLength} días`;
        recalculate();
      }
    });

    btnPlus.addEventListener('click', () => {
      if (state.cycleLength < 40) {
        state.cycleLength++;
        cycleInput.textContent = `${state.cycleLength} días`;
        recalculate();
      }
    });

    // FAQ Accordion
    document.querySelectorAll('.faq-question').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.parentElement;
        item.classList.toggle('open');
      });
    });

    recalculate();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
