const run = async () => {
  try {
    const signupReq = await fetch('http://localhost:5000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Super Admin',
        userName: 'superadmin1',
        email: 'admin@zenova.app',
        password: 'AdminPassword123!',
        confirmPassword: 'AdminPassword123!',
        role: 'User'
      })
    });
    const signupRes = await signupReq.json();
    console.log('Signup Res:', signupRes);
  } catch (err) {
    console.error(err);
  }
};
run();
