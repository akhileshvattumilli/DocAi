"use client"

import Link from "next/link"
import { Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { useAuth } from "../authProvider"

import NavLinks, {NonUserLinks} from './NavLinks'
import BrandLink from "./BrandLink"
import { useAPI } from "../apiProvider"



export default function MobileNavbar({className}) {
    const { isHealthy } = useAPI();
    const auth = useAuth()
    return   <Sheet>
    <SheetTrigger asChild>
      <Button
        variant="outline"
        size="icon"
        className="shrink-0 md:hidden"
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle navigation menu</span>
      </Button>
    </SheetTrigger>
    <SheetContent side="left">
      <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
      <nav className="grid gap-6 text-lg font-medium">
        <BrandLink displayName={true} className="flex items-center gap-2 text-lg font-semibold" />

        {NavLinks.map((navLinkItem, idx)=>{
          const shouldHide = !auth.isAuthenticated &&navLinkItem.authRequired
          const shouldHideHealthCheck = navLinkItem.apiHealthRequired && !isHealthy
          if (shouldHide) {
            return null
          }
          if (shouldHideHealthCheck) {
            return null
          }
          return <Link
              href={navLinkItem.href}
              key={`nav-links-b-${idx}`}
              className="text-muted-foreground hover:text-foreground"
          >
              {navLinkItem.label}
          </Link>
      })}

        {auth.isAuthenticated ? 
        <Link href="/logout" className="text-muted-foreground hover:text-foreground">
          Logout
        </Link>
        : <>
          {NonUserLinks.map((navLinkItem, idx)=>{
              const shouldHide = !auth.isAuthenticated &&navLinkItem.authRequired
              const shouldHideHealthCheck = navLinkItem.apiHealthRequired && !isHealthy
              return shouldHide || shouldHideHealthCheck ? null : <Link
                  href={navLinkItem.href}
                  key={`nav-links-c-${idx}`}
                  className="text-muted-foreground hover:text-foreground"
              >
                  {navLinkItem.label}
              </Link>
          })}
        </>}
    
      </nav>
    </SheetContent>
  </Sheet>
}