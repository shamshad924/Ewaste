import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (pathname.startsWith("/admin") || pathname.startsWith("/vendor") || pathname.startsWith("/report") || pathname.startsWith("/item")) {
    const cookie = req.cookies.get("session")?.value
    if (!cookie) {
      let loginPath = "/login"
      if (pathname.startsWith("/vendor")) loginPath = "/login/vendor"
      else if (pathname.startsWith("/admin") || pathname.startsWith("/item")) loginPath = "/login/admin"
      else if (pathname.startsWith("/report")) loginPath = "/login/student"
      const url = req.nextUrl.clone()
      url.pathname = loginPath
      url.searchParams.set("from", pathname)
      return NextResponse.redirect(url)
    }
    try {
      // Accept legacy JSON cookie or minimal {role} shape
      const session = JSON.parse(cookie) as { user?: { role?: string } }
      
      // Ensure session and user exist
      if (!session?.user?.role) {
        const url = req.nextUrl.clone()
        url.pathname = "/login"
        return NextResponse.redirect(url)
      }

      const userRole = session.user.role
      
      // Admin routes - only admins
      if (pathname.startsWith("/admin") && userRole === "admin") {
        return NextResponse.next()
      }
      
      // Vendor routes - vendors and admins
      if (pathname.startsWith("/vendor") && (userRole === "vendor" || userRole === "admin")) {
        return NextResponse.next()
      }
      
      // Report routes - students, coordinators, and admins
      if (pathname.startsWith("/report") && ["admin", "student", "coordinator"].includes(userRole)) {
        return NextResponse.next()
      }
      
      // Item routes - only admins
      if (pathname.startsWith("/item") && userRole === "admin") {
        return NextResponse.next()
      }

      // Not authorized - redirect to appropriate login
      const url = req.nextUrl.clone()
      if (pathname.startsWith("/vendor")) {
        url.pathname = "/login/vendor"
      } else if (pathname.startsWith("/admin") || pathname.startsWith("/item")) {
        url.pathname = "/login/admin"
      } else if (pathname.startsWith("/report")) {
        url.pathname = "/login/student"
      } else {
        url.pathname = "/login"
      }
      url.searchParams.set("error", "unauthorized")
      return NextResponse.redirect(url)
    } catch (error) {
      console.error("Middleware session parsing error:", error)
      const url = req.nextUrl.clone()
      url.pathname = "/login"
      url.searchParams.set("error", "session_invalid")
      return NextResponse.redirect(url)
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/vendor/:path*", "/report", "/item/:path*"],
}