const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export const getZonedDateParts = (date = new Date(), timeZone = DEFAULT_TIMEZONE) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const getPart = (type) => Number(parts.find(part => part.type === type)?.value);
  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
  };
};

export const getZonedDateKey = (date = new Date(), timeZone = DEFAULT_TIMEZONE) => {
  const { year, month, day } = getZonedDateParts(date, timeZone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const getOffsetMs = (date, timeZone = DEFAULT_TIMEZONE) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const values = {};
  parts.forEach((part) => {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  });

  const asUtc = Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second);
  return asUtc - date.getTime();
};

export const zonedDateTimeToUtc = (dateKey, time = '00:00:00', timeZone = DEFAULT_TIMEZONE) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hour = 0, minute = 0, second = 0] = time.split(':').map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const offset = getOffsetMs(guess, timeZone);
  return new Date(guess.getTime() - offset);
};

export const getLocalDayBounds = (date = new Date(), timeZone = DEFAULT_TIMEZONE) => {
  const dateKey = getZonedDateKey(date, timeZone);
  const start = zonedDateTimeToUtc(dateKey, '00:00:00', timeZone);
  const end = new Date(start.getTime() + DAY_MS);
  return { dateKey, start, end };
};

export const addDaysToDateKey = (dateKey, days) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return utcDate.toISOString().split('T')[0];
};

export const getZonedHour = (date = new Date(), timeZone = DEFAULT_TIMEZONE) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    hour12: false,
  }).formatToParts(date);
  return Number(parts.find(part => part.type === 'hour')?.value || 0);
};

