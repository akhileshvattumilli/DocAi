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
    <div className="flex items-center justify-between mb-flowmind-xl">
      <h1 className='font-display text-4xl font-semibold text-foreground'>Documents</h1>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-flowmind-l">
        {results.map((doc, idx)=>{
            const docLink = `/docs/${doc.id}`
            return (
              <Card key={`doc-${doc.id}-${idx}`} className="hover:shadow-flowmind-card-hover transition-all duration-250">
                <CardHeader>
                  <CardTitle className="text-accent-2">
                    <Link href={docLink} className="hover:underline">
                      Document {doc.id}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    Created {new Date(doc.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" asChild className="w-full">
                    <Link href={docLink}>Open Document</Link>
                  </Button>
                </CardContent>
              </Card>
            )
        })}
      </div>
    )}
    </div>
  </>
}
