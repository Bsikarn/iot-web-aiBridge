/**
 * Upload image buffer to Discord Webhook and retrieve Discord CDN attachment URL.
 */
export async function uploadToDiscordWebhook(
  fileBuffer: ArrayBuffer | Buffer,
  fileName: string = 'snapshot.jpg',
  mimeType: string = 'image/jpeg'
): Promise<string> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("[Discord Webhook] DISCORD_WEBHOOK_URL environment variable is missing.");
    return "";
  }

  // Ensure ?wait=true is attached so Discord returns the JSON payload with attachments
  const url = webhookUrl.includes('?')
    ? (webhookUrl.includes('wait=true') ? webhookUrl : `${webhookUrl}&wait=true`)
    : `${webhookUrl}?wait=true`;

  const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
  const formData = new FormData();
  formData.append('files[0]', blob, fileName);

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Discord Webhook Error]:", response.status, errorText);
    throw new Error(`Discord Webhook upload failed: ${response.statusText}`);
  }

  const data = await response.json();
  const attachmentUrl = data.attachments?.[0]?.url || data.attachments?.[0]?.proxy_url || "";
  return attachmentUrl;
}
