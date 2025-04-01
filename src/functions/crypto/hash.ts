import * as crypto from "crypto";

export function generateHash({
  size = 64,
}: {
  size?: number;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(size, function (err, buffer) {
      resolve(buffer.toString("hex"));
    });
  });
}

export async function hashData({
  data,
  privateKey = "",
  algorithm = "sha256",
}: {
  data: any;
  privateKey?: string;
  algorithm?: string;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    const hmac = crypto.createHmac(algorithm, privateKey);

    hmac.on("readable", () => {
      const data = hmac.read();
      if (data) {
        resolve(data.toString("hex"));
      }
    });

    hmac.write(data);
    hmac.end();
  });
}
