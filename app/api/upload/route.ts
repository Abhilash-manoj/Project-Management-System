// app/api/upload/route.ts
import { processSecureUpload } from '@/lib/storage';
import { type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HandleUploadBody;
    
    // Call the function directly from your lib folder
    const jsonResponse = await processSecureUpload(body, request);
    
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}