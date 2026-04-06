export function todayKey() {
  return new Date().toLocaleDateString('en-CA');
}

export function formatDueDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
  });
}
