import { Metadata } from 'next'
import LandingPageClient from '@/components/landing-page-client'
import NavbarHome from '@/components/navbar-home';

export const metadata: Metadata = {
  title: 'ReadyDone | AI-Powered Task Completion',
  description: 'Get things done faster with AI that handles research, outreach, and document creation. Perfect for car buying, loan shopping, insurance quotes, and more.',
  openGraph: {
    title: 'ReadyDone | Your AI Task Assistant',
    description: 'Combine natural conversation, smart search, and automated outreach to get things done. Our AI handles the emails, documents, and organization while you make the decisions.',
    url: 'https://readydone.com',
    siteName: 'ReadyDone',
    images: [{ url: 'https://readydone.com/api/og', width: 1200, height: 630, alt: 'ReadyDone - AI-Powered Task Completion Assistant' }]
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