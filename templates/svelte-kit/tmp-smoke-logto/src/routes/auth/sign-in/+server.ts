import type { RequestHandler } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";
import { buildCallbackUrl, buildPostSignInUrl, getReturnTo } from "$lib/features/auth-logto/server/config";

export const GET: RequestHandler = async ({ locals, url }) => {
  const scopedLocals = locals as {
    user?: unknown;
    logtoClient: {
      signIn: (options: { redirectUri: string; postRedirectUri: string }) => Promise<void>;
    };
  };

  const returnTo = getReturnTo(url.searchParams);

  if (scopedLocals.user) {
    throw redirect(302, returnTo);
  }

  await scopedLocals.logtoClient.signIn({
    redirectUri: buildCallbackUrl(url),
    postRedirectUri: buildPostSignInUrl(url, returnTo)
  });

  return new Response(null, { status: 204 });
};
