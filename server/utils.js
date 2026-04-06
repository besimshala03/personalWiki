export function parseFolderId(value) {
  return value === undefined || value === 'null' ? null : parseInt(value, 10);
}
