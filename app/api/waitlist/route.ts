import { NextRequest, NextResponse } from 'next/server';
import { db, waitlist } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, apiType } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!apiType || typeof apiType !== 'string' || !apiType.trim()) {
      return NextResponse.json(
        { error: 'API type is required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.email, email))
      .limit(1);

    // Add to database
    const id = crypto.randomUUID();
    if (existing.length === 0) {
      await db.insert(waitlist).values({
        id,
        email,
        apiType: apiType.trim(),
      });
    } else {
      // Update existing entry with new API type
      await db
        .update(waitlist)
        .set({ apiType: apiType.trim() })
        .where(eq(waitlist.email, email));
    }

    // Send email notification
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        
        // Use onboarding@resend.dev as default (works without domain verification)
        // If RESEND_FROM_EMAIL is set and doesn't contain @gmail.com, use it
        let fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        
        // Don't use Gmail addresses as 'from' - they need domain verification
        if (fromEmail.includes('@gmail.com')) {
          fromEmail = 'onboarding@resend.dev';
        }
        
        const from = fromEmail.includes('<') ? fromEmail : `Aptos x402 <${fromEmail}>`;
        
        const emailResult = await resend.emails.send({
          from: from,
          to: ['sakshamtyagi2008@gmail.com'],
          subject: 'New API Waitlist Submission',
          html: `
            <h2>New API Waitlist Submission</h2>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>API Type:</strong> ${apiType.trim()}</p>
            <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
          `,
        });
        
        // Check if email actually succeeded
        if (emailResult.error) {
          console.error('Email sending failed:', emailResult.error);
          throw new Error(emailResult.error.message || 'Failed to send email');
        }
      } catch (emailError: any) {
        console.error('Failed to send email:', emailError);
        // Don't fail the request if email fails - still return success for database operation
      }
    }

    return NextResponse.json(
      { message: 'Successfully added to waitlist', success: true },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Waitlist error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add to waitlist' },
      { status: 500 }
    );
  }
}

