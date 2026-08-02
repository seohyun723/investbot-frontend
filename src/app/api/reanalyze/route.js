export async function POST() {
  const token = process.env.GITHUB_TOKEN;
  
  if (!token) {
    return Response.json({ error: "GITHUB_TOKEN 미설정" }, { status: 500 });
  }

  try {
    const response = await fetch(
      "https://api.github.com/repos/seohyun723/investbot-analysis/actions/workflows/analyze-signals.yml/dispatches",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: "main" }),
      }
    );

    if (response.ok) {
      return Response.json({ status: "triggered", message: "재분석 시작됨" });
    } else {
      const err = await response.text();
      return Response.json({ error: err }, { status: response.status });
    }
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
