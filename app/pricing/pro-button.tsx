"use client";

import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function ProButton() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if user is logged in
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        setIsLoggedIn(!!data?.user);
      })
      .catch(() => setIsLoggedIn(false));
  }, []);

  if (isLoggedIn === false) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-300 mb-3">Please log in to upgrade</p>
        <a
          href="/login"
          className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg transition"
        >
          Log In
        </a>
      </div>
    );
  }

  if (isLoggedIn === null) {
    return <div className="h-20 flex items-center justify-center">Loading...</div>;
  }

  return (
    <PayPalScriptProvider options={{
      clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
      currency: "USD",
      intent: "capture",
      commit: true,
    }}>
      <PayPalButtons
        style={{
          layout: "horizontal",
          color: "gold",
          shape: "rect",
          label: "pay",
          tagline: false,
        }}
        createOrder={async () => {
          setIsProcessing(true);
          try {
            const response = await fetch("/api/paypal/create-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ amount: "12", currency: "USD" }),
            });
            const data = await response.json();
            if (!data.orderId) {
              throw new Error("Failed to create order");
            }
            return data.orderId;
          } catch (err) {
            setIsProcessing(false);
            throw err;
          }
        }}
        onApprove={async (data) => {
          try {
            const response = await fetch("/api/paypal/capture-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: data.orderID }),
            });
            const result = await response.json();
            
            if (result.success) {
              router.push("/dashboard?upgraded=true");
            } else {
              const errorMsg = result.details || result.error || "Payment failed";
              alert(`Payment error: ${errorMsg}`);
            }
          } catch (err) {
            alert("Payment processing failed. Please try again.");
          } finally {
            setIsProcessing(false);
          }
        }}
        onError={(err) => {
          console.error("PayPal error:", err);
          alert("Payment failed. Please try again.");
          setIsProcessing(false);
        }}
        onCancel={() => {
          setIsProcessing(false);
        }}
      />
    </PayPalScriptProvider>
  );
}
