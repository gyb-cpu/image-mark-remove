<!DOCTYPE html>
<html>
<head>
  <title>Payment Test</title>
  <meta charset="utf-8">
</head>
<body>
  <h1>PayPal Payment Test</h1>
  <div id="status">Loading...</div>
  <div id="paypal-button-container"></div>
  
  <script src="https://www.paypal.com/sdk/js?client-id=AfVPCloOOEFl2J6UzKRinR15sOgcu2AXvH-ppF_YkCJIboaTwangavO-UobfcmGmI7_9MyIH3MSCapo5&currency=USD"></script>
  <script>
    // Check login status
    fetch('/api/me')
      .then(r => r.json())
      .then(data => {
        document.getElementById('status').innerHTML = `
          <h2>Login Status:</h2>
          <pre>${JSON.stringify(data, null, 2)}</pre>
        `;
        
        if (!data.hasSession) {
          document.getElementById('status').innerHTML += '<p style="color:red">NOT LOGGED IN - Please login first at <a href="/login">/login</a></p>';
          return;
        }
        
        // Render PayPal button
        paypal.Buttons({
          createOrder: async () => {
            const res = await fetch('/api/paypal/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ amount: '12', currency: 'USD' })
            });
            const data = await res.json();
            console.log('Created order:', data);
            return data.orderId;
          },
          onApprove: async (data) => {
            console.log('Capturing:', data);
            const res = await fetch('/api/paypal/capture-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId: data.orderID }),
              credentials: 'same-origin'
            });
            const result = await res.json();
            console.log('Capture result:', result);
            
            document.getElementById('status').innerHTML += `
              <h2>Capture Result:</h2>
              <pre>${JSON.stringify(result, null, 2)}</pre>
            `;
            
            if (result.success) {
              alert('Payment successful!');
              window.location.href = '/dashboard?upgraded=true';
            } else {
              alert('Payment failed: ' + (result.debug?.error || result.error));
            }
          },
          onError: (err) => {
            console.error('PayPal error:', err);
            document.getElementById('status').innerHTML += `<p style="color:red">Error: ${err.message}</p>`;
          }
        }).render('#paypal-button-container');
      });
  </script>
</body>
</html>
