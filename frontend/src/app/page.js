"use client"

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";



export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-flowmind-xxl p-flowmind-l">
      <div className="text-center space-y-flowmind-m max-w-4xl">
        <h1 className="font-display text-5xl md:text-6xl font-semibold text-foreground">
          Welcome to DocAI
        </h1>
        <p className="body-large text-muted-foreground max-w-2xl mx-auto">
          Your AI-powered writing companion. Create, collaborate, and bring your ideas to life with intelligent assistance.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-flowmind-m items-center">
        <Button variant='outline' asChild className="w-full sm:w-auto">
          <Link href='/docs/create'>Create new doc</Link>
        </Button>
        <Button asChild className="w-full sm:w-auto">
          <Link href='/docs'>View Docs</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-flowmind-l max-w-4xl w-full">
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-accent-2">AI-Powered</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="body-small">
              Get intelligent suggestions and assistance as you write
            </CardDescription>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-accent-2">Real-time Collaboration</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="body-small">
              Work together seamlessly with live editing and comments
            </CardDescription>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-accent-2">Smart Organization</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="body-small">
              Keep your documents organized and easily accessible
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <footer className="flex gap-flowmind-l flex-wrap items-center justify-center text-muted-foreground">
        <a
          className="flex items-center gap-flowmind-s hover:text-accent-2 transition-colors duration-120"
          href="https://github.com/akhileshvattumilli/DocAi"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to the code →
        </a>
      </footer>
    </div>
  );
}
