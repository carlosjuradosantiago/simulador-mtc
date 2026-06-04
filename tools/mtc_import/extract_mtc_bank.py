from __future__ import annotations

import base64
import csv
import hashlib
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    import fitz  # PyMuPDF
except ModuleNotFoundError:
    local_deps = Path(__file__).resolve().parents[2] / ".codex-logs" / "python_deps"
    sys.path.insert(0, str(local_deps))
    import fitz  # type: ignore

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = ROOT / "data" / "mtc_official"
OUT_DIR = ROOT / "data" / "mtc_extracted"
MEDIA_DIR = OUT_DIR / "media"

CATEGORY_IDS = {
    "A-I": 25,
    "A-IIA": 16,
    "A-IIB": 17,
    "A-IIIA": 18,
    "A-IIIB": 19,
    "A-IIIC": 20,
    "B-IIA": 22,
    "B-IIB": 23,
    "B-IIC": 24,
}


@dataclass(frozen=True)
class Column:
    name: str
    x0: float
    x1: float


LAYOUT_A = [
    Column("numero", 28, 52),
    Column("tipo_materia", 52, 91),
    Column("clase_categoria", 91, 137),
    Column("tema", 137, 224),
    Column("pregunta", 224, 423),
    Column("a", 423, 510),
    Column("b", 510, 597),
    Column("c", 597, 684),
    Column("d", 684, 771),
    Column("respuesta", 771, 820),
]

LAYOUT_AF = [
    Column("numero", 28, 51),
    Column("tipo_materia", 51, 94),
    Column("clase_categoria", 94, 138),
    Column("tema", 138, 223),
    Column("pregunta", 223, 343),
    Column("a", 343, 429),
    Column("b", 429, 512),
    Column("c", 512, 596),
    Column("d", 596, 681),
    Column("respuesta", 681, 721),
    Column("fundamento", 721, 817),
]

LAYOUT_AFC = [
    Column("numero", 28, 54),
    Column("tipo_materia", 54, 108),
    Column("clase_categoria", 108, 139),
    Column("tema", 139, 191),
    Column("pregunta", 191, 343),
    Column("a", 343, 429),
    Column("b", 429, 512),
    Column("c", 512, 596),
    Column("d", 596, 681),
    Column("respuesta", 681, 721),
    Column("fundamento", 721, 817),
]

LAYOUT_B = [
    Column("numero", 28, 54),
    Column("tipo_materia", 54, 108),
    Column("clase_categoria", 108, 167),
    Column("tema", 167, 251),
    Column("pregunta", 251, 356),
    Column("a", 356, 424),
    Column("b", 424, 494),
    Column("c", 494, 564),
    Column("d", 564, 632),
    Column("respuesta", 632, 668),
    Column("fundamento", 668, 817),
]

OPTION_LABELS = ["a", "b", "c", "d"]

MANUAL_ANSWER_OVERRIDES = {
    ("A-IIIA", 25, 47): ("c", "Respuesta en blanco en PDF; misma regla aparece en el balotario con respuesta c."),
    ("A-IIIB", 25, 46): ("c", "Respuesta en blanco en PDF; corresponde a antes del inicio del servicio."),
    ("A-IIIC", 31, 107): ("c", "Respuesta en blanco en PDF; corresponde a antes del inicio del servicio."),
    ("B-IIC", 20, 28): ("c", "Respuesta en blanco en PDF; fundamento oficial indica literal c)."),
}

TEXT_REPLACEMENTS = {
    "\u00bfprohibido voltear a la izquierda\u00bf": '"prohibido voltear a la izquierda"',
    "\u00bfU\u00bf": '"U"',
    "\u00bfCEDA EL PASO?": '"CEDA EL PASO"',
    "n\u00f9mero": "n\u00famero",
    "inspecci\u00f2n": "inspecci\u00f3n",
    "contacatdo": "contactado",
}


def clean_text(value: str | None) -> str:
    if not value:
        return ""
    value = value.replace("\u00a0", " ")
    value = value.replace("¿", "¿").replace("“", '"').replace("”", '"')
    for source, target in TEXT_REPLACEMENTS.items():
        value = value.replace(source, target)
    value = re.sub(r"\s+", " ", value).strip()
    value = re.sub(r"\s+([,.;:])", r"\1", value)
    return value


