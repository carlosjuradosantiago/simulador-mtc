from __future__ import annotations

import hashlib
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ModuleNotFoundError:
    local_deps = Path(__file__).resolve().parents[2] / ".codex-logs" / "python_deps"
    sys.path.insert(0, str(local_deps))
    import fitz  # type: ignore

from PIL import Image, ImageChops, ImageDraw

from extract_mtc_bank import compose_pdf_images, extract_pdf_image


ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = ROOT / "data" / "mtc_extracted" / "questions_raw.json"
SHEET_DIR = ROOT / "tmp" / "pdfs" / "media-qa"


def all_media(questions: list[dict]) -> list[tuple[dict, str, dict]]:
    items = []
    for question in questions:
        items.extend((question, "pregunta", media) for media in question["question_media"])
        for option in question["options"]:
            items.extend((question, f"opcion {option['label']}", media) for media in option["media"])
    return items


def write_contact_sheets(items: list[tuple[dict, str, dict]]) -> int:
    SHEET_DIR.mkdir(parents=True, exist_ok=True)
    for old in SHEET_DIR.glob("*.png"):
        old.unlink()

    grouped: dict[str, list[tuple[dict, str, dict]]] = defaultdict(list)
    for item in items:
        grouped[item[0]["source_code"]].append(item)

    sheet_count = 0
    for source_code, source_items in sorted(grouped.items()):
        for batch_index in range(0, len(source_items), 40):
            batch = source_items[batch_index:batch_index + 40]
            sheet = Image.new("RGB", (1000, 1440), "white")
            draw = ImageDraw.Draw(sheet)
            for index, (question, cell, media) in enumerate(batch):
                x = (index % 5) * 200
                y = (index // 5) * 180
                image = Image.open(ROOT / media["filename"]).convert("RGB")
                image.thumbnail((184, 132))
                sheet.paste(image, (x + (200 - image.width) // 2, y + 4))
                label = f"#{question['numero_pdf']} p{question['page']} {cell}"
                draw.text((x + 6, y + 140), label, fill="black")
                draw.text((x + 6, y + 156), media["extraction"], fill=(70, 70, 70))
            sheet_count += 1
            number = batch_index // 40 + 1
            sheet.save(SHEET_DIR / f"{source_code}-{number:02d}.png")
    return sheet_count


def main() -> int:
    questions = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    items = all_media(questions)
    documents: dict[str, fitz.Document] = {}
    failures = []
    methods = Counter()

    for question, cell, media in items:
        path = ROOT / media["filename"]
        methods[media["extraction"]] += 1
        if not path.is_file():
            failures.append(f"missing file: {path}")
            continue

        payload = path.read_bytes()
        if hashlib.sha256(payload).hexdigest() != media["sha256"]:
            failures.append(f"hash mismatch: {path}")
        output = Image.open(path).convert("RGB")
        if output.size != (media["width"], media["height"]):
            failures.append(f"dimension mismatch: {path}")

        if media["extraction"] == "pdf_image_group":
            source_file = question["source_file"]
            doc = documents.setdefault(source_file, fitz.open(ROOT / "data" / "mtc_official" / source_file))
            instances = [
                (int(item["xref"]), fitz.Rect(item["rect"]))
                for item in media.get("source_instances") or []
            ]
            original = compose_pdf_images(doc, instances)
            if original is None or original.size != output.size or ImageChops.difference(original, output).getbbox():
                failures.append(f"group pixels differ from PDF resources: {path}")
            continue

        if media["extraction"] != "pdf_image":
            continue
        source_file = question["source_file"]
        doc = documents.setdefault(source_file, fitz.open(ROOT / "data" / "mtc_official" / source_file))
        page_number = media.get("source_page")
        xref = media.get("source_xref")
        if not page_number or not xref or not media.get("source_rect"):
            failures.append(f"missing source metadata: {path}")
            continue
        page_xrefs = {image[0] for image in doc[page_number - 1].get_images(full=True)}
        if xref not in page_xrefs:
            failures.append(f"xref not found on source page: {path}")
            continue
        original = extract_pdf_image(doc, xref)
        if original is None or original.size != output.size or ImageChops.difference(original, output).getbbox():
            failures.append(f"pixels differ from PDF resource: {path}")

    sheet_count = write_contact_sheets(items)
    report = {
        "questions": len(questions),
        "media": len(items),
        "methods": dict(sorted(methods.items())),
        "contact_sheets": sheet_count,
        "failures": failures,
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
