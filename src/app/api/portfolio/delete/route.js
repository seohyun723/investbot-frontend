export async function POST(request) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return Response.json({ error: "GITHUB_TOKEN 미설정" }, { status: 500 });

  const { id } = await request.json();
  if (!id) return Response.json({ error: "id 누락" }, { status: 400 });

  const REPO = "seohyun723/investbot-frontend";
  const PATH = "public/portfolio.json";
  const API_BASE = "https://api.github.com";

  try {
    const getRes = await fetch(`${API_BASE}/repos/${REPO}/contents/${PATH}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (!getRes.ok) return Response.json({ error: "파일 없음" }, { status: 404 });

    const fileData = await getRes.json();
    const content = Buffer.from(fileData.content, "base64").toString("utf-8");
    const data = JSON.parse(content);

    data.holdings = (data.holdings || []).filter(h => h.id !== id);

    const newContent = Buffer.from(JSON.stringify(data, null, 2)).toString("base64");
    const putRes = await fetch(`${API_BASE}/repos/${REPO}/contents/${PATH}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Delete portfolio ${id}`,
        content: newContent,
        sha: fileData.sha,
      }),
    });

    if (putRes.ok) return Response.json({ status: "deleted" });
    return Response.json({ error: "삭제 실패" }, { status: putRes.status });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
