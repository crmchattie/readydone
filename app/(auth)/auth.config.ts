import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
    newUser: '/register',
  },
  providers: [
    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
    // while this file is also used in non-Node.js environments
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname === '/';
      const isOnRegister = nextUrl.pathname.startsWith('/register');
      const isOnLogin = nextUrl.pathname.startsWith('/login');
      const isOnLandingPage = nextUrl.pathname === '/home';

      if (isLoggedIn && (isOnLogin || isOnRegister)) {
        return Response.redirect(new URL('/', nextUrl as unknown as URL));
      }

      if (isOnRegister || isOnLogin || isOnLandingPage) {
        return true; // Always allow access to register, login, and home pages
      }

      if (isOnDashboard && isLoggedIn) {
        return true;
      }

      if (!isLoggedIn) {
        return Response.redirect(new URL('/home', nextUrl as unknown as URL));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
