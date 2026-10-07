import { authFetch } from "../utils/apiHelper";

export interface CreateOrderResponse {
  success: boolean;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  planId: string;
  period: "monthly" | "yearly";
  error?: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message?: string;
  plan?: string;
  planPeriod?: "monthly" | "yearly";
  planExpiresAt?: string;
  error?: string;
}

/**
 * Loads Razorpay checkout.js script asynchronously if not already loaded.
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Initiates Razorpay checkout with server-side order creation and signature verification.
 */
export async function launchRazorpayCheckout(params: {
  planId: "starter" | "business" | "pro";
  period: "monthly" | "yearly";
  userEmail?: string | null;
  userName?: string | null;
  onSuccess: (verifyData: VerifyPaymentResponse) => void;
  onFailure: (errorMessage: string) => void;
  onDismiss?: () => void;
}): Promise<void> {
  const { planId, period, userEmail, userName, onSuccess, onFailure, onDismiss } = params;

  // 1. Ensure Razorpay script is loaded
  const scriptLoaded = await loadRazorpayScript();
  if (!scriptLoaded) {
    onFailure("Failed to load secure Razorpay Checkout SDK. Please check your internet connection.");
    return;
  }

  // 2. Request order creation from server via authFetch
  let orderData: CreateOrderResponse;
  try {
    const res = await authFetch("/api/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId, period }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Could not initialize checkout order.");
    }
    orderData = data;
  } catch (err: any) {
    onFailure(err?.message || "Failed to create payment order with server.");
    return;
  }

  // 3. Configure Razorpay modal options
  const options = {
    key: orderData.keyId,
    amount: orderData.amount,
    currency: orderData.currency || "INR",
    name: "Business Growth & Export Hub",
    description: `${planId.toUpperCase()} Plan (${period === "yearly" ? "365 Days" : "30 Days"})`,
    order_id: orderData.orderId,
    prefill: {
      name: userName || "",
      email: userEmail || "",
    },
    theme: {
      color: "#7c3aed", // Brand purple
    },
    modal: {
      ondismiss: () => {
        if (onDismiss) onDismiss();
      },
    },
    handler: async (response: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }) => {
      // 4. Verify payment with server
      try {
        const verifyRes = await authFetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          }),
        });

        const verifyData: VerifyPaymentResponse = await verifyRes.json();
        if (!verifyRes.ok || !verifyData.success) {
          throw new Error(verifyData.error || "Payment signature verification failed.");
        }
        onSuccess(verifyData);
      } catch (verifyErr: any) {
        onFailure(verifyErr?.message || "Payment verification failed on server.");
      }
    },
  };

  const rzp = new (window as any).Razorpay(options);
  rzp.on("payment.failed", (response: any) => {
    const reason = response.error?.description || response.error?.reason || "Payment declined or cancelled.";
    onFailure(reason);
  });
  rzp.open();
}
