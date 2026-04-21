import type { Metadata } from "next"
import { Toaster } from "sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

export const metadata: Metadata = {
  title: "Conversant",
  description: "AI-powered conversation platform",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#171a21",
              border: "1px solid #272c38",
              color: "#e7e9ee",
            },
          }}
        />
      </body>
    </html>
  )
}
