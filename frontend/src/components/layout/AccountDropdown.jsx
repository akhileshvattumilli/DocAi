"use client"


import { CircleUser,  } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "../authProvider"
import { useRouter } from "next/navigation"



export default function AccountDropdown({className}) {
    const auth = useAuth()
    const router = useRouter()

    return  <DropdownMenu>
    <DropdownMenuTrigger asChild>
    <Button variant="secondary" size="icon" className="rounded-full">
        <CircleUser className="h-5 w-5" />
        <span className="sr-only">Toggle user menu</span>
    </Button>
    </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
        <DropdownMenuLabel>{auth.username? auth.username : "Account"}</DropdownMenuLabel>
        <DropdownMenuItem onClick={e=> router.push('/logout')}>Logout</DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
}