import { onRequest } from "firebase-functions/v2/https";
import pkg from "./dist/server.cjs";

// Get our Express app instance
const app = pkg.app;

// Export the "api" cloud function for Firebase
export const api = onRequest({
  cors: true,
  region: "us-central1",
  maxInstances: 10, // Optimizes for free tier usage limits
  memory: "256MiB"  // Compact modern layout consumes minimal RAM
}, (req, res) => {
  return app(req, res);
});
