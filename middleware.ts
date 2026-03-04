import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  // 1. Refresh the Supabase session first (keeps auth alive across reloads).
  //    IMPORTANT: no logic between createServerClient and getUser().
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // 2. Determine the active locale from the URL prefix (fall back to default).
  const currentLocale =
    routing.locales.find(
      (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
    ) ?? routing.defaultLocale;

  // 3. Auth guards — must run before intlMiddleware so redirects use the
  //    locale prefix and avoid an extra round-trip.
  const localePrefix = new RegExp(
    `^/(${routing.locales.join("|")})/app`,
  );
  const isProtectedRoute = localePrefix.test(pathname);
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    const redirectTo = pathname + request.nextUrl.search;
    url.pathname = `/${currentLocale}/sign-in`;
    url.searchParams.set("redirectTo", redirectTo);
    return NextResponse.redirect(url);
  }

  const authPrefix = new RegExp(
    `^/(${routing.locales.join("|")})/(sign-in|sign-up)`,
  );
  const isAuthRoute = authPrefix.test(pathname);
  if (isAuthRoute && user) {
    const redirectTo = request.nextUrl.searchParams.get("redirectTo");
    const url = request.nextUrl.clone();
    url.pathname = redirectTo ?? `/${currentLocale}/app`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // 4. Run next-intl middleware (handles locale detection and URL rewriting).
  const intlResponse = intlMiddleware(request);

  // 5. Copy Supabase session cookies onto the intl response so auth state
  //    is propagated correctly.
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value, cookie);
  });

  return intlResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public assets (svg, png, jpg, jpeg, gif, webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
