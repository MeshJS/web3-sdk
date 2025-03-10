import { SERVER_URL } from "../../config";

export async function post(url: string, data: any) {
  const res = await fetch(`${SERVER_URL}/${url}`, {
    credentials: "include",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return res.json();
}
