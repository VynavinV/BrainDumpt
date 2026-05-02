from fastapi import FastAPI, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from bs4 import BeautifulSoup
from pathlib import Path
import re
import urllib.parse
import tempfile
import os
import json
import traceback
import asyncio
import uuid as _uuid

_whisper_model = None
_gemini_model = None
_synthesis_model = None


def load_env_file() -> None:
    env_path = Path(__file__).resolve().parents[1] / '.env'
    if not env_path.exists():
        return

    for raw_line in env_path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith('#'):
            continue
        if line.startswith('export '):
            line = line[len('export '):].strip()
        if '=' not in line:
            continue

        key, value = line.split('=', 1)
        key = key.strip()
        value = value.strip()
        if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
            value = value[1:-1]
        os.environ.setdefault(key, value)


load_env_file()


def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel
        _whisper_model = WhisperModel("tiny", device="cpu", compute_type="int8")
    return _whisper_model


def get_gemini_model():
    global _gemini_model
    if _gemini_model is None:
        from google.genai import Client
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=503, detail="GEMINI_API_KEY env var not set")
        client = Client(api_key=api_key)
        # Store both client and system instruction for later use
        _gemini_model = {"client": client, "system_instruction": REFINE_SYSTEM}
    return _gemini_model


SYNTHESIZE_SYSTEM = """\
You are the AI brain of BrainDumpt — a collaborative ideation canvas where teams dump raw thoughts as post-it notes.

Your job: analyze all the notes on the board and produce a structured synthesis that makes the chaos immediately readable by any team member.

You MUST return valid JSON (no markdown, no code fences, raw JSON only) with this exact structure:

{
  "summary": "2-3 sentence summary capturing the overall direction and key themes of the board",
  "groups": [
    {
      "id": "group-N",
      "name": "Short, descriptive name for this cluster of ideas",
      "color": "One of: #B9DEC8, #BEE9DE, #B8DAF0, #F6D2B8, #EFB9A6, #E9DABF, #F4E8B2",
      "node_ids": ["id1", "id2"],
      "summary": "What this cluster of ideas is about in 1-2 sentences",
      "flow": [
        {
          "step": 1,
          "title": "Short title for this idea",
          "node_ids": ["id1"],
          "type": "core",
          "description": "Brief description of what this idea means",
          "parent_step": null
        },
        {
          "step": 2,
          "title": "Sub-idea or detail",
          "node_ids": ["id2"],
          "type": "detail",
          "description": "How this relates to the parent",
          "parent_step": 1
        }
      ]
    }
  ],
  "connections": [
    {
      "from_group": "group-1",
      "to_group": "group-2",
      "label": "Short description of how they connect",
      "type": "supports"
    }
  ],
  "open_questions": ["Unresolved question 1", "Unresolved question 2"],
  "next_steps": ["Suggested next step 1", "Suggested next step 2"]
}

Critical rules:
- ASSIGN EVERY node to exactly one group
- Groups must be semantically coherent — ideas that belong together
- Within each group, build a flow showing the hierarchy: main concept → supporting details → sub-ideas
- Use flow types: "core" for the main idea, "detail" for supporting points, "question" for open questions within the group, "action" for suggested actions
- The parent_step field creates the tree: if step 2 has parent_step 1, then step 2 is a child of step 1
- Find REAL, meaningful connections between groups — not generic ones
- Keep group names short (2-4 words) and descriptive
- Keep connection labels short and specific
- Distribute colors evenly across groups
- If fewer than 3 nodes, create one group with all nodes
- If all nodes are unrelated, still group them but note the diversity in the summary
- open_questions should be things the board raises but doesn't answer
- next_steps should be actionable suggestions based on the ideas present
"""


def get_synthesis_model():
    global _synthesis_model
    if _synthesis_model is None:
        from google.genai import Client
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=503, detail="GEMINI_API_KEY env var not set")
        client = Client(api_key=api_key)
        # Store both client and system instruction for later use
        _synthesis_model = {"client": client, "system_instruction": SYNTHESIZE_SYSTEM}
    return _synthesis_model

