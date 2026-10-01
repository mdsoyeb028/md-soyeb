import { sendJsonResponse } from "./_lib/serverlessHttp.ts";
import { CENTRAL_PLANS } from "../src/data/plans.ts";

export default function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (typeof res.status === "function") res.status(204).end();
    else {
      res.statusCode = 204;
      res.end();
    }
    return;
  }

  sendJsonResponse(res, 200, {
    success: true,
    plans: CENTRAL_PLANS,
  });
}
