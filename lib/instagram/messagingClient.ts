const GRAPH = "https://graph.facebook.com/v21.0";

export interface SendMessageParams {
  igUserId: string;
  pageAccessToken: string;
  recipientIgsid: string;
  text?: string;
  tag?: "HUMAN_AGENT";
}

export async function sendInstagramMessage(
  params: SendMessageParams,
): Promise<{ message_id?: string }> {
  const body: Record<string, unknown> = {
    recipient: { id: params.recipientIgsid },
    message: { text: params.text ?? "" },
  };
  if (params.tag) {
    body.messaging_type = "MESSAGE_TAG";
    body.tag = params.tag;
  }

  const sp = new URLSearchParams({ access_token: params.pageAccessToken });
  const res = await fetch(`${GRAPH}/${params.igUserId}/messages?${sp}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as {
    message_id?: string;
    error?: { message: string };
  };
  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? `Send failed ${res.status}`);
  }
  return json;
}

export function isWithin24hWindow(
  lastInteractionAt: Date | null | undefined,
): boolean {
  if (!lastInteractionAt) return false;
  return Date.now() - lastInteractionAt.getTime() < 24 * 60 * 60 * 1000;
}
