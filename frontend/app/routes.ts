import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("auth/discord", "routes/auth.discord.tsx"),
  route("auth/callback", "routes/auth.callback.tsx"),
  route("dashboard", "routes/dashboard.tsx"),
  route("calendar", "routes/calendar.tsx"),
  route("digging", "routes/digging.tsx"),
  route("events", "routes/events.tsx"),
  route("events/:id/apply", "routes/events.$id.apply.tsx"),
  route("payment", "routes/payment.tsx"),
  route("monthly-book", "routes/monthly-book.tsx"),
  route("books/add", "routes/books.add.tsx"),
  route("books/:id", "routes/books.$id.tsx"),
  route("admin", "routes/admin.tsx"),
  route("admin/events/create", "routes/admin.events.create.tsx"),
  route("admin/monthly-book/create", "routes/admin.monthly-book.create.tsx"),
  route("admin/calendar/create", "routes/admin.calendar.create.tsx"),
] satisfies RouteConfig;
