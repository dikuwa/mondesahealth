export function windhoekGreeting(date = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-NA", {
      timeZone: "Africa/Windhoek",
      hour: "2-digit",
      hour12: false,
    })
      .formatToParts(date)
      .find((part) => part.type === "hour")?.value || 12,
  );
  return hour < 12
    ? "Good morning"
    : hour < 18
      ? "Good afternoon"
      : "Good evening";
}
