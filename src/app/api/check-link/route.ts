import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    const response = await axios.get(url, {
      timeout: 10000,
      validateStatus: (status) => status < 500, // Consider 4xx as working (server responded)
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    return NextResponse.json({
      status: response.status < 400 ? 'working' : 'failed',
      httpStatus: response.status,
      error: response.status >= 400 ? `HTTP ${response.status}` : undefined
    });

  } catch (error: unknown) {
    console.error('Link check error:', error);
    
    let errorMessage = 'Connection failed';
    
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Timeout';
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = 'Domain not found';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Connection refused';
      }
    }
    
    if (error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'status' in error.response) {
      errorMessage = `HTTP ${error.response.status}`;
    }

    return NextResponse.json({
      status: 'failed',
      error: errorMessage
    });
  }
}
