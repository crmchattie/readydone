import { Metadata } from 'next'
import LandingPageClient from '@/components/landing-page-client'
import NavbarHome from '@/components/navbar-home';

export const metadata: Metadata = {
  title: 'Plot | AI-Powered Outreach',
  description: 'Let AI handle finding businesses, sending emails, and organizing replies. Perfect for car buying, insurance quotes, event planning, and more.',
  openGraph: {
    title: 'Plot | AI-Powered Outreach',
    description: 'Save time and hassle by letting AI handle your business outreach. From car buying to insurance quotes, we handle the emails while you focus on decisions.',
    url: 'https://plotliving.com',
    siteName: 'Plot',
    images: [{ url: 'https://plotliving.com/api/og', width: 1200, height: 630, alt: 'Plot - AI-Powered Business Outreach Assistant' }]
  }
};

export default function LandingPage() {
  return (
    <>
      {/* <NavbarHome /> */}
      <LandingPageClient />
    </>
  )
}