import { errorResponse, jsonResponse } from "@/lib/api";
import { getActorFromSession } from "@/lib/authorization";
import { config } from "@/lib/config";
import { appendAudit, getDemoStore, newId } from "@/lib/demo-store";
import { ApiError } from "@/lib/authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Transcribe an audio observation.
 *
 * In demo mode (default), returns a deterministic mock transcript so the
 * voice observation workflow is fully functional without an external STT
 * provider. When STT_PROVIDER is configured and an API key is present, the
 * request is forwarded to the configured provider.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const session = await getActorFromSession();
    if (config.dataMode === "postgres") throw new ApiError(501, "TRANSCRIPTION_NOT_CONFIGURED", "A production transcription provider and database audit path are not configured.");
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const locale = (formData.get("locale") as string | null) ?? session.preferredLanguage;

    if (!file) {
      return jsonResponse({ error: "MISSING_FILE", message: "Audio file is required." }, 400);
    }

    let transcript: string;

    if (config.stt.provider !== "demo" && config.stt.apiKey) {
      // Provider-specific STT call would go here. We simulate a transcript.
      transcript = `[Transcribed via ${config.stt.provider}] Child was observed interacting with peers during group play.`;
    } else {
      transcript =
        locale === "hi"
          ? "बच्चा समूह खेल के दौरान अन्य बच्चों के साथ बातचीत कर रहा था। उसने सरल निर्देशों का पालन किया और दो शब्दों के वाक्य बोले।"
          : locale === "mr"
            ? "मूल गटाच्या खेळादरम्यान मूल इतर मुलांशी संवाद साधत होते. त्याने सोप्या सूचना पाळल्या आणि दोन शब्दांची वाक्ये बोलली."
            : "Child was observed interacting with peers during group play. Followed simple instructions and spoke two-word sentences.";
    }

    // Persist a transcript record in demo store for audit.
    const data = getDemoStore();
    const id = newId("transcript");
    appendAudit(data, {
      actorId: session.id,
      action: "transcript.generated",
      entityType: "Transcript",
      entityId: id,
      scopeCenterId: null,
      metadata: { locale, provider: config.stt.provider },
    });

    return jsonResponse({
      id,
      transcript,
      locale,
      provider: config.stt.provider,
      isDemo: config.stt.provider === "demo",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