def normalize_for_key(value: str) -> str:
    value = clean_text(value).lower()
    value = value.replace("á", "a").replace("é", "e").replace("í", "i")
    value = value.replace("ó", "o").replace("ú", "u").replace("ü", "u")
    value = value.replace("ñ", "n")
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def row_text(words: list[dict[str, Any]], x0: float, x1: float, y0: float, y1: float) -> str:
    selected = []
    for word in words:
        rect = word["rect"]
        cx = (rect.x0 + rect.x1) / 2
        cy = (rect.y0 + rect.y1) / 2
        if x0 <= cx < x1 and y0 <= cy < y1:
            selected.append(word)
    selected.sort(key=lambda w: (round(w["rect"].y0 / 3) * 3, w["rect"].x0))
    lines: list[list[dict[str, Any]]] = []
    for word in selected:
        cy = (word["rect"].y0 + word["rect"].y1) / 2
        for line in lines:
            line_cy = sum((w["rect"].y0 + w["rect"].y1) / 2 for w in line) / len(line)
            if abs(cy - line_cy) <= 4.2:
                line.append(word)
                break
        else:
            lines.append([word])

    text_lines = []
    for line in lines:
        line.sort(key=lambda w: w["rect"].x0)
        text_lines.append(" ".join(w["text"] for w in line))
    return clean_text(" ".join(text_lines))


def strip_option_prefix(label: str, text: str) -> str:
    text = clean_text(text)
    text = re.sub(rf"^{label}\)\s*", "", text, flags=re.I)
    text = re.sub(r"^[a-d]\)\s*", "", text, flags=re.I)
    return clean_text(text)


def visual_rect(raw_rect: fitz.Rect, page: fitz.Page) -> fitz.Rect:
    return raw_rect * page.rotation_matrix


def load_page_words(page: fitz.Page) -> list[dict[str, Any]]:
    words = []
    for item in page.get_text("words"):
        raw = fitz.Rect(item[:4])
        words.append({"rect": visual_rect(raw, page), "text": item[4]})
    return words


def detect_layout(page: fitz.Page) -> tuple[str, list[Column]]:
    if page.rotation == 90:
        return "B", LAYOUT_B
    return "A", LAYOUT_A


def detect_fundamento_headers(words: list[dict[str, Any]]) -> list[float]:
    headers = []
    for word in words:
        if normalize_for_key(word["text"]) == "fundamento":
            headers.append(word["rect"].y0)
    return sorted(headers)


def layout_for_row(
    base_layout: str,
    fundamento_headers: list[float],
    center_y: float,
    continuation_layout: str = "A",
) -> tuple[str, list[Column]]:
    if base_layout == "B":
        return "B", LAYOUT_B
    if any(header_y < center_y for header_y in fundamento_headers):
        return "AF", LAYOUT_AF
    if continuation_layout == "AF" and not fundamento_headers:
        return "AFC", LAYOUT_AFC
    return "A", LAYOUT_A


def find_question_starts(words: list[dict[str, Any]], page_height: float) -> list[tuple[int, float]]:
    starts = []
    for word in words:
        rect = word["rect"]
        text = word["text"]
        if not re.fullmatch(r"\d{1,3}", text):
            continue
        if 25 <= rect.x0 <= 56 and 38 <= rect.y0 <= page_height - 25:
            starts.append((int(text), rect.y0))
    starts.sort(key=lambda item: item[1])
    deduped: list[tuple[int, float]] = []
    for number, y0 in starts:
        if deduped and abs(deduped[-1][1] - y0) < 2:
            continue
        deduped.append((number, y0))
    return deduped


