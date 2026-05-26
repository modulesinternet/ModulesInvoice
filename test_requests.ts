async function test() {
  // Let's test updating Staff role's permissions
  const payLoad = {
    modules: {
      dashboard: { read: true, write: true, delete: false },
      products: { read: true, write: false, delete: false },
      quotations: { read: true, write: true, delete: false },
      invoices: { read: true, write: false, delete: false },
      payments: { read: false, write: false, delete: false },
      ledger: { read: false, write: false, delete: false },
      cashbook: { read: false, write: false, delete: false },
      clients: { read: true, write: false, delete: false },
      users: { read: false, write: false, delete: false },
      settings: { read: false, write: false, delete: false }
    }
  };

  try {
    const res = await fetch('http://localhost:3000/api/roles/Staff', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'Admin'
      },
      body: JSON.stringify(payLoad)
    });
    console.log('PUT /api/roles/Staff status:', res.status);
    const body = await res.json();
    console.log('PUT /api/roles/Staff response:', JSON.stringify(body, null, 2));
  } catch (err: any) {
    console.error('Error updating Staff role:', err.message);
  }
}

test();
