import { sendJsonResponse } from "../src/server/serverlessHttp";

export default function handler(req: any, res: any) {
  sendJsonResponse(res, 404, {
    success: false,
    error: `API route ${req.method} ${req.url || ""} not found.`,
  });
}
