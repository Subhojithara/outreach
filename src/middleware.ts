import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define public routes
const isPublic = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  // Add any other routes that should be publicly accessible without authentication
]);

export default clerkMiddleware((auth, req) => {
  // Protect routes that are not public
  if (!isPublic(req)) {
    auth.protect();
  }
});

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets and other special routes
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
