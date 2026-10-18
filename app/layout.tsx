import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { siteMetadata, siteViewport } from '@/lib/pwa'
import { SwRegister } from '@/components/shared/sw-register'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata = siteMetadata
export const viewport = siteViewport

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} bg-background`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster richColors position="top-right" />
          <SwRegister />
        </ThemeProvider>
      </body>
    </html>
  )
}
