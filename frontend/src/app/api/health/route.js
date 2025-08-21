import { NextResponse } from 'next/server';

// You can configure this to point to your backend
const BACKEND_URL = process.env.DJANGO_BASE_URL;

export async function GET(request) {
    return NextResponse.json({"django_base_url": BACKEND_URL, "status": "ok"});
}
