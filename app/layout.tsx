import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { siteMetadata, siteViewport } from '@/lib/pwa'
import { SwRegister } from '@/components/shared/sw-register'
import { DEFAULT_LOCALE } from '@/lib/i18n/locale'

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' })

export const metadata = siteMetadata
export const viewport = siteViewport

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // The app shell sets `lang` to the user's locale once it is known.
    <html lang={DEFAULT_LOCALE} className={`${jakarta.variable} bg-background`} suppressHydrationWarning>
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
