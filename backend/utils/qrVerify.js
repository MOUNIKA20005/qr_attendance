const crypto = require("crypto");

const QR_SECRET = process.env.QR_SECRET || "qr_secret_change_me";

function verifySignedPayload(signed) {
  // Expect format: base64Payload.signature (hex)
  if (!signed || typeof signed !== "string") return null;

  const parts = signed.split(".");
  if (parts.length !== 2) return null;

  const [b64, sig] = parts;
  const expected = crypto.createHmac("sha256", QR_SECRET).update(b64).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;

  try {
    const json = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
    return json;
  } catch (err) {
    return null;
  }
}

module.exports = {
  verifySignedPayload,
};
