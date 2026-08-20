import { query } from '../shared/dom';

const dock = query<HTMLElement>('.booking-dock');

if (dock && !query<HTMLElement>('.booking-dock__meta--capacity', dock)) {
  const capacity = document.createElement('div');
  const label = document.createElement('span');
  const value = document.createElement('strong');
  const countdown = query<HTMLElement>('.countdown', dock);

  capacity.className = 'booking-dock__meta booking-dock__meta--capacity';
  label.className = 'booking-dock__label';
  label.textContent = 'Cupos';
  value.textContent = 'LIMITADOS';
  capacity.append(label, value);

  if (countdown) dock.insertBefore(capacity, countdown);
  else dock.append(capacity);
}
