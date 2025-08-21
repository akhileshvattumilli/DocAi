import { NextResponse } from 'next/server';
import {urlJoin} from '@/lib/urlJoin';

const DJANGO_API_URL = process.env.DJANGO_API_URL;

export async function GET(request) {
  const url = urlJoin(DJANGO_API_URL, "/healthz")
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'GET',
    });
    
    if (response.ok) {
      return NextResponse.json({ status: 'healthy' }, { status: 200 });
    } else {
      return NextResponse.json({ status: 'unhealthy' }, { status: 503 });
    }
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy' },
      { status: 503 }
    );
  }
}