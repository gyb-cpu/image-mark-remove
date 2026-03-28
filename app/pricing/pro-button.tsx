"use client";

import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ProButton() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  return (
    <PayPalScriptProvider options={{
      clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
      currency: "USD",
      intent: "capture",
    }}>
      <PayPalButtons
        style={{
          layout: "vertical",
          color: "blue",
          shape: "rect",
          label: "subscribe",
        }}
        createOrder={async () => {
          setIsProcessing(true);
          const response = await fetch("/api/paypal/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: "12", currency: "USD" }),
          });
          const data = await response.json();
          return data.orderId;
        }}
        onApprove={async (data) => {
          const response = await fetch("/api/paypal/capture-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: data.orderID }),
          });
          const result = await response.json();
          
          if (result.success) {
            router.push("/dashboard?upgraded=true");
          } else {
            alert("Payment processing failed. Please try again.");
          }
          setIsProcessing(false);
        }}
        onError={(err) => {
          console.error("PayPal error:", err);
          alert("Payment failed. Please try again.");
          setIsProcessing(false);
        }}
      />
    </PayPalScriptProvider>
  );
}
