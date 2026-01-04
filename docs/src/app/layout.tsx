import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Banner, Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://cspr-ai.xyz'),
  title: {
    default: 'CSPR.AI - AI-Powered Casper Network Integration',
    template: '%s | CSPR.AI'
  },
  description: 'First AI-powered MCP integration for Casper Network. Build, deploy, and interact with smart contracts using natural language.',
  keywords: [
    'Casper Network',
    'CSPR',
    'AI',
    'MCP',
    'Model Context Protocol',
    'Smart Contracts',
    'Blockchain',
    'Web3',
    'DeFi'
  ],
  applicationName: 'CSPR.AI',
  generator: 'Next.js',
  openGraph: {
    url: 'https://cspr-ai.xyz',
    siteName: 'CSPR.AI',
    locale: 'en_US',
    type: 'website'
  },
  twitter: {
    site: 'https://cspr-ai.xyz'
  }
}

const banner = (
  <Banner storageKey="cspr-ai-launch">
    CSPR.AI - First AI-powered MCP integration for Casper Network
  </Banner>
)

const navbar = (
  <Navbar
    logo={
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ color: '#FF0420', flexShrink: 0 }}
        >
          <path
            d="M16 2L4 9V23L16 30L28 23V9L16 2Z"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="16" r="4" fill="currentColor" />
          <path
            d="M16 2V9"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M16 23V30"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
        <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}>CSPR<span style={{ color: '#FF0420' }}>.AI</span></span>
      </span>
    }
    projectLink="https://github.com/Blockchain-Oracle/cspr-ai"
  />
)

const footer = (
  <Footer className="flex-col items-center md:items-start">
    <p className="text-sm">
      Built with Nextra. Powered by Casper Network.
    </p>
    <p className="mt-2 text-xs">
      © {new Date().getFullYear()} CSPR.AI. All rights reserved.
    </p>
  </Footer>
)

interface RootLayoutProps {
  children: ReactNode
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const pageMap = await getPageMap()

  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>
      <body>
        <Layout
          banner={banner}
          navbar={navbar}
          footer={footer}
          editLink="Edit this page on GitHub"
          docsRepositoryBase="https://github.com/cspr-ai/casper-mcp/tree/main/docs/src/content"
          sidebar={{ defaultMenuCollapseLevel: 1 }}
          pageMap={pageMap}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
