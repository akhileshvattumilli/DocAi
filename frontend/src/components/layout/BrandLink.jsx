"use client"

import Link from "next/link"
import Image from "next/image"

export default function BrandLink({className}){
    const finalClass = className ? className : "flex items-center gap-2 text-lg font-semibold md:text-base"
    return <Link
        href="/"
        className={finalClass}
    >
        <Image src="/django-nextjs.svg" alt="Django Next.js Icon" width={50} height={50} />
        <span className="sr-only">Django Next.js</span>
    </Link>
}