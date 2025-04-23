import { cookies } from 'next/headers';
import Script from 'next/script';
import { auth } from '../(auth)/auth';

export const experimental_ppr = true;

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id?: string };
}) {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  
  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      {children}
    </>
  );
}
