import { json } from "@sveltejs/kit";
import { listAppSettings } from "$lib/entities/app-settings";

export async function GET() {
  try {
    const settings = await listAppSettings();

    return json({
      data: settings,
      ok: true
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";

    return json(
      {
        error: message,
        ok: false
      },
      { status: 503 }
    );
  }
}
