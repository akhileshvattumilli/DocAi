"use client"

import Link from "next/link"
import Image from "next/image"

export default function BrandLink({className, displayName}){
    const finalClass = className ? className : "flex items-center gap-flowmind-s text-lg font-display font-semibold md:text-base transition-all duration-120 hover:text-accent-2"
    return <Link
        href="/"
        className={finalClass}
    >
        <Image src="/docAI__Logo.png" alt="DocAI Icon" width={40} height={40} className="rounded-flowmind-md" />
        {displayName && <span className="font-display font-semibold text-foreground">DocAI</span>}
    </Link>
}