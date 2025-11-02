import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

const GIST_FILENAME = 'check-link-note.md';
const GIST_DESCRIPTION = 'Check Link - Note Storage';

// Find user's gist by searching for the filename
async function findUserGist(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch('https://api.github.com/gists', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const gists = await response.json();
    
    // Find gist that contains our filename
    for (const gist of gists) {
      if (gist.files && gist.files[GIST_FILENAME]) {
        return gist.id;
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding gist:', error);
    throw error;
  }
}

// GET - Read user's gist
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in with GitHub.' },
        { status: 401 }
      );
    }

    const gistId = await findUserGist(session.accessToken);

    if (!gistId) {
      return NextResponse.json({ gistId: null, content: null });
    }

    // Fetch the gist content
    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const gist = await response.json();
    const content = gist.files[GIST_FILENAME]?.content || '';

    return NextResponse.json({ gistId, content });
  } catch (error) {
    console.error('Error reading gist:', error);
    return NextResponse.json(
      { error: 'Failed to read gist' },
      { status: 500 }
    );
  }
}

// POST - Create new gist
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in with GitHub.' },
        { status: 401 }
      );
    }

    const { content } = await request.json();

    if (content === undefined) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Check if gist already exists
    const existingGistId = await findUserGist(session.accessToken);
    if (existingGistId) {
      // Update existing gist instead
      return await updateGist(existingGistId, session.accessToken, content);
    }

    // Create new gist
    const response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: GIST_DESCRIPTION,
        public: false,
        files: {
          [GIST_FILENAME]: {
            content: content || '',
          },
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`GitHub API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const gist = await response.json();
    return NextResponse.json({ gistId: gist.id, content });
  } catch (error) {
    console.error('Error creating gist:', error);
    return NextResponse.json(
      { error: 'Failed to create gist' },
      { status: 500 }
    );
  }
}

// PATCH - Update existing gist
async function updateGist(gistId: string, accessToken: string, content: string) {
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      files: {
        [GIST_FILENAME]: {
          content: content || '',
        },
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`GitHub API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  const gist = await response.json();
  return NextResponse.json({ gistId: gist.id, content });
}

// PATCH endpoint
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in with GitHub.' },
        { status: 401 }
      );
    }

    const { content } = await request.json();

    if (content === undefined) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const gistId = await findUserGist(session.accessToken);

    if (!gistId) {
      // Create new gist if doesn't exist
      return await POST(request);
    }

    return await updateGist(gistId, session.accessToken, content);
  } catch (error) {
    console.error('Error updating gist:', error);
    return NextResponse.json(
      { error: 'Failed to update gist' },
      { status: 500 }
    );
  }
}
