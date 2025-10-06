"use client"


import { useAuth } from "@/components/authProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import fetcher from "@/lib/fetcher";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import useSWR from "swr";

export default function DocCreatePage() {
  // const {isAuthenticated} = useAuth()
  const apiEndpoint = `/api/documents/`
  const [formError, setFormError] = useState("")
//   if (!isAuthenticated) {
//     window.location.href='/login'
//   }
  async function handleSubmit (event) {
    event.preventDefault()
    setFormError("") // Clear any previous errors
    const formData = new FormData(event.target)
    const objectFromForm = Object.fromEntries(formData)
    const jsonData = JSON.stringify(objectFromForm)
    const requestOptions = {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: jsonData
    }
    const response = await fetch(apiEndpoint, requestOptions)
    let data = {}
    try {
      data = await response.json()
    } catch (error) {
      
    }
    // const data = await response.json()
    if (response.ok) {
        console.log(data)
        window.location.href = `/docs/${data.id}`
        // redirect(`/docs/{data.id}`)
    } else {
      console.log(data)
      setFormError(data.message || "Save failed.")
    }
}


  const title = "Create new Document"
  return <>
    <div className="flex items-center justify-center min-h-[80vh] p-flowmind-l">
      <Card className="w-full max-w-md animate-flowmind-scale-in">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-3xl font-semibold text-foreground">{title}</CardTitle>
          <CardDescription className="body-small">
            Start a new document and bring your ideas to life
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className='space-y-flowmind-m'>
            {formError && (
              <div className="bg-destructive/15 text-destructive text-sm p-flowmind-s rounded-flowmind-md border border-destructive/20">
                {formError}
              </div>
            )}
            <div className="space-y-flowmind-s">
              <Input 
                type='text' 
                placeholder='Enter document title...' 
                name='title' 
                required
                className="w-full"
              />
            </div>
            <Button type='submit' className="w-full">
              Create Document
            </Button>
            <div className="text-center">
              <Link href="/docs" className="text-muted-foreground hover:text-accent-2 transition-colors duration-120 body-small">
                ← Back to Documents
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  </>
}
