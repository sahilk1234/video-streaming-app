import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;
  const protectedPaths = ["/profiles", "/home", "/title", "/watch", "/my-list", "/search", "/admin"];

  if (protectedPaths.some((path) => pathname.startsWith(path))) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.redirect(`${origin}/login`);
    }

    if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
      return NextResponse.redirect(`${origin}/home`);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/profiles/:path*", "/home/:path*", "/title/:path*", "/watch/:path*", "/my-list/:path*", "/search/:path*", "/admin/:path*"]
};
