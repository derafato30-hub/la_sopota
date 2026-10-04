import { authenticator } from 'otplib';
import QRCode from 'qrcode';

const secret = authenticator.generateSecret();
const token = authenticator.generate(secret);
console.log('Secret:', secret);
console.log('Token:', token);

QRCode.toDataURL(authenticator.keyuri('user', 'La Sopota', secret), (err, url) => {
  console.log('QR:', url.substring(0, 50));
});
