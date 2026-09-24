export const isOwner = (event, user) =>
  event.organizer.toString() === user.id || user.role === "admin";
