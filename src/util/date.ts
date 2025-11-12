export const ONE_DAY = 86_400_000; // 24 hours in milliseconds

// TODO: This should be an enum
export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export function getDayOfThisWeek(
  day: DayOfWeek,
  weekOffset: number = 0,
): Date | undefined {
  const dayMap: Map<DayOfWeek, number> = new Map([
    ["MONDAY", 1],
    ["TUESDAY", 2],
    ["WEDNESDAY", 3],
    ["THURSDAY", 4],
    ["FRIDAY", 5],
    ["SATURDAY", 6],
    ["SUNDAY", 0],
  ]);

  const dayIndex = dayMap.get(day);
  if (!dayIndex) {
    return undefined; // Invalid day of the week
  }

  // Fast forward to the next occurrence of the specified day
  const today = new Date();
  const dayOfThisWeek = new Date(today);

  const diff = (dayIndex - today.getDay() + 7) % 7;
  dayOfThisWeek.setDate(today.getDate() + diff);
  dayOfThisWeek.setHours(0, 0, 0, 0); // Set to start of the day

  // Offset + or - 1 week if specified
  if (weekOffset !== 0) {
    dayOfThisWeek.setDate(dayOfThisWeek.getDate() + weekOffset * 7);
  }

  return dayOfThisWeek;
}

export function formatDateAsYYYYMMDD(date?: Date): string {
  if (!date) {
    date = new Date();
  }
  // This is the format used by GitHub Search / Project View filters
  return date.toISOString().split("T")[0]!;
}