def horizontal_gridlines(page: fitz.Page) -> list[float]:
    segments: list[tuple[float, float]] = []
    for drawing in page.get_drawings():
        rect = drawing.get("rect")
        if not rect:
            continue
        vrect = visual_rect(rect, page)
        if vrect.width >= 12 and vrect.height <= 1.8:
            segments.append(((vrect.y0 + vrect.y1) / 2, vrect.width))
    segments.sort()
    groups: list[list[tuple[float, float]]] = []
    for segment in segments:
        if groups and abs(groups[-1][0][0] - segment[0]) < 2:
            groups[-1].append(segment)
        else:
            groups.append([segment])
    lines = []
    for group in groups:
        total_width = sum(width for _, width in group)
        max_width = max(width for _, width in group)
        if max_width >= page.rect.width * 0.55 or (len(group) >= 5 and total_width >= page.rect.width * 0.38):
            lines.append(sum(y for y, _ in group) / len(group))
    return lines


def vertical_gridlines_for_row(page: fitz.Page, y0: float, y1: float) -> list[float]:
    center = (y0 + y1) / 2
    min_height = max(10, (y1 - y0) * 0.65)
    candidates = []
    for drawing in page.get_drawings():
        rect = drawing.get("rect")
        if not rect:
            continue
        vrect = visual_rect(rect, page)
        if vrect.width <= 1.8 and vrect.height >= min_height and vrect.y0 - 1 <= center <= vrect.y1 + 1:
            candidates.append((vrect.x0 + vrect.x1) / 2)
    candidates.sort()
    lines: list[float] = []
    for x in candidates:
        if lines and abs(lines[-1] - x) < 2:
            continue
        if 20 <= x <= page.rect.width - 15:
            lines.append(x)
    return lines


def columns_from_gridlines(gridlines: list[float]) -> tuple[str, list[Column]] | None:
    if len(gridlines) < 11:
        return None
    names_no_fundamento = [
        "numero",
        "tipo_materia",
        "clase_categoria",
        "tema",
        "pregunta",
        "a",
        "b",
        "c",
        "d",
        "respuesta",
    ]
    names_with_fundamento = [*names_no_fundamento, "fundamento"]
    names = names_with_fundamento if len(gridlines) >= 12 else names_no_fundamento
    needed = len(names) + 1
    if len(gridlines) < needed:
        return None
    # Prefer the widest outer table boundaries if there are stray vector lines.
    lines = list(gridlines)
    while len(lines) > needed:
        gaps = [(lines[index + 1] - lines[index], index) for index in range(len(lines) - 1)]
        _, index = min(gaps)
        # Extra lines usually come from pictograms in answer/option cells. When a
        # close pair appears late in the table, keep the right-hand boundary so
        # the option column keeps a normal width.
        remove_index = index if index >= 8 else index + 1
        lines.pop(remove_index)
    lines = lines[:needed]
    columns = [
        Column(name, lines[index] + 0.8, lines[index + 1] - 0.8)
        for index, name in enumerate(names)
    ]
    return ("DYNF" if "fundamento" in names else "DYN", columns)


def row_bounds(
    starts: list[tuple[int, float]],
    index: int,
    page: fitz.Page,
    gridlines: list[float] | None = None,
) -> tuple[float, float]:
    _, center = starts[index]
    if gridlines:
        previous = [line for line in gridlines if line < center - 1]
        following = [line for line in gridlines if line > center + 1]
        if previous and following:
            return previous[-1] + 0.8, following[0] - 0.8
        if following and not previous:
            return max(24, center - 42), following[0] - 0.8
        if previous and not following:
            return previous[-1] + 0.8, page.rect.height - 22

    if index > 0:
        y0 = (starts[index - 1][1] + center) / 2
    else:
        if len(starts) > 1:
            y0 = center - (starts[index + 1][1] - center) / 2
        else:
            y0 = center - 35
        y0 = max(y0, 60 if page.rotation == 90 else 62)

    if index + 1 < len(starts):
        y1 = (center + starts[index + 1][1]) / 2
    else:
        if index > 0:
            y1 = center + (center - starts[index - 1][1]) / 2
        else:
            y1 = page.rect.height - 30
        y1 = min(y1, page.rect.height - 22)
    return y0, y1


def render_page(page: fitz.Page, scale: int = 3) -> Image.Image:
    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
    mode = "RGB" if pix.n < 4 else "RGBA"
    return Image.frombytes(mode, [pix.width, pix.height], pix.samples)


