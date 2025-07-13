export function formatDate(
  date: Date | string | number | undefined,
  opts: Intl.DateTimeFormatOptions = {},
) {
  if (!date) return "";

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: opts.month ?? "long",
      day: opts.day ?? "numeric",
      year: opts.year ?? "numeric",
      ...opts,
    }).format(new Date(date));
  } catch (_err) {
    return "";
  }
}

export function formatCreatedAt(dateInput: string | Date): string {
  // Ensure the input is a valid Date object
  const date = new Date(dateInput);

  // Validate the date object
  if (isNaN(date.getTime())) {
    throw new Error("Invalid date input");
  }

  const options: Intl.DateTimeFormatOptions = {
    weekday: "long", // E.g. "Tuesday"
    year: "numeric", // E.g. "2025"
    month: "long", // E.g. "May"
    day: "numeric", // E.g. "21"
    hour: "2-digit", // E.g. "04"
    minute: "2-digit", // E.g. "41"
    // second: "2-digit", // E.g. "18"
    hour12: true, // Use 12-hour time format (AM/PM)
  };

  return date.toLocaleString("en-US", options);
}

