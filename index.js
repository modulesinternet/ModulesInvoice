import { onRequest } from "firebase-functions/v2/https";

// Export the "api" cloud function for Firebase
export const api = onRequest({
  cors: true,
  region: "us-central1",
  maxInstances: 10, // Optimizes for free tier usage limits
  memory: "256MiB"  // Compact modern layout consumes minimal RAM
}, async (req, res) => {
  // Set flag so the imported server knows it is running inside a Serverless Cloud Function
  process.env.IS_FIREBASE_FUNCTION = "true";
  
  // Lazy-load the compiled server code only when a request is actively handled
  const pkg = await import("./dist/server.cjs");
  const app = pkg.app;
  return app(req, res);
});