def crop_visual_rect(image: Image.Image, rect: fitz.Rect, scale: int = 3, pad: int = 5) -> Image.Image | None:
    left = max(int(rect.x0 * scale) - pad, 0)
    top = max(int(rect.y0 * scale) - pad, 0)
    right = min(int(rect.x1 * scale) + pad, image.width)
    bottom = min(int(rect.y1 * scale) + pad, image.height)
    if right <= left or bottom <= top:
        return None
    crop = image.crop((left, top, right, bottom)).convert("RGB")
    return tight_crop_nonwhite(crop)


def tight_crop_nonwhite(image: Image.Image, threshold: int = 246, pad: int = 8) -> Image.Image | None:
    pixels = image.convert("RGB")
    mask = Image.new("L", pixels.size, 0)
    src = pixels.load()
    dst = mask.load()
    for y in range(pixels.height):
        for x in range(pixels.width):
            r, g, b = src[x, y]
            if min(r, g, b) < threshold:
                dst[x, y] = 255
    bbox = mask.getbbox()
    if not bbox:
        return None
    left, top, right, bottom = bbox
    if right - left < 20 or bottom - top < 20:
        return None
    left = max(left - pad, 0)
    top = max(top - pad, 0)
    right = min(right + pad, pixels.width)
    bottom = min(bottom + pad, pixels.height)
    if right - left < 12 or bottom - top < 12:
        return None
    return pixels.crop((left, top, right, bottom))


def nonwhite_ratio(image: Image.Image, threshold: int = 246) -> float:
    pixels = image.convert("RGB")
    total = pixels.width * pixels.height
    if total == 0:
        return 0.0
    nonwhite = 0
    for r, g, b in pixels.getdata():
        if min(r, g, b) < threshold:
            nonwhite += 1
    return nonwhite / total


def cell_for_rect(rect: fitz.Rect, columns: list[Column], row_y0: float, row_y1: float) -> str | None:
    cx = (rect.x0 + rect.x1) / 2
    cy = (rect.y0 + rect.y1) / 2
    if not (row_y0 <= cy < row_y1):
        return None
    for col in columns:
        if col.x0 <= cx < col.x1:
            return col.name
    return None


def image_rects_by_page(page: fitz.Page) -> list[fitz.Rect]:
    rects: list[fitz.Rect] = []
    for image in page.get_images(full=True):
        xref = image[0]
        for rect in page.get_image_rects(xref):
            vrect = visual_rect(rect, page)
            if vrect.width < 8 or vrect.height < 8:
                continue
            rects.append(vrect)
    return rects


def save_media_crop(
    crop: Image.Image,
    source_code: str,
    sequence: int,
    cell: str,
    media_index: int,
) -> dict[str, Any]:
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{source_code}_{sequence:03d}_{cell}_{media_index}.png"
    path = MEDIA_DIR / filename
    crop.save(path)
    payload = path.read_bytes()
    digest = hashlib.sha256(payload).hexdigest()
    data_uri = "data:image/png;base64," + base64.b64encode(payload).decode("ascii")
    return {
        "cell": cell,
        "filename": str(path.relative_to(ROOT)).replace("\\", "/"),
        "sha256": digest,
        "mime": "image/png",
        "width": crop.width,
        "height": crop.height,
        "data_uri": data_uri,
    }


def option_cell_has_visual(page_image: Image.Image, col: Column, y0: float, y1: float, scale: int = 3) -> bool:
    # Skip the option marker area and borders, then look for non-white pixels.
    rect = fitz.Rect(col.x0 + 16, y0 + 4, col.x1 - 4, y1 - 4)
    left = max(int(rect.x0 * scale), 0)
    top = max(int(rect.y0 * scale), 0)
    right = min(int(rect.x1 * scale), page_image.width)
    bottom = min(int(rect.y1 * scale), page_image.height)
    if right <= left or bottom <= top:
        return False
    crop = page_image.crop((left, top, right, bottom))
    return nonwhite_ratio(crop) > 0.006


def crop_option_cell(page_image: Image.Image, col: Column, y0: float, y1: float, scale: int = 3) -> Image.Image | None:
    rect = fitz.Rect(col.x0 + 14, y0 + 3, col.x1 - 3, y1 - 3)
    crop = crop_visual_rect(page_image, rect, scale=scale, pad=0)
    if crop and nonwhite_ratio(crop) < 0.09:
        return None
    return crop


