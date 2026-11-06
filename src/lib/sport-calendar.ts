import { endOfMonth, format, parseISO } from "date-fns";

export function sportCalendarRange(rawMonth: string | string[] | undefined, now = new Date()) {
  const today = format(now, "yyyy-MM-dd");
  const currentMonthKey = format(now, "yyyy-MM");
  const requestedMonth = Array.isArray(rawMonth) ? rawMonth[0] : rawMonth;
  const selectedMonthKey = requestedMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth) && requestedMonth >= "0001-01" && requestedMonth <= currentMonthKey
    ? requestedMonth : currentMonthKey;
  return {
    today,
    currentMonthKey,
    selectedMonthKey,
    from: `${selectedMonthKey}-01`,
    to: [format(endOfMonth(parseISO(`${selectedMonthKey}-01`)), "yyyy-MM-dd"), today].sort()[0],
  };
}
