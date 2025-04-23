import { Resend } from 'resend';

export class ResendClient {
  private client: Resend;
  private userId: string;
  private fromEmail: string;

  constructor(userId: string, apiKey: string, fromEmail: string) {
    this.userId = userId;
    this.fromEmail = fromEmail;
    this.client = new Resend(apiKey);
  }

  async sendMessage(params: {
    to: string;
    subject: string;
    body: string;
    replyTo?: string;
  }): Promise<{ id: string }> {
    try {
      const response = await this.client.emails.send({
        from: this.fromEmail,
        to: params.to,
        subject: params.subject,
        html: params.body,
        replyTo: params.replyTo
      });

      return { id: response.data?.id || '' };
    } catch (error) {
      console.error('Error sending email via Resend:', error);
      throw error;
    }
  }

  async replyToMessage(params: {
    to: string;
    subject: string;
    body: string;
    replyTo?: string;
  }): Promise<{ id: string }> {
    return this.sendMessage(params);
  }
} 