def parse_pdf(pdf_path: Path, source_code: str) -> list[dict[str, Any]]:
    doc = fitz.open(pdf_path)
    extracted: list[dict[str, Any]] = []
    sequence = 0
    media_index = 0
    continuation_layout = "A"

    for page_index, page in enumerate(doc):
        base_layout, _ = detect_layout(page)
        words = load_page_words(page)
        fundamento_headers = detect_fundamento_headers(words)
        starts = find_question_starts(words, page.rect.height)
        if not starts:
            continue
        page_image = render_page(page)
        raster_rects = image_rects_by_page(page)
        gridlines = horizontal_gridlines(page)

        for row_index, (number, y0) in enumerate(starts):
            layout_name, columns = layout_for_row(base_layout, fundamento_headers, y0, continuation_layout)
            y0, y1 = row_bounds(starts, row_index, page, gridlines)
            dynamic = columns_from_gridlines(vertical_gridlines_for_row(page, y0, y1))
            if dynamic:
                layout_name, columns = dynamic
            if y1 <= y0:
                continue
            sequence += 1
            cells = {
                col.name: row_text(words, col.x0, col.x1, y0, y1)
                for col in columns
            }
            raw_answer = clean_text(cells.get("respuesta"))
            answer_match = re.search(r"[a-d]", raw_answer, flags=re.I)
            answer = answer_match.group(0).lower() if answer_match else ""
            override_note = ""
            override = MANUAL_ANSWER_OVERRIDES.get((source_code, page_index + 1, number))
            if override and not answer:
                answer, override_note = override
            tipo_materia = clean_text(cells.get("tipo_materia"))
            tema_pdf = clean_text(cells.get("tema"))
            tipo_seccion = "general" if "general" in normalize_for_key(tipo_materia) else "especifica"
            tema = clean_text(f"{tipo_materia} - {tema_pdf}") if tipo_materia else tema_pdf

            row_media_by_cell: dict[str, list[dict[str, Any]]] = {key: [] for key in ["pregunta", *OPTION_LABELS]}
            raster_cells: set[str] = set()
            for rect in raster_rects:
                cell = cell_for_rect(rect, columns, y0, y1)
                if cell not in row_media_by_cell:
                    continue
                raster_cells.add(cell)
                crop = crop_visual_rect(page_image, rect, scale=3, pad=18)
                if crop:
                    media_index += 1
                    row_media_by_cell[cell].append(save_media_crop(crop, source_code, sequence, cell, media_index))

            # In rotated class-B PDFs, many road-sign alternatives are vector drawings,
            # not embedded images. If the option text is empty but the cell has visual
            # pixels, save the rendered cell crop as the option media.
            if layout_name in {"B", "AF", "AFC", "DYNF"}:
                col_by_name = {col.name: col for col in columns}
                for label in OPTION_LABELS:
                    cleaned = strip_option_prefix(label, cells.get(label, ""))
                    if cleaned:
                        continue
                    if label in raster_cells:
                        continue
                    col = col_by_name[label]
                    if option_cell_has_visual(page_image, col, y0, y1, scale=3):
                        crop = crop_option_cell(page_image, col, y0, y1, scale=3)
                        if crop:
                            media_index += 1
                            row_media_by_cell[label].append(save_media_crop(crop, source_code, sequence, label, media_index))

            options = []
            for order, label in enumerate(OPTION_LABELS, start=1):
                options.append({
                    "label": label,
                    "order": order,
                    "text": strip_option_prefix(label, cells.get(label, "")),
                    "is_correct": answer == label,
                    "media": row_media_by_cell[label],
                })

            flags = []
            if not answer:
                flags.append("missing_answer")
            if not clean_text(cells.get("pregunta")):
                flags.append("missing_question_text")
            if sum(1 for option in options if option["text"] or option["media"]) < 2:
                flags.append("few_options")
            if any(option["is_correct"] for option in options) is False:
                flags.append("answer_not_matching_option")

            extracted.append({
                "source_code": source_code,
                "source_file": pdf_path.name,
                "source_category_id": CATEGORY_IDS.get(source_code),
                "layout": layout_name,
                "page": page_index + 1,
                "sequence_in_source": sequence,
                "numero_pdf": number,
                "tipo_materia": tipo_materia,
                "tipo_seccion": tipo_seccion,
                "clase_categoria_pdf": clean_text(cells.get("clase_categoria")),
                "tema_pdf": tema_pdf,
                "tema": tema,
                "text": clean_text(cells.get("pregunta")),
                "options": options,
                "answer": answer,
                "fundamento": clean_text(cells.get("fundamento")),
                "question_media": row_media_by_cell["pregunta"],
                "manual_answer_override": override_note,
                "flags": flags,
            })
        if base_layout != "B" and fundamento_headers:
            continuation_layout = "AF"
    return extracted