app = FastAPI(title="BrainDumpt API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LinkPreview(BaseModel):
    url: str
    title: str = ""
    description: str = ""
    image: str = ""
    favicon: str = ""
    site_name: str = ""
    embed_html: str = ""
    embed_type: str = ""


class ContextItem(BaseModel):
    role: str
    content: str


class RefineRequest(BaseModel):
    content: str
    context: list[ContextItem] = []
    node_type: str = "text"


class SynthesizeNode(BaseModel):
    id: str
    type: str
    content: str = ""
    items: list[str] = []
    code: str = ""
    language: str = ""
    link_url: str = ""
    transcript: str = ""


class SynthesizeRequest(BaseModel):
    nodes: list[SynthesizeNode]
    board_title: str = ""


REFINE_SYSTEM = """\
You are part of BrainDumpt — a collaborative ideation tool where teams dump raw thoughts onto a canvas.

Your job: take a raw thought and refine it so any collaborator can understand it. You are NOT summarizing. You are NOT generating ideas. You are clarifying what the person actually means.

Rules:
- Fix grammar, spelling, structure — make it readable
- Preserve the person's voice, tone, and energy — do not sterilize personality
- Keep the same level of detail — do not compress or expand
- If context is provided, use it to resolve ambiguity and make implicit connections explicit
- Never add ideas the author didn't express
- Never use generic AI filler ("In summary", "It's worth noting", "Additionally", "Furthermore")
- If the input is already clear, return it nearly unchanged
- Match the author's apparent tone: if they're excited, stay excited; if terse, stay terse
- For lists: keep the list structure, refine each item individually
"""


def extract_youtube_id(url: str) -> str | None:
    parsed = urllib.parse.urlparse(url)
    host = parsed.hostname or ""
    if host in ("www.youtube.com", "youtube.com", "m.youtube.com"):
        match = re.search(r"v=([a-zA-Z0-9_-]{11})", parsed.query)
        if match:
            return match.group(1)
        path_parts = parsed.path.strip("/").split("/")
        if len(path_parts) >= 2 and path_parts[0] == "shorts":
            return path_parts[1]
        if len(path_parts) >= 2 and path_parts[0] == "embed":
            return path_parts[1]
    if host == "youtu.be":
        return parsed.path.strip("/").split("/")[0]
    return None


def extract_vimeo_id(url: str) -> str | None:
    parsed = urllib.parse.urlparse(url)
    if (parsed.hostname or "").endswith("vimeo.com"):
        parts = parsed.path.strip("/").split("/")
        if parts and parts[0].isdigit():
            return parts[0]
    return None


def extract_twitter_id(url: str) -> str | None:
    parsed = urllib.parse.urlparse(url)
    host = (parsed.hostname or "")
    if host in ("twitter.com", "x.com"):
        parts = parsed.path.strip("/").split("/")
        if len(parts) >= 3 and parts[1] and parts[2] == "status" and parts[3].isdigit():
            return parts[3]
    return None


def extract_linkedin_type(url: str) -> str:
    parsed = urllib.parse.urlparse(url)
    host = (parsed.hostname or "")
    if "linkedin.com" not in host:
        return ""
    parts = parsed.path.strip("/").split("/")
    if parts[0] == "in":
        return "profile"
    if parts[0] == "company":
        return "company"
    if parts[0] == "jobs" and len(parts) > 1:
        return "job"
    if parts[0] == "posts":
        return "post"
    return ""


def extract_og(soup: BeautifulSoup, prop: str) -> str:
    tag = soup.find("meta", property=f"og:{prop}")
    if tag and tag.get("content"):
        return str(tag["content"]).strip()
    tag = soup.find("meta", attrs={"name": prop})
    if tag and tag.get("content"):
        return str(tag["content"]).strip()
    return ""


@app.get("/health")
async def health():
    return {"status": "ok", "service": "braindump-api"}


@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    model = get_whisper_model()
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name
    try:
        segments, _ = model.transcribe(tmp_path, beam_size=1)
        text = " ".join(s.text for s in segments).strip()
    finally:
        os.unlink(tmp_path)
    return {"transcript": text}


@app.post("/refine")
async def refine_content(request: RefineRequest):
    model_data = get_gemini_model()
    client = model_data["client"]
    system_instruction = model_data["system_instruction"]

    context_block = ""
    if request.context:
        parts = []
        for ctx in request.context:
            snippet = ctx.content[:300]
            parts.append(f"[{ctx.role}] {snippet}")
        context_block = "Context from the board (related ideas):\n" + "\n".join(parts) + "\n\n"

    format_instruction = ""
    if request.node_type == "list":
        format_instruction = (
            "\n\nIMPORTANT: This is a LIST node. You MUST return each item on its own line. "
            "Do NOT merge items into paragraphs. Do NOT add prose between items. "
            "Keep the exact same number of list items. Each item gets exactly one line.\n"
        )

    prompt = f"{context_block}Raw thought (node type: {request.node_type}):\n{request.content}{format_instruction}\nReturn only the refined text. No preamble, no explanation."

    try:
        response = client.models.generate_content(
            model="gemini-flash-lite-latest",
            contents=prompt,
            config={
                "systemInstruction": system_instruction,
                "temperature": 0.3,
                "maxOutputTokens": 1024,
            },
        )
        refined = response.text.strip() if response.text else request.content
    except Exception as e:
        print("[refine] Gemini error:", repr(e))
        traceback.print_exc()
        refined = request.content

    if request.node_type == "list" and refined:
        lines = [line.strip() for line in refined.split("\n") if line.strip()]
        lines = [re.sub(r"^[-*•]\s+", "", line) for line in lines]
        if lines:
            refined = "\n".join(lines)

    return {"refined": refined}


@app.get("/preview", response_model=LinkPreview)
async def get_preview(url: str):
    youtube_id = extract_youtube_id(url)
    vimeo_id = extract_vimeo_id(url)
    twitter_id = extract_twitter_id(url)
    linkedin_type = extract_linkedin_type(url)

    if youtube_id:
        return LinkPreview(
            url=url,
            title="",
            description="",
            image=f"https://img.youtube.com/vi/{youtube_id}/hqdefault.jpg",
            embed_html=f'<iframe src="https://www.youtube.com/embed/{youtube_id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="width:100%;aspect-ratio:16/9;border-radius:12px;border:none;"></iframe>',
            embed_type="video",
            site_name="YouTube",
        )

    if vimeo_id:
        return LinkPreview(
            url=url,
            title="",
            description="",
            image="",
            embed_html=f'<iframe src="https://player.vimeo.com/video/{vimeo_id}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="width:100%;aspect-ratio:16/9;border-radius:12px;border:none;"></iframe>',
            embed_type="video",
            site_name="Vimeo",
        )

    if twitter_id:
        return LinkPreview(
            url=url,
            title="",
            description="",
            image="",
            embed_html=f'<blockquote class="twitter-tweet"><a href="{url}"></a></blockquote><script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>',
            embed_type="tweet",
            site_name="X / Twitter",
        )

    if linkedin_type:
        return LinkPreview(
            url=url,
            title=f"LinkedIn {linkedin_type.title()}",
            description=f"LinkedIn {linkedin_type} embed",
            image="",
            embed_html=f'<iframe src="{url}" frameborder="0" style="width:100%;min-height:400px;border-radius:12px;border:none;" loading="lazy"></iframe>',
            embed_type="iframe",
            site_name="LinkedIn",
        )

    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            headers={"User-Agent": "BrainDumpt/1.0 (link preview bot)"},
            timeout=8.0,
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
    except Exception:
        parsed = urllib.parse.urlparse(url)
        return LinkPreview(
            url=url,
            title=url,
            description="Could not fetch preview",
            favicon=f"{parsed.scheme}://{parsed.hostname}/favicon.ico" if parsed.hostname else "",
            site_name=parsed.hostname or "",
        )

    soup = BeautifulSoup(resp.text, "html.parser")

    title = extract_og(soup, "title") or soup.title.string if soup.title else ""
    if title:
        title = title.strip()

    description = extract_og(soup, "description") or extract_og(soup, "og:description") or ""
    if not description:
        meta = soup.find("meta", attrs={"name": "description"})
        if meta and meta.get("content"):
            description = str(meta["content"]).strip()

    image = extract_og(soup, "image")
    if not image:
        meta = soup.find("meta", attrs={"name": "twitter:image"})
        if meta and meta.get("content"):
            image = str(meta["content"]).strip()

    site_name = extract_og(soup, "site_name")

    parsed = urllib.parse.urlparse(url)
    favicon = ""
    icon_link = soup.find("link", rel=lambda r: r and "icon" in r)
    if icon_link and icon_link.get("href"):
        favicon = str(icon_link["href"])
        if favicon.startswith("//"):
            favicon = f"{parsed.scheme}:{favicon}"
        elif favicon.startswith("/"):
            favicon = f"{parsed.scheme}://{parsed.hostname}{favicon}"

    if not favicon and parsed.hostname:
        favicon = f"{parsed.scheme}://{parsed.hostname}/favicon.ico"

    for tag in soup.find_all("meta", property=re.compile(r"^og:(video|video:url|video:secure_url)$")):
        content = tag.get("content", "")
        if content:
            return LinkPreview(
                url=url,
                title=title or url,
                description=description,
                image=image,
                favicon=favicon,
                site_name=site_name or parsed.hostname or "",
                embed_html=f'<video src="{content}" controls style="width:100%;border-radius:12px;"></video>',
                embed_type="video",
            )

    return LinkPreview(
        url=url,
        title=title or url,
        description=description,
        image=image,
        favicon=favicon,
        site_name=site_name or parsed.hostname or "",
    )


def _build_board_text(request: SynthesizeRequest) -> str:
    lines = []
    if request.board_title:
        lines.append(f"Board: \"{request.board_title}\"")
    lines.append(f"Total notes: {len(request.nodes)}")
    lines.append("")

    for node in request.nodes:
        text = ""
        if node.type == "text":
            text = node.content or "(empty text note)"
        elif node.type == "list":
            items = [f"  - {item}" for item in node.items if item.strip()]
            text = "\n".join(items) if items else "(empty list)"
        elif node.type == "code":
            text = f"```{node.language}\n{node.code}\n```" if node.code else "(empty code)"
        elif node.type == "link":
            text = node.link_url or "(empty link)"
        elif node.type == "audio":
            text = node.transcript or "(audio, no transcript)"
        elif node.type == "image":
            text = "[image note]"
        else:
            text = node.content or "(note)"

        lines.append(f"Note [{node.id}] ({node.type}):")
        lines.append(text)
        lines.append("")

    return "\n".join(lines)


def _parse_json_response(raw: str) -> dict | None:
    raw = raw.strip()
    if raw.startswith("```"):
        lines = raw.split("\n")
        start = 1 if lines[0].strip().startswith("```") else 0
        end = len(lines)
        for i in range(len(lines) - 1, -1, -1):
            if lines[i].strip() == "```":
                end = i
                break
        raw = "\n".join(lines[start:end])
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def _fallback_synthesis(request: SynthesizeRequest) -> dict:
    colors = ["#B9DEC8", "#BEE9DE", "#B8DAF0", "#F6D2B8", "#EFB9A6", "#E9DABF", "#F4E8B2"]
    nodes = request.nodes
    all_ids = [n.id for n in nodes]

    groups = []
    type_buckets: dict[str, list[SynthesizeNode]] = {}
    for n in nodes:
        key = n.type
        type_buckets.setdefault(key, []).append(n)

    idx = 0
    for ntype, bucket in type_buckets.items():
        group_id = f"group-{idx + 1}"
        flow = []
        for i, n in enumerate(bucket):
            text = n.content or n.transcript or (n.items[0] if n.items else "") or f"{ntype} note"
            flow.append({
                "step": i + 1,
                "title": text[:60],
                "node_ids": [n.id],
                "type": "core" if i == 0 else "detail",
                "description": text[:200],
                "parent_step": 1 if i > 0 else None,
            })
        groups.append({
            "id": group_id,
            "name": f"{ntype.title()} Ideas",
            "color": colors[idx % len(colors)],
            "node_ids": [n.id for n in bucket],
            "summary": f"{len(bucket)} {ntype} notes on the board.",
            "flow": flow,
        })
        idx += 1

    connections = []
    if len(groups) > 1:
        connections.append({
            "from_group": groups[0]["id"],
            "to_group": groups[1]["id"],
            "label": "Related ideas",
            "type": "supports",
        })

    return {
        "summary": f"Board contains {len(nodes)} notes. Synthesis could not be generated by AI — showing basic grouping by type.",
        "groups": groups,
        "connections": connections,
        "open_questions": [],
        "next_steps": ["Add more notes to enable deeper synthesis"],
    }


@app.post("/synthesize")
async def synthesize_board(request: SynthesizeRequest):
    if not request.nodes:
        return {"summary": "No notes to synthesize.", "groups": [], "connections": [], "open_questions": [], "next_steps": []}

    board_text = _build_board_text(request)

    prompt = f"{board_text}\n\nAnalyze these notes and return the synthesis as JSON. Remember: assign every node to exactly one group."

    try:
        model_data = get_synthesis_model()
        client = model_data["client"]
        system_instruction = model_data["system_instruction"]
        
        response = client.models.generate_content(
            model="gemini-flash-lite-latest",
            contents=prompt,
            config={
                "systemInstruction": system_instruction,
                "temperature": 0.4,
                "maxOutputTokens": 4096,
            },
        )
        raw = response.text.strip() if response.text else ""

        result = _parse_json_response(raw)

        if not result or "groups" not in result:
            result = _fallback_synthesis(request)
        else:
            assigned_ids = set()
            for group in result["groups"]:
                assigned_ids.update(group.get("node_ids", []))
            missing = [n.id for n in request.nodes if n.id not in assigned_ids]
            if missing and result["groups"]:
                colors = ["#B9DEC8", "#BEE9DE", "#B8DAF0", "#F6D2B8", "#EFB9A6", "#E9DABF", "#F4E8B2"]
                unassigned = [n for n in request.nodes if n.id in missing]
                flow = []
                for i, n in enumerate(unassigned):
                    text = n.content or n.transcript or (n.items[0] if n.items else "") or "note"
                    flow.append({
                        "step": i + 1,
                        "title": text[:60],
                        "node_ids": [n.id],
                        "type": "detail",
                        "description": text[:200],
                        "parent_step": 1 if i > 0 else None,
                    })
                result["groups"].append({
                    "id": f"group-{len(result['groups']) + 1}",
                    "name": "Other Ideas",
                    "color": colors[len(result["groups"]) % len(colors)],
                    "node_ids": missing,
                    "summary": "Notes that didn't fit into other groups.",
                    "flow": flow,
                })

    except Exception as e:
        print("[synthesize] Gemini error:", repr(e))
        traceback.print_exc()
        result = _fallback_synthesis(request)

    return result


# -------- Multiplayer / boards --------

BOARDS_DIR = Path(__file__).resolve().parents[1] / "boards_data"
BOARDS_DIR.mkdir(exist_ok=True)


class Board:
    def __init__(self, board_id: str):
        self.id = board_id
        self.title = "Untitled Board"
        self.nodes: dict[str, dict] = {}
        self.synthesis: dict | None = None
        self.connections: list[dict] = []
        self.clients: dict[WebSocket, dict] = {}
        self.lock = asyncio.Lock()
        self.path = BOARDS_DIR / f"{board_id}.json"
        self._load()

    def _load(self):
        if self.path.exists():
            try:
                data = json.loads(self.path.read_text())
                self.title = data.get("title", "Untitled Board")
                self.nodes = data.get("nodes", {})
                self.synthesis = data.get("synthesis")
                self.connections = data.get("connections", [])
            except Exception:
                pass

    def save(self):
        try:
            self.path.write_text(json.dumps({
                "title": self.title,
                "nodes": self.nodes,
                "synthesis": self.synthesis,
                "connections": self.connections,
            }))
        except Exception as e:
            print("[board.save] error:", e)

    def snapshot(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "nodes": list(self.nodes.values()),
            "synthesis": self.synthesis,
            "connections": self.connections,
            "users": [{"id": c["id"], "username": c["username"], "color": c["color"]} for c in self.clients.values()],
        }


BOARDS: dict[str, Board] = {}
BOARDS_LOCK = asyncio.Lock()


async def get_board(board_id: str) -> Board:
    async with BOARDS_LOCK:
        b = BOARDS.get(board_id)
        if not b:
            b = Board(board_id)
            BOARDS[board_id] = b
        return b


PRESENCE_COLORS = ["#B9DEC8", "#BEE9DE", "#B8DAF0", "#F6D2B8", "#EFB9A6", "#E9DABF", "#F4E8B2"]


class CreateBoardReq(BaseModel):
    title: str = "Untitled Board"
    username: str = ""


@app.post("/boards")
async def create_board(req: CreateBoardReq):
    bid = _uuid.uuid4().hex[:10]
    board = await get_board(bid)
    if req.title:
        board.title = req.title
    board.save()
    return {"id": bid, "title": board.title}


@app.get("/boards/{board_id}")
async def get_board_state(board_id: str):
    board = await get_board(board_id)
    return board.snapshot()


async def broadcast(board: Board, message: dict, skip: WebSocket | None = None):
    payload = json.dumps(message)
    dead = []
    for ws in list(board.clients.keys()):
        if ws is skip:
            continue
        try:
            await ws.send_text(payload)
        except Exception:
            dead.append(ws)
    for ws in dead:
        board.clients.pop(ws, None)


@app.websocket("/ws/{board_id}")
async def ws_board(websocket: WebSocket, board_id: str):
    await websocket.accept()
    board = await get_board(board_id)

    user_id = _uuid.uuid4().hex[:8]
    username = "Guest"
    color = PRESENCE_COLORS[len(board.clients) % len(PRESENCE_COLORS)]

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except Exception:
                continue

            mtype = msg.get("type")

            if mtype == "hello":
                username = (msg.get("username") or "Guest").strip()[:40] or "Guest"
                board.clients[websocket] = {"id": user_id, "username": username, "color": color}
                await websocket.send_text(json.dumps({
                    "type": "init",
                    "you": {"id": user_id, "username": username, "color": color},
                    "state": board.snapshot(),
                }))
                await broadcast(board, {
                    "type": "user_joined",
                    "user": {"id": user_id, "username": username, "color": color},
                }, skip=websocket)

            elif mtype == "node_upsert":
                node = msg.get("node") or {}
                nid = node.get("id")
                if not nid:
                    continue
                async with board.lock:
                    board.nodes[nid] = node
                    board.save()
                await broadcast(board, {"type": "node_upsert", "node": node, "from": user_id}, skip=websocket)

            elif mtype == "node_patch":
                nid = msg.get("id")
                patch = msg.get("patch") or {}
                if not nid:
                    continue
                async with board.lock:
                    if nid in board.nodes:
                        board.nodes[nid].update(patch)
                        board.save()
                await broadcast(board, {"type": "node_patch", "id": nid, "patch": patch, "from": user_id}, skip=websocket)

            elif mtype == "node_delete":
                nid = msg.get("id")
                if not nid:
                    continue
                async with board.lock:
                    if nid in board.nodes:
                        del board.nodes[nid]
                    children = [k for k, v in board.nodes.items() if v.get("parentId") == nid]
                    for c in children:
                        del board.nodes[c]
                    board.save()
                await broadcast(board, {"type": "node_delete", "id": nid, "children": children, "from": user_id}, skip=websocket)

            elif mtype == "cursor":
                await broadcast(board, {
                    "type": "cursor",
                    "user_id": user_id,
                    "username": username,
                    "color": color,
                    "x": msg.get("x"),
                    "y": msg.get("y"),
                }, skip=websocket)

            elif mtype == "title":
                t = (msg.get("title") or "").strip()[:120]
                if t:
                    async with board.lock:
                        board.title = t
                        board.save()
                    await broadcast(board, {"type": "title", "title": t, "from": user_id}, skip=websocket)

            elif mtype == "synthesis_set":
                async with board.lock:
                    board.synthesis = msg.get("result")
                    board.save()
                await broadcast(board, {"type": "synthesis_set", "result": board.synthesis, "from": user_id}, skip=websocket)

            elif mtype == "synthesis_clear":
                async with board.lock:
                    board.synthesis = None
                    board.save()
                await broadcast(board, {"type": "synthesis_clear", "from": user_id}, skip=websocket)

            elif mtype == "synthesis_resynthesize":
                async with board.lock:
                    board.synthesis = None
                    board.save()
                nodes_list = [SynthesizeNode(**n) for n in board.nodes.values()]
                request = SynthesizeRequest(nodes=nodes_list, board_title=board.title)
                result = await synthesize_board(request)
                async with board.lock:
                    board.synthesis = result
                    board.save()
                await broadcast(board, {"type": "synthesis_set", "result": result, "from": user_id}, skip=websocket)

            elif mtype == "ping":
                await websocket.send_text(json.dumps({"type": "pong", "t": msg.get("t")}))

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print("[ws] error:", e)
        traceback.print_exc()
    finally:
        board.clients.pop(websocket, None)
        await broadcast(board, {"type": "user_left", "user_id": user_id})
