import type { RequestHandler } from "@sveltejs/kit";
import { buildPostSignOutUrl } from "$lib/features/auth-logto/server/config";

const signOut: RequestHandler = async ({ locals, url }) => {
  const scopedLocals = locals as {
    logtoClient: {
      signOut: (redirectUri: string) => Promise<void>;
    };
  };

  await scopedLocals.logtoClient.signOut(buildPostSignOutUrl(url));
  return new Response(null, { status: 204 });
};

export const GET = signOut;
export const POST = signOut;