def source_code_from_filename(path: Path) -> str | None:
    match = re.search(r"balotario_([AB]-I{1,3}[ABC]?)\.pdf$", path.name)
    if match:
        return match.group(1)
    return None


def dedupe_key(question: dict[str, Any]) -> str:
    parts = [
        normalize_for_key(question["text"]),
        question["answer"],
        *[normalize_for_key(option["text"]) for option in question["options"]],
        *[media["sha256"] for media in question["question_media"]],
        *[
            media["sha256"]
            for option in question["options"]
            for media in option["media"]
        ],
    ]
    return hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()


def dedupe_questions(raw_questions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_key: dict[str, dict[str, Any]] = {}
    for question in raw_questions:
        key = dedupe_key(question)
        source = {
            "source_code": question["source_code"],
            "source_category_id": question["source_category_id"],
            "source_file": question["source_file"],
            "page": question["page"],
            "sequence_in_source": question["sequence_in_source"],
            "numero_pdf": question["numero_pdf"],
            "clase_categoria_pdf": question["clase_categoria_pdf"],
        }
        if key not in by_key:
            clone = json.loads(json.dumps(question))
            clone["canonical_key"] = key
            clone["sources"] = [source]
            clone["category_ids"] = sorted({question["source_category_id"]} - {None})
            by_key[key] = clone
        else:
            existing = by_key[key]
            existing["sources"].append(source)
            category_ids = set(existing["category_ids"])
            if question["source_category_id"]:
                category_ids.add(question["source_category_id"])
            existing["category_ids"] = sorted(category_ids)
    return list(by_key.values())


def write_csv(raw_questions: list[dict[str, Any]], path: Path) -> None:
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "source_code",
                "page",
                "sequence_in_source",
                "numero_pdf",
                "tipo_seccion",
                "clase_categoria_pdf",
                "tema",
                "text",
                "a",
                "b",
                "c",
                "d",
                "answer",
                "question_media_count",
                "option_media_count",
                "flags",
            ],
        )
        writer.writeheader()
        for question in raw_questions:
            row = {
                "source_code": question["source_code"],
                "page": question["page"],
                "sequence_in_source": question["sequence_in_source"],
                "numero_pdf": question["numero_pdf"],
                "tipo_seccion": question["tipo_seccion"],
                "clase_categoria_pdf": question["clase_categoria_pdf"],
                "tema": question["tema"],
                "text": question["text"],
                "answer": question["answer"],
                "question_media_count": len(question["question_media"]),
                "option_media_count": sum(len(o["media"]) for o in question["options"]),
                "flags": ",".join(question["flags"]),
            }
            for option in question["options"]:
                row[option["label"]] = option["text"] or ("[imagen]" if option["media"] else "")
            writer.writerow(row)


