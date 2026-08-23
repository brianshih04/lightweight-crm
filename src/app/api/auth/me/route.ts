import { getCurrentUser } from "@/lib/auth";
import { apiSuccess } from "@/lib/api-response";
import { authStateResponseSchema } from "@/lib/response-contracts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return apiSuccess(request, authStateResponseSchema, { authenticated: false, user: null });
  }
  return apiSuccess(request, authStateResponseSchema, { authenticated: true, user });
}
