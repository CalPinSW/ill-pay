import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "http://localhost:54321";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

Deno.test("parse-receipt - handles CORS preflight", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/parse-receipt`, {
    method: "OPTIONS",
    headers: {
      "Origin": "http://localhost:3000",
      "Access-Control-Request-Method": "POST",
    },
  });

  // Consume response body to avoid leak
  await response.text();
  
  assertEquals(response.status, 200);
  assertEquals(response.headers.get("Access-Control-Allow-Origin"), "*");
});

Deno.test("parse-receipt - returns error without auth", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/parse-receipt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image_base64: "dGVzdA==",
    }),
  });

  const data = await response.json();
  
  // Should return 401 (unauthorized) or 400 (bad request)
  // Both are valid error responses for unauthenticated requests
  const isErrorResponse = response.status === 401 || response.status === 400;
  assertEquals(isErrorResponse, true, `Expected 401 or 400, got ${response.status}`);
});

Deno.test("parse-receipt - requires image input", async () => {
  // This test requires valid auth - skip in CI without credentials
  if (!SUPABASE_ANON_KEY) {
    console.log("Skipping: No SUPABASE_ANON_KEY");
    return;
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/parse-receipt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({}),
  });

  // Should return 400 for missing image
  const data = await response.json();
  assertExists(data.error);
});