def write_contact_sheet(
    raw_questions: list[dict[str, Any]],
    path: Path,
    limit: int = 120,
    include_questions: bool = True,
    include_options: bool = True,
) -> None:
    media_items = []
    for question in raw_questions:
        if include_questions:
            for media in question["question_media"]:
                media_items.append((question, "pregunta", media))
        if include_options:
            for option in question["options"]:
                for media in option["media"]:
                    media_items.append((question, f"opcion {option['label']}", media))
    media_items = media_items[:limit]
    if not media_items:
        return
    thumb_w, thumb_h = 220, 150
    label_h = 58
    cols = 4
    rows = (len(media_items) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * thumb_w, rows * (thumb_h + label_h)), "white")
    from PIL import ImageDraw
    draw = ImageDraw.Draw(sheet)
    for idx, (question, cell, media) in enumerate(media_items):
        x = (idx % cols) * thumb_w
        y = (idx // cols) * (thumb_h + label_h)
        img = Image.open(ROOT / media["filename"]).convert("RGB")
        img.thumbnail((thumb_w - 12, thumb_h - 12))
        sheet.paste(img, (x + 6, y + 6))
        label = f'{question["source_code"]} #{question["sequence_in_source"]} p{question["page"]} {cell}'
        draw.text((x + 6, y + thumb_h + 4), label, fill=(0, 0, 0))
        draw.text((x + 6, y + thumb_h + 22), question["text"][:42], fill=(50, 50, 50))
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(path)


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    for old in MEDIA_DIR.glob("*.png"):
        old.unlink()

    pdfs = sorted(SOURCE_DIR.glob("balotario_*.pdf"))
    raw_questions: list[dict[str, Any]] = []
    file_reports = []
    for pdf in pdfs:
        source_code = source_code_from_filename(pdf)
        if not source_code:
            continue
        questions = parse_pdf(pdf, source_code)
        raw_questions.extend(questions)
        file_reports.append({
            "source_code": source_code,
            "filename": pdf.name,
            "questions": len(questions),
            "pages": fitz.open(pdf).page_count,
            "flags": sum(len(q["flags"]) for q in questions),
            "question_media": sum(len(q["question_media"]) for q in questions),
            "option_media": sum(len(o["media"]) for q in questions for o in q["options"]),
            "sections": sorted(set(q["tipo_seccion"] for q in questions)),
        })

    deduped = dedupe_questions(raw_questions)
    raw_category_counts: dict[str, int] = {}
    deduped_category_counts: dict[str, int] = {}
    for question in raw_questions:
        raw_category_counts[question["source_code"]] = raw_category_counts.get(question["source_code"], 0) + 1
    category_name_by_id = {value: key for key, value in CATEGORY_IDS.items()}
    for question in deduped:
        for category_id in question.get("category_ids") or []:
            name = category_name_by_id.get(category_id, str(category_id))
            deduped_category_counts[name] = deduped_category_counts.get(name, 0) + 1
    report = {
        "source_dir": str(SOURCE_DIR.relative_to(ROOT)).replace("\\", "/"),
        "raw_question_count": len(raw_questions),
        "deduped_question_count": len(deduped),
        "duplicate_count": len(raw_questions) - len(deduped),
        "raw_category_counts": dict(sorted(raw_category_counts.items())),
        "deduped_category_counts": dict(sorted(deduped_category_counts.items())),
        "intra_category_exact_duplicates_removed": {
            key: raw_category_counts.get(key, 0) - deduped_category_counts.get(key, 0)
            for key in sorted(raw_category_counts)
            if raw_category_counts.get(key, 0) != deduped_category_counts.get(key, 0)
        },
        "manual_answer_overrides": sum(1 for question in raw_questions if question.get("manual_answer_override")),
        "file_reports": file_reports,
        "flag_counts": {},
        "media": {
            "question_media_count": sum(len(q["question_media"]) for q in raw_questions),
            "option_media_count": sum(len(o["media"]) for q in raw_questions for o in q["options"]),
        },
    }
    for question in raw_questions:
        for flag in question["flags"]:
            report["flag_counts"][flag] = report["flag_counts"].get(flag, 0) + 1

    (OUT_DIR / "questions_raw.json").write_text(
        json.dumps(raw_questions, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (OUT_DIR / "questions_deduped.json").write_text(
        json.dumps(deduped, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (OUT_DIR / "analysis_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    write_csv(raw_questions, OUT_DIR / "questions_raw_review.csv")
    write_contact_sheet(raw_questions, OUT_DIR / "media_contact_sheet.png")
    write_contact_sheet(
        raw_questions,
        OUT_DIR / "media_options_contact_sheet.png",
        limit=160,
        include_questions=False,
        include_options=True,
    )

    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
