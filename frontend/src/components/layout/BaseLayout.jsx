"use client"

import Navbar from './Navbar'


export default function BaseLayout({ children, className}) {
    const mainClassName = className ? className : "flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-flowmind-m bg-background p-flowmind-l md:gap-flowmind-xl md:p-flowmind-xxl"
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
        <Navbar />
      <main className={mainClassName}>
      {children}
      </main>
    </div>
  )
}