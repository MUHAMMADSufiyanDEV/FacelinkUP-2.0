export async function sendEmailNotification(to: string, subject: string, html: string) {
  try {
    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, subject, html }),
    });
    
    if (!response.ok) {
      console.warn('Failed to send email notification:', await response.text());
    }
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
}
