import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const role = token.role as string;

    if (path.startsWith("/admin") && role !== "ADMINISTRATOR") {
      return NextResponse.redirect(new URL(getRoleDashboard(role), req.url));
    }

    if (path.startsWith("/staff") && role !== "STAFF" && role !== "ADMINISTRATOR") {
      return NextResponse.redirect(new URL(getRoleDashboard(role), req.url));
    }

    if (path.startsWith("/student") && role !== "STUDENT") {
      return NextResponse.redirect(new URL(getRoleDashboard(role), req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        if (path.startsWith("/admin") || path.startsWith("/staff") || path.startsWith("/student")) {
          return !!token;
        }
        return true;
      },
    },
  }
);

function getRoleDashboard(role: string): string {
  switch (role) {
    case "ADMINISTRATOR":
      return "/admin";
    case "STAFF":
      return "/staff";
    case "STUDENT":
      return "/student";
    default:
      return "/login";
  }
}

export const config = {
  matcher: ["/admin/:path*", "/staff/:path*", "/student/:path*"],
};
