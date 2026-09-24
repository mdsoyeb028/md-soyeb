/**
 * Universal Serverless HTTP request/response helper.
 * Compatible with Vercel Serverless Functions, Node.js http.Server, and Express.
 * Does NOT import express, vite, or any external framework.
 */

export async function parseRequestBody<T = any>(req: any): Promise<T> {
  // If the runtime has already parsed req.body (e.g. Vercel @vercel/node or body-parser)
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string") {
      const trimmed = req.body.trim();
      if (!trimmed) return {} as T;
      try {
        return JSON.parse(trimmed) as T;
      } catch {
        return {} as T;
      }
    }
    if (Buffer.isBuffer(req.body)) {
      try {
        return JSON.parse(req.body.toString("utf-8")) as T;
      } catch {
        return {} as T;
      }
    }
    return req.body as T;
  }

  // If request is an unconsumed stream (standard Node IncomingMessage)
  if (typeof req.on === "function") {
    return new Promise<T>((resolve) => {
      let data = "";
      req.on("data", (chunk: any) => {
        data += chunk;
      });
      req.on("end", () => {
        const trimmed = data.trim();
        if (!trimmed) {
          resolve({} as T);
          return;
        }
        try {
          resolve(JSON.parse(trimmed) as T);
        } catch {
          resolve({} as T);
        }
      });
      req.on("error", () => resolve({} as T));
    });
  }

  return {} as T;
}

export function sendJsonResponse(res: any, statusCode: number, payload: any): void {
  if (typeof res.setHeader === "function" && !res.headersSent) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
  }

  if (typeof res.status === "function") {
    res.status(statusCode);
  } else {
    res.statusCode = statusCode;
  }

  if (typeof res.json === "function") {
    res.json(payload);
  } else if (typeof res.end === "function") {
    res.end(JSON.stringify(payload));
  }
}
