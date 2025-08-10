import { NextApiHandler } from "next";

const handler: NextApiHandler = async (req, res) => {
  let code: string;

  const { code: c } = req.query as { code: string; state: string };
  code = c;
  if (code === undefined) {
    res.status(400).end();
    return;
  }

  let client = process.env.NEXT_PUBLIC_DISCORD_CLIENT!;
  let secret = process.env.DISCORD_SECRET!;

  const tokenRes = await fetch("https://discord.com/api/v10/oauth2/token", {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(client + ":" + secret),
    },
    method: "POST",
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: client,
      client_secret: secret,
      code: code!,
      redirect_uri: `http://localhost:3006/api/auth`,
    }),
  });

  const body = (await tokenRes.json()) as {
    token_type: string;
    access_token: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
  };

  console.log("Body:", body);
  console.log("Logging access:", body.access_token);
  console.log("Logging refresh:", body.refresh_token);

  // const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
  //   headers: {
  //     "Content-Type": "application/x-www-form-urlencoded",
  //     // Authorization: "Basic " + btoa(client + ":" + secret),
  //   },
  //   method: "POST",
  //   body: new URLSearchParams({
  //     grant_type: "authorization_code",
  //     client_id: client,
  //     client_secret: secret,
  //     code: code!,
  //     redirect_uri: `http://localhost:3006/api/auth`,
  //   }),
  // });

  // const body = await tokenRes.json();
  // const { access_token, refresh_token } = body as {
  //   access_token: string;
  //   refresh_token: string;
  //   id_token: string;
  // };

  console.log(body);

  const params = new URLSearchParams({
    refreshToken: body.refresh_token,
  });
  res.redirect(302, "/?" + params.toString());

  try {
  } catch (e) {
    console.error("An error occurred in authentication:", JSON.stringify(e));
    res.redirect(302, "/auth/error");
  }
};

export default handler;
