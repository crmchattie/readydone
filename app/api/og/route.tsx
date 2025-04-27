/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from 'next/og';
// App router includes @vercel/og.
// No need to install it.

export const runtime = 'edge';

export async function GET() {
  try {
    // Get the Savvo logo from the public directory
    const logoUrl = new URL('https://readydone.ai/images/logo.png').href;
    
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            fontSize: 60,
            color: 'black',
            background: 'white',
            width: '100%',
            height: '100%',
            padding: 50,
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          <img
            src={logoUrl}
            alt="Ready Done Logo"
            style={{
              width: '300px',
              marginBottom: '40px',
            }}
          />
          <div
            style={{
              fontSize: '40px',
              fontWeight: 'bold',
            }}
          >
            Find your perfect car with Savvo
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: '30px',
              fontSize: '24px',
              color: '#555',
            }}
          >
            readydone.ai
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (error: any) {
    console.log(`${error.message || 'Error generating image'}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
} 