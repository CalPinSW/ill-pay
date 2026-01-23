import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "http://localhost:54321";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

Deno.test("send-notification - returns error for missing push token", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      userId: "00000000-0000-0000-0000-000000000000",
      title: "Test Notification",
      body: "This is a test",
    }),
  });

  assertEquals(response.status, 200);
  
  const data = await response.json();
  assertExists(data.error);
  assertEquals(data.error, "User has no push token");
});

Deno.test("send-notification - handles CORS preflight", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
    method: "OPTIONS",
    headers: {
      "Origin": "http://localhost:3000",
      "Access-Control-Request-Method": "POST",
    },
  });

  assertEquals(response.status, 200);
  assertEquals(response.headers.get("Access-Control-Allow-Origin"), "*");
});

Deno.test("send-notification - requires valid request body", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({}),
  });

  const data = await response.json();
  // Should handle missing userId gracefully
  assertExists(data);
});
