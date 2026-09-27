export function formatLocalTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");

  return `${String(date.getFullYear()).padStart(4, "0")}${pad(
    date.getMonth() + 1,
  )}${pad(date.getDate())}T${pad(date.getHours())}${pad(
    date.getMinutes(),
  )}${pad(date.getSeconds())}`;
}

export function prefixWithLocalTimestamp(fileName, date = new Date()) {
  return `${formatLocalTimestamp(date)}-${fileName}`;
}
