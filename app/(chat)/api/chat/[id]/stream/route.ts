export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chatId } = await params;

  // No resumable streams - return empty response
  return new Response(null, { status: 204 });
}
