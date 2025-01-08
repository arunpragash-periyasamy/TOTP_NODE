import express from "express";
import bodyParser from "body-parser";
import speakeasy from "speakeasy";
import qrcode from "qrcode";

const app = express();
app.use(bodyParser.json());

interface User {
  id: string;
  email: string;
  secret?: string;
}

const users: User[] = []; // Mock database for storing user data

// Endpoint to generate a secret for a user
app.post("/generate-secret", (req: any, res:any) => {
  const { id, email } = req.body;

  // Ensure user exists in the system
  const user = users.find((u) => u.id === id && u.email === email);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Generate a secret key for the user
  const secret = speakeasy.generateSecret({
    name: `MyApp (${email})`,
  });

  // Save the secret key to the user's record
  user.secret = secret.base32;

  // Generate a QR code for the user to scan in their authenticator app
  qrcode.toDataURL(secret.otpauth_url!, (err, dataURL) => {
    if (err) {
      return res.status(500).json({ message: "Failed to generate QR code" });
    }
    res.json({ secret: secret.base32, qrCode: dataURL });
  });
});

// Endpoint to validate a TOTP code
app.post("/validate-code", (req: any, res:any) => {
  const { id, email, token } = req.body;

  // Find the user and their secret
  const user = users.find((u) => u.id === id && u.email === email);
  if (!user || !user.secret) {
    return res.status(404).json({ message: "User or secret not found" });
  }

  // Verify the TOTP code
  const isValid = speakeasy.totp.verify({
    secret: user.secret,
    encoding: "base32",
    token,
  });

  if (isValid) {
    res.json({ message: "Token is valid" });
  } else {
    res.status(400).json({ message: "Invalid token" });
  }
});

// Sample endpoint to create a user
app.post("/create-user", (req: any, res:any) => {
  const { id, email } = req.body;

  if (users.find((u) => u.id === id)) {
    return res.status(400).json({ message: "User already exists" });
  }

  users.push({ id, email });
  res.json({ message: "User created" });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
