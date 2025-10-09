"use client"


import fetcher from "@/lib/fetcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

import useSWR from "swr";

export default function DocListPage() {
  const {data, isLoading, error} = useSWR("/api/documents/", fetcher)
  const isResultsArray = Array.isArray(data)
  const results = data && isResultsArray ? data : []
  console.log(results)
  if (error) {
    if (error.status === 401) {
      window.location.href='/login'
    }
    return <div className="text-center p-flowmind-l">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error.message} {error.status}</p>
        </CardContent>
      </Card>
    </div>
  }
  return <>
  <div className="max-w-6xl mx-auto px-flowmind-l">
    <div className="mb-flowmind-xl">
      <h1 className='font-display text-4xl font-semibold text-foreground mb-4'>Documents</h1>
      <Button asChild>
        <Link href='/docs/create'>Create New Document</Link>
      </Button>
    </div>
    
    {isLoading ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-flowmind-l">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    ) : results.length === 0 ? (
      <Card className="text-center p-flowmind-xxl">
        <CardHeader>
          <CardTitle className="text-muted-foreground">No Documents Yet</CardTitle>
          <CardDescription>
            Create your first document to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href='/docs/create'>Create Document</Link>
          </Button>
        </CardContent>
      </Card>
    ) : (
      <div className="space-y-2">
        {results.map((doc, idx)=>{
            const docLink = `/docs/${doc.id}`
            return (
              <div 
                key={`doc-${doc.id}-${idx}`} 
                className="group flex items-center p-4 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer border border-border/50 hover:border-border bg-card"
                onClick={() => window.location.href = docLink}
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {doc.title || `Untitled Document ${idx + 1}`}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Created {new Date(doc.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
                <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={docLink}>Open</Link>
                  </Button>
                </div>
              </div>
            )
        })}
      </div>
    )}
    </div>
  </>
}
